/**
 * SHOOT! — Inventory overlay.
 *
 * One component, three contexts:
 *   'walk'  — eat, heal, open the Map, sell anything
 *   'shop'  — the same, with selling to hand
 *   'duel'  — only duel-legal items are actionable
 *
 * Design notes:
 *  - Filter tabs, because by world 3 the bag is a wall of icons. There used to
 *    be five: `Healing` has gone, because every healing item was already under
 *    `Food` or `Duel` and a tab that only ever shows things you can reach in
 *    one tap elsewhere is a tab that has to be checked for nothing.
 *  - The detail pane always says what the selected item will do and what it is
 *    worth, so nothing has to be remembered.
 *  - Items that cannot be used right now explain why instead of going grey.
 *  - Opening it never breaks the flow: the caller pauses and resumes around it.
 */

import { el, clearNode, appendAll } from '../core/dom.js';
import { attachButtonSounds, play } from '../core/audio.js';
import { framedIconURL } from '../art/sprites-items.js';
import { getInventory, sellItem, useItem, getState } from '../game/player.js';
import { sellPrice } from '../game/progression.js';
import { EVENTS, on } from '../core/events.js';
import { toast } from './toast.js';
import { rarityChip, emptyState, icon, closeButton } from './widgets.js';

const FILTERS = [
  { id: 'all', label: 'All', match: () => true },
  { id: 'food', label: 'Food', match: (item) => !!item.food || !!item.heal },
  { id: 'duel', label: 'Duel', match: (item) => item.context === 'duel' },
  { id: 'gear', label: 'Gear', match: (item) => item.context === 'passive' || item.context === 'special' },
];

/**
 * @param {object} opts
 * @param {'walk'|'shop'|'duel'} opts.context
 * @param {() => object} [opts.useOpts] extra options passed to useItem
 * @param {(id: string) => boolean} [opts.canUse]
 * @param {(itemId: string, result: object) => void} [opts.onUse]
 * @param {() => void} [opts.onOpen]
 * @param {() => void} [opts.onClose]
 */
