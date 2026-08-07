/**
 * SHOOT! — Item catalogue (Blocks 4 & 5).
 *
 * One table drives shops, the inventory grid, duel abilities and selling.
 *
 * FIELDS
 *   id          stable key used in saves — never rename one of these
 *   name        display name (English)
 *   icon        key into src/art/sprites-items.js
 *   rarity      common | rare | legendary — drives frame color and price
 *   basePrice   world-1 price; scaled exponentially by world (see pricing.js)
 *   context     where the item can be used:
 *                 'anytime'  usable from the inventory at any moment
 *                 'duel'     usable only during a duel
 *                 'passive'  works automatically while owned
 *                 'utility'  consumed for information (Map)
 *                 'special'  one-off unlocks (Horse)
 *                 'ability'  equipped into a duel slot, never consumed
 *   stack       max copies held (Infinity for consumables that stack freely)
 *   shopPerk    if set, buying it permanently upgrades future shop visits
 *   desc        one-line explanation shown in shops and the inventory
 *
 * ADDING AN ITEM: append an entry here. Shops, inventory, selling and the duel
 * item bar all pick it up automatically.
 *
 * ABILITIES ARE ITEMS, AND THAT IS THE WHOLE INTEGRATION
 * ---------------------------------------------------------------------------
 * The twenty-four things a player can buy out of src/game/world-abilities.js
 * are not a parallel system with a parallel shop, a parallel save format and a
 * parallel grid. They are generated into this table at load (`buildAbilityItems`
 * at the bottom), so a volcano goes in the saddlebag next to a carrot: shops
 * stock it, the inventory draws it, selling refunds it and the save file
 * already knows how to write it down.
 *
 * What makes one an ability rather than a bandage is two fields — `context:
 * 'ability'`, which means using it EQUIPS it instead of spending it, and
 * `ability`, which says which entry in the catalogue it stands for.
 */

import {
  ABILITIES,
  SPECIALS,
  ABILITY_PRICE,
  playerAbility,
  playerSpecial,
} from './world-abilities.js';

const CATALOGUE = {
  // --- Food (hunger) -------------------------------------------------------
  carrot: {
    id: 'carrot',
    name: 'Carrot',
    icon: 'carrot',
    rarity: 'common',
    basePrice: 12,
    context: 'anytime',
    food: 22,
    stack: 99,
    desc: 'Restores 22% hunger. Cheap and always in stock.',
  },
  apple: {
    id: 'apple',
    name: 'Apple',
    icon: 'apple',
    rarity: 'common',
    basePrice: 20,
    context: 'anytime',
    food: 40,
    stack: 99,
    desc: 'Restores 40% hunger.',
  },

  // --- Healing -------------------------------------------------------------
  bandage: {
    id: 'bandage',
    name: 'Bandage',
    icon: 'bandage',
    rarity: 'common',
    basePrice: 35,
    context: 'anytime',
    heal: 1,
    stack: 20,
    desc: 'Patches you up for 1 life.',
  },
  potion: {
    id: 'potion',
    name: 'Potion',
    icon: 'potion',
    rarity: 'rare',
    basePrice: 90,
    context: 'anytime',
    heal: 3,
    stack: 10,
    desc: 'Restores 3 lives in one gulp.',
  },

  /**
   * THERE ARE NO DUEL THROWABLES ANY MORE
   * -------------------------------------------------------------------------
   * Dynamite and Poison used to live here, as ten-stack items any shop in the
   * game would sell. Both are world ABILITIES now — dynamite belongs to
   * Brimstone Basin and poison to the Blackwater Bayou, they are sold in those
   * worlds' shops and nowhere else, and they were rewritten to be worth the
   * trip (three lives at once, and a life a round for three rounds). See
   * src/game/world-abilities.js.
   *
   * What is left in the bag for a duel is what was always the honest part of
   * it: something to eat and something to patch yourself up with.
   */

  // --- Passives ------------------------------------------------------------
  vest: {
    id: 'vest',
    name: 'Bulletproof Vest',
    icon: 'vest',
    rarity: 'legendary',
    basePrice: 420,
    context: 'passive',
    passive: 'survive',
    stack: 3,
    desc: 'Absorbs the first fatal shot of every duel. Consumed on use.',
  },
  diadem: {
    id: 'diadem',
    name: 'Anti-Effect Diadem',
    icon: 'diadem',
    rarity: 'legendary',
    basePrice: 520,
    context: 'passive',
    passive: 'immune',
    stack: 1,
    desc: 'While worn, enemy abilities have no effect on you.',
  },

  // --- Utility -------------------------------------------------------------
  /**
   * The Map is a TOOL, NOT A CHARGE.
   *
   * It used to be a five-stack consumable that spent one copy to print three
   * words in a toast. That made it something you hoarded and never used: the
   * information was worth less than the copy it cost, so the correct play was
   * always to keep it. Now it is bought once, kept forever, and opened as often
   * as you like — see `src/ui/map-panel.js`. The stack is 1 because a second
   * copy of a permanent tool does nothing, and the price carries the change.
   */
  map: {
    id: 'map',
    name: 'Map',
    icon: 'map',
    rarity: 'rare',
    basePrice: 180,
    context: 'utility',
    stack: 1,
    desc: 'Opens the trail map: every duel, shop, inn and boss on the road ahead. Never runs out.',
  },

  // --- Special -------------------------------------------------------------
  horse: {
    id: 'horse',
    name: 'Horse',
    icon: 'horseToken',
    rarity: 'legendary',
    basePrice: 650,
    context: 'special',
    unlock: 'horse',
    stack: 1,
    desc: 'Ride instead of walk. Cuts travel time roughly in half.',
  },

  // --- Shop perks (stackable upgrades to future shop visits) ---------------
  ledger: {
    id: 'ledger',
    name: "Trader's Ledger",
    icon: 'shopTag',
    rarity: 'rare',
    basePrice: 260,
    context: 'passive',
    shopPerk: { extraSlots: 1 },
    stack: 4,
    desc: 'Every shop from now on displays one extra item.',
  },
  silverTongue: {
    id: 'silverTongue',
    name: 'Silver Tongue',
    icon: 'coin',
    rarity: 'legendary',
    basePrice: 480,
    context: 'passive',
    shopPerk: { discountBonus: 0.18 },
    stack: 3,
    desc: 'Discounts appear far more often in shops and inns.',
  },
};

