/**
 * SHOOT! — Shop logic (Block 4).
 *
 * A shop visit is generated from four inputs: the world (rarity table + price
 * multipliers), the player's accumulated shop perks, a seed, and the item
 * catalogue. Nothing is hard-coded per world.
 *
 *   slot 0     = always something that heals — see the note in `generateStock`
 *   slots      = BASE_SLOTS + perks.extraSlots
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
 * HOW MANY OF A THING A COUNTER ACTUALLY HAS
 * ---------------------------------------------------------------------------
 * Every slot used to hold exactly one of whatever it was, permanent or not,
 * which quietly made a shop the wrong shape. A vest and a horse are singular —
 * there is one of each in the world and buying it is the event. A bandage is
 * not: a store that has ONE bandage is not a store, it is a curiosity, and a
 * world with two such stores offered a total of four lives for sale against
 * nine duels' worth of damage.
 *
 * That was the single biggest reason a run ended. Not a fight lost — a fight
 * won nine times with nowhere to buy the difference back. So anything the
 * catalogue lets you stack is stocked in DEPTH, and the decision at the
 * counter goes from "is this the one thing I get" to "how much of my purse do
 * I turn into lives, and how much do I keep for the gun". That is a decision
 * the player can be good at, which is the whole point.
 *
 * Permanent kit — the map, the canteen, the vest, an ability — stays at one,
 * because a second one does nothing.
 */
export const STOCK_DEPTH = 5;

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

  /**
   * ONE THING THAT PUTS LIVES BACK, ALWAYS
   * -------------------------------------------------------------------------
   * The counter used to be three rolls off the world's rarity table and
   * nothing else, which quietly made the single most important resource in the
   * game — lives — something you could only buy if the dice offered it. By the
   * basin a shop rolls common less than a third of the time, so a player who
   * had done everything right, arrived with a full purse and needed a bandage
   * could be told no by a shuffle. That is the definition of a run decided by
   * luck rather than by play: the decision was made correctly and the game
   * refused to honour it.
   *
   * So slot zero is a heal. Which heal still depends on the world's table (a
   * bandage in the flats, a potion where potions are what the table offers),
   * the price is the ordinary price, and the discount roll is the ordinary
   * roll — the guarantee is only that gold can always be turned into lives.
   * Everything else on the counter is still whatever the road felt like.
   */
  const HEALS = ['potion', 'bandage'];

  /** One counter entry, with as many of the thing on it as it can hold. */
  const entry = (item, slot) => {
    const fullPrice = itemPrice(item, worldId);
    const discounted = rng.chance(discountChance);
    // Food says how deep its own counter is; everything stackable else takes
    // the house default; permanent kit is one apiece.
    const units = item.depth ?? (item.stack > 1 ? STOCK_DEPTH : 1);
    return {
      slot,
      item,
      fullPrice,
      discounted,
      price: discounted ? Math.max(1, Math.round((fullPrice * (1 - DISCOUNT_RATE)) / 5) * 5) : fullPrice,
      /** How many are left on the counter. */
      units,
      stocked: units,
      get soldOut() {
        return this.units <= 0;
      },
    };
  };

  const stock = [];
  const taken = new Set();
  const guaranteed = rng.weighted(world.rarity) === 'common' ? 'bandage' : rng.pick(HEALS);
  taken.add(guaranteed);
  stock.push(entry(getItem(guaranteed), 0));

  for (let i = stock.length; i < slots; i++) {
    // Never put the same item on the counter twice. A visit offering "Bandage,
    // Carrot, Bandage" reads as a bug, and it wastes one of only three slots.
    const item = pickUnused(rng, rng.weighted(world.rarity), taken, pool);

    // Only reachable if the entire catalogue is already on the counter, which
    // needs more slots than the game can currently grant. Stop rather than
    // spin: there is genuinely nothing left to sell.
    if (!item) break;
    taken.add(item.id);
    stock.push(entry(item, i));
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
