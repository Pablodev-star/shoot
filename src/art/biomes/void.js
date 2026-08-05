/**
 * SHOOT! — Void biome art (the Galaxy).
 *
 * The sixth world, and the last road in the game: a shelf of broken violet
 * stone hanging in open space, with a nebula behind it and crystal growing out
 * of it. Past the last horizon, which is the world's own subtitle and also the
 * literal brief — there is no horizon in this biome, because the ground ends.
 *
 * THE PLACE HAS NO SUN, SO NOTHING IS LIT — IT IS ALL EMITTING
 * ---------------------------------------------------------------------------
 * Every other biome is drawn with a light from the top left, and every prop in
 * them carries a lit face and a shaded one. That rule is suspended here and
 * replaced with a stricter one: the light comes from inside the objects. The
 * crystal glows, the seams in the rock glow, the flowers glow; the rock itself
 * is nearly black, and its "lit" side is only where a glow from the thing next
 * to it lands.
 *
 * The day/night cycle still runs — the sun still crosses, because the sky is
 * shared by the whole game and taking it away here would break the one thing
 * holding the six worlds together — but the ground barely responds to it. The
 * ambient light in this file is written so the biome looks like itself at noon
 * and at midnight, which is exactly what a place with no atmosphere should do.
 *
 * TWO COLOURS, AND THEY ARE OPPOSITES
 * ---------------------------------------------------------------------------
 * Violet rock, aquamarine light. Complementary, so the glow separates from the
 * stone at any value, which is the only way a scene this dark stays readable.
 * The gold of the player's HUD and the red of the lives sit outside both, which
 * is a happy accident worth protecting: do not put warm colours in this biome.
 *
 * SCALE
 * ---------------------------------------------------------------------------
 * The gunslinger is 16 x 24 source pixels. The crystals come to his shoulder,
 * the monolith is twice his height, and the arch is the widest prop in the
 * game — the Galaxy is the one place where something should be bigger than he
 * can account for.
 */

import { PALETTE } from '../palette.js';
import { makeCanvas } from '../pixel.js';
import { makeRng } from '../../core/rng.js';
import { LAYER_TILE_W, makeCloudLayer, makeRidgeLayer } from '../env-kit.js';

