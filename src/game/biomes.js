/**
 * SHOOT! — Biomes.
 *
 * A world says *who* you fight and how rich the loot is. A biome says *where*
 * you are: what the ground looks like, what grows on it, and — the part that
 * reaches into the duel — what the sky is allowed to do.
 *
 * The two are deliberately separate. Several worlds can share one biome (four
 * of the six still ride the desert while their own landscapes are being
 * drawn), and a biome carries no difficulty of its own, so retheming a world
 * never rebalances it.
 *
 * WEATHER IS PER BIOME, AND THAT IS THE POINT
 * ---------------------------------------------------------------------------
 * There is no global weather table any more. Each biome lists which states it
 * can be in and how likely it is to move between them, and the weather system
 * can only ever roll something from that table. A sandstorm on the prairie was
 * the clearest thing wrong with the old single table — sand needs a desert to
 * come from — and the fix generalises: the prairie gets river fog instead,
 * which would look absurd over open sand.
 *
 * `clear` is the hub state in every biome. A biome may omit any other state,
 * including `clear`'s route to it, but every state it does list must have a
 * way back to `clear` or the sky will get stuck.
 *
 * The art side of a biome — props, layers, ambient life — lives in
 * `src/art/biomes/<id>.js` and is keyed by the same id.
 */

export const BIOMES = {
  desert: {
    id: 'desert',
    label: 'Desert',
    /**
     * Hot, dry, and prone to the harshest weather in the game. Rain here is a
     * rare, violent thing, which is why it is weighted below the sand.
     */
    weather: {
      clear: { cloudy: 5, rain: 2, sandstorm: 3 },
      cloudy: { clear: 5, rain: 3, sandstorm: 2 },
      rain: { clear: 4, cloudy: 4 },
      sandstorm: { clear: 5, cloudy: 2 },
    },
  },

  meadow: {
    id: 'meadow',
    label: 'Prairie',
    /**
     * Wet and mild. No sandstorm — there is no sand — but the open grass gets
     * far more rain than the desert does, and the mornings fog in.
     */
    weather: {
      clear: { cloudy: 5, rain: 3, fog: 3 },
      cloudy: { clear: 4, rain: 5, fog: 2 },
      rain: { clear: 4, cloudy: 4, fog: 2 },
      fog: { clear: 5, cloudy: 3 },
    },
  },
};

export const DEFAULT_BIOME = 'desert';

export function getBiome(id) {
  return BIOMES[id] || BIOMES[DEFAULT_BIOME];
}
