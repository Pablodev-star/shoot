/**
 * SHOOT! — Toasts.
 *
 * Small nailed-sign notifications used for "not enough gold", "+120 gold",
 * "Sandstorm rolling in", level-ups and the online section's "coming soon".
 */

import { el } from '../core/dom.js';
import { EVENTS, on } from '../core/events.js';
import { play } from '../core/audio.js';

let container = null;

export function initToasts(node) {
  container = node;
  on(EVENTS.TOAST, ({ text, kind, sfx }) => toast(text, kind, sfx));
}

/**
 * @param {string} text
 * @param {'info'|'good'|'bad'|'gold'} kind
 * @param {string} [sfx] optional audio cue name
 */
export function toast(text, kind = 'info', sfx = null) {
  if (!container) return;
  if (sfx) play(sfx);
  const node = el(`div.toast`, { class: kind !== 'info' ? `is-${kind}` : '', text });
  container.append(node);
  setTimeout(() => node.remove(), 2600);
  // Keep the stack short.
  while (container.children.length > 4) container.firstChild.remove();
}
