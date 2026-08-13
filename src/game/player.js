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
import { playerAbility, playerSpecial } from './world-abilities.js';
import {
  STARTING_LIVES,
  LIVES_PER_LEVEL,
  expForNextLevel,
  itemPrice,
  sellPrice,
  HUNGER_MAX,
  totemReviveLives,
  GUN_MAX_LEVEL,
  gunDamageAt,
  gunUpgradeCost as gunUpgradeCostAt,
  itemHeal,
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

    /**
     * Permanent revolver tuning bought at forges. Level 0 is the trail iron
     * and deals half a life; level GUN_MAX_LEVEL is the Nova. The ladder — what
     * each rung is called, what it is made of and what it throws off when it
     * fires — is `src/game/gun-tiers.js`.
     */
    gunLevel: 0,

    maxLives: STARTING_LIVES,
    lives: STARTING_LIVES,
    hunger: HUNGER_MAX,

    hasHorse: false,
    /**
     * [{ id, qty }] — order is preserved so the grid does not jump around.
     *
     * Two bandages rather than one, and it is the Dust Flats that decides it:
     * the opening bar is three diamonds, a bandage is two of them, and the
     * first shop is one to three fights down the road. One bandage is a single
     * bad opening duel away from a run that is over before it has been played.
     */
    inventory: [{ id: 'carrot', qty: 2 }, { id: 'bandage', qty: 2 }],
    /** Permanent upgrades applied to every future shop visit. */
    shopPerks: { extraSlots: 0, discountBonus: 0 },
    /**
     * The two duel abilities currently in hand, as item ids.
     *
     * Two slots and not a list, because the charge bar is the balance: a
     * player carrying four abilities would be spending one nearly every round
     * and the gun would be decoration. Owning several is fine and expected —
     * you swap them in the saddlebag between fights, and the one that suits a
     * boss is not the one that suits a road full of drifters.
     */
    equipped: { basic: null, special: null },

    /**
     * What the last meal left on you, and how many duels of it are left.
     *
     * `null` almost always. A boon is the one effect in the game that outlives
     * the screen it was granted on — see the Traveller's Feast in
     * src/game/items.js — so it lives on the run rather than on a duel, and it
     * is counted in FIGHTS rather than in minutes: a player who eats before a
     * long walk should get the three duels they paid for, not three duels'
     * worth of clock spent walking.
     */
    boon: null,

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
  // A save written before abilities existed has no slots; it gets empty ones
  // rather than `undefined`, which every reader would then have to guard.
  state.equipped = { ...blankState().equipped, ...(data?.equipped || {}) };
  rebuildLifeBar();
  emitAll();
  return state;
}

/**
 * THE LIFE BAR IS DERIVED, SO A SAVE IS NOT ALLOWED TO DISAGREE WITH IT
 * ---------------------------------------------------------------------------
 * `maxLives` is a pure function of the level — the starting three plus
 * LIVES_PER_LEVEL for every level since — and nothing else in the game touches
 * it. It is stored anyway, because a save should be readable on its own, and
 * that is exactly what makes it dangerous: every time the curve is retuned,
 * every save in the wild carries a bar built against the OLD one, and the
 * player walks back onto a road whose riders were sized for a bar they do not
 * have. A level-6 save from the last release would arrive in the Galaxy on
 * eighteen lives against a world balanced for twenty-three.
 *
 * So the bar is rebuilt from the level on the way in rather than trusted. This
 * is not a one-off migration for one release: it is the rule, and it means the
 * next rescale of LIVES_PER_LEVEL cannot strand anybody either.
 *
 * What is CARRIED across is how full the bar was. A run saved at full comes
 * back full and a run saved on its last legs comes back on its last legs, in
 * the same proportion, rounded to the half-diamond grid the interface draws —
 * and never to zero, because a save is by definition a run that was still
 * alive.
 */
