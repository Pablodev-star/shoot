/**
 * SHOOT! — The boss entrance.
 *
 * The last fight in the game used to start the way the first one does: a wipe,
 * two figures on a road, "Choose your move". Everything the journey had been
 * building towards arrived with less ceremony than a shop.
 *
 * This is the ceremony. It is a scripted, skippable, forty-frames-per-second
 * cut-scene made of the same pixels as everything else, and it is built to be
 * reused: the beats are data (see `boss.intro` in src/game/worlds.js), the
 * speech is the general system in src/ui/dialogue.js, and the only thing this
 * file knows about the Stranger is that he has a face.
 *
 * THE SHAPE OF IT
 * ---------------------------------------------------------------------------
 *   1. CUT TO BLACK. Not a fade — a cut. The player has just walked a mile of
 *      road and the screen goes out from under them, which is the loudest
 *      thing a scene can do and costs nothing.
 *   2. LETTERBOX. Two bars slide in. Thirty years of film language in eight
 *      pixels: the game is no longer taking input, and the player knows it
 *      without being told.
 *   3. THE FACE, OUT OF THE DARK. The black lifts over two and a half seconds
 *      while the camera crawls up the portrait at fourteen times its size —
 *      close enough that a socket fills a third of the screen. This is the
 *      "recorrido por la cara" and it is the whole point of the sequence: you
 *      meet him before you fight him.
 *   4. HE TALKS. Each line is a SHOT — the camera cuts to a framing chosen per
 *      line, the way a storyboard would. The player answers, and the answer
 *      cuts to the player's own face, because a conversation with one camera
 *      angle is a monologue.
 *   5. THE SLAM. Crash zoom onto the eyes, speed lines converging, three white
 *      impact frames, a shockwave, the name card, and everything shaking. Then
 *      the bars pull off and the duel is already underway.
 *
 * WHY IT IS ALL DRAWN AND NOT ANIMATED
 * ---------------------------------------------------------------------------
 * There is not a single tween in here that a designer authored frame by frame.
 * Every movement is a number interpolated between two shots, and every effect
 * is a primitive with a clock on it — which is what makes the whole thing
 * skippable at any moment without leaving anything half-finished, and what
 * makes a second boss cost a paragraph of data rather than a second cut-scene.
 *
 * PIXELS STAY PIXELS
 * ---------------------------------------------------------------------------
 * The zoom is always an integer. A portrait drawn at 13.4x is a portrait with
 * soft edges, and one soft edge in a cut-scene about a pixel-art villain
 * undoes the entire game's art direction. The camera therefore moves in whole
 * steps and the motion is carried by the pan, which can be smooth because it
 * is a translation.
 */

import { setRenderer } from '../core/scene.js';
import { wait } from '../core/dom.js';
import { play } from '../core/audio.js';
import { PALETTE } from '../art/palette.js';
import { drawSprite } from '../art/pixel.js';
import { drawTextCentered } from '../art/font.js';
import { getPortrait, PORTRAIT_SIZE } from '../art/sprites-portraits.js';
import { makeRng } from '../core/rng.js';
import { createSpeech } from '../ui/dialogue.js';
import { getSettings } from '../core/settings.js';

/**
 * The shots, in portrait space.
 *
 * `zoom` is how many device pixels one source pixel becomes at scale 1 (the
 * renderer multiplies it by the view's own scale), and `focus` is the point of
 * the 32 x 32 portrait the camera is centred on. `y` is measured from the top
 * of the face, so 0.34 is the brow and 0.62 is the jaw.
 */
const SHOTS = {
  /**
   * So close that the two lights are most of the screen — the portrait is
   * drawn several times wider than the viewport and only the eye band of it is
   * ever on camera. This is where the sequence starts, and the reason the
   * faces are 32 x 32 instead of the 5 x 3 a fighter's head gets.
   */
  eyes: { zoom: 9, focus: { x: 0.5, y: 0.45 }, drift: { x: 0, y: -0.012 } },
  /** The whole head, filling most of the height. */
  face: { zoom: 4.4, focus: { x: 0.5, y: 0.46 }, drift: { x: 0, y: -0.004 } },
  /** Pulled back: the crown, the shoulders, and the dark around them. */
  wide: { zoom: 2.4, focus: { x: 0.5, y: 0.5 }, drift: { x: 0.006, y: 0 } },
  /** Off to one side, looking up at him. */
  low: { zoom: 6.4, focus: { x: 0.4, y: 0.6 }, drift: { x: -0.01, y: -0.012 } },
};

