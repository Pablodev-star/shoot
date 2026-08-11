/**
 * SHOOT! — Interior backdrop for the shop and the inn.
 *
 * These used to be the same picture: a plank wall, one lantern hung off to the
 * left, and floating dust. Two screens shared it and neither of them looked
 * like anywhere. They are now two rooms that have nothing in common but the
 * boards they are built from.
 *
 *   shop  a trading post — shelves of jars and tins down both walls, stock
 *         stacked on the floor, a rail of pans and hats overhead, and the
 *         counter you are standing at running across the foreground.
 *   inn   a room with a fire in it — a stone hearth throwing live light, a
 *         window with the night behind it, a rug, a chair pulled up to the
 *         heat, and a beamed ceiling.
 *
 * The forge used to be a third `kind` in here — a brick oblong and four grey
 * ticks for tools. It has a workshop of its own now, with its own furniture
 * and its own performances: `src/shops/forge-scene.js`.
 *
 * WHERE THINGS ARE ALLOWED TO GO
 * ---------------------------------------------------------------------------
 * The HTML screen sits on top of this in a column down the middle, so every
 * prop is laid out from an EDGE of the frame rather than from the centre: the
 * shelving hugs the left and right walls and the stock sits on the floor
 * under it. Nothing is ever placed where the goods board will cover it, which
 * is why the room still reads on a phone, where the board covers almost
 * everything between the two walls.
 *
 * Everything is drawn on the canvas pixel grid at `view.scale`, from the same
 * sprite set the inn's beds come out of (`src/art/sprites-venue.js`), so the
 * backdrop and the artwork on the cards in front of it are the same material.
 */

import { PALETTE } from '../art/palette.js';
import { drawSprite } from '../art/pixel.js';
import { HEARTH_OPENING, venueSprite } from '../art/sprites-venue.js';
import { makeRng } from '../core/rng.js';

/** Where the wall stops and the floor starts, as a fraction of frame height. */
const FLOOR_AT = 0.78;

export function createInteriorScene(kind = 'shop') {
  const isInn = kind === 'inn';
  const rng = makeRng(isInn ? 8123 : 4242);

  const motes = Array.from({ length: 34 }, () => ({
    x: rng(),
    y: rng(),
    vy: rng.range(-0.00012, -0.00004),
    vx: rng.range(-0.00006, 0.00006),
    a: rng.range(0.06, 0.24),
  }));

  // The fire is a handful of tongues that each live for a moment and come back
  // a little different. Baking flame frames gives a fire that loops; this one
  // never repeats, which is the whole difference between a hearth with a
  // picture in it and a hearth with a fire in it.
  const flames = Array.from({ length: 7 }, (_, i) => ({
    x: (i + 0.5) / 7,
    life: rng(),
    speed: rng.range(0.0012, 0.0026),
    height: rng.range(0.55, 1),
  }));

  const sparks = Array.from({ length: 10 }, () => ({
    x: rng(),
    y: rng(),
    speed: rng.range(0.00018, 0.00042),
    drift: rng.range(-0.00008, 0.00008),
  }));

  let t = 0;
  let flicker = 1;

  return {
    update(dt) {
      t += dt;
      // Two beats a long way from a common multiple: the light never settles
      // into a pulse you can count.
      flicker = 0.84 + Math.sin(t / 190) * 0.07 + Math.sin(t / 53) * 0.05 + Math.sin(t / 17) * 0.02;

      for (const m of motes) {
        m.x += m.vx * dt;
        m.y += m.vy * dt;
        if (m.y < -0.05) m.y = 1.05;
        if (m.x < -0.05) m.x = 1.05;
        if (m.x > 1.05) m.x = -0.05;
      }

      if (!isInn) return;
      for (const f of flames) {
        f.life += f.speed * dt;
        if (f.life > 1) {
          f.life -= 1;
          f.height = 0.55 + ((Math.sin(t / 31 + f.x * 9) + 1) / 2) * 0.45;
        }
      }
      for (const s of sparks) {
        s.y -= s.speed * dt;
        s.x += s.drift * dt;
        if (s.y < 0) {
          s.y = 1;
          s.x = 0.2 + ((Math.sin(t / 23 + s.speed * 9000) + 1) / 2) * 0.6;
        }
      }
    },

    render(ctx, view) {
      const s = view.scale;
      const floorY = snap(view.h * FLOOR_AT, s);

      drawWall(ctx, view, s, floorY, isInn);
      drawFloor(ctx, view, s, floorY, isInn);

      // Furniture standing on the floor is drawn at twice the scale of what is
      // fixed to the wall behind it. Two pixel sizes in one frame is a depth
      // cue, not an accident — the barrels are a stride away and the shelf of
      // jars is against the back wall. A phone has no room for the near plane,
      // so there everything is drawn at one scale and the room simply shrinks.
      const fs = view.w < 760 ? s : s * 2;

      if (isInn) drawInnRoom(ctx, view, s, fs, floorY, flicker, flames, sparks, t);
      else drawShopRoom(ctx, view, s, fs, floorY, flicker, t);

      drawMotes(ctx, view, s, motes, flicker);
      drawVignette(ctx, view, isInn);
    },
  };
}

