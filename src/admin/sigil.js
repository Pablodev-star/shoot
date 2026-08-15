/**
 * SHOOT! — The sigil.
 *
 * The door to the Admin Panel is a shape drawn over the top of the road: three
 * big strokes, one letter each, in order. Nothing in the interface mentions it
 * and nothing in the interface reacts to it until the third letter lands, which
 * is the whole point — a tester knows it is there and a player never finds it.
 *
 * WHY A STROKE RECOGNISER AND NOT A KEY COMBINATION
 * ---------------------------------------------------------------------------
 * The game is played with three buttons and a saddlebag, on a phone as often as
 * on a desk. A key chord is not reachable on the half of the devices this runs
 * on, and a tap sequence on hidden corners is exactly the kind of thing a
 * player finds by accident and then cannot un-find. A drawn letter is
 * deliberate the way a signature is: you do not produce a metre-tall N by
 * fumbling.
 *
 * IT MUST NOT BE CONFUSABLE, AND THAT IS THREE RULES RATHER THAN ONE
 * ---------------------------------------------------------------------------
 *   1. SIZE. A stroke smaller than `MIN_SPAN` of the shorter side of the screen
 *      is not a candidate at all — it is not rejected, it is not even looked
 *      at, so ordinary dragging (the trail map pans, a mis-swipe on the HUD)
 *      can never break a sequence that is half finished.
 *   2. SHAPE. Every stroke is matched against all three letters, and it only
 *      counts when the letter it scores best on is the one the sequence is
 *      waiting for AND that score clears `MIN_SCORE`. A scribble that happens
 *      to be big scores badly on all three and resets the attempt.
 *   3. TIME. The three letters have to arrive inside `STROKE_WINDOW` of each
 *      other. Two letters and a coffee break is not a sigil.
 *
 * THE MATCHER
 * ---------------------------------------------------------------------------
 * A cut-down $1 unistroke recogniser: resample to a fixed number of points,
 * scale UNIFORMLY (so a tall thin L stays tall and thin — the standard $1
 * non-uniform box scale would flatten it into a V), translate the centroid to
 * the origin, then take the mean point-to-point distance against each template.
 *
 * The one thing deliberately left out of $1 is its rotation invariance. Turning
 * every stroke to a canonical angle is what makes $1 good at telling a star
 * from a spiral and useless at telling an N from a Z — so instead the match is
 * retried over a few degrees either side of upright and the best of those wins.
 * Letters have an up.
 *
 * Everything above `createSigilWatcher` is pure and DOM-free, so it can be run
 * and tested outside a browser.
 *
 * NOTHING IS DRAWN
 * ---------------------------------------------------------------------------
 * The sigil used to leave ink on the screen: a bright line under the finger and
 * a ghost of it fading out afterwards, so you could see the shape you were
 * making. It was a real convenience and it was also the one thing on this whole
 * door that could be found by accident — a player who drags across the road
 * once sees a stroke of light appear under their thumb, and from there it is a
 * minute of idle scribbling before they know something is listening.
 *
 * So the watcher draws nothing at all, ever. There is no canvas, no ink, no
 * flash on a letter that landed and no red on one that did not. A stroke that
 * is a metre-tall P is a stroke somebody meant to make, and somebody who meant
 * to make it does not need to be shown that they did.
 */

/** Points every stroke is resampled to before it is compared. */
const SAMPLES = 48;

/** How far off upright a stroke may be, in degrees, and in what steps. */
const ROTATIONS = [-20, -12, -6, 0, 6, 12, 20];

/** Mean distance (in normalised units) at which a match scores zero. */
const SCORE_SPAN = 0.55;