/** How long the camera takes to move between two shots. */
const CUT_MS = 520;

/**
 * Play a boss entrance.
 *
 * @param {object} o
 * @param {object} o.enemy the boss, as built by `generateBoss`
 * @param {{lines: Array<{who: string, text: string, shot?: string}>}} o.intro
 * @param {HTMLCanvasElement} [o.playerPortrait] the face on the other side
 * @returns {{promise: Promise<void>, skip: () => void}} `skip` ends it early
 *   and is safe to call after it has already finished.
 */
export function playBossIntro({ enemy, intro, playerPortrait }) {
  const speech = createSpeech();
  const faces = {
    enemy: getPortrait(enemy.portrait) || enemy.sprites?.portrait || null,
    player: playerPortrait || null,
  };

  const rng = makeRng(0x5747);
  const shakeEnabled = getSettings().screenShake !== false;

  /** Everything the renderer draws, mutated by the script below. */
  const state = {
    /** Whose face is on camera. */
    who: 'enemy',
    /** Current and target camera, lerped every frame. */
    cam: { ...SHOTS.eyes, zoom: SHOTS.eyes.zoom, fx: 0.5, fy: 0.44 },
    target: SHOTS.eyes,
    cutT: 1,
    /** A black veil over everything: 1 is a cut to black. */
    veil: 1,
    /** Letterbox bar height, as a fraction of the view. */
    bars: 0,
    shake: 0,
    /** Impact frames: a flash of flat colour held for two or three frames. */
    slam: 0,
    /** Radial speed lines, 0..1. */
    lines: 0,
    /** Expanding ring, in fractions of the view width. -1 when idle. */
    ring: -1,
    /** The name card, 0..1. */
    card: 0,
    cardText: '',
    clock: 0,
  };

  const stars = Array.from({ length: 90 }, () => ({
    x: rng(),
    y: rng(),
    size: rng() < 0.86 ? 1 : 2,
    rate: rng.range(900, 2600),
    phase: rng.range(0, Math.PI * 2),
  }));

  /** Motes rising through the frame, so the dark is never still. */
  const motes = Array.from({ length: 34 }, () => ({
    x: rng(),
    y: rng(),
    vy: rng.range(-0.06, -0.015),
    a: rng.range(0.15, 0.5),
  }));

  const renderer = {
    update(dt) {
      state.clock += dt;
      if (state.cutT < 1) state.cutT = Math.min(1, state.cutT + dt / CUT_MS);
      // Ease the camera towards the shot it was cut to. The ease is on the
      // whole move rather than per axis, so a cut travels in a straight line.
      const k = easeOut(state.cutT);
      state.cam.zoom = lerp(state.cam.fromZoom ?? state.target.zoom, state.target.zoom, k);
      state.cam.fx = lerp(state.cam.fromX ?? state.target.focus.x, state.target.focus.x, k);
      state.cam.fy = lerp(state.cam.fromY ?? state.target.focus.y, state.target.focus.y, k);
      // …and then keeps drifting, so no shot is ever a still frame.
      const drift = state.target.drift || { x: 0, y: 0 };
      state.cam.fx += (drift.x * dt) / 1000;
      state.cam.fy += (drift.y * dt) / 1000;

      if (state.shake > 0) state.shake = Math.max(0, state.shake - dt);
      if (state.slam > 0) state.slam = Math.max(0, state.slam - dt);
      if (state.lines > 0) state.lines = Math.max(0, state.lines - dt / 700);
      if (state.ring >= 0) {
        state.ring += dt / 620;
        if (state.ring > 1.4) state.ring = -1;
      }
      for (const m of motes) {
        m.y += (m.vy * dt) / 1000;
        if (m.y < -0.05) {
          m.y = 1.05;
          m.x = rng();
        }
      }
    },

    render(ctx, view) {
      const s = view.scale;
      ctx.fillStyle = PALETTE.cosmicHigh;
      ctx.fillRect(0, 0, view.w, view.h);

      const amp = shakeEnabled ? Math.min(9, state.shake / 22) : 0;
      const ox = amp ? (Math.random() - 0.5) * amp * s : 0;
      const oy = amp ? (Math.random() - 0.5) * amp * s : 0;
      ctx.save();
      ctx.translate(Math.round(ox), Math.round(oy));

      drawStars(ctx, view, s, stars, state.clock);
      drawMotes(ctx, view, s, motes);

      // --- the face ---
      const face = faces[state.who];
      if (face) {
        // Whole steps only: see the note at the top of the file.
        const zoom = Math.max(1, Math.round(state.cam.zoom * s));
        const w = PORTRAIT_SIZE * zoom;
        const x = view.w / 2 - state.cam.fx * w;
        const y = view.h / 2 - state.cam.fy * w;
        /**
         * A halo behind him, so the head is not a sticker on a black card.
         *
         * Four concentric bands, each fainter and wider than the last. The
         * first version was a single translucent rectangle, and a single
         * rectangle is exactly what it looked like: a grey box behind his
         * head with four hard edges on it. A stack fades outwards, which is
         * what a glow does, and it is still made of whole blocks.
         */
        const halo = state.who === 'enemy' ? [79, 202, 198] : [232, 177, 44];
        for (let i = 4; i >= 1; i--) {
          const pad = w * 0.06 * i;
          ctx.fillStyle = `rgba(${halo[0]}, ${halo[1]}, ${halo[2]}, ${0.05 - i * 0.008})`;
          ctx.fillRect(
            Math.round(x - pad),
            Math.round(y - pad),
            Math.round(w + pad * 2),
            Math.round(w + pad * 2),
          );
        }
        drawSprite(ctx, face, Math.round(x), Math.round(y), zoom);
      }

      if (state.lines > 0) drawSpeedLines(ctx, view, s, state.lines, rng, state.clock);
      if (state.ring >= 0) drawRing(ctx, view, s, state.ring);

      ctx.restore();

      // --- the veil, the impact frames and the card: never shaken ---
      if (state.veil > 0.001) {
        ctx.globalAlpha = Math.min(1, state.veil);
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, view.w, view.h);
        ctx.globalAlpha = 1;
      }

      if (state.slam > 0) {
        // White, then a single frame of black: an impact frame is a hole in
        // the film, and holding white alone reads as a bug.
        ctx.fillStyle = state.slam > 90 ? PALETTE.white : PALETTE.ink;
        ctx.globalAlpha = Math.min(1, state.slam / 120);
        ctx.fillRect(0, 0, view.w, view.h);
        ctx.globalAlpha = 1;
      }

      if (state.card > 0 && state.cardText) {
        const k = easeOut(Math.min(1, state.card));
        const cy = view.h * 0.46;
        const band = Math.round(view.h * 0.16);
        // A plate under it, opening from the middle outwards. The card is the
        // one piece of text in the sequence that has to be legible over the
        // brightest part of the picture, and letters on a face are letters
        // nobody can read.
        ctx.globalAlpha = Math.min(0.85, state.card * 1.2);
        ctx.fillStyle = PALETTE.shadow;
        const bw = view.w * k;
        ctx.fillRect(Math.round((view.w - bw) / 2), Math.round(cy - band / 2), Math.round(bw), band);
        ctx.globalAlpha = Math.min(1, state.card * 1.4);
        ctx.fillStyle = PALETTE.astralDark;
        ctx.fillRect(Math.round((view.w - bw) / 2), Math.round(cy - band / 2), Math.round(bw), s);
        ctx.fillRect(Math.round((view.w - bw) / 2), Math.round(cy + band / 2 - s), Math.round(bw), s);

        // It arrives from the right and stops dead, which is what a card does.
        const slide = (1 - k) * view.w * 0.3;
        drawTextCentered(ctx, state.cardText, view.w / 2 + slide, cy, {
          scale: Math.max(3, s + 1),
          color: PALETTE.star,
          shadow: PALETTE.cosmicHigh,
        });
        ctx.globalAlpha = 1;
      }

      if (state.bars > 0) {
        const h = Math.round(view.h * state.bars);
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, view.w, h);
        ctx.fillRect(0, view.h - h, view.w, h);
        /**
         * The way out, printed in the bar itself.
         *
         * A cut-scene you cannot leave is a cut-scene the player resents on
         * the second attempt at a boss, and this one plays before a fight
         * that can be lost. It goes in the letterbox rather than over the
         * picture, in the game's own font, at the alpha of something that is
         * not asking to be looked at.
         */
        if (h > 8) {
          // The TOP bar: the speech box lives against the bottom of the frame
          // and a hint printed under it is a hint nobody has ever read.
          ctx.globalAlpha = 0.4;
          drawTextCentered(ctx, 'ESC TO SKIP', view.w / 2, h / 2, {
            scale: Math.max(1, s - 1),
            color: PALETTE.grey,
          });
          ctx.globalAlpha = 1;
        }
      }
    },
  };

  // --- the script ------------------------------------------------------------

  let skipped = false;
  let resolveDone;
  const promise = new Promise((resolve) => {
    resolveDone = resolve;
  });

  /** Cut the camera to a named shot. Instant target, eased travel. */
  function cutTo(name) {
    const shot = SHOTS[name] || SHOTS.face;
    state.cam.fromZoom = state.cam.zoom;
    state.cam.fromX = state.cam.fx;
    state.cam.fromY = state.cam.fy;
    state.target = shot;
    state.cutT = 0;
  }

  /** A hard cut with no travel — used for the reverse angle. */
  function hardCut(name, who) {
    const shot = SHOTS[name] || SHOTS.face;
    state.who = who;
    state.target = shot;
    state.cam.zoom = shot.zoom;
    state.cam.fx = shot.focus.x;
    state.cam.fy = shot.focus.y;
    state.cam.fromZoom = shot.zoom;
    state.cam.fromX = shot.focus.x;
    state.cam.fromY = shot.focus.y;
    state.cutT = 1;
  }

  /** `wait`, but a skip ends the whole sequence rather than the current beat. */
  const beat = async (ms) => {
    if (skipped) return;
    await wait(ms);
  };

  async function run() {
    setRenderer(renderer);

    // 1. Cut to black, and hold it just long enough to be uncomfortable.
    state.veil = 1;
    play('heartbeat');
    await beat(340);
    if (skipped) return;

    // 2. Letterbox.
    for (let i = 0; i <= 6 && !skipped; i++) {
      state.bars = (i / 6) * 0.11;
      await beat(34);
    }
    play('heartbeat');

    // 3. The face, out of the dark. The veil lifts over the whole first line.
    hardCut('eyes', 'enemy');
    play('rumble');
    const lift = 30;
    (async () => {
      for (let i = 0; i <= lift && !skipped; i++) {
        state.veil = 1 - easeOut(i / lift) * 0.92;
        await wait(70);
      }
      if (!skipped) state.veil = 0.06;
    })();
    await beat(700);

    // 4. The lines. Each one is a shot.
    for (const line of intro.lines || []) {
      if (skipped) return;
      const who = line.who === 'player' ? 'player' : 'enemy';
      const shot = line.shot || (who === 'player' ? 'face' : 'face');
      if (who !== state.who) hardCut(shot, who);
      else cutTo(shot);
      if (line.shake) {
        state.shake = line.shake;
        play('toll');
      }
      await speech.say({
        text: line.text,
        name: who === 'player' ? 'You' : enemy.name,
        portrait: faces[who],
        side: who === 'player' ? 'player' : 'enemy',
      });
      if (skipped) return;
    }
    speech.hide();

    // 5. The slam.
    if (skipped) return;
    hardCut('face', 'enemy');
    cutTo('eyes');
    state.lines = 1;
    state.shake = 900;
    play('rumble');
    await beat(420);
    if (skipped) return;

    state.slam = 220;
    state.ring = 0;
    state.card = 0.001;
    state.cardText = (enemy.name || '').toUpperCase();
    play('thunder');
    play('toll');
    for (let i = 0; i <= 12 && !skipped; i++) {
      state.card = i / 12;
      await wait(30);
    }
    await beat(900);

    // 6. Out.
    for (let i = 0; i <= 8 && !skipped; i++) {
      state.card = 1 - i / 8;
      state.bars = 0.11 * (1 - i / 8);
      state.veil = (i / 8) * 0.45;
      await beat(40);
    }
    finish();
  }

  function finish() {
    if (skipped) return;
    skipped = true;
    window.removeEventListener('keydown', onKey);
    speech.dispose();
    resolveDone();
  }

  /** End it now: the player has seen enough, or the screen is going away. */
  function skip() {
    if (skipped) return;
    skipped = true;
    window.removeEventListener('keydown', onKey);
    speech.dispose();
    resolveDone();
  }

  const onKey = (e) => {
    if (e.key === 'Escape') skip();
  };
  window.addEventListener('keydown', onKey);

  run().catch(() => skip());

  return { promise, skip };
}