function rebuildLifeBar() {
  const level = Math.max(1, Math.round(state.level) || 1);
  const stored = Number(state.maxLives) || STARTING_LIVES;
  const rebuilt = STARTING_LIVES + (level - 1) * LIVES_PER_LEVEL;
  if (rebuilt === stored) {
    state.lives = Math.max(0, Math.min(stored, state.lives));
    return;
  }
  const fraction = stored > 0 ? Math.max(0, Math.min(1, state.lives / stored)) : 1;
  state.maxLives = rebuilt;
  state.lives = Math.max(0.5, Math.min(rebuilt, Math.round(rebuilt * fraction * 2) / 2));
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
  state.lives = Math.max(0, Math.min(state.maxLives, Math.round(value * 2) / 2));
  emit(EVENTS.LIVES_CHANGED, { lives: state.lives, maxLives: state.maxLives });
  return state.lives;
}

/**
 * Damage, the next price and how far up the ladder you are — all of it reads
 * off the one permanent number. The curves themselves live in
 * `src/game/progression.js` with every other curve in the game.
 */
export function gunDamage() {
  return gunDamageAt(state.gunLevel);
}

export function gunUpgradeCost() {
  return gunUpgradeCostAt(state.gunLevel);
}

/** True once the gun is a Nova and there is nothing left to buy. */
export function gunIsMaxed() {
  return state.gunLevel >= GUN_MAX_LEVEL;
}

export function upgradeGun() {
  if (gunIsMaxed()) return false;
  const cost = gunUpgradeCost();
  if (!spendGold(cost)) return false;
  state.gunLevel += 1;
  return true;
}

/**
 * Take lives off, and decide whether that was the end of the run.
 *
 * It is not the end if there is a Dusk Totem in the bag: TOTEM_TRIGGERED goes
 * out instead of GAME_OVER, and whoever is on screen plays the break and calls
 * `breakTotem` when it lands. Nothing here restores anything — the life bar
 * genuinely sits at zero for as long as the scene takes, which is what makes it
 * a revival rather than a hit that was quietly ignored.
 *
 * This is the ROAD's death only. A duel keeps its own life count and hands the
 * totem to the engine (`hasTotem` in src/duel/duel-engine.js), because a fight
 * has to be able to carry on after you come back.
 */
