/**
 * SHOOT! — The blacksmith's workshop, and the six things that happen in it.
 *
 * The forge used to borrow the shop's room and paint a brick oblong on the
 * left of it. It is its own place now, and the reason it needed to be is that
 * the forge is the only counter in the game where something is MADE: a shop
 * hands over what was already on the shelf and an inn hands over a bed, but a
 * gun that is one rung better than it was has to be beaten, poured, quenched,
 * blown up white or dragged through a hole in the sky first.
 *
 * THE ROOM
 * ---------------------------------------------------------------------------
 * Sooted board, a stone floor, and everything in it arranged around the fire:
 * the furnace with its hood and chimney on the left, the bellows feeding it,
 * the anvil out in the near plane on the right, the quench trough beyond that,
 * tongs on one wall and finished work on the other. Nothing stands in the
 * middle third, because that is where the counter's HTML sits — the same rule
 * the shop and the inn are laid out by.
 *
 * The fire is live rather than baked (see `src/art/sprites-forge.js`): tongues
 * that each burn for a moment and come back different, a coal bed that breathes
 * on its own clock, smoke drawn UP INTO THE HOOD rather than into the room, and
 * light that reaches the anvil, the floor and the far wall at three different
 * strengths. Everything else in here — the pulse on the walls, the embers, the
 * glow on the metal — is that one fire, seen off different surfaces.
 *
 * THE RITUALS
 * ---------------------------------------------------------------------------
 * `playRitual(id)` runs the performance for one rung of the ladder and returns
 * how long it takes, so the counter can wait for it. There are six, one per
 * upgrade, and they are six different performances rather than one animation
 * with the colour changed — that was the point of building this at all:
 *
 *   hammer   three blows on the anvil, sparks off each, the room jumping
 *   braze    molten brass poured over the work, running off the horn in gold
 *   quench   plunged into the trough: steam to the ceiling, and the fire
 *            drowned out of the frame for a beat
 *   bellows  the coals blown white, flame out of the mouth, an ember storm
 *   runes    a ring of cold glyphs turning in a room that has gone dark
 *   nova     the roof opens. A starfield pours in, a vortex takes the gun, and
 *            it comes back with a shockwave and a white frame
 *
 * Each one owns its own timeline and draws its own furniture; they share only
 * the particle bag and the screen wash. Adding a seventh means adding an entry
 * to RITUALS and nothing else.
 */

import { PALETTE } from '../art/palette.js';
import { drawSprite } from '../art/pixel.js';
import { forgeSprite, FORGE_MOUTH } from '../art/sprites-forge.js';
import { makeRng } from '../core/rng.js';

/** Where the wall stops and the floor starts, as a fraction of frame height. */
const FLOOR_AT = 0.8;

