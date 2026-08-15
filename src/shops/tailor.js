/**
 * SHOOT! — The clothing shop's stock.
 *
 * The general store's counter, wearing different goods. That is not laziness,
 * it is the point: a player who has bought a bandage knows exactly how this
 * screen works before they read a word of it — three things on a shelf, a price
 * under each, a red flag on whatever came in cheap — and the only thing they
 * have to learn is what is being sold.
 *
 * So the rules are the SHOP's rules, deliberately, down to the last multiplier:
 *
 *   slots      = BASE_SLOTS + perks.extraSlots (+ the admin's own)
 *   discount   = 50% off, at BASE_DISCOUNT_CHANCE + perks.discountBonus
 *   price      = itemPrice(garment, world) — the same exponential curve, so a
 *                shirt in the Galaxy costs what the Galaxy costs
 *
 * A Trader's Ledger bought in the Dust Flats puts a fourth garment on this rail
 * in the Bayou, and a Silver Tongue makes the half-price flag as likely here as
 * it is over a med kit. Two shops with different arithmetic would make one of
 * those items quietly worse than the other for no reason a player could see.
 *
 * WHAT IS ON THE RAIL
 * ---------------------------------------------------------------------------
 * Only what the ledger will never hand over. Every garment in here is
 * `source: 'shop'` (see src/game/wardrobe.js) — the achievements' clothes are
 * not sold at any price, and the shop's clothes are not earned by anything.
 * Nothing already owned is offered either: this shop happens ONCE in a run, and
 * a slot spent on a hat that is already in the drawer is a third of the whole
 * event wasted.
 *
 * And what is bought is bought for good. A garment is written to the profile,
 * not to the save slot — see `grantClothing`. A shop that turns up once a run
 * and sells things a bad duel can take away is a shop nobody should stop at.
 */

import { makeRng } from '../core/rng.js';
import { getState } from '../game/player.js';
import { itemPrice } from '../game/progression.js';
import { clothingOffers } from '../game/wardrobe.js';
import { BASE_SLOTS, BASE_DISCOUNT_CHANCE, DISCOUNT_RATE } from './shop.js';
import { OVERRIDES } from '../admin/overrides.js';

export { DISCOUNT_RATE };

/**
 * Build one visit's rail.
 *
 * @param {number} worldId
 * @param {number} seed
 * @returns {Array<object>} one entry per hanger, in shelf order
 */
export function generateRail(worldId, seed) {
  const perks = getState().shopPerks || {};
  const admin = OVERRIDES.shop;
  const rng = makeRng(seed >>> 0);
  const slots = Math.max(
    1,
    BASE_SLOTS + Math.floor(perks.extraSlots || 0) + (admin.extraSlots || 0),
  );
  const discountChance = admin.discountChance != null
    ? admin.discountChance
    : Math.min(0.85, BASE_DISCOUNT_CHANCE + (perks.discountBonus || 0));

  /**
   * The pool is shuffled and then taken from the top rather than picked from
   * repeatedly, which is the same "never twice on one counter" rule the general
   * store keeps — and here it matters more, because two of the three hangers
   * holding the same waistcoat would be two thirds of the only clothing shop in
   * the run.
   */
  const pool = clothingOffers();
  rng.shuffle(pool);

  return pool.slice(0, slots).map((offer, slot) => {
    const fullPrice = itemPrice({ basePrice: offer.basePrice }, worldId);
    const discounted = rng.chance(discountChance);
    return {
      slot,
      offer,
      fullPrice,
      discounted,
      price: discounted
        ? Math.max(1, Math.round((fullPrice * (1 - DISCOUNT_RATE)) / 5) * 5)
        : fullPrice,
      /** Set once it has been paid for, so the card can say so without a reload. */
      bought: false,
    };
  });
}

/**
 * The seed for one clothing shop, so leaving the screen and coming back shows
 * the same rail — the same guarantee `shopSeed` gives the general store, with a
 * different constant so the two never roll in step.
 */
export function tailorSeed(worldId, encounterIndex, runSeed) {
  return (runSeed ^ (worldId * 92821) ^ (encounterIndex * 6353) ^ 0x5eed) >>> 0;
}
