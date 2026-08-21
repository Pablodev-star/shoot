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
 * prop by a distance is `stakedBody` (see src/art/biomes/hollow.js): a whole
 * skeleton run through by a single stake, hanging off it head-down with its
 * arms at its sides. There are dozens of them on a crossing, on the near verge
 * and on the bank behind it, and every single one of them is scenery. They do
 * not move, they do not react, and nothing in six worlds of this game has ever
 * suggested that a piece of roadside art could. By the middle of the world the
 * player is not looking at them any more.
 *
 * Then one of them is not scenery.
 *
 * THE FIVE RULES THE MOMENT ITSELF OBEYS
 * ---------------------------------------------------------------------------
 * 1. IT IS THE SAME OBJECT. Not a similar one, not a bigger one: this file
 *    draws the biome's own prop out of the biome's own bundle, at the prop
 *    band's own lane, scale and sink. If it were drawn a pixel differently the
 *    player would have something to notice, and something to notice is a
 *    warning.
 * 2. NOTHING IS TWEENED ON THE WAY UP. Every other effect in this game eases:
 *    the sky fades between weathers over two and a half seconds, a hazard warns
 *    for two, a boss gets a name card. This is one frame. The head is hanging,
 *    and on the next frame it is level — teeth showing, a neck under it, both
 *    sockets red — the arms are up, the screen is red and the camera is moving.
 *    There is no approach and no build-up, because an approach is the thing the
 *    player would have caught.
 * 3. IT IS THE LOUDEST THING IN THE GAME. `scare` in src/core/audio.js is a
 *    stack of three envelopes at roughly twice the gain of anything else. It
 *    is the one place the game raises its voice.
 * 4. RED IS RESERVED, AND THERE ARE TWO OF THEM. There is no red anywhere in
 *    the Hollow — not in the ground, not in the props, not on a rider, not in
 *    the sky (see the palette note) — so the sockets and the wash are the first
 *    red the player has seen since they left Brimstone Basin. Both sockets
 *    light, never one: one lit eye is a wink, and two is something looking at
 *    you.
 * 5. AND THEN IT GOES SLACK AGAIN. The one part that IS animated, and the most
 *    important second of the whole thing: the head drops back between the
 *    shoulders, the arms come down through one halfway frame, the light goes
 *    out of the sockets, and it hangs there exactly as it was while the player
 *    walks past it. The stake never falls — nothing about the prop has changed
 *    and nothing on the road is different afterwards, which is worse than
 *    wreckage would be. Without this the player is left holding a live threat
 *    and spends the rest of the world braced; with it the moment is closed and
 *    the game has said so without a line of text.
 *
 * It is fired once per run and it is never re-armed. See `scared` on the run
 * state in src/game/player.js.
 */

import { play } from '../core/audio.js';
import { getSettings } from '../core/settings.js';
import { getState, spendScare } from '../game/player.js';
import { getEnvironmentSprites } from '../art/sprites-environment.js';
import { drawSprite } from '../art/pixel.js';
import { SKELETON } from '../art/biomes/hollow.js';
import { PALETTE } from '../art/palette.js';

/**
 * The prop it wears, which is the prop the whole world is covered in.
 *
 * WHICH world is not decided here. `SCARE_WORLD` lives in ./encounters.js, next
 * to the quiet stretch it cuts into the road, and the two belong together: the
 * road has to know where to leave the gap whether or not this file ever fires.
 * Keeping the constant there also keeps this module — which reaches the whole
 * art chain — out of the balance harness's import graph.
 */
const POSES = {
  slack: 'stakedBody',
  mid: 'stakedBodyMid',
  risen: 'stakedBodyRisen',
};

/**
 * How close the traveller has to be, in source pixels, for it to go off.
 *
 * Positive is "still ahead of him". Twenty is the traveller's own width plus a
 * pace: near enough that it fills the same part of the screen he is looking at,
 * and just far enough that his hat is not across the sockets on the one frame
 * that matters.
 */
const TRIGGER_LEAD = 20;

/**
 * The clock, in milliseconds from the frame it fires.
 *
 * Everything before `FALL` is the strike and has no easing in it at all; the
 * fall is the only part of this file with an animation in it.
 */
