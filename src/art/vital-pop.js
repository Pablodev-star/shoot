/**
 * SHOOT! — What using something LOOKS like.
 *
 * A bandage used to be a number changing. You opened the bag, tapped Use, the
 * panel closed, and somewhere behind it a red diamond quietly filled in. The
 * most important thing a player can do outside a gunfight — spending a
 * consumable to stay alive — had no picture at all, and in the middle of a
 * duel, where the bag closes onto a fight already in motion, it was routinely
 * missed altogether.
 *
 * So it happens ON the man. Two pops, and they are deliberately the same shape
 * in two colours, because they are the same kind of event:
 *
 *   HEAL  the whole figure washes GREEN, and a dark green plus rises out of
 *         his chest and fades. Bandages, med kits, potions.
 *   FOOD  the same wash in ORANGE, and what rises is the food's own icon in a
 *         darker orange — the carrot you just ate, drawn as the carrot.
 *
 * WHY IT LIVES IN /art AND NOT IN EITHER SCREEN
 * ---------------------------------------------------------------------------
 * Both places that draw the player need it and neither should own it: the road
 * (src/explore/explore-screen.js) and the duel (src/duel/duel-scene.js) draw
 * the same character at different scales in different coordinate systems. This
 * is a list of live pops with an update and a draw, and each screen tells it
 * where the body is this frame. The screens do not know what a med kit is; this
 * does not know where the ground is.
 *
 * The wash is returned rather than drawn, because the two screens tint their
 * fighter differently — the duel already has a status-tint pass with a cache in
 * it, and the road draws one sprite with no pass at all.
 */

import { PALETTE } from './palette.js';
import { drawSprite, tinted } from './pixel.js';
import { getItemSprites } from './sprites-items.js';

/** How long a pop is on screen, in milliseconds. */
export const POP_MS = 950;

/**
 * The two flavours. `wash` is what the body turns; `mark` is what the symbol
 * over it is drawn in — always the darker of the pair, so it reads AGAINST the
 * wash rather than dissolving into it.
 */
const KINDS = {
  heal: { wash: PALETTE.greenLight, mark: PALETTE.greenDark },
  food: { wash: PALETTE.magma, mark: PALETTE.magmaDeep },
};

/** Cache of icons already silhouetted in a mark colour. */
const markCache = new Map();

/**
 * The item's own icon, pushed towards the mark colour but not flattened into
 * it. A solid silhouette was tried first and an apple came out as an orange
 * blob — what makes the pop readable is that you can see WHICH thing you just
 * ate, so the tint is heavy enough to say "this is the food pop" and light
 * enough to leave the drawing underneath.
 */
function markedIcon(name, color) {
  const key = `${name}|${color}`;
  let out = markCache.get(key);
  if (!out) {
    const icons = getItemSprites().icons;
    const source = icons[name] || icons.carrot;
    out = tinted(source, color, 0.7);
    markCache.set(key, out);
  }
  return out;
}

export function createVitalPops() {
  /** @type {{kind: string, icon: string|null, t: number}[]} */
  const pops = [];

  return {
    /**
     * @param {'heal'|'food'} kind
     * @param {string|null} [iconName] the item's icon, for a food pop
     */
    spawn(kind, iconName = null) {
      if (!KINDS[kind]) return;
      // Two bandages in two seconds are two pops; two in the same frame are
      // one, because the second would be drawn exactly on top of the first.
      if (pops.length && pops[pops.length - 1].t < 60) return;
      pops.push({ kind, icon: iconName, t: 0 });
    },

    update(dt) {
      for (let i = pops.length - 1; i >= 0; i--) {
        pops[i].t += dt;
        if (pops[i].t >= POP_MS) pops.splice(i, 1);
      }
    },

    /** True while anything is running, so a caller can skip the work. */
    get active() {
      return pops.length > 0;
    },

    /**
     * What colour the body is right now, or null.
     *
     * The wash comes up fast and goes out slowly — a half-sine skewed towards
     * the front — because the thing being announced happened at the START of
     * the pop and everything after it is the announcement fading.
     */
    wash() {
      const pop = pops[pops.length - 1];
      if (!pop) return null;
      const k = pop.t / POP_MS;
      const alpha = k < 0.2 ? k / 0.2 : (1 - (k - 0.2) / 0.8) ** 1.6;
      return { color: KINDS[pop.kind].wash, alpha: alpha * 0.82 };
    },

    /**
     * The symbol, floating up out of the chest.
     *
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} cx centre of the body, in device pixels
     * @param {number} cy the chest, in device pixels
     * @param {number} scale the fighter's own draw scale
     */
    draw(ctx, cx, cy, scale) {
      for (const pop of pops) {
        const k = pop.t / POP_MS;
        const rise = k * 10 * scale;
        // Solid while it is arriving, then out. The float never stops, so the
        // symbol is still moving when it disappears — a mark that fades to
        // nothing while standing still reads as a rendering glitch.
        ctx.globalAlpha = k < 0.55 ? 1 : 1 - (k - 0.55) / 0.45;
        const y = cy - rise;
        if (pop.kind === 'food' && pop.icon) {
          const art = markedIcon(pop.icon, KINDS.food.mark);
          const s = Math.max(1, Math.round(scale * 0.75));
          drawSprite(ctx, art, Math.round(cx - (art.width * s) / 2), Math.round(y - art.height * s), s);
        } else {
          drawPlus(ctx, cx, y, scale, KINDS[pop.kind].mark);
        }
        ctx.globalAlpha = 1;
      }
    },
  };
}

/**
 * A plus, built out of the same square pixels as everything else on screen: a
 * three-by-three of source pixels with the corners left out. Drawn rather than
 * baked because it is four rectangles and a colour.
 */
function drawPlus(ctx, cx, cy, scale, color) {
  const u = Math.max(2, Math.round(scale * 1.5));
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(cx - u / 2), Math.round(cy - u * 1.5), u, u * 3);
  ctx.fillRect(Math.round(cx - u * 1.5), Math.round(cy - u / 2), u * 3, u);
}
