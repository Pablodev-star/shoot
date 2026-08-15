/**
 * SHOOT! — Parallax renderer (Block 3a).
 *
 * Draws the scrolling landscape: the sky, the star field, the sun/moon arc,
 * five tiled depth layers, the storm deck, the deterministic scatter of props
 * along the ground, and whatever the biome has drifting through the air.
 *
 * IT DOES NOT KNOW WHAT A DESERT IS
 * ---------------------------------------------------------------------------
 * Every landscape-specific thing here used to be a constant: the manifest of
 * layers, the scatter table, the colour under the road. All three now come out
 * of the biome bundle handed over at construction, so this file is the *shape*
 * of a side-scrolling world and the biome modules are what it is made of. A
 * new biome changes nothing in here.
 *
 * The sky, the sun, the moon and the storm deck are deliberately NOT biome
 * data. They are the same sky over every place in the game, and one of the
 * things holding the six worlds together as one journey is that the sun
 * setting looks identical in all of them.
 *
 * COORDINATES
 * ---------------------------------------------------------------------------
 * The world is measured in *source pixels*. `cameraX` is the player's travelled
 * distance in source pixels. Screen position = (worldX - cameraX * speed) *
 * view.scale. Every draw is rounded to the pixel grid.
 *
 * THE SKY IS DITHERED, NOT GRADIENTED
 * ---------------------------------------------------------------------------
 * A canvas linear gradient across a 900px window is 900 distinct colours: it is
 * the one thing on screen that is not pixel art, and next to the dithered
 * ridges it looked like a photograph glued behind them. Instead the ramp is
 * quantised to steps of QUANTUM per channel and the boundary between two steps
 * is broken up with a 4x4 ordered dither — the same trick a 256-colour machine
 * used, and the reason those skies still look good.
 *
 * It is built into a 4 x rows tile and repeated, so the cost is a few hundred
 * one-pixel fills whenever the colour actually changes (a few times a second at
 * most) and a single pattern fill per frame.
 *
 * LIGHT IS APPLIED LAST, AND THE SKY AFTER THAT
 * ---------------------------------------------------------------------------
 * `renderBackdrop()` draws the world and `applyLighting()` puts the hour of the
 * day over it. They are separate calls so a screen can draw its actors in
 * between: the gunslinger, the horse and the enemy all stand *inside* the
 * scene's light instead of being pasted on top of a scene that has already been
 * lit. `render()` does both in one go for callers with nothing to insert.
 *
 * The sky is not painted until the very end, *underneath* everything, so that
 * the light which falls on the desert never falls on the thing emitting it. See
 * `drawSkyBehind`.
 *
 * SCATTER
 * ---------------------------------------------------------------------------
 * Props are not stored in a list — the world is infinite. Instead the ground is
 * divided into fixed cells of the biome's scatter-cell size, and each cell's
 * contents are derived from a seeded RNG keyed by the cell index. Same cell,
 * same props, forever, with no memory cost.
 *
 * THERE ARE FIVE BANDS OF SCENERY, NOT ONE
 * ---------------------------------------------------------------------------
 * A single row of props standing on the walk line is what a side-scroller looks
 * like before anybody has finished it: the scene is a painted wall, a strip of
 * road, and nothing in between or in front. So the same cell machinery runs
 * several times over, at several depths, and each band scrolls at the speed of
 * the floor it is standing on rather than at a speed somebody picked:
 *
 *   backdrop  props hazed back and planted BEHIND the near ridge, at the mid
 *             layer's speed. Their feet are buried in the ridge, which is the
 *             whole trick — a distant tree whose base you can see is a small
 *             tree standing next to you.
 *   verge     the far side of the road, a pixel step smaller and a little
 *             slower than the camera, standing on the part of the floor that
 *             is behind the traveller.
 *   scatter   the roadside proper, on the walk line, at camera speed.
 *   clutter   litter on a tighter grid, just in front of the walk line.
 *   near      a thin band of small stuff on the floor BETWEEN the traveller
 *             and the camera, drawn after he is, so the road occasionally
 *             passes in front of him instead of always behind.
 *   fringe    a tiled strip of near ground at the very bottom of the frame,
 *             running faster than any of them. It is the cheapest depth cue
 *             there is and the only one that puts the player inside the scene
 *             rather than in front of it.
 *
 * THE FLOOR IS A PLANE, AND IT IS NOT ALL ONE SPEED
 * ---------------------------------------------------------------------------
 * The ground layer is sliced into horizontal bands and each is scrolled at the
 * speed of its own depth — see the long note over `PLANE_RISE` in
 * `src/art/env-kit.js`, which owns that geometry and the rules the six floors
 * are drawn to. The walk line sits `PLANE_RISE` rows INTO the layer rather than
 * on its top edge, so the traveller walks along a road with ground on both
 * sides of him, and everything the rest of this file anchors to the horizon —
 * the ridges, the far prop band, the buildings' footings — hangs off the top of
 * that plane instead.
 *
 * LANDMARKS ARE NOT TILED
 * ---------------------------------------------------------------------------
 * Anything the player is supposed to recognise — the basin's volcano, the barn
 * on the prairie — is drawn once every few hundred paces from its own world
 * grid rather than baked into a 320-pixel layer tile. A mountain that comes
 * round again every 320 pixels is not a mountain, it is wallpaper, and no
 * amount of detail in it survives being seen four times at once.
 */

import { PALETTE } from '../art/palette.js';
import { drawSprite, makeCanvas } from '../art/pixel.js';
import {
  getEnvironmentSprites,
  LAYER_TILE_W,
  SKY_BODY_SIZE,
  SKY_GLOW_SIZE,
  FORGE_GLOW,
  FORGE_CHIMNEY,
  TAILOR_GLASS,
} from '../art/sprites-environment.js';
import { PLANE_RISE, planeBands, planeSpeed } from '../art/env-kit.js';
import { PLAYER_SIZE } from '../art/sprites-character.js';
import { makeRng } from '../core/rng.js';
import { getSky } from './daynight.js';
import { getGroundWind, getWeatherState } from './weather.js';

/**
 * One prop per cell at most, placed inside the middle half of the cell. That
 * single rule is what keeps the roadside from clumping: two neighbours can
 * never be closer than half a cell, and never further than one and a half.
 *
 * The cell size is the biome's, because it is really a statement about how
 * crowded the place is: the desert is empty by definition and a saguaro every
 * seventy-six pixels is already generous, while a prairie at that spacing
 * reads as a lawn somebody mowed.
 */
const DEFAULT_SCATTER_CELL = 76;

