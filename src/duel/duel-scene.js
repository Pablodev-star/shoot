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
 */

import { drawSprite, frameAt } from '../art/pixel.js';
import { getView } from '../core/scene.js';
import {
  getCharacterSprites,
  getRevolverSprites,
  CHARACTER_TIMING,
  FIRE_FRAME_MS,
  GUN_TRACK,
} from '../art/sprites-character.js';
import { getCombatFx, FX_TIMING, FLASH_ANCHOR, SMOKE_ANCHOR, IMPACT_ANCHOR } from '../art/sprites-fx.js';
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
  };

  // Everything a shot leaves behind, all in device pixels: once a shell is in
  // the air it belongs to the road, not to the man who ejected it.
  const flashes = [];
  const smoke = [];
  const shells = [];
  const bullets = [];
  const impacts = [];

  let elapsed = 0;
  const cameraX = 1200; // a fixed, pleasant stretch of road
  /** Filled in by render(); the emitters need last frame's geometry. */
  let layout = null;
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
      /**
       * A duel is a close-up: fighters are drawn larger than on the road. The
       * cap keeps the two of them apart on a phone, where doubling the scale
       * would have them standing shoulder to shoulder.
       */
      const baseFs = Math.max(s, Math.min(s * 2, Math.floor((view.w * 0.26) / FIGHTER_W)));
      const shakeAmp = shakeEnabled ? Math.min(6, fx.shake / 26) : 0;
      const ox = shakeAmp ? (Math.random() - 0.5) * shakeAmp * s : 0;
      const oy = shakeAmp ? (Math.random() - 0.5) * shakeAmp * s : 0;

      ctx.save();
      ctx.translate(Math.round(ox), Math.round(oy));

      const gy = parallax.groundY(view);
      weather.setGroundLine(gy);
      // Backdrop now, light after the fighters — see parallax.applyLighting.
      parallax.renderBackdrop(ctx, view, cameraX);

      /**
       * THE TWO SIDES DO NOT HAVE TO BE THE SAME SIZE
       * ---------------------------------------------------------------------
       * `fs` used to be one number for the whole scene, which quietly encoded
       * "a duel is two men of the same height". It is per side now: the enemy
       * gets `fs * bossScale`, and everything that has to know where anything
       * is — the muzzle, the flash, the brass, the tracer, the shadow, the
       * shield — reads the scale out of that side's own layout entry.
       *
       * The enemy is anchored by its FEET, not by its box: a fighter drawn at
       * two and a half times the size has to stand on the same road, so `topY`
       * is worked back from the ground line rather than shared.
       */
      /**
       * THE CAMERA PULLS BACK RATHER THAN LETTING HIM LEAVE THE FRAME
       * ---------------------------------------------------------------------
       * A fighter drawn at two and a half times the size does not fit under
       * the fighter cards, and the first pass had the Stranger's crown behind
       * his own life bar.
       *
       * So the ENEMY's height is what is capped — to the headroom between the
       * road and the cards — and the player's scale is worked back from it.
       * That has exactly the property the fight wants: when the cowl comes off
       * and he grows from 2x to 2.4x, he is already as tall as the frame
       * allows, so what actually happens on screen is that *the player gets
       * smaller*. The camera backing away from him is a better reading of "he
       * grew" than him growing would have been.
       */
      /**
       * He is sized by the whole frame and moved out from under the card,
       * rather than being shrunk to fit beneath it.
       *
       * The first attempt reserved the card's full height across the whole
       * width, and the Stranger came out barely half again the player's size —
       * the interface had eaten the boss. What the card actually occupies is a
       * *corner*, so the fix is to stand him inboard of its left edge and let
       * him have the full height of the road. He ends up head-and-shoulders
       * into the sky with the fight's own HUD beside him rather than over him.
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

      // --- ground shadows, so the fighters are planted rather than floating.
      // They lean away from the sun, so a duel at dusk casts two long ones. ---
      parallax.drawGroundShadow(ctx, view, playerX, FIGHTER_W * fs, gy);
      parallax.drawGroundShadow(ctx, view, enemyX, FIGHTER_W * efs, gy);

      // Something this big has weight: a wide, soft pool of its own under it,
      // so the road reads as bearing it rather than as being stood on.
      if (bossScale > 1) drawPresence(ctx, enemyX, gy, efs);

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

      drawSmoke(ctx);
      drawShells(ctx);
      drawBullets(ctx);
      drawFlashes(ctx);
      drawImpacts(ctx);

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

      if (fx.whiteout > 0) {
        ctx.globalAlpha = Math.min(0.75, fx.whiteout / 400);
        ctx.fillStyle = PALETTE.bone;
        ctx.fillRect(0, 0, view.w, view.h);
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
    drawSprite(ctx, frame, originX, topY + (FIGHTER_H - frame.height) * fs, fs, flip);

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
