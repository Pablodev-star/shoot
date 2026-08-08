/**
 * SHOOT! — Shared UI widgets.
 *
 * These are the only places that know what a life, a meter, a cylinder or a
 * back button look like. Screens compose them; they never hand-roll the markup.
 *
 * The red-diamond life row has survived every version of this game since the
 * Roblox prototype and must never change shape.
 */

import { el } from '../core/dom.js';
import { iconURL } from '../art/sprites-items.js';
import { uiIconURL } from '../art/sprites-ui.js';

/**
 * Row of red diamonds.
 * @param {number} lives current
 * @param {number} maxLives capacity (missing lives are drawn hollow)
 * @param {{large?: boolean, small?: boolean}} opts
 */
export function livesRow(lives, maxLives, opts = {}) {
  const size = opts.large ? 'life--lg' : opts.small ? 'life--sm' : '';
  const row = el('div.lives', {
    role: 'img',
    'aria-label': `${lives} of ${maxLives} lives`,
  });
  for (let i = 0; i < maxLives; i++) {
    row.append(el('span.life', { class: `${i < lives ? '' : 'is-empty'} ${size}`.trim() }));
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
    const sizeClass = row.firstElementChild?.classList;
    if (sizeClass?.contains('life--lg')) life.classList.add('life--lg');
    if (sizeClass?.contains('life--sm')) life.classList.add('life--sm');
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

/**
 * A revolver cylinder: every chamber is drawn, loaded ones hold a round.
 *
 * This is why the duel no longer prints "no bullets" under each fighter — an
 * empty gun is six dark holes, which needs no caption.
 *
 * @param {number} loaded @param {number} chambers
 */
export function cylinder(loaded, chambers = 6) {
  const node = el('div.cylinder', {
    role: 'img',
    'aria-label': `${loaded} of ${chambers} chambers loaded`,
  });
  for (let i = 0; i < chambers; i++) {
    node.append(el('span.chamber', { class: i < loaded ? 'is-loaded' : '' }));
  }
  return node;
}

/** Update a cylinder in place, flaring only the chambers that just filled. */
export function updateCylinder(node, loaded) {
  [...node.children].forEach((chamber, i) => {
    const wasLoaded = chamber.classList.contains('is-loaded');
    const isLoaded = i < loaded;
    chamber.classList.toggle('is-loaded', isLoaded);
    chamber.classList.remove('is-fresh');
    if (isLoaded && !wasLoaded) {
      void chamber.offsetWidth;
      chamber.classList.add('is-fresh');
    }
  });
  node.setAttribute('aria-label', `${loaded} of ${node.children.length} chambers loaded`);
}

/** A small pixel item icon. `scale` is a multiple of the 16px source. */
export function icon(name, scale = 1.5, className = '') {
  return el('img.pixel', {
    src: iconURL(name, 2),
    alt: '',
    'aria-hidden': 'true',
    class: className,
    style: { width: `${Math.round(16 * scale)}px`, height: `${Math.round(16 * scale)}px` },
    draggable: 'false',
  });
}

/**
 * A pixel interface icon — back arrows, crosses, the help mark.
 *
 * Everything the chrome used to say with a typed character (`◀`, `✕`, `?`)
 * comes from here instead, so it is drawn in the game's own palette at the
 * game's own resolution rather than borrowed from the system font.
 */
export function uiIcon(name, scale = 1.25, className = '') {
  return el('img.pixel', {
    src: uiIconURL(name, 2),
    alt: '',
    'aria-hidden': 'true',
    class: className,
    style: { width: `${Math.round(16 * scale)}px`, height: `${Math.round(16 * scale)}px` },
    draggable: 'false',
  });
}

/** Gold counter chip. Returns the element; call `setValue` to update it. */
export function goldChip(gold, tip = 'Gold') {
  const value = el('span', { text: String(gold) });
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
 * A vital gauge: an icon, a notched track, and the number inside the track.
 *
 * It replaced a stacked meter — a label row with the value on the far right,
 * and a bar underneath it — which was as tall as the whole rest of the travel
 * band and, given a full-width row to sit in, drew a metre-long hunger bar.
 * Everything is on one line here, so the band stays one line, and the number
 * rides inside the track instead of at the other end of the strip from it.
 *
 * The notches are the point. A smooth bar at 40% is a percentage; ten ration
 * marks with four of them left is a supply, and the player can read it without
 * reading the number at all.
 *
 * `setRate` is how a gauge says it is emptying faster than normal — a badge
 * with the multiplier on it, and a state class on the track so the track can
 * show the reason (see the scoured hunger gauge in styles/ui.css). A rate
 * change the player cannot see is a difficulty change they can only discover
 * by losing to it.
 *
 * @returns {{
 *   node: HTMLElement,
 *   track: HTMLElement,
 *   set(ratio: number, text?: string): void,
 *   setRate(rate: {text: string, tip?: string, state?: string} | null): void,
 * }}
 */
export function gauge({ label, iconName, ratio = 1, value = '', tip = '' } = {}) {
  const fill = el('div.gauge-fill', { style: { width: `${clamp01(ratio) * 100}%` } });
  const valueNode = el('span.gauge-value', { text: value });
  const track = el('div.gauge-track', {}, [fill, el('span.gauge-notches'), valueNode]);
  const rateNode = el('span.gauge-rate', { hidden: true });
  const node = el('div.gauge', {
    role: 'meter',
    'aria-label': label,
    'aria-valuemin': '0',
    'aria-valuemax': '100',
    'aria-valuenow': String(Math.round(clamp01(ratio) * 100)),
    'data-tip': tip || label,
  }, [
    iconName ? icon(iconName, 0.9, 'gauge-icon') : null,
    label ? el('span.gauge-label', { text: label }) : null,
    track,
    rateNode,
  ]);

  let rateState = null;
  applyLevel(track, clamp01(ratio));

  return {
    node,
    track,
    set(nextRatio, nextValue) {
      const r = clamp01(nextRatio);
      fill.style.width = `${r * 100}%`;
      applyLevel(track, r);
      node.setAttribute('aria-valuenow', String(Math.round(r * 100)));
      if (nextValue != null) valueNode.textContent = nextValue;
    },
    setRate(rate) {
      if (rateState) track.classList.remove(rateState);
      rateState = rate?.state || null;
      rateNode.hidden = !rate;
      rateNode.textContent = rate?.text || '';
      if (rate?.tip) rateNode.dataset.tip = rate.tip;
      else delete rateNode.dataset.tip;
      if (rateState) track.classList.add(rateState);
    },
  };
}

/** Three thresholds, one class each: getting low, nearly gone, gone. */
function applyLevel(track, r) {
  track.classList.toggle('is-warn', r <= 0.45 && r > 0.2);
  track.classList.toggle('is-low', r <= 0.2 && r > 0);
  track.classList.toggle('is-empty', r <= 0);
}

/**
 * Rarity chip — only ever shown for rare and legendary.
 *
 * Common is the default for most of the catalogue, so a "COMMON" chip on every
 * card was noise: it appeared so often it stopped carrying information, while
 * the card's top edge and the icon frame already say the same thing.
 */
export function rarityChip(rarity) {
  if (rarity === 'common') return null;
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

/** Back button — same look, same label, same place on every screen. */
export function backButton(onClick, label = 'Back') {
  return el('button.btn.btn--sm.btn--ghost', {
    onclick: onClick,
    'aria-label': label,
  }, [uiIcon('chevronLeft', 1), el('span', { text: label })]);
}

/** Square icon-only button. `name` is a UI icon. */
export function iconButton(name, { onClick, label, tip, variant = 'btn--ghost' } = {}) {
  return el(`button.btn.btn--sm.btn--icon.${variant}`, {
    onclick: onClick,
    'aria-label': label,
    'data-tip': tip || label,
  }, [uiIcon(name, 1.1)]);
}

/** The close cross used by every dialog. */
export function closeButton(onClick) {
  return iconButton('close', { onClick, label: 'Close' });
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