/**
 * Slack around the edge of every full-screen pass. The duel shakes the camera
 * by translating the context, and a veil or a sky drawn to the exact viewport
 * would slide off one edge and leave a bare strip on the other.
 */
const MARGIN = 48;

/** Colour step the sky ramp is quantised to before dithering. */
const QUANTUM = 10;

/**
 * Where the traveller stands, as a fraction of the frame's width.
 *
 * The road's one fixed point. He never moves off it — the world moves past him
 * — so anything that has to line up with him is placed against this rather
 * than against the left edge of the screen. The explore screen draws him here
 * and `drawStructures` puts the shop doors here; see the note there for why
 * that stopped the player walking straight past every shop in the game.
 */
const HERO_ANCHOR = 0.26;

/** The traveller's left edge in device pixels, for the frame given. */
export function heroX(view) {
  return Math.round(view.w * HERO_ANCHOR);
}

/**
 * 4x4 ordered (Bayer) dither thresholds, normalised. A 2x2 checker only has
 * three states — off, half, on — so across a slow gradient half the screen ends
 * up in the half state and the sky wears a visible fly screen. Sixteen
 * thresholds break the same step into sixteen textures instead of one.
 */
const BAYER_N = 4;
const BAYER = [
  0, 8, 2, 10,
  12, 4, 14, 6,
  3, 11, 1, 9,
  15, 7, 13, 5,
].map((v) => (v + 0.5) / 16);

/**
 * The overcast deck: how much of it each weather pulls over the sky.
 *
 * A sandstorm gets none — sand does not arrive under rain cloud, it arrives as
 * the sky itself turning the colour of the ground, which the ochre haze does.
 * Ashfall is the same argument at half strength: some of what is up there is
 * genuinely smoke, and the basin's own cloud band is already drawn as smoke.
 * Snow gets the most of anyone, because snow really does come out of a closed
 * white sky and almost never out of an open one. Starfall gets none at all:
 * you cannot see a meteor through a cloud, and there is nothing out there for
 * a cloud to be made of.
 */
const STORM_DECK = { cloudy: 0.6, rain: 1, sandstorm: 0, fog: 0.45, snow: 0.85, ash: 0.35, starfall: 0 };

/**
 * @param {object} options
 * @param {string} [options.biome] which landscape to draw. Defaults to the
 *   desert, which is what the menu backdrop wants and what every world rode
 *   before the biomes existed.
 */
