/**
 * SHOOT! — The Dusk Totem breaking.
 *
 * The one scene in the game that plays INSTEAD of a game over, and the only
 * screen in it that is not a screen: no router, no panel, no saloon-door wipe.
 * It is a black rectangle nailed over the top of whatever you were doing, and
 * it is deliberately the plainest thing in the product, because everything it
 * has to say it says with one object in an empty frame.
 *
 * THE BEATS, AND WHY EACH ONE IS THE LENGTH IT IS
 * ---------------------------------------------------------------------------
 *   0ms      BLACK. Instantly, with no fade of any kind. You died — the frame
 *            does not get to ease you into it, and a tween here would read as
 *            a screen transition rather than as the lights going out.
 *   0-3000   Nothing. Three full seconds of it, which is a very long time on a
 *            screen with nothing on it, and that is the entire point: this is
 *            the pause where a run has ended, and the player is allowed to sit
 *            in it and start being sorry before anything argues.
 *   3000     The totem arrives, and THIS one is tweened — up out of the dark,
 *            over-shooting its size and settling, with its ember coming up
 *            behind it. It floats from here on: it is not standing anywhere.
 *   4200     One word at the bottom. TAP.
 *   tap 1    It grows, and it splits. Shake, sparks, a low hit.
 *   tap 2    Bigger, and the split opens into the carving with light coming
 *            out of it — see `crackWide` in src/art/sprites-totem.js.
 *   tap 3    It breaks. The picture comes apart into shards that carry their
 *            own share of the cracks with them, the frame goes white, and the
 *            black lifts off whatever was underneath it all along.
 *
 * WHAT IT DOES NOT DO
 * ---------------------------------------------------------------------------
 * It does not touch the player, the run, the duel or the save. It resolves a
 * promise when the totem is in pieces and the caller decides what being alive
 * means where they are standing — `breakTotem()` on the road (src/game/run.js),
 * a life count the duel engine already restored in a fight
 * (src/duel/duel-screen.js). A cut-scene that also mutates the run is a
 * cut-scene that can only ever be played from one place.
 */

import { el } from '../core/dom.js';
import { play } from '../core/audio.js';
import { crisp } from '../art/pixel.js';
import { PALETTE } from '../art/palette.js';
import { getSettings } from '../core/settings.js';
import { TOTEM_W, TOTEM_H, composeTotem, shatterPieces } from '../art/sprites-totem.js';

/** The dark before anything happens. */
const DARK_MS = 3000;
/** The rise, and the beat after it before the prompt is offered. */
const RISE_MS = 900;
const PROMPT_MS = 1200;
/** How long the shards fly before the black lifts. */
const BREAK_MS = 2000;

/** How big the totem is at each stage, as a fraction of the frame's height. */
const HEIGHT_STEPS = [0.42, 0.54, 0.68];

/** What the bottom of the screen says at each stage. */
const PROMPTS = ['TAP', 'AGAIN', 'ONE MORE'];

/**
 * Play the break.
 *
 * @param {object} [opts]
 * @param {string} [opts.title] the line printed once it is in pieces
 * @returns {Promise<void>} resolves after the last shard and the black lifting
 */
