/**
 * SHOOT! — Player / run state (Blocks 4 & 5).
 *
 * The single mutable object for an in-progress run: lives, level, exp, gold,
 * hunger, inventory, horse, shop perks and where the player is in the world.
 *
 * Every mutation goes through a function here and emits an event, so the HUD,
 * the shops and the duel screen never poll — they subscribe.
 *
 * `serialize()` / `restore()` are the only contract the save system needs.
 */

import { EVENTS, emit } from '../core/events.js';
import { getItem, ITEMS, SELL_RATIO } from './items.js';
import {
  STARTING_LIVES,
  LIVES_PER_LEVEL,
  expForNextLevel,
  itemPrice,
  sellPrice,
  HUNGER_MAX,
} from './progression.js';
import { toast } from '../ui/toast.js';
import { play } from '../core/audio.js';

function blankState() {
  return {
    world: 1,
    encounterIndex: 0,
    distance: 0,
    seed: (Math.random() * 0xffffffff) >>> 0,

    level: 1,
    exp: 0,
    gold: 60,

    maxLives: STARTING_LIVES,
    lives: STARTING_LIVES,
    hunger: HUNGER_MAX,

    hasHorse: false,
    /** [{ id, qty }] — order is preserved so the grid does not jump around. */
    inventory: [{ id: 'carrot', qty: 2 }],
    /** Permanent upgrades applied to every future shop visit. */
    shopPerks: { extraSlots: 0, discountBonus: 0 },

    stats: { duelsWon: 0, duelsLost: 0, goldEarned: 0, itemsBought: 0, distance: 0 },
  };
}

let state = blankState();

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

export function newRun(overrides = {}) {
  state = { ...blankState(), ...overrides };
  emitAll();
  return state;
}

export function getState() {
  return state;
}

export function serialize() {
  return JSON.parse(JSON.stringify(state));
}

export function restore(data) {
  state = { ...blankState(), ...(data || {}) };
  state.shopPerks = { ...blankState().shopPerks, ...(data?.shopPerks || {}) };
  state.stats = { ...blankState().stats, ...(data?.stats || {}) };
  emitAll();
  return state;
}

function emitAll() {
  emit(EVENTS.LIVES_CHANGED, { lives: state.lives, maxLives: state.maxLives });
  emit(EVENTS.GOLD_CHANGED, { gold: state.gold });
  emit(EVENTS.EXP_CHANGED, { exp: state.exp, level: state.level, next: expForNextLevel(state.level) });
  emit(EVENTS.HUNGER_CHANGED, { hunger: state.hunger, max: HUNGER_MAX });
  emit(EVENTS.INVENTORY_CHANGED, { inventory: state.inventory });
}

// ---------------------------------------------------------------------------
// Lives
// ---------------------------------------------------------------------------

export function setLives(value) {
  state.lives = Math.max(0, Math.min(state.maxLives, Math.round(value)));
  emit(EVENTS.LIVES_CHANGED, { lives: state.lives, maxLives: state.maxLives });
  return state.lives;
}

export function loseLife(amount = 1) {
  const before = state.lives;
  setLives(state.lives - amount);
  if (state.lives <= 0 && before > 0) emit(EVENTS.GAME_OVER, { reason: 'lives' });
  return state.lives;
}

export function heal(amount = 1) {
  const before = state.lives;
  setLives(state.lives + amount);
  return state.lives - before;
}

export function fullHeal() {
  return heal(state.maxLives - state.lives);
}

// ---------------------------------------------------------------------------
// Gold
// ---------------------------------------------------------------------------

export function addGold(amount) {
  state.gold = Math.max(0, state.gold + Math.round(amount));
  if (amount > 0) state.stats.goldEarned += Math.round(amount);
  emit(EVENTS.GOLD_CHANGED, { gold: state.gold, delta: amount });
  return state.gold;
}

export function canAfford(cost) {
  return state.gold >= cost;
}

export function spendGold(cost) {
  if (!canAfford(cost)) return false;
  addGold(-cost);
  return true;
}

// ---------------------------------------------------------------------------
// Experience & levels
// ---------------------------------------------------------------------------

export function addExp(amount) {
  state.exp += Math.round(amount);
  let levelled = 0;
  while (state.exp >= expForNextLevel(state.level)) {
    state.exp -= expForNextLevel(state.level);
    state.level += 1;
    state.maxLives += LIVES_PER_LEVEL;
    levelled += 1;
  }
  if (levelled > 0) {
    // Levelling refills lives immediately — the classic reward from version 2.
    state.lives = state.maxLives;
    emit(EVENTS.LIVES_CHANGED, { lives: state.lives, maxLives: state.maxLives });
    emit(EVENTS.LEVEL_UP, { level: state.level, maxLives: state.maxLives, gained: levelled });
    play('levelUp');
    toast(`Level ${state.level}! Max lives ${state.maxLives}`, 'gold');
  }
  emit(EVENTS.EXP_CHANGED, {
    exp: state.exp,
    level: state.level,
    next: expForNextLevel(state.level),
    delta: amount,
  });
  return state.level;
}

export function expProgress() {
  const next = expForNextLevel(state.level);
  return { exp: state.exp, next, ratio: Math.min(1, state.exp / next) };
}

// ---------------------------------------------------------------------------
// Hunger
// ---------------------------------------------------------------------------