export function openInventory(opts = {}) {
  const context = opts.context || 'walk';
  const grid = el('div.inv-grid', { role: 'listbox', 'aria-label': 'Saddlebag' });
  const detail = el('div.inv-detail');
  const tabsBar = el('div.tabs', { role: 'tablist' });
  let selectedId = null;
  let filter = 'all';

  const backdrop = el('div.modal-backdrop', {
    onclick: (e) => {
      if (e.target === backdrop) close();
    },
  });

  function close() {
    unsubInv();
    document.removeEventListener('keydown', onKey);
    backdrop.remove();
    if (opts.onClose) opts.onClose();
  }

  const onKey = (e) => {
    if (e.key === 'Escape' || e.key === 'i' || e.key === 'I') close();
  };
  document.addEventListener('keydown', onKey);

  /** Why an item cannot be used right now — or null when it can. */
  function blockedReason(item) {
    if (item.context === 'passive') return 'Works on its own while you carry it';
    if (item.context === 'special') return 'Already in use';
    if (item.context === 'duel' && context !== 'duel') return 'Only in a duel';
    if (opts.canUse && !opts.canUse(item.id)) return 'Not usable here';
    return null;
  }

  function actionLabel(item) {
    if (item.food) return 'Eat';
    if (item.heal) return 'Use';
    if (item.context === 'utility') return 'Open';
    return 'Throw';
  }

  function renderTabs() {
    clearNode(tabsBar);
    for (const f of FILTERS) {
      tabsBar.append(
        el('button.tab', {
          role: 'tab',
          'aria-selected': String(filter === f.id),
          onclick: () => {
            filter = f.id;
            renderAll();
          },
          text: f.label,
        }),
      );
    }
  }

  function renderDetail() {
    clearNode(detail);
    const entry = getInventory().find((e) => e.item.id === selectedId);

    if (!entry) {
      detail.append(
        emptyState('Nothing selected', 'Pick something from the bag to see what it does.'),
      );
      return;
    }

    const { item, qty } = entry;
    const value = sellPrice(item, getState().world);
    const blocked = blockedReason(item);

    appendAll(detail, [
      el('div.inv-detail-head', {}, [
        el('img.pixel', {
          src: framedIconURL(item.icon, item.rarity, 3),
          width: '60',
          height: '60',
          alt: '',
        }),
        el('div.col', { style: { gap: '4px' } }, [
          el('div.inv-name', { text: item.name }),
          el('div.row.row--tight', {}, [rarityChip(item.rarity), el('span.chip', { text: `x${qty}` })]),
        ]),
      ]),
      el('p.inv-desc', { text: item.desc }),
      blocked ? el('p.field-hint', { text: blocked }) : null,
      el('div.inv-actions', {}, [
        blocked
          ? el('button.btn.btn--sm', { disabled: true }, [actionLabel(item)])
          : el('button.btn.btn--sm.btn--gold', { onclick: () => doUse(item.id) }, [actionLabel(item)]),
        el('button.btn.btn--sm.btn--danger', {
          onclick: () => doSell(item.id),
          'data-tip': 'Sell one for half its shop price',
        }, ['Sell', icon('coin', 0.9), String(value)]),
      ]),
    ]);
    attachButtonSounds(detail);
  }

  function doUse(id) {
    const result = useItem(id, { context, ...(opts.useOpts ? opts.useOpts() : {}) });
    if (!result.ok) {
      play('error');
      toast(result.reason || 'Cannot use that', 'bad');
      return;
    }
    if (opts.onUse) opts.onUse(id, result);
    if (result.effect === 'food') toast('That hits the spot', 'good');
    if (result.effect === 'heal') {
      toast(`Restored ${result.amount} ${result.amount === 1 ? 'life' : 'lives'}`, 'good');
    }
    if (context === 'duel') close();
    else renderAll();
  }

  function doSell(id) {
    const value = sellItem(id);
    if (value > 0) toast(`Sold for ${value} gold`, 'gold');
    renderAll();
  }

  function renderGrid() {
    clearNode(grid);
    const active = FILTERS.find((f) => f.id === filter) || FILTERS[0];
    const entries = getInventory().filter((e) => active.match(e.item));

    if (entries.length === 0) {
      grid.append(
        emptyState(
          filter === 'all' ? 'Your saddlebag is empty' : 'Nothing of that kind',
          filter === 'all' ? 'Shops on the road will sell you what you need.' : 'Try another tab.',
        ),
      );
      return;
    }

    for (const entry of entries) {
      const { item, qty } = entry;
      grid.append(
        el('button.inv-cell', {
          role: 'option',
          'aria-pressed': String(selectedId === item.id),
          'aria-label': `${item.name}, ${qty}`,
          'data-tip': item.name,
          onclick: () => {
            selectedId = item.id;
            renderGrid();
            renderDetail();
          },
        }, [
          el('img.pixel', {
            src: framedIconURL(item.icon, item.rarity, 2),
            width: '40',
            height: '40',
            alt: '',
          }),
          qty > 1 ? el('span.inv-qty', { text: `x${qty}` }) : null,
        ]),
      );
    }
    attachButtonSounds(grid);
  }

  function renderAll() {
    // Keep the selection pointing at something that still exists.
    if (selectedId && !getInventory().some((e) => e.item.id === selectedId)) selectedId = null;
    renderTabs();
    renderGrid();
    renderDetail();
  }

  const modal = el('div.panel.modal.inv-modal', { role: 'dialog', 'aria-label': 'Saddlebag' }, [
    el('div.modal-header', {}, [
      el('h2.panel-title', { text: 'Saddlebag' }),
      el('div.row', {}, [
        el('span.chip.chip--gold', {}, [icon('coin', 1), String(getState().gold)]),
        closeButton(close),
      ]),
    ]),
    el('div.modal-content.col', { style: { gap: 'var(--sp-3)' } }, [
      tabsBar,
      el('div.inv-layout', {}, [grid, detail]),
    ]),
  ]);

  backdrop.append(modal);
  document.getElementById('app').append(backdrop);

  const unsubInv = on(EVENTS.INVENTORY_CHANGED, renderAll);

  renderAll();
  attachButtonSounds(modal);
  if (opts.onOpen) opts.onOpen();

  return { close, refresh: renderAll };
}
