/**
 * SHOOT! — Inn screen.
 *
 * Two offers, side by side, with the thing that actually matters — how many
 * lives you get back — stated in words and shown in diamonds.
 */

import { el, clearNode } from '../core/dom.js';
import { attachButtonSounds, play, playMusic } from '../core/audio.js';
import { setRenderer } from '../core/scene.js';
import { iconURL } from '../art/sprites-items.js';
import { getState, spendGold, canAfford, heal, fullHeal } from '../game/player.js';
import { generateOffers, innSeed } from './inn.js';
import { DISCOUNT_RATE } from './shop.js';
import { finishEncounter } from '../game/run.js';
import { openInventory } from '../ui/inventory-panel.js';
import { livesRow, updateLivesRow, icon } from '../ui/widgets.js';
import { statusBar } from '../ui/statusbar.js';
import { toast } from '../ui/toast.js';
import { createInteriorScene } from './interior-scene.js';
import { EVENTS, on } from '../core/events.js';

export const InnScreen = {
  id: 'inn',

  mount(root, params = {}) {
    const player = getState();
    const offers = generateOffers(
      player.world,
      innSeed(player.world, params.encounter?.index ?? 0, player.seed),
    );
    const rested = new Set();

    playMusic('themeMenu');
    setRenderer(createInteriorScene('inn'));

    const bar = statusBar({ subtitle: 'Resting at the inn' });
    const lives = livesRow(player.lives, player.maxLives, { large: true });
    const bedList = el('div.bed-list.stagger');

    const unsub = on(EVENTS.LIVES_CHANGED, ({ lives: l, maxLives }) =>
      updateLivesRow(lives, l, maxLives),
    );

    function rest(offer) {
      const state = getState();
      if (rested.has(offer.id)) return;
      if (state.lives >= state.maxLives) {
        play('error');
        toast('You are already well rested', 'bad');
        return;
      }
      if (!canAfford(offer.price)) {
        play('error');
        toast(`${offer.price - state.gold} gold short`, 'bad');
        return;
      }
      spendGold(offer.price);
      const healed = offer.heal === Infinity ? fullHeal() : heal(offer.heal);
      rested.add(offer.id);
      play('coin');
      toast(`Slept well — ${healed} ${healed === 1 ? 'life' : 'lives'} back`, 'good');
      renderBeds();
    }

    function renderBeds() {
      clearNode(bedList);
      const state = getState();
      const full = state.lives >= state.maxLives;

      offers.forEach((offer) => {
        const used = rested.has(offer.id);
        const gain = offer.heal === Infinity
          ? state.maxLives - state.lives
          : Math.min(offer.heal, state.maxLives - state.lives);

        bedList.append(
          el('div.bed-card', {
            class: `${used ? 'is-used' : ''} ${offer.id === 'premium' ? 'is-premium' : ''}`.trim(),
          }, [
            el('img.pixel', { src: iconURL('bed', 3), width: '48', height: '48', alt: '' }),

            el('div.col', { style: { gap: '4px' } }, [
              el('div.bed-name', {}, [
                offer.name,
                offer.discounted && !used
                  ? el('span.discount-flag.inline', { text: `-${Math.round(DISCOUNT_RATE * 100)}%` })
                  : null,
              ]),
              el('p.shop-desc', { style: { minHeight: '0' }, text: offer.desc }),
              !used && !full
                ? el('span.chip.chip--gold', { text: `+${gain} ${gain === 1 ? 'life' : 'lives'}` })
                : null,
            ]),

            el('div.bed-buy', {}, [
              el('div.shop-price', {}, [
                icon('coin', 1),
                offer.discounted ? el('span.old-price', { text: String(offer.fullPrice) }) : null,
                el('span', { text: String(offer.price) }),
              ]),
              used
                ? el('button.btn.btn--sm', { disabled: true }, ['Rested'])
                : full
                  ? el('button.btn.btn--sm', { disabled: true, 'data-tip': 'Nothing to heal' }, ['Full'])
                  : el('button.btn.btn--sm.btn--gold', {
                      onclick: () => rest(offer),
                      'aria-label': `${offer.name} for ${offer.price} gold`,
                    }, ['Sleep']),
            ]),
          ]),
        );
      });
      attachButtonSounds(bedList);
    }

    renderBeds();

    const screen = el('div.screen.venue-screen', {}, [
      bar,
      el('div.screen-body', { style: { maxWidth: 'var(--content)' } }, [
        el('h1.screen-title', { text: 'Inn' }),
        el('p.panel-sub', { text: 'A bed, a roof, and no one asking questions' }),
        el('div.panel.col', { style: { gap: 'var(--sp-4)' } }, [
          el('div.row', { style: { justifyContent: 'center' } }, [lives]),
          bedList,
        ]),
      ]),
      el('div.screen-footer', {}, [
        el('button.btn.btn--ghost', {
          onclick: () => openInventory({ context: 'walk', onClose: renderBeds }),
        }, [icon('shopTag', 1.1), 'Saddlebag']),
        el('button.btn.btn--primary', { onclick: () => finishEncounter() }, ['Back to the road']),
      ]),
    ]);

    root.append(screen);
    attachButtonSounds(screen);

    return () => {
      unsub();
      bar.dispose();
    };
  },
};
