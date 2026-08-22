/**
 * SHOOT! — The hard road, on fire.
 *
 * WHAT THIS IS FOR
 * ---------------------------------------------------------------------------
 * Choosing Hard in the slot picker used to do one thing: the card's border went
 * red. That is the correct amount of interface for a checkbox and the wrong
 * amount for the decision it actually is — a slot is a Normal run or a Hard run
 * for as long as it exists, it cannot be changed afterwards, and on the hard
 * road every gun is a rung further up the ladder than the player has ever seen
 * it. A red edge does not say any of that. It says "selected".
 *
 * So the card BURNS. Fire comes up off the bottom edge, embers come off the
 * fire, the heat sits behind the type, and the whole thing flares when the mode
 * is chosen. It is the same promise the unlock cut-scene makes with a black
 * screen and a bell — see src/ui/hard-mode-cutscene.js — made small enough to
 * live on a card in a list.
 *
 * IT IS THE SAME FIRE AS EVERYTHING ELSE
 * ---------------------------------------------------------------------------
 * The embers are `createEmberAura` from src/art/ember-aura.js: the Ember
 * Reaver's coat, the emitter that burns on the player's shoulders on the road,
 * in a duel, on the wardrobe's mannequin and in the cut-scene. This is its
 * fifth screen and it is deliberately not a sixth fire that looks similar —
 * the outfit at the end of the hard road and the card that offers the hard road
 * burn with the same particles, and the recognition is the point.
 *
 * What the aura does not have is a BODY. It is embers coming off something,
 * and on the road that something is a man; here there is nothing under it, so
 * the flames themselves are drawn here: a row of columns along the bottom edge,
 * each one flickering on its own clock, quantised to the same square grid every
 * other pixel in this game is on. No gradients, no blur, no round particles —
 * see the note on why in src/art/ember-aura.js.
 *
 * WHAT IT COSTS, AND WHEN IT COSTS NOTHING
 * ---------------------------------------------------------------------------
 * One canvas and one animation frame per burning card, and at most one card in
 * the picker is ever hard at a time in practice. It stops itself the moment the
 * card leaves the document (the picker rebuilds its grid on every change) and
 * the screen tears the rest down on unmount.
 *
 * A player who has asked for less motion gets ONE frame of it: the fire is
 * drawn once, at rest, and the loop never starts. The card is still visibly on
 * fire; it simply is not moving. That is the same bargain the rest of the
 * interface makes under `prefers-reduced-motion` (see styles/base.css) — the
 * layout, not the choreography.
 */

import { el } from '../core/dom.js';
import { crisp } from '../art/pixel.js';
import { PALETTE } from '../art/palette.js';
import { createEmberAura } from '../art/ember-aura.js';

/**
 * The flame ramp, hottest first, and it is NOT the ember ramp.
 *
 * An ember in the air is cooling — it is born white and dies the colour of
 * dried blood. The body of a fire is the opposite way round in the only sense
 * that matters here: the bottom of a flame, where the fuel is, is the hottest
 * part of it, and the tip is the coolest. So this is read from the base of a
 * column upwards, and the quantisation to five steps is what keeps it looking
 * like pixel art rather than like a gradient somebody blurred.
 */
const FLAME = [PALETTE.goldLight, PALETTE.magma, PALETTE.red, PALETTE.redDark, PALETTE.redDeep];

/**
 * …and the white that sits under the tallest of them only.
 *
 * A fire is white where the fuel is and this is drawn along a card's whole
 * bottom edge, so painting the base of EVERY column white gives you a white
 * line with some red confetti over it — which is what the first pass looked
 * like. The white is rationed instead: a column only gets a hot core if it is
 * currently one of the tall ones, so the bright spots wander along the edge the
 * way the hot spots in a real fire do.
 */
const CORE = PALETTE.white;

/** How wide one flame column is, in device pixels. The scene's own pixel. */
const UNIT = 3;

/**
 * Set a card on fire.
 *
 * @param {HTMLElement} card the element to burn — it is given the canvas as
 *   its LAST child, so the fire is drawn over the card's own content: flames
 *   lick up over the bottom of the button the way they would over anything
 *   else standing in a fire, which is the whole difference between a card that
 *   is burning and a card with a picture of a fire behind it. Everything drawn
 *   over the type is either short (the flames live in the bottom third) or
 *   nearly transparent (the heat), so the card stays readable while it burns.
 *   The card must be positioned; `.slot-card` already is.
 * @param {object} [opts]
 * @param {number} [opts.intensity] 0..1, how much fire. Default 1.
 * @returns {{flare: () => void, stop: () => void}}
 */