// ---------------------------------------------------------------------------
// The shell: wall, floor, and the light in the room
// ---------------------------------------------------------------------------

/** Round to the pixel grid — art on a half pixel is art with a blur on it. */
function snap(v, s) {
  return Math.round(v / s) * s;
}

/**
 * The back wall. Vertical boards, because a horizontal-plank wall and a
 * horizontal-plank floor meeting at a line reads as one flat surface folded
 * over; turning the wall's grain 90 degrees is what makes the room a corner
 * you are standing in.
 */
function drawWall(ctx, view, s, floorY, isInn) {
  ctx.fillStyle = isInn ? PALETTE.woodDark : PALETTE.wood;
  ctx.fillRect(0, 0, view.w, floorY);

  const board = 9 * s;
  for (let x = 0; x < view.w; x += board) {
    const step = Math.floor(x / board) % 3;
    ctx.fillStyle = step === 0 ? PALETTE.woodDark : step === 1 ? PALETTE.wood : PALETTE.woodDeep;
    ctx.fillRect(x, 0, board - s, floorY);
    ctx.fillStyle = PALETTE.shadow;
    ctx.fillRect(x + board - s, 0, s, floorY);
  }

  // Ceiling: joists in the inn (you are under a roof, upstairs), a canvas
  // tarpaulin in the shop (you are under an awning, in a lean-to).
  if (isInn) {
    ctx.fillStyle = PALETTE.woodDeep;
    ctx.fillRect(0, 0, view.w, 5 * s);
    ctx.fillStyle = PALETTE.shadow;
    ctx.fillRect(0, 5 * s, view.w, s);
    const bay = 26 * s;
    for (let x = bay / 2; x < view.w; x += bay) {
      ctx.fillStyle = PALETTE.woodDark;
      ctx.fillRect(snap(x, s), 0, 4 * s, 8 * s);
      ctx.fillStyle = PALETTE.shadow;
      ctx.fillRect(snap(x, s) + 4 * s, 0, s, 8 * s);
    }
  } else {
    const stripe = 6 * s;
    for (let x = 0; x < view.w; x += stripe * 2) {
      ctx.fillStyle = PALETTE.bone;
      ctx.fillRect(x, 0, stripe, 6 * s);
      ctx.fillStyle = PALETTE.red;
      ctx.fillRect(x + stripe, 0, stripe, 6 * s);
    }
    // The scalloped edge of the canvas, cut into the stripes rather than
    // painted on top of them.
    ctx.fillStyle = PALETTE.shadow;
    ctx.fillRect(0, 6 * s, view.w, s);
    for (let x = 0; x < view.w; x += 4 * s) {
      ctx.fillStyle = ((x / (4 * s)) % 2 === 0) ? PALETTE.boneDark : PALETTE.redDark;
      ctx.fillRect(x, 7 * s, 4 * s, s);
      ctx.fillRect(x + s, 8 * s, 2 * s, s);
    }
  }

  // Chair rail: the horizontal that stops the wall reading as a fence.
  const railY = floorY - 11 * s;
  ctx.fillStyle = PALETTE.woodLight;
  ctx.fillRect(0, railY, view.w, s);
  ctx.fillStyle = PALETTE.woodDeep;
  ctx.fillRect(0, railY + s, view.w, 2 * s);
  ctx.fillStyle = PALETTE.shadow;
  ctx.fillRect(0, railY + 3 * s, view.w, s);
}

