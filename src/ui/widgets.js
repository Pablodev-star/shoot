/**
 * SHOOT! — Shared UI widgets.
 *
 * The red-diamond life row lives here. That visual has survived every version
 * of this game since the Roblox prototype and must never change shape: a
 * rotated square, red gradient, dark outline.
 */

import { el } from '../core/dom.js';
import { iconURL } from '../art/sprites-items.js';

/**
 * Row of red diamonds.
 * @param {number} lives current
 * @param {number} maxLives capacity (empty diamonds are drawn hollow)
 * @param {{big?: boolean}} opts
 */
export function livesRow(lives, maxLives, opts = {}) {
  const row = el('div.lives');
  for (let i = 0; i < maxLives; i++) {
    row.append(
      el('span.life', {
        class: `${i < lives ? '' : 'is-empty'} ${opts.big ? 'life--big' : ''}`.trim(),
      }),
    );
  }
  return row;
}

/** Update an existing life row in place, animating the diamonds just lost. */
export function updateLivesRow(row, lives, maxLives) {
  while (row.children.length < maxLives) row.append(el('span.life'));
  while (row.children.length > maxLives) row.lastChild.remove();
  [...row.children].forEach((node, i) => {
    const wasFull = !node.classList.contains('is-empty');
    const isFull = i < lives;
    node.classList.toggle('is-empty', !isFull);
    if (wasFull && !isFull) {
      node.classList.remove('is-lost');
      void node.offsetWidth; // restart the animation
      node.classList.add('is-lost');
    }
  });
}

/** A small pixel icon element. */
export function icon(name, scale = 1.5, className = '') {
  const img = document.createElement('img');
  img.src = iconURL(name, 2);
  img.className = `pixel ${className}`.trim();
  img.style.width = `${16 * scale}px`;
  img.style.height = `${16 * scale}px`;
  img.draggable = false;
  return img;
}

/** Gold counter chip. */
export function goldChip(gold) {
  return el('span.chip.chip--gold', {}, [icon('coin', 1), String(gold)]);
}

/** Progress/resource bar. Returns { node, set(ratio) }. */
export function bar(ratio = 1, className = '') {
  const fill = el('div.fill', { style: { width: `${Math.round(ratio * 100)}%` } });
  const node = el('div.bar', { class: className }, [fill]);
  return {
    node,
    set(next) {
      const clamped = Math.max(0, Math.min(1, next));
      fill.style.width = `${clamped * 100}%`;
      node.classList.toggle('is-low', clamped <= 0.25);
    },
  };
}

/** Rarity chip. */
export function rarityChip(rarity) {
  return el(`span.chip.chip--${rarity}`, { text: rarity });
}
