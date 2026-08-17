/**
 * SHOOT! — The Ember Reaver's fire.
 *
 * One emitter, four screens. It burns on the road, in the duel, on the
 * wardrobe's mannequin and in the cut-scene that announces the outfit — and it
 * is the same object in all four, because a fire that looks slightly different
 * depending on where you are standing is four fires.
 *
 * IT IS THE ONLY GARMENT IN THE GAME THAT IS NOT JUST PIXELS
 * ---------------------------------------------------------------------------
 * Every other thing in the wardrobe is a shape stamped onto the rig at
 * composition time (see the note at the top of src/art/sprites-wardrobe.js) —
 * baked once, drawn as an image, and utterly static apart from the animation
 * frames underneath it. That is the right way to build fifty-odd garments and
 * it is why they all read as one set.
 *
 * This one is different ON PURPOSE, and it is the only one that ever will be.
 * It is the reward for finishing the hardest thing the game has, so it has to
 * be visibly a different KIND of object from the reward for walking fifty
 * miles: not a better shape, not a rarer colour, but a coat that is on fire in
 * every frame the player appears in. A baked sprite cannot do that — an ember
 * that comes off the shoulder has to leave the shoulder, and a sprite sheet has
 * nowhere to put it.
 *
 * WHY THE PARTICLES ARE SQUARES AND NOTHING ELSE
 * ---------------------------------------------------------------------------
 * Every edge in this game is a hard square the size of the scene's own pixel.
 * The moment a fire is drawn with soft round particles it is unmistakably not
 * part of the picture — the eye finds the one anti-aliased thing on screen
 * immediately, and it reads as an effect layer bolted over the art rather than
 * as something happening to the man. So there are no circles, no gradients and
 * no blurs in here: a particle is a `fillRect` of exactly `unit` device pixels,
 * snapped to whole coordinates, on the same grid the sprite under it is on.
 *
 * `unit` comes from the SCENE's scale, not from the fighter's. That is the
 * mistake the Stranger's aura made first (see `drawAura` in
 * src/duel/duel-scene.js): sized against a fighter drawn at twelve device
 * pixels a pixel, the fire comes out as a scatter of squares the size of his
 * eye. Sized against the view, it magnifies with the camera exactly as the art
 * does and still reads as fire ten times in.
 *
 * HOW A SQUARE READS AS A FLAME
 * ---------------------------------------------------------------------------
 * Three things, and none of them is the particle's shape:
 *
 *   COLOUR OVER AGE. A particle is born white-hot, spends most of its life red,
 *   and dies the colour of dried blood. That ramp is what fire is; the shape is
 *   nearly irrelevant next to it. It is quantised to four steps rather than
 *   interpolated, because a continuous ramp on a four-colour palette is a
 *   dither, and a dither at this size is mud.
 *
 *   A WOBBLE ON ITS OWN CLOCK. Every ember drifts sideways on a sine with its
 *   own period and phase. A column of squares rising straight up is a lift; the
 *   same column with each square wandering a pixel and a half either way is a
 *   flame. This costs one `Math.sin` per particle per frame and it is the
 *   single most important line in the file.
 *
 *   A TAIL THAT IS DARKER, NOT LONGER. Behind each ember sits one dim square,
 *   one unit down. Fire drawn with long streaks reads as rain going the wrong
 *   way; one dark pixel behind the hot one reads as the air the ember just left.
 *
 * WHERE THEY COME FROM
 * ---------------------------------------------------------------------------
 * The box handed to `update` is a rectangle the fire clings to — the figure's
 * own bounding box, wherever the caller is drawing one. Half the population
 * spawns along the BOTTOM of it (the fire pooling at the boots and in the hem),
 * a third up the SIDES (the sleeves and the coat tails), and the rest around
 * the CROWN, which is the part any close-up of a face is going to hold. The
 * distribution is copied from the Stranger's aura for exactly that reason: a
 * fire that only exists at ground level is a fire that vanishes the moment a
 * camera pushes in.
 */

