/**
 * SHOOT! — Shop logic (Block 4).
 *
 * A shop visit is generated from four inputs: the world (rarity table + price
 * multipliers), the player's accumulated shop perks, a seed, and the item
 * catalogue. Nothing is hard-coded per world.
 *
 *   slots      = BASE_SLOTS + perks.extraSlots        (items may repeat)
 *   rarity     = weighted roll from world.rarity
 *   price      = itemPrice(item, world)               (exponential curve)
 *   discount   = 50% off, with probability
 *                BASE_DISCOUNT_CHANCE + perks.discountBonus
 *
 * ADDING A NEW SHOP PERK: give an item a `shopPerk` object in items.js. Its
 * keys are summed into `player.shopPerks` on purchase; read them here.
 */

import { makeRng } from '../core/rng.js';
import { SHOP_POOL, getItem, abilityPoolForWorld } from '../game/items.js';
import { getWorld } from '../game/worlds.js';
import { itemPrice } from '../game/progression.js';
import { getState } from '../game/player.js';

export const BASE_SLOTS = 3;
export const BASE_DISCOUNT_CHANCE = 0.2;
export const DISCOUNT_RATE = 0.5;

/**
 * Build the stock for one visit.
 * @param {number} worldId
 * @param {number} seed
 * @returns {Array<{item, price, fullPrice, discounted, slot}>}
 */
export function generateStock(worldId, seed) {
  const world = getWorld(worldId);
  const perks = getState().shopPerks || {};
  const rng = makeRng(seed >>> 0);
  const slots = BASE_SLOTS + Math.floor(perks.extraSlots || 0);
  const discountChance = Math.min(0.85, BASE_DISCOUNT_CHANCE + (perks.discountBonus || 0));

  /**
   * The pool for THIS world: the permanent catalogue plus the abilities this
   * stretch of road is the only place to buy (src/game/items.js). They go into
   * the rarity tiers rather than into a section of their own — a basin shop
   * rolling legendary should be able to come up with a volcano the same way it
   * comes up with a diadem, and the world's own rarity table already says how
   * often that is.
   */
  const abilities = abilityPoolForWorld(worldId);
  const pool = {
    common: SHOP_POOL.common,
    rare: [...SHOP_POOL.rare, ...abilities.rare],
    legendary: [...SHOP_POOL.legendary, ...abilities.legendary],
  };

  const stock = [];
  const taken = new Set();
  for (let i = 0; i < slots; i++) {
    // Never put the same item on the counter twice. A visit offering "Bandage,
    // Carrot, Bandage" reads as a bug, and it wastes one of only three slots.
    const item = pickUnused(rng, rng.weighted(world.rarity), taken, pool);

    // Only reachable if the entire catalogue is already on the counter, which
    // needs more slots than the game can currently grant. Stop rather than
    // spin: there is genuinely nothing left to sell.
    if (!item) break;
    taken.add(item.id);

    const fullPrice = itemPrice(item, worldId);
    const discounted = rng.chance(discountChance);
    stock.push({
      slot: i,
      item,
      fullPrice,
      discounted,
      price: discounted ? Math.max(1, Math.round((fullPrice * (1 - DISCOUNT_RATE)) / 5) * 5) : fullPrice,
      soldOut: false,
    });
  }
  return stock;
}

/**
 * One item that is not already on the counter.
 *
 * The rolled rarity is searched first, so the world's rarity table still
 * decides what a shop mostly stocks. Only when that pool has nothing new left
 * does the search widen to the other tiers.
 *
 * That fallback is the point. `SHOP_POOL.common` holds three items, and world 1
 * rolls common 78% of the time — so a player who bought a Trader's Ledger for a
 * fourth slot would, on better than a third of visits, have rolled four commons
 * and got three items. A paid upgrade that sometimes does nothing is worse than
 * the duplicate stock this deduplication was added to remove.
 *
 * @param {ReturnType<import('../core/rng.js').makeRng>} rng
 * @param {string} rarity the tier rolled for this slot
 * @param {Set<string>} taken item ids already on the counter
 * @param {Record<string, string[]>} pool this world's stock, by rarity
 * @returns {object|null} null only when every item in the catalogue is taken
 */
function pickUnused(rng, rarity, taken, pool) {
  const tiers = [rarity, ...Object.keys(pool).filter((t) => t !== rarity)];
  for (const tier of tiers) {
    const available = (pool[tier] || [])
      .map(getItem)
      .filter((item) => item && !taken.has(item.id));
    if (available.length) return rng.pick(available);
  }
  return null;
}

/** Seed for a specific shop so re-entering the screen shows the same stock. */
export function shopSeed(worldId, encounterIndex, runSeed) {
  return (runSeed ^ (worldId * 104729) ^ (encounterIndex * 7919)) >>> 0;
}
