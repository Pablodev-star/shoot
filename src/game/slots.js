/**
 * SHOOT! — Save slot picker.
 *
 * Story Mode always comes through here. Each card answers the only three
 * questions that matter at a glance: where am I, how am I doing, and what
 * happens if I press this.
 *
 * The card leads with the world's name rather than the slot number, because
 * "Dust Flats" is what a player remembers about a run and "Slot 2" is what the
 * save system calls it.
 *
 * AND IT IS WHERE THE ROAD IS CHOSEN
 * ---------------------------------------------------------------------------
 * A slot is created with a difficulty and keeps it for as long as it exists
 * (see the note at the bottom of src/game/difficulty.js), so the empty card is
 * the one and only place that choice is ever offered. It is offered INSIDE the
 * card rather than as a dialog on top of it: an empty slot has nothing else in
 * it, and a picker that opens a modal to ask one question is a picker that
 * makes the answer feel like a settings change instead of the first decision of
 * the run.
 *
 * The choice only appears once the hard road is unlocked. Before that the card
 * is exactly what it always was — one button that says "New run" — because a
 * dropdown with one option in it is a dropdown that exists to advertise the
 * option that is missing, and the game already has a place for telling you what
 * you have not done yet.
 */

import { el, clearNode } from '../core/dom.js';
import { back } from '../core/router.js';
import { attachButtonSounds, play } from '../core/audio.js';
import { readAllSlots, deleteSlot, describeSlot, SLOT_COUNT } from './save.js';
import { getWorld, FINAL_WORLD } from './worlds.js';
import { startNewRun, loadRun } from './run.js';
import { livesRow, icon, uiIcon, backButton, iconButton } from '../ui/widgets.js';
import { startMenuScene } from '../menu/menu-scene.js';
import { toast } from '../ui/toast.js';
import { confirmDialog } from '../ui/confirm.js';
import {
  DEFAULT_DIFFICULTY,
  DIFFICULTIES,
  difficultyInfo,
  isHardUnlocked,
} from './difficulty.js';

function timeAgo(ts) {
  if (!ts) return 'never';
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'yesterday' : `${days} days ago`;
}