export const VOID_PROPS = {
  /**
   * A crystal spire. Faceted rather than shaded: each face is one flat tone,
   * and the edges between them are where the value jumps. Crystal has no
   * gradients in it — that is what makes it crystal and not glass.
   */
  crystalSpire: [
    '.....=.....',
    '....==.....',
    '....=:.....',
    '...==:;....',
    '...=::;....',
    '..:=::;;...',
    '..:=::;;...',
    '..:=:::;...',
    '.:.=::::;..',
    '.:.=::::;..',
    ':..=:::;;..',
    ':..=:::;;.:',
    '=..=::::;.:',
    '=.:=::::;.=',
    ':.:=::::;.:',
    '?!:=::::;!?',
    '?!!?::;;!!?',
    '&?!!??!!!?&',
    '.&??!!!??&.',
    '..&&???&&..',
  ],

  /** A cluster of shorter ones, which is how crystal actually comes up. */
  crystalCluster: [
    '...:.......',
    '...:...=...',
    '..:=;..=;..',
    '..:=;.:=;..',
    '..:=;.:=;.=',
    '.=:=;;:=;.=',
    '.=:=;;:=;;=',
    '.=:=;;:=;;=',
    '!?:=;;:=;;?',
    '?!!??!!;;!?',
    '&??!!!??!?&',
    '.&&??!??&&.',
  ],

  /**
   * A monolith. Cut by somebody, a very long time ago — the only right angle
   * in the biome and therefore the only prop that says anyone was here.
   * The glyph down its face is deliberately not a letter in any alphabet the
   * game uses elsewhere.
   */
  monolith: [
    '.!!!!!!.',
    '!??????&',
    '!??????&',
    '!??==??&',
    '!??:=??&',
    '!???=??&',
    '!??:=:?&',
    '!???=??&',
    '!??==??&',
    '!??????&',
    '!??:???&',
    '!???:??&',
    '!??????&',
    '!??????&',
    '!!?????&',
    '&!?????&',
    '&&!???&&',
    '.&&???&&',
    '..&&&&&.',
  ],

  /**
   * An arch of stone with nothing holding it up but the fact that it has not
   * fallen yet. It frames a piece of empty sky, and the empty sky is the
   * point: this is the prop that tells the player the ground is a shelf.
   */
  voidArch: [
    '.....&&&&&&&&&&.....',
    '...&&!!!!!!!!!!&&...',
    '..&!!????????!!!!&..',
    '.&!??&&&&&&&&&&??!&.',
    '.&!?&&........&&?!&.',
    '&!??&............&?&',
    '&!?&..............&&',
    '&!?&...............&',
    '&!?&...............&',
    '&!?&...............&',
    '&!?&...............&',
    '&!?&...............&',
    '&!??&.............&&',
    '&!!?&.............&&',
    '&&!?&.............&&',
    '.&!?&..............&',
    '.&!?&..............&',
    '&&!??&............&&',
    '&&&??&&..........&&&',
    '.&&&&&&..........&&.',
  ],

  /**
   * A stone that is not touching the ground. It has a shadow anyway, because
   * a hovering object with nothing under it reads as a sprite that failed to
   * land — the shadow is what makes it deliberate.
   */
  floatStone: [
    '..!!!!!...',
    '.!??????..',
    '!????????.',
    '!???::???&',
    '.!??:::??&',
    '..&!????&.',
    '...&&&&&..',
    '..........',
    '...::::...',
    '..&&&&&&..',
  ],

  /**
   * Void bloom: something growing here, which should be surprising. Its head
   * is the brightest single object the biome has, and it is the only prop that
   * is anywhere near symmetrical.
   */
  voidBloom: [
    '....=.....',
    '...=:=....',
    '..=:::=...',
    '..=:=:=...',
    '...=:=....',
    '....:.....',
    '....;.....',
    '...:;.....',
    '....;:....',
    '....;.....',
    '..:.;.:...',
    '...;;;....',
    '..!???!...',
    '..&???&...',
    '...&&&....',
  ],

  /** A shard driven into the shelf at an angle, with the strike still lit. */
  shardLeaning: [
    '.......=..',
    '......=:..',
    '.....=::..',
    '.....=:;..',
    '....=::;..',
    '....=::;..',
    '...=::;;..',
    '...=::;...',
    '..=::;;...',
    '..=::;....',
    '.!?::;?!..',
    '.&?!;!??&.',
    '..&&???&..',
    '...&&&&&..',
  ],

  /**
   * A meteorite, still half buried in the crater it made. Iron, not stone —
   * the one grey object in the biome, and the shelf's only visitor.
   */
  meteorite: [
    '...YyYy...',
    '..YYyyvv..',
    '.YvYyyvvv.',
    'YYyyvyyvvv',
    '.YyvyyvvY.',
    '..yyvvvv..',
    '.!??!!??!.',
    '&&??!!??&&',
    '.&&&??&&&.',
  ],

  /**
   * Broken column: something that stood up out here once, and does not now.
   * Three drums left of what must have been a dozen.
   */
  brokenColumn: [
    '.!?????!..',
    '.!??:??&..',
    '.!?????&..',
    '.&?????&..',
    '..!????!..',
    '.!?????!..',
    '.!??:??&..',
    '.&?????&..',
    '!???????!.',
    '!???:???&.',
    '&???????&.',
    '.&&???&&..',
    '..&&&&&...',
  ],

  /**
   * A vent of dust standing straight up. There is no wind out here to bend it,
   * which is the whole reason it is drawn as a column rather than a plume —
   * the absence of weather is a thing that can be drawn.
   */
  dustVent: [
    '....;.....',
    '...;:;....',
    '...;:;....',
    '..;;:;;...',
    '..;:::;...',
    '..;:::;...',
    '.;;:::;;..',
    '.;::::;;..',
    '.;::::;;..',
    ';;::::;;;.',
    '!??::::??!',
    '&??????!?&',
    '.&&????&&.',
    '..&&&&&&..',
  ],

  /**
   * The rib of something that died here before anything else arrived. It is
   * bone, which is a colour from the rest of the game — the point being that
   * whatever this was, it came from somewhere with a sun.
   */
  ribArch: [
    '..bB.....Bb..',
    '.bBB.....BBb.',
    'bBB.......BBb',
    'bB.........Bb',
    'bB.........Bb',
    'bB.........Bb',
    'bB.........Bb',
    'bB.........Bb',
    'bB.........Bb',
    '!?!.......!?!',
    '&?&.......&?&',
    '.&&.......&&.',
  ],

  /** Rubble. Every shelf has some, and it is what the eye rests on. */
  voidRubble: [
    '...!?!....',
    '..!???!.!.',
    '.!?????!?!',
    '&??:??&??&',
    '.&????&&&.',
    '..&&&&&...',
  ],
};