/** The shape of each letter, as the path a hand takes drawing it. */
const TEMPLATES = {
  /**
   * P, both ways round. Up the stem and round the bowl is the one-stroke P
   * most people draw; the second is the two-stroke P done without lifting,
   * which retraces the stem. Resampling makes the retrace harmless.
   */
  P: [
    [[0, 1], [0, 0.5], [0, 0], [0.35, 0.02], [0.6, 0.16], [0.6, 0.38], [0.34, 0.5], [0, 0.52]],
    [[0, 0], [0, 0.5], [0, 1], [0, 0.5], [0, 0], [0.35, 0.02], [0.6, 0.16], [0.6, 0.38], [0.34, 0.5], [0, 0.52]],
  ],
  /** N. Up, down the diagonal, up again. */
  N: [
    [[0, 1], [0, 0.5], [0, 0], [0.35, 0.5], [0.7, 1], [0.7, 0.5], [0.7, 0]],
  ],
  /** L. Down, then right. */
  L: [
    [[0, 0], [0, 0.5], [0, 1], [0.3, 1], [0.6, 1]],
  ],
};

/** Distance along a polyline. */
function pathLength(points) {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  }
  return total;
}

/** Resample a stroke to `count` points spaced evenly along its length. */
function resample(points, count = SAMPLES) {
  const step = pathLength(points) / (count - 1);
  if (!(step > 0)) return new Array(count).fill(null).map(() => ({ ...points[0] }));
  const out = [{ ...points[0] }];
  let carried = 0;
  const src = points.map((p) => ({ ...p }));
  for (let i = 1; i < src.length; i++) {
    const from = src[i - 1];
    const to = src[i];
    const span = Math.hypot(to.x - from.x, to.y - from.y);
    if (carried + span >= step && span > 0) {
      const t = (step - carried) / span;
      const next = { x: from.x + t * (to.x - from.x), y: from.y + t * (to.y - from.y) };
      out.push(next);
      src.splice(i, 0, next);
      carried = 0;
    } else {
      carried += span;
    }
  }
  while (out.length < count) out.push({ ...src[src.length - 1] });
  return out.slice(0, count);
}

/** Centre on the origin and scale uniformly so the longer side is 1. */
function normalize(points) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  const size = Math.max(maxX - minX, maxY - minY) || 1;
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  return points.map((p) => ({ x: (p.x - cx) / size, y: (p.y - cy) / size }));
}

