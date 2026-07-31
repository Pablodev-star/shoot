/**
 * SHOOT! — Ambient menu backdrop.
 *
 * The menu is never still: the desert drifts by on its own slow camera,
 * tumbleweeds roll across the ground, dust motes catch the light and a lone
 * silhouette waits at the far right of the road. It reuses the exploration
 * parallax renderer, so the menu and the game share one look.
 */

import { setRenderer } from '../core/scene.js';
import { createParallax } from '../explore/parallax.js';
import { getEnvironmentSprites } from '../art/sprites-environment.js';
import { getCharacterSprites, CHARACTER_TIMING } from '../art/sprites-character.js';
import { drawSprite, frameAt } from '../art/pixel.js';
import { update as updateDayNight } from '../explore/daynight.js';
import { makeRng } from '../core/rng.js';

/** Menu camera drift, in source pixels per second. */
const DRIFT = 9;

export function startMenuScene() {
  const parallax = createParallax({ seed: 987654 });
  const env = getEnvironmentSprites();
  const chars = getCharacterSprites();
  const rng = makeRng(4711);

  let cameraX = 0;
  let elapsed = 0;

  /** Tumbleweeds: spawned off-screen right, roll left across the road. */
  const weeds = [];
  const spawnWeed = (view) => ({
    x: cameraX + view.w / view.scale + rng.range(20, 200),
    y: rng.range(-6, 4),
    vx: -rng.range(28, 52),
    spin: rng.range(6, 11),
    scale: rng.chance(0.35) ? 0.7 : 1,
    bounce: rng.range(0, Math.PI * 2),
  });

  /** Dust motes drifting in the low sun. */
  const motes = Array.from({ length: 34 }, () => ({
    x: rng(),
    y: rng(),
    vx: rng.range(-0.02, -0.006),
    vy: rng.range(-0.004, 0.004),
    a: rng.range(0.08, 0.3),
  }));

  const renderer = {
    update(dt) {
      elapsed += dt;
      cameraX += (DRIFT * dt) / 1000;
      updateDayNight(dt * 0.35); // menu time passes slower than travel time
      for (const m of motes) {
        m.x += m.vx * (dt / 16.67) * 0.01;
        m.y += m.vy * (dt / 16.67) * 0.01;
        if (m.x < -0.05) m.x = 1.05;
        if (m.y < -0.05) m.y = 1.05;
        if (m.y > 1.05) m.y = -0.05;
      }
    },

    render(ctx, view) {
      const s = view.scale;
      parallax.renderBackdrop(ctx, view, cameraX);
      const gy = parallax.groundY(view);

      // --- tumbleweeds ---
      if (weeds.length < 3 && Math.random() < 0.004) weeds.push(spawnWeed(view));
      for (let i = weeds.length - 1; i >= 0; i--) {
        const w = weeds[i];
        w.x += (w.vx / 1000) * 16.67;
        const screenX = (w.x - cameraX) * s;
        if (screenX < -60 * s) {
          weeds.splice(i, 1);
          continue;
        }
        const frames = env.tumbleweed;
        const idx = Math.floor((elapsed / 90) * w.spin * 0.12) % frames.length;
        const hop = Math.abs(Math.sin(elapsed / 200 + w.bounce)) * 4;
        drawSprite(
          ctx,
          frames[idx],
          screenX,
          gy + (w.y - hop) * s - frames[idx].height * s * w.scale,
          s * w.scale,
        );
      }

      // --- the waiting gunslinger, far down the road ---
      const idle = chars.player.idle;
      const frame = idle[frameAt(idle, elapsed, CHARACTER_TIMING.idle)];
      const heroX = view.w * 0.8;
      drawSprite(ctx, frame, heroX, gy - frame.height * s + 2 * s, s, true);

      // The tumbleweeds and the waiting gunslinger are part of the desert, so
      // the hour of the day is applied over them, not under them.
      parallax.applyLighting(ctx, view);

      // --- dust motes ---
      ctx.fillStyle = '#f2e3c6';
      for (const m of motes) {
        ctx.globalAlpha = m.a;
        ctx.fillRect(Math.round(m.x * view.w), Math.round(m.y * view.h), s, s);
      }
      ctx.globalAlpha = 1;

      // --- vignette so the UI panels always sit on a darker frame ---
      const vg = ctx.createRadialGradient(
        view.w / 2, view.h / 2, Math.min(view.w, view.h) * 0.28,
        view.w / 2, view.h / 2, Math.max(view.w, view.h) * 0.72,
      );
      vg.addColorStop(0, 'rgba(0,0,0,0)');
      vg.addColorStop(1, 'rgba(10,6,3,0.72)');
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, view.w, view.h);
    },
  };

  setRenderer(renderer);
  return renderer;
}
