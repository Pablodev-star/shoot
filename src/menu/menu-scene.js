/**
 * SHOOT! — Ambient backdrop.
 *
 * The menu is never still: the land drifts by on its own slow camera, dust
 * motes catch the light and a lone silhouette waits at the far right of the
 * road. It reuses the exploration parallax renderer, so the menu and the game
 * share one look.
 *
 * The title screen always shows the desert — it is where the game starts and
 * it is the picture on the box. The world-intro and game-over cards pass their
 * own biome instead, so walking into the prairie shows you the prairie behind
 * the card rather than the desert you have just left.
 */

import { setRenderer } from '../core/scene.js';
import { createParallax } from '../explore/parallax.js';
import { getEnvironmentSprites } from '../art/sprites-environment.js';
import { getCharacterSprites, CHARACTER_TIMING } from '../art/sprites-character.js';
import { drawSprite, frameAt } from '../art/pixel.js';
import { update as updateDayNight } from '../explore/daynight.js';
import { PLANE_RISE, planeSpeed } from '../art/env-kit.js';
import { makeRng } from '../core/rng.js';

/** Menu camera drift, in source pixels per second. */
const DRIFT = 9;

/**
 * @param {object} [options]
 * @param {string} [options.biome] landscape to drift past. Defaults to desert.
 * @param {object} [options.tint]  the world's colour wash, if it has one.
 */
export function startMenuScene(options = {}) {
  const biome = options.biome || 'desert';
  const parallax = createParallax({ seed: 987654, biome });
  if (options.tint) parallax.setTint(options.tint);
  const env = getEnvironmentSprites(biome);
  const chars = getCharacterSprites();
  const rng = makeRng(4711);
  /** Tumbleweed is desert scenery. Nothing rolls across wet grass. */
  const rollsWeeds = biome === 'desert';

  let cameraX = 0;
  let elapsed = 0;

  /**
   * Tumbleweeds: spawned off-screen right, rolling west across the road, at
   * three depths.
   *
   * `lane` is rows from the walk line, and it decides everything else about the
   * weed the same way it does on the road proper (see `createDesertAmbient` in
   * src/art/biomes/desert.js): how big it is drawn, how fast it crosses, and
   * whether it goes in front of the man waiting at the end of the road or
   * behind him. They only ever roll one way, because the wind here blows one
   * way — see the note over the same rule in the biome.
   */
  const weeds = [];
  const LANES = [-12, 3, 16];
  const spawnWeed = (view) => {
    const lane = LANES[rng.int(0, LANES.length - 1)];
    return {
      lane,
      x: cameraX + view.w / view.scale + rng.range(20, 200),
      // Nearer weeds cross faster, exactly as the ground under them does.
      vx: -rng.range(28, 52) * planeSpeed(PLANE_RISE + lane),
      spin: rng.range(6, 11),
      step: lane < -6 ? -1 : lane > 8 ? 1 : rng.chance(0.4) ? 1 : 0,
      bounce: rng.range(0, Math.PI * 2),
    };
  };

  /** Draw the far weeds before the gunslinger and the near ones after him. */
  const drawWeeds = (ctx, view, gy, front) => {
    const s = view.scale;
    for (const w of weeds) {
      if ((w.lane > 8) !== front) continue;
      const frames = env.tumbleweed;
      const idx = Math.floor((elapsed / 90) * w.spin * 0.12) % frames.length;
      const hop = Math.abs(Math.sin(elapsed / 200 + w.bounce)) * 4;
      const scale = Math.max(1, s + w.step);
      drawSprite(
        ctx,
        frames[idx],
        (w.x - cameraX) * s,
        gy + (w.lane - hop) * s - frames[idx].height * scale,
        scale,
      );
    }
  };

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
      parallax.updateAmbient(dt);
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
      if (rollsWeeds && weeds.length < 3 && Math.random() < 0.004) weeds.push(spawnWeed(view));
      for (let i = weeds.length - 1; i >= 0; i--) {
        const w = weeds[i];
        w.x += (w.vx / 1000) * 16.67;
        if ((w.x - cameraX) * s < -60 * s) weeds.splice(i, 1);
      }
      drawWeeds(ctx, view, gy, false);

      // --- the waiting gunslinger, far down the road ---
      const idle = chars.player.idle;
      const frame = idle[frameAt(idle, elapsed, CHARACTER_TIMING.idle)];
      const heroX = view.w * 0.8;
      drawSprite(ctx, frame, heroX, gy - frame.height * s + 2 * s, s, true);

      // The near lane rolls past in front of him.
      drawWeeds(ctx, view, gy, true);

      // The near lane and the bank at the bottom of the frame, both of which
      // are in front of the man at the end of the road.
      parallax.renderForeground(ctx, view, cameraX);

      // The tumbleweeds and the waiting gunslinger are part of the landscape,
      // so the hour of the day is applied over them, not under them.
      parallax.applyLighting(ctx, view);
      parallax.renderAmbient(ctx, view);

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
