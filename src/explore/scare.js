/**
 * SHOOT! — The scare.
 *
 * There is exactly one jump scare in this game. It is on the road in Gallows
 * Hollow, it happens at most once per run, and this file is the whole of it.
 *
 * WHAT IT IS BUILT ON
 * ---------------------------------------------------------------------------
 * A scare is not a loud noise. A loud noise is a loud noise. What makes one
 * work is a rule the player has been taught, believes, and has stopped
 * consciously checking — and then one counter-example.
 *
 * The Hollow spends a whole world teaching one rule. Its commonest roadside
 * prop by a distance is `stakeSkull` (see src/art/biomes/hollow.js): a skull on
 * a stake, in profile, facing away up the road. There are dozens of them on a
 * crossing, on the near verge and on the bank behind it, and every single one
 * of them is scenery. They do not turn, they do not react, and nothing in six
 * worlds of this game has ever suggested that a piece of roadside art could.
 * By the middle of the world the player is not looking at them any more.
 *
 * Then one of them is not scenery.
 *
 * THE FIVE RULES THE MOMENT ITSELF OBEYS
 * ---------------------------------------------------------------------------
 * 1. IT IS THE SAME OBJECT. Not a similar one, not a bigger one: this file
 *    draws `stakeSkull` out of the biome's own prop bundle, at the prop band's
 *    own lane, scale and sink. If it were drawn a pixel differently the player
 *    would have something to notice, and something to notice is a warning.
 * 2. NOTHING IS TWEENED. Every other effect in this game eases: the sky fades
 *    between weathers over two and a half seconds, a hazard warns for two, a
 *    boss gets a name card. This is one frame. The skull is facing away, and
 *    on the next frame it is facing the player with red in its sockets, the
 *    screen is red, and the camera is moving. There is no approach and no
 *    build-up, because an approach is the thing the player would have caught.
 * 3. IT IS THE LOUDEST THING IN THE GAME. `scare` in src/core/audio.js is a
 *    stack of three envelopes at roughly twice the gain of anything else. It
 *    is the one place the game raises its voice.
 * 4. RED IS RESERVED. There is no red anywhere in the Hollow — not in the
 *    ground, not in the props, not on a rider, not in the sky (see the palette
 *    note). The two pixels in the sockets and the wash over the frame are the
 *    first red the player has seen since they left Brimstone Basin.
 * 5. AND THEN IT FALLS OVER. The one part that IS animated, and it is the most
 *    important second of the whole thing: the stake goes over, the skull hits
 *    the road, dust comes off it, and it lies there while the player walks
 *    past. Without that the player is left holding a live threat and spends the
 *    rest of the world braced. With it, the moment is closed — something
 *    happened, it is over, and the game has told them so without a line of
 *    text.
 *
 * It is fired once per run and it is never re-armed. See `scared` on the run
 * state in src/game/player.js.
 */

import { play } from '../core/audio.js';
import { getState, spendScare } from '../game/player.js';
import { getEnvironmentSprites } from '../art/sprites-environment.js';
import { drawSprite } from '../art/pixel.js';
import { SKULL_EYES } from '../art/biomes/hollow.js';
import { PALETTE } from '../art/palette.js';

/** The world the scare belongs to. Gallows Hollow, and nowhere else, ever. */
export const SCARE_WORLD = 6;

/** The prop it wears, which is the prop the whole world is covered in. */
const PROP = 'stakeSkull';

/**
 * How close the traveller has to be, in source pixels, for it to go off.
 *
 * Positive is "still ahead of him". Twelve puts it just off his shoulder — near
 * enough that it fills the same part of the screen he is looking at, far enough
 * that his own sprite is not covering the sockets on the frame that matters.
 */
const TRIGGER_LEAD = 12;

/**
 * The clock, in milliseconds from the frame it fires.
 *
 * Everything before `FALL` is the strike and has no easing in it at all; the
 * fall is the only part of this file with an animation in it.
 */
