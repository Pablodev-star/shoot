/**
 * SHOOT! — Inn screen (Block 4).
 */

import { el, clearNode } from '../core/dom.js';
import { attachButtonSounds, play, playMusic } from '../core/audio.js';
import { setRenderer } from '../core/scene.js';
import { iconURL } from '../art/sprites-items.js';
import { getState, spendGold, canAfford, heal, fullHeal } from '../game/player.js';
import { getWorld } from '../game/worlds.js';
import { generateOffers, innSeed } from './inn.js';
import { DISCOUNT_RATE } from './shop.js';
import { finishEncounter } from '../game/run.js';
import { openInventory } from '../ui/inventory-panel.js';
import { livesRow, updateLivesRow, icon } from '../ui/widgets.js';
import { toast } from '../ui/toast.js';
import { createInteriorScene } from './interior-scene.js';
import { EVENTS, on } from '../core/events.js';

export const InnScreen = {
  id: 'inn',

  mount(root, params = {}) {
    const player = getState();
    const world = getWorld(player.world);
    const offers = generateOffers(player.world, innSeed(player.world, params.encounter?.index ?? 0, player.seed));
    const rested = new Set();

    playMusic('themeMenu');
    setRenderer(createInteriorScene('inn'));

    const lives = livesRow(player.lives, player.maxLives, { big: true });
    const goldLabel = el('span', { text: String(player.gold) });
    const bedList = el('div.bed-list');

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
        toast('Not enough gold', 'bad');
        return;
      }
      spendGold(offer.price);
      const healed = offer.heal === Infinity ? fullHeal() : heal(offer.heal);
      rested.add(offer.id);
      goldLabel.textContent = String(getState().gold);
      play('coin');
      toast(`Slept well — ${healed} ${healed === 1 ? 'life' : 'lives'} back`, 'good');
      renderBeds();
    }

    function renderBeds() {
      clearNode(bedList);
      offers.forEach((offer) => {
        const used = rested.has(offer.id);
        bedList.append(
          el('div.bed-card', { class: used ? 'is-used' : '' }, [
            el('img.pixel', { src: iconURL('bed', 3), width: '48', height: '48' }),
            el('div.col.grow', { style: { gap: '4px' } }, [
              el('div.bed-name', {}, [
                offer.name,
                offer.discounted && !used
                  ? el('span.discount-flag.inline', { text: `-${Math.round(DISCOUNT_RATE * 100)}%` })
                  : null,
              ]),
              el('p.shop-desc', { text: offer.desc }),
            ]),
            el('div.col', { style: { alignItems: 'flex-end', gap: '6px' } }, [
              el('div.shop-price', {}, [
                icon('coin', 1),
                offer.discounted ? el('span.old-price', { text: String(offer.fullPrice) }) : null,
                el('span', { text: String(offer.price) }),
              ]),
              used
                ? el('button.btn.btn--small', { disabled: true }, ['Rested'])
                : el('button.btn.btn--small.btn--gold', { onclick: () => rest(offer) }, ['Sleep']),
            ]),
          ]),
        );
      });
      attachButtonSounds(bedList);
    }

    renderBeds();

    const screen = el('div.screen.venue-screen', {}, [
      el('div.screen-header', {}, [
        el('span.chip', { text: world.name }),
        el('h1.screen-title', { text: 'Inn' }),
        el('span.chip.chip--gold', {}, [icon('coin', 1), goldLabel]),
      ]),

      el('div.panel.venue-panel', {}, [
        el('div.row', { style: { justifyContent: 'center', marginBottom: '10px' } }, [lives]),
        el('p.panel-sub', { text: 'A bed, a roof, and no one asking questions.' }),
        bedList,
      ]),

      el('div.row', {}, [
        el('button.btn', {
          onclick: () =>
            openInventory({
              context: 'walk',
              onClose: () => {
                goldLabel.textContent = String(getState().gold);
              },
            }),
        }, ['Saddlebag']),
        el('button.btn.btn--primary', { onclick: () => finishEncounter() }, ['Back to the road']),
      ]),
    ]);

    root.append(screen);
    attachButtonSounds(screen);

    return () => unsub();
  },
};