// ---------------------------------------------------------------------------
// Layers
// ---------------------------------------------------------------------------

/**
 * The nebula band. It replaces the cloud layer every other biome has, and it
 * is built from the same generator — a cloud is a soft blob and so is a
 * nebula; what changes is that this one is violet, sits still, and has stars
 * behind it rather than sky.
 *
 * The stars are baked INTO the layer rather than left to the sky's own star
 * field, because these ones have to scroll with the parallax. The sky's stars
 * are infinitely far away and do not move; these are the near ones.
 */
function nebulaStars(canvas, seed) {
  const ctx = canvas.getContext('2d');
  const rng = makeRng(seed);
  ctx.globalCompositeOperation = 'destination-over';
  for (let i = 0; i < 140; i++) {
    const x = rng.int(0, LAYER_TILE_W - 1);
    const y = rng.int(0, canvas.height - 1);
    const r = rng();
    ctx.globalAlpha = rng.range(0.35, 1);
    ctx.fillStyle = r < 0.7 ? PALETTE.star : r < 0.92 ? PALETTE.astralLight : PALETTE.bloomPink;
    ctx.fillRect(x, y, 1, 1);
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  return canvas;
}

/**
 * Lit veins running through the far shelf, and the odd crystal on its skyline.
 * At this distance a crystal is two pixels and a light, which is all it needs
 * to be for the eye to know what the middle distance is made of.
 */
function farVeins(ctx, heights, rng, height) {
  for (let i = 0; i < 30; i++) {
    let x = rng.int(0, LAYER_TILE_W - 1);
    let y = height - heights[x] + rng.int(2, 6);
    const len = rng.int(4, 14);
    for (let t = 0; t < len; t++) {
      const px = ((x % LAYER_TILE_W) + LAYER_TILE_W) % LAYER_TILE_W;
      if (y >= height) break;
      ctx.globalAlpha = 0.5 - (t / len) * 0.35;
      ctx.fillStyle = PALETTE.astralDark;
      ctx.fillRect(px, y, 1, 1);
      y += 1;
      x += rng.int(-1, 1);
    }
  }
  ctx.globalAlpha = 1;
  for (let i = 0; i < 16; i++) {
    const cx = rng.int(0, LAYER_TILE_W - 1);
    const base = height - heights[cx];
    const h = rng.int(3, 7);
    ctx.fillStyle = PALETTE.voidRockDark;
    ctx.fillRect(cx, base - h, 1, h);
    ctx.fillStyle = PALETTE.astralDark;
    ctx.fillRect(cx, base - h, 1, 2);
  }
}

/**
 * The middle shelf's crystal field: taller spires, lit down one edge, packed
 * enough to read as terrain rather than as scenery.
 */
function crystalField(ctx, heights, rng, height) {
  for (let i = 0; i < 40; i++) {
    const cx = rng.int(0, LAYER_TILE_W - 1);
    const base = height - heights[cx] + 1;
    const h = rng.int(5, 14);
    const half = rng.int(1, 2);
    for (let dy = 0; dy < h; dy++) {
      const k = dy / h;
      const w = Math.round(half * k);
      for (let dx = -w; dx <= w; dx++) {
        const x = ((cx + dx) % LAYER_TILE_W + LAYER_TILE_W) % LAYER_TILE_W;
        ctx.fillStyle = dx <= -w ? PALETTE.astralDark : PALETTE.voidRockDark;
        ctx.fillRect(x, base - h + dy, 1, 1);
      }
    }
    ctx.fillStyle = PALETTE.astral;
    ctx.fillRect(cx, base - h, 1, 1);
  }
}

/**
 * The near shelf breaking up along its crest: plates tilted out of line, and a
 * thin astral rim where the crack goes all the way through and something on
 * the other side is lit.
 */
function shelfEdge(ctx, heights, rng, height) {
  for (let x = 0; x < LAYER_TILE_W; x++) {
    const top = height - heights[x];
    const prev = heights[(x - 1 + LAYER_TILE_W) % LAYER_TILE_W];
    if (heights[x] !== prev) {
      ctx.globalAlpha = 0.45;
      ctx.fillStyle = PALETTE.astralDark;
      ctx.fillRect(x, top, 1, 1);
      ctx.globalAlpha = 1;
    }
    if (rng.chance(0.045)) {
      ctx.fillStyle = PALETTE.astral;
      ctx.fillRect(x, top + rng.int(2, 6), 1, rng.int(1, 3));
    }
  }
}

/**
 * The ground: a dust road over a shelf of fractured stone, with the cracks
 * open to whatever is underneath.
 *
 * The one decision that made this work was giving the road a pale dust surface
 * instead of drawing bare rock. A black road under a black sky gave the walk
 * no floor at all — the character appeared to be sliding through the middle of
 * a starfield — and the dust is what he is now unmistakably standing on.
 *
 * Below it the shelf breaks apart towards the camera and the gaps show sky,
 * with stars in them. That is the only place in the game where something drawn
 * BELOW the walk line is further away than the horizon.
 */
function makeVoidGround({ seed, height }) {
  const { canvas, ctx } = makeCanvas(LAYER_TILE_W, height);
  const rng = makeRng(seed);

  ctx.fillStyle = PALETTE.voidRockDark;
  ctx.fillRect(0, 0, LAYER_TILE_W, height);

  // --- the dust road ---
  const bot = new Array(LAYER_TILE_W);
  for (let x = 0; x < LAYER_TILE_W; x++) {
    const u = x / LAYER_TILE_W;
    bot[x] = Math.round(21 + Math.sin(u * Math.PI * 2 + 0.8) * 2.6 + Math.sin(u * Math.PI * 7) * 1.1);
    ctx.fillStyle = PALETTE.voidRock;
    ctx.fillRect(x, 0, 1, bot[x]);
    ctx.fillStyle = PALETTE.voidRockLight;
    ctx.fillRect(x, 0, 1, 2);
    ctx.fillStyle = PALETTE.voidRockDark;
    ctx.fillRect(x, bot[x] - 2, 1, 2);
  }

  // Dust: a pale scatter over the road, denser along its middle where it has
  // been walked. There is nothing to blow it about, so it stays where it fell.
  for (let i = 0; i < 900; i++) {
    const x = rng.int(0, LAYER_TILE_W - 1);
    const mid = bot[x] * 0.5;
    const y = Math.round(mid + (rng() + rng() - 1) * bot[x] * 0.5);
    if (y < 0 || y >= bot[x]) continue;
    ctx.globalAlpha = rng.range(0.25, 0.8);
    ctx.fillStyle = rng.chance(0.25) ? PALETTE.astralDark : PALETTE.voidRockLight;
    ctx.fillRect(x, y, 1, 1);
  }
  ctx.globalAlpha = 1;

  // Glowing seams in the road surface itself.
  for (let i = 0; i < 12; i++) {
    let x = rng.int(0, LAYER_TILE_W - 1);
    let y = rng.int(1, 6);
    const len = rng.int(5, 16);
    for (let t = 0; t < len; t++) {
      const px = ((x % LAYER_TILE_W) + LAYER_TILE_W) % LAYER_TILE_W;
      if (y >= bot[px] - 1) break;
      ctx.globalAlpha = 0.7 - (t / len) * 0.5;
      ctx.fillStyle = PALETTE.astralDark;
      ctx.fillRect(px, y, 1, 1);
      y += 1;
      x += rng.int(-1, 1);
    }
  }
  ctx.globalAlpha = 1;

  // --- the shelf breaking up in front of the road ---
  for (let x = 0; x < LAYER_TILE_W; x++) {
    ctx.fillStyle = PALETTE.voidRockDark;
    ctx.fillRect(x, bot[x], 1, height - bot[x]);
  }

  /**
   * The gaps. Each one is a hole in the shelf: black, with a star or two in
   * it and an astral rim along its upper edge where the broken face catches
   * the light from below. They get bigger towards the camera, so the ground
   * the player is standing on is visibly the last solid part of it.
   */
  for (let i = 0; i < 26; i++) {
    const cx = rng.int(0, LAYER_TILE_W - 1);
    const depth = rng.range(0, 1);
    const cy = Math.round(bot[cx] + 4 + depth * (height - bot[cx] - 8));
    const rx = Math.round(3 + depth * 14);
    const ry = Math.round(1 + depth * 4);
    for (let y = -ry; y <= ry; y++) {
      const half = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry + 0.001))));
      for (let dx = -half; dx <= half; dx++) {
        const x = ((cx + dx) % LAYER_TILE_W + LAYER_TILE_W) % LAYER_TILE_W;
        const yy = cy + y;
        if (yy < 0 || yy >= height) continue;
        ctx.fillStyle = y === -ry ? PALETTE.astralDark : PALETTE.cosmicHigh;
        ctx.fillRect(x, yy, 1, 1);
      }
    }
    // Stars in the hole.
    for (let k = 0; k < rx / 3; k++) {
      const x = ((cx + rng.int(-rx + 1, rx - 1)) % LAYER_TILE_W + LAYER_TILE_W) % LAYER_TILE_W;
      const yy = cy + rng.int(-ry + 1, ry);
      if (yy < 0 || yy >= height) continue;
      ctx.globalAlpha = rng.range(0.4, 1);
      ctx.fillStyle = PALETTE.star;
      ctx.fillRect(x, yy, 1, 1);
    }
    ctx.globalAlpha = 1;
  }

  // Rubble on the broken part, catching a little light on its upper faces.
  for (let i = 0; i < 220; i++) {
    const x = rng.int(0, LAYER_TILE_W - 1);
    const y = rng.int(bot[x] + 1, height - 1);
    ctx.fillStyle = rng.chance(0.3) ? PALETTE.voidRock : PALETTE.voidRockDark;
    ctx.fillRect(x, y, rng.chance(0.3) ? 2 : 1, 1);
  }

  return canvas;
}

