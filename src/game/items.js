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
 *   boon        if set, using it leaves something on the player for the next
 *               few DUELS rather than for right now — see `grantBoon` in
 *               src/game/player.js
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
  /**
   * THE ROAD STOPS SELLING LUNCH, AND THAT IS THE PROBLEM THESE TWO SOLVE
   * -------------------------------------------------------------------------
   * Food used to be common and only common. That is fine in the Dust Flats,
   * where a shop rolls common four times in five — and it quietly stops being
   * fine by the basin, where common is thirty per cent of the table and the
   * Galaxy's is eighteen (see `rarity` in src/game/worlds.js). By the last two
   * worlds the counter is stocked with abilities and legendaries, a carrot is
   * not on it, and a player who walked in with an empty gauge starves on a road
   * that has nothing to sell them.
   *
   * So there is food in the rare tier and food in the legendary tier, and both
   * are the same idea rather than "a bigger apple": they fill the gauge to the
   * TOP. That is what a meal is worth when the next shop is eleven duels away
   * — you stop counting percentages and you are simply not hungry any more.
   *
   * `food: 100` is the whole gauge; `addHunger` clamps at HUNGER_MAX, so this
   * is a fill rather than a number that has to be kept in step with one.
   */
  stew: {
    id: 'stew',
    name: 'Trail Stew',
    icon: 'stew',
    rarity: 'rare',
    basePrice: 45,
    context: 'anytime',
    food: 100,
    stack: 10,
    desc: 'A full pot. Fills the hunger gauge to the top, whatever was left in it.',
  },
  /**
   * The legendary meal, and the only item in the game that reaches forward
   * into the fights you have not had yet.
   *
   * Everything else in the bag is spent on the moment it is spent in: a
   * bandage is this life, a stick of dynamite is this round. The feast fills
   * the gauge like the stew and then puts two rounds in your cylinder at the
   * START of each of the next three duels — which is a whole turn you do not
   * have to spend reloading in the open, three times over. See `boon` in
   * src/game/player.js; the duel screen reads it when it builds the fight.
   */
  feast: {
    id: 'feast',
    name: "Traveller's Feast",
    icon: 'feast',
    rarity: 'legendary',
    basePrice: 110,
    context: 'anytime',
    food: 100,
    boon: { id: 'wellFed', label: 'Well fed', duels: 3, bullets: 2 },
    stack: 3,
    desc: 'Fills the gauge, and you ride out of it well fed: the next three duels start with two rounds already loaded.',
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

  /**
   * THE CANTEEN IS THE MAP'S IDEA APPLIED TO HUNGER
   * -------------------------------------------------------------------------
   * Bought once, kept forever, and it changes a rate rather than handing over
   * a quantity. Every other answer to hunger is a thing you consume — and the
   * later a world is, the more of them a crossing costs and the less reliably
   * a shop has any. This is the answer you buy instead of the answer you carry:
   * a third off the drain, permanently, for the rest of the run.
   *
   * It sits in the rare tier and costs about a world's wages in the Dust
   * Flats, which is the point of it — an early run that commits to it walks
   * the whole game hungry a third less often, and one that spends the same
   * gold on a vest does not. The travel band shows the multiplier it produces
   * the same way it shows the horse's, so what you bought is on screen.
   */
  canteen: {
    id: 'canteen',
    name: 'Canteen',
    icon: 'canteen',
    rarity: 'rare',
    basePrice: 220,
    context: 'passive',
    passive: 'canteen',
    stack: 1,
    desc: 'Water for the road. Hunger drains a third slower, for the rest of the run.',
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

  /**
   * THE DUSK TOTEM — THE ONE ITEM THAT SPENDS ITSELF ON THE END OF THE RUN
   * -------------------------------------------------------------------------
   * A vest stops one fatal shot inside one duel. This stops the run ending,
   * wherever the run was about to end: the last life to a rider's bullet, to a
   * rock off an erupting mountain, or to an empty gauge on a road with nothing
   * left to eat on it. It breaks, you come back on half your maximum lives with
   * the gauge full, and it is gone.
   *
   * It is also the only item in the game with a SCENE — see src/ui/totem.js.
   * Everything else that saves you does it in a toast; this one takes the
   * screen, because the thing it just bought you is the only thing in the game
   * that cannot be bought twice in a run.
   */
  duskTotem: {
    id: 'duskTotem',
    name: 'Dusk Totem',
    icon: 'duskTotem',
    rarity: 'legendary',
    basePrice: 700,
    context: 'passive',
    passive: 'revive',
    stack: 1,
    desc: 'When the last life goes, it breaks instead of you: back on half your lives, and back on the road. One use.',
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
  rare: ['potion', 'map', 'ledger', 'stew', 'canteen'],
  legendary: ['vest', 'diadem', 'horse', 'silverTongue', 'feast', 'duskTotem'],
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
