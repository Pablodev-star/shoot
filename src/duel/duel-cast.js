/**
 * SHOOT! — Ability casts: the performance, not the paint.
 *
 * WHAT THIS REPLACED
 * ---------------------------------------------------------------------------
 * Every themed ability used to be twenty-six coloured squares moving in one of
 * six ways. It was the right first version — it made a hornet sting and an
 * ember bite different to watch, which is what the abilities were for — and it
 * had one thing wrong with it that no amount of extra particles was going to
 * fix: NOTHING EVER ARRIVED. A stick of dynamite is not a burst of orange, it
 * is an object somebody throws at somebody else, and the whole reason it is
 * frightening is that it lands, sits there with the fuse going, and then goes
 * off.
 *
 * So a cast is a PERFORMANCE now, and it is made of two things:
 *
 *   props  objects, drawn from src/art/sprites-casts.js, that fly across the
 *          road on a path, arrive somewhere on a fighter, and do something when
 *          they get there
 *   motes  the particles, which are still here and still do the six motions —
 *          demoted to what they always should have been, the dust an object
 *          kicks up rather than the event itself
 *
 * A PROP CAN OUTLIVE THE ROUND THAT THREW IT
 * ---------------------------------------------------------------------------
 * The dynamite is the reason this module exists rather than another hundred
 * lines in the scene. `fuse: true` makes a prop STICK where it lands and burn
 * until somebody tells it what happened — `detonate(side, { stopped })`, which
 * the duel screen calls when the engine resolves the blast against whatever the
 * victim actually did. Between those two moments the stick is lying at their
 * boots sputtering, which is exactly the shape of the rule: the biggest hit in
 * the game, and the one you get a whole round to be ready for.
 *
 * Nothing in here decides anything. It is told what happened and it shows it.
 */

import { drawSprite } from '../art/pixel.js';
import { getCastProp } from '../art/sprites-casts.js';
import { PALETTE } from '../art/palette.js';
import { play } from '../core/audio.js';

/** Source-pixel size of a fighter — everything below is aimed in these. */
const FIGHTER_W = 16;
const FIGHTER_H = 24;

/**
 * Where on a fighter a prop can be aimed, in that fighter's own source pixels.
 * Mirrored automatically for the duellist facing left, so `gun` is the hand
 * holding the revolver on both sides of the road.
 */
const AIM = {
  feet: [8, 23],
  /** The road just in front of their boots, on the side the road came from. */
  front: [13, 23],
  belt: [8, 17],
  chest: [8, 13],
  face: [8, 5],
  head: [8, 2],
  gun: [12, 14],
  crown: [8, -4],
};

/** How long a fuse burns with nobody telling it anything before it gives up. */
const FUSE_LIMIT = 9000;

/**
 * @param {object} world how to read the scene this is playing in
 * @param {(side: string) => object} world.layoutOf `{originX, topY, fs, flip}`
 * @param {() => number} world.groundY the walk line, in device pixels
 * @param {() => number} world.unit the scene's own pixel (view.scale)
 * @param {(ms: number) => void} world.shake
 */
