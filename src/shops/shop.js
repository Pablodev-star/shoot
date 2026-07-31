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
import { SHOP_POOL, getItem } from '../game/items.js';
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

  const stock = [];
  const taken = new Set();
  for (let i = 0; i < slots; i++) {
    const rarity = rng.weighted(world.rarity);
    const pool = SHOP_POOL[rarity] || SHOP_POOL.common;

    // Never put the same item on the counter twice. A visit offering "Bandage,
    // Carrot, Bandage" reads as a bug, and it wastes one of only three slots.
    // Re-roll within the rolled rarity, then fall back to any unused item in
    // that pool, so a small pool still fills the shelf.
    let item = null;
    for (let attempt = 0; attempt < 6 && !item; attempt++) {
      const candidate = getItem(rng.pick(pool));
      if (candidate && !taken.has(candidate.id)) item = candidate;
    }
    if (!item) item = pool.map(getItem).find((entry) => entry && !taken.has(entry.id));
    if (!item) continue;
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

/** Seed for a specific shop so re-entering the screen shows the same stock. */
export function shopSeed(worldId, encounterIndex, runSeed) {
  return (runSeed ^ (worldId * 104729) ^ (encounterIndex * 7919)) >>> 0;
}
