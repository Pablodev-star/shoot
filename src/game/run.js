/**
 * SHOOT! — Run controller (Block 5b).
 *
 * The spine of the game loop. It owns the walk engine (which must survive the
 * screens coming and going), routes every encounter to its screen, applies the
 * rewards when an encounter ends, moves the player between worlds and writes
 * the save.
 *
 *   menu → slots → world intro → walk → encounter → walk → … → boss
 *        → next world (lives refilled) → … → Galaxy → 2-phase boss → victory
 *
 * Screens never talk to each other; they call into here.
 */

import { EVENTS, emit, on } from '../core/events.js';
import { go, resetStack } from '../core/router.js';
import { createWalkEngine } from '../explore/walk-engine.js';
import * as daynight from '../explore/daynight.js';
import * as weather from '../explore/weather.js';
import * as hunger from '../explore/hunger.js';
import {
  getState,
  newRun,
  restore as restorePlayer,
  serialize as serializePlayer,
  setWorld,
  advanceEncounter,
  fullHeal,
  addGold,
  addExp,
} from './player.js';
import { getWorld, FINAL_WORLD } from './worlds.js';
import { writeSlot } from './save.js';
import { goldForEnemy, expForEnemy } from './progression.js';
import { toast } from '../ui/toast.js';
import { bumpStat } from '../core/settings.js';

const run = {
  engine: null,
  slot: 1,
  /** Set while a duel is in progress so its result can be attributed. */
  pendingEnemy: null,
  started: false,
};

export function getEngine() {
  return run.engine;
}

export function getSlot() {
  return run.slot;
}

// ---------------------------------------------------------------------------
// Starting / loading
// ---------------------------------------------------------------------------

export async function startNewRun(slot) {
  run.slot = slot;
  newRun();
  daynight.reset(0.32);
  weather.force('clear');
  hunger.reset();
  run.engine = createWalkEngine();
  run.started = true;
  resetStack();
  await beginWorld(1, { intro: true });
}

export async function loadRun(slot, data) {
  run.slot = slot;
  restorePlayer(data.player);

  // A finished run has no road left to walk — every encounter of the Galaxy is
  // resolved. Continuing it replays the ending instead of stranding the player
  // on an empty segment.
  if (data.completed) {
    run.started = false;
    resetStack();
    await go('victory', {});
    return;
  }

  daynight.restore(data.daynight);
  // The biome first: it decides which weathers are legal, and `restore` drops
  // any that this one cannot have.
  weather.setBiome(getWorld(getState().world).biome);
  weather.restore(data.weather);
  hunger.reset();
  run.engine = createWalkEngine();
  run.engine.loadSegment(getState().world, data.segmentSeed ?? getState().seed, {
    travelled: data.travelled ?? 0,
    cameraX: data.travelled ?? 0,
    encounterIndex: getState().encounterIndex,
  });
  run.started = true;
  resetStack();
  await go('explore');
}

/** Enter a world: fresh segment, refilled lives, intro card. */
export async function beginWorld(worldId, opts = {}) {
  setWorld(worldId);
  fullHeal();
  const world = getWorld(worldId);
  const seed = (getState().seed + worldId * 7919) >>> 0;
  run.engine.loadSegment(worldId, seed);
  // Each world hands the weather its biome's table, then opens clear: the
  // first thing a player sees of a new place should be the place itself, not
  // whatever squall the last one happened to end on.
  weather.setBiome(world.biome);
  weather.force('clear');
  await save();
  if (opts.intro !== false) await go('worldIntro', { worldId, name: world.name, subtitle: world.subtitle });
  else await go('explore');
}

// ---------------------------------------------------------------------------
// Encounters
// ---------------------------------------------------------------------------

on(EVENTS.ENCOUNTER_REACHED, async (event) => {
  if (!run.started) return;
  if (event.type === 'shop') await go('shop', { encounter: event });
  else if (event.type === 'inn') await go('inn', { encounter: event });
  else if (event.type === 'boss') await go('duel', { encounter: event, isBoss: true });
  else await go('duel', { encounter: event });
});

on(EVENTS.GAME_OVER, async () => {
  if (!run.started) return;
  run.started = false;
  await go('gameOver', { world: getState().world });
});

/**
 * Safety net. A segment normally ends with the boss duel, which routes the
 * world transition itself — but if the walker ever runs off the end of a
 * segment (a restored save, a hand-edited slot), move on rather than walking an
 * empty road forever.
 */
on(EVENTS.SEGMENT_CLEARED, async ({ worldId }) => {
  if (!run.started) return;
  if (worldId >= FINAL_WORLD) {
    run.started = false;
    await save({ completed: true });
    emit(EVENTS.GAME_COMPLETED, {});
    await go('victory', {});
  } else {
    await beginWorld(worldId + 1);
  }
});

/**
 * Called by shop/inn/duel screens when the player is done with the encounter.
 * Advances the counter, saves and puts the player back on the road.
 */
export async function finishEncounter() {
  advanceEncounter();
  await save();
  await go('explore', { resume: true });
}

/**
 * Duel resolution — rewards, stats and the boss/world transition.
 *
 * `worldId` comes from the encounter that opened the fight rather than from the
 * player's current world, for the same reason the duel screen builds its enemy
 * that way: the segment that offered the fight is what the fight is worth.
 */
export async function resolveDuel({ won, enemy, isBoss, worldId: from }) {
  const worldId = from ?? getState().world;
  if (won) {
    const gold = goldForEnemy({ worldId, lives: enemy.maxLives, isBoss });
    const exp = expForEnemy({ worldId, lives: enemy.maxLives, isBoss });
    addGold(gold);
    addExp(exp);
    getState().stats.duelsWon += 1;
    bumpStat('duelsWon');
    bumpStat('goldEarned', gold);
    toast(`+${gold} gold · +${exp} exp`, 'gold', 'coin');

    if (isBoss) {
      bumpStat('worldsCleared');
      advanceEncounter();
      if (worldId >= FINAL_WORLD) {
        run.started = false;
        // Flagged as finished so the slot picker offers the ending rather than
        // dropping the player onto a segment with nothing left in it.
        await save({ completed: true });
        emit(EVENTS.GAME_COMPLETED, {});
        await go('victory', {});
      } else {
        await beginWorld(worldId + 1);
      }
      return;
    }
  } else {
    getState().stats.duelsLost += 1;
    bumpStat('duelsLost');
    // Losing a duel means zero lives — the run is over. Deliberately NOT
    // saved: the slot keeps the state from before the fight, so "Continue"
    // puts the player back on the road with the lives they had.
    run.started = false;
    await go('gameOver', { world: worldId });
    return;
  }
  await finishEncounter();
}

// ---------------------------------------------------------------------------
// Saving
// ---------------------------------------------------------------------------

/**
 * Write the current run to its slot.
 * @param {object} [extra] merged into the payload — `{ completed: true }` marks
 *   a finished run so it is never resumed as a road state.
 */
export async function save(extra = {}) {
  if (!run.started && getState().lives <= 0) return;
  const engineState = run.engine ? run.engine.serialize() : {};
  await writeSlot(run.slot, {
    player: serializePlayer(),
    daynight: daynight.serialize(),
    weather: weather.serialize(),
    travelled: engineState.travelled ?? 0,
    segmentSeed: engineState.seed,
    savedAt: Date.now(),
    ...extra,
  });
  emit(EVENTS.SAVE_WRITTEN, { slot: run.slot });
}

/** Abandon the run and return to the menu (progress is already saved). */
export async function quitToMenu() {
  await save();
  run.started = false;
  if (run.engine) run.engine.pause();
  resetStack();
  await go('title');
}
