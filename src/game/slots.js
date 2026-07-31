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

    async function render() {
      clearNode(grid);
      const slots = await readAllSlots();

      for (const { slot, data } of slots) {
        const info = describeSlot(data);

        if (!info) {
          grid.append(
            el('button.panel.slot-card.is-empty', {
              onclick: () => start(slot),
              'aria-label': `Slot ${slot}, empty. Start a new game.`,
            }, [
              uiIcon('plus', 2),
              el('span.slot-world', { text: 'New run' }),
              el('span.slot-name', { text: `Slot ${slot}` }),
            ]),
          );
          continue;
        }

        const world = getWorld(info.world);
        grid.append(
          el('div.panel.slot-card', {}, [
            el('div.slot-head', {}, [
              el('span.slot-name', { text: `Slot ${slot}` }),
              info.completed
                ? el('span.chip.chip--legendary', { text: 'Finished' })
                : el('span.chip', { text: `${info.world} / ${FINAL_WORLD}` }),
            ]),

            el('div.col', { style: { gap: 'var(--sp-2)' } }, [
              el('div.slot-world', { text: world.name }),
              livesRow(info.lives, info.maxLives),
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

    async function start(slot) {
      play('click');
      await startNewRun(slot);
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
        el('p.muted.center', { text: 'Progress saves itself after every encounter.' }),
      ]),
    ]);

    root.append(screen);
    attachButtonSounds(screen);
    render();
  },
};
