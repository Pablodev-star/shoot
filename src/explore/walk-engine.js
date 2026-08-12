/**
 * SHOOT! — Auto-walk engine (Block 3a).
 *
 * The player never steers. This engine owns the camera, decides how fast the
 * journey moves, ticks the survival/atmosphere systems and fires an event the
 * moment an encounter is reached.
 *
 * DESIGN RULES FROM THE SPEC
 *  - No progress bar, no countdown, no distance readout. The only feedback the
 *    player gets is their character walking. `travelled` is internal.
 *  - The horse shortens the journey: it multiplies walking speed by
 *    HORSE_SPEED_MUL and the generated gaps by HORSE_TIME_MUL, so the time
 *    between encounters drops to roughly a third.
 *  - Hunger, the day/night clock and the weather's countdown all advance on
 *    *travel* time, so pausing the walk pauses the world. The weather's
 *    animation is not part of that: see `update`.
 *
 * The engine is deliberately headless — rendering lives in explore-screen.js —
 * so it can be unit-tested or reused by a future auto-battler mode.
 */

import { EVENTS, emit } from '../core/events.js';
import {
  WALK_SPEED,
  HORSE_SPEED_MUL,
  HORSE_TIME_MUL,
  HUNGER_MAX,
  innPremiumPrice,
  gunUpgradeCost,
  GUN_MAX_LEVEL,
} from '../game/progression.js';
import { getState, addDistance } from '../game/player.js';
import { getItem } from '../game/items.js';
import {
  generateSegment,
  effectiveDistance,
  revealToHorizon,
  applyReveals,
  roadReading,
} from './encounters.js';
import * as hunger from './hunger.js';
import * as daynight from './daynight.js';
import * as weather from './weather.js';