// ---------------------------------------------------------------------------
// Ambient
// ---------------------------------------------------------------------------

/**
 * The air, except that there is none.
 *
 *   motes    dust rising rather than falling, and never settling. Nothing out
 *            here pulls anything down, and that single reversal does more to
 *            sell the place than any amount of purple would
 *   sparks   crystal catching light that is not there, in pairs and threes
 *   drift    a slow shoal of debris crossing the frame, all at one speed,
 *            because everything in orbit is going the same way
 *
 * None of the three cares what hour it is. This is the only biome whose
 * ambient ignores the sky, and that is written into it rather than being an
 * oversight — see the note at the top of the file.
 */
function createVoidAmbient(seed) {
  const rng = makeRng(seed >>> 0);
  let clock = 0;

  const motes = Array.from({ length: 36 }, () => ({
    x: rng(),
    y: rng(),
    vy: rng.range(-0.05, -0.012),
    sway: rng.range(0.002, 0.01),
    rate: rng.range(1800, 5200),
    phase: rng.range(0, Math.PI * 2),
    a: rng.range(0.2, 0.6),
    cold: rng.chance(0.35),
  }));

  const sparks = Array.from({ length: 18 }, () => ({
    x: rng(),
    y: rng.range(0.55, 0.95),
    rate: rng.range(1600, 5000),
    phase: rng.range(0, Math.PI * 2),
  }));

  const debris = Array.from({ length: 7 }, () => ({
    x: rng(),
    y: rng.range(0.08, 0.5),
    vx: -0.012,
    size: rng.chance(0.3) ? 2 : 1,
    a: rng.range(0.25, 0.7),
  }));

  return {
    update(dt) {
      clock += dt;
      const step = dt / 1000;
      for (const m of motes) {
        m.y += m.vy * step;
        m.x += Math.sin(clock / m.rate + m.phase) * m.sway * step;
        if (m.y < -0.05) {
          m.y = 1.05;
          m.x = rng();
        }
      }
      for (const d of debris) {
        d.x += d.vx * step;
        if (d.x < -0.05) {
          d.x = 1.05;
          d.y = rng.range(0.08, 0.5);
        }
      }
    },

    render(ctx, view) {
      const s = view.scale;

      for (const d of debris) {
        ctx.globalAlpha = d.a;
        ctx.fillStyle = PALETTE.voidRockLight;
        ctx.fillRect(
          Math.round((d.x * view.w) / s) * s,
          Math.round((d.y * view.h) / s) * s,
          s * d.size,
          s * d.size,
        );
      }

      for (const m of motes) {
        ctx.globalAlpha = m.a;
        ctx.fillStyle = m.cold ? PALETTE.astralLight : PALETTE.bloomCream;
        ctx.fillRect(
          Math.round((m.x * view.w) / s) * s,
          Math.round((m.y * view.h) / s) * s,
          s,
          s,
        );
      }
      ctx.globalAlpha = 1;

      for (const sp of sparks) {
        const pulse = Math.sin(clock / sp.rate * 4 + sp.phase);
        if (pulse < 0.9) continue;
        const a = (pulse - 0.9) / 0.1;
        const x = Math.round((sp.x * view.w) / s) * s;
        const y = Math.round((sp.y * view.h) / s) * s;
        ctx.globalAlpha = a * 0.5;
        ctx.fillStyle = PALETTE.astral;
        ctx.fillRect(x - s, y, s * 3, s);
        ctx.fillRect(x, y - s, s, s * 3);
        ctx.globalAlpha = a;
        ctx.fillStyle = PALETTE.astralLight;
        ctx.fillRect(x, y, s, s);
      }
      ctx.globalAlpha = 1;
    },
  };
}

