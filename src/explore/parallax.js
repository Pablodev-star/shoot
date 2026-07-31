/**
 * SHOOT! — Parallax renderer (Block 3a).
 *
 * Draws the scrolling desert: sky gradient (from the day/night clock), stars,
 * sun/moon arc, five tiled depth layers, and the deterministic scatter of
 * cacti/rocks/bones along the ground.
 *
 * COORDINATES
 * ---------------------------------------------------------------------------
 * The world is measured in *source pixels*. `cameraX` is the player's travelled
 * distance in source pixels. Screen position = (worldX - cameraX * speed) *
 * view.scale. Every draw is rounded to the pixel grid.
 *
 * SCATTER
 * ---------------------------------------------------------------------------
 * Props are not stored in a list — the world is infinite. Instead the ground is
 * divided into fixed cells of SCATTER_CELL source pixels, and each cell's
 * contents are derived from a seeded RNG keyed by the cell index. Same cell,
 * same props, forever, with no memory cost.
 */

import { PALETTE } from '../art/palette.js';
import { drawSprite } from '../art/pixel.js';
import {
  getEnvironmentSprites,
  PARALLAX_MANIFEST,
  LAYER_TILE_W,
  SCATTER_TABLE,
  SKY_BODY_SIZE,
} from '../art/sprites-environment.js';
import { makeRng } from '../core/rng.js';
import { getSky } from './daynight.js';

const SCATTER_CELL = 72;
const TOTAL_WEIGHT = SCATTER_TABLE.reduce((s, e) => s + e.weight, 0);

