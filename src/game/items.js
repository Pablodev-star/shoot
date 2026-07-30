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
 *   stack       max copies held (Infinity for consumables that stack freely)
 *   shopPerk    if set, buying it permanently upgrades future shop visits
 *   desc        one-line explanation shown in shops and the inventory
 *
 * ADDING AN ITEM: append an entry here. Shops, inventory, selling and the duel
 * item bar all pick it up automatically.
 */

export const ITEMS = {
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

  // --- Duel items ----------------------------------------------------------
  dynamite: {
    id: 'dynamite',
    name: 'Dynamite',
    icon: 'dynamite',
    rarity: 'rare',
    basePrice: 120,
    context: 'duel',
    duelEffect: 'dynamite',
    stack: 10,
    desc: 'Throw it: 1 damage that ignores shields.',
  },
  poison: {
    id: 'poison',
    name: 'Poison',
    icon: 'poison',
    rarity: 'rare',
    basePrice: 110,
    context: 'duel',
    duelEffect: 'poison',
    stack: 10,
    desc: 'Poisons your rival: 1 damage after 3 rounds.',
  },

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
  map: {
    id: 'map',
    name: 'Map',
    icon: 'map',
    rarity: 'rare',
    basePrice: 140,
    context: 'utility',
    stack: 5,
    desc: 'Reveals what is waiting further down this stretch of road.',
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

export const ITEM_LIST = Object.values(ITEMS);

/** Items shops may stock, grouped by rarity (perks and food included). */
export const SHOP_POOL = {
  common: ['carrot', 'apple', 'bandage'],
  rare: ['potion', 'dynamite', 'poison', 'map', 'ledger'],
  legendary: ['vest', 'diadem', 'horse', 'silverTongue'],
};

export function getItem(id) {
  return ITEMS[id] || null;
}

/** Fraction of the purchase price you get back when selling. */
export const SELL_RATIO = 0.5;