export function igniteCard(card, { intensity = 1 } = {}) {
  const canvas = el('canvas.card-fire', { 'aria-hidden': 'true' });
  const ctx = canvas.getContext('2d');
  card.append(canvas);

  const embers = createEmberAura({ intensity: intensity * 0.75 });
  const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

  let w = 0;
  let h = 0;
  let dpr = 1;
  let raf = 0;
  let last = 0;
  let t = 0;
  let strength = intensity;
  /** Set by `flare` and spent over the second after it. */
  let surge = 0;

  /**
   * One phase per column, fixed for the life of the fire.
   *
   * Random, because a fire whose columns share a clock is a wave — the whole
   * edge rises and falls together and it reads as a curtain rather than as
   * something burning. Each column is given its own phase and its own period,
   * and that is the entire difference.
   */
  let columns = [];

  /**
   * MEASURED WHEN THE CARD CHANGES SIZE, NEVER PER FRAME
   * ---------------------------------------------------------------------------
   * The first version called this from inside the animation frame, which is two
   * mistakes at sixty a second: `getBoundingClientRect` forces the browser to
   * settle layout before it can answer, and assigning `canvas.width` reallocates
   * the backing store and wipes it even when the number written is the one
   * already there. Three burning cards made that three forced layouts and three
   * allocations a frame, for a size that changes when the window does and at no
   * other time.
   *
   * So the size is pushed IN — by the observer below, once per actual change —
   * and the loop only ever draws. The guard is still here rather than in the
   * caller because a card that has just been appended can measure zero, and a
   * fire on a zero-sized card has nothing to burn along.
   */
  function measure() {
    const rect = card.getBoundingClientRect();
    if (!rect.width || !rect.height) return false;
    const nextDpr = Math.min(2, window.devicePixelRatio || 1);
    const nextW = Math.round(rect.width);
    const nextH = Math.round(rect.height);
    if (nextW === w && nextH === h && nextDpr === dpr) return true;
    dpr = nextDpr;
    w = nextW;
    h = nextH;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    // Nearest-neighbour goes with the backing store, so it has to be set again
    // every time the store is replaced.
    crisp(ctx);
    const count = Math.ceil(w / UNIT) + 1;
    if (columns.length !== count) {
      columns = Array.from({ length: count }, () => ({
        phase: Math.random() * Math.PI * 2,
        /** Periods are deliberately close and never equal — see above. */
        rate: 380 + Math.random() * 520,
        /**
         * How tall this column runs at rest, in DEVICE PIXELS rather than as a
         * share of the card.
         *
         * A share of the card was the obvious way and it is wrong: the picker's
         * cards are not the same height — an empty card offering the hard road
         * carries seven lines of terms and a saved run carries three — so a
         * proportional fire came out half again as tall on one card as on the
         * one beside it, which reads as two different fires rather than as one
         * road. In pixels, every card burns the same.
         *
         * The size is bounded by the one thing that has to stay readable while
         * it burns: the button along the bottom edge. The flames reach its
         * lower half and go translucent through it, so the plate reads as
         * standing IN the fire and the word on it can still be read.
         */
        reach: 20 + Math.random() * 26,
      }));
    }
    return true;
  }

  /**
   * The heat the card sits in: a wash up from the bottom edge, brightest where
   * the flames are. It is the one soft thing in here and it is soft on purpose
   * — it is the LIGHT of the fire rather than the fire, and light is the one
   * thing in this game's art that is allowed not to have an edge.
   */
  function drawHeat() {
    const k = Math.min(1, strength + surge * 0.5);
    const grad = ctx.createLinearGradient(0, h, 0, h * 0.1);
    grad.addColorStop(0, hexA(PALETTE.magma, 0.42 * k));
    grad.addColorStop(0.28, hexA(PALETTE.redDark, 0.24 * k));
    grad.addColorStop(1, hexA(PALETTE.redDeep, 0));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  /**
   * The flames themselves. One column of stacked squares per UNIT of width,
   * each as tall as its own wobble says, coloured by how far up the column the
   * square is rather than by anything global — which is what makes a tongue of
   * flame read as hot at the bottom and thin out at the top.
   */
  function drawFlames() {
    const boost = 1 + surge;
    /** The tallest a column can be right now, which the colours are read off. */
    const ceiling = Math.max(1, Math.round((46 * strength * boost) / UNIT));
    for (let i = 0; i < columns.length; i++) {
      const c = columns[i];
      /**
       * Three sines, deliberately at unrelated periods. One is a pulse; two is
       * a beat; three is a flicker with no pattern the eye can hold, which is
       * as close to fire as arithmetic gets for the price of three sines.
       */
      const wobble =
        Math.sin(t / c.rate + c.phase) * 0.5 +
        Math.sin(t / (c.rate * 0.41) + c.phase * 2) * 0.3 +
        Math.sin(t / (c.rate * 1.7) + c.phase * 0.5) * 0.2;
      const reach = c.reach * strength * boost * (0.55 + wobble * 0.45);
      const cells = Math.max(0, Math.round(reach / UNIT));
      const x = i * UNIT;
      for (let j = 0; j < cells; j++) {
        // 0 at the base of this column, 1 at its tip.
        const up = cells > 1 ? j / (cells - 1) : 0;
        const step = Math.min(FLAME.length - 1, Math.floor(up * FLAME.length));
        // The tip is where a flame goes to nothing, so it is where the only
        // alpha in the fire is. Everything below it is solid colour on a grid.
        ctx.globalAlpha = up > 0.85 ? 0.25 : up > 0.68 ? 0.45 : up > 0.5 ? 0.75 : 1;
        ctx.fillStyle = FLAME[step];
        ctx.fillRect(x, h - (j + 1) * UNIT, UNIT, UNIT);
      }
      // The core, on the tall columns only — see the note on CORE.
      if (cells > ceiling * 0.62) {
        ctx.globalAlpha = 1;
        ctx.fillStyle = CORE;
        ctx.fillRect(x, h - UNIT * Math.min(2, cells), UNIT, UNIT * Math.min(2, cells));
      }
    }
    ctx.globalAlpha = 1;
  }

  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    drawHeat();
    embers.draw(ctx, 'back');
    drawFlames();
    embers.draw(ctx, 'front');
  }

  function advance(dt) {
    t += dt;
    if (surge > 0) surge = Math.max(0, surge - dt / 900);
    /**
     * Where the embers come off: the bottom half of the card, which is where
     * the flames are. The aura spawns half its population along the bottom of
     * the box it is given and the rest up the sides and around the crown, so a
     * box that is the lower half of the card puts fire at the base and embers
     * climbing the edges — which is what a burning poster does.
     */
    embers.update(dt, { x: 0, y: h * 0.42, w, h: h * 0.58, unit: UNIT });
  }

  function frame(now) {
    if (!card.isConnected) return stop();
    const dt = Math.min(64, Math.max(0, now - last));
    last = now;
    // No measuring in here — see the note over `measure`. `w` is zero only
    // until the card has a size, and a fire with nowhere to burn draws nothing.
    if (w) {
      advance(dt);
      draw();
    }
    raf = requestAnimationFrame(frame);
    return undefined;
  }

  /**
   * The only thing that measures: one callback per real size change. A card
   * grows when its dropdown is switched to the road with seven lines of terms
   * on it, and the grid reflows when the window does; between those, nothing
   * here touches layout at all.
   */
  const observer = typeof ResizeObserver === 'function'
    ? new ResizeObserver(() => {
        if (measure() && still) draw();
      })
    : null;
  observer?.observe(card);
  /** …and the fallback for anything without one: the window's own resize. */
  const onResize = observer ? null : () => {
    if (measure() && still) draw();
  };
  if (onResize) window.addEventListener('resize', onResize);

  function stop() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    observer?.disconnect();
    if (onResize) window.removeEventListener('resize', onResize);
    embers.clear();
    canvas.remove();
  }

  measure();
  if (still) {
    // One frame, held. The card is on fire; the fire is not moving.
    advance(600);
    draw();
  } else {
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }

  return {
    /**
     * The moment the mode is chosen: the fire goes up all at once and throws a
     * handful of sparks clear of itself. The same beat as the cut-scene's slam
     * (`embers.burst`), which is where the player will meet it next.
     */
    flare(count = 26) {
      surge = 1;
      strength = intensity;
      embers.setIntensity(Math.min(1, intensity));
      embers.burst(count);
      if (still) draw();
    },
    stop,
  };
}

/** `#rrggbb` at an alpha, for the two gradients above. */
function hexA(hex, alpha) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}
