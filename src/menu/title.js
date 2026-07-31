/**
 * SHOOT! — Title screen.
 *
 * One obvious primary action (Story Mode), one secondary (Online), and the
 * housekeeping screens tucked into a compact row so the eye lands on the game
 * first. The logo is rendered with the built-in pixel font onto a canvas, so it
 * is genuinely pixel art rather than smoothed vector type.
 */

import { el, pixelImg } from '../core/dom.js';
import { go } from '../core/router.js';
import { attachButtonSounds, playMusic } from '../core/audio.js';
import { makeCanvas } from '../art/pixel.js';
import { drawTextCentered, measureText, GLYPH_H } from '../art/font.js';
import { PALETTE } from '../art/palette.js';
import { startMenuScene } from './menu-scene.js';
import { getProfile } from '../core/settings.js';
import { openHowToPlay } from '../ui/help.js';

export const VERSION = 'v1.0 · Definitive Edition';

/**
 * The wordmark: chunky pixel letters, a layered drop shadow, a gold gradient
 * baked over the faces, and two bullet holes punched through the plate.
 */
function buildLogo() {
  const text = 'SHOOT!';
  const scale = 8;
  const spacing = 1;
  const pad = 18;
  const w = measureText(text, spacing) * scale + pad * 2;
  const h = GLYPH_H * scale + pad * 2;
  const { canvas, ctx } = makeCanvas(w, h);

  const layers = [
    { dx: 7, dy: 7, color: PALETTE.woodDeep },
    { dx: 5, dy: 5, color: PALETTE.redDeep },
    { dx: 3, dy: 3, color: PALETTE.redDark },
  ];
  for (const l of layers) {
    drawTextCentered(ctx, text, w / 2 + l.dx, pad + l.dy, { scale, spacing, color: l.color });
  }
  drawTextCentered(ctx, text, w / 2, pad, { scale, spacing, color: PALETTE.goldLight });

  ctx.globalCompositeOperation = 'source-atop';
  const grad = ctx.createLinearGradient(0, pad, 0, pad + GLYPH_H * scale);
  grad.addColorStop(0, 'rgba(255,244,205,0.95)');
  grad.addColorStop(0.52, 'rgba(232,177,44,0)');
  grad.addColorStop(1, 'rgba(141,26,24,0.6)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'source-over';

  for (const hole of [
    { x: w * 0.5, y: h * 0.44, r: 9 },
    { x: w * 0.63, y: h * 0.6, r: 6 },
  ]) {
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

    // Secondary destinations are label-only: at this size an icon is noise, and
    // three words are read faster than three tiny pictures.
    const secondary = (label, screen) =>
      el('button.btn.btn--ghost', { onclick: () => go(screen) }, [el('span', { text: label })]);

    const screen = el('div.screen.title-screen', {}, [
      el('div.logo-wrap', {}, [pixelImg(logoCache, 1)]),

      el('div.tagline', {}, [
        el('span', { text: 'Reload' }),
        el('span.sep'),
        el('span', { text: 'Shield' }),
        el('span.sep'),
        el('span', { text: 'Shoot' }),
      ]),

      el('nav.menu-nav.stagger', { 'aria-label': 'Main menu' }, [
        el('button.btn.btn--primary', { onclick: () => go('slots') }, ['Story Mode']),
        el('button.btn', { onclick: () => go('online') }, [
          'Online',
          el('span.stamp', { text: 'Soon' }),
        ]),
        el('div.menu-nav-row', {}, [
          secondary('Profile', 'profile'),
          secondary('Settings', 'settings'),
          secondary('Credits', 'credits'),
        ]),
        el('button.btn.btn--quiet', { onclick: () => openHowToPlay() }, ['How to play']),
      ]),

      el('div.title-footer', {}, [
        el('span', { text: profile.name }),
        el('span', { text: VERSION }),
      ]),
    ]);

    root.append(screen);
    attachButtonSounds(screen);
    screen.querySelector('.btn--primary')?.focus({ preventScroll: true });
  },
};
