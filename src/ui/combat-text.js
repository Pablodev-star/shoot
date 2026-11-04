/**
 * SHOOT! — Numbers that come off a man.
 *
 * A hit used to be a bar draining in a card at the top of the screen, which is
 * the one place nobody is looking during a draw. The eye is on the two men in
 * the road, so that is where the number goes: "−1.5" thrown up off whoever
 * took it, red, with a little arc and a fall; "+1" in green off whoever got
 * something back; and a word, not a number, when a shield caught a round.
 *
 * It is interface, not art, so it is DOM rather than canvas: crisp text at any
 * scale, the game's own display font, and the CSS animation does the motion.
 * The scene only tells it where the head is (`anchorOf` in
 * src/duel/duel-scene.js).
 */

import { t } from '../core/i18n.js';

/** Format a life delta on the half-diamond grid: 1, 1.5, 0.5 — never 1.50. */
function amount(n) {
  const v = Math.round(Math.abs(n) * 2) / 2;
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}

/**
 * @param {HTMLElement} host where the layer goes (the duel screen)
 * @param {(side:'player'|'enemy') => {x:number,y:number,size:number}|null} anchorOf
 */
export function createCombatText(host, anchorOf) {
  const layer = document.createElement('div');
  layer.className = 'combat-text-layer';
  layer.setAttribute('aria-hidden', 'true');
  host.append(layer);

  /** How many numbers are in the air over each man, so a burst fans out. */
  const live = { player: 0, enemy: 0 };

  function pop(side, text, tone) {
    const at = anchorOf(side);
    if (!at) return;
    const n = live[side]++;
    const node = document.createElement('span');
    node.className = `combat-text is-${tone}`;
    node.textContent = text;
    // Fan successive numbers sideways and up a touch, away from the centre
    // of the road, so two hits in one round do not print on top of each other.
    const away = side === 'player' ? -1 : 1;
    node.style.left = `${Math.round(at.x + away * n * 18)}px`;
    node.style.top = `${Math.round(at.y - n * 14)}px`;
    node.style.setProperty('--drift', `${away * (14 + Math.random() * 14)}px`);
    layer.append(node);
    const done = () => {
      node.remove();
      live[side] = Math.max(0, live[side] - 1);
    };
    node.addEventListener('animationend', done, { once: true });
    // Belt and braces: a tab in the background may never fire animationend.
    setTimeout(() => node.isConnected && done(), 2400);
  }

  return {
    /** A change in somebody's lives, positive or negative. */
    delta(side, change) {
      if (!change || Math.abs(change) < 0.25) return;
      if (change < 0) pop(side, `−${amount(change)}`, Math.abs(change) >= 2 ? 'big-hit' : 'hit');
      else pop(side, `+${amount(change)}`, 'heal');
    },
    /** A word rather than a number — a block, a miss. */
    word(side, text, tone = 'block') {
      pop(side, t(text), tone);
    },
    dispose() {
      layer.remove();
    },
  };
}
