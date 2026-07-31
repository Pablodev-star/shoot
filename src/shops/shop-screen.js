/**
 * SHOOT! — Shop screen.
 *
 * Three questions answered per card without reading: what is it (icon + the
 * rarity colour on the card's top edge), can I afford it (price colour + button
 * state), is it a bargain (the tag hanging off the corner). Anything you cannot
 * buy says why on the button itself.
 *
 * Removed in the rebuild: the subtitle ("the shopkeeper lays out 3 things worth
 * having" — a sentence that carried no information), the COMMON chip on every
 * card, and the panel that wrapped the grid of cards inside another frame.
 */

import { el, clearNode } from '../core/dom.js';
import { attachButtonSounds, play, playMusic } from '../core/audio.js';
import { setRenderer } from '../core/scene.js';
import { framedIconURL } from '../art/sprites-items.js';
import { getState, addItem, spendGold, canAfford, canHold } from '../game/player.js';
import { generateStock, shopSeed, DISCOUNT_RATE } from './shop.js';
import { finishEncounter } from '../game/run.js';
import { openInventory } from '../ui/inventory-panel.js';
import { icon, rarityChip } from '../ui/widgets.js';
import { trailBand } from '../ui/statusbar.js';
import { toast } from '../ui/toast.js';
import { createInteriorScene } from './interior-scene.js';

export const ShopScreen = {
  id: 'shop',

  mount(root, params = {}) {
    const player = getState();
    const seed = shopSeed(player.world, params.encounter?.index ?? 0, player.seed);
    const stock = generateStock(player.world, seed);

    playMusic('themeMenu');
    setRenderer(createInteriorScene('shop'));

    const band = trailBand();
    const grid = el('div.shop-grid.stagger');

    function buy(entry, card) {
      if (entry.soldOut) return;
      if (!canHold(entry.item.id)) {
        play('error');
        toast(`You cannot carry another ${entry.item.name}`, 'bad');
        return;
      }
      if (!canAfford(entry.price)) {
        play('error');
        toast(`${entry.price - getState().gold} gold short`, 'bad');
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
      renderStock();
    }

    function renderStock() {
      clearNode(grid);
      stock.forEach((entry) => {
        const affordable = canAfford(entry.price);
        const room = canHold(entry.item.id);
        const blocked = entry.soldOut || !room;

        const card = el(
          'div.shop-card',
          {
            class: [
              `rarity-${entry.item.rarity}`,
              blocked ? 'is-sold' : '',
              !affordable && !blocked ? 'is-poor' : '',
            ].filter(Boolean).join(' '),
          },
          [
            entry.discounted && !blocked
              ? el('span.discount-flag', { text: `-${Math.round(DISCOUNT_RATE * 100)}%` })
              : null,

            // 20px art at 3x = a 60px canvas shown at 60px: an exact multiple,
            // the only way pixel art stays crisp.
            el('img.pixel.shop-icon', {
              src: framedIconURL(entry.item.icon, entry.item.rarity, 3),
              width: '60',
              height: '60',
              alt: '',
            }),

            el('div.shop-name', { text: entry.item.name }),
            rarityChip(entry.item.rarity),
            el('p.shop-desc', { text: entry.item.desc }),

            el('div.card-foot', {}, [
              el('div.shop-price', {}, [
                icon('coin', 1),
                entry.discounted ? el('span.old-price', { text: String(entry.fullPrice) }) : null,
                el('span', { text: String(entry.price) }),
              ]),

              entry.soldOut
                ? el('button.btn.btn--sm', { disabled: true }, ['Bought'])
                : !room
                  ? el('button.btn.btn--sm', { disabled: true }, ['Bag full'])
                  : el('button.btn.btn--sm.btn--gold', {
                      onclick: () => buy(entry, card),
                      'aria-label': `Buy ${entry.item.name} for ${entry.price} gold`,
                    }, ['Buy']),
            ]),
          ],
        );
        grid.append(card);
      });
      attachButtonSounds(grid);
    }

    renderStock();

    const screen = el('div.screen.venue-screen', {}, [
      band,
      el('div.screen-body', {}, [
        el('h1.screen-title', { text: 'General Store' }),
        el('div.panel.panel--braced.venue-board', {}, [grid]),
      ]),
      el('div.screen-footer', {}, [
        el('button.btn.btn--ghost', {
          onclick: () => openInventory({ context: 'shop' }),
        }, [icon('shopTag', 1.1), 'Saddlebag']),
        el('button.btn.btn--primary', { onclick: () => finishEncounter() }, ['Back to the road']),
      ]),
    ]);

    root.append(screen);
    attachButtonSounds(screen);

    return () => band.dispose();
  },
};