export function createWalkEngine() {
  let segment = null;
  /** Distance walked inside the current segment, in source pixels. */
  let travelled = 0;
  let paused = true;
  let finished = false;
  /** Screen-space camera position (equals travelled, kept separate for clarity). */
  let cameraX = 0;

  /**
   * How the run is going, in the five numbers the road reads when it decides
   * what the next face-down stop turns out to be. See `roadReading`.
   */
  function reading() {
    const player = getState();
    const worldId = segment?.worldId ?? player.world;
    return roadReading({
      lives: player.lives,
      maxLives: player.maxLives,
      hunger: player.hunger,
      hungerMax: HUNGER_MAX,
      gold: player.gold,
      bedPrice: innPremiumPrice(worldId),
      gunCost: player.gunLevel >= GUN_MAX_LEVEL ? Infinity : gunUpgradeCost(player.gunLevel),
      hasFood: (player.inventory || []).some((slot) => getItem(slot.id)?.food),
    });
  }

  function loadSegment(worldId, seed, resumeState = null) {
    segment = generateSegment(worldId, seed);
    travelled = resumeState?.travelled ?? 0;
    cameraX = resumeState?.cameraX ?? travelled;
    finished = false;
    // Replay resolution flags from the save so cleared encounters stay cleared.
    const resolvedUpTo = resumeState?.encounterIndex ?? getState().encounterIndex ?? 0;
    segment.events.forEach((e, i) => {
      e.resolved = i < resolvedUpTo;
    });
    // The order the road actually took is a property of the run, not of the
    // seed, so it comes back off the save; anything the save did not cover is
    // still face down and gets turned over here.
    applyReveals(segment, resumeState?.types);
    revealToHorizon(segment, reading());
    return segment;
  }

  /** Index of the next unresolved encounter. */
  function nextIndex() {
    return segment ? segment.events.findIndex((e) => !e.resolved) : -1;
  }

  function nextEvent() {
    const i = nextIndex();
    return i === -1 ? null : segment.events[i];
  }

  /** Effective distance to the next event, with the horse discount applied. */
  function distanceToNext() {
    const event = nextEvent();
    if (!event) return Infinity;
    return effectiveDistance(event, getState().hasHorse, HORSE_TIME_MUL) - travelled;
  }

  function speed() {
    return WALK_SPEED * (getState().hasHorse ? HORSE_SPEED_MUL : 1);
  }

  /**
   * Advance the journey.
   * @param {number} dt milliseconds
   * @param {{w:number,h:number,scale:number}} view for weather particles
   */
  function update(dt, view) {
    // The sky is not part of the pause. `weather.update` only spends the
    // weather's remaining time while the walk is running (it checks its own
    // paused flag) — the rain itself keeps falling either way, so opening the
    // saddlebag does not freeze the storm in mid-air.
    weather.update(dt, view);
    if (paused || finished || !segment) return;

    const step = (speed() * dt) / 1000;
    travelled += step;
    cameraX += step;
    addDistance(step);

    hunger.update(dt);
    daynight.update(dt);

    const event = nextEvent();
    if (event && distanceToNext() <= 0) {
      event.resolved = true;
      /**
       * Where the traveller actually stopped, nailed down before anything can
       * move it. `effectiveDistance` is a function of the mount state, so a
       * shop walked into on foot and left on a horse bought at its counter
       * would be recomputed with the shortened gap — and the building would
       * jump a quarter of its approach backwards, out from under the player
       * who is standing in its doorway. A stop that has happened has a
       * settled position; only the road ahead is still being measured.
       */
      event.placedAt = effectiveDistance(event, getState().hasHorse, HORSE_TIME_MUL);
      /**
       * A stop cleared is a card turned over. The reading is taken HERE, at
       * the moment the player arrives — before the duel is fought or the shop
       * is spent in — because what the road is answering is the state they
       * walked up in. Taking it after the encounter would let a bad fight
       * conjure the inn that the bad fight caused.
       */
      revealToHorizon(segment, reading());
      pause();
      /**
       * THE ENCOUNTER CARRIES ITS OWN WORLD, AND THE TICK ENDS HERE
       * -----------------------------------------------------------------
       * `worldId` rides along because the screen that opens next must fight
       * the world this segment belongs to, not whatever `player.world` says
       * by the time it mounts — see the note in src/duel/duel-screen.js.
       *
       * And the `return` is the other half of the same bug. The boss is the
       * last event in a segment, so resolving it used to fall straight
       * through into the "segment cleared" check below and fire that in the
       * *same tick*: the run controller moved the player into the next world
       * while the boss duel was still being routed, and the fight that
       * opened was the next world's boss. Nothing is cleared in the tick
       * that resolves an encounter; the boss duel routes the transition
       * itself when it ends.
       */
      emit(EVENTS.ENCOUNTER_REACHED, {
        ...event,
        worldId: segment.worldId,
        ...(event.type === 'boss' ? { isBoss: true } : {}),
      });
      return;
    }

    if (!event && !finished) {
      finished = true;
      emit(EVENTS.SEGMENT_CLEARED, { worldId: segment.worldId });
    }
  }

  function start() {
    paused = false;
    hunger.setPaused(false);
    daynight.setPaused(false);
    weather.setPaused(false);
    emit(EVENTS.WALK_STARTED, {});
  }

  function pause() {
    if (paused) return;
    paused = true;
    hunger.setPaused(true);
    daynight.setPaused(true);
    weather.setPaused(true);
    emit(EVENTS.WALK_PAUSED, {});
  }

  function resume() {
    if (!paused || finished) return;
    paused = false;
    hunger.setPaused(false);
    daynight.setPaused(false);
    weather.setPaused(false);
    emit(EVENTS.WALK_RESUMED, {});
  }

  /** Still over the horizon further ahead than this. */
  const AHEAD_WINDOW = 700;
  /**
   * Long off the back of the frame further behind than this. Deliberately
   * generous: the renderer culls on screen position, which is the honest test,
   * and this only decides what is worth handing it.
   */
  const BEHIND_WINDOW = 900;

  /**
   * World positions of the buildings that belong to the shop/inn events near
   * the traveller, so the parallax renderer can draw them.
   *
   * A BUILDING YOU HAVE USED IS STILL A BUILDING
   * -------------------------------------------------------------------------
   * Resolved stops used to be dropped from this list the moment the encounter
   * fired, which meant the shop vanished off the road while the player was
   * inside it: they walked out of a door into empty desert, with the place they
   * had just been standing in gone. A shop is not a pickup. It stays where it
   * was built, and the player walks away from it — so the window runs behind
   * the traveller as well as in front, and only the distance either side of him
   * decides what is worth drawing.
   */
  function visibleStructures() {
    if (!segment) return [];
    const mounted = getState().hasHorse;
    const out = [];
    for (const event of segment.events) {
      if (!['shop', 'inn', 'forge'].includes(event.type)) continue;
      // A stop that has been reached keeps the position it was reached at; the
      // ones still ahead are measured live, because the horse really does pull
      // them closer and the trigger uses the same figure. A stop resolved in
      // an earlier session has no `placedAt` — it was replayed from a flag in
      // the save — and there the live figure is the best guess there is.
      const worldX = event.placedAt ?? effectiveDistance(event, mounted, HORSE_TIME_MUL);
      const gap = worldX - travelled;
      if (gap > AHEAD_WINDOW || gap < -BEHIND_WINDOW) continue;
      out.push({ worldX, kind: event.type });
    }
    return out;
  }

  return {
    loadSegment,
    update,
    start,
    pause,
    resume,
    isPaused: () => paused,
    isFinished: () => finished,
    getSegment: () => segment,
    getTravelled: () => travelled,
    getCameraX: () => cameraX,
    nextEvent,
    nextIndex,
    distanceToNext,
    visibleStructures,
    /** Save payload for this engine's slice of state. */
    serialize: () => ({
      travelled,
      cameraX,
      seed: segment?.seed,
      worldId: segment?.worldId,
      /**
       * Which kind each stop turned out to be. The seed rebuilds the road's
       * hand; only the run knows the order it was played in.
       */
      types: segment ? segment.events.map((e) => (e.hidden ? null : e.type)) : [],
    }),
  };
}