export function createForgeScene() {
  const rng = makeRng(6161);

  /** Soot and dust turning in the heat. */
  const motes = Array.from({ length: 30 }, () => ({
    x: rng(),
    y: rng(),
    vy: rng.range(-0.00014, -0.00004),
    vx: rng.range(-0.00006, 0.00006),
    a: rng.range(0.05, 0.2),
  }));

  /** The fire: seven tongues, each on its own life and none of them in step. */
  const flames = Array.from({ length: 9 }, (_, i) => ({
    x: (i + 0.5) / 9,
    life: rng(),
    speed: rng.range(0.0014, 0.0032),
    height: rng.range(0.5, 1),
  }));

  /** What goes up the chimney, and what comes off the coals. */
  const embers = Array.from({ length: 14 }, () => ({
    x: rng(),
    y: rng(),
    speed: rng.range(0.0002, 0.00055),
    drift: rng.range(-0.0001, 0.0001),
  }));

  /**
   * Everything a ritual throws. One bag, in device pixels, so a spark from the
   * hammer and a star from the Nova are the same kind of thing and are culled
   * by the same loop.
   */
  const bits = [];

  let t = 0;
  /** The fire's own flicker, and how hard it is being driven right now. */
  let flicker = 1;
  let draught = 0;
  let shake = 0;
  /** A whole-frame wash: { color, alpha, fade } — set by the rituals. */
  let wash = null;

  /** The running ritual: its spec, its clock, and how long it has to run. */
  let ritual = null;

  /**
   * Where everything in the room is, in device pixels. Written by `render` and
   * read by the rituals, which have to know where the anvil is without being
   * given a canvas.
   */
  let geo = null;

  // -------------------------------------------------------------------------
  // Particles
  // -------------------------------------------------------------------------

  function spark(x, y, opts = {}) {
    const speed = opts.speed ?? 1;
    const angle = opts.angle ?? Math.random() * Math.PI * 2;
    const spread = opts.spread ?? Math.PI;
    const th = angle + (Math.random() - 0.5) * spread;
    bits.push({
      x,
      y,
      vx: Math.cos(th) * (0.05 + Math.random() * 0.16) * speed,
      vy: Math.sin(th) * (0.05 + Math.random() * 0.16) * speed,
      g: opts.g ?? 0.00035,
      drag: opts.drag ?? 1,
      life: opts.life ?? 500 + Math.random() * 400,
      t: 0,
      size: opts.size ?? 1,
      color: opts.color || PALETTE.emberGlow,
      /** A spark shrinks; a star twinkles; smoke swells. */
      kind: opts.kind || 'spark',
    });
  }

  function burst(x, y, count, opts = {}) {
    for (let i = 0; i < count; i++) spark(x, y, opts);
  }

  // -------------------------------------------------------------------------
  // The rituals
  //
  // Each one is { ms, step(k, dt), draw(ctx, view, k) } and every field is
  // optional but `ms`. `k` runs 0 → 1 across the whole performance.
  // -------------------------------------------------------------------------

  const RITUALS = {
    /** Three blows, and the room jumping on each one. */
    hammer: {
      ms: 1500,
      step(k, dt, self) {
        // Blows at a third, a half and three quarters of the way through: the
        // beat of a real smith, which is not evenly spaced.
        for (const beat of [0.24, 0.5, 0.76]) {
          if (crossed(self, k, beat)) {
            const a = geo?.anvil;
            if (!a) continue;
            burst(a.x, a.y, 22, {
              angle: -Math.PI / 2,
              spread: Math.PI * 0.9,
              speed: 1.5,
              color: PALETTE.goldLight,
              life: 520,
            });
            burst(a.x, a.y, 10, { angle: -Math.PI / 2, spread: Math.PI, speed: 2.4, color: PALETTE.white, life: 300 });
            shake = 180;
            wash = { color: PALETTE.goldLight, alpha: 0.22, fade: 220, t: 0 };
          }
        }
      },
      /** The hammer itself, swung by hand: up on the back beat, down on it. */
      draw(ctx, view, k) {
        const a = geo?.anvil;
        if (!a) return;
        const swing = Math.abs(Math.sin(k * Math.PI * 3.2));
        const s = geo.fs;
        const sprite = forgeSprite('hammer');
        ctx.save();
        ctx.translate(a.x + s * 2, a.y - s * 2);
        ctx.rotate(-1.15 * swing - 0.15);
        drawSprite(ctx, sprite, -s * 3, -s * 13, s);
        ctx.restore();
      },
    },

    /** Brass, poured. */
    braze: {
      ms: 1700,
      step(k, dt, self) {
        const a = geo?.anvil;
        if (!a) return;
        if (k > 0.18 && k < 0.72 && Math.random() < 0.55) {
          // The stream lands and runs off the horn: drips leave sideways with
          // almost no upward velocity, which is what makes metal read as heavy.
          spark(a.x + (Math.random() - 0.5) * geo.fs * 3, a.y, {
            angle: 0,
            spread: Math.PI * 1.6,
            speed: 0.5,
            color: Math.random() < 0.5 ? PALETTE.goldLight : PALETTE.gold,
            life: 700,
            g: 0.0008,
          });
        }
        if (crossed(self, k, 0.2)) wash = { color: PALETTE.gold, alpha: 0.2, fade: 900, t: 0 };
        if (crossed(self, k, 0.74)) {
          burst(a.x, a.y, 26, { angle: -Math.PI / 2, spread: Math.PI, speed: 1.2, color: PALETTE.goldLight });
          shake = 120;
        }
      },
      draw(ctx, view, k) {
        const a = geo?.anvil;
        if (!a || k < 0.14 || k > 0.76) return;
        const s = geo.fs;
        // The crucible, tipping, and the stream coming out of it.
        const tip = Math.min(1, (k - 0.14) / 0.2);
        const cx = a.x - s * 6;
        const cy = a.y - s * 22;
        ctx.fillStyle = PALETTE.charDark;
        ctx.fillRect(cx, cy, s * 10, s * 6);
        ctx.fillStyle = PALETTE.magma;
        ctx.fillRect(cx + s, cy + s, s * 8, s * 2);
        ctx.fillStyle = PALETTE.goldLight;
        const streamW = Math.max(1, Math.round(s * (0.6 + tip)));
        for (let y = cy + s * 5; y < a.y; y += s) {
          const wob = Math.round(Math.sin((y + t) / (s * 6)) * s * 0.5);
          ctx.fillStyle = ((y / s) | 0) % 3 === 0 ? PALETTE.gold : PALETTE.goldLight;
          ctx.fillRect(cx + s * 8 + wob, y, streamW, s);
        }
      },
    },

    /** Into the water, and the water into the air. */
    quench: {
      ms: 1800,
      step(k, dt, self) {
        const q = geo?.trough;
        if (!q) return;
        if (crossed(self, k, 0.3)) {
          shake = 90;
          wash = { color: PALETTE.white, alpha: 0.3, fade: 260, t: 0 };
          burst(q.x, q.y, 18, { angle: -Math.PI / 2, spread: 1.4, speed: 1.1, color: PALETTE.skyDay, life: 600 });
        }
        // Steam: it rises, it swells, and it does not fall.
        if (k > 0.3 && k < 0.9 && Math.random() < 0.9) {
          spark(q.x + (Math.random() - 0.5) * geo.fs * 12, q.y, {
            angle: -Math.PI / 2,
            spread: 0.7,
            speed: 0.5,
            g: -0.00022,
            drag: 0.992,
            life: 1100,
            size: 2,
            color: Math.random() < 0.4 ? PALETTE.white : PALETTE.bone,
            kind: 'smoke',
          });
        }
      },
      draw(ctx, view, k) {
        // The fire is drowned for the length of the hiss: the room's own light
        // drops away and comes back, which is the whole drama of a quench.
        if (k > 0.28 && k < 0.72) {
          ctx.fillStyle = 'rgba(120, 160, 200, 0.1)';
          ctx.fillRect(0, 0, view.w, view.h);
        }
      },
    },

    /** The coals blown white. */
    bellows: {
      ms: 1900,
      step(k, dt, self) {
        const m = geo?.mouth;
        if (!m) return;
        // Three pumps, and the draught rising with each one. `draught` is read
        // by the fire itself, so the flames are genuinely being driven rather
        // than having a bigger flame drawn over them.
        draught = Math.min(1, Math.max(draught, Math.sin(k * Math.PI * 3) ** 2 * (0.4 + k)));
        if (Math.random() < 0.9) {
          spark(m.x + (Math.random() - 0.5) * m.w * 0.8, m.y, {
            angle: -Math.PI / 2,
            spread: 0.9,
            speed: 1.1 + k,
            g: -0.00018,
            life: 900,
            color: Math.random() < 0.4 ? PALETTE.emberGlow : PALETTE.magma,
          });
        }
        if (crossed(self, k, 0.62)) {
          burst(m.x, m.y, 40, { angle: 0, spread: 1.2, speed: 2.2, color: PALETTE.emberGlow, life: 700 });
          shake = 220;
          wash = { color: PALETTE.magma, alpha: 0.34, fade: 700, t: 0 };
        }
      },
      draw(ctx, view, k) {
        const m = geo?.mouth;
        if (!m || k < 0.55) return;
        // Flame licking out of the mouth, along the floor of the room.
        const reach = (1 - Math.abs(k - 0.7) / 0.3) * m.w * 2.2;
        if (reach <= 0) return;
        const s = geo.fs;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 6; i++) {
          const len = reach * (0.5 + Math.random() * 0.5);
          ctx.globalAlpha = 0.25 + Math.random() * 0.3;
          ctx.fillStyle = i % 2 ? PALETTE.magma : PALETTE.emberGlow;
          ctx.fillRect(m.x, m.y - i * s + Math.round((Math.random() - 0.5) * s * 4), len, s * 2);
        }
        ctx.restore();
      },
    },

    /** Cold light, and a room that has gone out. */
    runes: {
      ms: 2100,
      step(k, dt, self) {
        const a = geo?.anvil;
        if (!a) return;
        if (Math.random() < 0.4) {
          spark(a.x + (Math.random() - 0.5) * geo.fs * 14, a.y + geo.fs * 2, {
            angle: -Math.PI / 2,
            spread: 0.5,
            speed: 0.4,
            g: -0.00012,
            life: 1200,
            color: Math.random() < 0.5 ? PALETTE.astralLight : PALETTE.astral,
          });
        }
        if (crossed(self, k, 0.8)) {
          burst(a.x, a.y - geo.fs * 6, 34, { speed: 1.6, color: PALETTE.astralLight, g: 0.0001 });
          shake = 140;
          wash = { color: PALETTE.astralLight, alpha: 0.3, fade: 500, t: 0 };
        }
      },
      draw(ctx, view, k) {
        const a = geo?.anvil;
        if (!a) return;
        // Everything but the ring goes dark: the fire is still burning, it is
        // simply not what is lighting the room any more.
        ctx.fillStyle = `rgba(6, 4, 12, ${0.55 * Math.sin(Math.min(1, k * 1.6) * Math.PI)})`;
        ctx.fillRect(0, 0, view.w, view.h);

        const s = geo.fs;
        const cy = a.y - s * 8;
        const radius = s * 14 * (0.5 + Math.min(1, k * 2) * 0.5);
        const count = 12;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < count; i++) {
          const th = (i / count) * Math.PI * 2 + t / 420;
          const x = a.x + Math.cos(th) * radius;
          const y = cy + Math.sin(th) * radius * 0.42;
          const near = Math.sin(th) > 0;
          ctx.globalAlpha = (near ? 0.95 : 0.45) * Math.sin(Math.min(1, k * 1.3) * Math.PI);
          ctx.fillStyle = i % 3 === 0 ? PALETTE.astralLight : PALETTE.astral;
          // A glyph is three pixels in an L, not a dot: at this size that is
          // the difference between writing and a string of beads.
          ctx.fillRect(Math.round(x), Math.round(y), s, s * 2);
          ctx.fillRect(Math.round(x), Math.round(y + s * 2), s * 2, s);
        }
        ctx.restore();
        ctx.globalAlpha = 1;
      },
    },

    /** The roof opens. */
    nova: {
      ms: 2600,
      step(k, dt, self) {
        const a = geo?.anvil;
        if (!a) return;
        if (Math.random() < 0.85) {
          // Everything falls INTO the vortex rather than out of it, right up
          // until it goes off. A ritual whose particles only ever leave has
          // nothing being gathered.
          const th = Math.random() * Math.PI * 2;
          const r = geo.fs * (14 + Math.random() * 22);
          bits.push({
            x: a.x + Math.cos(th) * r,
            y: a.y - geo.fs * 10 + Math.sin(th) * r * 0.5,
            vx: -Math.cos(th) * 0.06,
            vy: -Math.sin(th) * 0.03,
            g: 0,
            drag: 1,
            life: 700,
            t: 0,
            size: Math.random() < 0.3 ? 2 : 1,
            color: pick([PALETTE.star, PALETTE.astralLight, PALETTE.purple, PALETTE.white]),
            kind: 'star',
          });
        }
        if (crossed(self, k, 0.72)) {
          burst(a.x, a.y - geo.fs * 10, 70, { speed: 2.6, color: PALETTE.white, g: 0.00008, life: 900 });
          burst(a.x, a.y - geo.fs * 10, 40, { speed: 1.8, color: PALETTE.purple, g: 0.00008, life: 1200 });
          shake = 320;
          wash = { color: PALETTE.white, alpha: 0.95, fade: 900, t: 0 };
        }
      },
      draw(ctx, view, k) {
        const a = geo?.anvil;
        if (!a) return;
        const s = geo.fs;
        const cx = a.x;
        const cy = a.y - s * 10;

        // The hole in the roof, opening.
        const open = Math.min(1, k / 0.4);
        ctx.fillStyle = `rgba(10, 4, 24, ${0.7 * open})`;
        ctx.fillRect(0, 0, view.w, view.h);

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        // The vortex: three counter-turning rings of pixels, tightening.
        const rings = 3;
        for (let r = 0; r < rings; r++) {
          const radius = s * (6 + r * 7) * (1 + Math.sin(t / 260 + r) * 0.06);
          const steps = 18 + r * 8;
          for (let i = 0; i < steps; i++) {
            const th = (i / steps) * Math.PI * 2 + (t / (300 + r * 160)) * (r % 2 ? -1 : 1);
            ctx.globalAlpha = (0.35 + 0.5 * Math.sin(th * 2 + t / 200)) * open;
            ctx.fillStyle = r === 0 ? PALETTE.white : r === 1 ? PALETTE.astralLight : PALETTE.purple;
            ctx.fillRect(
              Math.round(cx + Math.cos(th) * radius),
              Math.round(cy + Math.sin(th) * radius * 0.45),
              s,
              s,
            );
          }
        }

        // …and the beam it stands in, once it has gone off.
        if (k > 0.72) {
          const beam = 1 - (k - 0.72) / 0.28;
          ctx.globalAlpha = beam * 0.5;
          ctx.fillStyle = PALETTE.astralLight;
          ctx.fillRect(cx - s * 5, 0, s * 10, view.h);
          ctx.globalAlpha = beam * 0.25;
          ctx.fillStyle = PALETTE.white;
          ctx.fillRect(cx - s * 2, 0, s * 4, view.h);
        }
        ctx.restore();
        ctx.globalAlpha = 1;
      },
    },
  };

  /** True on the single frame a ritual's clock passes `beat`. */
  function crossed(self, k, beat) {
    if (k < beat || self.done.has(beat)) return false;
    self.done.add(beat);
    return true;
  }

  function pick(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  // -------------------------------------------------------------------------
  // The renderer
  // -------------------------------------------------------------------------

  return {
    /**
     * Start one of the six. Returns how long it runs for in milliseconds, so
     * the counter can wait exactly that long and no guess is written twice.
     * @param {string} id a key of RITUALS
     */
    playRitual(id) {
      const spec = RITUALS[id];
      if (!spec) return 0;
      ritual = { spec, t: 0, done: new Set() };
      return spec.ms;
    },

    /** True while a performance is still running. */
    isBusy() {
      return !!ritual;
    },

    update(dt) {
      t += dt;
      // Two beats a long way from a common multiple, plus whatever the bellows
      // are doing: the light in here never settles into a countable pulse.
      const breath = 0.5 + Math.sin(t / 1400) * 0.5;
      flicker = 0.82 + Math.sin(t / 170) * 0.08 + Math.sin(t / 47) * 0.05 + breath * 0.12 + draught * 0.5;
      draught *= 0.985;
      if (shake > 0) shake = Math.max(0, shake - dt);
      if (wash) {
        wash.t += dt;
        if (wash.t >= wash.fade) wash = null;
      }

      for (const m of motes) {
        m.x += m.vx * dt;
        m.y += m.vy * dt;
        if (m.y < -0.05) m.y = 1.05;
        if (m.x < -0.05) m.x = 1.05;
        if (m.x > 1.05) m.x = -0.05;
      }
      for (const f of flames) {
        f.life += f.speed * (1 + draught) * dt;
        if (f.life > 1) {
          f.life -= 1;
          f.height = 0.5 + ((Math.sin(t / 29 + f.x * 11) + 1) / 2) * (0.5 + draught * 0.5);
        }
      }
      for (const e of embers) {
        e.y -= e.speed * (1 + draught * 2) * dt;
        e.x += e.drift * dt;
        if (e.y < 0) {
          e.y = 1;
          e.x = 0.15 + ((Math.sin(t / 19 + e.speed * 8000) + 1) / 2) * 0.7;
        }
      }

      for (let i = bits.length - 1; i >= 0; i--) {
        const b = bits[i];
        b.t += dt;
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.vy += b.g * dt;
        if (b.drag !== 1) {
          b.vx *= b.drag;
          b.vy *= b.drag;
        }
        if (b.t >= b.life) bits.splice(i, 1);
      }

      if (ritual) {
        ritual.t += dt;
        const k = Math.min(1, ritual.t / ritual.spec.ms);
        if (ritual.spec.step) ritual.spec.step(k, dt, ritual);
        if (ritual.t >= ritual.spec.ms) ritual = null;
      }
    },

    render(ctx, view) {
      const s = view.scale;
      // Furniture in the near plane is drawn at twice the wall's scale, the
      // same depth cue the shop uses — and dropped back to one on a phone,
      // where there is no room for a near plane.
      const fs = view.w < 760 ? s : s * 2;
      const floorY = snap(view.h * FLOOR_AT, s);

      const amp = shake > 0 ? Math.min(5, shake / 40) : 0;
      ctx.save();
      if (amp) {
        ctx.translate(
          Math.round((Math.random() - 0.5) * amp * s),
          Math.round((Math.random() - 0.5) * amp * s),
        );
      }

      drawWall(ctx, view, s, floorY);
      drawFloor(ctx, view, s, floorY);

      // --- where everything stands ---------------------------------------
      const base = snap(view.h * 0.96, fs);
      const furnace = forgeSprite('furnace');
      const fx0 = snap(view.w * 0.015, fs);
      const fy0 = base - furnace.height * fs;

      geo = {
        fs,
        floorY,
        furnace: { x: fx0, y: fy0 },
        mouth: {
          x: fx0 + (FORGE_MOUTH.x + FORGE_MOUTH.w / 2) * fs,
          y: fy0 + (FORGE_MOUTH.y + FORGE_MOUTH.h) * fs,
          w: FORGE_MOUTH.w * fs,
          h: FORGE_MOUTH.h * fs,
        },
        anvil: { x: snap(view.w * 0.79, fs), y: base - 16 * fs },
        trough: { x: snap(view.w * 0.93, fs), y: base - 12 * fs },
      };

      // --- the far wall's furniture ---------------------------------------
      stand(ctx, 'toolrack', snap(view.w * 0.03, s), snap(view.h * 0.42, s), s);
      stand(ctx, 'gunrack', snap(view.w * 0.97, s) - 26 * s, snap(view.h * 0.4, s), s);
      stand(ctx, 'horseshoe', snap(view.w * 0.22, s), snap(view.h * 0.3, s), s);
      stand(ctx, 'horseshoe', snap(view.w * 0.86, s), snap(view.h * 0.22, s), s);

      // --- the fire, and the stack it burns in ----------------------------
      drawSprite(ctx, furnace, fx0, fy0, fs);
      drawFire(ctx, geo, s, fs, flames, embers, flicker, draught, t);

      // --- the floor of the workshop --------------------------------------
      const bellows = forgeSprite(Math.sin(t / 520) > 0 ? 'bellowsOpen' : 'bellowsShut');
      drawSprite(ctx, bellows, fx0 + furnace.width * fs - 2 * fs, fy0 + 10 * fs, fs);
      stand(ctx, 'coal', fx0 + furnace.width * fs + 4 * fs, base - 8 * fs, fs);
      stand(ctx, 'ingots', fx0 + 2 * fs, base - 8 * fs, fs);
      stand(ctx, 'grindstone', snap(view.w * 0.34, fs), base - 16 * fs, fs);

      drawSprite(ctx, forgeSprite('anvil'), geo.anvil.x - 10 * fs, geo.anvil.y, fs);
      drawSprite(ctx, forgeSprite('trough'), geo.trough.x - 8 * fs, geo.trough.y, fs);

      // The hammer, left leaning on the anvil whenever nobody is swinging it.
      if (!ritual || ritual.spec !== RITUALS.hammer) {
        ctx.save();
        ctx.translate(geo.anvil.x + 9 * fs, geo.anvil.y + 4 * fs);
        ctx.rotate(0.5);
        drawSprite(ctx, forgeSprite('hammer'), 0, 0, fs);
        ctx.restore();
      }

      drawMotes(ctx, view, s, motes, flicker);

      // --- everything a ritual is doing ------------------------------------
      if (ritual) {
        const k = Math.min(1, ritual.t / ritual.spec.ms);
        if (ritual.spec.draw) ritual.spec.draw(ctx, view, k);
      }
      drawBits(ctx, s);

      ctx.restore();

      // The wash and the vignette are the last two things over the frame, and
      // neither of them shakes: a flash that moves with the camera reads as a
      // sheet of paper being waved rather than as light in the room.
      if (wash) {
        ctx.globalAlpha = wash.alpha * (1 - wash.t / wash.fade);
        ctx.fillStyle = wash.color;
        ctx.fillRect(0, 0, view.w, view.h);
        ctx.globalAlpha = 1;
      }
      drawVignette(ctx, view);
    },
  };

  function drawBits(ctx, s) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const b of bits) {
      const k = b.t / b.life;
      const unit = Math.max(1, Math.round(s * b.size));
      if (b.kind === 'smoke') {
        // Steam swells and thins; it is the one thing in the bag that gets
        // bigger as it dies.
        ctx.globalAlpha = 0.4 * (1 - k);
        ctx.fillStyle = b.color;
        const size = unit * (1 + k * 3);
        ctx.fillRect(Math.round(b.x - size / 2), Math.round(b.y - size / 2), size, size);
      } else if (b.kind === 'star') {
        ctx.globalAlpha = 0.35 + Math.abs(Math.sin(b.t / 90)) * 0.65;
        ctx.fillStyle = b.color;
        ctx.fillRect(Math.round(b.x), Math.round(b.y), unit, unit);
      } else {
        ctx.globalAlpha = Math.max(0, 1 - k);
        ctx.fillStyle = b.color;
        const size = Math.max(1, Math.round(unit * (1 - k * 0.6)));
        ctx.fillRect(Math.round(b.x), Math.round(b.y), size, size);
      }
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }
}