function rotate(points, degrees) {
  if (!degrees) return points;
  const rad = (degrees * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return points.map((p) => ({ x: p.x * cos - p.y * sin, y: p.x * sin + p.y * cos }));
}

function meanDistance(a, b) {
  let total = 0;
  for (let i = 0; i < a.length; i++) total += Math.hypot(a[i].x - b[i].x, a[i].y - b[i].y);
  return total / a.length;
}

/** Templates, prepared once, in the same normalised space as a live stroke. */
const PREPARED = Object.entries(TEMPLATES).map(([letter, variants]) => ({
  letter,
  forms: variants.map((pts) => normalize(resample(pts.map(([x, y]) => ({ x, y }))))),
}));

/**
 * Score one stroke against every letter.
 *
 * @param {Array<{x:number,y:number}>} points raw pointer path
 * @returns {{letter: string, score: number, ranked: Array<{letter:string,score:number}>}|null}
 */
export function recognize(points) {
  if (!points || points.length < 8) return null;
  const stroke = normalize(resample(points));
  const turned = ROTATIONS.map((deg) => rotate(stroke, deg));
  const ranked = PREPARED.map(({ letter, forms }) => {
    let best = Infinity;
    for (const form of forms) {
      for (const candidate of turned) best = Math.min(best, meanDistance(candidate, form));
    }
    return { letter, score: Math.max(0, 1 - best / SCORE_SPAN) };
  }).sort((a, b) => b.score - a.score);
  return { letter: ranked[0].letter, score: ranked[0].score, ranked };
}

// ---------------------------------------------------------------------------
// The watcher
// ---------------------------------------------------------------------------

/** A stroke has to span this much of the shorter screen edge to be a candidate. */
export const MIN_SPAN = 0.34;
/** …and this much of it has to be actual travel, not a wobble in one place. */
export const MIN_TRAVEL = 1.1;
/** How good the match has to be. */
export const MIN_SCORE = 0.62;
/** How long the sequence may sit half finished before it forgets itself. */
export const STROKE_WINDOW = 6000;

/**
 * Watch a screen for the sigil.
 *
 * @param {object} opts
 * @param {string[]} [opts.letters] the sequence, in order
 * @param {(state: {index: number, letters: string[]}) => void} [opts.onProgress]
 * @param {() => void} opts.onComplete
 * @param {() => boolean} [opts.enabled] false while a panel is open over the road
 * @returns {{dispose: () => void, reset: () => void}}
 */
export function createSigilWatcher(opts) {
  const letters = opts.letters || ['P', 'N', 'L'];
  const enabled = opts.enabled || (() => true);

  let index = 0;
  let lastAt = 0;
  let drawing = null;

  /**
   * Anything the player can actually press is not a drawing surface. The road
   * is a canvas with two buttons and a band over it, and a swipe that starts on
   * one of those belongs to that control, not to us.
   */
  function isBackdrop(target) {
    if (!(target instanceof Element)) return true;
    return !target.closest(
      'button, a, input, select, textarea, .modal-backdrop, .trailband-wrap, .explore-actions',
    );
  }

  function reset() {
    index = 0;
    if (opts.onProgress) opts.onProgress({ index, letters });
  }

  const onDown = (e) => {
    if (!enabled() || !e.isPrimary || !isBackdrop(e.target)) return;
    drawing = { points: [{ x: e.clientX, y: e.clientY }], id: e.pointerId };
  };

  const onMove = (e) => {
    if (!drawing || e.pointerId !== drawing.id) return;
    const last = drawing.points[drawing.points.length - 1];
    if (Math.hypot(e.clientX - last.x, e.clientY - last.y) < 4) return;
    drawing.points.push({ x: e.clientX, y: e.clientY });
  };

  const onUp = (e) => {
    if (!drawing || e.pointerId !== drawing.id) return;
    const points = drawing.points;
    drawing = null;
    judge(points);
  };

  /**
   * @returns {boolean|null} true when the stroke advanced the sequence, false
   *   when it broke one that was under way, null when it was never a candidate
   *   (too small, too slow, too still) and the sequence is untouched.
   */
  function judge(points) {
    const span = Math.min(window.innerWidth, window.innerHeight) * MIN_SPAN;
    const box = bounds(points);
    const size = Math.max(box.w, box.h);
    if (size < span || pathLength(points) < size * MIN_TRAVEL) return null;

    const now = performance.now();
    if (index > 0 && now - lastAt > STROKE_WINDOW) index = 0;

    const match = recognize(points);
    const wanted = letters[index];
    if (!match || match.letter !== wanted || match.score < MIN_SCORE) {
      const broke = index > 0;
      index = 0;
      if (opts.onProgress) opts.onProgress({ index, letters, missed: true });
      return broke ? false : null;
    }

    index += 1;
    lastAt = now;
    if (opts.onProgress) opts.onProgress({ index, letters });
    if (index >= letters.length) {
      index = 0;
      // A beat, so the panel does not arrive under the finger that is still on
      // the screen finishing the L.
      setTimeout(() => opts.onComplete(), 60);
    }
    return true;
  }

  function bounds(points) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const p of points) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }
    return { w: maxX - minX, h: maxY - minY };
  }

  window.addEventListener('pointerdown', onDown, true);
  window.addEventListener('pointermove', onMove, true);
  window.addEventListener('pointerup', onUp, true);
  window.addEventListener('pointercancel', onUp, true);

  return {
    reset,
    dispose() {
      window.removeEventListener('pointerdown', onDown, true);
      window.removeEventListener('pointermove', onMove, true);
      window.removeEventListener('pointerup', onUp, true);
      window.removeEventListener('pointercancel', onUp, true);
      drawing = null;
    },
  };
}