export function createCastFx(world) {
  /** Objects in flight, or landed and waiting. */
  const props = [];
  /** Particles. The old spell system, kept and improved. */
  const motes = [];

  // --- geometry -------------------------------------------------------------

  /** A point on a fighter, in device pixels, honouring the mirror. */
  function pointOf(side, aim) {
    const L = world.layoutOf(side);
    if (!L) return null;
    const [sx, sy] = AIM[aim] || AIM.chest;
    const x = L.flip ? L.originX + (FIGHTER_W - sx) * L.fs : L.originX + sx * L.fs;
    return { x, y: L.topY + sy * L.fs, fs: L.fs, flip: L.flip };
  }

  const other = (side) => (side === 'player' ? 'enemy' : 'player');

  // --- the motes ------------------------------------------------------------

  /**
   * The six motions the first version had, plus one.
   *
   *   streak  off the caster, across the road, into the target
   *   swarm   converging on the target from all sides, wandering
   *   fall    down out of the sky onto them
   *   rise    up out of the ground under them
   *   burst   outwards from the middle of them
   *   spiral  winding into their head
   *   sweep   straight across the whole fighter at speed — weather, not aim
   */
  function spawnMotes(cast, side, casterSide) {
    const L = world.layoutOf(side);
    const from = world.layoutOf(casterSide);
    if (!L) return;
    const cx = L.originX + FIGHTER_W * L.fs * 0.5;
    const cy = L.topY + 12 * L.fs;
    const head = L.topY + 4 * L.fs;
    const unit = world.unit();
    const ground = world.groundY();
    const count = cast.count || 26;
    const colors = cast.colors || [PALETTE.white];

    for (let i = 0; i < count; i++) {
      const color = colors[i % colors.length];
      const size = Math.max(1, Math.round(unit * (Math.random() < 0.25 ? 1.6 : 0.9)));
      const base = {
        color,
        size,
        t: -i * 12 - (cast.delay || 0),
        life: 620 + Math.random() * 320,
        motion: cast.motion,
        glow: cast.glow !== false,
      };
      const angle = (i / count) * Math.PI * 2;

      switch (cast.motion) {
        case 'streak': {
          const fx0 = from ? from.originX + FIGHTER_W * from.fs * 0.5 : cx;
          const fy0 = from ? from.topY + (8 + Math.random() * 8) * from.fs : cy;
          motes.push({
            ...base,
            x: fx0,
            y: fy0,
            vx: (cx - fx0) / 420,
            vy: (cy - fy0) / 420 + (Math.random() - 0.5) * 0.05,
            life: 520,
            tail: true,
          });
          break;
        }
        case 'swarm': {
          const r = L.fs * (8 + Math.random() * 10);
          motes.push({
            ...base,
            x: cx + Math.cos(angle) * r,
            y: cy + Math.sin(angle) * r * 0.8,
            tx: cx,
            ty: cy,
            wobble: 90 + Math.random() * 160,
            amp: unit * 2,
            life: 900 + Math.random() * 300,
          });
          break;
        }
        case 'fall':
          motes.push({
            ...base,
            x: cx + (Math.random() - 0.5) * FIGHTER_W * L.fs * 1.6,
            y: L.topY - L.fs * (6 + Math.random() * 24),
            vx: (Math.random() - 0.5) * 0.02,
            vy: 0.35 + Math.random() * 0.3,
            g: 0.0006,
            life: 700,
            tail: true,
          });
          break;
        case 'rise':
          motes.push({
            ...base,
            x: cx + (Math.random() - 0.5) * FIGHTER_W * L.fs * 1.3,
            y: ground - Math.random() * L.fs,
            vx: (Math.random() - 0.5) * 0.03,
            vy: -(0.12 + Math.random() * 0.18),
            g: 0.00004,
            life: 780 + Math.random() * 300,
          });
          break;
        case 'spiral':
          motes.push({
            ...base,
            x: cx,
            y: head,
            tx: cx,
            ty: head,
            angle,
            r: L.fs * (7 + Math.random() * 4),
            spin: 0.006 + Math.random() * 0.004,
            life: 820,
          });
          break;
        case 'sweep': {
          // Weather, not aim: it starts off the caster's shoulder of the frame
          // and goes straight past the target without ever slowing down.
          const dir = from && from.originX > L.originX ? -1 : 1;
          motes.push({
            ...base,
            x: cx - dir * FIGHTER_W * L.fs * (1.6 + Math.random() * 1.4),
            y: L.topY + Math.random() * FIGHTER_H * L.fs,
            vx: dir * (0.5 + Math.random() * 0.5),
            vy: (Math.random() - 0.5) * 0.04,
            life: 620 + Math.random() * 260,
            tail: true,
          });
          break;
        }
        default:
          motes.push({
            ...base,
            x: cx,
            y: cy,
            vx: Math.cos(angle) * (0.1 + Math.random() * 0.28),
            vy: Math.sin(angle) * (0.1 + Math.random() * 0.28) - 0.05,
            g: 0.0003,
            life: 560,
          });
      }
    }
  }

  /**
   * The dust an object kicks up when it gets somewhere. Same particles, thrown
   * from a point rather than around a fighter.
   */
  function spawnBurst(spec, x, y) {
    if (!spec) return;
    const unit = world.unit();
    const colors = spec.colors || [PALETTE.sandLight];
    const n = spec.count || 14;
    const speed = spec.speed || 0.22;
    for (let i = 0; i < n; i++) {
      const a = spec.up
        ? -Math.PI / 2 + (Math.random() - 0.5) * (spec.spread || 1.6)
        : Math.random() * Math.PI * 2;
      const v = speed * (0.35 + Math.random());
      motes.push({
        motion: 'burst',
        color: colors[i % colors.length],
        size: Math.max(1, Math.round(unit * (Math.random() < 0.3 ? 1.7 : 1))),
        x,
        y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        g: spec.gravity ?? 0.0004,
        t: 0,
        life: spec.life || 520,
        glow: true,
      });
    }
  }

  function stepMotes(dt) {
    for (let i = motes.length - 1; i >= 0; i--) {
      const p = motes[i];
      p.t += dt;
      if (p.t < 0) continue;
      if (p.motion === 'swarm') {
        p.x += (p.tx - p.x) * Math.min(1, dt / 320) + Math.sin(p.t / p.wobble) * 0.06 * p.amp;
        p.y += (p.ty - p.y) * Math.min(1, dt / 320) + Math.cos(p.t / p.wobble) * 0.06 * p.amp;
      } else if (p.motion === 'spiral') {
        p.angle += p.spin * dt;
        p.r = Math.max(0, p.r - dt * 0.012);
        p.x = p.tx + Math.cos(p.angle) * p.r;
        p.y = p.ty + Math.sin(p.angle) * p.r * 0.5;
      } else {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.g) p.vy += p.g * dt;
      }
      if (p.t >= p.life) motes.splice(i, 1);
    }
  }

  /**
   * A mote is three blocks now, not one: a soft dark pad under it, the colour,
   * and a bright pixel in the middle of the big ones. It costs two fills and it
   * is the difference between a particle and a stray rectangle — the pad gives
   * it an edge against the road, and the core gives it a light of its own.
   */
  function drawMotes(ctx) {
    for (const p of motes) {
      if (p.t < 0) continue;
      const k = 1 - p.t / p.life;
      if (k <= 0) continue;
      const x = Math.round(p.x);
      const y = Math.round(p.y);
      const size = Math.max(1, Math.round(p.size * (0.45 + k * 0.55)));
      if (p.glow !== false) {
        ctx.globalAlpha = Math.max(0, k * 0.28);
        ctx.fillStyle = PALETTE.shadow;
        ctx.fillRect(x - size, y - size, size * 3, size * 3);
      }
      // The tail on anything travelling in a straight line: three shortening
      // steps behind it, which is what makes a streak a streak.
      if (p.tail && (p.vx || p.vy)) {
        const len = Math.hypot(p.vx, p.vy) || 1;
        const ux = (p.vx / len) * size * 1.6;
        const uy = (p.vy / len) * size * 1.6;
        for (let i = 1; i <= 3; i++) {
          ctx.globalAlpha = Math.max(0, (k * 0.4) / i);
          ctx.fillStyle = p.color;
          ctx.fillRect(
            Math.round(x - ux * i),
            Math.round(y - uy * i),
            Math.max(1, size - i),
            Math.max(1, size - i),
          );
        }
      }
      ctx.globalAlpha = Math.max(0, Math.min(1, k * 1.6));
      ctx.fillStyle = p.color;
      ctx.fillRect(x, y, size, size);
      if (size > 2) {
        ctx.globalAlpha = Math.max(0, k * 0.7);
        ctx.fillStyle = PALETTE.white;
        ctx.fillRect(x, y, Math.max(1, size - 2), Math.max(1, size - 2));
      }
    }
    ctx.globalAlpha = 1;
  }

  // --- the props ------------------------------------------------------------

  /**
   * One object, staged.
   *
   * `path` is the whole vocabulary, and it is short on purpose — six ways for a
   * thing to arrive covers every ability in the game:
   *
   *   throw   out of the caster's hand in an arc, landing on the target
   *   fly     straight across the road, fast, caster to target
   *   drop    down out of the sky onto them
   *   rise    up out of the ground under them
   *   hold    it is simply THERE, on them, for a while
   *   return  off the target and back to the caster — a thing being taken
   *   toss    off the target and away, landing on the road — a thing being lost
   */
  function spawnProp(spec, side, casterSide) {
    const art = getCastProp(spec.art);
    if (!art) return;
    const target = pointOf(side, spec.to || 'chest');
    const caster = pointOf(casterSide, spec.from || 'gun');
    if (!target || !caster) return;

    const L = world.layoutOf(side);
    const scale = Math.max(1, Math.round(L.fs * (spec.scale || 1)));
    const unit = world.unit();
    const path = spec.path || 'fly';
    const jitter = spec.spread ? (Math.random() - 0.5) * spec.spread * L.fs : 0;

    let sx = caster.x;
    let sy = caster.y;
    let tx = target.x + jitter;
    let ty = target.y;

    if (path === 'drop') {
      sx = tx + (Math.random() - 0.5) * unit * 14;
      sy = -unit * (12 + Math.random() * 20);
    } else if (path === 'rise') {
      sx = tx;
      sy = world.groundY() + L.fs * 4;
    } else if (path === 'hold') {
      sx = tx;
      sy = ty;
    } else if (path === 'return') {
      sx = target.x;
      sy = target.y;
      const back = pointOf(casterSide, spec.to2 || 'gun');
      tx = back.x;
      ty = back.y;
    } else if (path === 'toss') {
      // Knocked out of them and gone: away from whoever did it, and down onto
      // the road. A stolen round that nobody catches is a round on the floor.
      sx = target.x;
      sy = target.y;
      const away = Math.sign(target.x - caster.x) || 1;
      tx = target.x + away * FIGHTER_W * L.fs * 0.9;
      ty = world.groundY();
    }

    props.push({
      side,
      casterSide,
      art,
      spec,
      scale,
      path,
      sx,
      sy,
      tx,
      ty,
      x: sx,
      y: sy,
      t: -(spec.delay || 0),
      travel: path === 'hold' ? 0 : spec.ms || 380,
      hold: spec.hold ?? (path === 'hold' ? 600 : 0),
      fade: spec.fade ?? 220,
      arc: (spec.arc ?? (path === 'throw' || path === 'toss' ? 9 : 0)) * L.fs,
      spin: spec.spin || 0,
      grow: !!spec.grow,
      tether: spec.tether || null,
      trail: spec.trail || null,
      fuse: !!spec.fuse,
      phase: 'travel',
      phaseT: 0,
      trailAt: 0,
      /** Set by `detonate`; until then a fuse just burns. */
      outcome: null,
      /** A beat on the ground before an outcome that arrived early spends it. */
      grace: 0,
    });
  }

  /** Where a prop is right now, and which of its frames is up. */
  function frameOf(p) {
    const n = p.art.frames.length;
    if (n === 1) return p.art.frames[0];
    if (p.spin) {
      // A thing that tumbles through the air STOPS tumbling when it lands: it
      // comes to rest on whichever frame the art says is its flat one.
      if (p.phase === 'travel') return p.art.frames[Math.floor(Math.max(0, p.t) / p.spin) % n];
      return p.art.frames[Math.min(n - 1, p.spec.rest ?? 0)];
    }
    if (p.grow) {
      const span = p.travel + p.hold;
      const k = span > 0 ? Math.min(1, Math.max(0, p.t) / span) : 1;
      return p.art.frames[Math.min(n - 1, Math.floor(k * n))];
    }
    return p.phase === 'travel' ? p.art.frames[0] : p.art.frames[n - 1];
  }

  /** A prop getting where it was going. */
  function arrive(p) {
    spawnBurst(p.spec.burst, p.x, p.y);
    if (p.spec.shake) world.shake(p.spec.shake);
    if (p.spec.sfx) play(p.spec.sfx);
    if (p.fuse) {
      p.phase = 'fuse';
      p.phaseT = 0;
      /**
       * The round can resolve while the stick is still in the air.
       *
       * The engine plays a whole round out before the screen animates any of
       * it, so the blast is reported at almost exactly the moment the throw
       * ends — and a dropped frame, a backgrounded tab or a rounding of the
       * timer either way decides which of the two happens first. If the answer
       * got here first it is waiting in `outcome`, and the stick gets a beat on
       * the ground to be seen landing and then goes off with it. Dropping it
       * instead is what would leave a live stick burning into the next round.
       */
      if (p.outcome) p.grace = 140;
      return;
    }
    p.phase = p.hold > 0 ? 'hold' : 'fade';
    p.phaseT = 0;
  }

  /**
   * THE STICK GOING OFF.
   *
   * `stopped` is the engine's word, not ours: a shield that went up in time
   * eats the blast, and the difference on screen is a grey smother against the
   * plate instead of a fireball in somebody's chest. Both leave the road shaken
   * — a stopped stick still went off.
   */
  function blow(p, stopped) {
    const art = getCastProp(stopped ? 'smother' : 'blast');
    const L = world.layoutOf(p.side);
    if (art && L) {
      props.push({
        side: p.side,
        casterSide: p.casterSide,
        art,
        spec: { alphaTaper: 0.55 },
        scale: Math.max(1, Math.round(L.fs * (stopped ? 0.5 : 0.75))),
        path: 'hold',
        sx: p.x,
        sy: p.y - L.fs * 2,
        tx: p.x,
        ty: p.y - L.fs * 2,
        x: p.x,
        y: p.y - L.fs * 2,
        t: 0,
        travel: 0,
        hold: stopped ? 360 : 540,
        fade: 200,
        arc: 0,
        spin: 0,
        grow: true,
        tether: null,
        trail: null,
        fuse: false,
        phase: 'hold',
        phaseT: 0,
        trailAt: 0,
        outcome: null,
      });
    }
    spawnBurst(
      stopped
        ? { colors: [PALETTE.bone, PALETTE.grey, PALETTE.greyDark], count: 16, speed: 0.2 }
        : { colors: [PALETTE.goldLight, PALETTE.magma, PALETTE.charDark], count: 34, speed: 0.4 },
      p.x,
      p.y,
    );
    world.shake(stopped ? 240 : 620);
    play(stopped ? 'shield' : 'thunder');
    p.phase = 'gone';
  }

  function stepProps(dt) {
    for (let i = props.length - 1; i >= 0; i--) {
      const p = props[i];
      p.t += dt;
      if (p.t < 0) continue;
      p.phaseT += dt;

      if (p.phase === 'travel') {
        const k = p.travel > 0 ? Math.min(1, p.t / p.travel) : 1;
        p.x = p.sx + (p.tx - p.sx) * k;
        p.y = p.sy + (p.ty - p.sy) * k - Math.sin(k * Math.PI) * p.arc;
        // A trail is spawned along the flight rather than at the ends, so the
        // fuse on a thrown stick draws the arc it actually travelled.
        if (p.trail) {
          p.trailAt -= dt;
          if (p.trailAt <= 0) {
            p.trailAt = 26;
            spawnBurst({ colors: p.trail, count: 1, speed: 0.03, gravity: 0.00006, life: 380 }, p.x, p.y);
          }
        }
        if (k >= 1) arrive(p);
      } else if (p.phase === 'fuse') {
        // Sputtering where it landed. One spark every other frame, and it does
        // not go out until the round it belongs to has resolved.
        p.trailAt -= dt;
        if (p.trailAt <= 0) {
          p.trailAt = 60;
          spawnBurst(
            { colors: [PALETTE.goldLight, PALETTE.white], count: 2, speed: 0.06, up: true, life: 300 },
            p.x,
            p.y - p.scale * 4,
          );
        }
        // It goes off when it has been told how it went, and on its own if it
        // never is — a fight that ended around it, a screen that was left.
        if (p.outcome && p.phaseT >= (p.grace || 0)) blow(p, p.outcome.stopped);
        else if (p.phaseT > FUSE_LIMIT) blow(p, true);
      } else if (p.phase === 'hold') {
        if (p.spec.float) p.y -= p.spec.float * dt;
        if (p.phaseT >= p.hold) {
          p.phase = 'fade';
          p.phaseT = 0;
        }
      } else if (p.phase === 'fade') {
        if (p.phaseT >= p.fade) p.phase = 'gone';
      }

      if (p.phase === 'gone') props.splice(i, 1);
    }
  }

  function drawProps(ctx) {
    for (const p of props) {
      if (p.t < 0) continue;
      const frame = frameOf(p);
      if (!frame) continue;
      let alpha =
        p.phase === 'fade'
          ? Math.max(0, 1 - p.phaseT / p.fade)
          : Math.min(1, Math.max(0.15, p.t / 90));
      // `alphaTaper` thins a prop as it plays out rather than at the end of it.
      // Smoke is the case it exists for: a fireball's last frames are the size
      // of a man, and at full opacity they are a grey wall with a duel behind
      // them instead of something clearing.
      if (p.spec.alphaTaper && p.hold > 0) {
        alpha *= 1 - p.spec.alphaTaper * Math.min(1, p.phaseT / p.hold);
      }
      ctx.globalAlpha = alpha * (p.spec.alpha ?? 1);

      // The rope, drawn from the hand that is holding it to wherever the loop
      // has got to. It is the only line in the file and it earns its place:
      // a lasso with no rope on it is a hoop somebody threw.
      if (p.tether && p.phase !== 'gone') {
        const hand = pointOf(p.casterSide, 'gun');
        if (hand) {
          const unit = Math.max(1, world.unit());
          // One block per unit of distance, so the rope is a rope rather than a
          // dotted line: a fixed step count spaces them thirty pixels apart on
          // a wide screen and reads as a row of crumbs.
          const steps = Math.max(8, Math.round(Math.hypot(p.x - hand.x, p.y - hand.y) / unit));
          ctx.fillStyle = p.tether;
          for (let i = 0; i <= steps; i++) {
            const k = i / steps;
            const lx = hand.x + (p.x - hand.x) * k;
            const ly = hand.y + (p.y - hand.y) * k + Math.sin(k * Math.PI) * unit * 4;
            ctx.fillRect(Math.round(lx), Math.round(ly), unit, Math.max(1, Math.round(unit * 0.8)));
          }
        }
      }

      // Anything with a nose on it turns to face the way it is going, so a
      // meteor and a stolen round never fly backwards.
      const flip = p.spec.faceTravel ? p.tx < p.sx : !!p.spec.flip;
      drawSprite(
        ctx,
        frame,
        p.x - p.art.anchor[0] * p.scale,
        p.y - p.art.anchor[1] * p.scale,
        p.scale,
        flip,
      );
      ctx.globalAlpha = 1;
    }
  }

  // --- the interface the scene uses ----------------------------------------

  return {
    /**
     * Play one ability over the fighter it landed on.
     *
     * @param {object} cast the ability's `fx` block (src/game/world-abilities.js)
     * @param {'player'|'enemy'} side who it is landing on
     */
    play(cast, side) {
      if (!cast || !world.layoutOf(side)) return;
      // A self-buff is cast BY the fighter it lands on, so anything thrown for
      // it comes off his own hand rather than out of the man opposite.
      const casterSide = cast.self ? side : other(side);
      if (cast.motion) spawnMotes(cast, side, casterSide);
      for (const spec of cast.props || []) {
        const copies = spec.count || 1;
        for (let i = 0; i < copies; i++) {
          spawnProp({ ...spec, delay: (spec.delay || 0) + i * (spec.stagger || 90) }, side, casterSide);
        }
      }
      if (cast.shake) world.shake(cast.shake);
    },

    update(dt) {
      stepProps(dt);
      stepMotes(dt);
    },

    draw(ctx) {
      drawProps(ctx);
      drawMotes(ctx);
    },

    /**
     * Tell whatever is burning on this fighter how it went.
     * @param {'player'|'enemy'} side the fighter the charge is lying at
     * @param {{stopped?: boolean}} outcome
     */
    detonate(side, { stopped = false } = {}) {
      let found = false;
      for (const p of props) {
        // Anything of this fighter's that is fused counts, INCLUDING one still
        // in the air: the answer is recorded on the prop and `arrive` spends
        // it. Matching only the ones already on the ground is a race the round
        // wins about half the time, and the loser is a stick that never learns
        // what happened to it.
        if (p.side === side && p.fuse && (p.phase === 'travel' || p.phase === 'fuse')) {
          p.outcome = { stopped };
          if (p.phase === 'fuse') blow(p, stopped);
          found = true;
        }
      }
      return found;
    },

    /** Everything off the road at once — the fight is over or was left. */
    clear() {
      props.length = 0;
      motes.length = 0;
    },
  };
}
