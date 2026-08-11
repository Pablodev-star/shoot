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
import {
  LAYER_TILE_W,
  bandFit,
  bandRange,
  makeCloudLayer,
  makeRidgeLayer,
  planePebble,
  planeZoom,
} from '../env-kit.js';

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

  // --- clutter -------------------------------------------------------------
  // The litter band, on its own tight grid under the props. Out here it is
  // rubble off the shelf and one seed of the light that grows into the spires
  // — the only thing in the game's last landscape that suggests it is not
  // finished breaking.

  /** Chips of the shelf, sharp-edged because nothing has weathered them. */
  shardChip: [
    '..!?.....',
    '.!??&.!?.',
    '!???&!??&',
    '&&&&.&&&.',
  ],

  /** Grit, with one facet catching whatever light there is. */
  voidGrit: [
    '...!.....',
    '.!?&.!?..',
    '?&..!??&.',
    '&....&&..',
  ],

  /** A seed of crystal, a hundred years off being a spire. */
  astralSeed: [
    '....=....',
    '...=:;...',
    '..:=:;;..',
    '..!??!;..',
    '..&&&&...',
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
 * The near edge of the shelf: the last of the rock between the traveller and
 * whatever is under it, with crystal growing up out of the break.
 *
 * The one rule this fringe follows that the other five do not: it is allowed
 * to have holes in it. Every other biome's near band is solid ground going
 * into shadow, and out here the ground is a broken plate — so the bottom of
 * the frame is rock, then gaps with stars in them, which is the same argument
 * the ground layer makes and the reason this world reads as a place with
 * nothing under it.
 */
function makeVoidFringe({ seed, height }) {
  return makeRidgeLayer({
    seed,
    height,
    baseline: Math.round(height * 0.55),
    amplitude: 5,
    roughness: 1,
    crest: 2,
    colors: { body: PALETTE.cosmicHigh, light: PALETTE.voidRockDark, dark: PALETTE.shadow },
    decorate: (ctx, heights, rng, h) => {
      for (let x = 0; x < LAYER_TILE_W; x++) {
        const top = h - heights[x];
        // Crystal along the break, lit from inside.
        if (rng.chance(0.07)) {
          const len = rng.int(3, 7);
          ctx.fillStyle = PALETTE.astralDark;
          ctx.fillRect(x, top - len, 1, len);
          ctx.fillStyle = PALETTE.astral;
          ctx.fillRect(x, top - len, 1, 2);
        }
        // A cold rim light along the very lip, which is the only thing keeping
        // the near rock from merging into the near sky.
        if (rng.chance(0.5)) {
          ctx.fillStyle = PALETTE.voidRock;
          ctx.fillRect(x, top, 1, 1);
        }
      }
      // Gaps: columns punched clean through the plate, with a star in some of
      // them. Drawn as erasures so whatever is behind the layer shows.
      ctx.globalCompositeOperation = 'destination-out';
      for (let i = 0; i < 14; i++) {
        const x = rng.int(0, LAYER_TILE_W - 1);
        const w = rng.int(2, 7);
        const top = h - heights[x] + rng.int(2, 6);
        ctx.fillStyle = '#000';
        ctx.fillRect(x, top, w, h - top);
      }
      ctx.globalCompositeOperation = 'source-over';
    },
  });
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

  /**
   * The road runs from row 8 to row 40 with the walk line at 22, so there is
   * shelf on both sides of the traveller. Out here that is worth more than in
   * any other biome: the drop is what this place IS, and with the road along
   * the top edge of the layer the only drop you could see was the one in front
   * of you. Now the plate breaks up behind him as well.
   */
  const roadTop = 8;
  const roadBot = 40;

  ctx.fillStyle = PALETTE.voidRockDark;
  ctx.fillRect(0, 0, LAYER_TILE_W, height);

  // --- the dust road ---
  ctx.fillStyle = PALETTE.voidRock;
  ctx.fillRect(0, roadTop, LAYER_TILE_W, roadBot - roadTop);
  /**
   * The lit lip along the far edge of the road, and the dark one along the
   * near edge. Both are broken with a dithered row rather than being drawn
   * solid: two unbroken rows of the palest violet running the full width of the
   * tile is a straight line 320 pixels long, and against a ground this dark it
   * reads as a bright rule ruled across the frame rather than as the edge of
   * anything. A row that is half road and half shelf reads as a crumbling edge
   * and — unlike the wandering lip this replaced — it survives the floor being
   * scrolled in depth bands.
   */
  ctx.fillStyle = PALETTE.voidRockLight;
  ctx.fillRect(0, roadTop, LAYER_TILE_W, 1);
  for (let x = 0; x < LAYER_TILE_W; x++) {
    if (rng.chance(0.45)) {
      ctx.fillStyle = PALETTE.voidRockLight;
      ctx.fillRect(x, roadTop + 1, 1, 1);
    }
    if (rng.chance(0.5)) {
      ctx.fillStyle = PALETTE.voidRock;
      ctx.fillRect(x, roadTop - 1, 1, 1);
    }
  }
  ctx.fillStyle = PALETTE.voidRockDark;
  ctx.fillRect(0, roadBot - 2, LAYER_TILE_W, 2);

  // Dust: a pale scatter over the road, denser along its middle where it has
  // been walked. There is nothing to blow it about, so it stays where it fell.
  for (let i = 0; i < 900; i++) {
    const x = rng.int(0, LAYER_TILE_W - 1);
    const mid = (roadTop + roadBot) / 2;
    const y = Math.round(mid + (rng() + rng() - 1) * (roadBot - roadTop) * 0.5);
    if (y < roadTop || y >= roadBot) continue;
    ctx.globalAlpha = rng.range(0.25, 0.8);
    ctx.fillStyle = rng.chance(0.25) ? PALETTE.astralDark : PALETTE.voidRockLight;
    ctx.fillRect(x, y, Math.max(1, Math.round(planeZoom(y, height) - 0.5)), 1);
  }
  ctx.globalAlpha = 1;

  // Glowing seams in the road surface itself, each inside one depth band.
  for (let i = 0; i < 16; i++) {
    let x = rng.int(0, LAYER_TILE_W - 1);
    let y = rng.int(roadTop + 1, roadBot - 3);
    const [bandTop, bandBottom] = bandRange(y, height);
    const len = rng.int(5, 16);
    const dir = rng.chance(0.5) ? 1 : -1;
    for (let t = 0; t < len; t++) {
      const px = ((x % LAYER_TILE_W) + LAYER_TILE_W) % LAYER_TILE_W;
      if (y < bandTop || y >= bandBottom || y >= roadBot - 1) break;
      ctx.globalAlpha = 0.7 - (t / len) * 0.5;
      ctx.fillStyle = PALETTE.astralDark;
      ctx.fillRect(px, y, 1, 1);
      x += dir;
      if (rng.chance(0.35)) y += rng.chance(0.5) ? 1 : -1;
    }
  }
  ctx.globalAlpha = 1;

  // --- the shelf, breaking up on both sides of the road ---
  ctx.fillStyle = PALETTE.voidRockDark;
  ctx.fillRect(0, 0, LAYER_TILE_W, roadTop);
  ctx.fillRect(0, roadBot, LAYER_TILE_W, height - roadBot);

  /**
   * The gaps. Each one is a hole in the shelf: black, with a star or two in it
   * and an astral rim along its upper edge where the broken face catches the
   * light from below. They get bigger towards the camera, so the ground the
   * player is standing on is visibly the last solid part of it — and the few
   * behind him are small, which is the same perspective every other floor in
   * the game is drawn to.
   */
  for (let i = 0; i < 30; i++) {
    const far = rng.chance(0.3);
    const cx = rng.int(0, LAYER_TILE_W - 1);
    const seedY = far
      ? rng.int(1, Math.max(2, roadTop - 2))
      : rng.int(roadBot + 2, height - 4);
    const zoom = planeZoom(seedY, height);
    const rx = Math.round(rng.range(3, 12) * zoom);
    const ry = Math.max(1, Math.round(rng.range(1, 2.4) * zoom));
    const cy = bandFit(seedY, ry * 2 + 1, height);
    for (let y = 0; y <= ry * 2; y++) {
      const k = (y - ry) / (ry + 0.001);
      const half = Math.round(rx * Math.sqrt(Math.max(0, 1 - k * k)));
      for (let dx = -half; dx <= half; dx++) {
        const x = ((cx + dx) % LAYER_TILE_W + LAYER_TILE_W) % LAYER_TILE_W;
        const yy = cy + y;
        if (yy < 0 || yy >= height) continue;
        ctx.fillStyle = y === 0 ? PALETTE.astralDark : PALETTE.cosmicHigh;
        ctx.fillRect(x, yy, 1, 1);
      }
    }
    // Stars in the hole.
    for (let k = 0; k < rx / 3; k++) {
      const x = ((cx + rng.int(-rx + 1, rx - 1)) % LAYER_TILE_W + LAYER_TILE_W) % LAYER_TILE_W;
      const yy = cy + rng.int(1, Math.max(1, ry * 2 - 1));
      if (yy < 0 || yy >= height) continue;
      ctx.globalAlpha = rng.range(0.4, 1);
      ctx.fillStyle = PALETTE.star;
      ctx.fillRect(x, yy, 1, 1);
    }
    ctx.globalAlpha = 1;
  }

  // Rubble on the broken part, catching a little light on its upper faces.
  for (let i = 0; i < 120; i++) {
    planePebble(ctx, rng, {
      height,
      y: rng.chance(0.3) ? rng.int(1, Math.max(2, roadTop - 2)) : rng.int(roadBot, height - 3),
      colors: {
        body: rng.chance(0.3) ? PALETTE.voidRock : PALETTE.voidRockDark,
        light: PALETTE.voidRockLight,
        shadow: PALETTE.cosmicHigh,
      },
    });
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
    fringe: makeVoidFringe({ seed: 5757, height: 26 }),
  }),

  manifest: [
    { name: 'clouds', speed: 0.05, y: -118 },
    { name: 'far', speed: 0.15, y: -82 },
    { name: 'mid', speed: 0.4, y: -58 },
    { name: 'shelf', speed: 0.7, y: -38, near: true },
    { name: 'ground', speed: 1.0, y: 0 },
    { name: 'fringe', speed: 1.9, y: -15, anchor: 'bottom', front: true },
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

  /**
   * Chips off the shelf and one seed of light. The emptiest litter band in the
   * game after the pass's, because this road is meant to feel like the last
   * one — but not empty enough to be bare, which is what it was.
   */
  clutter: [
    { name: 'shardChip', weight: 12 },
    { name: 'voidGrit', weight: 10 },
    { name: 'astralSeed', weight: 5 },
  ],
  clutterCell: 25,

  /**
   * The far band: monoliths and spires on the shelf behind the road. The haze
   * is the astral light rather than a rock tone — there is no air out here to
   * grey anything out, so distance is read from the glow that hangs around
   * everything instead.
   */
  backdrop: {
    cell: 92,
    y: -7,
    gap: 0.34,
    haze: PALETTE.astralDark,
    hazeA: 0.3,
    scatter: [
      { name: 'monolith', weight: 20 },
      { name: 'crystalSpire', weight: 16 },
      { name: 'brokenColumn', weight: 10 },
    ],
  },

  scatterCell: 84,

  groundFill: PALETTE.cosmicHigh,

  /** Dust kicked in a vacuum goes up and stays up. It is also the wrong colour. */
  dust: 'rgba(162, 247, 236, 0.3)',

  /** The buildings are bolted to the shelf. */
  structureGround: { r: PALETTE.voidRockDark, s: PALETTE.voidRock },

  ambient: createVoidAmbient,
};