import { PALETTE } from './palette.js';

/**
 * The colour of an ember at each quarter of its life, hottest first.
 *
 * Four steps and no interpolation. The first is not red at all — a fire's core
 * is the colour of the light rather than the colour of the fuel, and without a
 * near-white step at the top the whole effect reads as falling paint.
 */
const RAMP = [PALETTE.white, PALETTE.redLight, PALETTE.red, PALETTE.redDark];

/** The dim square that sits behind a hot one. */
const TRAIL = PALETTE.redDeep;

/**
 * How many embers are in the air at full strength.
 *
 * Deliberately modest. This burns behind five layers of parallax, the weather
 * and a walking figure, sixty times a second, on whatever the player happens to
 * own — and a fire made of two hundred particles is not four times as good as
 * one made of fifty, it is the same fire with a frame rate problem. The number
 * was raised until it looked like a coat on fire and then stopped.
 */
const POPULATION = 46;

/** …and how many sparks per second get thrown clear of it. */
const SPARK_RATE = 0.011;

/**
 * @param {object} [opts]
 * @param {number} [opts.intensity] 0 to 1-ish. Scales the population and how
 *   far the fire reaches; the cut-scene opens at a third and turns it all the
 *   way up on the slam.
 * @param {() => number} [opts.random] injectable for anything that wants a
 *   reproducible fire. Nothing does yet; it costs one parameter to never have
 *   to reach in here again.
 */