export function loseLife(amount = 1) {
  const before = state.lives;
  setLives(state.lives - amount);
  if (state.lives <= 0 && before > 0) {
    if (hasTotem()) emit(EVENTS.TOTEM_TRIGGERED, { reason: 'lives' });
    else emit(EVENTS.GAME_OVER, { reason: 'lives' });
  }
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
    /**
     * A LEVEL IS ONE LIFE, NOT A FULL HEAL
     * -----------------------------------------------------------------------
     * It used to refill the bar. That made levelling the cheapest healing in
     * the game — better than any bed at any inn, free, and delivered right in
     * the middle of the stretch where you were supposed to be deciding whether
     * you could afford one. Two things followed from it: the inn stopped being
     * a real purchase for anybody tracking their exp bar, and walking into a
     * world on one life was survivable as long as a level was due.
     *
     * You now get exactly what the level adds: one more maximum life, and one
     * more life to go in it. A player at full stays full, a player at 1 of 5
     * comes out at 2 of 6, and the bed is still the only way back to the top.
     */
    state.lives = Math.min(state.maxLives, state.lives + LIVES_PER_LEVEL * levelled);
    emit(EVENTS.LIVES_CHANGED, { lives: state.lives, maxLives: state.maxLives });
    emit(EVENTS.LEVEL_UP, { level: state.level, maxLives: state.maxLives, gained: levelled });
    play('levelUp');
    toast(`Level ${state.level}! +${LIVES_PER_LEVEL * levelled} life`, 'gold');
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

/** How many more copies of an item will fit before the stack is full. */
export function stackSpace(id) {
  const item = getItem(id);
  if (!item) return 0;
  return Math.max(0, (item.stack ?? 99) - countOf(id));
}

/**
 * True when `qty` more copies would actually be received. `addItem` clamps to
 * the stack limit, so callers that charge gold MUST check this first.
 */
export function canHold(id, qty = 1) {
  return stackSpace(id) >= qty;
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
  // Selling the thing in your hand takes it out of your hand.
  if (item.ability && countOf(id) === 0) {
    for (const slot of ['basic', 'special']) {
      if (state.equipped[slot] === id) state.equipped[slot] = null;
    }
  }
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

  // Using an ability does not spend it — it puts it in your hand for every
  // duel from here on. It is the one "use" in the bag that gives something
  // back instead of taking it away.
  if (item.context === 'ability') {
    const result = equipAbility(id);
    if (!result.ok) return { ok: false, reason: result.reason };
    play('click');
    return { ok: true, effect: 'equip', slot: result.slot };
  }

  if (item.food) {
    /**
     * "Not hungry" is only a refusal for food that is ONLY food. A meal that
     * also leaves something on you for the next three fights is a thing a
     * player eats on a full gauge on purpose — the night before a boss — and
     * refusing it because the bar happens to be topped up would make the
     * legendary of the tier unusable exactly when it is worth the most.
     */
    if (state.hunger >= HUNGER_MAX && !item.boon) return { ok: false, reason: 'Not hungry.' };
    addHunger(item.food);
    if (item.boon) grantBoon(item.boon);
    removeItem(id, 1);
    play('eat');
    return { ok: true, effect: 'food', boon: item.boon ? getBoon() : null };
  }

  if (item.heal) {
    // In a duel the authoritative life count lives in the duel engine, so the
    // caller passes it in and syncs back when the fight ends.
    const current = opts.lives ?? state.lives;
    const max = opts.maxLives ?? state.maxLives;
    if (current >= max) return { ok: false, reason: 'Already at full lives.' };
    // A bandage is a third of you, not one diamond — see `itemHeal`.
    const amount = itemHeal(item, max);
    const healed = Math.min(amount, max - current);
    if (opts.context !== 'duel') heal(amount);
    removeItem(id, 1);
    play('coin');
    return { ok: true, effect: 'heal', amount: healed };
  }

  if (item.duelEffect) {
    removeItem(id, 1);
    return { ok: true, effect: item.duelEffect };
  }

  if (item.context === 'utility') {
    // NOT consumed. A utility item is a tool you own — the Map opens the trail
    // map and stays in the bag. It used to spend a copy per look, which taught
    // players to carry it and never open it; a tool nobody uses is worse than
    // no tool. The caller draws whatever it shows.
    return { ok: true, effect: 'map' };
  }

  return { ok: false, reason: 'Nothing happens.' };
}

// ---------------------------------------------------------------------------
// Duel abilities
// ---------------------------------------------------------------------------

/**
 * Put an ability in its slot, taking whatever was there out.
 *
 * Equipping is free and instant: the item is not consumed, there is nothing to
 * confirm, and the previous occupant goes back to being an ordinary thing in
 * the bag. A slot is a *choice*, and a choice you have to pay to change is a
 * choice most players will simply never make.
 *
 * @returns {{ok: boolean, slot?: string, reason?: string}}
 */
export function equipAbility(id) {
  const item = getItem(id);
  if (!item || !item.ability) return { ok: false, reason: 'That is not an ability.' };
  if (countOf(id) <= 0) return { ok: false, reason: 'You do not have that.' };
  const slot = item.ability.kind === 'special' ? 'special' : 'basic';
  if (state.equipped[slot] === id) return { ok: false, reason: 'Already in hand.' };
  state.equipped[slot] = id;
  emit(EVENTS.INVENTORY_CHANGED, { inventory: state.inventory, equipped: id });
  return { ok: true, slot };
}

/** Take an ability out of its slot without selling it. */
export function unequipAbility(slot) {
  if (!state.equipped[slot]) return false;
  state.equipped[slot] = null;
  emit(EVENTS.INVENTORY_CHANGED, { inventory: state.inventory });
  return true;
}

export function isEquipped(id) {
  return state.equipped.basic === id || state.equipped.special === id;
}

/**
 * The two abilities the next duel starts with, resolved all the way down to
 * their numbers. Anything equipped but no longer owned is dropped on the way
 * out, which is what keeps a sold ability from fighting on without you.
 *
 * @returns {Array<object>} 0, 1 or 2 specs, each with `item`, `kind`, `charge`
 */
export function getEquippedAbilities() {
  const out = [];
  for (const slot of ['basic', 'special']) {
    const id = state.equipped[slot];
    if (!id) continue;
    const item = getItem(id);
    if (!item || countOf(id) <= 0) {
      state.equipped[slot] = null;
      continue;
    }
    const spec = item.ability.kind === 'special'
      ? playerSpecial(item.ability.ref)
      : playerAbility(item.ability.ref);
    if (spec) out.push({ ...spec, itemId: id, slot });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Boons — what a meal leaves on you for the fights after it
// ---------------------------------------------------------------------------

/**
 * Put a boon on the player, replacing whatever was there.
 *
 * Replacing rather than stacking: two feasts in a row are three duels of the
 * effect starting now, not six, and the item is honest about it because the
 * shop line says "the next three duels" and the chip in the travel band counts
 * them down in front of you.
 */
export function grantBoon(spec) {
  if (!spec) return null;
  state.boon = { ...spec, duels: spec.duels || 1 };
  emit(EVENTS.BOON_CHANGED, { boon: state.boon });
  return state.boon;
}

/** The live boon, or null. Anything spent down to nothing reads as null. */
export function getBoon() {
  const boon = state.boon;
  if (!boon || boon.duels <= 0) return null;
  return boon;
}

/**
 * One duel's worth of it, spent. Called once per fight from `resolveDuel`,
 * whichever way the fight went — a duel you lost still ate the meal.
 */
export function spendBoonDuel() {
  if (!state.boon) return null;
  state.boon.duels -= 1;
  if (state.boon.duels <= 0) state.boon = null;
  emit(EVENTS.BOON_CHANGED, { boon: state.boon });
  return state.boon;
}

// ---------------------------------------------------------------------------
// Carried gear the rest of the game asks about by name
// ---------------------------------------------------------------------------

/**
 * True while a Bulletproof Vest is in the bag — which is the only question
 * anybody asks about it now.
 *
 * The vest is not spent. It stops one blow per DUEL and you patch it up on the
 * road; the charge lives in the duel engine for the length of a fight (see
 * `hasVest` on a side in src/duel/duel-engine.js) and this says whether the
 * next fight gets one. There is deliberately no `consumeVest` any more: the
 * only way to lose it is to sell it.
 */
export function hasVest() {
  return countOf('vest') > 0;
}

/** True while the Anti-Effect Diadem is owned. */
export function isImmuneToEffects() {
  return countOf('diadem') > 0;
}

/** True while a Canteen is on the saddle — hunger drains slower. */
export function hasCanteen() {
  return countOf('canteen') > 0;
}

/** True while a Dusk Totem is in the bag to be broken. */
export function hasTotem() {
  return countOf('duskTotem') > 0;
}

/**
 * The totem comes apart: it leaves the bag, the lives come back and so does
 * the gauge.
 *
 * The gauge matters as much as the lives do. The likeliest death the totem ever
 * catches is starvation — a road with no shop on it and nothing left to eat —
 * and coming back on half your lives with the bar still empty is coming back
 * for twelve seconds. It gives the day back, not just the breath.
 *
 * @returns {boolean} false when there was no totem to break
 */
export function breakTotem() {
  if (!hasTotem()) return false;
  removeItem('duskTotem', 1);
  setLives(totemReviveLives(state.maxLives));
  setHunger(HUNGER_MAX);
  return true;
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
