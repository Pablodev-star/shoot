/**
 * SHOOT! — Inventory overlay (Block 4).
 *
 * One component, three contexts:
 *   'walk'  — eat, heal, read the Map, sell anything
 *   'shop'  — selling is emphasised (you are standing at a counter)
 *   'duel'  — only duel-legal items are actionable
 *
 * Opening it never breaks the flow: the caller passes `onOpen`/`onClose` hooks
 * so the walk engine can pause and resume around it.
 */

import { el, clearNode } from '../core/dom.js';
import { attachButtonSounds, play } from '../core/audio.js';
import { framedIconURL } from '../art/sprites-items.js';
import { getInventory, sellItem, useItem, getState } from '../game/player.js';
import { sellPrice } from '../game/progression.js';
import { EVENTS, on } from '../core/events.js';
import { toast } from '../ui/toast.js';
import { rarityChip } from './widgets.js';

/**
 * @param {object} opts
 * @param {'walk'|'shop'|'duel'} opts.context
 * @param {(itemId: string, result: object) => void} [opts.onUse]
 * @param {() => void} [opts.onClose]
 * @param {(id: string) => boolean} [opts.canUse] extra gate (duel screen uses it)
 */
export function openInventory(opts = {}) {
  const context = opts.context || 'walk';
  const grid = el('div.inv-grid');
  const detail = el('div.inv-detail');
  let selected = null;

  const backdrop = el('div.modal-backdrop', {
    onclick: (e) => {
      if (e.target === backdrop) close();
    },
  });

  function close() {
    unsub();
    backdrop.remove();
    if (opts.onClose) opts.onClose();
  }

  function renderDetail() {
    clearNode(detail);
    if (!selected) {
      detail.append(
        el('p.muted.center', { text: 'Select an item to inspect, use or sell it.' }),
      );
      return;
    }
    const { item, qty } = selected;
    const value = sellPrice(item, getState().world);
    const usable =
      (item.context === 'anytime' || (item.context === 'duel' && context === 'duel') ||
        item.context === 'utility') &&
      (!opts.canUse || opts.canUse(item.id));

    detail.append(
      el('div.inv-detail-head', {}, [
        el('img.pixel', { src: framedIconURL(item.icon, item.rarity, 3), width: '60', height: '60' }),
        el('div.col', { style: { gap: '4px' } }, [
          el('div.inv-name', { text: item.name }),
          rarityChip(item.rarity),
        ]),
      ]),
      el('p.inv-desc', { text: item.desc }),
      el('div.row', { style: { justifyContent: 'space-between' } }, [
        el('span.muted', { text: `Owned: ${qty}` }),
        el('span.muted', { text: `Sells for ${value}g` }),
      ]),
      el('div.row', { style: { marginTop: '10px' } }, [
        usable
          ? el('button.btn.btn--small.btn--gold', { onclick: () => doUse(item.id) }, [
              item.food ? 'Eat' : item.context === 'utility' ? 'Read' : 'Use',
            ])
          : el('button.btn.btn--small', { disabled: true }, [
              item.context === 'passive' ? 'Passive' : item.context === 'special' ? 'Equipped' : 'Duel only',
            ]),
        el('button.btn.btn--small.btn--danger', { onclick: () => doSell(item.id) }, [`Sell ${value}g`]),
      ]),
    );
    attachButtonSounds(detail);
  }

  function doUse(id) {
    // `useOpts` lets the duel screen hand over its own life counts.
    const result = useItem(id, { context, ...(opts.useOpts ? opts.useOpts() : {}) });
    if (!result.ok) {
      play('error');
      toast(result.reason || 'Cannot use that', 'bad');
      return;
    }
    if (opts.onUse) opts.onUse(id, result);
    if (result.effect === 'food') toast('That hits the spot', 'good');
    if (result.effect === 'heal') toast(`Restored ${result.amount} life`, 'good');
    if (context === 'duel') close();
    else renderAll();
  }

  function doSell(id) {
    const value = sellItem(id);
    if (value > 0) toast(`Sold for ${value}g`, 'gold');
    selected = null;
    renderAll();
  }

  function renderGrid() {
    clearNode(grid);
    const entries = getInventory();
    if (entries.length === 0) {
      grid.append(el('p.muted.center', { text: 'Your saddlebag is empty.' }));
      return;
    }
    for (const entry of entries) {
      const { item, qty } = entry;
      const cell = el(
        'button.inv-cell',
        {
          class: selected && selected.item.id === item.id ? 'is-selected' : '',
          onclick: () => {
            selected = entry;
            renderGrid();
            renderDetail();
          },
          title: item.name,
        },
        [
          el('img.pixel', { src: framedIconURL(item.icon, item.rarity, 2), width: '40', height: '40' }),
          qty > 1 ? el('span.inv-qty', { text: `x${qty}` }) : null,
        ],
      );
      grid.append(cell);
    }
    attachButtonSounds(grid);
  }

  function renderAll() {
    // Keep the selection pointing at a live entry after a sale.
    if (selected) {
      const fresh = getInventory().find((e) => e.item.id === selected.item.id);
      selected = fresh || null;
    }
    renderGrid();
    renderDetail();
  }

  const modal = el('div.panel.modal.inv-modal', {}, [
    el('div.row', { style: { justifyContent: 'space-between', marginBottom: '10px' } }, [
      el('h2.panel-title', { style: { margin: 0 }, text: 'Saddlebag' }),
      el('button.btn.btn--small.btn--ghost', { onclick: close }, ['Close']),
    ]),
    el('div.inv-layout', {}, [grid, detail]),
  ]);

  backdrop.append(modal);
  document.getElementById('app').append(backdrop);

  const unsubInv = on(EVENTS.INVENTORY_CHANGED, renderAll);
  const unsub = () => unsubInv();

  renderAll();
  attachButtonSounds(modal);

  if (opts.onOpen) opts.onOpen();

  return { close, refresh: renderAll };
}
