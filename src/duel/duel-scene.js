/**
 * SHOOT! — Duel backdrop & fighter rendering (Block 5b).
 *
 * Draws the two duellists facing each other on the road, plus the moment-to-
 * moment effects: muzzle flash, bullet streak, shield shimmer, hit flash and
 * camera shake. The screen sets fields on `fx`; the renderer reads them.
 */

import { drawSprite, frameAt } from '../art/pixel.js';
import { getCharacterSprites, CHARACTER_TIMING } from '../art/sprites-character.js';
import { createParallax } from '../explore/parallax.js';
import * as weather from '../explore/weather.js';
import { PALETTE } from '../art/palette.js';
import { drawTextCentered } from '../art/font.js';

export function createDuelScene({ worldId, tint, seed, enemySprites, shakeEnabled = true }) {
  const parallax = createParallax({ seed: (seed ^ (worldId * 31337)) >>> 0 });
  parallax.setTint(tint);
  const player = getCharacterSprites().player;

  const fx = {
    /** 'idle' | 'reload' | 'shield' | 'shoot' | 'hit' */
    playerPose: 'idle',
    enemyPose: 'idle',
    shake: 0,
    flash: 0,
    banner: null,
    bannerTimer: 0,
    bullets: [],
  };

  let elapsed = 0;
  const cameraX = 1200; // a fixed, pleasant stretch of road

  function poseFrames(set, pose) {
    if (pose === 'shoot') return set.duel;
    if (pose === 'hit') return set.hit;
    return set.idle;
  }

  /** Fire a visible bullet from one side to the other. */
  function spawnBullet(from) {
    fx.bullets.push({ from, t: 0 });
  }

  const renderer = {
    fx,
    spawnBullet,

    update(dt) {
      elapsed += dt;
      if (fx.shake > 0) fx.shake = Math.max(0, fx.shake - dt);
      if (fx.flash > 0) fx.flash = Math.max(0, fx.flash - dt);
      if (fx.bannerTimer > 0) {
        fx.bannerTimer -= dt;
        if (fx.bannerTimer <= 0) fx.banner = null;
      }
      for (let i = fx.bullets.length - 1; i >= 0; i--) {
        fx.bullets[i].t += dt / 260;
        if (fx.bullets[i].t >= 1) fx.bullets.splice(i, 1);
      }
    },

    render(ctx, view) {
      const s = view.scale;
      /** A duel is a close-up: the fighters are drawn at twice world scale. */
      const fs = s * 2;
      const shakeAmp = shakeEnabled ? Math.min(6, fx.shake / 26) : 0;
      const ox = shakeAmp ? (Math.random() - 0.5) * shakeAmp * s : 0;
      const oy = shakeAmp ? (Math.random() - 0.5) * shakeAmp * s : 0;

      ctx.save();
      ctx.translate(Math.round(ox), Math.round(oy));

      parallax.render(ctx, view, cameraX);
      const gy = parallax.groundY(view);

      const playerX = Math.round(view.w * 0.18);
      const enemyX = Math.round(view.w * 0.82 - 16 * fs);

      // --- ground shadows, so the fighters are planted rather than floating ---
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.fillRect(playerX + 2 * fs, gy, 12 * fs, fs);
      ctx.fillRect(enemyX + 2 * fs, gy, 12 * fs, fs);

      // --- fighters ---
      const pFrames = poseFrames(player, fx.playerPose);
      const pFrame = pFrames[
        fx.playerPose === 'shoot'
          ? pFrames.length - 1
          : frameAt(pFrames, elapsed, CHARACTER_TIMING.idle)
      ];
      drawSprite(ctx, pFrame, playerX, gy - pFrame.height * fs + fs, fs);

      const eSet = enemySprites || player;
      const eFrames = poseFrames(eSet, fx.enemyPose);
      const eFrame = eFrames[
        fx.enemyPose === 'shoot'
          ? eFrames.length - 1
          : frameAt(eFrames, elapsed, CHARACTER_TIMING.idle)
      ];
      drawSprite(ctx, eFrame, enemyX, gy - eFrame.height * fs + fs, fs, true);

      // --- shields ---
      const shieldY = gy - 12 * fs;
      if (fx.playerPose === 'shield') drawShield(ctx, playerX + 8 * fs, shieldY, fs, elapsed);
      if (fx.enemyPose === 'shield') drawShield(ctx, enemyX + 8 * fs, shieldY, fs, elapsed);

      // --- bullets ---
      for (const b of fx.bullets) {
        const fromX = b.from === 'player' ? playerX + 17 * fs : enemyX - fs;
        const toX = b.from === 'player' ? enemyX : playerX + 16 * fs;
        const x = fromX + (toX - fromX) * b.t;
        const y = gy - 12 * fs;
        ctx.fillStyle = PALETTE.goldLight;
        ctx.fillRect(Math.round(x), Math.round(y), fs, Math.max(2, fs / 2));
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = PALETTE.sandLight;
        const dir = b.from === 'player' ? -1 : 1;
        ctx.fillRect(Math.round(x + dir * 2 * fs), Math.round(y), fs * 2, Math.max(2, fs / 2));
        ctx.globalAlpha = 1;
      }

      // --- muzzle flash ---
      if (fx.flash > 0) {
        ctx.globalAlpha = Math.min(1, fx.flash / 120);
        ctx.fillStyle = PALETTE.goldLight;
        if (fx.flashSide === 'player' || fx.flashSide === 'both') {
          ctx.fillRect(playerX + 16 * fs, gy - 13 * fs, 3 * fs, 2 * fs);
        }
        if (fx.flashSide === 'enemy' || fx.flashSide === 'both') {
          ctx.fillRect(enemyX - 3 * fs, gy - 13 * fs, 3 * fs, 2 * fs);
        }
        ctx.globalAlpha = 1;
      }

      weather.render(ctx, view);

      // --- centre banner (round call-outs) ---
      if (fx.banner) {
        const alpha = Math.min(1, fx.bannerTimer / 200);
        ctx.globalAlpha = alpha;
        drawTextCentered(ctx, fx.banner, view.w / 2, view.h * 0.2, {
          scale: Math.max(2, s),
          color: PALETTE.sandLight,
          shadow: PALETTE.shadow,
        });
        ctx.globalAlpha = 1;
      }

      ctx.restore();

      // Vignette (never shaken, so the frame stays steady).
      const vg = ctx.createRadialGradient(
        view.w / 2, view.h / 2, Math.min(view.w, view.h) * 0.3,
        view.w / 2, view.h / 2, Math.max(view.w, view.h) * 0.7,
      );
      vg.addColorStop(0, 'rgba(0,0,0,0)');
      vg.addColorStop(1, 'rgba(8,4,2,0.7)');
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, view.w, view.h);
    },
  };

  return renderer;
}

function drawShield(ctx, x, y, s, elapsed) {
  const pulse = 0.55 + Math.sin(elapsed / 120) * 0.18;
  ctx.globalAlpha = pulse;
  ctx.strokeStyle = PALETTE.blueLight;
  ctx.lineWidth = Math.max(1, s);
  ctx.beginPath();
  ctx.ellipse(x, y, 13 * s, 18 * s, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = pulse * 0.22;
  ctx.fillStyle = PALETTE.blue;
  ctx.fill();
  ctx.globalAlpha = 1;
}