// ---------------------------------------------------------------------------
// The shell of the room
// ---------------------------------------------------------------------------

function snap(v, s) {
  return Math.round(v / s) * s;
}

/** Draw a sprite by its top-left corner, skipping anything that is missing. */
function stand(ctx, name, x, y, s) {
  const sprite = forgeSprite(name);
  if (!sprite) return;
  drawSprite(ctx, sprite, x, y, s);
}

/**
 * Sooted vertical boards over a course of stone, with the smoke stain climbing
 * the wall behind where the fire is. A workshop wall is not a clean wall.
 */
function drawWall(ctx, view, s, floorY) {
  ctx.fillStyle = PALETTE.woodDeep;
  ctx.fillRect(0, 0, view.w, floorY);

  const board = 9 * s;
  for (let x = 0; x < view.w; x += board) {
    const step = Math.floor(x / board) % 3;
    ctx.fillStyle = step === 0 ? PALETTE.woodDeep : step === 1 ? PALETTE.woodDark : PALETTE.charLight;
    ctx.fillRect(x, 0, board - s, floorY);
    ctx.fillStyle = PALETTE.shadow;
    ctx.fillRect(x + board - s, 0, s, floorY);
  }

  // Roof beams: this is a shed, and you can see what is holding it up.
  ctx.fillStyle = PALETTE.woodDeep;
  ctx.fillRect(0, 0, view.w, 4 * s);
  ctx.fillStyle = PALETTE.shadow;
  ctx.fillRect(0, 4 * s, view.w, s);
  const bay = 30 * s;
  for (let x = bay / 2; x < view.w; x += bay) {
    ctx.fillStyle = PALETTE.woodDark;
    ctx.fillRect(snap(x, s), 0, 4 * s, 9 * s);
    ctx.fillStyle = PALETTE.shadow;
    ctx.fillRect(snap(x, s) + 4 * s, 0, s, 9 * s);
  }

  // The stain the chimney has left over thirty years of this.
  const g = ctx.createLinearGradient(0, 0, 0, floorY);
  g.addColorStop(0, 'rgba(0, 0, 0, 0.55)');
  g.addColorStop(0.6, 'rgba(0, 0, 0, 0.12)');
  g.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, view.w * 0.42, floorY);
}

