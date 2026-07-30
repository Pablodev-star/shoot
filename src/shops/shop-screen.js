/**
 * SHOOT! — Shop screen (Block 4).
 */

import { el, clearNode } from '../core/dom.js';
import { attachButtonSounds, play, playMusic } from '../core/audio.js';
import { setRenderer } from '../core/scene.js';
import { framedIconURL } from '../art/sprites-items.js';
import { getState, addItem, spendGold, canAfford } from '../game/player.js';
import { getWorld } from '../game/worlds.js';
import { generateStock, shopSeed, DISCOUNT_RATE } from './shop.js';
import { finishEncounter } from '../game/run.js';
import { openInventory } from '../ui/inventory-panel.js';
import { livesRow, icon, rarityChip } from '../ui/widgets.js';
import { toast } from '../ui/toast.js';
import { createInteriorScene } from './interior-scene.js';

export const ShopScreen = {
  id: 'shop',

  mount(root, params = {}) {
    const player = getState();
    const world = getWorld(player.world);
    const seed = shopSeed(player.world, params.encounter?.index ?? 0, player.seed);
    const stock = generateStock(player.world, seed);

    playMusic('themeMenu');
    setRenderer(createInteriorScene('shop'));

    const goldLabel = el('span', { text: String(player.gold) });
    const grid = el('div.shop-grid');

    function refreshGold() {
      goldLabel.textContent = String(getState().gold);
    }

    function buy(entry, card) {
      if (entry.soldOut) return;
      if (!canAfford(entry.price)) {
        play('error');
        toast('Not enough gold', 'bad');
        card.classList.remove('shake');
        void card.offsetWidth;
        card.classList.add('shake');
        return;
      }
      spendGold(entry.price);
      addItem(entry.item.id, 1);
      getState().stats.itemsBought += 1;
      entry.soldOut = true;
      play('coin');
      toast(`Bought ${entry.item.name}`, 'gold');
      refreshGold();
      renderStock();
    }

    function renderStock() {
      clearNode(grid);
      stock.forEach((entry) => {
        const affordable = canAfford(entry.price);
        const card = el(
          'div.shop-card',
          { class: `${entry.soldOut ? 'is-sold' : ''} ${!affordable && !entry.soldOut ? 'is-poor' : ''}`.trim() },
          [
            entry.discounted && !entry.soldOut
              ? el('span.discount-flag', { text: `-${Math.round(DISCOUNT_RATE * 100)}%` })
              : null,
            // 20px art at 3x = a 60px canvas shown at 60px: an exact multiple,
            // which is the only way pixel art stays crisp.
            el('img.pixel.shop-icon', {
              src: framedIconURL(entry.item.icon, entry.item.rarity, 3),
              width: '60',
              height: '60',
            }),
            el('div.shop-name', { text: entry.item.name }),
            rarityChip(entry.item.rarity),
            el('p.shop-desc', { text: entry.item.desc }),
            el('div.shop-price', {}, [
              icon('coin', 1),
              entry.discounted
                ? el('span.old-price', { text: String(entry.fullPrice) })
                : null,
              el('span', { text: String(entry.price) }),
            ]),
            entry.soldOut
              ? el('button.btn.btn--small', { disabled: true }, ['Sold'])
              : el('button.btn.btn--small.btn--gold', { onclick: () => buy(entry, card) }, ['Buy']),
          ],
        );
        grid.append(card);
      });
      attachButtonSounds(grid);
    }

    renderStock();

    const screen = el('div.screen.venue-screen', {}, [
      el('div.screen-header', {}, [
        el('div.row', {}, [
          el('span.chip', { text: world.name }),
          livesRow(player.lives, player.maxLives),
        ]),
        el('h1.screen-title', { text: 'General Store' }),
        el('span.chip.chip--gold', {}, [icon('coin', 1), goldLabel]),
      ]),

      el('div.panel.venue-panel', {}, [
        el('p.panel-sub', {
          text: `The shopkeeper lays out ${stock.length} things worth having.`,
        }),
        grid,
      ]),

      el('div.row', {}, [
        el('button.btn', {
          onclick: () =>
            openInventory({
              context: 'shop',
              onClose: refreshGold,
            }),
        }, ['Saddlebag · Sell']),
        el('button.btn.btn--primary', { onclick: () => finishEncounter() }, ['Back to the road']),
      ]),
    ]);

    root.append(screen);
    attachButtonSounds(screen);
  },
};
