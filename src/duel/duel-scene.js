/**
 * SHOOT! — Duel backdrop & fighter rendering (Block 5b).
 *
 * Draws the two duellists facing each other on the road, and everything a
 * round throws off: the draw, the muzzle flash, the tracer, the spent brass,
 * the powder smoke, the shield shimmer, the hit spark and the camera shake.
 *
 * THE SHOT IS A SEQUENCE, NOT A FRAME
 * ---------------------------------------------------------------------------
 * A duellist used to snap to a "gun out" pose and a yellow rectangle used to
 * appear beside him for two frames. Both halves of that were the same mistake:
 * a gunfight is the one thing this game is about, and it was being drawn as a
 * state change.
 *
 * What happens now, per shot, is a timeline:
 *
 *   the draw    hand to the holster, barrel out of leather, arm up, levelled
 *               — four poses, 130ms apart, so the player watches the gun come
 *                 up instead of finding it already up
 *   the shot    the gun driven back into the fist and the flash blooming off
 *                 the muzzle, on the same frame
 *   the kick    muzzle thrown over the shoulder, brass out of the cylinder,
 *                 powder smoke hanging where the flash was
 *   the recover the arm dropping back onto the line
 *
 * The tracer leaves the muzzle it was actually fired from — `muzzleOf` reads
 * the gun's own anchor for whichever pose is up — so the bullet and the flash
 * can never disagree about where the barrel is.
 *
 * The screen sets poses and calls `fire()`; it never positions anything.
 *
 * THERE IS A CAMERA
 * ---------------------------------------------------------------------------
 * The scene can be looked at from anywhere: `lookAt({ side, x, y, fill })`
 * frames a point of a fighter — in that fighter's own source pixels — and says
 * how many of those pixels should fill the height of the screen. Six is an
 * extreme close-up of a pair of eyes; thirteen is a head; no camera at all is
 * the two of them on the road.
 *
 * It moves the WHOLE scene, not the fighter: the road, the ridges, the sky and
 * the weather all magnify together, because the entire point of a close-up in
 * a western is that it is a close-up *of somewhere*. A cut-scene that draws a
 * face on a black card is a menu with a portrait in it — this is the same
 * duel, seen from four inches away.
 *
 * The transform is applied around everything the world contains and dropped
 * before the weather and the interface, so rain stays rain-sized and a letter
 * stays a letter. The camera is clamped so the visible rectangle never leaves
 * the drawn world, which is what stops a hard zoom from showing the edge of
 * the sky.
 *
 * AND A FEW THINGS THAT ONLY THE LAST FIGHT USES
 * ---------------------------------------------------------------------------
 * The letterbox, the black veil, the name card, the impact frames, the speed
 * lines and the shockwave all live in `fx` alongside the shake, because they
 * are the same kind of thing: whole-frame effects a screen turns on. They are
 * drawn in screen space after the camera is dropped.
 *
 * So is the AURA — the purple fire and the sparks the Stranger carries. That
 * one is not a cut-scene effect at all: it burns for the whole fight, and it
 * doubles when he takes the cowl off.
 *
 * AND THE WORLD CAN JOIN IN
 * ---------------------------------------------------------------------------
 * Two things arrive here from src/game/world-abilities.js.
 *
 * The first is a HAZARD: the landmark a world special raises — a volcano, a
 * twister, a rift — which is drawn in three pieces, because it is three
 * different kinds of thing at once. Its rock goes down BEFORE the backdrop, so
 * the ridges stand in front of it and the hour of the day falls on it like any
 * other terrain. Its fire goes on AFTER the light, with the muzzle flashes,
 * because it is emitting rather than lit. And its sky goes on last of all, in
 * screen space, because when a volcano is about to go off the whole frame
 * turns red — the camera can be six inches from a man's eye and it is still
 * red in there.
 *
 * The second is the ABILITY CAST: the animation a themed trick plays over the
 * fighter it lands on. Six motions (`castAbilityFx`) cover all eighteen of
 * them — grit whipping across the road, hornets closing in, snow coming down,
 * gas coming up, a burst, a spiral into somebody's head — and the ability data
 * picks a motion and three colours. A prairie sting and an ember bite cost the
 * same life three rounds later, and nothing about watching them is the same.
 */

import { drawSprite, frameAt, tinted } from '../art/pixel.js';
import { getView } from '../core/scene.js';
import {
  getCharacterSprites,
  getRevolverSprites,
  CHARACTER_TIMING,
  FIRE_FRAME_MS,
  GUN_TRACK,
} from '../art/sprites-character.js';
import { getCombatFx, FX_TIMING, FLASH_ANCHOR, SMOKE_ANCHOR, IMPACT_ANCHOR } from '../art/sprites-fx.js';
import { getHazardArt, HAZARD_W, HAZARD_H } from '../art/sprites-hazards.js';
import { getShieldSprites } from '../art/sprites-ui.js';
import { createParallax } from '../explore/parallax.js';
import * as weather from '../explore/weather.js';
import { PALETTE } from '../art/palette.js';
import { drawTextCentered } from '../art/font.js';

/** Source-pixel size of a fighter. Everything below is measured against it. */
const FIGHTER_W = 16;
const FIGHTER_H = 24;

/** How long the whole `fire` pose runs before the arm settles back on line. */
const FIRE_MS = FIRE_FRAME_MS.reduce((a, b) => a + b, 0);

/** Milliseconds a puff of powder smoke hangs, and a spent case is in the air. */
const SMOKE_LIFE = 810;
const SHELL_LIFE = 560;

/**
 * @param {object} o
 * @param {number} [o.enemyScale] how many times the fighters' own size the
 *   enemy is drawn at. 1 for everybody in the game except the Stranger, who is
 *   2 and then 2.4 — see the note on `drawFighter`.
 */