/** Floorboards, running away from the viewer. */
function drawFloor(ctx, view, s, floorY, isInn) {
  ctx.fillStyle = PALETTE.woodDeep;
  ctx.fillRect(0, floorY, view.w, view.h - floorY);

  // The boards get taller towards the camera, which is the whole trick: a
  // constant board height reads as a wall lying down.
  let y = floorY;
  let h = 3 * s;
  let i = 0;
  while (y < view.h) {
    ctx.fillStyle = (i % 2 === 0) ? PALETTE.woodDark : PALETTE.wood;
    ctx.fillRect(0, y, view.w, h - s);
    ctx.fillStyle = PALETTE.shadow;
    ctx.fillRect(0, y + h - s, view.w, s);
    y += h;
    h += s;
    i += 1;
  }

  // Where the wall meets the floor: a dark seam and a skirting board.
  ctx.fillStyle = PALETTE.shadow;
  ctx.fillRect(0, floorY - s, view.w, 2 * s);
  if (isInn) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
    ctx.fillRect(0, floorY, view.w, 4 * s);
  }
}

/** Warm light with a soft falloff, used for lanterns and for the fire. */
function pool(ctx, x, y, radius, inner, outer) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, Math.max(1, radius));
  g.addColorStop(0, inner);
  g.addColorStop(0.5, outer);
  g.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
}

function drawMotes(ctx, view, s, motes, flicker) {
  ctx.fillStyle = PALETTE.bone;
  for (const m of motes) {
    ctx.globalAlpha = m.a * flicker;
    ctx.fillRect(snap(m.x * view.w, s), snap(m.y * view.h, s), s, s);
  }
  ctx.globalAlpha = 1;
}

/**
 * The vignette. It is doing a job — the goods board and the bed cards have to
 * read against whatever is behind them — so it is heaviest exactly where the
 * HTML sits and lets the corners, which is where all the furniture is, stay
 * bright enough to see.
 */
