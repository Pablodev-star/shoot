/**
 * SHOOT! — Global event bus.
 *
 * Systems never import each other's screens directly; they publish and listen.
 * That is what lets the exploration engine say "I reached a shop" without
 * knowing that shops exist, and what will let the future online mode swap the
 * duel's opponent source without touching the duel UI.
 *
 * Event names live in EVENTS below — always use the constant, never a literal.
 */

export const EVENTS = {
  // Navigation
  SCREEN_CHANGED: 'screen:changed',

  // Exploration
  WALK_STARTED: 'walk:started',
  WALK_PAUSED: 'walk:paused',
  WALK_RESUMED: 'walk:resumed',
  ENCOUNTER_REACHED: 'encounter:reached',
  SEGMENT_CLEARED: 'segment:cleared',
  DISTANCE_CHANGED: 'walk:distance',

  // Survival
  HUNGER_CHANGED: 'hunger:changed',
  HUNGER_EMPTY: 'hunger:empty',
  STARVATION_TICK: 'hunger:starve',

  // World / atmosphere
  TIME_OF_DAY_CHANGED: 'atmos:time',
  WEATHER_CHANGED: 'atmos:weather',

  // Player state
  GOLD_CHANGED: 'player:gold',
  LIVES_CHANGED: 'player:lives',
  EXP_CHANGED: 'player:exp',
  LEVEL_UP: 'player:levelup',
  INVENTORY_CHANGED: 'inventory:changed',
  HORSE_ACQUIRED: 'player:horse',
  /** A meal's after-effect was granted, spent down a duel, or ran out. */
  BOON_CHANGED: 'player:boon',
  /**
   * The last life went and a Dusk Totem was in the bag, so this is fired
   * INSTEAD of GAME_OVER. Whoever owns the screen at the time is expected to
   * play the break (src/ui/totem.js) and then call `breakTotem`.
   */
  TOTEM_TRIGGERED: 'player:totem',

  // Duel
  DUEL_STARTED: 'duel:started',
  DUEL_ROUND_RESOLVED: 'duel:round',
  DUEL_ENDED: 'duel:ended',

  // Progression
  WORLD_CHANGED: 'world:changed',
  GAME_COMPLETED: 'game:completed',
  GAME_OVER: 'game:over',
  SAVE_WRITTEN: 'save:written',

  // UI
  TOAST: 'ui:toast',
};

const listeners = new Map();

/** Subscribe. Returns an unsubscribe function. */
export function on(event, handler) {
  if (!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event).add(handler);
  return () => off(event, handler);
}

/** Subscribe for a single firing. */
export function once(event, handler) {
  const wrapped = (payload) => {
    off(event, wrapped);
    handler(payload);
  };
  return on(event, wrapped);
}

export function off(event, handler) {
  const set = listeners.get(event);
  if (set) set.delete(handler);
}

export function emit(event, payload) {
  const set = listeners.get(event);
  if (!set) return;
  // Copy so handlers may unsubscribe during dispatch.
  for (const handler of [...set]) {
    try {
      handler(payload);
    } catch (err) {
      console.error(`[events] handler for "${event}" threw`, err);
    }
  }
}

/** Drop every listener for an event (or all events when omitted). */
export function clear(event) {
  if (event) listeners.delete(event);
  else listeners.clear();
}