// ---------------------------------------------------------------------------
// The pieces
// ---------------------------------------------------------------------------

const lerp = (a, b, k) => a + (b - a) * k;
const easeOut = (k) => 1 - (1 - k) ** 3;

function drawStars(ctx, view, s, stars, clock) {
  ctx.fillStyle = PALETTE.star;
  for (const st of stars) {
    ctx.globalAlpha = 0.35 + 0.4 * Math.sin(clock / st.rate + st.phase);
    ctx.fillRect(
      Math.round((st.x * view.w) / s) * s,
      Math.round((st.y * view.h) / s) * s,
      st.size * s,
      st.size * s,
    );
  }
  ctx.globalAlpha = 1;
}

function drawMotes(ctx, view, s, motes) {
  ctx.fillStyle = PALETTE.astralLight;
  for (const m of motes) {
    ctx.globalAlpha = m.a;
    ctx.fillRect(Math.round((m.x * view.w) / s) * s, Math.round((m.y * view.h) / s) * s, s, s);
  }
  ctx.globalAlpha = 1;
}

/**
 * Speed lines: the one piece of grammar that says "anime" more than any other,
 * and it is a hundred rectangles pointing at the middle of the screen.
 *
 * They are drawn from the *edge inwards* and stop short of the centre, so the
 * face is never covered — a converging burst that reaches the middle blots out
 * the thing it is supposed to be emphasising.
 */
