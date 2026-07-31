/**
 * SHOOT! — Duel backdrop & fighter rendering (Block 5b).
 *
 * Draws the two duellists facing each other on the road, plus the moment-to-
 * moment effects: muzzle flash, bullet streak, shield shimmer, hit flash and
 * camera shake. The screen sets fields on `fx`; the renderer reads them.
 */

import { drawSprite, frameAt } from '../art/pixel.js';
import { getView } from '../core/scene.js';
import { getCharacterSprites, CHARACTER_TIMING } from '../art/sprites-character.js';
import { getShieldSprites } from '../art/sprites-ui.js';
import { createParallax } from '../explore/parallax.js';
import * as weather from '../explore/weather.js';
import { PALETTE } from '../art/palette.js';
import { drawTextCentered } from '../art/font.js';

export function createDuelScene({ worldId, tint, seed, enemySprites, shakeEnabled = true }) {
  const parallax = createParallax({ seed: (seed ^ (worldId * 31337)) >>> 0, groundRatio: 0.7 });
  parallax.setTint(tint);
  const player = getCharacterSprites().player;
  const shield = getShieldSprites();

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
      /**
       * The storm does not wait for the duel to finish. The walk engine is
       * paused for the whole fight, so nothing else is ticking the weather —
       * without this the rain hangs in the air behind the duellists. Weather's
       * own paused flag still holds its remaining time, so a fight in the rain
       * costs the rain nothing.
       */
      weather.update(dt, getView());
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
      /**
       * A duel is a close-up: fighters are drawn larger than on the road. The
       * cap keeps the two of them apart on a phone, where doubling the scale
       * would have them standing shoulder to shoulder.
       */
      const fs = Math.max(s, Math.min(s * 2, Math.floor((view.w * 0.26) / 16)));
      const shakeAmp = shakeEnabled ? Math.min(6, fx.shake / 26) : 0;
      const ox = shakeAmp ? (Math.random() - 0.5) * shakeAmp * s : 0;
      const oy = shakeAmp ? (Math.random() - 0.5) * shakeAmp * s : 0;

      ctx.save();
      ctx.translate(Math.round(ox), Math.round(oy));

      const gy = parallax.groundY(view);
      weather.setGroundLine(gy);
      // Backdrop now, light after the fighters — see parallax.applyLighting.
      parallax.renderBackdrop(ctx, view, cameraX);

      const playerX = Math.round(view.w * 0.18);
      const enemyX = Math.round(view.w * 0.82 - 16 * fs);

      // --- ground shadows, so the fighters are planted rather than floating.
      // They lean away from the sun, so a duel at dusk casts two long ones. ---
      parallax.drawGroundShadow(ctx, view, playerX, 16 * fs, gy);
      parallax.drawGroundShadow(ctx, view, enemyX, 16 * fs, gy);

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
      if (fx.playerPose === 'shield') drawShield(ctx, shield, playerX, gy, fs, elapsed, false);
      if (fx.enemyPose === 'shield') drawShield(ctx, shield, enemyX, gy, fs, elapsed, true);

      /**
       * The light goes on here: everything above it (the road and both
       * duellists) belongs to the scene and is lit by the hour of the day.
       * Everything below it is *making* light — muzzle flash, tracer, the
       * banner — and a muzzle flash that dims at dusk is a muzzle flash drawn
       * as if it were paint.
       */
      parallax.applyLighting(ctx, view);

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

/**
 * Draw the shield move: a faceted aura around the fighter with the heater
 * shield braced on the leading arm. Both are sprites drawn at the fighters'
 * own integer scale — the aura used to be a stroked ellipse, which was the one
 * curve on screen that did not live on the pixel grid.
 *
 * @param {number} x    left edge of the 16px fighter, in device pixels
 * @param {number} gy   the ground line
 * @param {number} fs   the fighters' draw scale
 * @param {boolean} flip true for the fighter facing left
 */
function drawShield(ctx, shield, x, gy, fs, elapsed, flip) {
  const pulse = 0.6 + Math.sin(elapsed / 220) * 0.2;

  // Aura, wrapped around the whole 16 x 24 fighter.
  const aura = shield.aura;
  ctx.globalAlpha = pulse * 0.5;
  drawSprite(ctx, aura, x + ((16 - aura.width) / 2) * fs, gy - (aura.height - 2) * fs, fs);
  ctx.globalAlpha = 1;

  // Shield braced on the leading arm, covering the body but not the face, and
  // riding a one-pixel bob so it does not look nailed to the sprite.
  const plate = shield.plate[frameAt(shield.plate, elapsed, 180)];
  const bob = Math.round(Math.sin(elapsed / 300)) * fs;
  const lead = flip ? 16 - plate.width - 7 : 7;
  drawSprite(ctx, plate, x + lead * fs, gy - (plate.height - 1) * fs + bob, fs, flip);
}