function drawVignette(ctx, view, isInn) {
  const g = ctx.createRadialGradient(
    view.w / 2, view.h / 2, Math.min(view.w, view.h) * 0.1,
    view.w / 2, view.h / 2, Math.max(view.w, view.h) * 0.75,
  );
  g.addColorStop(0, isInn ? 'rgba(6, 3, 2, 0.62)' : 'rgba(6, 3, 2, 0.58)');
  g.addColorStop(0.55, 'rgba(6, 3, 2, 0.34)');
  g.addColorStop(1, 'rgba(6, 3, 2, 0.72)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, view.w, view.h);
}

// ---------------------------------------------------------------------------
// Shared furniture
// ---------------------------------------------------------------------------

/**
 * Draw a venue sprite standing on a line: (x, y) is its BOTTOM-left corner, so
 * a row of furniture is placed by the floor it is on rather than by the top of
 * whichever piece happens to be tallest.
 */
function stand(ctx, name, x, y, s, flip = false) {
  const sprite = venueSprite(name);
  if (!sprite) return;
  drawSprite(ctx, sprite, x, y - sprite.height * s, s, flip);
}

/** A shelf plank on two brackets, with whatever is standing on it. */
function shelf(ctx, x, y, width, s, goods) {
  ctx.fillStyle = PALETTE.woodLight;
  ctx.fillRect(x, y, width, s);
  ctx.fillStyle = PALETTE.wood;
  ctx.fillRect(x, y + s, width, s);
  ctx.fillStyle = PALETTE.shadow;
  ctx.fillRect(x, y + 2 * s, width, s);

  ctx.fillStyle = PALETTE.woodDeep;
  ctx.fillRect(x + 2 * s, y + 3 * s, 2 * s, 3 * s);
  ctx.fillRect(x + width - 4 * s, y + 3 * s, 2 * s, 3 * s);

  let cursor = x + 2 * s;
  for (const name of goods) {
    const sprite = venueSprite(name);
    if (!sprite) continue;
    if (cursor + sprite.width * s > x + width - 2 * s) break;
    drawSprite(ctx, sprite, cursor, y - sprite.height * s, s);
    cursor += (sprite.width + 2) * s;
  }
}

/** A lantern on a chain, and the light it is responsible for. */
function lantern(ctx, x, y, s, flicker, warm) {
  ctx.fillStyle = PALETTE.steelDark;
  ctx.fillRect(x - Math.round(s / 2), 0, Math.max(1, Math.round(s / 2)), y - 7 * s);
  ctx.fillRect(x - 4 * s, y - 7 * s, 8 * s, s);
  ctx.fillRect(x - 3 * s, y - 6 * s, 6 * s, s);

  ctx.fillStyle = 'rgba(255, 235, 190, 0.22)';
  ctx.fillRect(x - 3 * s, y - 5 * s, 6 * s, 6 * s);
  ctx.strokeStyle = PALETTE.steelDark;
  ctx.lineWidth = Math.max(1, s / 2);
  ctx.strokeRect(x - 3 * s, y - 5 * s, 6 * s, 6 * s);

  ctx.globalAlpha = flicker;
  ctx.fillStyle = warm;
  ctx.fillRect(x - s, y - 3 * s, 2 * s, 3 * s);
  ctx.fillStyle = PALETTE.goldLight;
  ctx.fillRect(x - Math.round(s / 2), y - 2 * s, Math.max(1, s), 2 * s);
  ctx.globalAlpha = 1;

  ctx.fillStyle = PALETTE.steelDark;
  ctx.fillRect(x - 4 * s, y + s, 8 * s, s);
}

// ---------------------------------------------------------------------------
// The trading post
// ---------------------------------------------------------------------------

function drawShopRoom(ctx, view, s, fs, floorY, flicker, t) {
  const right = view.w;

  // --- Overhead rail, with the ironmongery hung off it -----------------------
  // Only over the two walls. A rail of pans strung across the middle of the
  // frame would hang directly behind the goods board, where it is half a pan
  // sticking out either side of a panel and nothing else.
  const railY = 12 * s;
  const railW = snap(Math.min(view.w * 0.28, 34 * s), s);
  for (const side of [0, 1]) {
    const x0 = side === 0 ? 0 : view.w - railW;
    ctx.fillStyle = PALETTE.steelDark;
    ctx.fillRect(x0, railY, railW, s);
    ctx.fillStyle = PALETTE.shadow;
    ctx.fillRect(x0, railY + s, railW, s);

    const hung = side === 0 ? ['pan', 'hat', 'coil'] : ['coil', 'pan', 'hat'];
    const spacing = 11 * s;
    for (let i = 0; i < hung.length; i++) {
      const sprite = venueSprite(hung[i]);
      if (!sprite) continue;
      const x = snap(x0 + 2 * s + i * spacing, s);
      if (x + sprite.width * s > x0 + railW) break;
      // A hook, then the thing on it — swinging a hair out of phase with its
      // neighbours so the row is not one object repeated.
      const sway = Math.round(Math.sin(t / 900 + i + side) * 0.6) * s;
      ctx.fillStyle = PALETTE.steelDark;
      ctx.fillRect(x + 3 * s, railY + 2 * s, s, 2 * s);
      drawSprite(ctx, sprite, x + sway, railY + 4 * s, s);
    }
  }

  // --- Shelving down both walls ---------------------------------------------
  const bayW = snap(Math.min(view.w * 0.22, 28 * s), s);
  const shelves = [
    ['jar', 'jar', 'bottle', 'tin'],
    ['tin', 'jar', 'bottle', 'bottle'],
    ['bottle', 'tin', 'jar', 'tin'],
  ];
  for (let i = 0; i < shelves.length; i++) {
    const y = snap(view.h * 0.26, s) + i * 15 * s;
    if (y > floorY - 16 * s) break;
    shelf(ctx, 2 * s, y, bayW, s, shelves[i]);
    shelf(ctx, right - bayW - 2 * s, y, bayW, s, [...shelves[i]].reverse());
  }

  // --- Stock on the floor ----------------------------------------------------
  const base = snap(view.h * 0.92, fs);
  stand(ctx, 'barrel', fs, base, fs);
  stand(ctx, 'crate', 0, base - 13 * fs, fs);
  stand(ctx, 'sack', 14 * fs, base - 2 * fs, fs);
  stand(ctx, 'crate', 13 * fs, base - 14 * fs, fs);

  stand(ctx, 'crate', right - 14 * fs, base, fs);
  stand(ctx, 'crate', right - 14 * fs, base - 11 * fs, fs);
  stand(ctx, 'scales', right - 14 * fs, base - 22 * fs, fs);
  stand(ctx, 'barrel', right - 27 * fs, base - fs, fs);
  stand(ctx, 'sack', right - 28 * fs, base - 14 * fs, fs);

  // --- The counter you are standing at --------------------------------------
  // Foreground, cropped by the bottom of the frame: the one thing that says
  // the goods on the screen are on a counter and not in a menu.
  const counterY = snap(view.h * 0.93, s);
  ctx.fillStyle = PALETTE.woodDeep;
  ctx.fillRect(0, counterY, view.w, view.h - counterY);
  ctx.fillStyle = PALETTE.woodLight;
  ctx.fillRect(0, counterY, view.w, s);
  ctx.fillStyle = PALETTE.wood;
  ctx.fillRect(0, counterY + s, view.w, 3 * s);
  ctx.fillStyle = PALETTE.shadow;
  ctx.fillRect(0, counterY + 4 * s, view.w, s);
  for (let x = 0; x < view.w; x += 34 * s) {
    ctx.fillStyle = PALETTE.shadow;
    ctx.fillRect(snap(x, s), counterY + 5 * s, s, view.h - counterY);
  }

  // --- Light ------------------------------------------------------------------
  const lx = snap(view.w * 0.16, s);
  const ly = snap(view.h * 0.2, s);
  ctx.globalCompositeOperation = 'lighter';
  pool(ctx, lx, ly, Math.max(view.w, view.h) * 0.55,
    `rgba(255, 206, 120, ${0.2 * flicker})`, `rgba(190, 120, 44, ${0.07 * flicker})`);
  pool(ctx, view.w - lx, ly, Math.max(view.w, view.h) * 0.45,
    `rgba(255, 206, 120, ${0.13 * flicker})`, `rgba(190, 120, 44, ${0.05 * flicker})`);
  ctx.globalCompositeOperation = 'source-over';
  lantern(ctx, lx, ly, s, flicker, PALETTE.gold);
  lantern(ctx, view.w - lx, ly, s, flicker * 0.94, PALETTE.gold);
}

// ---------------------------------------------------------------------------
// The inn
// ---------------------------------------------------------------------------

function drawInnRoom(ctx, view, s, fs, floorY, flicker, flames, sparks, t) {
  const right = view.w;
  const base = snap(view.h * 0.93, fs);

  // --- The rug --------------------------------------------------------------
  const rugY = snap(view.h * 0.83, s);
  const rugX = snap(view.w * 0.24, s);
  const rugW = snap(view.w * 0.52, s);
  ctx.fillStyle = PALETTE.redDeep;
  ctx.fillRect(rugX, rugY, rugW, 14 * s);
  ctx.fillStyle = PALETTE.redDark;
  ctx.fillRect(rugX + 2 * s, rugY + 2 * s, rugW - 4 * s, 10 * s);
  ctx.fillStyle = PALETTE.leatherDark;
  ctx.fillRect(rugX + 5 * s, rugY + 5 * s, rugW - 10 * s, 4 * s);
  ctx.fillStyle = PALETTE.sandDark;
  for (let x = rugX + 6 * s; x < rugX + rugW - 8 * s; x += 8 * s) {
    ctx.fillRect(x, rugY + 6 * s, 4 * s, 2 * s);
  }

  // --- Hearth, left ---------------------------------------------------------
  const hearth = venueSprite('hearth');
  const hx = snap(view.w * 0.02, fs);
  if (hearth) {
    const hy = base;
    drawSprite(ctx, hearth, hx, hy - hearth.height * fs, fs);

    // The fire lives in the opening the sprite leaves black — HEARTH_OPENING
    // is that hole, measured off the art. Its tongues are drawn at the wall
    // scale rather than the furniture scale, so a fire in a big hearth is made
    // of many small flames instead of four fat ones.
    //
    // The clip is not belt-and-braces: a flame is a rectangle whose height and
    // width both vary, and one that grows past the lintel or the jamb paints
    // over masonry the sprite already drew. Cutting the fire to the hole means
    // the flames can be as tall as they like and the stone still wins.
    const fx = hx + HEARTH_OPENING.x * fs;
    const fy = hy - (hearth.height - (HEARTH_OPENING.y + HEARTH_OPENING.h)) * fs;
    const fw = HEARTH_OPENING.w * fs;
    const fh = HEARTH_OPENING.h * fs;

    ctx.save();
    ctx.beginPath();
    ctx.rect(fx, fy - fh, fw, fh);
    ctx.clip();

    ctx.fillStyle = PALETTE.magmaDeep;
    ctx.fillRect(fx, fy - 2 * s, fw, 2 * s);
    for (const f of flames) {
      const rise = f.life;
      const h = Math.max(s, snap(fh * f.height * (1 - rise * 0.5), s));
      const x = snap(fx + f.x * fw, s);
      const w = Math.max(s, snap(3 * s * (1 - rise * 0.5), s));
      ctx.fillStyle = PALETTE.magmaDeep;
      ctx.fillRect(x - w, fy - h, w * 2, h);
      ctx.fillStyle = PALETTE.magma;
      ctx.fillRect(x - Math.max(s, w - s), fy - h + 2 * s, Math.max(s, w - s) * 2, h - 2 * s);
      ctx.fillStyle = PALETTE.emberGlow;
      ctx.fillRect(x - Math.round(w / 2 / s) * s, fy - h + 4 * s, Math.max(s, w), Math.max(s, h - 5 * s));
    }

    // Sparks going up out of the fire. They rise through the top of the
    // opening rather than over it — above that line is a chimney breast, and
    // you cannot see sparks through a chimney breast.
    ctx.fillStyle = PALETTE.emberGlow;
    for (const spark of sparks) {
      ctx.globalAlpha = 0.35 + spark.y * 0.5;
      ctx.fillRect(snap(fx + spark.x * fw, s), snap(fy - (1 - spark.y) * fh, s), s, s);
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    // The fire's own light, thrown on the floor in front of it.
    ctx.globalCompositeOperation = 'lighter';
    pool(ctx, fx + fw / 2, fy - fh / 2, Math.max(view.w, view.h) * 0.62,
      `rgba(255, 170, 70, ${0.26 * flicker})`, `rgba(200, 80, 20, ${0.1 * flicker})`);
    ctx.globalCompositeOperation = 'source-over';
  }

  const hearthW = hearth ? hearth.width * fs : 0;
  stand(ctx, 'logs', hx + hearthW + fs, base, fs);
  stand(ctx, 'chair', hx + hearthW + 16 * fs, base + 2 * fs, fs, true);

  // --- Window, washstand and trunk, right -----------------------------------
  const win = venueSprite('window');
  if (win) {
    const wx = snap(right - view.w * 0.05, fs) - win.width * fs;
    const wy = snap(view.h * 0.22, fs);
    // Night behind the glass, painted before the frame goes over it.
    ctx.fillStyle = PALETTE.skyNight;
    ctx.fillRect(wx + fs, wy + fs, (win.width - 2) * fs, (win.height - 2) * fs);
    ctx.fillStyle = PALETTE.star;
    const stars = [[4, 4], [9, 3], [14, 6], [6, 10], [12, 11], [16, 9], [8, 7]];
    for (const [px, py] of stars) {
      ctx.globalAlpha = 0.45 + Math.abs(Math.sin(t / 700 + px)) * 0.55;
      ctx.fillRect(wx + px * fs, wy + py * fs, s, s);
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = PALETTE.bone;
    ctx.fillRect(wx + 12 * fs, wy + 3 * fs, 3 * fs, 3 * fs);
    ctx.fillStyle = PALETTE.boneDark;
    ctx.fillRect(wx + 12 * fs, wy + 5 * fs, 2 * fs, fs);
    drawSprite(ctx, win, wx, wy, fs);

    // Moonlight coming through it, cold against the fire at the other end.
    ctx.globalCompositeOperation = 'lighter';
    pool(ctx, wx + (win.width * fs) / 2, wy + win.height * fs, Math.max(view.w, view.h) * 0.3,
      'rgba(180, 200, 255, 0.08)', 'rgba(120, 150, 220, 0.03)');
    ctx.globalCompositeOperation = 'source-over';
  }

  stand(ctx, 'washstand', right - 15 * fs, base, fs);
  const standTop = base - 12 * fs;
  stand(ctx, 'candle', right - 12 * fs, standTop, fs);
  stand(ctx, 'trunk', right - 30 * fs, base + fs, fs);

  lantern(ctx, snap(view.w * 0.17, s), snap(view.h * 0.14, s), s, flicker * 0.9, PALETTE.gold);
}