/** A flagged stone floor, the courses growing towards the camera. */
function drawFloor(ctx, view, s, floorY) {
  ctx.fillStyle = PALETTE.charDark;
  ctx.fillRect(0, floorY, view.w, view.h - floorY);

  let y = floorY;
  let h = 3 * s;
  let i = 0;
  while (y < view.h) {
    ctx.fillStyle = i % 2 === 0 ? PALETTE.char : PALETTE.charLight;
    ctx.fillRect(0, y, view.w, h - s);
    ctx.fillStyle = PALETTE.shadow;
    ctx.fillRect(0, y + h - s, view.w, s);
    // The joints between flags, offset course by course.
    for (let x = ((i % 2) * 14 + 6) * s; x < view.w; x += 28 * s) {
      ctx.fillRect(snap(x, s), y, s, h - s);
    }
    y += h;
    h += s;
    i += 1;
  }

  ctx.fillStyle = PALETTE.shadow;
  ctx.fillRect(0, floorY - s, view.w, 2 * s);
}

/**
 * The fire in the furnace mouth, and everything it lights.
 *
 * Clipped to the hole, so a tongue can be as tall as it likes and the stone
 * still wins — the same contract the inn's hearth is drawn under.
 */
function drawFire(ctx, geo, s, fs, flames, embers, flicker, draught, t) {
  const { x: mx, y: my, w, h } = geo.mouth;
  const left = mx - w / 2;

  ctx.save();
  ctx.beginPath();
  ctx.rect(left, my - h, w, h);
  ctx.clip();

  // The coal bed. It is banked at the back and burnt through in the middle,
  // which is where the tongues come from.
  ctx.fillStyle = PALETTE.charDark;
  ctx.fillRect(left, my - 4 * s, w, 4 * s);
  ctx.fillStyle = PALETTE.magmaDeep;
  ctx.fillRect(left + 2 * s, my - 3 * s, w - 4 * s, 3 * s);
  ctx.fillStyle = flicker > 1 ? PALETTE.emberGlow : PALETTE.magma;
  ctx.fillRect(left + 4 * s, my - 2 * s, w - 8 * s, 2 * s);

  for (const f of flames) {
    const rise = f.life;
    const th = Math.max(s, snap(h * f.height * (1 - rise * 0.45) * (0.7 + draught * 0.6), s));
    const x = snap(left + f.x * w, s);
    const fw = Math.max(s, snap(3 * s * (1 - rise * 0.5), s));
    ctx.fillStyle = PALETTE.magmaDeep;
    ctx.fillRect(x - fw, my - th, fw * 2, th);
    ctx.fillStyle = PALETTE.magma;
    ctx.fillRect(x - Math.max(s, fw - s), my - th + 2 * s, Math.max(s, fw - s) * 2, th - 2 * s);
    ctx.fillStyle = PALETTE.emberGlow;
    ctx.fillRect(x - Math.round(fw / 2 / s) * s, my - th + 4 * s, Math.max(s, fw), Math.max(s, th - 5 * s));
  }

  ctx.fillStyle = PALETTE.emberGlow;
  for (const e of embers) {
    ctx.globalAlpha = 0.35 + e.y * 0.5;
    ctx.fillRect(snap(left + e.x * w, s), snap(my - (1 - e.y) * h, s), s, s);
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  // What the fire does to the room. Three pools at three strengths: the mouth
  // itself, the floor in front of it, and a long throw across to the anvil, so
  // the far side of the workshop is lit by the near side of it.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  pool(ctx, mx, my - h / 2, Math.max(w, h) * 2.4,
    `rgba(255, 170, 70, ${0.34 * flicker})`, `rgba(200, 80, 20, ${0.12 * flicker})`);
  pool(ctx, mx, geo.floorY + fs * 2, Math.max(w, h) * 1.6,
    `rgba(255, 140, 50, ${0.16 * flicker})`, `rgba(180, 60, 10, ${0.06 * flicker})`);
  pool(ctx, geo.anvil.x, geo.anvil.y + fs * 4, Math.max(w, h) * 1.5,
    `rgba(255, 160, 60, ${0.1 * flicker})`, `rgba(160, 60, 10, ${0.04 * flicker})`);
  ctx.restore();
}

function pool(ctx, x, y, radius, inner, outer) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, Math.max(1, radius));
  g.addColorStop(0, inner);
  g.addColorStop(0.5, outer);
  g.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
}

function drawMotes(ctx, view, s, motes, flicker) {
  ctx.fillStyle = PALETTE.emberGlow;
  for (const m of motes) {
    ctx.globalAlpha = m.a * flicker * 0.8;
    ctx.fillRect(snap(m.x * view.w, s), snap(m.y * view.h, s), s, s);
  }
  ctx.globalAlpha = 1;
}

/** Heaviest where the counter sits, so the cards read against the workshop. */
function drawVignette(ctx, view) {
  const g = ctx.createRadialGradient(
    view.w / 2, view.h / 2, Math.min(view.w, view.h) * 0.1,
    view.w / 2, view.h / 2, Math.max(view.w, view.h) * 0.75,
  );
  g.addColorStop(0, 'rgba(8, 4, 2, 0.6)');
  g.addColorStop(0.55, 'rgba(8, 4, 2, 0.34)');
  g.addColorStop(1, 'rgba(8, 4, 2, 0.76)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, view.w, view.h);
}