/**
 * Turn the ability catalogue into shop entries.
 *
 * One per themed ability and one per world special, priced off the same two
 * base numbers for every world — the exponential curve in
 * src/game/progression.js is what makes the basin's kit cost eight times the
 * flats', not a number written out twenty-four times here.
 *
 * The id carries its kind (`ab-` / `sp-`) because ids are what saves are made
 * of: a file written today has to still say what it meant a year from now, and
 * `ab-emberBite` says it without a lookup.
 */
function buildAbilityItems() {
  const out = {};
  for (const id of Object.keys(ABILITIES)) {
    const player = playerAbility(id);
    // The four unthemed base effects are the enemy's vocabulary, not stock.
    if (!player || !player.world) continue;
    out[`ab-${id}`] = {
      id: `ab-${id}`,
      name: player.label,
      icon: player.icon,
      rarity: 'rare',
      basePrice: ABILITY_PRICE.basic,
      context: 'ability',
      ability: { kind: 'basic', ref: id },
      stack: 1,
      world: player.world,
      desc: player.desc,
    };
  }
  for (const id of Object.keys(SPECIALS)) {
    const player = playerSpecial(id);
    out[`sp-${id}`] = {
      id: `sp-${id}`,
      name: player.label,
      icon: player.icon,
      rarity: 'legendary',
      basePrice: ABILITY_PRICE.special,
      context: 'ability',
      ability: { kind: 'special', ref: id },
      stack: 1,
      world: player.world,
      desc: player.desc,
    };
  }
  return out;
}

export const ITEMS = { ...CATALOGUE, ...buildAbilityItems() };

export const ITEM_LIST = Object.values(ITEMS);

/** Items shops may stock, grouped by rarity (perks and food included). */
export const SHOP_POOL = {
  common: ['carrot', 'apple', 'bandage'],
  rare: ['potion', 'map', 'ledger'],
  legendary: ['vest', 'diadem', 'horse', 'silverTongue'],
};

/**
 * The ability items a given world's counter may carry, by rarity.
 *
 * A world sells its OWN kit and nobody else's, which is what makes the shop a
 * reason to look at the road you are on: the basin does not stock frostbite,
 * and the pass has never heard of a volcano. It is also the upgrade path — the
 * only way to a stronger version of an effect is to reach the world that has
 * one. See the band table in src/game/world-abilities.js.
 */
export function abilityPoolForWorld(worldId) {
  const mine = (item) => item.ability && item.world === worldId;
  const list = ITEM_LIST.filter(mine);
  return {
    rare: list.filter((i) => i.ability.kind === 'basic').map((i) => i.id),
    legendary: list.filter((i) => i.ability.kind === 'special').map((i) => i.id),
  };
}

export function getItem(id) {
  return ITEMS[id] || null;
}

/** Fraction of the purchase price you get back when selling. */
export const SELL_RATIO = 0.5;
