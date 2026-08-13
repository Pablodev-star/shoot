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
  const entry = { node, setValue, getValue };
  purses.push(entry);
  return () => {
    const i = purses.indexOf(entry);
    if (i >= 0) purses.splice(i, 1);
  };
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
  const active = activePurse();
  for (const purse of purses) {
    if (purse === active && delta > 0) continue;
    purse.setValue(gold);
  }
  if (delta > 0) flyGold(delta, { from: takeHint() });
});

/**
 * Send gold to the purse.
 *
 * @param {number} amount what was earned. Negative amounts are spending, which
 *   never flies — money leaving is a price you agreed to, not an event.
 * @param {{ from?: HTMLElement|{x:number,y:number} }} [opts] where it came
 *   from; the middle of the screen when nobody says.
 */
export function flyGold(amount, opts = {}) {
  const purse = activePurse();
  if (!purse) return;
  // The one setting that turns it off is the one that turns off the shake: a
  // player who does not want the screen moving does not want coins on it.
  if (!(amount > 0) || !getSettings().screenShake) {
    purse.setValue(purse.getValue() + (amount || 0));
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
      if (landed === 1) countUp(purse, amount);
      if (landed === coins) layer.remove();
    };
  }
}

/** Run the pill from what it shows to what it should show. */
function countUp(purse, amount) {
  const start = purse.getValue();
  const end = start + amount;
  const t0 = performance.now();
  const step = (now) => {
    const k = Math.min(1, (now - t0) / COUNT_MS);
    // Ease out: the last few coins' worth lands slowly, which is what makes it
    // read as a total settling rather than a number scrolling.
    const eased = 1 - (1 - k) ** 3;
    purse.setValue(Math.round(start + (end - start) * eased));
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function originPoint(from) {
  if (from && typeof from.getBoundingClientRect === 'function') {
    const r = from.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }
  if (from && Number.isFinite(from.x) && Number.isFinite(from.y)) return from;
  return { x: window.innerWidth / 2, y: window.innerHeight * 0.55 };
}