const RED_HOLD = 90;      // full red, flat
const RED_OUT = 420;      // and then off, fast — a strobe, not a fade
const SHAKE_MS = 620;     // the camera keeps going a beat after the red stops
/**
 * The way back down. It holds risen for most of a second — long enough that the
 * player has looked at it — then spends one frame with the arms out and settles
 * back to exactly what it was.
 *
 * The halfway frame is deliberately SHORT. Arms falling through three even
 * beats is a wave; arms that hang at the top, snap through the middle and stop
 * is something letting go.
 */
const HOLD_MS = 780;      // how long it stays risen
const MID_MS = 190;       // the one frame on the way down
const SETTLE_AT = HOLD_MS + MID_MS;
const DUST_MS = 620;      // what shakes loose off the shoulders when it drops

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
  /** What comes off it when the arms drop. */
  let dust = [];
  /** True once that has happened, so it only ever happens once. */
  let shed = false;
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
    /**
     * The one accessibility switch this effect answers to, and it is the same
     * one the duel, the totem and the hard-road cut-scene answer to. A player
     * who has turned the camera off still gets the turn, the eyes, the noise
     * and the wash — everything the scare IS — without the frame moving under
     * them, which is what that setting is for.
     */
    if (!getSettings().screenShake) return null;
    const k = 1 - t / SHAKE_MS;
    const amp = 7 * k * k;
    return {
      x: Math.sin(t / 11) * amp + Math.sin(t / 4.3) * amp * 0.5,
      y: Math.cos(t / 8.5) * amp * 0.8 + Math.sin(t / 3.1) * amp * 0.4,
    };
  }

  /**
   * THE CAMERA KICK, AS ONE THING BOTH PASSES SHARE
   * ---------------------------------------------------------------------------
   * The scene is drawn through this and so is the skeleton that goes on top of
   * the red wash, and it lives here rather than in the screen because those two
   * have to agree to the pixel. They did not, once: the screen applied the kick,
   * drew the world, restored it and then called `drawFlash`, which painted the
   * body again at its UNSHAKEN position — so for half a second there were two of
   * it a few pixels apart, one moving with the road and one standing still, and
   * the wash is not opaque enough to hide the one underneath.
   *
   * The zoom is not decoration. Translating the scene leaves a strip of empty
   * canvas on two sides of the frame — the parallax draws exactly the view and
   * not a pixel more — so the whole thing is pushed in far enough to cover the
   * largest offset the shake can reach. It reads as the camera flinching
   * towards the thing, which is what a camera would do.
   *
   * Always paired with `endKick`, and always safe to call: with nothing
   * happening it is a bare `save()`.
   */
  function beginKick(ctx, view) {
    ctx.save();
    const kick = shakeOffset();
    if (!kick) return;
    const s = view.scale;
    const z = 1 + (Math.max(Math.abs(kick.x), Math.abs(kick.y)) * 2 * s) / Math.min(view.w, view.h);
    ctx.translate(view.w / 2, view.h / 2);
    ctx.scale(z, z);
    ctx.translate(-view.w / 2, -view.h / 2);
    ctx.translate(Math.round(kick.x * s), Math.round(kick.y * s));
  }

  /** Give the camera back. */
  function endKick(ctx) {
    ctx.restore();
  }

  /**
   * How lit the sockets are, 0 to 1.
   *
   * Full from the frame it fires until the arms let go, and then out across the
   * halfway frame — so it is dark by the time the head is back down. That is
   * the beat that closes the whole thing: it looked at you, and then it went
   * out. A skeleton still burning on the road behind the player is an
   * unfinished threat, and the player would spend the rest of the world waiting
   * for the second half of it.
   */
  function eyeLevel() {
    if (t === null) return 0;
    if (t < HOLD_MS) return 1;
    return Math.max(0, 1 - (t - HOLD_MS) / MID_MS);
  }

  /**
   * Which of the three poses is up.
   *
   * `slack` before it fires and again once it is over — the same string, the
   * same prop, nothing on the road changed. `risen` is everything in between
   * except the one short frame on the way down.
   */
  function poseName() {
    if (t === null) return 'slack';
    if (t < HOLD_MS) return 'risen';
    if (t < SETTLE_AT) return 'mid';
    return 'slack';
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
    // Nothing to draw at all until it is armed, and nothing to STOP drawing
    // once it is over: it goes back to being one more thing on the verge, and
    // the player walks past it exactly as they walked past the others.
    if (!armed() && t === null) return;

    const pose = poseName();
    const sprite = getEnvironmentSprites(biome).props[POSES[pose]];
    if (!sprite) return;

    const s = view.scale;
    const w = sprite.width * s;
    const x = heroX + (worldX - cameraX) * s;
    // The same bedding the scatter band gives every prop: one source pixel of
    // the base below its own line, so the stake stands IN the road rather than
    // on it.
    const y = groundY + s - sprite.height * s;
    if (x < -w * 2 || x > view.w + w * 2) return;

    box = { sprite, x, y, s, pose };
    // The moment the arms let go, something comes off the shoulders. Spawned
    // here rather than on a clock because this is the only place that knows
    // where the shoulders actually are.
    if (t !== null && !shed && t >= HOLD_MS) {
      shed = true;
      spawnDust(x + w / 2, y + sprite.height * s * 0.4, s);
    }

    paint(ctx);
    if (dust.length) drawDust(ctx, s);
  }

  /**
   * Put the sprite down, once, in whatever pose is up.
   *
   * Split out because it is drawn TWICE on the frames that matter — once with
   * the scenery, where it belongs, and again on top of the red wash, where it
   * has to be visible. See `drawFlash`.
   */
  function paint(ctx) {
    const { sprite, x, y, s, pose } = box;
    drawSprite(ctx, sprite, x, y, s);
    drawEyes(ctx, x, y, s, pose);
  }

  /**
   * The red in the sockets. BOTH of them, always.
   *
   * `SKELETON.eyes` is measured off the prop in src/art/biomes/hollow.js rather
   * than guessed here, and it is per POSE, because the head is a row higher
   * when it is up than when it is hanging.
   */
  function drawEyes(ctx, x, y, s, pose) {
    const lit = eyeLevel();
    if (lit <= 0) return;
    const spec = SKELETON.eyes[pose] || SKELETON.eyes.slack;
    const { w, h } = SKELETON.eye;
    ctx.globalAlpha = lit;
    for (const col of spec.x) {
      const left = x + col * s;
      const top = y + spec.y * s;
      // A hot core inside a darker ring, which is how every glow in this game
      // is drawn (see the note in biomes/inferno.js) — three flat steps, no
      // blur.
      ctx.fillStyle = PALETTE.redDeep;
      ctx.fillRect(left - s, top - s, w * s + s * 2, h * s + s * 2);
      ctx.fillStyle = PALETTE.red;
      ctx.fillRect(left, top, w * s, h * s);
      ctx.fillStyle = PALETTE.redLight;
      ctx.fillRect(left, top, w * s, Math.max(1, Math.round(h * s * 0.6)));
    }
    ctx.globalAlpha = 1;
  }

  /** What shakes loose off it when the arms drop. */
  function spawnDust(cx, cy, s) {
    for (let i = 0; i < 14; i++) {
      dust.push({
        x: cx + (Math.random() - 0.5) * 16 * s,
        y: cy + (Math.random() - 0.5) * 6 * s,
        vx: (Math.random() - 0.5) * 0.03 * s,
        vy: (0.01 + Math.random() * 0.03) * s,
        // Chosen once, at spawn. Rolling it per frame is the difference between
        // dust and a shower of static.
        color: Math.random() < 0.3 ? PALETTE.pall : PALETTE.pallMid,
        t: 0,
      });
    }
  }

  function drawDust(ctx, s) {
    for (const d of dust) {
      ctx.globalAlpha = 0.45 * (1 - d.t / DUST_MS);
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
     * It is the same call the scene made a moment ago (`paint`), inside the
     * same camera kick the scene was drawn through (`beginKick`), so there is
     * no chance of the two disagreeing about where it is, which pose is up, or
     * how far the camera has thrown it.
     */
    if (!box) return;
    beginKick(ctx, view);
    paint(ctx);
    endKick(ctx);
  }

  return {
    setPosition,
    update,
    draw,
    drawFlash,
    beginKick,
    endKick,
    /** True from the frame it fires. Nothing outside needs to know more. */
    isFiring: () => t !== null,
  };
}
