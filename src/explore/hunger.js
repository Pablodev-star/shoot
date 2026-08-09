/**
 * SHOOT! — Hunger (Blocks 3a & 5a).
 *
 * Hunger drains only while the player is actually travelling. The walk engine
 * pauses it whenever the game state leaves the road (duel, shop, inn, menu), so
 * a long shopping trip is never punished.
 *
 * At zero the player starts starving: one life is lost every
 * STARVATION_INTERVAL_MS — progressive, never instant, so there is always time
 * to open the inventory and eat something.
 *
 * WHAT MAKES IT DRAIN FASTER — AND THE ONE THING THAT MAKES IT DRAIN SLOWER
 * ---------------------------------------------------------------------------
 * Two things multiply the base rate: the horse (you cover more ground, so you
 * burn more), and harsh weather (you are fighting the sky for every step). One
 * thing divides it: the Canteen, bought once and kept, which is the only answer
 * to hunger in the game that is not a thing you eat.
 * All of them live in `drainMultiplier()` rather than being inlined in the update,
 * because the travel band draws that number — a hunger bar that quietly
 * empties half again as fast is a difficulty spike the player can only find
 * out about by dying of it.
 *
 * WHICH weather is harsh is not this file's business. It asks the sky for its
 * multiplier and uses whatever comes back; the sandstorm, the snow and the
 * ashfall each carry their own in `src/explore/weather.js`. This used to be a
 * string comparison against "sandstorm", and a second harsh weather could not
 * exist without a second `if` here and a third in the HUD.
 */

import { EVENTS, emit } from '../core/events.js';
import {
  HUNGER_DRAIN_PER_SEC,
  HUNGER_DRAIN_HORSE_MUL,
  HUNGER_DRAIN_CANTEEN_MUL,
  STARVATION_INTERVAL_MS,
} from '../game/progression.js';
import { getState, setHunger, loseLife, hasCanteen } from '../game/player.js';
import { getWeatherState } from './weather.js';
import { toast } from '../ui/toast.js';

const state = { paused: true, starveTimer: 0 };

export function setPaused(paused) {
  state.paused = paused;
  if (paused) state.starveTimer = 0;
}

export function reset() {
  state.starveTimer = 0;
}

/**
 * Everything currently multiplying the base drain rate.
 *
 * Two of them push it up and one pulls it down — the canteen is the only thing
 * in the game that makes a crossing cost less than walking it does, and it is
 * reported here beside the others rather than quietly folded into the number,
 * so the band can name what the player is looking at.
 *
 * @returns {{total: number, horse: boolean, canteen: boolean, weather: number, weatherLabel: string|null}}
 */
export function drainMultiplier() {
  const horse = !!getState().hasHorse;
  const canteen = hasCanteen();
  const sky = getWeatherState();
  const weather = sky.hungerMul || 1;
  return {
    horse,
    canteen,
    weather,
    weatherLabel: weather > 1 ? sky.label : null,
    total:
      (horse ? HUNGER_DRAIN_HORSE_MUL : 1) *
      (canteen ? HUNGER_DRAIN_CANTEEN_MUL : 1) *
      weather,
  };
}

/**
 * Advance hunger. Call once per frame from the walk loop with the elapsed
 * milliseconds; skipped entirely while paused.
 */
export function update(dt) {
  if (state.paused) return;
  const player = getState();

  if (player.hunger > 0) {
    const drain = ((HUNGER_DRAIN_PER_SEC * dt) / 1000) * drainMultiplier().total;
    const before = player.hunger;
    setHunger(player.hunger - drain);
    // Warn once as it crosses the quarter mark.
    if (before > 25 && player.hunger <= 25) toast('You are getting hungry', 'bad');
    return;
  }

  // Starving.
  state.starveTimer += dt;
  if (state.starveTimer >= STARVATION_INTERVAL_MS) {
    state.starveTimer -= STARVATION_INTERVAL_MS;
    loseLife(1);
    emit(EVENTS.STARVATION_TICK, { lives: getState().lives });
    toast('Starving — you lost a life', 'bad', 'hit');
  }
}

/** 0..1 progress towards the next starvation tick (drives the HUD pulse). */
export function starvationProgress() {
  return Math.min(1, state.starveTimer / STARVATION_INTERVAL_MS);
}
