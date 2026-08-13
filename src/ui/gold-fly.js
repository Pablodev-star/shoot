/**
 * SHOOT! — Gold going into the purse.
 *
 * Every source of money in this game used to be a number swapping itself out.
 * You won a fight, a toast said "+112 gold", and somewhere at the top of the
 * screen a different number was already there when you looked. Selling was
 * worse: the counter and the purse are on the same screen a thumb's width
 * apart, and the item vanished from one without anything crossing to the
 * other.
 *
 * So gold TRAVELS. A handful of coins appears where the money came from — the
 * body, the counter, the item card — arcs to whichever purse is on screen, and
 * the number counts up as they land rather than before they set off.
 *
 * HOW IT KNOWS WHERE TO GO
 * ---------------------------------------------------------------------------
 * It does not: the purse tells it. `goldChip` (src/ui/widgets.js) registers
 * itself here while it is mounted, so a shop's own gold pill catches the coins
 * when the shop is open and the travel band catches them on the road, without
 * either of them knowing the other exists. The last one registered wins, which
 * is the same rule the screen stack already follows — an overlay opened over a
 * screen is the thing the player is looking at.
 *
 * WHY THE COUNT-UP IS PART OF IT
 * ---------------------------------------------------------------------------
 * A purse that jumps to its new total the moment a duel ends has told the
 * player the answer before the question. The chip holds the OLD number while
 * the coins are in the air and then runs to the new one over a few frames, so
 * the eye follows the money in and the number is the last thing to settle.
 *
 * All of it is skipped when the player has turned the screen shake off, and all
 * of it is decoration: the gold is already in `player.state` before the first
 * coin is drawn, so nothing here can lose a transaction — the fallback path
 * paints the total straight into the pill.
 */

import { el } from '../core/dom.js';
import { EVENTS, on } from '../core/events.js';
import { iconURL } from '../art/sprites-items.js';
import { getSettings } from '../core/settings.js';

/** How long a coin takes to cross, and how long the number takes to catch up. */
const FLIGHT_MS = 520;
const COUNT_MS = 420;
/** Coins per payout. Enough to read as money, few enough to stay cheap. */
const MAX_COINS = 7;

/** The purses currently on screen, oldest first. The last one gets the coins. */
const purses = [];

/**
 * Register a gold display. Returns an unregister function.
 * @param {HTMLElement} node the pill itself — the coins fly to its centre
 * @param {(value: number) => void} setValue paints a number into it
 * @param {() => number} getValue what it is showing now
 */
export function registerPurse(node, setValue, getValue) {
  const entry = { node, setValue, getValue, raf: 0 };
  purses.push(entry);
  // A payout that arrived while nobody had a purse mounted is waiting for
  // one. See `pending`.
  flushPending(entry);
  return () => {
    cancelAnimationFrame(entry.raf);
    const i = purses.indexOf(entry);
    if (i >= 0) purses.splice(i, 1);
  };
}

/**
 * MONEY EARNED WITH NO PURSE ON SCREEN WAITS FOR ONE
 * ---------------------------------------------------------------------------
 * Winning a duel is the biggest payout in the game and it happens on the one
 * screen that has no gold pill: `resolveDuel` calls `addGold` while the duel is
 * still mounted, and the travel band that would catch the coins is not built
 * until the router has moved on to the road. Fired there and then, the whole
 * animation went into a screen that could not show it — the number was simply
 * already right when the road came up, which is exactly the thing this file
 * exists to stop.
 *
 * So a payout with nowhere to land is held, and the next purse to mount pays it
 * out: the pill opens on the OLD total, the coins come in, and the number runs
 * up under them. It is dropped if it goes stale, because a payout that has been
 * waiting ten seconds is a payout the player has stopped connecting to the
 * thing that earned it.
 */
let pending = null;
const PENDING_MS = 10000;

/**
 * The last total the player state announced.
 *
 * The count-up aims at THIS rather than at the total that was true when the
 * coins were thrown, because the two are not always the same number: sell
 * something and then buy something before the coins land — a second and a half
 * on a counter, which is nothing — and the flight would finish by writing a
 * total that had already been spent down. The coins are decoration; the number
 * they land on is the truth, and the truth is whatever the last event said.
 */
let latestGold = null;

function flushPending(purse) {
  if (!pending || performance.now() - pending.at > PENDING_MS) {
    pending = null;
    return;
  }
  const { delta, total } = pending;
  pending = null;
  // Rewind the pill to before the money arrived, so there is something for the
  // coins to add to.
  purse.setValue(total - delta);
  /**
   * …and wait one frame before throwing them.
   *
   * A purse registers itself while it is being BUILT — `goldChip` is called
   * inside the travel band, which is assembled and only then appended — so at
   * this moment the pill has no position on the screen to aim at, and
   * `activePurse` rightly refuses to hand coins to something not in the
   * document. One frame later the screen is mounted and laid out. If it never
   * arrives (a band built and thrown away), the pill is simply given the real
   * total: the rewind above must never be the last word.
   */
  requestAnimationFrame(() => {
    if (!purse.node.isConnected) {
      purse.setValue(total);
      return;
    }
    flyGold(delta, { total });
  });
}

/**
 * Where the next payment came from, if anybody said.
 *
 * Selling knows the answer — the coins should leave the card you just sold —
 * but the thing that ANNOUNCES the money is `addGold`, three files away, and
 * threading an element through the player state to reach it would be absurd.
 * So a seller drops a hint on the way past and the next payout picks it up.
 * Hints go stale in a few frames, which is what stops a sale from flavouring an
 * unrelated purse two screens later.
 */
let originHint = null;
const HINT_MS = 250;

export function hintGoldOrigin(node) {
  originHint = node ? { node, at: performance.now() } : null;
}