export function createEmberAura({ intensity = 1, random = Math.random } = {}) {
  /** @type {Array<object>} */
  const parts = [];
  let strength = clamp01(intensity);
  /** The last box we were given, so `draw` knows where the fire is. */
  let box = null;

  /**
   * Where one ember starts, and how big a piece of the fire it is.
   *
   * The three regions are the ones described in the header. `scale` shrinks the
   * ones up the sides and around the crown: a fire pools at the bottom and
   * thins as it climbs, and giving every region the same particle height makes
   * the man look like he is standing inside a column rather than wearing one.
   */
  function spawn() {
    const { x, y, w, h, unit } = box;
    const roll = random();
    let px;
    let py;
    let scale = 1;
    if (roll < 0.5) {
      // The pool at the boots, spread a little wider than he is.
      px = x + w * (0.5 + (random() - 0.5) * (1 + 0.5 * strength));
      py = y + h - unit * random() * 2;
    } else if (roll < 0.82) {
      // Up the sides — the sleeves, and the tails of the coat.
      px = x + (random() < 0.5 ? -unit : w + unit) + (random() - 0.5) * w * 0.35;
      py = y + h * (0.25 + random() * 0.6);
      scale = 0.75;
    } else {
      // Around the crown, which is what a close-up holds.
      px = x + w * (0.1 + random() * 0.8);
      py = y + h * 0.05 + random() * unit * 2;
      scale = 0.6;
    }
    return {
      kind: 'ember',
      x: px,
      y: py,
      /**
       * In device pixels per millisecond, which is the unit every emitter in
       * this codebase works in and the one that is easy to get wrong by an
       * order of magnitude. At 0.02 an ember climbs about sixty pixels a
       * second — up past a shoulder and out in a second and a half.
       */
      vy: -(0.008 + random() * 0.022) * unit * (0.6 + strength * 0.6),
      wobble: 110 + random() * 260,
      phase: random() * Math.PI * 2,
      sway: (0.4 + random() * 1.1) * unit,
      size: Math.max(1, Math.round(unit * (random() < 0.22 ? 2 : 1))),
      life: (620 + random() * 900) * scale,
      t: 0,
      /**
       * A third of the fire is drawn IN FRONT of the figure.
       *
       * All of it behind is the tidy choice and the wrong one, for the reason
       * the Stranger's aura learned the hard way: behind a silhouette this
       * solid, fire is only visible where it clears the outline, so a close-up
       * comes out with no fire in it at all. Some of it licking over him is
       * both truer — he is burning, not standing in front of a bonfire — and
       * the only version that survives a camera coming in.
       */
      front: random() < 0.34,
    };
  }

  /** A spark: faster, thrown outward, and it falls back. */
  function spawnSpark() {
    const { x, y, w, h, unit } = box;
    return {
      kind: 'spark',
      x: x + random() * w,
      y: y + h * (0.25 + random() * 0.7),
      vx: (random() - 0.5) * 0.05 * unit,
      vy: -(0.02 + random() * 0.05) * unit,
      g: 0.00006 * unit,
      size: Math.max(1, Math.round(unit)),
      life: 500 + random() * 700,
      t: 0,
      front: true,
    };
  }

  return {
    /**
     * Advance the fire and tell it where the figure is standing.
     *
     * @param {number} dt milliseconds
     * @param {{x: number, y: number, w: number, h: number, unit: number}} rect
     *   the figure's bounding box in device pixels — `x`/`y` its TOP-LEFT
     *   corner — and `unit` the size of one scene pixel. Pass null (or nothing)
     *   to let the fire burn out where it is, which is what a caller does when
     *   the figure it was following has left the screen.
     */
    update(dt, rect) {
      if (rect) box = rect;
      if (!box) return;

      const want = Math.round(POPULATION * strength);
      let alive = 0;
      for (const p of parts) if (p.kind === 'ember') alive += 1;
      for (let i = alive; i < want; i++) parts.push(spawn());

      if (random() < SPARK_RATE * strength * dt) parts.push(spawnSpark());

      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.t += dt;
        p.y += p.vy * dt;
        if (p.kind === 'spark') {
          p.x += p.vx * dt;
          p.vy += p.g * dt;
        } else {
          // The wobble. See the header: this is what makes a square a flame.
          p.x += Math.sin(p.phase + p.t / p.wobble) * p.sway * (dt / 1000);
        }
        if (p.t < p.life) continue;
        // Embers are a fixed population that respawn where they die, so the
        // fire is always the same size rather than pulsing with the frame
        // rate. Sparks are extra and simply go out.
        if (p.kind === 'ember' && alive <= want) Object.assign(p, spawn());
        else parts.splice(i, 1);
      }
    },

    /**
     * Draw one pass of it.
     * @param {CanvasRenderingContext2D} ctx
     * @param {'back'|'front'} pass which side of the figure this pass is on.
     *   Callers that have nothing to draw between the two (the cut-scene, a
     *   card) simply call both back to back.
     */
    draw(ctx, pass = 'front') {
      if (!box || !parts.length) return;
      const wantFront = pass === 'front';
      for (const p of parts) {
        if (p.front !== wantFront) continue;
        const k = 1 - p.t / p.life;
        if (k <= 0) continue;
        const x = Math.round(p.x);
        const y = Math.round(p.y);
        // Quantised to the four steps of the ramp — see the note on RAMP.
        const step = Math.min(RAMP.length - 1, Math.floor((1 - k) * RAMP.length));

        ctx.globalAlpha = 0.42 * k;
        ctx.fillStyle = TRAIL;
        ctx.fillRect(x, y + p.size, p.size, p.size);

        ctx.globalAlpha = Math.min(1, k * 1.5);
        ctx.fillStyle = RAMP[step];
        ctx.fillRect(x, y, p.size, p.size);
      }
      ctx.globalAlpha = 1;
    },

    /** Turn it up or down. The population follows on the next frame. */
    setIntensity(value) {
      strength = clamp01(value);
    },

    /** Throw a handful of sparks all at once — the slam in the cut-scene. */
    burst(count = 30) {
      if (!box) return;
      for (let i = 0; i < count; i++) parts.push(spawnSpark());
    },

    /** Put it out. Used when a screen is torn down mid-burn. */
    clear() {
      parts.length = 0;
    },

    /** How many particles are in the air. The harness and the panel ask. */
    get size() {
      return parts.length;
    },
  };
}

const clamp01 = (n) => Math.max(0, Math.min(1, Number(n) || 0));
