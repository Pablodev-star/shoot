/**
 * SHOOT! — Galaxy backdrop.
 *
 * The sixth world leaves the desert behind: a drifting starfield, a slow nebula
 * wash and a ringed world on the horizon. Reused by the Galaxy world intro and
 * the victory screen.
 */

import { PALETTE } from '../art/palette.js';
import { makeRng } from '../core/rng.js';

export function createGalaxyScene() {
  const rng = makeRng(0x9a1a);
  const stars = Array.from({ length: 220 }, () => ({
    x: rng(),
    y: rng(),
    size: rng() < 0.86 ? 1 : 2,
    speed: rng.range(0.000004, 0.00004),
    phase: rng() * Math.PI * 2,
  }));
  let t = 0;

  return {
    update(dt) {
      t += dt;
      for (const s of stars) {
        s.x -= s.speed * dt;
        if (s.x < -0.02) s.x = 1.02;
      }
    },

    render(ctx, view) {
      const px = view.scale;

      // Deep space gradient.
      const grad = ctx.createLinearGradient(0, 0, 0, view.h);
      grad.addColorStop(0, PALETTE.cosmicHigh);
      grad.addColorStop(0.6, PALETTE.cosmic);
      grad.addColorStop(1, '#1a0730');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, view.w, view.h);

      // Nebula clouds.
      for (let i = 0; i < 3; i++) {
        const cx = view.w * (0.25 + i * 0.28) + Math.sin(t / (4000 + i * 900)) * 30;
        const cy = view.h * (0.3 + (i % 2) * 0.28);
        const r = Math.max(view.w, view.h) * (0.2 + i * 0.06);
        const neb = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        neb.addColorStop(0, i === 1 ? 'rgba(198, 47, 42, 0.18)' : 'rgba(138, 92, 214, 0.2)');
        neb.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = neb;
        ctx.fillRect(0, 0, view.w, view.h);
      }

      // Stars.
      for (const s of stars) {
        ctx.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(t / 800 + s.phase));
        ctx.fillStyle = PALETTE.star;
        ctx.fillRect(Math.round(s.x * view.w), Math.round(s.y * view.h), s.size * px, s.size * px);
      }
      ctx.globalAlpha = 1;

      // Ringed world low on the horizon.
      const cx = view.w * 0.74;
      const cy = view.h * 0.72;
      const r = Math.min(view.w, view.h) * 0.16;
      ctx.fillStyle = '#6b3f9a';
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#4c2f80';
      ctx.beginPath();
      ctx.arc(cx + r * 0.3, cy + r * 0.2, r * 0.85, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 226, 122, 0.55)';
      ctx.lineWidth = Math.max(2, px);
      ctx.beginPath();
      ctx.ellipse(cx, cy, r * 1.7, r * 0.34, -0.3, 0, Math.PI * 2);
      ctx.stroke();

      // Vignette.
      const vg = ctx.createRadialGradient(
        view.w / 2, view.h / 2, Math.min(view.w, view.h) * 0.24,
        view.w / 2, view.h / 2, Math.max(view.w, view.h) * 0.72,
      );
      vg.addColorStop(0, 'rgba(0,0,0,0)');
      vg.addColorStop(1, 'rgba(2,0,8,0.8)');
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, view.w, view.h);
    },
  };
}
