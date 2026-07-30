/**
 * SHOOT! — Title screen (Block 1).
 *
 * The logo is rendered with the built-in 5x7 pixel font onto a canvas so it is
 * genuinely pixel art (no smoothed vector type), then dropped into the DOM as
 * an <img> that the CSS animates.
 */

import { el, pixelImg } from '../core/dom.js';
import { go } from '../core/router.js';
import { attachButtonSounds, playMusic } from '../core/audio.js';
import { makeCanvas } from '../art/pixel.js';
import { drawTextCentered, measureText, GLYPH_H } from '../art/font.js';
import { PALETTE } from '../art/palette.js';
import { startMenuScene } from './menu-scene.js';
import { getProfile } from '../core/settings.js';

export const VERSION = 'v1.0 — Definitive Edition';

/**
 * Build the "SHOOT!" wordmark: chunky pixel letters with a hard drop shadow,
 * a gold gradient bake and two bullet holes punched through the plate.
 */
function buildLogo() {
  const text = 'SHOOT!';
  const scale = 8;
  const spacing = 1;
  const pad = 16;
  const w = measureText(text, spacing) * scale + pad * 2;
  const h = GLYPH_H * scale + pad * 2;
  const { canvas, ctx } = makeCanvas(w, h);

  // Layered shadow gives the letters depth like a branded sign.
  const layers = [
    { dx: 6, dy: 6, color: PALETTE.woodDeep },
    { dx: 4, dy: 4, color: PALETTE.redDeep },
    { dx: 2, dy: 2, color: PALETTE.redDark },
  ];
  for (const l of layers) {
    drawTextCentered(ctx, text, w / 2 + l.dx, pad + l.dy, { scale, spacing, color: l.color });
  }
  drawTextCentered(ctx, text, w / 2, pad, { scale, spacing, color: PALETTE.goldLight });

  // Gold gradient wash over the face of the letters only.
  ctx.globalCompositeOperation = 'source-atop';
  const grad = ctx.createLinearGradient(0, pad, 0, pad + GLYPH_H * scale);
  grad.addColorStop(0, 'rgba(255,240,190,0.95)');
  grad.addColorStop(0.5, 'rgba(232,177,44,0.0)');
  grad.addColorStop(1, 'rgba(141,26,24,0.55)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'source-over';

  // Bullet holes: a dark core with a bright rim, punched into the "O"s.
  const holes = [
    { x: w * 0.5, y: h * 0.44, r: 9 },
    { x: w * 0.63, y: h * 0.6, r: 6 },
  ];
  for (const hole of holes) {
    ctx.fillStyle = PALETTE.shadow;
    ctx.beginPath();
    ctx.arc(hole.x, hole.y, hole.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = PALETTE.sandLight;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(hole.x, hole.y, hole.r + 1.5, 0, Math.PI * 2);
    ctx.stroke();
  }
  return canvas;
}

let logoCache = null;

export const TitleScreen = {
  id: 'title',
  mount(root) {
    startMenuScene();
    playMusic('themeMenu');

    if (!logoCache) logoCache = buildLogo();
    const profile = getProfile();

    const screen = el('div.screen.title-screen', {}, [
      el('div.logo-wrap', {}, [pixelImg(logoCache, 1)]),
      el('div.tagline', { text: 'Reload · Shield · Shoot' }),
      el('div.menu-buttons', {}, [
        el('button.btn.btn--primary', { onclick: () => go('slots') }, ['Story Mode']),
        el('button.btn', { onclick: () => go('online') }, ['Online']),
        el('button.btn', { onclick: () => go('profile') }, ['Profile']),
        el('button.btn', { onclick: () => go('settings') }, ['Settings']),
        el('button.btn', { onclick: () => go('credits') }, ['Credits']),
      ]),
      el('div.version-tag', { text: `${profile.name} · ${VERSION}` }),
    ]);

    root.append(screen);
    attachButtonSounds(screen);
  },
};