const RED_HOLD = 90;      // full red, flat
const RED_OUT = 420;      // and then off, fast — a strobe, not a fade
const SHAKE_MS = 620;     // the camera keeps going a beat after the red stops
const FALL_AT = 620;      // when the stake lets go
const FALL_MS = 780;      // and how long it takes to reach the road
const DUST_MS = 700;      // the puff it lands in

/** Radians. A stake that has gone over lies flat, plus a little past it. */
const FALL_ANGLE = Math.PI / 2 + 0.12;

/**
 * The scare, as a small machine with three questions: where is it, has it gone
 * off, and what should the screen be doing about it.
 *
 * It draws nothing and knows nothing until `setPosition` is given a world
 * coordinate, so a screen may create one unconditionally and hand it a null in
 * the six worlds that do not have one.
 */
export function createScare() {
  /** World position in the same units the walk engine's odometer is in. */
  let worldX = null;
  /** null while it is scenery; a millisecond clock once it has gone off. */
  let t = null;
  /** True once it has fired in this session, so it can never fire twice. */
  let fired = false;
  /** Dust, spawned on the frame the skull hits the road. */
  let dust = [];
  /** True once that has happened, so it only ever happens once. */
  let landed = false;
  /**
   * Where the sprite was drawn this frame, so the flash can put it back on top
   * of itself. See `drawFlash`.
   */
  let box = null;

  /**
   * Arm it, or put it away.
   * @param {number|null} x world position, or null for a world without one
   */
  function setPosition(x) {
    worldX = typeof x === 'number' ? x : null;
  }

  /** True while it is standing there being scenery. */
  const armed = () => worldX !== null && !fired && !getState().scared;

  /**
   * Advance. `cameraX` is the odometer — the same number the props are placed
   * against — so the trigger is a plain comparison in world space rather than
   * anything to do with where the sprite happens to be on screen.
   */
  function update(dt, cameraX) {
    if (t !== null) {
      t += dt;
      for (const d of dust) {
        d.t += dt;
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        d.vy += 0.00006 * dt;
      }
      dust = dust.filter((d) => d.t < DUST_MS);
      return;
    }
    if (!armed()) return;
    if (cameraX < worldX - TRIGGER_LEAD) return;

    /**
     * THE FRAME.
     *
     * Everything happens here, in this order and in no time at all: the run's
     * one scare is spent (so a save written a second later can never bring it
     * back), the clock starts, and the noise goes off. The screen is red and
     * the head is turned by the time the next frame is drawn — there is no
     * state between "scenery" and "looking at you".
     */
    fired = true;
    spendScare();
    t = 0;
    play('scare');
  }

  /** 0 while nothing is happening, up to 1 on the frame it fires. */
  function redLevel() {
    if (t === null) return 0;
    if (t <= RED_HOLD) return 1;
    if (t >= RED_HOLD + RED_OUT) return 0;
    return 1 - (t - RED_HOLD) / RED_OUT;
  }

  /**
   * How far the camera is thrown this frame, in source pixels.
   *
   * Not a smooth wobble: two sines well out of phase, which never repeats
   * inside the window and never crosses zero on a beat. A shake that oscillates
   * cleanly reads as a rumble, and this is supposed to read as a flinch.
   */
  function shakeOffset() {
    if (t === null || t >= SHAKE_MS) return null;
    const k = 1 - t / SHAKE_MS;
    const amp = 7 * k * k;
    return {
      x: Math.sin(t / 11) * amp + Math.sin(t / 4.3) * amp * 0.5,
      y: Math.cos(t / 8.5) * amp * 0.8 + Math.sin(t / 3.1) * amp * 0.4,
    };
  }

  /**
   * How lit the sockets are, 0 to 1.
   *
   * Full from the frame it fires until the stake lets go, and then out over the
   * first half of the fall — so it is dark before it lands. That is the beat
   * that closes the whole thing: it looked at you, and then it went out. A
   * skull still burning on the road behind the player is an unfinished threat,
   * and the player would spend the rest of the world waiting for the second
   * half of it.
   */
  function eyeLevel() {
    if (t === null) return 0;
    if (t < FALL_AT) return 1;
    return Math.max(0, 1 - (t - FALL_AT) / (FALL_MS * 0.5));
  }

  /** How far over it has gone, in radians. */
  function fallAngle() {
    if (t === null || t < FALL_AT) return 0;
    const k = Math.min(1, (t - FALL_AT) / FALL_MS);
    /**
     * Accelerating, because it is falling rather than being lowered — the angle
     * goes as the square of the time, which is what gravity does to a post
     * pivoting on its own foot. The last tenth is a small bounce off the road:
     * a heavy thing that stops dead has landed in mud.
     */
    const swing = k * k;
    const bounce = k > 0.88 ? Math.sin((k - 0.88) / 0.12 * Math.PI) * 0.11 : 0;
    return FALL_ANGLE * swing - bounce;
  }

  /**
   * Draw it, at the prop band's own geometry.
   *
   * @param {object} o
   * @param {number} o.cameraX  the odometer
   * @param {number} o.groundY  the walk line, in device pixels
   * @param {number} o.heroX    where the traveller stands, in device pixels
   * @param {string} o.biome    which bundle to take the prop out of
   */
  function draw(ctx, view, { cameraX, groundY, heroX, biome }) {
    if (worldX === null) return;
    // Nothing left to draw once it has finished falling and gone off screen —
    // but it is NOT removed while it is lying there: the player walks past the
    // thing on the road, and that is the point of knocking it over.
    if (!armed() && t === null) return;

    const sprite = getEnvironmentSprites(biome).props[PROP];
    if (!sprite) return;

    const s = view.scale;
    const w = sprite.width * s;
    // The pivot: the foot of the stake, which is the middle of the sprite's
    // bottom edge. Everything about the fall is this one transform — the art
    // itself never changes — so getting the pivot right is the difference
    // between a post going over and a picture sliding sideways.
    const footX = heroX + (worldX - cameraX) * s + w / 2;
    // The same bedding the scatter band gives every prop: one source pixel of
    // the base below its own line, so it stands IN the road rather than on it.
    const footY = groundY + s;
    if (footX < -w * 2 || footX > view.w + w * 2) return;

    box = { sprite, footX, footY, s, w };
    const angle = fallAngle();
    // The frame it arrives: spawned here rather than on a clock, because this
    // is the only place that knows where the sprite actually is.
    if (t !== null && !landed && t >= FALL_AT + FALL_MS * 0.86) {
      landed = true;
      spawnDust(footX + w, footY, s);
    }

    paint(ctx, angle);
    if (dust.length) drawDust(ctx, s);
  }

  /**
   * Put the sprite down, once, at whatever angle it has reached.
   *
   * Split out because it is drawn TWICE on the frames that matter — once with
   * the scenery, where it belongs, and again on top of the red wash, where it
   * has to be visible. See `drawFlash`.
   */
  function paint(ctx, angle) {
    const { sprite, footX, footY, s, w } = box;
    ctx.save();
    ctx.translate(Math.round(footX), Math.round(footY));
    if (angle) ctx.rotate(angle);
    /**
     * FACING.
     *
     * Scenery faces right, away from a traveller walking up behind it. From
     * the frame it fires it is mirrored, and the mirror is the whole of the
     * "it looked at you" — there is no turn, no in-between frame and no easing,
     * because a head that visibly rotates is a head the player watched rotate.
     */
    drawSprite(ctx, sprite, -w / 2, -sprite.height * s, s, t !== null);
    drawEyes(ctx, sprite, s, -w / 2);
    ctx.restore();
  }

  /**
   * The two red pixels, laid into the sockets the art leaves.
   *
   * `SKULL_EYES` is measured off the prop in src/art/biomes/hollow.js rather
   * than guessed here, and the x is mirrored along with the sprite, because the
   * skull is facing the other way now.
   */
  function drawEyes(ctx, sprite, s, x0) {
    const lit = eyeLevel();
    if (lit <= 0) return;
    ctx.globalAlpha = lit;
    const { x, y, w, h } = SKULL_EYES;
    const top = -sprite.height * s + y * s;
    const left = x0 + (sprite.width - x - w) * s;
    // A hot core inside a darker ring, which is how every glow in this game is
    // drawn (see the note in biomes/inferno.js) — three flat steps, no blur.
    ctx.fillStyle = PALETTE.redDeep;
    ctx.fillRect(left - s, top - s, w * s + s * 2, h * s + s * 2);
    ctx.fillStyle = PALETTE.red;
    ctx.fillRect(left, top, w * s, h * s);
    ctx.fillStyle = PALETTE.redLight;
    ctx.fillRect(left, top, w * s, Math.max(1, Math.round(h * s * 0.6)));
    ctx.globalAlpha = 1;
  }

  /** The road it lands in, thrown up on the frame it hits. */
  function spawnDust(sx, base, s) {
    for (let i = 0; i < 16; i++) {
      dust.push({
        x: sx + (Math.random() - 0.2) * 14 * s,
        y: base - Math.random() * 3 * s,
        vx: (Math.random() - 0.35) * 0.06 * s,
        vy: -Math.random() * 0.05 * s,
        // Chosen once, at spawn. Rolling it per frame is the difference between
        // dust and a shower of static.
        color: Math.random() < 0.3 ? PALETTE.pall : PALETTE.pallMid,
        t: 0,
      });
    }
  }

  function drawDust(ctx, s) {
    for (const d of dust) {
      ctx.globalAlpha = 0.5 * (1 - d.t / DUST_MS);
      ctx.fillStyle = d.color;
      ctx.fillRect(Math.round(d.x), Math.round(d.y), s, s);
    }
    ctx.globalAlpha = 1;
  }

  /**
   * The wash. Drawn last, over everything including the traveller and the
   * weather, and it is a flat fill rather than a gradient: a vignette is a
   * mood and this is a slap.
   */
  function drawFlash(ctx, view) {
    const level = redLevel();
    if (level <= 0) return;
    ctx.globalAlpha = 0.74 * level;
    ctx.fillStyle = PALETTE.red;
    ctx.fillRect(0, 0, view.w, view.h);
    // A deeper band top and bottom while it is at full strength. It is the one
    // shaped thing in the whole effect and it is doing the job a vignette would
    // do without the softness: the frame closes in.
    if (level > 0.6) {
      ctx.globalAlpha = 0.55 * level;
      ctx.fillStyle = PALETTE.redDeep;
      const band = Math.round(view.h * 0.2);
      ctx.fillRect(0, 0, view.w, band);
      ctx.fillRect(0, view.h - band, view.w, band);
    }
    ctx.globalAlpha = 1;

    /**
     * AND THEN THE SKULL AGAIN, ON TOP OF ALL OF IT.
     *
     * The wash is the loudest thing on the screen and it buries everything
     * underneath it, including the one object the player is supposed to be
     * looking at — which was the first version of this effect and it was a
     * screen going red for no visible reason. So the sprite is put down a
     * second time, over the red, for exactly as long as the red lasts: the
     * world is erased and the thing that erased it is the only object left in
     * the frame.
     *
     * It is the same call the scene made a moment ago (`paint`), so there is no
     * chance of the two disagreeing about where it is or which way it is
     * facing.
     */
    if (box) paint(ctx, fallAngle());
  }

  return {
    setPosition,
    update,
    draw,
    drawFlash,
    shakeOffset,
    /** True from the frame it fires. Nothing outside needs to know more. */
    isFiring: () => t !== null,
  };
}
