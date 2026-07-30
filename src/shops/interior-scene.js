/**
 * SHOOT! — Interior backdrop for shops and inns.
 *
 * A quiet, warm scene so stepping indoors feels different from the road:
 * plank walls, a flickering lantern, floating dust. Drawn procedurally at the
 * canvas pixel scale to stay consistent with the sprite work.
 */

import { PALETTE } from '../art/palette.js';
import { makeRng } from '../core/rng.js';

export function createInteriorScene(kind = 'shop') {
  const rng = makeRng(kind === 'inn' ? 8123 : 4242);
  const motes = Array.from({ length: 40 }, () => ({
    x: rng(),
    y: rng(),
    vy: rng.range(-0.00012, -0.00004),
    vx: rng.range(-0.00006, 0.00006),
    a: rng.range(0.06, 0.26),
  }));
  const warm = kind === 'inn' ? '#c9762f' : '#e0a13a';
  let t = 0;

  return {
    update(dt) {
      t += dt;
      for (const m of motes) {
        m.x += m.vx * dt;
        m.y += m.vy * dt;
        if (m.y < -0.05) m.y = 1.05;
        if (m.x < -0.05) m.x = 1.05;
        if (m.x > 1.05) m.x = -0.05;
      }
    },

    render(ctx, view) {
      const s = view.scale;

      // Plank wall.
      ctx.fillStyle = PALETTE.woodDark;
      ctx.fillRect(0, 0, view.w, view.h);
      const plank = 14 * s;
      for (let y = 0; y < view.h; y += plank) {
        ctx.fillStyle = (Math.floor(y / plank) % 2 === 0) ? PALETTE.wood : PALETTE.woodDark;
        ctx.fillRect(0, y, view.w, plank - s);
        ctx.fillStyle = PALETTE.woodDeep;
        ctx.fillRect(0, y + plank - s, view.w, s);
      }

      // Floor band.
      const floorY = Math.round(view.h * 0.82);
      ctx.fillStyle = PALETTE.woodDeep;
      ctx.fillRect(0, floorY, view.w, view.h - floorY);
      ctx.fillStyle = PALETTE.leatherDark;
      ctx.fillRect(0, floorY, view.w, s * 2);

      // Lantern glow, gently flickering.
      const flicker = 0.86 + Math.sin(t / 180) * 0.06 + Math.sin(t / 57) * 0.04;
      // Off to one side so the UI panels never sit on top of the lantern.
      const gx = Math.round(view.w * 0.14);
      const gy = Math.round(view.h * 0.24);
      const glow = ctx.createRadialGradient(gx, gy, 0, gx, gy, Math.max(view.w, view.h) * 0.62);
      glow.addColorStop(0, `rgba(255, 214, 130, ${0.34 * flicker})`);
      glow.addColorStop(0.45, `rgba(200, 130, 50, ${0.16 * flicker})`);
      glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, view.w, view.h);

      // Hanging lantern.
      ctx.fillStyle = PALETTE.ink;
      ctx.fillRect(Math.round(gx - s), 0, s * 2, Math.round(gy - 6 * s));
      ctx.fillStyle = PALETTE.steelDark;
      ctx.fillRect(Math.round(gx - 4 * s), Math.round(gy - 6 * s), 8 * s, 2 * s);
      ctx.fillStyle = warm;
      ctx.globalAlpha = flicker;
      ctx.fillRect(Math.round(gx - 3 * s), Math.round(gy - 4 * s), 6 * s, 6 * s);
      ctx.globalAlpha = 1;
      ctx.fillStyle = PALETTE.steelDark;
      ctx.fillRect(Math.round(gx - 4 * s), Math.round(gy + 2 * s), 8 * s, 2 * s);

      // Dust.
      ctx.fillStyle = PALETTE.bone;
      for (const m of motes) {
        ctx.globalAlpha = m.a * flicker;
        ctx.fillRect(Math.round(m.x * view.w), Math.round(m.y * view.h), s, s);
      }
      ctx.globalAlpha = 1;

      // Heavy vignette so the UI panels sit clearly on top.
      const vg = ctx.createRadialGradient(
        view.w / 2, view.h / 2, Math.min(view.w, view.h) * 0.18,
        view.w / 2, view.h / 2, Math.max(view.w, view.h) * 0.68,
      );
      vg.addColorStop(0, 'rgba(0,0,0,0)');
      vg.addColorStop(1, 'rgba(8,4,2,0.86)');
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, view.w, view.h);
    },
  };
}
