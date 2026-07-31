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
import { WALK_SPEED, HORSE_SPEED_MUL, HORSE_TIME_MUL } from '../game/progression.js';
import { getState, addDistance } from '../game/player.js';
import { generateSegment } from './encounters.js';
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
    const mounted = getState().hasHorse;
    const start = event.distance - event.gap;
    const gap = event.gap * (mounted ? HORSE_TIME_MUL : 1);
    return start + gap - travelled;
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
      pause();
      if (event.type === 'boss') {
        emit(EVENTS.ENCOUNTER_REACHED, { ...event, isBoss: true });
      } else {
        emit(EVENTS.ENCOUNTER_REACHED, { ...event });
      }
    }

    if (!nextEvent() && !finished) {
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

  /**
   * World positions of the buildings that belong to upcoming shop/inn events,
   * so the parallax renderer can show them approaching on the horizon.
   */
  function visibleStructures() {
    if (!segment) return [];
    const mounted = getState().hasHorse;
    const out = [];
    for (const event of segment.events) {
      if (event.type !== 'shop' && event.type !== 'inn') continue;
      if (event.resolved) continue;
      const start = event.distance - event.gap;
      const gap = event.gap * (mounted ? HORSE_TIME_MUL : 1);
      const worldX = start + gap;
      if (worldX - travelled > 700) continue; // still over the horizon
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
    serialize: () => ({ travelled, cameraX, seed: segment?.seed, worldId: segment?.worldId }),
  };
}
