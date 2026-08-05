/**
 * SHOOT! — Biomes.
 *
 * A world says *who* you fight and how rich the loot is. A biome says *where*
 * you are: what the ground looks like, what grows on it, and — the part that
 * reaches into the duel — what the sky is allowed to do.
 *
 * The two are deliberately separate. Several worlds could share one biome, and
 * a biome carries no difficulty of its own, so retheming a world never
 * rebalances it. As it happens each of the six worlds now has a landscape to
 * itself, which is the state this file was always written for rather than a
 * new rule: nothing here would change if two of them shared one tomorrow.
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

  snow: {
    id: 'snow',
    label: 'Pass',
    /**
     * The hardest sky in the game to be caught under, and the least often
     * clear. Snow arrives out of an overcast rather than out of a blue sky —
     * `clear` routes to `cloudy` far more heavily than to anything else — and
     * once it is snowing it usually goes on snowing. There is no rain up here:
     * at this altitude it falls as the thing above it.
     */
    weather: {
      clear: { cloudy: 6, snow: 3, fog: 2 },
      cloudy: { clear: 3, snow: 6, fog: 3 },
      snow: { cloudy: 5, clear: 2, fog: 3 },
      fog: { clear: 3, cloudy: 4, snow: 3 },
    },
  },

  swamp: {
    id: 'swamp',
    label: 'Bayou',
    /**
     * Wetter than the prairie and much stiller. Fog is the resting state of
     * the place rather than a morning event — it comes back off the water
     * every time the rain stops, which is why every route in this table leads
     * to it and why `clear` is the rarest thing the bayou does.
     */
    weather: {
      clear: { cloudy: 4, fog: 5, rain: 3 },
      cloudy: { rain: 6, fog: 4, clear: 2 },
      rain: { cloudy: 4, fog: 5, clear: 2 },
      fog: { cloudy: 4, rain: 3, clear: 3 },
    },
  },

  inferno: {
    id: 'inferno',
    label: 'Basin',
    /**
     * Nothing falls out of this sky that is not on fire or was not recently.
     * No rain — it would not reach the ground — and no fog, because there is
     * no water in the air to make any. The overcast here is smoke.
     */
    weather: {
      clear: { cloudy: 4, ash: 5 },
      cloudy: { ash: 6, clear: 3 },
      ash: { cloudy: 4, clear: 3 },
    },
  },

  void: {
    id: 'void',
    label: 'The Void',
    /**
     * There is no weather in a vacuum, which left two honest options: give the
     * last world nothing but `clear`, or find the one thing that does cross
     * open space. A meteor shower is weather in every way the game cares
     * about — it comes, it changes the view, it changes a duel, it goes — and
     * it is the only sky the Galaxy can have that is not borrowed from a
     * planet.
     *
     * It stays rare. Most of the walk out here is under a still sky, and that
     * stillness is what makes the fall worth looking up at.
     */
    weather: {
      clear: { starfall: 3, clear: 5 },
      starfall: { clear: 8 },
    },
  },
};

export const DEFAULT_BIOME = 'desert';

export function getBiome(id) {
  return BIOMES[id] || BIOMES[DEFAULT_BIOME];
}
