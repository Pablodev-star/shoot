/**
 * SHOOT! — Inn screen.
 *
 * Two offers, side by side. The only thing that matters — how many lives you
 * get back — is stated in the same red diamonds used everywhere else in the
 * game, so it can be compared against the lives you are missing without doing
 * arithmetic.
 *
 * The old version buried this: a bare row of diamonds floated at the top of a
 * panel with no label, the offers were wide rows with the price stranded on the
 * far right, and the whole thing sat inside a panel inside a panel.
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
import { openTrailMapForRun } from '../ui/map-panel.js';
import { livesRow, updateLivesRow, icon } from '../ui/widgets.js';
import { trailBand } from '../ui/statusbar.js';
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

    const band = trailBand();
    const lives = livesRow(player.lives, player.maxLives, { large: true });
    const livesNote = el('span.muted', { text: livesText() });
    const bedGrid = el('div.bed-grid.stagger');

    const unsub = on(EVENTS.LIVES_CHANGED, ({ lives: l, maxLives }) => {
      updateLivesRow(lives, l, maxLives);
      livesNote.textContent = livesText();
    });

    function livesText() {
      const s = getState();
      const missing = s.maxLives - s.lives;
      if (missing === 0) return 'Full health';
      return `${missing} ${missing === 1 ? 'life' : 'lives'} down`;
    }

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
      clearNode(bedGrid);
      const state = getState();
      const full = state.lives >= state.maxLives;

      offers.forEach((offer) => {
        const used = rested.has(offer.id);
        const gain = offer.heal === Infinity
          ? state.maxLives - state.lives
          : Math.min(offer.heal, state.maxLives - state.lives);

        bedGrid.append(
          el('div.bed-card', {
            class: `${used ? 'is-used' : ''} ${offer.id === 'premium' ? 'is-premium' : ''}`.trim(),
          }, [
            offer.discounted && !used
              ? el('span.discount-flag', { text: `-${Math.round(DISCOUNT_RATE * 100)}%` })
              : null,

            el('img.pixel', { src: iconURL('bed', 3), width: '48', height: '48', alt: '' }),
            el('div.bed-name', { text: offer.name }),
            el('p.shop-desc', { text: offer.desc }),

            // What you get, drawn rather than described — and shown only when
            // there is something to get. When you are at full lives the button
            // already says so; saying it here too, and again beside the life
            // row above, was the same sentence three times on one screen.
            full || used ? null : el('div.bed-gain', {}, [
              el('span', { text: 'Restores' }),
              livesRow(gain, gain, { small: true }),
            ]),

            el('div.card-foot', {}, [
              el('div.shop-price', {}, [
                icon('coin', 1),
                offer.discounted ? el('span.old-price', { text: String(offer.fullPrice) }) : null,
                el('span', { text: String(offer.price) }),
              ]),

              used
                ? el('button.btn.btn--sm', { disabled: true }, ['Slept here'])
                : full
                  ? el('button.btn.btn--sm', { disabled: true }, ['Lives full'])
                  : el('button.btn.btn--sm.btn--gold', {
                      onclick: () => rest(offer),
                      'aria-label': `${offer.name} for ${offer.price} gold`,
                    }, ['Sleep']),
            ]),
          ]),
        );
      });
      attachButtonSounds(bedGrid);
    }

    renderBeds();

    const screen = el('div.screen.venue-screen', {}, [
      band,
      el('div.screen-body', {}, [
        el('h1.screen-title', { text: 'Inn' }),
        el('div.panel.panel--braced.venue-board', {}, [
          el('div.row.row--center', {}, [lives, livesNote]),
          bedGrid,
        ]),
      ]),
      el('div.screen-footer', {}, [
        el('button.btn.btn--ghost', {
          onclick: () => openInventory({
            context: 'walk',
            onClose: renderBeds,
            onUse: (id, result) => {
              if (result.effect === 'map') openTrailMapForRun();
            },
          }),
        }, [icon('shopTag', 1.1), 'Saddlebag']),
        el('button.btn.btn--primary', { onclick: () => finishEncounter() }, ['Back to the road']),
      ]),
    ]);

    root.append(screen);
    attachButtonSounds(screen);

    return () => {
      unsub();
      band.dispose();
    };
  },
};
