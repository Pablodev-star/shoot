/**
 * SHOOT! — Tiny pixel-art engine.
 *
 * All artwork in the game is authored as character maps ("pixel strings") and
 * baked into offscreen canvases at load time. That keeps the repository free of
 * binary assets (important for a GitHub Pages deploy), keeps every sprite in the
 * shared palette, and lets us re-tint or re-scale art at runtime.
 *
 * A sprite definition looks like:
 *
 *   { key: { '.': null, k: PALETTE.ink, r: PALETTE.red }, rows: ['..k..', '.krk.'] }
 *
 * '.' (or any char missing from the key) is transparent.
 */

/** Global upscale used when nothing else is specified. */
export const PIXEL_SCALE = 4;

/**
 * Create a canvas with nearest-neighbour sampling enabled on its context.
 * @param {number} w @param {number} h
 */
export function makeCanvas(w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(w));
  canvas.height = Math.max(1, Math.round(h));
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  return { canvas, ctx };
}

/** Turn off smoothing on a context (call again after any canvas resize). */
export function crisp(ctx) {
  ctx.imageSmoothingEnabled = false;
  ctx.mozImageSmoothingEnabled = false;
  ctx.webkitImageSmoothingEnabled = false;
  return ctx;
}

/**
 * Bake a pixel-string sprite into a canvas.
 * @param {{key: Record<string, string|null>, rows: string[]}} def
 * @param {number} scale
 * @returns {HTMLCanvasElement}
 */
export function bake(def, scale = 1) {
  const rows = def.rows;
  const h = rows.length;
  const w = rows.reduce((m, r) => Math.max(m, r.length), 0);
  const { canvas, ctx } = makeCanvas(w * scale, h * scale);
  for (let y = 0; y < h; y++) {
    const row = rows[y];
    for (let x = 0; x < row.length; x++) {
      const color = def.key[row[x]];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(x * scale, y * scale, scale, scale);
    }
  }
  canvas.pxWidth = w;
  canvas.pxHeight = h;
  return canvas;
}

/**
 * Bake a whole animation: an object of { name: [rows, rows, ...] } sharing one key.
 * @returns {Record<string, HTMLCanvasElement[]>}
 */
export function bakeFrames(key, frames, scale = 1) {
  const out = {};
  for (const [name, list] of Object.entries(frames)) {
    out[name] = list.map((rows) => bake({ key, rows }, scale));
  }
  return out;
}

/**
 * Draw a baked sprite at an integer position (pixel art must never land on
 * fractional coordinates or it turns to mush).
 */
export function drawSprite(ctx, sprite, x, y, scale = 1, flip = false) {
  if (!sprite) return;
  const w = sprite.width * scale;
  const h = sprite.height * scale;
  const px = Math.round(x);
  const py = Math.round(y);
  if (flip) {
    ctx.save();
    ctx.translate(px + w, py);
    ctx.scale(-1, 1);
    ctx.drawImage(sprite, 0, 0, w, h);
    ctx.restore();
  } else {
    ctx.drawImage(sprite, px, py, w, h);
  }
}

/**
 * Return a tinted copy of a sprite (used for night-time silhouettes, damage
 * flashes and rarity glows).
 */
export function tinted(sprite, color, alpha = 0.5) {
  const { canvas, ctx } = makeCanvas(sprite.width, sprite.height);
  ctx.drawImage(sprite, 0, 0);
  ctx.globalCompositeOperation = 'source-atop';
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  return canvas;
}

/** Produce a solid-color silhouette of a sprite. */
export function silhouette(sprite, color) {
  return tinted(sprite, color, 1);
}

/**
 * Convert a baked canvas into a data URL so it can be used as a CSS
 * background / <img> source in the HTML UI layer.
 */
export function toDataURL(canvas) {
  return canvas.toDataURL('image/png');
}

/** Simple animation clock: returns the frame index for a frame list. */
export function frameAt(frames, elapsedMs, frameMs) {
  if (!frames || frames.length === 0) return 0;
  return Math.floor(elapsedMs / frameMs) % frames.length;
}
