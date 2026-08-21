/**
 * SHOOT! — The people on the road.
 *
 * Two things stand on the walk that never used to: the rider you are about to
 * fight, and the ones you already have.
 *
 * A DUEL USED TO ARRIVE OUT OF NOWHERE
 * ---------------------------------------------------------------------------
 * Every building on this road is *approached*. A shop comes up over the
 * horizon, gets bigger for six seconds and you stop at its door — that is the
 * whole reason the gaps in src/explore/encounters.js are as long as they are.
 * A fight was the one stop with none of that: an empty road, a distance counter
 * quietly ticking over, and then the screen cut to a man standing across from
 * you who had not existed a frame earlier.
 *
 * He exists now. He is standing on the road at the far end of the stretch, he
 * is drawn from as far away as the buildings are, and he gets bigger as you
 * walk at him. The fight starts when you are BATTLE_DISTANCE from him rather
 * than when you reach him — you stop a stand-off apart, which is where a duel
 * is fought from, and the cut to the duel screen is the camera moving rather
 * than the world changing.
 *
 * …AND THEN THE BODY STAYED IN THE DUEL
 * ---------------------------------------------------------------------------
 * The other half. A rider you put down falls over (see `fall` in
 * src/art/sprites-character.js) and the overview goes up over the body — and
 * then the road came back with nothing on it, as though the fight had been
 * somewhere else. So the road remembers: a beaten rider is left lying exactly
 * where he went down, in the pose the duel left him in, and you walk past him.
 *
 * ONE ROLL, TWO SCREENS
 * ---------------------------------------------------------------------------
 * The man on the road has to be the same man in the duel — the same archetype,
 * the same clothes, the same gun — or the approach is a lie. That is free,
 * because `generateEnemy` is a pure function of the world, a seed and how far
 * into the world the stop is, and the seed is derived from the encounter index
 * exactly as src/duel/duel-screen.js derives it. Both screens ask the same
 * question and get the same answer; neither tells the other anything.
 */

import { drawSprite, frameAt } from '../art/pixel.js';
import { CHARACTER_TIMING, PLAYER_SIZE } from '../art/sprites-character.js';
import { generateEnemy, generateBoss, enemySeedFor } from '../game/enemies.js';

/**
 * How far short of a rider the traveller stops, in source pixels.
 *
 * This is the distance a duel is fought at. It is deliberately more than the
 * width of either of them — about three body-widths of open road — because the
 * whole point is that the fight starts while there is still ground between you.
 * Walk into him and it is a brawl; stop a stand-off short and it is a duel.
 */
export const BATTLE_DISTANCE = 52;

/** How long a beaten rider has been lying there before the road stops caring. */
const IDLE_TIMING = CHARACTER_TIMING.idle;

export function createRoadCast() {
  /**
   * One entry per encounter index, so the same rider is never rolled twice.
   * Cleared when the world changes — the indices start again.
   */
  const cache = new Map();
  let cachedWorld = null;

  function look(worldId, event) {
    if (cachedWorld !== worldId) {
      cache.clear();
      cachedWorld = worldId;
    }
    const key = event.index;
    if (cache.has(key)) return cache.get(key);
    const enemy = event.type === 'boss'
      ? generateBoss(worldId)
      : generateEnemy(worldId, enemySeedFor(event.index), event.progress ?? 0);
    const entry = { sprites: enemy.sprites, scale: enemy.scale || 1 };
    cache.set(key, entry);
    return entry;
  }

  /**
   * Draw everyone in the window: the one still standing, and whoever is not.
   *
   * @param {object} o
   * @param {Array}  o.foes    from the walk engine — see `visibleFoes`
   * @param {number} o.cameraX the odometer
   * @param {number} o.groundY the walk line, in device pixels
   * @param {number} o.heroX   where the traveller stands, in device pixels
   * @param {number} o.worldId which world's riders these are
   * @param {number} o.elapsed the screen's animation clock
   */
  function draw(ctx, view, { foes, cameraX, groundY, heroX, worldId, elapsed }) {
    const s = view.scale;
    for (const foe of foes) {
      const entry = look(worldId, foe);
      const set = entry.sprites;
      if (!set) continue;
      /**
       * A beaten rider holds the last frame of his own fall — the heap the
       * duel left on the ground. A live one breathes.
       */
      const frames = foe.resolved ? set.fall : set.idle;
      const frame = foe.resolved
        ? frames[frames.length - 1]
        : frames[frameAt(frames, elapsed, IDLE_TIMING)];
      if (!frame) continue;

      const fs = Math.max(1, Math.round(s * entry.scale));
      // Placed against the traveller's own anchor, exactly as the buildings
      // are: at the moment the stop is reached he is BATTLE_DISTANCE ahead,
      // and that is the same number on every screen size.
      const x = heroX + (foe.worldX - cameraX) * s;
      const y = groundY + 2 * s - frame.height * fs;
      if (x < -frame.width * fs * 2 || x > view.w + frame.width * fs * 2) continue;
      /**
       * Mirrored, because he is looking back down the road at whoever is
       * walking up it. Every fighter in this game is drawn facing right; the
       * one thing on the road that is not going the player's way is the man
       * waiting for him.
       */
      drawSprite(ctx, frame, x, y, fs, true);
    }
  }

  /**
   * The shadows they stand in, drawn with the road rather than with them so the
   * hour of the day falls on them like everything else.
   */
  function shadows(parallax, ctx, view, { foes, cameraX, groundY, heroX, worldId }) {
    const s = view.scale;
    for (const foe of foes) {
      const entry = look(worldId, foe);
      if (!entry.sprites) continue;
      const fs = Math.max(1, Math.round(s * entry.scale));
      const x = heroX + (foe.worldX - cameraX) * s;
      if (x < -PLAYER_SIZE.w * fs * 2 || x > view.w + PLAYER_SIZE.w * fs * 2) continue;
      parallax.drawGroundShadow(ctx, view, x, PLAYER_SIZE.w * fs, groundY);
    }
  }

  return { draw, shadows, reset: () => cache.clear() };
}
