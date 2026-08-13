/**
 * SHOOT! — Achievement notices.
 *
 * The card that drops in at the top of the screen when a line of the ledger is
 * filled in, WHEREVER the player is standing: on the road, inside a shop, in
 * the middle of a duel, over the top of the battle overview.
 *
 * WHY IT IS NOT A TOAST
 * ---------------------------------------------------------------------------
 * The toast layer is for the running commentary — "+120 gold", "Sandstorm
 * rolling in", "Starving" — and it is deliberately cheap and short-lived, with
 * four of them stacked at a time and the oldest thrown away. An achievement is
 * the opposite kind of message: it happens rarely, it is worth reading, and
 * losing one behind three gold notices would be losing the moment it exists
 * for. So it has:
 *
 *   - its own layer, ABOVE the modal backdrop — the last duel of a world is
 *     won under an overview dialog, and that is exactly when the notice for it
 *     arrives;
 *   - a queue instead of a stack, so two unlocks in the same instant (a boss
 *     that is also a world, a purchase that is also a legendary) are read one
 *     after the other rather than on top of each other;
 *   - the count and the percentage on it, because the notice is also the
 *     nudge towards the screen the rest of them live on.
 *
 * It is `pointer-events: none` throughout: nothing here is ever between the
 * player and the button they were about to press.
 */

import { el } from '../core/dom.js';
import { EVENTS, on } from '../core/events.js';
import { play } from '../core/audio.js';
import { uiIcon } from './widgets.js';

/** How long one notice stays up, and the gap before the next one drops. */
const HOLD_MS = 3400;
const GAP_MS = 260;

let container = null;
const queue = [];
let showing = false;

/**
 * Mount the layer and start listening. Called once at boot — before the first
 * screen, so an unlock during the title screen has somewhere to land.
 */
export function initAchievementNotices(node) {
  container = node;
  on(EVENTS.ACHIEVEMENT_UNLOCKED, (payload) => {
    queue.push(payload);
    pump();
  });
}

function pump() {
  if (showing || !container) return;
  const next = queue.shift();
  if (!next) return;
  showing = true;
  present(next);
}

function present({ achievement, unlockedCount, total, percent }) {
  const notice = el('div.ach-notice', { role: 'status', 'aria-live': 'polite' }, [
    el('div.ach-notice-medal', {}, [uiIcon('star', 1.6)]),
    el('div.ach-notice-body', {}, [
      el('div.ach-notice-eyebrow', { text: 'Achievement unlocked' }),
      el('div.ach-notice-name', { text: achievement.name }),
      el('div.ach-notice-detail', { text: achievement.description }),
    ]),
    el('div.ach-notice-tally', {}, [
      el('span.ach-notice-percent', { text: `${percent}%` }),
      el('span.ach-notice-count', { text: `${unlockedCount}/${total}` }),
    ]),
  ]);

  container.append(notice);
  play('levelUp');

  setTimeout(() => {
    notice.classList.add('is-leaving');
    setTimeout(() => {
      notice.remove();
      showing = false;
      // A gap between two of them, so a double unlock reads as two things
      // happening rather than one card twitching.
      setTimeout(pump, GAP_MS);
    }, 420);
  }, HOLD_MS);
}