export function createParallax(options = {}) {
  const env = getEnvironmentSprites(options.biome);
  const seed = options.seed ?? 20260730;
  const scatterWeight = env.scatter.reduce((s, e) => s + e.weight, 0);
  const scatterCell = env.scatterCell || DEFAULT_SCATTER_CELL;
  /** The far band, or null for a biome that has not been given one. */
  const backdrop = env.backdrop || null;
  const backdropWeight = backdrop ? backdrop.scatter.reduce((s, e) => s + e.weight, 0) : 0;
  /** Seed fluff, fireflies, whatever else this biome keeps in the air. */
  const ambient = env.createAmbient ? env.createAmbient(seed ^ 0xa1b2c3) : null;
  /** Buildings placed by the encounter system: [{ worldX, kind }] */
  let structures = [];
  /**
   * The last camera position the backdrop was drawn at. The foreground and the
   * ambient are drawn from separate calls that the screens make later in the
   * frame, and asking them all to carry the camera around was one more thing
   * for a screen to get wrong — the duel already draws its road twice under two
   * different transforms.
   */
  let lastCameraX = 0;
  /** Palette shift applied per world (Galaxy tints everything violet). */
  let worldTint = options.tint || null;

  /**
   * The walk line. Duels raise it so the fighters never sit under the action
   * buttons; exploration keeps it low so more desert is visible.
   *
   * It is the line the BOOTS land on, which since the floor became a plane is
   * no longer the top of the ground layer: `planeTop` is, and it sits
   * `PLANE_RISE` rows above this. Everything outside this file — the traveller,
   * the duellists, the rain's landing line, the shadows — wants this one.
   */
  const groundRatio = options.groundRatio ?? 0.78;
  function groundY(view) {
    return Math.round((view.h * groundRatio) / view.scale) * view.scale;
  }

  /**
   * The far edge of the floor: where the ground plane starts and the last ridge
   * ends. Every layer behind the traveller hangs off this rather than off the
   * walk line, so raising the walk line into the middle of the road did not
   * drag the whole horizon down with it.
   */
  function planeTop(view) {
    return groundY(view) - PLANE_RISE * view.scale;
  }

  function setStructures(list) {
    structures = list || [];
  }

  function setTint(tint) {
    worldTint = tint;
  }

  // --- sky ------------------------------------------------------------------

  /**
   * The star field. Fixed positions, three sizes, each with its own twinkle
   * phase; the whole field slides west as the night turns, which is the one
   * cue that tells the player time is passing even when they are standing
   * still under a black sky.
   */
  const stars = (() => {
    const rng = makeRng(seed ^ 0x5eed);
    return Array.from({ length: 130 }, () => {
      const r = rng();
      return {
        x: rng(),
        y: rng() * 0.66,
        size: r < 0.72 ? 1 : r < 0.95 ? 2 : 3,
        phase: rng() * Math.PI * 2,
        rate: rng.range(520, 1400),
        base: rng.range(0.45, 1),
      };
    });
  })();

  /** Shooting stars: rare, short, and only ever at night. */
  const shooting = [];
  let lastNow = 0;

  let skyCache = { key: '', pattern: null };

  function skyPattern(ctx, view, sky) {
    const s = view.scale;
    const rows = Math.ceil(view.h / s) + 1;
    const { top, mid, bottom } = sky.rgb;
    const key = `${rows}|${top}|${mid}|${bottom}`;
    if (skyCache.key === key) return skyCache.pattern;

    const { canvas, ctx: tile } = makeCanvas(BAYER_N, rows);
    for (let y = 0; y < rows; y++) {
      const k = y / (rows - 1);
      // Zenith → mid at 55% of the screen → horizon.
      const c = k < 0.55
        ? top.map((v, i) => v + (mid[i] - v) * (k / 0.55))
        : mid.map((v, i) => v + (bottom[i] - v) * ((k - 0.55) / 0.45));
      for (let x = 0; x < BAYER_N; x++) {
        const threshold = BAYER[(y % BAYER_N) * BAYER_N + (x % BAYER_N)];
        const q = c.map((v) => {
          const lo = Math.floor(v / QUANTUM) * QUANTUM;
          return Math.min(255, (v - lo) / QUANTUM > threshold ? lo + QUANTUM : lo);
        });
        tile.fillStyle = `rgb(${q[0]},${q[1]},${q[2]})`;
        tile.fillRect(x, y, 1, 1);
      }
    }
    skyCache = { key, pattern: ctx.createPattern(canvas, 'repeat') };
    return skyCache.pattern;
  }

  /**
   * The sky, painted UNDER everything already on the canvas.
   *
   * It goes on last and underneath for one reason: the sky is the light
   * source, not a lit surface. Drawn first and tinted with everything else, a
   * full moon came out the same grey as the rock below it and the stars went
   * out — the scene got darker at midnight and so did the only two things in it
   * that are supposed to be bright. Because `destination-over` puts each new
   * draw *behind* the last, the ridges and the traveller still occlude the sun
   * exactly as before, with no clipping and no second canvas.
   *
   * Everything here is therefore listed front-to-back, which is the reverse of
   * how it reads: disc, halo, horizon band, stars, and the ramp behind them.
   */
  function drawSkyBehind(ctx, view, sky, gy) {
    const s = view.scale;
    ctx.save();
    ctx.globalCompositeOperation = 'destination-over';

    const p = sky.sunProgress;
    const isSun = p >= 0 && p <= 1;
    const arcT = isSun ? p : (p < 0 ? p + 1 : p - 1);
    const size = SKY_BODY_SIZE * s;
    const cx = view.w * (0.1 + arcT * 0.8);
    const cy = view.h * 0.62 - Math.sin(arcT * Math.PI) * view.h * 0.5;

    const gw = SKY_GLOW_SIZE * s;
    const gx = Math.round((cx - gw / 2) / s) * s;
    const gyy = Math.round((cy - gw / 2) / s) * s;
    const bx = Math.round((cx - size / 2) / s) * s;
    const by = Math.round((cy - size / 2) / s) * s;

    if (isSun) {
      // The sun fades from its red low tone to its white high one with
      // elevation, and its halo does the same — a white noon sun wearing a
      // sunset halo is the giveaway that the two were drawn by different rules.
      // Under destination-over the hot pass goes down first at partial alpha
      // and the cold one fills in solid beneath it: an exact cross-fade.
      const hot = Math.min(1, sky.elevation * 1.4);
      ctx.globalAlpha = hot;
      drawSprite(ctx, env.sky.sun[1], bx, by, s);
      ctx.globalAlpha = 1;
      drawSprite(ctx, env.sky.sun[0], bx, by, s);
      ctx.globalAlpha = hot;
      drawSprite(ctx, env.sky.glow[1], gx, gyy, s);
      ctx.globalAlpha = 1;
      drawSprite(ctx, env.sky.glow[0], gx, gyy, s);
    } else {
      // The moon rises before the sky is done with the sun, and a full-strength
      // disc hanging in an orange dusk looks stuck on. It comes up with the
      // stars instead.
      ctx.globalAlpha = 0.3 + sky.stars * 0.7;
      drawSprite(ctx, env.sky.moon[sky.moonPhase], bx, by, s);
      ctx.globalAlpha = 0.25 + sky.stars * 0.75;
      drawSprite(ctx, env.sky.moonGlow, gx, gyy, s);
      ctx.globalAlpha = 1;
    }

    drawHorizonGlow(ctx, view, sky, gy);
    drawStars(ctx, view, sky);

    /**
     * Whatever the biome hangs in the sky itself — the pass's aurora is the
     * only one so far.
     *
     * It is drawn HERE, inside the destination-over pass and after the stars,
     * and both halves of that matter. Behind everything already on the canvas,
     * so the peaks and the spruce and the traveller stand in front of it
     * instead of it being painted over the top of the mountains it is supposed
     * to be forty miles beyond. And after the stars, so the stars come out in
     * front of the curtain — which is what you actually see, because an aurora
     * is thinner than it looks and there is nothing in it to hide a star
     * behind.
     */
    if (ambient?.renderSky) ambient.renderSky(ctx, view, sky);

    const pattern = skyPattern(ctx, view, sky);
    ctx.imageSmoothingEnabled = false;
    ctx.scale(s, s);
    ctx.fillStyle = pattern;
    const m = MARGIN / s;
    ctx.fillRect(-m, -m, view.w / s + m * 2, view.h / s + m * 2);
    ctx.restore();
  }

  function drawStars(ctx, view, sky) {
    if (sky.stars <= 0.02) return;
    const s = view.scale;
    const now = performance.now();
    const drift = sky.skyRotation * 0.55;
    ctx.fillStyle = PALETTE.star;
    for (const st of stars) {
      const wrapped = (((st.x - drift) % 1) + 1) % 1;
      const x = Math.round((wrapped * view.w) / s) * s;
      const y = Math.round((st.y * view.h) / s) * s;
      const twinkle = 0.62 + 0.38 * Math.sin(now / st.rate + st.phase);
      ctx.globalAlpha = Math.min(1, sky.stars * st.base * twinkle);
      if (st.size === 3) {
        // The bright ones get a one-pixel cross instead of a fat square.
        ctx.fillRect(x, y - s, s, s * 3);
        ctx.fillRect(x - s, y, s * 3, s);
      } else {
        ctx.fillRect(x, y, st.size * s, st.size * s);
      }
    }
    ctx.globalAlpha = 1;

    // --- shooting stars ---
    const dt = lastNow ? Math.min(64, now - lastNow) : 16;
    lastNow = now;
    if (sky.stars > 0.5 && shooting.length < 2 && Math.random() < dt / 14000) {
      shooting.push({
        x: Math.random() * 0.7 + 0.1,
        y: Math.random() * 0.3,
        vx: Math.random() < 0.5 ? -1 : 1,
        t: 0,
      });
    }
    for (let i = shooting.length - 1; i >= 0; i--) {
      const sh = shooting[i];
      sh.t += dt / 620;
      if (sh.t >= 1) {
        shooting.splice(i, 1);
        continue;
      }
      const hx = (sh.x + sh.vx * sh.t * 0.28) * view.w;
      const hy = (sh.y + sh.t * 0.16) * view.h;
      // A four-pixel tail, fading behind the head.
      for (let k = 0; k < 5; k++) {
        ctx.globalAlpha = sky.stars * (1 - sh.t) * (1 - k / 5) * 0.9;
        ctx.fillRect(
          Math.round((hx - sh.vx * k * 2 * s) / s) * s,
          Math.round((hy - k * s) / s) * s,
          s,
          s,
        );
      }
    }
    ctx.globalAlpha = 1;
  }

  /**
   * The band of light lying on the horizon. Quantised into steps rather than
   * poured out of a gradient, for the same reason the sky is.
   *
   * It starts at the walk line and fades upward over a long stack. Two earlier
   * versions of this were wrong in opposite ways: started at the walk line over
   * a short stack it was buried behind the ridges and nobody ever saw it, and
   * started fifty pixels up it hung a bright bar in mid-air at sunrise, with a
   * hard bottom edge floating wherever no ridge happened to cover it. Running
   * the stack from the ground up means the bottom is always behind terrain and
   * only the fading top shows, which is what a horizon glow is.
   *
   * There is no separate bright pool under the sun any more. It was drawn with
   * the baked orange halo whatever the hour, so on a rainy night it put an
   * orange smear over the dunes under the moon.
   */
  function drawHorizonGlow(ctx, view, sky, gy) {
    if (sky.glowA <= 0.02) return;
    const s = view.scale;
    const bands = 22;
    const bandH = Math.max(s, Math.round((view.h * 0.42) / bands / s) * s);
    ctx.fillStyle = sky.glow;
    for (let i = 0; i < bands; i++) {
      const y = gy - (i + 1) * bandH;
      if (y + bandH < 0) break;
      ctx.globalAlpha = sky.glowA * 0.4 * (1 - i / bands) ** 1.5;
      // Out to the margin like every other full-width pass: a duel shakes the
      // camera by translating the context, and a band that stopped at the
      // frame edge slid off one side and left a cold notch on the other.
      ctx.fillRect(-MARGIN, y, view.w + MARGIN * 2, bandH + 1);
    }
    ctx.globalAlpha = 1;
  }

  // --- tiled layers ---------------------------------------------------------

  /**
   * One tiled strip.
   *
   * `layer.y` is measured from the top of the ground plane, except on a strip
   * that declares `anchor: 'bottom'` — the near fringe does, because it belongs
   * to the bottom edge of the frame rather than to the road. Anchored to the
   * horizon it would climb up the picture on a tall window and sit in mid-air
   * on a short one, and the one thing a foreground has to do is stay in the
   * foreground.
   */
  function drawLayer(ctx, view, layer, cameraX, gy) {
    const sprite = env.layers[layer.name];
    if (!sprite) return;
    const s = view.scale;
    const tileW = LAYER_TILE_W * s;
    const anchorY = layer.anchor === 'bottom' ? view.h : gy - PLANE_RISE * s;
    const y = anchorY + layer.y * s;
    let offset = -((cameraX * layer.speed * s) % tileW);
    if (offset > 0) offset -= tileW;
    const h = sprite.height * s;
    for (let x = offset; x < view.w + tileW; x += tileW) {
      ctx.drawImage(sprite, Math.round(x), Math.round(y), tileW, h);
    }
  }

  /**
   * The floor, drawn one depth band at a time.
   *
   * Same tiled strip as any other layer, cut into `planeBands` horizontal
   * slices and scrolled at each slice's own speed, so the ground nearest the
   * camera outruns the ground by the verge. That is the whole of the 3D in the
   * scene and it is four lines of arithmetic: everything else — the grain
   * growing towards the camera, the props standing in lanes, the shadow pooling
   * under the near edge — is there to keep the eye agreeing with it.
   *
   * The bands are drawn back to front so a band that has been rounded a pixel
   * tall is covered by the one in front of it rather than leaving a seam.
   */
  function drawGroundPlane(ctx, view, cameraX, gy) {
    const sprite = env.layers.ground;
    if (!sprite) return;
    const s = view.scale;
    const tileW = LAYER_TILE_W * s;
    const top = gy - PLANE_RISE * s;
    const bands = planeBands(sprite.height);

    for (const band of bands) {
      const rows = band.y1 - band.y0;
      if (rows <= 0) continue;
      const y = top + band.y0 * s;
      let offset = -((cameraX * band.speed * s) % tileW);
      if (offset > 0) offset -= tileW;
      for (let x = offset; x < view.w + tileW; x += tileW) {
        ctx.drawImage(
          sprite,
          0, band.y0, LAYER_TILE_W, rows,
          Math.round(x), Math.round(y), tileW, rows * s,
        );
      }
    }

    // The floor must reach the bottom of the screen on tall windows.
    const bottom = top + sprite.height * s;
    if (bottom < view.h) {
      ctx.fillStyle = env.groundFill;
      ctx.fillRect(-MARGIN, Math.round(bottom), view.w + MARGIN * 2, view.h - bottom + MARGIN);
    }
  }

  /**
   * Landmarks: one big thing every few hundred paces, on its own world grid.
   *
   * They are placed like the scatter — a seeded cell, a position inside it —
   * but with a spacing measured in screens rather than in paces, and they are
   * drawn against the layer they belong to so the volcano stands on the same
   * plain its foothills do. A biome with none pays nothing.
   */
  function drawLandmarks(ctx, view, cameraX, gy, host) {
    const list = env.landmarks;
    if (!list) return;
    const s = view.scale;
    for (const mark of list) {
      if ((mark.after || 'far') !== host) continue;
      const sprite = env.landmarkArt?.[mark.name];
      if (!sprite) continue;
      const speed = mark.speed ?? 0.15;
      const spacing = mark.spacing || 900;
      const camera = cameraX * speed;
      const baseline = gy - PLANE_RISE * s + (mark.y ?? 0) * s;
      const first = Math.floor((camera - sprite.width) / spacing);
      const last = Math.ceil((camera + view.w / s) / spacing);
      for (let cell = first; cell <= last; cell++) {
        const rng = makeRng((seed + cell * 2246822519 + 0x1a2b) >>> 0);
        if (rng() < (mark.gap ?? 0)) continue;
        const worldX = cell * spacing + rng.range(0, mark.jitter ?? spacing * 0.5);
        const sx = (worldX - camera) * s;
        if (sx < -sprite.width * s || sx > view.w + sprite.width * s) continue;
        drawSprite(ctx, sprite, sx, baseline - sprite.height * s, s, mark.flip !== false && rng.chance(0.5));
      }
    }
  }

  /**
   * The storm deck, faded in over the fair-weather clouds by how much weather
   * is currently out. Rain used to fall out of a clear blue sky; now the sky
   * closes over first, because that is the part of a storm you see coming.
   */
  function drawStormDeck(ctx, view, cameraX, gy) {
    const w = getWeatherState();
    const strength = (STORM_DECK[w.shownId] || 0) * w.intensity;
    if (strength <= 0.01) return;
    // Two passes at different heights and speeds: one deck of cloud has gaps
    // in it by design, and a sky you can see blue through is not a storm.
    ctx.globalAlpha = strength * 0.75;
    drawLayer(ctx, view, { name: 'storm', speed: 0.05, y: -178 }, cameraX, gy);
    ctx.globalAlpha = strength;
    drawLayer(ctx, view, { name: 'storm', speed: 0.09, y: -124 }, cameraX, gy);
    ctx.globalAlpha = 1;
  }

  // --- scatter --------------------------------------------------------------

  /**
   * Roadside props. Two rules, both of them things the old scatter got wrong:
   *
   *  1. A PROP IS LIFTED OFF THE WALK LINE ONLY IF IT IS SCROLLING AT THE SPEED
   *     OF THE ROW IT IS LIFTED ONTO. Props used to be raised 6 and 13 pixels
   *     to fake depth while still travelling at the camera's speed, and a
   *     cactus that is higher up the screen but moving exactly as fast as the
   *     one beside it does not read as further away — it reads as hovering, and
   *     it did. Now the ground under them is a plane with a speed for every row
   *     of it (`planeSpeed`), so a prop planted twelve rows back is drawn
   *     twelve rows up AND scrolls at what that row scrolls at, and the lift
   *     finally means what it always looked like it meant.
   *  2. THEY KEEP THEIR DISTANCE. One prop per cell, placed in the middle half
   *     of it, so no two are ever closer than half a cell.
   */

  /** Pick one entry out of a weighted table with the cell's own generator. */
  function pickEntry(table, total, rng) {
    let roll = rng() * total;
    let entry = table[0];
    for (const e of table) {
      roll -= e.weight;
      if (roll <= 0) {
        entry = e;
        break;
      }
    }
    return entry;
  }

  /**
   * Half the buildings' width, in source pixels, plus a pace either side. A
   * prop rooted inside that window is standing in the doorway.
   */
  const DOOR_CLEARANCE = 26;

  /** Is this world position underneath a shop or an inn? */
  function underStructure(worldX) {
    for (const st of structures) {
      if (Math.abs(st.worldX - worldX) < DOOR_CLEARANCE) return true;
    }
    return false;
  }

  /**
   * One pass of the cell machinery along one lane of the road.
   *
   * Four roadside bands run through here — the verge behind the traveller, the
   * props themselves, the clutter on a much tighter grid, and the near band
   * between him and the camera. Separate bands rather than one tighter table
   * because they want opposite things: props need room around them or the road
   * turns into a hedge, litter needs none at all, and the two outer lanes need
   * a different speed and a different size from either.
   *
   * The cells are counted in the band's OWN camera space — `cameraX * speed` —
   * exactly as the far backdrop band has always done. Counting them in the
   * road's space and then drawing them at another speed is the one thing that
   * cannot work: the two spaces drift apart forever, so props would slide out
   * of the cells that decide whether they exist and start popping in and out
   * of the world a screen and a half from either edge.
   *
   * @param {object} band
   * @param {Array}  band.table   weighted [{ name, weight, flip }]
   * @param {number} band.total   the table's weights, summed
   * @param {number} band.cell    spacing in source pixels
   * @param {number} band.gap     chance a cell is left empty
   * @param {number} band.salt    keeps the bands' generators apart
   * @param {number} band.lane    rows from the walk line: negative is behind
   *   the traveller, positive between him and the camera
   * @param {boolean} [band.shrink] draw a whole pixel step smaller
   */
  function drawBand(ctx, view, cameraX, gy, band) {
    const s = view.scale;
    const speed = band.speed ?? 1;
    const camera = cameraX * speed;
    const first = Math.floor((camera - 60) / band.cell);
    const last = Math.ceil((camera + view.w / s + 60) / band.cell);
    const scale = band.shrink ? Math.max(1, s - 1) : s;
    const baseline = gy + band.lane * s;

    for (let cell = first; cell <= last; cell++) {
      const rng = makeRng((seed + cell * 2654435761 + band.salt) >>> 0);
      if (rng() < band.gap) continue; // empty stretch of road

      const entry = pickEntry(band.table, band.total, rng);
      const sprite = env.props[entry.name];
      if (!sprite) continue;

      const worldX = cell * band.cell + band.cell * (0.25 + rng() * 0.5);
      const sx = (worldX - camera) * s;
      if (sx < -140 * s || sx > view.w + 140 * s) continue;
      /**
       * A saguaro growing through the shop's porch roof was the last thing on
       * the road that gave away that the scenery and the stops were placed by
       * two systems that had never been introduced. The cell is skipped rather
       * than nudged: a prop shoved aside leaves a gap you can see is a gap,
       * and an empty forecourt in front of a building is what a forecourt is.
       *
       * The buildings stand on the road, so the question is asked in the
       * road's space — this band's own position converted back into it — and
       * not in whatever space this band happens to be counting cells in.
       */
      if (underStructure(sx / s + cameraX + sprite.width / 2)) continue;
      // Size varies by a whole pixel step, never a fraction: half-scaled pixel
      // art is mush.
      const drawScale = rng() < 0.3 ? Math.max(1, scale - 1) : scale;
      // 1–2 source pixels of the base sit below its own line, so the prop is
      // bedded into the ground rather than balanced on top of it.
      const sink = (1 + (rng() < 0.4 ? 1 : 0)) * s;
      /**
       * Every second one faces the other way. It costs nothing — the blitter
       * already knew how to mirror — and it doubles the apparent size of the
       * prop set, which matters more here than anywhere else in the game
       * because the road is the one screen the player looks at for minutes at
       * a time. Anything with writing on it, or a shape the eye knows only one
       * way round, opts out with `flip: false` in the scatter table.
       */
      const flip = entry.flip !== false && rng() < 0.5;
      drawSprite(ctx, sprite, sx, baseline + sink - sprite.height * drawScale, drawScale, flip);
    }
  }

  /**
   * The lanes, from the back of the floor to the front of it. Every speed here
   * is `planeSpeed` of the row the lane stands on rather than a number chosen
   * by eye, which is what keeps a prop moving with the ground under it.
   *
   * `VERGE_LANE` is well behind the walk line but still in front of the near
   * ridge, and its props are drawn a step smaller: it is the far side of the
   * road, and the far side of a road is where most of what you see growing
   * beside one actually is. `NEAR_LANE` is the other end of the same idea and
   * the reason the traveller now walks *through* the scene — see `drawNear`.
   */
  const VERGE_LANE = -13;
  const NEAR_LANE = 13;

  const propBand = {
    table: env.scatter,
    total: scatterWeight,
    cell: scatterCell,
    gap: 0.18,
    salt: 0,
    lane: 0,
    speed: 1,
  };

  /**
   * The far verge. It runs the biome's own scatter table — a prairie's far
   * verge is the same grass as its near one — but at a wider spacing, because
   * anything back there is competing with the ridge behind it and a solid hedge
   * of props along the horizon buries the skyline the ridge is there to draw.
   */
  const vergeBand = {
    table: env.scatter,
    total: scatterWeight,
    cell: Math.round(scatterCell * 1.35),
    gap: 0.3,
    salt: 0x7e12,
    lane: VERGE_LANE,
    speed: planeSpeed(PLANE_RISE + VERGE_LANE),
    shrink: true,
  };

  const clutterBand = env.clutter
    ? {
      table: env.clutter,
      total: env.clutter.reduce((sum, e) => sum + e.weight, 0),
      cell: env.clutterCell || 21,
      gap: 0.34,
      salt: 0x51ed,
      lane: 3,
      speed: planeSpeed(PLANE_RISE + 3),
    }
    : null;

  /**
   * The near lane. Only litter goes in it, and only a third of its cells are
   * filled: this is the one band that can stand between the player and his own
   * legs, and a saguaro doing that is a bug however good the parallax is. A
   * pebble and a dry tuft doing it is the scene closing around him.
   */
  const nearBand = env.clutter
    ? {
      table: env.clutter,
      total: env.clutter.reduce((sum, e) => sum + e.weight, 0),
      cell: Math.round((env.clutterCell || 21) * 2.4),
      gap: 0.62,
      salt: 0x2f77,
      lane: NEAR_LANE,
      speed: planeSpeed(PLANE_RISE + NEAR_LANE),
    }
    : null;

  function drawScatter(ctx, view, cameraX, gy) {
    drawBand(ctx, view, cameraX, gy, vergeBand);
    drawBand(ctx, view, cameraX, gy, propBand);
    // Litter last: it lies a few rows nearer the camera than the props do, and
    // a pebble drawn behind the cactus it is lying in front of is a pebble the
    // eye reads as being inside the cactus.
    if (clutterBand) drawBand(ctx, view, cameraX, gy, clutterBand);
  }

  /** The lane in front of the traveller, drawn after he is. */
  function drawNear(ctx, view, cameraX, gy) {
    if (nearBand) drawBand(ctx, view, cameraX, gy, nearBand);
  }

  /**
   * The band behind the near ridge: the same cell machinery, one depth back.
   *
   * Two things make it read as distance rather than as a second row of props.
   * It is washed with the biome's haze (baked in — see `backdropProps` in
   * sprites-environment.js), and it is planted low enough that the ridge in
   * front always covers the base. What is left is a skyline: crowns, spires
   * and roofs standing over the hill, which is all you ever see of a thing
   * that is far away.
   *
   * It is NOT drawn a pixel step smaller, which was the first thing tried and
   * the wrong one. Shrinking it does read as distance, but the ridge it stands
   * behind is drawn at full scale, so a shrunk prop planted low enough to keep
   * its feet hidden had nothing left above the crest — the whole band came out
   * as a row of green tips. A biome that wants the smaller silhouette asks for
   * it with `shrink: true`.
   */
  function drawBackdrop(ctx, view, cameraX, gy) {
    if (!backdrop) return;
    const s = view.scale;
    const cell = backdrop.cell || 96;
    const speed = backdrop.speed ?? 0.4;
    const scale = backdrop.shrink ? Math.max(1, s - 1) : s;
    // Measured from the top of the floor, not from the walk line: this band is
    // planted behind the near ridge, and the near ridge's feet are up there.
    const baseline = gy - PLANE_RISE * s + (backdrop.y ?? -7) * s;
    const camera = cameraX * speed;
    const first = Math.floor((camera - 80) / cell);
    const last = Math.ceil((camera + view.w / s + 80) / cell);

    for (let cellIndex = first; cellIndex <= last; cellIndex++) {
      const rng = makeRng((seed + cellIndex * 40503 + 0x9e3779b9) >>> 0);
      if (rng() < (backdrop.gap ?? 0.3)) continue;

      const entry = pickEntry(backdrop.scatter, backdropWeight, rng);
      const sprite = env.backdropProps[entry.name];
      if (!sprite) continue;

      const worldX = cellIndex * cell + cell * (0.15 + rng() * 0.7);
      const sx = (worldX - camera) * s;
      if (sx < -160 * s || sx > view.w + 160 * s) continue;
      const flip = entry.flip !== false && rng() < 0.5;
      drawSprite(ctx, sprite, sx, baseline - sprite.height * scale, scale, flip);
    }
  }

  // --- structures (shops / inns placed by the encounter generator) ----------

  /**
   * THE DOOR STANDS WHERE THE TRAVELLER DOES
   * -------------------------------------------------------------------------
   * A stop is *reached* the moment the walk engine's distance counter passes
   * the event's world position — and that position used to be drawn at screen
   * x = 0, the left edge of the frame, while the traveller walks a quarter of
   * the way in. So the shop slid past him, off the side of the screen, and
   * only then did the game cut to the counter: you entered a building you had
   * visibly already left behind.
   *
   * Placing the building's middle — which is where both false fronts put their
   * doorway — on the traveller's middle fixes it at the source, and it fixes
   * it for the walk back out too: leaving the shop puts him in the doorway of
   * the building he just came out of.
   */
  function drawStructures(ctx, view, cameraX, gy) {
    const s = view.scale;
    const doorX = heroX(view) + (PLAYER_SIZE.w * s) / 2;
    for (const st of structures) {
      const sprite = env.buildings[st.kind];
      if (!sprite) continue;
      const sx = (st.worldX - cameraX) * s + doorX - (sprite.width * s) / 2;
      if (sx < -sprite.width * s * 1.2 || sx > view.w + sprite.width * s) continue;
      const sy = gy + 4 * s - sprite.height * s;
      drawSprite(ctx, sprite, sx, sy, s);
      if (st.kind === 'forge') drawForgeLife(ctx, sx, sy, s);
      else if (st.kind === 'tailor') drawWindowLight(ctx, sx, sy, s);
    }
  }

  /**
   * THE ONE BUILDING ON THE ROAD YOU CAN SEE INTO
   * -------------------------------------------------------------------------
   * A clothier sells by showing, so its whole front is glass with the stock
   * standing behind it — and unlit glass at this size is a grey panel, which
   * is the one thing it must not read as. So a lamp is laid over exactly the
   * window the art leaves (`TAILOR_GLASS`, measured off the character map) and
   * a little of its light spills onto the boardwalk in front.
   *
   * It breathes rather than flickers: this is an oil lamp behind plate glass in
   * a still room, not a furnace with a fire in it, and giving it the forge's
   * jitter would make the two buildings read as the same building.
   */
  function drawWindowLight(ctx, sx, sy, s) {
    if (!TAILOR_GLASS.w) return;
    const t = performance.now();
    const gx = sx + TAILOR_GLASS.x * s;
    const gy2 = sy + TAILOR_GLASS.y * s;
    const gw = TAILOR_GLASS.w * s;
    const gh = TAILOR_GLASS.h * s;
    const breath = 0.9 + Math.sin(t / 1400) * 0.06 + Math.sin(t / 310) * 0.02;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = `rgba(255, 214, 140, ${0.16 * breath})`;
    ctx.fillRect(gx, gy2, gw, gh);
    const r = gw * 0.9;
    const g = ctx.createRadialGradient(gx + gw / 2, gy2 + gh, 0, gx + gw / 2, gy2 + gh, r);
    g.addColorStop(0, `rgba(255, 206, 120, ${0.2 * breath})`);
    g.addColorStop(0.55, `rgba(200, 140, 60, ${0.07 * breath})`);
    g.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(gx + gw / 2 - r, gy2 + gh - r, r * 2, r * 2);
    ctx.restore();
  }

  /**
   * THE ONE BUILDING ON THE ROAD THAT IS DOING SOMETHING
   * -------------------------------------------------------------------------
   * A shop and an inn are places that will be open when you get there. A forge
   * is a place where somebody is WORKING right now, and a shed with a cold
   * black hole in it says the opposite — so the mouth of the furnace burns as
   * the building scrolls past, throws its light on the ground in front of the
   * shed, and puts smoke out of the chimney.
   *
   * All of it is hung off the art: `FORGE_GLOW` is the hole measured out of
   * the character map and `FORGE_CHIMNEY` is where the stack is, so the fire
   * cannot drift off the brickwork when the building is redrawn.
   *
   * It is cheap on purpose — nine bars of fire, one pool of light and five
   * puffs of smoke — because there can be three of these on screen at once and
   * every one of them is scrolling.
   */
  function drawForgeLife(ctx, sx, sy, s) {
    // Wall clock rather than the scene's own: this is decoration on a building
    // that scrolls past, and `lastNow` is only advanced by the star pass.
    const t = performance.now();
    const fx = sx + FORGE_GLOW.x * s;
    const fy = sy + FORGE_GLOW.y * s;
    const fw = FORGE_GLOW.w * s;
    const fh = FORGE_GLOW.h * s;
    // Two beats a long way from a common multiple, as everywhere else the game
    // draws fire: the flicker never settles into something countable.
    const flicker = 0.8 + Math.sin(t / 180) * 0.12 + Math.sin(t / 47) * 0.08;

    ctx.save();
    ctx.beginPath();
    ctx.rect(fx, fy, fw, fh);
    ctx.clip();
    ctx.fillStyle = PALETTE.magmaDeep;
    ctx.fillRect(fx, fy + fh * 0.35, fw, fh * 0.65);
    const bars = 9;
    for (let i = 0; i < bars; i++) {
      const k = (Math.sin(t / (260 + i * 37) + i * 1.7) + 1) / 2;
      const h = Math.max(s, Math.round((fh * (0.35 + k * 0.6)) / s) * s);
      ctx.fillStyle = i % 3 === 0 ? PALETTE.emberGlow : PALETTE.magma;
      ctx.fillRect(fx + Math.round((i * fw) / bars), fy + fh - h, Math.ceil(fw / bars), h);
    }
    ctx.restore();

    // The light it throws out of the shed, onto the apron in front of it.
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const r = fw * 2.6;
    const g = ctx.createRadialGradient(fx + fw / 2, fy + fh, 0, fx + fw / 2, fy + fh, r);
    g.addColorStop(0, `rgba(255, 150, 60, ${0.34 * flicker})`);
    g.addColorStop(0.5, `rgba(200, 70, 15, ${0.12 * flicker})`);
    g.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(fx + fw / 2 - r, fy + fh - r, r * 2, r * 2);
    ctx.restore();

    // Smoke, climbing and spreading out of the stack. Each puff is on its own
    // loop so the column never repeats.
    const cx = sx + FORGE_CHIMNEY.x * s;
    const cy = sy + FORGE_CHIMNEY.y * s;
    for (let i = 0; i < 5; i++) {
      const k = ((t / 2600 + i / 5) % 1);
      const size = Math.max(s, Math.round((1 + k * 3)) * s);
      ctx.globalAlpha = 0.34 * (1 - k);
      ctx.fillStyle = i % 2 ? PALETTE.grey : PALETTE.greyDark;
      ctx.fillRect(
        Math.round(cx + Math.sin(k * 4 + i) * 3 * s),
        Math.round(cy - k * 26 * s),
        size,
        size,
      );
    }
    ctx.globalAlpha = 1;
  }

  // --- cast shadows ---------------------------------------------------------

  /**
   * The shadow an actor throws on the road.
   *
   * It leans away from whatever is lighting the sky and stretches as that light
   * drops, which is the cheapest honest cue that the figure is standing in this
   * scene at this hour — a fixed blob under the boots says "sprite", a shadow
   * that runs east at dawn and west at dusk says "six in the morning".
   *
   * @param {number} x    left edge of the actor, device pixels
   * @param {number} w    actor width, device pixels
   * @param {number} gy   the walk line
   */
  function drawGroundShadow(ctx, view, x, w, gy) {
    const sky = getSky();
    const s = view.scale;
    const p = sky.sunProgress;
    const arcT = p >= 0 && p <= 1 ? p : (p < 0 ? p + 1 : p - 1);
    const bodyX = view.w * (0.1 + arcT * 0.8);
    const cx = x + w / 2;
    const dir = bodyX > cx ? -1 : 1;
    const e = Math.max(0.05, sky.elevation);
    const len = Math.min(w * 4, w * (0.55 + (1 - e) * 2.6));
    const alpha = (0.1 + e * 0.2) * sky.light;

    ctx.fillStyle = `rgba(24, 16, 12, ${alpha})`;
    // The long cast, one pixel deep.
    ctx.fillRect(
      Math.round((dir > 0 ? cx : cx - len) / s) * s,
      gy,
      Math.round(len / s) * s,
      s,
    );
    /**
     * The pool under the feet, as three rows narrowing towards the camera
     * rather than one flat bar.
     *
     * A shadow is cast on a SURFACE, so its shape says which way that surface
     * is facing: a rectangle says the ground is a wall the figure is standing
     * against, and an ellipse foreshortened along the vertical says the ground
     * is a plane running away from you. It is four extra fillRects and it is
     * the cheapest thing in this file that makes the floor read as a floor.
     */
    const rows = [0.76, 0.58, 0.34];
    for (let i = 0; i < rows.length; i++) {
      const pw = Math.round((w * rows[i]) / s) * s;
      ctx.globalAlpha = 1 - i * 0.22;
      ctx.fillRect(Math.round((cx - pw / 2) / s) * s, gy + i * s, pw, s);
    }
    ctx.globalAlpha = 1;
  }

  // --- ambient light --------------------------------------------------------

  /**
   * The hour of the day — and then the sky behind it.
   *
   * The two veils are drawn `source-atop`, so they land on the desert, the
   * props and whatever the caller drew on top of them, and on nothing else: the
   * sky is still a hole in the canvas at this point, and it stays one until
   * `drawSkyBehind` fills it in underneath. That is what keeps the moon a moon.
   *
   * Two veils, because one is not enough: a dark pass to take the light out and
   * colour the shadows, then a warm pass to put the low sun's colour back into
   * the faces that are still catching it. The dark pass alone gives you a
   * daytime scene with the brightness pulled down; the pair gives you evening.
   */
  function applyLighting(ctx, view) {
    const sky = getSky();
    const gy = groundY(view);
    const darkness = 1 - sky.light;
    if (darkness > 0.02) {
      ctx.save();
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = sky.tint;
      ctx.globalAlpha = Math.min(0.78, darkness);
      ctx.fillRect(-MARGIN, -MARGIN, view.w + MARGIN * 2, view.h + MARGIN * 2);
      ctx.restore();
    }
    if (sky.warmA > 0.01) {
      ctx.save();
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = sky.warm;
      ctx.globalAlpha = sky.warmA * 0.5;
      ctx.fillRect(-MARGIN, -MARGIN, view.w + MARGIN * 2, view.h + MARGIN * 2);
      ctx.restore();
    }

    drawSkyBehind(ctx, view, sky, gy);

    // The world wash goes over the sky too — it is the world's colour, and a
    // violet Galaxy with a plain blue sky over it would be two places at once.
    if (worldTint) {
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = worldTint.color;
      ctx.globalAlpha = worldTint.alpha;
      ctx.fillRect(-MARGIN, -MARGIN, view.w + MARGIN * 2, view.h + MARGIN * 2);
      ctx.restore();
    }
  }

  /**
   * Render the world, unlit and with no sky behind it yet. Draw your actors on
   * top of this, then call `applyLighting` — that lights the pair of you
   * together and drops the sky in behind.
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {{w:number,h:number,scale:number}} view
   * @param {number} cameraX travelled distance in source pixels
   */
  function renderBackdrop(ctx, view, cameraX) {
    const gy = groundY(view);
    lastCameraX = cameraX;
    for (const layer of env.manifest) {
      // The near fringe waits until the road, its props and its buildings are
      // all down: it is the only thing in the manifest that is in FRONT of the
      // scene rather than part of it.
      if (layer.front) continue;
      // The far band goes in behind the last ridge, so that ridge buries its
      // feet. `near` is the biome's own name for that layer — `dunes`,
      // `drifts`, `crags` — and the manifest is where it is written down.
      if (layer.near) drawBackdrop(ctx, view, cameraX, gy);
      if (layer.name === 'ground') drawGroundPlane(ctx, view, cameraX, gy);
      else drawLayer(ctx, view, layer, cameraX, gy);
      // Landmarks stand ON the layer they name, so they go down straight after
      // it and are covered by everything in front of it.
      drawLandmarks(ctx, view, cameraX, gy, layer.name);
      if (layer.name === 'clouds') drawStormDeck(ctx, view, cameraX, gy);
    }
    drawScatter(ctx, view, cameraX, gy);
    drawStructures(ctx, view, cameraX, gy);
    // Whatever the biome keeps in the air BEHIND the traveller — a tumbleweed
    // rolling along the far verge, a bird landed up the road. It goes in here
    // rather than with the rest of the ambient because it is part of the
    // scene: it is occluded by him, and the hour of the day falls on it.
    if (ambient?.renderBehind) ambient.renderBehind(ctx, view, getSky(), ambientContext(view));
  }

  /**
   * Everything on the near side of the traveller: the litter lane between him
   * and the camera, the fringe at the bottom of the frame, and whatever the
   * biome is rolling past in front of him.
   *
   * It is a separate call from `renderBackdrop` for one reason — the caller
   * draws its actors between the two, so the road can pass IN FRONT of them.
   * While the fringe was drawn at the end of the backdrop it was, despite its
   * name and its speed, behind everything on the road.
   */
  function renderForeground(ctx, view, cameraX = lastCameraX) {
    const gy = groundY(view);
    drawNear(ctx, view, cameraX, gy);
    for (const layer of env.manifest) {
      if (layer.front) drawLayer(ctx, view, layer, cameraX, gy);
    }
    if (ambient?.renderFront) ambient.renderFront(ctx, view, getSky(), ambientContext(view));
  }

  // --- ambient life ---------------------------------------------------------

  /**
   * What the air is told about the world it is drifting through: where the
   * floor is, where the camera has got to, and how hard the wind is blowing.
   *
   * The wind is the interesting one. It comes off the weather rather than out
   * of the biome, and it is why a tumbleweed picks up speed when a sandstorm
   * arrives instead of rolling along at its fair-weather pace through a wall of
   * driven sand. Handing it over here — rather than letting the biome art
   * import the weather — keeps `src/art/` a place where nothing knows what a
   * game state is.
   */
  function ambientContext(view) {
    return {
      cameraX: lastCameraX,
      groundY: groundY(view),
      planeTop: planeTop(view),
      wind: getGroundWind(),
    };
  }

  /**
   * Move whatever the biome keeps in the air. Safe to call for a biome with
   * nothing in it — the desert's air is empty and the call is a no-op.
   */
  function updateAmbient(dt, view) {
    if (ambient) ambient.update(dt, view ? ambientContext(view) : { wind: getGroundWind() });
  }

  /**
   * Draw it. This goes AFTER `applyLighting`, unlike everything else: a
   * firefly that dims at night is not a firefly. Each population decides for
   * itself how the hour affects it, from the sky snapshot it is handed.
   */
  function renderAmbient(ctx, view) {
    if (ambient) ambient.render(ctx, view, getSky(), ambientContext(view));
  }

  /** Backdrop, foreground and light in one call, for scenes with nothing to insert. */
  function render(ctx, view, cameraX) {
    renderBackdrop(ctx, view, cameraX);
    renderForeground(ctx, view, cameraX);
    applyLighting(ctx, view);
    renderAmbient(ctx, view);
  }

  return {
    render,
    renderBackdrop,
    renderForeground,
    applyLighting,
    updateAmbient,
    renderAmbient,
    drawGroundShadow,
    groundY,
    planeTop,
    setStructures,
    setTint,
    /** The colour of the dust this ground throws up under boots and hooves. */
    dust: env.dust,
  };
}
