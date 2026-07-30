/**
 * SHOOT! — Inn logic (Block 4).
 *
 * Inns always appear immediately after a shop (enforced by the encounter
 * generator, which emits shop/inn as an inseparable pair), so you can spend
 * your gold and then decide whether what is left is better in lives or in
 * bullets.
 *
 *   Basic Bed    heals innBasicHeal(world) lives — more in later worlds
 *   Premium Bed  heals everything
 *   Both prices follow the same exponential curve as shop items, and both are
 *   eligible for the same random 50% discount (boosted by shop perks).
 */

import { makeRng } from '../core/rng.js';
import {
  innBasicHeal,
  innBasicPrice,
  innPremiumPrice,
} from '../game/progression.js';
import { getState } from '../game/player.js';
import { BASE_DISCOUNT_CHANCE, DISCOUNT_RATE } from './shop.js';

/**
 * Build the two offers for one inn visit.
 * @param {number} worldId
 * @param {number} seed
 */
export function generateOffers(worldId, seed) {
  const rng = makeRng(seed >>> 0);
  const perks = getState().shopPerks || {};
  const discountChance = Math.min(0.85, BASE_DISCOUNT_CHANCE + (perks.discountBonus || 0));

  const build = (id, name, desc, fullPrice, heal) => {
    const discounted = rng.chance(discountChance);
    return {
      id,
      name,
      desc,
      heal,
      fullPrice,
      discounted,
      price: discounted
        ? Math.max(1, Math.round((fullPrice * (1 - DISCOUNT_RATE)) / 5) * 5)
        : fullPrice,
    };
  };

  const basicHeal = innBasicHeal(worldId);
  return [
    build(
      'basic',
      'Basic Bed',
      `A straw mattress and a thin blanket. Restores ${basicHeal} ${basicHeal === 1 ? 'life' : 'lives'}.`,
      innBasicPrice(worldId),
      basicHeal,
    ),
    build(
      'premium',
      'Premium Bed',
      'A real room, a real bath, a real breakfast. Restores every life.',
      innPremiumPrice(worldId),
      Infinity,
    ),
  ];
}

export function innSeed(worldId, encounterIndex, runSeed) {
  return (runSeed ^ (worldId * 15485863) ^ (encounterIndex * 2654435761)) >>> 0;
}