export function setHunger(value) {
  const clamped = Math.max(0, Math.min(HUNGER_MAX, value));
  const wasEmpty = state.hunger <= 0;
  state.hunger = clamped;
  emit(EVENTS.HUNGER_CHANGED, { hunger: state.hunger, max: HUNGER_MAX });
  if (!wasEmpty && clamped <= 0) emit(EVENTS.HUNGER_EMPTY, {});
  return state.hunger;
}

export function addHunger(amount) {
  return setHunger(state.hunger + amount);
}

// ---------------------------------------------------------------------------
// Inventory
// ---------------------------------------------------------------------------

export function getInventory() {
  return state.inventory.map((entry) => ({ ...entry, item: getItem(entry.id) })).filter((e) => e.item);
}

export function countOf(id) {
  const entry = state.inventory.find((e) => e.id === id);
  return entry ? entry.qty : 0;
}

export function addItem(id, qty = 1) {
  const item = getItem(id);
  if (!item) return false;

  // Unlocks and shop perks apply the moment they are acquired.
  if (item.unlock === 'horse') {
    state.hasHorse = true;
    emit(EVENTS.HORSE_ACQUIRED, {});
  }
  if (item.shopPerk) {
    for (const [key, value] of Object.entries(item.shopPerk)) {
      state.shopPerks[key] = (state.shopPerks[key] || 0) + value * qty;
    }
  }

  const existing = state.inventory.find((e) => e.id === id);
  const max = item.stack ?? 99;
  if (existing) existing.qty = Math.min(max, existing.qty + qty);
  else state.inventory.push({ id, qty: Math.min(max, qty) });

  emit(EVENTS.INVENTORY_CHANGED, { inventory: state.inventory, added: id });
  return true;
}

export function removeItem(id, qty = 1) {
  const idx = state.inventory.findIndex((e) => e.id === id);
  if (idx === -1) return false;
  const entry = state.inventory[idx];
  entry.qty -= qty;
  if (entry.qty <= 0) state.inventory.splice(idx, 1);
  emit(EVENTS.INVENTORY_CHANGED, { inventory: state.inventory, removed: id });
  return true;
}

/** Sell one copy of an item for SELL_RATIO of its current world price. */
export function sellItem(id) {
  const item = getItem(id);
  if (!item || countOf(id) <= 0) return 0;
  const value = sellPrice(item, state.world);
  removeItem(id, 1);
  addGold(value);
  // Selling a perk item also removes the perk it granted.
  if (item.shopPerk) {
    for (const [key, v] of Object.entries(item.shopPerk)) {
      state.shopPerks[key] = Math.max(0, (state.shopPerks[key] || 0) - v);
    }
  }
  if (item.unlock === 'horse' && countOf('horse') === 0) state.hasHorse = false;
  play('coin');
  return value;
}

/**
 * Use an item from the inventory.
 * @param {string} id
 * @param {{ context?: 'walk'|'duel', duel?: object }} opts
 * @returns {{ok: boolean, reason?: string, effect?: string}}
 */
export function useItem(id, opts = {}) {
  const item = getItem(id);
  if (!item || countOf(id) <= 0) return { ok: false, reason: 'You do not have that.' };

  if (item.context === 'duel' && opts.context !== 'duel') {
    return { ok: false, reason: 'Only usable in a duel.' };
  }
  if (item.context === 'passive') return { ok: false, reason: 'Works on its own.' };
  if (item.context === 'special') return { ok: false, reason: 'Already in use.' };

  if (item.food) {
    if (state.hunger >= HUNGER_MAX) return { ok: false, reason: 'Not hungry.' };
    addHunger(item.food);
    removeItem(id, 1);
    play('eat');
    return { ok: true, effect: 'food' };
  }

  if (item.heal) {
    // In a duel the authoritative life count lives in the duel engine, so the
    // caller passes it in and syncs back when the fight ends.
    const current = opts.lives ?? state.lives;
    const max = opts.maxLives ?? state.maxLives;
    if (current >= max) return { ok: false, reason: 'Already at full lives.' };
    const healed = Math.min(item.heal, max - current);
    if (opts.context !== 'duel') heal(item.heal);
    removeItem(id, 1);
    play('coin');
    return { ok: true, effect: 'heal', amount: healed };
  }

  if (item.duelEffect) {
    removeItem(id, 1);
    return { ok: true, effect: item.duelEffect };
  }

  if (item.context === 'utility') {
    // Map consumption is handled by the caller (it needs the encounter list).
    return { ok: true, effect: 'map' };
  }

  return { ok: false, reason: 'Nothing happens.' };
}

/** True while a Bulletproof Vest is available to absorb a fatal shot. */
export function hasVest() {
  return countOf('vest') > 0;
}

export function consumeVest() {
  return removeItem('vest', 1);
}

/** True while the Anti-Effect Diadem is owned. */
export function isImmuneToEffects() {
  return countOf('diadem') > 0;
}

// ---------------------------------------------------------------------------
// World position
// ---------------------------------------------------------------------------

export function setWorld(worldId) {
  state.world = worldId;
  state.encounterIndex = 0;
  emit(EVENTS.WORLD_CHANGED, { world: worldId });
}

export function advanceEncounter() {
  state.encounterIndex += 1;
  return state.encounterIndex;
}

export function addDistance(px) {
  state.distance += px;
  state.stats.distance += px;
  emit(EVENTS.DISTANCE_CHANGED, { distance: state.distance });
}

export { ITEMS, itemPrice, sellPrice, SELL_RATIO };