// ---------------------------------------------------------------------------

export const VOID_ART = {
  id: 'void',

  props: VOID_PROPS,

  /**
   * The stack is nebula, far shelf, crystal field, near shelf, road. It is the
   * same five-layer skeleton every biome uses, which matters more here than
   * anywhere: the Galaxy is the one world that could plausibly have been drawn
   * as a special case, and the moment it stops being a biome like the others it
   * stops being somewhere the player walks and becomes a cut-scene.
   *
   * So it goes through the same generators, obeys the same manifest, scatters
   * props on the same grid, and the buildings land on it exactly as they land
   * on the prairie. There is a shop out here. Somebody is running it.
   */
  buildLayers: () => ({
    clouds: nebulaStars(
      makeCloudLayer({
        seed: 3131,
        height: 64,
        count: 8,
        size: [6, 14],
        tones: [PALETTE.purple, PALETTE.purpleDark, PALETTE.cosmic],
      }),
      917,
    ),
    far: makeRidgeLayer({
      seed: 5252,
      height: 82,
      baseline: 34,
      amplitude: 22,
      // Broken rather than rolling: this shelf did not erode into shape, it
      // shattered into one.
      roughness: 0.85,
      colors: {
        body: PALETTE.voidRockDark,
        light: PALETTE.voidRock,
        dark: PALETTE.cosmicHigh,
      },
      decorate: farVeins,
    }),
    mid: makeRidgeLayer({
      seed: 6363,
      height: 66,
      baseline: 24,
      amplitude: 13,
      roughness: 0.9,
      colors: { body: PALETTE.voidRock, light: PALETTE.voidRockLight, dark: PALETTE.voidRockDark },
      decorate: crystalField,
    }),
    shelf: makeRidgeLayer({
      seed: 7474,
      height: 38,
      baseline: 16,
      amplitude: 8,
      roughness: 1,
      colors: { body: PALETTE.voidRockDark, light: PALETTE.voidRock, dark: PALETTE.cosmicHigh },
      crest: 2,
      decorate: shelfEdge,
    }),
    ground: makeVoidGround({ seed: 8585, height: 72 }),
  }),

  manifest: [
    { name: 'clouds', speed: 0.05, y: -118 },
    { name: 'far', speed: 0.15, y: -82 },
    { name: 'mid', speed: 0.4, y: -58 },
    { name: 'shelf', speed: 0.7, y: -38 },
    { name: 'ground', speed: 1.0, y: 0 },
  ],

  /**
   * Sparse — sparser than the desert. The Galaxy is a short world and an empty
   * one, and the emptiness is what makes the few things standing on it feel
   * like they were put there rather than grown.
   */
  scatter: [
    { name: 'voidRubble', weight: 20 },
    { name: 'crystalCluster', weight: 16 },
    { name: 'shardLeaning', weight: 12 },
    { name: 'crystalSpire', weight: 10 },
    { name: 'floatStone', weight: 9 },
    { name: 'brokenColumn', weight: 7 },
    { name: 'voidBloom', weight: 6 },
    { name: 'meteorite', weight: 6 },
    { name: 'dustVent', weight: 5 },
    { name: 'monolith', weight: 4 },
    { name: 'ribArch', weight: 3 },
    { name: 'voidArch', weight: 2 },
  ],

  scatterCell: 84,

  groundFill: PALETTE.cosmicHigh,

  /** Dust kicked in a vacuum goes up and stays up. It is also the wrong colour. */
  dust: 'rgba(162, 247, 236, 0.3)',

  /** The buildings are bolted to the shelf. */
  structureGround: { r: PALETTE.voidRockDark, s: PALETTE.voidRock },

  ambient: createVoidAmbient,
};