export function createParallax(options = {}) {
  const env = getEnvironmentSprites();
  const seed = options.seed ?? 20260730;
  /** Buildings placed by the encounter system: [{ worldX, kind }] */
  let structures = [];
  /** Palette shift applied per world (Galaxy tints everything violet). */
  let worldTint = options.tint || null;

  /**
   * The walk line. Duels raise it so the fighters never sit under the action
   * buttons; exploration keeps it low so more desert is visible.
   */
  const groundRatio = options.groundRatio ?? 0.78;
  function groundY(view) {
    return Math.round((view.h * groundRatio) / view.scale) * view.scale;
  }

  function setStructures(list) {
    structures = list || [];
  }

  function setTint(tint) {
    worldTint = tint;
  }

  // --- sky ----------------------------------------------------------------

  function drawSky(ctx, view, sky) {
    const grad = ctx.createLinearGradient(0, 0, 0, view.h);
    grad.addColorStop(0, sky.top);
    grad.addColorStop(0.78, sky.bottom);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, view.w, view.h);

    if (sky.stars > 0.02) {
      const rng = makeRng(seed ^ 0x5eed);
      ctx.fillStyle = PALETTE.star;
      for (let i = 0; i < 90; i++) {
        const x = Math.round(rng() * view.w);
        const y = Math.round(rng() * view.h * 0.62);
        const twinkle = 0.55 + 0.45 * Math.sin(performance.now() / 700 + i);
        ctx.globalAlpha = sky.stars * twinkle;
        ctx.fillRect(x, y, view.scale, view.scale);
      }
      ctx.globalAlpha = 1;
    }

    /**
     * Sun by day, moon by night — same arc, opposite phase. Both are sprites
     * on the pixel grid rather than `arc()` fills, and the moon's crescent is
     * cut out of the sprite instead of being painted over with a sky colour:
     * the dark limb is transparent, so the gradient behind it shows through
     * exactly and there is nothing there to see. Painting the bite could only
     * ever match the sky at one height and one moment of the day/night clock.
     */
    const p = sky.sunProgress;
    const isSun = p >= 0 && p <= 1;
    const arcT = isSun ? p : (p < 0 ? p + 1 : p - 1);
    const bodyScale = view.scale;
    const size = SKY_BODY_SIZE * bodyScale;
    const cx = view.w * (0.1 + arcT * 0.8);
    const cy = view.h * 0.62 - Math.sin(arcT * Math.PI) * view.h * 0.5;
    if (isSun) {
      // Soft halo first, so the disc sits inside a glow rather than a ring.
      const r = size / 2;
      const halo = ctx.createRadialGradient(cx, cy, r * 0.8, cx, cy, r * 3.2);
      halo.addColorStop(0, 'rgba(255, 226, 122, 0.32)');
      halo.addColorStop(1, 'rgba(255, 226, 122, 0)');
      ctx.fillStyle = halo;
      ctx.fillRect(cx - r * 3.4, cy - r * 3.4, r * 6.8, r * 6.8);
    }
    // Snap to the pixel grid so the disc never lands on a half pixel.
    const bx = Math.round((cx - size / 2) / bodyScale) * bodyScale;
    const by = Math.round((cy - size / 2) / bodyScale) * bodyScale;
    drawSprite(ctx, isSun ? env.sky.sun : env.sky.moon, bx, by, bodyScale);
  }

  // --- tiled layers -------------------------------------------------------

  function drawLayer(ctx, view, layer, cameraX, gy) {
    const sprite = env.layers[layer.name];
    if (!sprite) return;
    const s = view.scale;
    const tileW = LAYER_TILE_W * s;
    const y = gy + layer.y * s;
    let offset = -((cameraX * layer.speed * s) % tileW);
    if (offset > 0) offset -= tileW;
    const h = sprite.height * s;
    for (let x = offset; x < view.w + tileW; x += tileW) {
      ctx.drawImage(sprite, Math.round(x), Math.round(y), tileW, h);
    }
    // The ground layer must reach the bottom of the screen on tall windows.
    if (layer.name === 'ground') {
      const bottom = y + h;
      if (bottom < view.h) {
        ctx.fillStyle = PALETTE.sandDeep;
        ctx.fillRect(0, Math.round(bottom), view.w, view.h - bottom + 1);
      }
    }
  }

  // --- scatter ------------------------------------------------------------

  function drawScatter(ctx, view, cameraX, gy) {
    const s = view.scale;
    const first = Math.floor((cameraX - 40) / SCATTER_CELL);
    const last = Math.ceil((cameraX + view.w / s + 40) / SCATTER_CELL);

    for (let cell = first; cell <= last; cell++) {
      const rng = makeRng((seed + cell * 2654435761) >>> 0);
      const count = rng() < 0.55 ? 1 : rng() < 0.85 ? 2 : 0;
      for (let i = 0; i < count; i++) {
        let roll = rng() * TOTAL_WEIGHT;
        let entry = SCATTER_TABLE[0];
        for (const e of SCATTER_TABLE) {
          roll -= e.weight;
          if (roll <= 0) {
            entry = e;
            break;
          }
        }
        const sprite = env.props[entry.name];
        if (!sprite) continue;
        const worldX = cell * SCATTER_CELL + rng() * SCATTER_CELL;
        // Depth: props sit slightly above or below the walk line and shrink
        // with distance, which reads as a road with a verge.
        const depth = rng();
        const scaleMul = depth < 0.35 ? 1 : depth < 0.75 ? 0.75 : 0.55;
        const yOffset = depth < 0.35 ? 2 : depth < 0.75 ? -6 : -13;
        const speed = depth < 0.35 ? 1 : depth < 0.75 ? 0.86 : 0.74;
        const sx = (worldX - cameraX * speed) * s;
        if (sx < -120 * s || sx > view.w + 120 * s) continue;
        const drawScale = s * scaleMul;
        const sy = gy + yOffset * s - sprite.height * drawScale;
        drawSprite(ctx, sprite, sx, sy, drawScale);
      }
    }
  }

  // --- structures (shops / inns placed by the encounter generator) --------

  function drawStructures(ctx, view, cameraX, gy) {
    const s = view.scale;
    for (const st of structures) {
      const sprite = env.buildings[st.kind];
      if (!sprite) continue;
      const sx = (st.worldX - cameraX) * s;
      if (sx < -sprite.width * s * 1.2 || sx > view.w + sprite.width * s) continue;
      const sy = gy + 4 * s - sprite.height * s;
      drawSprite(ctx, sprite, sx, sy, s);
    }
  }

  // --- ambient tint -------------------------------------------------------

  function drawTint(ctx, view, sky) {
    const darkness = 1 - sky.light;
    if (darkness > 0.02) {
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = sky.tint;
      ctx.globalAlpha = Math.min(0.62, darkness * 0.85);
      ctx.fillRect(0, 0, view.w, view.h);
      ctx.restore();
    }
    if (worldTint) {
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = worldTint.color;
      ctx.globalAlpha = worldTint.alpha;
      ctx.fillRect(0, 0, view.w, view.h);
      ctx.restore();
    }
  }

  /**
   * Render the whole backdrop.
   * @param {CanvasRenderingContext2D} ctx
   * @param {{w:number,h:number,scale:number}} view
   * @param {number} cameraX travelled distance in source pixels
   */
  function render(ctx, view, cameraX) {
    const sky = getSky();
    const gy = groundY(view);
    drawSky(ctx, view, sky);
    for (const layer of PARALLAX_MANIFEST) drawLayer(ctx, view, layer, cameraX, gy);
    drawScatter(ctx, view, cameraX, gy);
    drawStructures(ctx, view, cameraX, gy);
    drawTint(ctx, view, sky);
  }

  return { render, groundY, setStructures, setTint };
}