export const SlotsScreen = {
  id: 'slots',

  mount(root) {
    startMenuScene();
    const grid = el('div.slot-grid.stagger');
    const hardOpen = isHardUnlocked();

    /**
     * What each empty card is currently set to.
     *
     * Per slot rather than one setting for the screen, because the three cards
     * are three independent decisions — a player who wants a hard run in slot 2
     * and keeps a normal one in slot 3 should not have to remember to put the
     * dial back. Keyed by slot number and reset whenever the grid is rebuilt
     * from storage, which is the only time a card can change what it is.
     */
    const chosen = new Map();

    async function render() {
      clearNode(grid);
      const slots = await readAllSlots();

      for (const { slot, data } of slots) {
        const info = describeSlot(data);

        if (!info) {
          grid.append(emptyCard(slot));
          continue;
        }

        const world = getWorld(info.world);
        grid.append(
          el('div.panel.slot-card', {
            class: info.difficulty === 'hard' ? 'is-hard' : '',
          }, [
            el('div.slot-head', {}, [
              el('span.slot-name', { text: `Slot ${slot}` }),
              /**
               * A hard run says so on the card and everywhere else it can. It
               * is the one thing about a slot that cannot be changed and cannot
               * be worked out by looking at the numbers — a Hard run three
               * worlds in looks exactly like a Normal run three worlds in, and
               * the difference is every price and every rider on the road
               * ahead.
               */
              info.difficulty === 'hard'
                ? el('span.chip.chip--hard', { text: 'Hard' })
                : null,
              info.completed
                ? el('span.chip.chip--legendary', { text: 'Finished' })
                : el('span.chip', { text: `${info.world} / ${FINAL_WORLD}` }),
            ]),

            el('div.col', { style: { gap: 'var(--sp-2)' } }, [
              el('div.slot-world', { text: world.name }),
              livesRow(info.lives, info.maxLives, { bonus: info.bonusLives }),
            ]),

            el('div.slot-lines', {}, [
              el('div.slot-line', {}, [
                el('span.k', { text: 'Level' }),
                el('span.v', { text: String(info.level) }),
              ]),
              el('div.slot-line', {}, [
                el('span.k', { text: 'Gold' }),
                el('span.v', {}, [icon('coin', 0.9), String(info.gold)]),
              ]),
              el('div.slot-line', {}, [
                el('span.k', { text: 'Saved' }),
                el('span.v', { text: timeAgo(info.savedAt) }),
              ]),
            ]),

            el('div.slot-actions', {}, [
              el('button.btn.btn--sm.btn--gold', { onclick: () => resume(slot, data) }, [
                info.completed ? 'View ending' : 'Continue',
              ]),
              iconButton('close', {
                onClick: () => erase(slot),
                label: `Erase slot ${slot}`,
                tip: 'Erase this run',
                variant: 'btn--danger',
              }),
            ]),
          ]),
        );
      }
      attachButtonSounds(grid);
    }

    /**
     * An empty slot: the invitation, and — once the hard road is open — the
     * choice of which one this run walks.
     *
     * It stopped being a single `<button>` the day there were two roads. The
     * whole card used to be the button, which is the right shape for "press
     * this to start" and the wrong one the moment there is a control inside it:
     * a select nested in a button is invalid markup, and every click on the
     * dropdown would start a run.
     */
    function emptyCard(slot) {
      const pick = chosen.get(slot) || DEFAULT_DIFFICULTY;
      const info = difficultyInfo(pick);

      /**
       * "Ride out", not "New run". The card already says New Run in the place
       * every other card says which world it is in, and a button repeating the
       * heading directly above it is the one thing this interface's own rules
       * forbid — nothing on screen restates what the player can already see.
       */
      const startButton = el('button.btn.btn--gold.slot-start', {
        onclick: () => start(slot),
        'aria-label': `Start a new ${info.name} run in slot ${slot}`,
      }, [uiIcon('plus', 1.1), el('span', { text: 'Ride out' })]);

      if (!hardOpen) {
        return el('div.panel.slot-card.is-empty', {}, [
          uiIcon('plus', 2),
          el('span.slot-world', { text: 'New run' }),
          el('span.slot-name', { text: `Slot ${slot}` }),
          startButton,
        ]);
      }

      const select = el('select.slot-difficulty', {
        'aria-label': `Difficulty for slot ${slot}`,
        onchange: (e) => {
          chosen.set(slot, e.currentTarget.value);
          play('click');
          render();
        },
      }, DIFFICULTIES.map((d) => el('option', {
        value: d.id,
        selected: d.id === pick ? 'selected' : null,
      }, [d.name])));

      return el('div.panel.slot-card.is-empty', {
        class: pick === 'hard' ? 'is-hard' : '',
      }, [
        el('span.slot-world', { text: 'New run' }),
        el('span.slot-name', { text: `Slot ${slot}` }),
        el('label.slot-mode', {}, [
          el('span.slot-mode-label', { text: 'Mode' }),
          select,
        ]),
        // The honest list, straight off the mode — see `changes` in
        // src/game/difficulty.js. It is written down there and nowhere else,
        // so the picker, the cut-scene and this card cannot disagree about
        // what the hard road actually does.
        el('p.slot-mode-blurb', { text: info.blurb }),
        info.changes.length
          ? el('ul.slot-mode-terms', {}, info.changes.map((line) => el('li', { text: line })))
          : null,
        startButton,
      ]);
    }

    async function start(slot) {
      play('click');
      await startNewRun(slot, { difficulty: chosen.get(slot) || DEFAULT_DIFFICULTY });
    }

    async function resume(slot, data) {
      play('click');
      await loadRun(slot, data);
    }

    async function erase(slot) {
      const confirmed = await confirmDialog({
        title: 'Erase this run?',
        body: `Everything in slot ${slot} is lost for good. There is no way back.`,
        confirmLabel: 'Erase it',
        danger: true,
      });
      if (!confirmed) return;
      await deleteSlot(slot);
      toast(`Slot ${slot} erased`, 'bad');
      render();
    }

    const screen = el('div.screen.slots-screen', {}, [
      el('div.screen-header', {}, [
        backButton(() => back('title')),
        el('h1.screen-title', { text: 'Story Mode' }),
        el('span.chip', { text: `${SLOT_COUNT} slots` }),
      ]),
      el('div.screen-body', {}, [
        grid,
        el('p.muted.center', {
          text: 'Progress saves itself after every encounter, and again whenever you leave from the road. Die out there and the slot is erased.',
        }),
      ]),
    ]);

    root.append(screen);
    attachButtonSounds(screen);
    render();
  },
};