export function createDuelScene({
  worldId,
  biome,
  tint,
  seed,
  enemySprites,
  enemyScale = 1,
  shakeEnabled = true,
}) {
  const parallax = createParallax({
    seed: (seed ^ (worldId * 31337)) >>> 0,
    groundRatio: 0.7,
    biome,
  });
  parallax.setTint(tint);
  const playerSet = getCharacterSprites().player;
  const enemySet = enemySprites || playerSet;
  const shield = getShieldSprites();
  const combat = getCombatFx();

  const guns = {
    player: getRevolverSprites(playerSet.finish),
    enemy: getRevolverSprites(enemySet.finish),
  };
  const sprites = { player: playerSet, enemy: enemySet };

  /**
   * Each duellist's pose and how long it has been held. One-shot poses (the
   * draw, the shot, a hit) are read off `t`; loops ignore it.
   */
  const actors = {
    player: { pose: 'idle', t: 0 },
    enemy: { pose: 'idle', t: 0 },
  };

  /**
   * Whole-frame effects, as opposed to per-fighter ones. Poses go through
   * `setPose`; these are set directly by the screen.
   */
  const fx = {
    shake: 0,
    banner: null,
    bannerTimer: 0,
    /** A white wash over the whole frame — only for the boss's phase change. */
    whiteout: 0,

    // --- the cut-scene's furniture. All screen space, all off by default. ---
    /** Black over everything. 1 is a cut to black. */
    veil: 0,
    /** Letterbox bar height, as a fraction of the view. */
    bars: 0,
    /** `ESC TO SKIP`, printed in the top bar. */
    hint: false,
    /** The name card: { text, sub, t } with `t` running 0 → 1 as it slams in. */
    card: null,
    /** Impact frames — a held flat colour, in milliseconds. */
    slam: 0,
    /** Radial speed lines, 0..1, fading on their own. */
    rays: 0,
    /** Shockwave, 0..1.4 as it expands. -1 when idle. */
    ring: -1,
  };

  // Everything a shot leaves behind, all in device pixels: once a shell is in
  // the air it belongs to the road, not to the man who ejected it.
  const flashes = [];
  const smoke = [];
  const shells = [];
  const bullets = [];
  const impacts = [];

  /**
   * The landmarks on the road, at most one per side: the enemy's permanent one
   * and the player's one-shot. Each entry is the spec, its art, its box on
   * screen and the last state the engine's clock handed over.
   */
  const hazards = { player: null, enemy: null };
  /** What they currently have in the air, and what they left on the road. */
  const debris = [];
  const scars = [];
  /** Themed ability particles — see `castAbilityFx`. */
  const spell = [];

  /**
   * A COLOUR A FIGHTER IS WEARING, FOR AS LONG AS IT LASTS
   * ---------------------------------------------------------------------------
   * The half of an ability that is not a burst of particles. A freeze that is
   * only an animation is a freeze the player has forgotten about by the time it
   * costs them a turn, so the ice STAYS on the sprite until it thaws — and so
   * does the green on somebody carrying poison and the fever-red on somebody
   * marked. It is the only thing on the road that says "this is still true".
   *
   * `{ color, alpha }` per side, or null. Set by the screen from whatever the
   * engine says is on that fighter; see `hold` in src/game/world-abilities.js.
   */
  const statusTint = { player: null, enemy: null };

  /**
   * Tinted copies, cached. `tinted()` allocates a canvas, and a fighter is
   * redrawn sixty times a second — the cache is keyed by the frame and the
   * colour, so a whole duel spent frozen costs four canvases.
   */
  const tintCache = new Map();
  let tintSeq = 0;
  function tintedFrame(sprite, color) {
    if (!sprite.__tintId) sprite.__tintId = ++tintSeq;
    const key = `${sprite.__tintId}|${color}`;
    let out = tintCache.get(key);
    if (!out) {
      out = tinted(sprite, color, 1);
      tintCache.set(key, out);
    }
    return out;
  }

  let elapsed = 0;
  const cameraX = 1200; // a fixed, pleasant stretch of road
  /** Filled in by render(); the emitters need last frame's geometry. */
  let layout = null;
  /** The walk line, in device pixels. Anything falling needs to know it. */
  let groundLine = 0;
  /** How much bigger than the player the thing across the road is. */
  let bossScale = enemyScale;
  /**
   * Where the interface stops, in device pixels from the top of the canvas.
   *
   * The screen measures its own fighter card and tells us, because the card's
   * height depends on the enemy's name wrapping and on how many ability icons
   * it is carrying — a guess in here was wrong for the Stranger's second phase
   * the moment his name went to two lines.
   */
  let hudBottom = null;
  /** The left edge of the enemy's card, so a giant can stand inboard of it. */
  let hudLeft = null;
  /** The last view the scene drew into — the camera needs its height. */
  let lastView = null;

  /**
   * The camera. `zoom` 1 is the whole road; anything above it is a push in on
   * (x, y), a point in the scene's own device-pixel space. It eases between
   * framings on its own clock so a caller can say `lookAt(...)` and walk away.
   */
  const camera = { zoom: 1, x: 0, y: 0, from: null, to: null, t: 1, ms: 600 };

  /**
   * The Stranger's fire. 0 for everybody else, 1 while he is cowled, 2 once he
   * is not — see `stepAura`.
   */
  let auraLevel = 0;
  const aura = [];

  function setPose(side, pose) {
    const actor = actors[side];
    if (actor.pose === pose) return;
    actor.pose = pose;
    actor.t = 0;
  }

  /** Which frame list a pose plays, and how it is timed. */
  function poseFrames(set, pose) {
    if (pose === 'aim' || pose === 'fire') return set[pose];
    if (pose === 'hit') return set.hit;
    return set.idle;
  }

  /** Frame index for a pose, holding on the last frame of a one-shot. */
  function poseFrame(actor, frameCount = 4) {
    const { pose, t } = actor;
    if (pose === 'aim') return Math.min(frameCount - 1, Math.floor(t / CHARACTER_TIMING.aim));
    if (pose === 'fire') {
      let acc = 0;
      for (let i = 0; i < FIRE_FRAME_MS.length; i++) {
        acc += FIRE_FRAME_MS[i];
        if (t < acc) return i;
      }
      return FIRE_FRAME_MS.length - 1;
    }
    if (pose === 'hit') return Math.min(frameCount - 1, Math.floor(t / CHARACTER_TIMING.hit));
    return Math.floor(elapsed / CHARACTER_TIMING.idle) % frameCount;
  }

  /**
   * Map a run of source pixels in fighter space onto the screen, honouring the
   * mirror the far duellist is drawn with.
   * @param {number} px left edge in fighter space @param {number} w its width
   */
  function place(originX, fs, px, w, flip) {
    return flip ? originX + (FIGHTER_W - px - w) * fs : originX + px * fs;
  }

  /** The gun entry for a pose frame, or null when the gun is still in leather. */
  function gunAt(actor) {
    const track = GUN_TRACK[actor.pose];
    return track ? track[poseFrame(actor, track.length)] || null : null;
  }

  /**
   * Where the barrel ends, in device pixels, for a given pose frame. Used by
   * the flash, the smoke, the brass and the tracer, so all four agree.
   */
  function muzzleOf(side, poseName, frameIndex) {
    if (!layout) return null;
    const { originX, topY, fs, flip } = layout[side];
    const track = GUN_TRACK[poseName]?.[frameIndex];
    if (!track) return null;
    const gun = guns[side][track.art];
    const gx = track.hand.x - gun.hand.x;
    const gy = track.hand.y - gun.hand.y;
    return {
      x: place(originX, fs, gx + gun.muzzle.x, 1, flip) + (flip ? fs : 0),
      y: topY + (gy + gun.muzzle.y) * fs,
      dir: flip ? -1 : 1,
      fs,
    };
  }

  // --- emitters -------------------------------------------------------------

  /**
   * Fire one shot. Plays the recoil pose and lights everything that goes with
   * it; the bullet itself is spawned here too so a shot can never be drawn
   * without the round that caused it.
   */
  function fire(side) {
    setPose(side, 'fire');
    flashes.push({ side, t: 0 });

    // The flash is pinned to the muzzle of the first fire frame, so it stays
    // where the gun was when it went off rather than riding the kick up.
    const m = muzzleOf(side, 'fire', 0);
    if (m) {
      /**
       * Every speed here is in source pixels per millisecond, multiplied by
       * the fighters' draw scale. That matters: the first pass used device
       * pixels, so on a desktop the smoke crossed the road and the spent case
       * left the frame like a second bullet. A shell should travel about a
       * fighter's width and land.
       */
      for (let i = 0; i < 4; i++) {
        smoke.push({
          x: m.x + m.dir * m.fs * (1 + i * 1.4),
          y: m.y + (Math.random() - 0.5) * m.fs,
          vx: m.dir * (0.004 + Math.random() * 0.005) * m.fs,
          vy: -(0.002 + Math.random() * 0.003) * m.fs,
          rise: 0.000004 * m.fs,
          // Each puff remembers the scale of the gun it came off, so smoke
          // from something twice the size is twice the size.
          fs: m.fs,
          t: -i * 40,
        });
      }
      shells.push({
        x: m.x - m.dir * m.fs * 3,
        y: m.y + m.fs,
        vx: -m.dir * (0.008 + Math.random() * 0.006) * m.fs,
        vy: -0.045 * m.fs,
        g: 0.00035 * m.fs,
        fs: m.fs,
        t: 0,
      });
    }
    bullets.push({ side, t: 0 });
  }

  /** A round arriving: sparks and grit off whoever it went through. */
  function impact(side) {
    if (!layout) return;
    const { originX, topY, fs, flip } = layout[side];
    impacts.push({
      x: place(originX, fs, FIGHTER_W / 2, 1, flip),
      y: topY + 13 * fs,
      fs,
      t: 0,
    });
  }

  const renderer = {
    fx,
    setPose,
    fire,
    impact,

    /**
     * Swap the enemy's art mid-duel. A boss phase that changes what the boss
     * looks like has to reach the canvas, or the Stranger takes his cloak off
     * and nothing on screen moves.
     */
    setEnemySprites(set) {
      if (!set) return;
      sprites.enemy = set;
      guns.enemy = getRevolverSprites(set.finish);
    },

    /** A phase that is bigger than the last one. See `drawFighter`. */
    setEnemyScale(scale) {
      bossScale = Math.max(1, scale || 1);
    },

    /**
     * Where the enemy's card is, so an oversized fighter can stand clear of
     * it instead of behind it.
     */
    setHudBox(box) {
      hudBottom = Number.isFinite(box?.bottom) ? box.bottom : null;
      hudLeft = Number.isFinite(box?.left) ? box.left : null;
    },

    /**
     * What colour a fighter is wearing right now, and for how long they keep
     * wearing it. Pass null to take it off.
     * @param {'player'|'enemy'} side
     * @param {{color: string, alpha: number}|null} tint
     */
    setStatusTint(side, tint) {
      statusTint[side] = tint || null;
    },

    /** How much fire the enemy is carrying. See `stepAura`. */
    setAura(level) {
      auraLevel = Math.max(0, level || 0);
    },

    /**
     * Raise a landmark on one side of the road.
     *
     * `owner` is who raised it, not who it falls on: the enemy's stands behind
     * the enemy and throws at the player, and the player's does the reverse.
     * Both can be up at once.
     *
     * @param {object} spec an entry from SPECIALS in src/game/world-abilities.js
     * @param {'player'|'enemy'} owner
     */
    setHazard(spec, owner = 'enemy') {
      if (!spec) return;
      hazards[owner] = {
        spec,
        owner,
        art: getHazardArt(spec.art),
        motif: spec.motif || 'rock',
        colors: spec.debris || [PALETTE.char, PALETTE.magma, PALETTE.emberGlow],
        /** Overwritten every frame by the screen — see `setHazardState`. */
        state: { phase: 'dormant', sky: 0, activeK: -1 },
        box: null,
      };
    },

    /** Take one down — the player's goes when its single eruption is over. */
    clearHazard(owner) {
      hazards[owner] = null;
    },

    /** The engine's clock, handed over once a frame. */
    setHazardState(owner, state) {
      if (hazards[owner] && state) hazards[owner].state = state;
    },

    /**
     * One strike arriving on a fighter. The thing that hits is thrown from
     * wherever that hazard throws from and lands on the target, and the
     * impact, the shake and the mark it leaves are all hung off its landing
     * rather than fired here — so a life is lost when the rock arrives.
     */
    hazardStrike(side = 'player', owner = 'enemy') {
      const hz = hazards[owner];
      if (!hz || !layout) return;
      const L = layout[side];
      const tx = L.originX + FIGHTER_W * L.fs * 0.5;
      const ty = L.topY + 12 * L.fs;
      const from = strikeOrigin(hz, tx, ty);
      debris.push({
        kind: 'strike',
        hz,
        side,
        x: from.x,
        y: from.y,
        sx: from.x,
        sy: from.y,
        tx,
        ty,
        t: 0,
        life: from.ms,
        size: Math.max(2, (lastView ? lastView.scale : 3) * 2),
      });
    },

    /**
     * Play a themed ability over a fighter.
     * @param {object} cast `{ motion, colors, count, shake }` from the ability
     * @param {'player'|'enemy'} side who it is landing on
     */
    castAbilityFx(cast, side = 'player') {
      if (!cast || !layout) return;
      spawnSpell(cast, side);
      if (cast.shake) fx.shake = Math.max(fx.shake, cast.shake);
    },

    /**
     * Frame a point of a fighter.
     *
     * @param {object} shot
     * @param {'player'|'enemy'} [shot.side]
     * @param {number} [shot.x] across the fighter, in ITS source pixels (0..16)
     * @param {number} [shot.y] down the fighter, in its source pixels (0..24)
     * @param {number} [shot.fill] how many of those source pixels should fill
     *   the height of the screen. Smaller is closer. Omit for the wide shot.
     * @param {number} [shot.ms] travel time; 0 cuts.
     */
    lookAt(shot = {}) {
      const view = lastView;
      if (!view || !layout) return;
      const target = shot.fill
        ? framing(shot.side || 'enemy', shot.x ?? 8, shot.y ?? 5, shot.fill, view, shot.bias || 0)
        : { zoom: 1, x: view.w / 2, y: view.h / 2 };
      const ms = shot.ms ?? 600;
      if (ms <= 0) {
        camera.zoom = target.zoom;
        camera.x = target.x;
        camera.y = target.y;
        camera.t = 1;
        return;
      }
      camera.from = { zoom: camera.zoom, x: camera.x, y: camera.y };
      camera.to = target;
      camera.ms = ms;
      camera.t = 0;
    },

    /** Back to the whole road, instantly. */
    resetCamera() {
      camera.zoom = 1;
      camera.t = 1;
      camera.from = null;
      camera.to = null;
    },

    /** What the enemy is currently drawn at, for anything framing him. */
    getEnemyScale: () => bossScale,

    update(dt) {
      elapsed += dt;
      actors.player.t += dt;
      actors.enemy.t += dt;
      // A shot recovers on its own: the arm drops back onto the line rather
      // than the screen having to remember to put it there.
      for (const side of ['player', 'enemy']) {
        const actor = actors[side];
        if (actor.pose === 'fire' && actor.t >= FIRE_MS) {
          actor.pose = 'aim';
          actor.t = CHARACTER_TIMING.aim * 3;
        }
      }

      /**
       * The storm does not wait for the duel to finish. The walk engine is
       * paused for the whole fight, so nothing else is ticking the weather —
       * without this the rain hangs in the air behind the duellists. Weather's
       * own paused flag still holds its remaining time, so a fight in the rain
       * costs the rain nothing.
       */
      weather.update(dt, getView());
      parallax.updateAmbient(dt);
      if (fx.shake > 0) fx.shake = Math.max(0, fx.shake - dt);
      if (fx.whiteout > 0) fx.whiteout = Math.max(0, fx.whiteout - dt);
      if (fx.bannerTimer > 0) {
        fx.bannerTimer -= dt;
        if (fx.bannerTimer <= 0) fx.banner = null;
      }

      // --- the camera ---
      if (camera.t < 1 && camera.to) {
        camera.t = Math.min(1, camera.t + dt / camera.ms);
        const k = easeInOut(camera.t);
        camera.zoom = lerp(camera.from.zoom, camera.to.zoom, k);
        camera.x = lerp(camera.from.x, camera.to.x, k);
        camera.y = lerp(camera.from.y, camera.to.y, k);
      }

      // --- the cut-scene's own clocks ---
      if (fx.slam > 0) fx.slam = Math.max(0, fx.slam - dt);
      if (fx.rays > 0) fx.rays = Math.max(0, fx.rays - dt / 900);
      if (fx.ring >= 0) {
        fx.ring += dt / 700;
        if (fx.ring > 1.4) fx.ring = -1;
      }
      if (fx.card && fx.card.t < 1) fx.card.t = Math.min(1, fx.card.t + dt / 260);

      stepAura(dt);
      stepHazard(dt);
      stepSpell(dt);

      step(flashes, dt, FX_TIMING.flash.reduce((a, b) => a + b, 0));
      step(impacts, dt, FX_TIMING.impact.reduce((a, b) => a + b, 0));
      for (const p of smoke) {
        p.t += dt;
        if (p.t > 0) {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.vy -= p.rise * dt; // powder smoke rises as it cools
        }
      }
      cull(smoke, SMOKE_LIFE);
      for (const s of shells) {
        s.t += dt;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.vy += s.g * dt;
      }
      cull(shells, SHELL_LIFE);
      for (let i = bullets.length - 1; i >= 0; i--) {
        bullets[i].t += dt / 190;
        if (bullets[i].t >= 1) bullets.splice(i, 1);
      }
    },

    render(ctx, view) {
      const s = view.scale;
      lastView = view;
      /**
       * A duel is a close-up: fighters are drawn larger than on the road. The
       * cap keeps the two of them apart on a phone, where doubling the scale
       * would have them standing shoulder to shoulder.
       */
      const baseFs = Math.max(s, Math.min(s * 2, Math.floor((view.w * 0.26) / FIGHTER_W)));
      const shakeAmp = shakeEnabled ? Math.min(6, fx.shake / 26) : 0;
      const ox = shakeAmp ? (Math.random() - 0.5) * shakeAmp * s : 0;
      const oy = shakeAmp ? (Math.random() - 0.5) * shakeAmp * s : 0;

      const gy = parallax.groundY(view);
      groundLine = gy;
      weather.setGroundLine(gy);

      /**
       * THE TWO SIDES DO NOT HAVE TO BE THE SAME SIZE
       * ---------------------------------------------------------------------
       * `fs` used to be one number for the whole scene, which quietly encoded
       * "a duel is two men of the same height". It is per side now: the enemy
       * gets `fs * bossScale`, and everything that has to know where anything
       * is — the muzzle, the flash, the brass, the tracer, the shadow, the
       * shield, the camera — reads the scale out of that side's own layout
       * entry.
       *
       * The enemy is anchored by its FEET: a fighter drawn at two and a half
       * times the size has to stand on the same road, so `topY` is worked back
       * from the ground line rather than shared.
       *
       * He is also sized by the whole frame and moved out from under the
       * fighter card rather than shrunk to fit beneath it. An earlier attempt
       * reserved the card's full height across the whole width and the
       * Stranger came out barely half again the player's size — the interface
       * had eaten the boss. What the card occupies is a *corner*, so he stands
       * inboard of its left edge and keeps the full height of the road.
       */
      const efsMax = Math.max(s, Math.floor((gy - view.h * 0.06) / FIGHTER_H));
      const efs = Math.max(s, Math.min(Math.round(baseFs * bossScale), efsMax));
      const fs = Math.max(s, Math.min(baseFs, Math.round(efs / bossScale)));

      const playerX = Math.round(view.w * 0.18);
      const rightEdge = bossScale > 1 && hudLeft != null
        ? Math.min(hudLeft - s * 2, view.w * 0.84)
        : view.w * 0.84;
      // …but never so far in that he is standing on the player.
      const enemyX = Math.max(
        playerX + FIGHTER_W * fs + s * 6,
        Math.round(rightEdge - FIGHTER_W * efs),
      );
      const topY = gy - FIGHTER_H * fs + fs;
      const enemyTopY = gy - FIGHTER_H * efs + efs;
      layout = {
        player: { originX: playerX, topY, fs, flip: false },
        enemy: { originX: enemyX, topY: enemyTopY, fs: efs, flip: true },
      };

      /**
       * From here to `ctx.restore()` below, everything drawn is IN THE WORLD:
       * the camera transform is on, so a close-up magnifies the road and the
       * ridges and the sky along with the face. The weather and the interface
       * are deliberately outside it.
       */
      ctx.save();
      ctx.translate(Math.round(ox), Math.round(oy));
      const cam = cameraTransform(view);
      if (cam) {
        ctx.save();
        ctx.translate(cam.tx, cam.ty);
        ctx.scale(cam.z, cam.z);
      }

      // Backdrop now, light after the fighters — see parallax.applyLighting.
      parallax.renderBackdrop(ctx, view, cameraX);

      /**
       * The landmark goes in AFTER the ridges and before the duellists.
       *
       * The first pass put it behind the parallax stack, which is where a
       * mountain belongs and which buried it: five layers of ridge line came
       * down over everything below its crater and what was left read as one
       * more lump on a horizon full of them. It is not scenery — it is the
       * thing that is about to take three lives off somebody — so it stands
       * between the ridges and the road, close enough to be the biggest thing
       * in the frame and far enough back that both fighters are in front of
       * it. It is still terrain: the light goes over it with everything else.
       */
      drawHazardBody(ctx, view, gy);

      // --- ground shadows, so the fighters are planted rather than floating.
      // They lean away from the sun, so a duel at dusk casts two long ones. ---
      parallax.drawGroundShadow(ctx, view, playerX, FIGHTER_W * fs, gy);
      parallax.drawGroundShadow(ctx, view, enemyX, FIGHTER_W * efs, gy);

      // Something this big has weight: a wide, soft pool of its own under it,
      // so the road reads as bearing it rather than as being stood on.
      if (bossScale > 1) drawPresence(ctx, enemyX, gy, efs);

      // Fire goes behind him; the sparks it throws go in front. Both are
      // world-space, so a close-up on his face is a close-up on the fire too.
      drawAura(ctx, 'back');
      drawFighter(ctx, 'player');
      drawFighter(ctx, 'enemy');

      // --- shields ---
      if (actors.player.pose === 'shield') drawShield(ctx, shield, playerX, gy, fs, elapsed, false);
      if (actors.enemy.pose === 'shield') drawShield(ctx, shield, enemyX, gy, efs, elapsed, true);

      /**
       * The light goes on here: everything above it (the road and both
       * duellists) belongs to the scene and is lit by the hour of the day.
       * Everything below it is *making* light — muzzle flash, tracer, the
       * banner — and a muzzle flash that dims at dusk is a muzzle flash drawn
       * as if it were paint.
       */
      parallax.applyLighting(ctx, view);
      // Fireflies and the like: lights of their own, so they go on after the
      // hour of the day has been laid over the fight.
      parallax.renderAmbient(ctx, view);

      drawAura(ctx, 'front');
      // The fire in the crater and everything the mountain has in the air:
      // emitting, so it goes on after the light, with the muzzle flashes.
      drawHazardGlow(ctx, view);
      drawSpell(ctx);
      drawSmoke(ctx);
      drawShells(ctx);
      drawBullets(ctx);
      drawFlashes(ctx);
      drawImpacts(ctx);

      if (cam) ctx.restore();

      // Rain is rain-sized however close the camera is: it is between the lens
      // and the scene, not in it.
      weather.render(ctx, view);

      // The colour a hazard puts over the world while it is waking up and
      // going off. It is deliberately outside the camera: a close-up on a face
      // during an eruption is a close-up of a face lit red.
      drawHazardSky(ctx, view);

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

      if (fx.whiteout > 0) {
        ctx.globalAlpha = Math.min(0.75, fx.whiteout / 400);
        ctx.fillStyle = PALETTE.bone;
        ctx.fillRect(0, 0, view.w, view.h);
        ctx.globalAlpha = 1;
      }

      ctx.restore();

      // Everything the cut-scene puts over the picture: bars, veil, the name
      // card, impact frames, speed lines, the shockwave. Screen space, and
      // outside the shake so the frame itself stays steady under them.
      drawCinematics(ctx, view);

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

  // --- the camera -------------------------------------------------------------

  /**
   * Work a framing out into a camera position.
   *
   * `fill` is how many of the fighter's OWN source pixels should span the
   * height of the screen, which is the only unit that means the same thing on
   * both sides of the road: the Stranger is drawn at two and a half times the
   * player's scale, so "six pixels tall" frames his eyes exactly as tightly as
   * it frames the player's, without anybody having to know either scale.
   */
  function framing(side, sx, sy, fill, view, bias = 0) {
    const L = layout[side] || layout.player;
    /**
     * `bias` pushes the camera DOWN, which pushes the subject UP the frame.
     *
     * It exists because the bottom third of the screen belongs to the speech
     * box whenever anybody is talking, and a face composed dead-centre is a
     * face with a box across its chin. It is a fraction of `fill`, so the
     * shift is the same *proportion of the frame* at every zoom.
     */
    return {
      zoom: Math.max(1, view.h / (fill * L.fs)),
      x: place(L.originX, L.fs, sx, 1, L.flip),
      y: L.topY + (sy + bias * fill) * L.fs,
    };
  }

  /**
   * The transform, or null when the camera is at rest.
   *
   * The centre is clamped so the visible rectangle never leaves the world the
   * scene actually draws — everything is painted across `view.w` x `view.h`,
   * and a camera that wanders past that edge shows the end of the sky.
   */
  function cameraTransform(view) {
    if (camera.zoom <= 1.002) return null;
    const z = camera.zoom;
    const halfW = view.w / (2 * z);
    const halfH = view.h / (2 * z);
    const cx = Math.min(Math.max(camera.x, halfW), Math.max(halfW, view.w - halfW));
    const cy = Math.min(Math.max(camera.y, halfH), Math.max(halfH, view.h - halfH));
    return {
      z,
      tx: Math.round(view.w / 2 - cx * z),
      ty: Math.round(view.h / 2 - cy * z),
    };
  }

  // --- the aura ---------------------------------------------------------------

  /**
   * The Stranger's fire.
   *
   * Purple, because everything of his is, and because there is no warm colour
   * anywhere else in that world for it to be confused with. It is made of
   * three populations and nothing else:
   *
   *   flame  short columns licking up off the ground he is standing on and off
   *          the hem of him, flickering on their own clocks
   *   spark  single pixels thrown up and out, falling back under gravity
   *   arc    only at level two: brief vertical strokes of white-hot light that
   *          snap on for two frames somewhere on his body
   *
   * Level 1 is a fire he is standing in. Level 2 — the cowl off — is roughly
   * four times the fire, sparks that reach the top of the frame, and the arcs,
   * which is the whole point: the second phase has to LOOK like the moment the
   * fight got serious before the player has taken a single round of it.
   */
  const AURA = {
    1: { flames: 18, sparkRate: 0.02, arcRate: 0, rise: 0.9, spread: 0.55 },
    2: { flames: 34, sparkRate: 0.07, arcRate: 0.005, rise: 1.5, spread: 0.85 },
  };

  function stepAura(dt) {
    const cfg = AURA[auraLevel];
    if (!cfg || !layout) {
      if (aura.length) aura.length = 0;
      return;
    }
    const L = layout.enemy;
    const w = FIGHTER_W * L.fs;
    const h = FIGHTER_H * L.fs;
    const base = L.topY + h;

    // Flames are a fixed population that respawn where they die, so the fire
    // is always the same size rather than pulsing with the frame rate.
    const flames = aura.filter((p) => p.kind === 'flame').length;
    for (let i = flames; i < cfg.flames; i++) {
      aura.push(spawnFlame(L, w, base, cfg));
    }

    if (Math.random() < cfg.sparkRate * dt) {
      aura.push({
        kind: 'spark',
        x: L.originX + (Math.random() * 1.3 - 0.15) * w,
        y: base - Math.random() * h,
        /**
         * All three are in device pixels per MILLISECOND, which is the unit
         * every emitter in this file works in and the one that is easy to get
         * wrong by an order of magnitude. A spark leaving at 0.3 crosses about
         * three hundred pixels a second — up past his head and out of frame in
         * a second and a half. The first pass had these ten times higher and
         * every particle left the screen inside two frames, which is why the
         * fire was invisible in every shot that was not the wide one.
         */
        vx: (Math.random() - 0.5) * 0.012 * L.fs,
        vy: -(0.006 + Math.random() * 0.02) * L.fs * cfg.rise,
        g: 0.00003 * L.fs,
        t: 0,
        life: 700 + Math.random() * 900,
        hot: Math.random() < 0.3,
      });
    }
    if (cfg.arcRate && Math.random() < cfg.arcRate * dt) {
      aura.push({
        kind: 'arc',
        x: L.originX + w * (0.2 + Math.random() * 0.6),
        y: L.topY + h * (0.15 + Math.random() * 0.5),
        len: L.fs * (2 + Math.random() * 4),
        t: 0,
        life: 110,
      });
    }

    for (let i = aura.length - 1; i >= 0; i--) {
      const p = aura[i];
      p.t += dt;
      if (p.kind === 'flame') {
        p.y -= p.vy * dt;
        p.x += Math.sin(p.t / p.wobble) * 0.02 * L.fs;
        if (p.t >= p.life) Object.assign(p, spawnFlame(L, w, base, cfg));
      } else {
        p.x += (p.vx || 0) * dt;
        p.y += (p.vy || 0) * dt;
        if (p.g) p.vy += p.g * dt;
        if (p.t >= p.life) aura.splice(i, 1);
      }
    }
  }

  /**
   * Where one flame starts.
   *
   * IT BURNS ALL OVER HIM, NOT JUST AT HIS FEET
   * -------------------------------------------------------------------------
   * The first version spawned every flame on the ground under him, which looks
   * right in the wide shot and is nothing at all in a close-up — the camera
   * comes to rest on his face and there is no fire within a hundred pixels of
   * it. So the fire is distributed over his whole silhouette: mostly at the
   * feet, where it pools, some licking up his sides, and a fifth of it around
   * the crown, which is the part any shot of his face is going to hold.
   */
  function spawnFlame(L, w, base, cfg) {
    const h = FIGHTER_H * L.fs;
    const roll = Math.random();
    let x;
    let y;
    let scale = 1;
    if (roll < 0.4) {
      // The pool at his feet.
      x = L.originX + w * (0.5 + (Math.random() - 0.5) * (1 + cfg.spread));
      y = base + L.fs * Math.random();
    } else if (roll < 0.7) {
      // Up the sides of him.
      x = L.originX + (Math.random() < 0.5 ? -L.fs : w + L.fs) + (Math.random() - 0.5) * w * 0.3;
      y = base - h * (0.15 + Math.random() * 0.6);
      scale = 0.7;
    } else {
      // Around the crown — the part a close-up is looking at.
      x = L.originX + w * (0.15 + Math.random() * 0.7);
      y = L.topY + h * 0.08 + Math.random() * L.fs * 2;
      scale = 0.6;
    }
    return {
      kind: 'flame',
      x,
      y,
      vy: (0.002 + Math.random() * 0.006) * L.fs * cfg.rise,
      wobble: 90 + Math.random() * 220,
      height: L.fs * (1.5 + Math.random() * 4 * cfg.rise) * scale,
      life: 500 + Math.random() * 700,
      /**
       * A third of the fire is drawn IN FRONT of him.
       *
       * All of it used to be behind, which is the tidy choice and the wrong
       * one: behind a silhouette this solid, fire is only visible where it
       * clears his outline, so every close-up came out with no fire in it at
       * all. Some of it licking over him is both truer — he is burning, not
       * standing in front of a bonfire — and the only version that survives
       * the camera coming in.
       */
      front: Math.random() < 0.5,
      t: 0,
    };
  }

  /**
   * Draw it. A flame is a stack of three blocks — deep, mid, hot — which is
   * exactly how fire was drawn before anyone could afford more, and it is
   * still the only way to make one out of whole pixels. The stack shortens as
   * the flame ages, so it burns down rather than fading out.
   */
  function drawAura(ctx, pass) {
    if (!auraLevel || !layout) return;
    /**
     * A flame is ONE PIXEL wide — the scene's pixel, not the fighter's.
     *
     * The first version sized these blocks against the enemy's own draw scale,
     * which is twelve device pixels for the Stranger, and the fire came out as
     * a scatter of squares the size of his eye. Everything else on screen sits
     * on the `view.scale` grid; the fire does too, so it magnifies with the
     * camera exactly as the art does and still reads as fire at ten times the
     * size.
     */
    const unit = Math.max(1, lastView ? lastView.scale : 3);
    for (const p of aura) {
      const k = 1 - p.t / p.life;
      if (k <= 0) continue;
      if (p.kind === 'flame') {
        if (pass !== (p.front ? 'front' : 'back')) continue;
        const h = Math.max(unit, p.height * k);
        const x = Math.round(p.x);
        const y = Math.round(p.y);
        ctx.globalAlpha = 0.6 * k;
        ctx.fillStyle = PALETTE.purpleDark;
        ctx.fillRect(x - unit, Math.round(y - h), unit * 3, Math.round(h));
        ctx.globalAlpha = 0.95 * k;
        ctx.fillStyle = PALETTE.purple;
        ctx.fillRect(x, Math.round(y - h * 0.8), unit, Math.round(h * 0.8));
        ctx.globalAlpha = k;
        ctx.fillStyle = PALETTE.astralLight;
        ctx.fillRect(x, Math.round(y - h * 0.3), unit, Math.round(h * 0.3));
      } else if (p.kind === 'spark') {
        if (pass !== 'front') continue;
        ctx.globalAlpha = Math.min(1, k * 1.6);
        ctx.fillStyle = p.hot ? PALETTE.astralLight : PALETTE.purple;
        ctx.fillRect(Math.round(p.x), Math.round(p.y), unit, unit);
        ctx.globalAlpha = k * 0.35;
        ctx.fillStyle = PALETTE.purpleDark;
        ctx.fillRect(Math.round(p.x) - unit, Math.round(p.y) - unit, unit * 3, unit * 3);
      } else if (p.kind === 'arc') {
        if (pass !== 'front') continue;
        ctx.globalAlpha = k;
        ctx.fillStyle = PALETTE.white;
        ctx.fillRect(Math.round(p.x), Math.round(p.y), unit, Math.round(p.len));
        ctx.globalAlpha = k * 0.5;
        ctx.fillStyle = PALETTE.astralLight;
        ctx.fillRect(Math.round(p.x) - unit, Math.round(p.y), unit * 3, Math.round(p.len));
      }
    }
    ctx.globalAlpha = 1;
  }

  // --- the world hazards ------------------------------------------------------

  /**
   * THERE CAN BE TWO OF THESE NOW
   * ---------------------------------------------------------------------------
   * The enemy raises one and it stays; the player charges one and calls it down
   * for a single eruption. So everything below takes the hazard it is working
   * on as an argument rather than reaching for the one — and the two are placed
   * on opposite sides of the road, each one standing behind the duellist whose
   * it is, which is the only arrangement in which you can tell at a glance
   * whose mountain just went off.
   *
   * How hard each one throws, per phase. `dormant` is what it does while it is
   * only standing there — a thread of smoke off a volcano, grit off a twister,
   * a bubble out of the bog. It matters more than it sounds: a landmark with
   * nothing coming off it is a painting, and the player has to believe it is
   * going to do something long before it does.
   *
   * Rates are particles per millisecond.
   */
  const HAZARD_RATE = { dormant: 0.004, warning: 0.03, active: 0.09 };

  /** Where each side's landmark stands, as a fraction of the view's width. */
  const HAZARD_X = { enemy: 0.6, player: 0.28 };

  const liveHazards = () => [hazards.enemy, hazards.player].filter(Boolean);

  /** Where a strike comes from, and how long it takes to arrive. */
  function strikeOrigin(hz, tx, ty) {
    const s = lastView ? lastView.scale : 3;
    if (hz.motif === 'gas') return { x: tx, y: groundLine + s * 4, ms: 260 };
    if (hz.motif === 'mote' || hz.motif === 'hornet') {
      const box = hz.box;
      return { x: box ? box.x + box.w / 2 : tx + 200, y: ty - s * 4, ms: 320 };
    }
    // Rock, snow and shards all arrive the same way: out of the sky, fast.
    return { x: tx + (Math.random() - 0.5) * s * 20, y: -s * 12, ms: 300 };
  }

  /** One piece of whatever a hazard is made of, thrown from its landmark. */
  function spawnDebris(hz) {
    const box = hz.box;
    if (!box) return;
    const s = box.s;
    const cx = box.x + box.w / 2;
    const crest = box.y + s * 6;
    const colors = hz.colors;
    const pick = colors[Math.floor(Math.random() * colors.length)];
    const add = (bit) => debris.push({ hz, ...bit });

    switch (hz.motif) {
      case 'rock':
        // Thrown up out of the crater and left to fall wherever it falls.
        add({
          kind: 'rock',
          x: cx + (Math.random() - 0.5) * s * 6,
          y: crest,
          vx: (Math.random() - 0.5) * 0.22 * s,
          vy: -(0.1 + Math.random() * 0.06) * s,
          g: 0.00017 * s,
          size: Math.max(2, Math.round(s * (Math.random() < 0.3 ? 1.6 : 1))),
          color: pick,
          hot: Math.random() < 0.5,
          t: 0,
          life: 9000,
        });
        break;
      case 'flake':
        // A slab comes off the lip and slides down the face of the pass.
        add({
          kind: 'rock',
          x: box.x + box.w * (0.55 + Math.random() * 0.35),
          y: box.y + s * (4 + Math.random() * 6),
          vx: -(0.04 + Math.random() * 0.06) * s,
          vy: 0.02 * s,
          g: 0.00012 * s,
          size: Math.max(2, Math.round(s * (0.8 + Math.random()))),
          color: pick,
          t: 0,
          life: 9000,
        });
        break;
      case 'mote':
        // Grit off the column, crossing the road at head height.
        add({
          kind: 'mote',
          x: cx + (Math.random() - 0.5) * box.w * 0.8,
          y: box.y + Math.random() * box.h,
          vx: (hz.owner === 'enemy' ? -1 : 1) * (0.18 + Math.random() * 0.22) * s,
          vy: (Math.random() - 0.6) * 0.03 * s,
          g: 0,
          size: Math.max(1, Math.round(s * 0.7)),
          color: pick,
          t: 0,
          life: 1400 + Math.random() * 900,
        });
        break;
      case 'hornet':
        add({
          kind: 'hornet',
          x: cx + (Math.random() - 0.5) * s * 10,
          y: box.y + box.h * 0.45,
          vx: (hz.owner === 'enemy' ? -1 : 1) * (0.05 + Math.random() * 0.08) * s,
          vy: (Math.random() - 0.5) * 0.02 * s,
          wobble: 120 + Math.random() * 200,
          amp: s * (0.6 + Math.random()),
          size: Math.max(1, Math.round(s * 0.8)),
          color: pick,
          t: 0,
          life: 2600 + Math.random() * 1400,
        });
        break;
      case 'gas':
        // Out of the water, and up. It never comes down.
        add({
          kind: 'gas',
          x: box.x + Math.random() * box.w,
          y: groundLine - Math.random() * s * 3,
          vx: (Math.random() - 0.5) * 0.02 * s,
          vy: -(0.02 + Math.random() * 0.03) * s,
          g: 0,
          size: Math.max(2, Math.round(s * (1 + Math.random()))),
          color: pick,
          t: 0,
          life: 2200 + Math.random() * 1200,
        });
        break;
      default:
        // Shards, pulled out of the rift and dropped.
        add({
          kind: 'rock',
          x: cx + (Math.random() - 0.5) * box.w * 0.5,
          y: box.y + box.h * (0.2 + Math.random() * 0.5),
          vx: (Math.random() - 0.5) * 0.12 * s,
          vy: -(0.02 + Math.random() * 0.05) * s,
          g: 0.00014 * s,
          size: Math.max(2, Math.round(s * 1.1)),
          color: pick,
          hot: true,
          t: 0,
          life: 9000,
        });
    }
  }

  /**
   * The mark a strike leaves on the road.
   *
   * The volcano's is lava and it is still there at the end of the fight;
   * everything else leaves something that fades. It is the one part of a hazard
   * that accumulates, and it is the reason a long duel in the basin ends on a
   * road that has visibly been under a mountain for two minutes.
   */
  function addScar(hz, x) {
    const s = lastView ? lastView.scale : 3;
    scars.push({
      x,
      w: s * (4 + Math.random() * 5),
      t: 0,
      lava: !!hz.spec.lava,
      color: hz.colors[hz.colors.length - 1],
    });
    if (scars.length > 26) scars.shift();
  }

  function stepHazard(dt) {
    for (const hz of liveHazards()) {
      const rate = HAZARD_RATE[hz.state.phase || 'dormant'] || 0;
      if (hz.box && rate) {
        let n = rate * dt;
        while (n > 0) {
          if (n >= 1 || Math.random() < n) spawnDebris(hz);
          n -= 1;
        }
      }
    }

    for (let i = debris.length - 1; i >= 0; i--) {
      const p = debris[i];
      p.t += dt;

      if (p.kind === 'strike') {
        // A strike is not thrown, it is AIMED: it travels a straight line to
        // the fighter it was scheduled for and everything happens where it
        // lands, so a life is never lost before the thing that took it arrives.
        const k = Math.min(1, p.t / p.life);
        p.x = p.sx + (p.tx - p.sx) * k;
        p.y = p.sy + (p.ty - p.sy) * k;
        if (k >= 1) {
          impact(p.side);
          fx.shake = Math.max(fx.shake, 340);
          if (p.hz.spec.lava || p.hz.motif === 'rock') addScar(p.hz, p.tx);
          debris.splice(i, 1);
        }
        continue;
      }

      if (p.kind === 'hornet') {
        p.x += p.vx * dt;
        p.y += p.vy * dt + Math.sin(p.t / p.wobble) * 0.03 * p.amp;
      } else {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.g) p.vy += p.g * dt;
      }

      // Anything solid that reaches the road stops there and marks it.
      if (p.kind === 'rock' && groundLine && p.y >= groundLine) {
        addScar(p.hz, p.x);
        debris.splice(i, 1);
        continue;
      }
      if (p.t >= p.life || p.x < -80 || p.y > groundLine + 200) debris.splice(i, 1);
    }

    for (let i = scars.length - 1; i >= 0; i--) {
      scars[i].t += dt;
      // Lava crusts over and stays; everything else is gone in a few seconds.
      if (!scars[i].lava && scars[i].t > 5200) scars.splice(i, 1);
    }
  }

  function drawHazardBody(ctx, view, gy) {
    for (const hz of liveHazards()) {
      /**
       * Twice the scene's pixel, and no bigger than the sky it has to fit in.
       * A landmark drawn at the same scale as the props on the roadside is a
       * prop; this one is meant to be the biggest thing on screen after the two
       * men, and on a short window the clamp is what stops its crater going up
       * behind the fighter cards.
       */
      const s = Math.max(
        view.scale,
        Math.min(view.scale * 2, Math.floor((gy - view.h * 0.1) / HAZARD_H)),
      );
      const w = HAZARD_W * s;
      const h = HAZARD_H * s;
      const x = Math.round(view.w * (HAZARD_X[hz.owner] ?? 0.5) - w / 2);
      // Its foot sits a little under the walk line, so it reads as standing
      // further down the road rather than balanced on the same crust the
      // duellists are on.
      const y = Math.round(gy - h + s * 3);
      hz.box = { x, y, w, h, s };

      // A twister has no still frame: its body IS the animation.
      const body = hz.art.frames
        ? hz.art.frames[Math.floor(elapsed / 110) % hz.art.frames.length]
        : hz.art.body;
      drawSprite(ctx, body, x, y, s);
    }
  }

  function drawHazardGlow(ctx, view) {
    for (const hz of liveHazards()) {
      if (!hz.box) continue;
      const { x, y, s } = hz.box;
      const glow = hz.art.glow;
      if (glow && glow.length) {
        // It is never entirely dark: a mountain with fire in it has fire in it
        // between eruptions too, and that quarter-strength ember is the promise
        // the whole hazard is trading on.
        ctx.globalAlpha = 0.3 + 0.7 * (hz.state.sky || 0);
        drawSprite(ctx, glow[Math.floor(elapsed / 150) % glow.length], x, y, s);
        ctx.globalAlpha = 1;
      }
    }

    const s = lastView ? lastView.scale : 3;
    // What they have left on the road, under what they currently have in the air.
    for (const scar of scars) {
      const k = scar.lava ? Math.max(0.35, 1 - scar.t / 24000) : 1 - scar.t / 5200;
      if (k <= 0) continue;
      ctx.globalAlpha = 0.85 * k;
      ctx.fillStyle = scar.lava ? PALETTE.magmaDeep : scar.color;
      ctx.fillRect(Math.round(scar.x - scar.w / 2), Math.round(groundLine - s), Math.round(scar.w), s * 2);
      if (scar.lava) {
        ctx.globalAlpha = k * (0.55 + Math.sin(elapsed / 420 + scar.x) * 0.25);
        ctx.fillStyle = PALETTE.magma;
        ctx.fillRect(Math.round(scar.x - scar.w / 4), Math.round(groundLine - s), Math.round(scar.w / 2), s);
      }
    }
    ctx.globalAlpha = 1;

    for (const p of debris) {
      const size = p.size || s;
      if (p.kind === 'strike') {
        // The incoming one is drawn bigger and with a tail, because it is the
        // only piece on screen that is going to cost anybody anything.
        ctx.globalAlpha = 1;
        ctx.fillStyle = p.hz.colors[0];
        ctx.fillRect(Math.round(p.x), Math.round(p.y), size, size);
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = p.hz.colors[p.hz.colors.length - 1];
        ctx.fillRect(Math.round(p.x - size / 2), Math.round(p.y - size), size * 2, size * 2);
        continue;
      }
      const fade = p.kind === 'gas' || p.kind === 'mote' ? 1 - p.t / p.life : 1;
      ctx.globalAlpha = Math.max(0, Math.min(1, fade));
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), size, size);
      if (p.hot) {
        ctx.globalAlpha = Math.max(0, fade * 0.6);
        ctx.fillStyle = PALETTE.emberGlow;
        ctx.fillRect(Math.round(p.x), Math.round(p.y), Math.max(1, size - 1), Math.max(1, size - 1));
      }
      if (p.kind === 'hornet') {
        // Two pixels of wing, which is all a hornet at this size can have.
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = PALETTE.bone;
        ctx.fillRect(Math.round(p.x), Math.round(p.y - 1), size, 1);
      }
    }
    ctx.globalAlpha = 1;
  }

  /**
   * The colour the whole frame goes while a hazard is up.
   *
   * With two on the road it is whichever one is further along — they are never
   * both mid-eruption for long, and cross-fading two full-frame washes would
   * turn a red sky and a violet one into a brown one.
   */
  function drawHazardSky(ctx, view) {
    let strongest = null;
    for (const hz of liveHazards()) {
      const level = hz.state.sky || 0;
      if (level > 0.01 && (!strongest || level > strongest.level)) strongest = { hz, level };
    }
    if (!strongest) return;
    const { hz, level } = strongest;
    const sky = hz.spec.sky || { color: PALETTE.red, alpha: 0.4 };
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = sky.alpha * level;
    ctx.fillStyle = sky.color;
    ctx.fillRect(-64, -64, view.w + 128, view.h + 128);
    ctx.restore();
    // A pulse of the same colour on top of it while it is actually throwing, so
    // the eruption reads as light coming off something rather than as a filter
    // somebody left on.
    if (hz.state.activeK >= 0) {
      ctx.globalAlpha = 0.12 * (0.5 + Math.sin(elapsed / 180) * 0.5);
      ctx.fillStyle = sky.color;
      ctx.fillRect(0, 0, view.w, view.h);
      ctx.globalAlpha = 1;
    }
  }
  // --- themed ability casts ---------------------------------------------------

  /**
   * Six motions, eighteen abilities.
   *
   * Each one is spawned around the fighter it is landing on, in that fighter's
   * own geometry, so the same cast reads correctly on a man and on something
   * two and a half times his size. The colours come from the ability.
   */
  function spawnSpell(cast, side) {
    const L = layout[side];
    const other = layout[side === 'player' ? 'enemy' : 'player'];
    const cx = L.originX + FIGHTER_W * L.fs * 0.5;
    const cy = L.topY + 12 * L.fs;
    const head = L.topY + 4 * L.fs;
    const s = lastView ? lastView.scale : 3;
    const count = cast.count || 26;
    const colors = cast.colors || [PALETTE.white];

    for (let i = 0; i < count; i++) {
      const color = colors[i % colors.length];
      const size = Math.max(1, Math.round(s * (Math.random() < 0.25 ? 1.6 : 0.9)));
      const base = { color, size, t: -i * 12, life: 620 + Math.random() * 320, motion: cast.motion };
      const angle = (i / count) * Math.PI * 2;

      switch (cast.motion) {
        case 'streak': {
          // Off the caster, across the road, into the target.
          const fromX = other.originX + FIGHTER_W * other.fs * 0.5;
          const fromY = other.topY + (8 + Math.random() * 8) * other.fs;
          spell.push({
            ...base,
            x: fromX,
            y: fromY,
            vx: (cx - fromX) / 420,
            vy: (cy - fromY) / 420 + (Math.random() - 0.5) * 0.05,
            life: 520,
          });
          break;
        }
        case 'swarm': {
          const r = L.fs * (8 + Math.random() * 10);
          spell.push({
            ...base,
            x: cx + Math.cos(angle) * r,
            y: cy + Math.sin(angle) * r * 0.8,
            tx: cx,
            ty: cy,
            wobble: 90 + Math.random() * 160,
            amp: s * 2,
            life: 900 + Math.random() * 300,
          });
          break;
        }
        case 'fall':
          spell.push({
            ...base,
            x: cx + (Math.random() - 0.5) * FIGHTER_W * L.fs * 1.6,
            y: L.topY - L.fs * (6 + Math.random() * 24),
            vx: (Math.random() - 0.5) * 0.02,
            vy: 0.35 + Math.random() * 0.3,
            g: 0.0006,
            life: 700,
          });
          break;
        case 'rise':
          spell.push({
            ...base,
            x: cx + (Math.random() - 0.5) * FIGHTER_W * L.fs * 1.3,
            y: groundLine - Math.random() * L.fs,
            vx: (Math.random() - 0.5) * 0.03,
            vy: -(0.12 + Math.random() * 0.18),
            g: 0.00004,
            life: 780 + Math.random() * 300,
          });
          break;
        case 'spiral':
          spell.push({
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
        default:
          // burst
          spell.push({
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

  function stepSpell(dt) {
    for (let i = spell.length - 1; i >= 0; i--) {
      const p = spell[i];
      p.t += dt;
      if (p.t < 0) continue;
      if (p.motion === 'swarm') {
        // Closing on the target, wandering on the way in.
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
      if (p.t >= p.life) spell.splice(i, 1);
    }
  }

  function drawSpell(ctx) {
    for (const p of spell) {
      if (p.t < 0) continue;
      const k = 1 - p.t / p.life;
      ctx.globalAlpha = Math.max(0, Math.min(1, k * 1.6));
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  // --- the cut-scene's furniture ----------------------------------------------

  function drawCinematics(ctx, view) {
    const s = view.scale;

    if (fx.rays > 0) drawRays(ctx, view, fx.rays);
    if (fx.ring >= 0) drawRing(ctx, view, fx.ring);

    if (fx.veil > 0.001) {
      ctx.globalAlpha = Math.min(1, fx.veil);
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, view.w, view.h);
      ctx.globalAlpha = 1;
    }

    if (fx.slam > 0) {
      // White, then one frame of black. An impact frame is a hole punched in
      // the film; white alone reads as a bug.
      ctx.fillStyle = fx.slam > 90 ? PALETTE.white : PALETTE.ink;
      ctx.globalAlpha = Math.min(1, fx.slam / 120);
      ctx.fillRect(0, 0, view.w, view.h);
      ctx.globalAlpha = 1;
    }

    if (fx.bars > 0) {
      const h = Math.round(view.h * fx.bars);
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, view.w, h);
      ctx.fillRect(0, view.h - h, view.w, h);
      if (fx.hint && h > 8) {
        ctx.globalAlpha = 0.4;
        drawTextCentered(ctx, 'ESC TO SKIP', view.w / 2, view.h - h / 2, {
          scale: Math.max(1, s - 1),
          color: PALETTE.grey,
        });
        ctx.globalAlpha = 1;
      }
    }

    /**
     * The name card, along the TOP of the frame.
     *
     * It used to sit in the middle, over the face it was naming, which is the
     * one place a title cannot go. Up here it lands in the letterbox bar with
     * the picture untouched underneath — which is where a film would put it.
     */
    if (fx.card) {
      const k = easeOut(fx.card.t);
      const bandH = Math.round(view.h * 0.13);
      const top = Math.round(view.h * fx.bars) + Math.round(view.h * 0.015);
      const w = view.w * k;
      const x = Math.round((view.w - w) / 2);

      ctx.globalAlpha = 0.82 * k;
      ctx.fillStyle = PALETTE.shadow;
      ctx.fillRect(x, top, Math.round(w), bandH);
      ctx.globalAlpha = k;
      ctx.fillStyle = PALETTE.astralDark;
      ctx.fillRect(x, top, Math.round(w), Math.max(1, Math.round(s / 2)));
      ctx.fillRect(x, top + bandH - Math.max(1, Math.round(s / 2)), Math.round(w), Math.max(1, Math.round(s / 2)));

      // The letters come in from the right and stop dead — a card arrives.
      const slide = (1 - k) * view.w * 0.25;
      ctx.globalAlpha = Math.min(1, fx.card.t * 1.6);
      drawTextCentered(ctx, fx.card.text, view.w / 2 + slide, top + bandH * (fx.card.sub ? 0.38 : 0.5), {
        scale: Math.max(3, s + 1),
        color: PALETTE.star,
        shadow: PALETTE.cosmicHigh,
      });
      if (fx.card.sub) {
        drawTextCentered(ctx, fx.card.sub, view.w / 2 + slide * 0.6, top + bandH * 0.76, {
          scale: Math.max(1, s - 1),
          color: PALETTE.astral,
          shadow: PALETTE.cosmicHigh,
        });
      }
      ctx.globalAlpha = 1;
    }
  }

  /**
   * Speed lines. A hundred blocks pointing at the middle of the screen, drawn
   * from the edge inwards and stopping short of the centre so they frame the
   * face rather than cover it.
   */
  function drawRays(ctx, view, strength) {
    const s = view.scale;
    const cx = view.w / 2;
    const cy = view.h / 2;
    const reach = Math.max(view.w, view.h);
    const count = 56;
    ctx.fillStyle = PALETTE.white;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + Math.sin(elapsed / 240 + i) * 0.02;
      const inner = reach * (0.24 + (1 - strength) * 0.5);
      const len = reach * 0.6 * (0.4 + ((i * 37) % 100) / 160);
      ctx.globalAlpha = strength * (0.22 + ((i * 17) % 10) / 26);
      for (let t = 0; t < len; t += s * 2) {
        ctx.fillRect(
          Math.round((cx + Math.cos(a) * (inner + t)) / s) * s,
          Math.round((cy + Math.sin(a) * (inner + t)) / s) * s,
          s,
          s,
        );
      }
    }
    ctx.globalAlpha = 1;
  }

  /** A shockwave: one ring of blocks, thinning as it goes. */
  function drawRing(ctx, view, k) {
    const s = view.scale;
    const cx = view.w / 2;
    const cy = view.h / 2;
    const r = k * Math.max(view.w, view.h) * 0.75;
    const alpha = Math.max(0, 1 - k) ** 1.5;
    const steps = Math.max(28, Math.round(r / (s * 1.5)));
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

  // --- drawing ---------------------------------------------------------------

  /**
   * The weight of something too big for the road.
   *
   * Three flat bands of dark on the ground under it, widest at the back and
   * pulled in towards the feet, plus a slow ring of cold light that breathes.
   * The ordinary cast shadow is still drawn — this goes *under* it — because
   * the cast shadow says where the sun is and this says how much of the road
   * he is taking up. Without it a fighter at two and a half times the size
   * reads as a sprite scaled up rather than as a thing that arrived.
   */
  function drawPresence(ctx, originX, gy, efs) {
    const cx = originX + (FIGHTER_W / 2) * efs;
    const pulse = 0.75 + Math.sin(elapsed / 620) * 0.25;
    for (let i = 3; i >= 1; i--) {
      const w = FIGHTER_W * efs * (0.6 + i * 0.28);
      const h = Math.max(efs, Math.round(efs * i * 0.9));
      ctx.globalAlpha = 0.16 * (4 - i) * 0.5;
      ctx.fillStyle = PALETTE.cosmicHigh;
      ctx.fillRect(Math.round(cx - w / 2), Math.round(gy - h / 2), Math.round(w), h);
    }
    ctx.globalAlpha = 0.3 * pulse;
    ctx.fillStyle = PALETTE.purpleDark;
    const rw = FIGHTER_W * efs * 1.15;
    ctx.fillRect(Math.round(cx - rw / 2), Math.round(gy - efs / 2), Math.round(rw), Math.max(1, efs / 2));
    ctx.globalAlpha = 1;
  }

  function drawFighter(ctx, side) {
    const { originX, topY, fs, flip } = layout[side];
    const actor = actors[side];
    const set = sprites[side];
    const frames = poseFrames(set, actor.pose);
    const frame = frames[poseFrame(actor, frames.length)];
    const y = topY + (FIGHTER_H - frame.height) * fs;
    drawSprite(ctx, frame, originX, y, fs, flip);

    // Whatever they are wearing, laid over their own silhouette so it takes
    // the shape of the man rather than boxing him in. It breathes, because a
    // flat wash reads as a rendering mistake and a slow pulse reads as an
    // effect that is still running.
    const tint = statusTint[side];
    if (tint) {
      ctx.globalAlpha = tint.alpha * (0.75 + Math.sin(elapsed / 260) * 0.25);
      drawSprite(ctx, tintedFrame(frame, tint.color), originX, y, fs, flip);
      ctx.globalAlpha = 1;
    }

    const track = gunAt(actor);
    if (!track) return;
    const gun = guns[side][track.art];
    const gx = track.hand.x - gun.hand.x;
    const gy = track.hand.y - gun.hand.y;
    drawSprite(
      ctx,
      gun.sprite,
      place(originX, fs, gx, gun.sprite.width, flip),
      topY + gy * fs,
      fs,
      flip,
    );
  }

  function drawFlashes(ctx) {
    const total = FX_TIMING.flash;
    for (const f of flashes) {
      const index = frameOf(f.t, total);
      if (index < 0) continue;
      const m = muzzleOf(f.side, 'fire', 0);
      if (!m) continue;
      const sprite = combat.flash[index];
      const { originX, fs, flip } = layout[f.side];
      // The flash is drawn from its own anchor rather than from the fighter,
      // so it stays welded to the barrel at any scale.
      const px = (m.x - originX) / fs;
      drawSprite(
        ctx,
        sprite,
        flip
          ? m.x - (sprite.width - FLASH_ANCHOR.x) * fs
          : originX + (px - FLASH_ANCHOR.x) * fs,
        m.y - FLASH_ANCHOR.y * fs,
        fs,
        flip,
      );
    }
  }

  function drawImpacts(ctx) {
    for (const p of impacts) {
      const index = frameOf(p.t, FX_TIMING.impact);
      if (index < 0) continue;
      const sprite = combat.impact[index];
      const fs = p.fs || layout.player.fs;
      drawSprite(ctx, sprite, p.x - IMPACT_ANCHOR.x * fs, p.y - IMPACT_ANCHOR.y * fs, fs);
    }
  }

  function drawSmoke(ctx) {
    for (const p of smoke) {
      if (p.t < 0) continue;
      const index = frameOf(p.t, FX_TIMING.smoke);
      if (index < 0) continue;
      const fs = p.fs || layout.player.fs;
      ctx.globalAlpha = 0.55 * (1 - p.t / SMOKE_LIFE);
      drawSprite(ctx, combat.smoke[index], p.x - SMOKE_ANCHOR.x * fs, p.y - SMOKE_ANCHOR.y * fs, fs);
      ctx.globalAlpha = 1;
    }
  }

  function drawShells(ctx) {
    for (const sh of shells) {
      // The case tumbles: half the time it is edge-on and one pixel wide.
      const spinning = Math.floor(sh.t / 70) % 2 === 1;
      ctx.globalAlpha = Math.min(1, 3.2 - sh.t / (SHELL_LIFE * 0.45));
      drawSprite(ctx, combat.shell, sh.x, sh.y, sh.fs || layout.player.fs, spinning);
      ctx.globalAlpha = 1;
    }
  }

  /**
   * The tracer. A bright core with a tail that thins behind it, drawn between
   * the muzzle it left and the chest it is arriving at — both read from the
   * live layout, so it lands where the rival actually is.
   */
  function drawBullets(ctx) {
    for (const b of bullets) {
      const from = layout[b.side];
      const other = b.side === 'player' ? 'enemy' : 'player';
      const to = layout[other];
      // The round is the shooter's size and it arrives at the target's chest,
      // which is a different height on each side once one of them is a giant.
      const fs = from.fs;
      const m = muzzleOf(b.side, 'fire', 0);
      const x0 = m ? m.x : from.originX + FIGHTER_W * fs;
      const y0 = m ? m.y : from.topY + 12 * fs;
      const x1 = to.originX + (b.side === 'player' ? 2 : FIGHTER_W - 2) * to.fs;
      const y1 = to.topY + 13 * to.fs;
      const x = x0 + (x1 - x0) * b.t;
      const y = y0 + (y1 - y0) * b.t;
      const dir = Math.sign(x1 - x0) || 1;

      ctx.fillStyle = PALETTE.goldLight;
      ctx.fillRect(Math.round(x), Math.round(y), fs, Math.max(2, fs / 2));
      // Three tail segments, each fainter and shorter than the last.
      for (let i = 1; i <= 3; i++) {
        ctx.globalAlpha = 0.45 / i;
        ctx.fillStyle = i === 1 ? PALETTE.gold : PALETTE.sandLight;
        ctx.fillRect(
          Math.round(x - dir * (i * 2.2) * fs),
          Math.round(y),
          Math.max(1, fs * (1.6 - i * 0.35)),
          Math.max(1, fs / 2),
        );
      }
      ctx.globalAlpha = 1;
    }
  }

  return renderer;
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

/** Advance a list of `{t}` effects and drop the ones that have run out. */
function step(list, dt, life) {
  for (let i = list.length - 1; i >= 0; i--) {
    list[i].t += dt;
    if (list[i].t >= life) list.splice(i, 1);
  }
}

function cull(list, life) {
  for (let i = list.length - 1; i >= 0; i--) {
    if (list[i].t >= life) list.splice(i, 1);
  }
}

/** Which frame of a variable-timing effect `t` lands in. -1 once it is over. */
function frameOf(t, timing) {
  let acc = 0;
  for (let i = 0; i < timing.length; i++) {
    acc += timing[i];
    if (t < acc) return i;
  }
  return -1;
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
  drawSprite(ctx, aura, x + ((FIGHTER_W - aura.width) / 2) * fs, gy - (aura.height - 2) * fs, fs);
  ctx.globalAlpha = 1;

  // Shield braced on the leading arm, covering the body but not the face, and
  // riding a one-pixel bob so it does not look nailed to the sprite.
  const plate = shield.plate[frameAt(shield.plate, elapsed, 180)];
  const bob = Math.round(Math.sin(elapsed / 300)) * fs;
  const lead = flip ? FIGHTER_W - plate.width - 7 : 7;
  drawSprite(ctx, plate, x + lead * fs, gy - (plate.height - 1) * fs + bob, fs, flip);
}

/** Camera easing: slow out of a cut, slow into the next one. */
function easeInOut(k) {
  return k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
}

function easeOut(k) {
  return 1 - (1 - k) ** 3;
}

function lerp(a, b, k) {
  return a + (b - a) * k;
}