function drawSpeedLines(ctx, view, s, strength, rng, clock) {
  const cx = view.w / 2;
  const cy = view.h / 2;
  const reach = Math.max(view.w, view.h);
  const count = 54;
  ctx.fillStyle = PALETTE.white;
  for (let i = 0; i < count; i++) {
    // A fixed spread with a wobble, so the burst does not crawl frame to frame.
    const a = (i / count) * Math.PI * 2 + Math.sin(clock / 240 + i) * 0.02;
    const inner = reach * (0.22 + (1 - strength) * 0.5);
    const outer = reach * 0.78;
    const len = (outer - inner) * (0.5 + ((i * 37) % 100) / 200);
    ctx.globalAlpha = strength * (0.25 + ((i * 17) % 10) / 20);
    for (let t = 0; t < len; t += s * 2) {
      const r = inner + t;
      ctx.fillRect(
        Math.round((cx + Math.cos(a) * r) / s) * s,
        Math.round((cy + Math.sin(a) * r) / s) * s,
        s,
        s,
      );
    }
  }
  ctx.globalAlpha = 1;
}

/** A shockwave: one ring of blocks, thinning as it goes. */
function drawRing(ctx, view, s, k) {
  const cx = view.w / 2;
  const cy = view.h / 2;
  const r = k * Math.max(view.w, view.h) * 0.7;
  const alpha = Math.max(0, 1 - k) ** 1.5;
  const steps = Math.max(24, Math.round(r / (s * 1.5)));
  ctx.fillStyle = PALETTE.astralLight;
  ctx.globalAlpha = alpha * 0.9;
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    ctx.fillRect(
      Math.round((cx + Math.cos(a) * r) / s) * s,
      Math.round((cy + Math.sin(a) * r * 0.72) / s) * s,
      s * 2,
      s * 2,
    );
  }
  ctx.globalAlpha = 1;
}