export function playTotemRevival(opts = {}) {
  return new Promise((resolve) => {
    const canvas = el('canvas.totem-canvas');
    const prompt = el('div.totem-prompt', { text: PROMPTS[0], 'aria-live': 'polite' });
    const veil = el('div.totem-veil', {
      role: 'dialog',
      'aria-label': 'The dusk totem',
    }, [canvas, prompt]);
    (document.getElementById('app') || document.body).append(veil);

    const ctx = canvas.getContext('2d');
    const view = { w: 0, h: 0, dpr: 1 };
    const shake = getSettings().screenShake;

    /**
     * `taps` is the state machine and there is nothing else to it: 0, 1, 2 are
     * the whole totem and its two cracks, 3 is the break. `art` is re-composed
     * on each tap rather than layered every frame, so the shards can be cut out
     * of one finished picture.
     */
    const st = {
      t: 0,
      taps: 0,
      art: composeTotem(0),
      /** Eased towards the step above; the overshoot is what makes it land. */
      size: 0,
      sizeTo: HEIGHT_STEPS[0],
      shakeMs: 0,
      flash: 0,
      breakAt: -1,
      pieces: null,
      motes: makeMotes(),
      done: false,
    };

    function resize() {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const rect = veil.getBoundingClientRect();
      view.w = Math.max(1, Math.round(rect.width));
      view.h = Math.max(1, Math.round(rect.height));
      view.dpr = dpr;
      canvas.width = Math.round(view.w * dpr);
      canvas.height = Math.round(view.h * dpr);
      crisp(ctx);
    }
    resize();
    window.addEventListener('resize', resize);

    // --- input -------------------------------------------------------------

    /** True once the totem is up and the prompt has been offered. */
    const ready = () => st.t >= DARK_MS + RISE_MS + PROMPT_MS && st.taps < 3 && !st.done;

    function tap() {
      if (!ready()) return;
      st.taps += 1;
      st.art = composeTotem(Math.min(2, st.taps));
      st.shakeMs = 220 + st.taps * 130;

      if (st.taps < 3) {
        st.sizeTo = HEIGHT_STEPS[st.taps];
        prompt.textContent = PROMPTS[st.taps];
        prompt.classList.remove('is-struck');
        void prompt.offsetWidth;
        prompt.classList.add('is-struck');
        play('hit');
        return;
      }

      // The break.
      st.breakAt = st.t;
      st.flash = 1;
      st.pieces = shatterPieces(4, 7, Math.random);
      prompt.textContent = opts.title || 'IT BREAKS INSTEAD OF YOU';
      prompt.classList.add('is-final');
      play('toll');
      play('levelUp');
    }

    const onKey = (e) => {
      if (e.key === 'Escape') return; // there is no skipping this one
      e.preventDefault();
      tap();
    };
    veil.addEventListener('pointerdown', tap);
    window.addEventListener('keydown', onKey);

    // --- the loop ----------------------------------------------------------

    let raf = 0;
    let last = performance.now();

    function frame(now) {
      const dt = Math.min(64, Math.max(0, now - last));
      last = now;
      st.t += dt;

      step(dt);
      draw();

      if (st.done) {
        cleanup();
        return;
      }
      raf = requestAnimationFrame(frame);
    }

    function step(dt) {
      // The size chases its target rather than snapping to it, which is what
      // makes a tap feel like it landed on something with weight in it.
      st.size += (st.sizeTo - st.size) * Math.min(1, dt / 90);
      if (st.shakeMs > 0) st.shakeMs = Math.max(0, st.shakeMs - dt);
      if (st.flash > 0) st.flash = Math.max(0, st.flash - dt / 260);

      for (const m of st.motes) {
        m.a += m.speed * dt;
        m.life += dt;
      }

      if (st.pieces) {
        for (const p of st.pieces) {
          p.x = (p.x || 0) + p.vx * dt;
          p.y = (p.y || 0) + p.vy * dt;
          p.vy += 0.00006 * dt; // gravity, in source pixels per ms²
          p.rot += p.vr * dt;
        }
        // The veil fades with the shards rather than after them: the last
        // thing on screen should be the game coming back, not an empty frame.
        const since = st.t - st.breakAt;
        if (since > BREAK_MS * 0.5) {
          veil.style.opacity = String(Math.max(0, 1 - (since - BREAK_MS * 0.5) / (BREAK_MS * 0.5)));
        }
        if (since >= BREAK_MS) st.done = true;
      }
    }

    function draw() {
      ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
      ctx.clearRect(0, 0, view.w, view.h);
      crisp(ctx);

      const appear = clamp01((st.t - DARK_MS) / RISE_MS);
      if (appear <= 0) return;

      const cx = view.w / 2;
      const cy = view.h * 0.46;

      // The whole picture shakes, which is cheaper and reads better than
      // shaking the totem inside a still frame.
      let ox = 0;
      let oy = 0;
      if (shake && st.shakeMs > 0) {
        const k = st.shakeMs / 8;
        ox = (Math.random() * 2 - 1) * k;
        oy = (Math.random() * 2 - 1) * k;
      }

      // Height in CSS pixels, quantised to whole source pixels so the carving
      // never lands on a fractional scale and turns to mush.
      const rise = easeOutBack(appear);
      const targetH = view.h * st.size * (0.55 + 0.45 * rise);
      const scale = Math.max(1, Math.round(targetH / TOTEM_H));
      const w = TOTEM_W * scale;
      const h = TOTEM_H * scale;
      const bob = Math.sin(st.t / 620) * scale * 0.9;
      const x = Math.round(cx - w / 2 + ox);
      const y = Math.round(cy - h / 2 + bob + (1 - rise) * view.h * 0.12 + oy);

      ctx.globalAlpha = appear;
      drawGlow(cx + ox, cy + bob + oy, h, appear);
      drawMotes(cx + ox, cy + bob + oy, h, appear);

      if (st.pieces) drawShards(x, y, scale);
      else ctx.drawImage(st.art, x, y, w, h);

      ctx.globalAlpha = 1;
      if (st.flash > 0) {
        ctx.fillStyle = PALETTE.white;
        ctx.globalAlpha = Math.min(1, st.flash) * 0.92;
        ctx.fillRect(0, 0, view.w, view.h);
        ctx.globalAlpha = 1;
      }
    }

    /** The ember behind it, brighter with every crack. */
    function drawGlow(cx, cy, h, alpha) {
      const heat = 0.55 + st.taps * 0.28 + Math.sin(st.t / 380) * 0.06;
      const r = h * (0.85 + st.taps * 0.14);
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      grad.addColorStop(0, hexA(PALETTE.emberGlow, 0.62 * heat * alpha));
      grad.addColorStop(0.35, hexA(PALETTE.magma, 0.3 * heat * alpha));
      grad.addColorStop(1, hexA(PALETTE.cosmic, 0));
      ctx.fillStyle = grad;
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    }

    /** Dust turning around it, so the dark is not empty while it floats. */
    function drawMotes(cx, cy, h, alpha) {
      ctx.fillStyle = PALETTE.emberGlow;
      for (const m of st.motes) {
        const r = h * m.radius;
        const px = cx + Math.cos(m.a) * r;
        const py = cy + Math.sin(m.a) * r * 0.55 + Math.sin(st.t / 900 + m.a) * h * 0.03;
        const size = Math.max(1, Math.round(h * 0.012 * m.size));
        ctx.globalAlpha = alpha * (0.25 + 0.45 * (0.5 + 0.5 * Math.sin(m.life / 320)));
        ctx.fillRect(Math.round(px), Math.round(py), size, size);
      }
      ctx.globalAlpha = alpha;
    }

    /** The carving, in pieces, each one still carrying its bit of the crack. */
    function drawShards(x, y, scale) {
      for (const p of st.pieces) {
        const dx = x + (p.sx + (p.x || 0)) * scale;
        const dy = y + (p.sy + (p.y || 0)) * scale;
        const w = p.sw * scale;
        const h = p.sh * scale;
        ctx.save();
        ctx.translate(Math.round(dx + w / 2), Math.round(dy + h / 2));
        ctx.rotate(p.rot);
        ctx.drawImage(st.art, p.sx, p.sy, p.sw, p.sh, -w / 2, -h / 2, w, h);
        ctx.restore();
      }
    }

    // --- prompt / teardown -------------------------------------------------

    const promptTimer = setTimeout(() => {
      prompt.classList.add('is-shown');
    }, DARK_MS + RISE_MS + PROMPT_MS);

    /**
     * The dark is not silent, it is quiet: two beats of a heart under an empty
     * frame, and then the thing coming up out of it.
     */
    const cues = [
      setTimeout(() => play('heartbeat'), 900),
      setTimeout(() => play('heartbeat'), 1900),
      setTimeout(() => play('rumble'), DARK_MS - 320),
      setTimeout(() => play('toll'), DARK_MS + 120),
    ];

    function cleanup() {
      cancelAnimationFrame(raf);
      clearTimeout(promptTimer);
      cues.forEach(clearTimeout);
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', onKey);
      veil.removeEventListener('pointerdown', tap);
      veil.remove();
      resolve();
    }

    raf = requestAnimationFrame(frame);
  });
}

// ---------------------------------------------------------------------------

function makeMotes() {
  const out = [];
  for (let i = 0; i < 22; i++) {
    out.push({
      a: Math.random() * Math.PI * 2,
      radius: 0.34 + Math.random() * 0.42,
      speed: (0.00018 + Math.random() * 0.0004) * (Math.random() < 0.5 ? -1 : 1),
      size: 0.6 + Math.random() * 1.2,
      life: Math.random() * 2000,
    });
  }
  return out;
}

const clamp01 = (n) => Math.max(0, Math.min(1, n));

/** Overshoot and settle — the totem arrives, it does not slide into place. */
function easeOutBack(t) {
  const c = 1.7;
  const p = t - 1;
  return 1 + (c + 1) * p * p * p + c * p * p;
}

/** `#rrggbb` plus an alpha, for the gradient stops. */
function hexA(hex, alpha) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}
