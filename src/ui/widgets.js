/**
 * SHOOT! — Shared UI widgets.
 *
 * These are the only places that know what a life, a meter or a stat tile look
 * like. Screens compose them; they never hand-roll the markup.
 *
 * The red-diamond life row has survived every version of this game since the
 * Roblox prototype and must never change shape.
 */

import { el } from '../core/dom.js';
import { iconURL } from '../art/sprites-items.js';

/**
 * Row of red diamonds.
 * @param {number} lives current
 * @param {number} maxLives capacity (missing lives are drawn hollow)
 * @param {{large?: boolean, label?: string}} opts
 */
export function livesRow(lives, maxLives, opts = {}) {
  const row = el('div.lives', {
    role: 'img',
    'aria-label': `${lives} of ${maxLives} lives`,
  });
  for (let i = 0; i < maxLives; i++) {
    row.append(el('span.life', { class: `${i < lives ? '' : 'is-empty'} ${opts.large ? 'life--lg' : ''}`.trim() }));
  }
  return row;
}

/**
 * Update a life row in place, animating the diamonds that just changed. Keeping
 * the nodes rather than rebuilding them is what makes the loss read as a hit.
 */
export function updateLivesRow(row, lives, maxLives) {
  while (row.children.length < maxLives) {
    const life = el('span.life.is-gained');
    if (row.firstElementChild && row.firstElementChild.classList.contains('life--lg')) {
      life.classList.add('life--lg');
    }
    row.append(life);
  }
  while (row.children.length > maxLives) row.lastElementChild.remove();

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
  row.setAttribute('aria-label', `${lives} of ${maxLives} lives`);
}

/** A small pixel icon. `scale` is a multiple of the 16px source. */
export function icon(name, scale = 1.5, className = '') {
  const img = el('img.pixel', {
    src: iconURL(name, 2),
    alt: '',
    'aria-hidden': 'true',
    class: className,
    style: { width: `${Math.round(16 * scale)}px`, height: `${Math.round(16 * scale)}px` },
    draggable: 'false',
  });
  return img;
}

/** Gold counter chip. Returns the element; use `setChipValue` to update it. */
export function goldChip(gold, tip = 'Gold') {
  const value = el('span.chip-value', { text: String(gold) });
  const chip = el('span.chip.chip--gold', { 'data-tip': tip }, [icon('coin', 1), value]);
  chip.setValue = (next) => {
    value.textContent = String(next);
    chip.classList.remove('is-bumped');
    void chip.offsetWidth;
    chip.classList.add('is-bumped');
  };
  return chip;
}

/**
 * Labelled meter: a title row with a value, plus a bar.
 * @returns {{node: HTMLElement, set(ratio: number, text?: string): void}}
 */
export function meter({ label, iconName, ratio = 1, value = '', variant = '' }) {
  const fill = el('div.fill', { style: { width: `${clamp01(ratio) * 100}%` } });
  const bar = el('div.bar', { class: variant }, [fill]);
  const valueNode = el('span.meter-value', { text: value });
  const node = el('div.meter', {}, [
    el('div.meter-head', {}, [
      el('span.row.row--tight', {}, [iconName ? icon(iconName, 0.9) : null, label]),
      valueNode,
    ]),
    bar,
  ]);
  return {
    node,
    bar,
    set(nextRatio, nextValue) {
      const r = clamp01(nextRatio);
      fill.style.width = `${r * 100}%`;
      bar.classList.toggle('is-warn', r <= 0.45 && r > 0.2);
      bar.classList.toggle('is-low', r <= 0.2);
      if (nextValue != null) valueNode.textContent = nextValue;
    },
  };
}

/** Bare bar with no label. */
export function bar(ratio = 1, className = '') {
  const fill = el('div.fill', { style: { width: `${clamp01(ratio) * 100}%` } });
  const node = el('div.bar', { class: className }, [fill]);
  return {
    node,
    set(next) {
      const r = clamp01(next);
      fill.style.width = `${r * 100}%`;
      node.classList.toggle('is-warn', r <= 0.45 && r > 0.2);
      node.classList.toggle('is-low', r <= 0.2);
    },
  };
}

/** Rarity chip. */
export function rarityChip(rarity) {
  return el(`span.chip.chip--${rarity}`, { text: rarity });
}

/** Stat tile for overviews and profiles. */
export function statTile(label, value, iconName) {
  return el('div.stat-tile', {}, [
    el('span.k', { text: label }),
    el('span.v', {}, [iconName ? icon(iconName, 1) : null, String(value)]),
  ]);
}

/**
 * Switch-style toggle.
 * @returns {HTMLLabelElement}
 */
export function toggle({ label, checked = false, onChange, tip }) {
  const input = el('input', {
    type: 'checkbox',
    checked,
    onchange: (e) => onChange && onChange(e.target.checked),
  });
  return el('label.switch', { 'data-tip': tip }, [
    input,
    el('span.track'),
    el('span.switch-label', { text: label }),
  ]);
}

/** Back button with a consistent look and label across every screen. */
export function backButton(onClick, label = 'Back') {
  return el('button.btn.btn--sm.btn--ghost', {
    onclick: onClick,
    'aria-label': label,
  }, ['◀', el('span.back-label', { text: label })]);
}

/** Empty-state block. */
export function emptyState(title, detail, iconName) {
  return el('div.empty', {}, [
    iconName ? icon(iconName, 2.5) : null,
    el('div.empty-title', { text: title }),
    detail ? el('p', { text: detail }) : null,
  ]);
}

function clamp01(n) {
  return Math.max(0, Math.min(1, Number.isFinite(n) ? n : 0));
}
