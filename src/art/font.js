/**
 * SHOOT! — Built-in 5x7 pixel font.
 *
 * Used for anything drawn *inside* the canvas (the title logo, floating combat
 * numbers, world banners). HTML UI uses the CSS font stack instead; this exists
 * so canvas text is truly pixel-perfect instead of anti-aliased browser text.
 */

import { makeCanvas } from './pixel.js';

const G = {
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  C: ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.'],
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
  G: ['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.###.'],
  H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  I: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '#####'],
  J: ['..###', '...#.', '...#.', '...#.', '...#.', '#..#.', '.##..'],
  K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
  N: ['#...#', '##..#', '#.#.#', '#.#.#', '#..##', '#...#', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  Q: ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  V: ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
  W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '##.##', '#...#'],
  X: ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
  Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
  Z: ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
  0: ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'],
  1: ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  2: ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
  3: ['####.', '....#', '....#', '.###.', '....#', '....#', '####.'],
  4: ['#..#.', '#..#.', '#..#.', '#####', '...#.', '...#.', '...#.'],
  5: ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  6: ['.###.', '#....', '#....', '####.', '#...#', '#...#', '.###.'],
  7: ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
  8: ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
  9: ['.###.', '#...#', '#...#', '.####', '....#', '....#', '.###.'],
  '!': ['..#..', '..#..', '..#..', '..#..', '..#..', '.....', '..#..'],
  '?': ['.###.', '#...#', '....#', '..##.', '..#..', '.....', '..#..'],
  '.': ['.....', '.....', '.....', '.....', '.....', '.....', '..#..'],
  ',': ['.....', '.....', '.....', '.....', '.....', '..#..', '.#...'],
  ':': ['.....', '..#..', '.....', '.....', '.....', '..#..', '.....'],
  '-': ['.....', '.....', '.....', '.###.', '.....', '.....', '.....'],
  '+': ['.....', '..#..', '..#..', '#####', '..#..', '..#..', '.....'],
  "'": ['..#..', '..#..', '.....', '.....', '.....', '.....', '.....'],
  '/': ['....#', '....#', '...#.', '..#..', '.#...', '#....', '#....'],
  '(': ['...#.', '..#..', '.#...', '.#...', '.#...', '..#..', '...#.'],
  ')': ['.#...', '..#..', '...#.', '...#.', '...#.', '..#..', '.#...'],
  '%': ['##..#', '##.#.', '..#..', '.#...', '#.##.', '..##.', '.....'],
  '*': ['.....', '#.#.#', '.###.', '#####', '.###.', '#.#.#', '.....'],
  ' ': ['.....', '.....', '.....', '.....', '.....', '.....', '.....'],
};

export const GLYPH_W = 5;
export const GLYPH_H = 7;

/** Measure a string in source pixels (before scaling). */
export function measureText(text, letterSpacing = 1) {
  const chars = String(text).toUpperCase().length;
  return chars * GLYPH_W + Math.max(0, chars - 1) * letterSpacing;
}

/**
 * Draw pixel text directly onto a context.
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} text
 * @param {number} x @param {number} y  top-left, in device pixels
 * @param {{scale?:number,color?:string,shadow?:string,spacing?:number}} opts
 */
export function drawText(ctx, text, x, y, opts = {}) {
  const scale = opts.scale ?? 2;
  const color = opts.color ?? '#ffffff';
  const spacing = opts.spacing ?? 1;
  const str = String(text).toUpperCase();
  let cursor = Math.round(x);
  const top = Math.round(y);

  for (const ch of str) {
    const glyph = G[ch] || G['?'];
    for (let gy = 0; gy < glyph.length; gy++) {
      for (let gx = 0; gx < glyph[gy].length; gx++) {
        if (glyph[gy][gx] !== '#') continue;
        if (opts.shadow) {
          ctx.fillStyle = opts.shadow;
          ctx.fillRect(cursor + gx * scale + scale, top + gy * scale + scale, scale, scale);
        }
      }
    }
    cursor += (GLYPH_W + spacing) * scale;
  }

  cursor = Math.round(x);
  for (const ch of str) {
    const glyph = G[ch] || G['?'];
    ctx.fillStyle = color;
    for (let gy = 0; gy < glyph.length; gy++) {
      for (let gx = 0; gx < glyph[gy].length; gx++) {
        if (glyph[gy][gx] !== '#') continue;
        ctx.fillRect(cursor + gx * scale, top + gy * scale, scale, scale);
      }
    }
    cursor += (GLYPH_W + spacing) * scale;
  }
  return cursor - Math.round(x);
}

/** Draw pixel text centred on `cx`. */
export function drawTextCentered(ctx, text, cx, y, opts = {}) {
  const scale = opts.scale ?? 2;
  const spacing = opts.spacing ?? 1;
  const width = measureText(text, spacing) * scale;
  return drawText(ctx, text, cx - width / 2, y, opts);
}

/** Bake a string into its own canvas (handy for HTML <img> use). */
export function bakeText(text, opts = {}) {
  const scale = opts.scale ?? 2;
  const spacing = opts.spacing ?? 1;
  const pad = opts.shadow ? scale : 0;
  const w = measureText(text, spacing) * scale + pad;
  const h = GLYPH_H * scale + pad;
  const { canvas, ctx } = makeCanvas(w, h);
  drawText(ctx, text, 0, 0, opts);
  return canvas;
}