function takeHint() {
  const hint = originHint;
  originHint = null;
  if (!hint || performance.now() - hint.at > HINT_MS) return null;
  return hint.node?.isConnected ? hint.node : null;
}

/** The purse the player is looking at: the last one still in the document. */
function activePurse() {
  for (let i = purses.length - 1; i >= 0; i--) {
    if (purses[i].node.isConnected) return purses[i];
  }
  return null;
}

/**
 * EVERY PURSE ON SCREEN FOLLOWS THE PLAYER'S GOLD, AND ONLY THIS FILE MOVES IT
 * ---------------------------------------------------------------------------
 * One subscription for the whole game rather than one per screen. Money coming
 * IN flies to the purse the player is looking at and counts up there; money
 * going out, and anything else that resets the total, is painted straight in.
 * The others — a shop pill behind an open saddlebag, say — are set instantly,
 * because coins can only land in one place and a second animation running
 * behind the first is just a number disagreeing with itself.
 *
 * This is also what makes the saddlebag's purse and the forge's price live: a
 * screen that shows gold no longer needs its own listener, it needs a
 * `goldChip`.
 */
on(EVENTS.GOLD_CHANGED, ({ gold, delta }) => {
  latestGold = gold;
  const active = activePurse();
  for (const purse of purses) {
    if (purse === active && delta > 0) continue;
    stopCount(purse);
    purse.setValue(gold);
  }
  if (!(delta > 0)) return;
  if (!active) {
    pending = { delta, total: gold, at: performance.now() };
    return;
  }
  flyGold(delta, { from: takeHint(), total: gold });
});

/**
 * Send gold to the purse.
 *
 * @param {number} amount what was earned. Negative amounts are spending, which
 *   never flies — money leaving is a price you agreed to, not an event.
 * @param {object} [opts]
 * @param {HTMLElement|{x:number,y:number}} [opts.from] where it came from; the
 *   middle of the screen when nobody says.
 * @param {number} [opts.total] the authoritative total the pill must end on.
 *   Always passed by the subscriber above; worked out from the pill when a
 *   caller animates something by hand.
 */
export function flyGold(amount, opts = {}) {
  const purse = activePurse();
  if (!purse) return;
  const total = Number.isFinite(opts.total) ? opts.total : purse.getValue() + (amount || 0);
  // The one setting that turns it off is the one that turns off the shake: a
  // player who does not want the screen moving does not want coins on it.
  if (!(amount > 0) || !getSettings().screenShake) {
    stopCount(purse);
    purse.setValue(total);
    return;
  }
  // Whatever the pill is showing is the OLD total, and it keeps showing it
  // until the first coin lands. See `countUp`.


  const target = purse.node.getBoundingClientRect();
  const to = { x: target.left + target.width / 2, y: target.top + target.height / 2 };
  const from = originPoint(opts.from);

  const layer = el('div.gold-fly');
  document.body.append(layer);

  const coins = Math.max(3, Math.min(MAX_COINS, Math.round(Math.log10(Math.max(10, amount)) * 3)));
  let landed = 0;
  for (let i = 0; i < coins; i++) {
    const coin = el('img.gold-fly-coin', { src: iconURL('coin', 2), alt: '' });
    // A little scatter at the start, so a payout reads as a handful rather
    // than as one coin drawn several times.
    const jx = (Math.random() - 0.5) * 90;
    const jy = (Math.random() - 0.5) * 60;
    coin.style.left = `${from.x + jx}px`;
    coin.style.top = `${from.y + jy}px`;
    layer.append(coin);

    const delay = i * 45;
    const anim = coin.animate(
      [
        { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
        {
          transform: `translate(${to.x - from.x - jx}px, ${to.y - from.y - jy}px) translate(-50%, -50%) scale(0.6)`,
          opacity: 1,
        },
      ],
      { duration: FLIGHT_MS, delay, easing: 'cubic-bezier(.42,0,.3,1)', fill: 'forwards' },
    );
    anim.onfinish = () => {
      coin.remove();
      landed += 1;
      // The number starts moving on the FIRST coin in, and is done shortly
      // after the last — the two halves of the same arrival.
      if (landed === 1) countUp(purse, latestGold ?? total);
      if (landed === coins) layer.remove();
    };
  }
}

/**
 * Run the pill from what it shows to what it should show.
 *
 * `end` is the ABSOLUTE total rather than an amount to add, and there is only
 * ever one of these per purse. Both of those are the same bug from two sides:
 * sell twice inside a second and the second count-up used to start from a
 * number the first one was still moving, then race it — whichever loop wrote
 * last won, and the pill could settle under the real purse until the next time
 * anything touched the gold. Aiming at the total and cancelling the loop in
 * flight means the last word is always the truth.
 */
function countUp(purse, end) {
  stopCount(purse);
  const start = purse.getValue();
  const t0 = performance.now();
  const step = (now) => {
    const k = Math.min(1, (now - t0) / COUNT_MS);
    // Ease out: the last few coins' worth lands slowly, which is what makes it
    // read as a total settling rather than a number scrolling.
    const eased = 1 - (1 - k) ** 3;
    purse.setValue(Math.round(start + (end - start) * eased));
    purse.raf = k < 1 ? requestAnimationFrame(step) : 0;
  };
  purse.raf = requestAnimationFrame(step);
}

function stopCount(purse) {
  if (!purse.raf) return;
  cancelAnimationFrame(purse.raf);
  purse.raf = 0;
}

function originPoint(from) {
  if (from && typeof from.getBoundingClientRect === 'function') {
    const r = from.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }
  if (from && Number.isFinite(from.x) && Number.isFinite(from.y)) return from;
  return { x: window.innerWidth / 2, y: window.innerHeight * 0.55 };
}
