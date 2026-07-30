/**
 * SHOOT! — Save slot picker (Block 5b).
 *
 * Story Mode always goes through here: three slots, each showing where that
 * run stands. Continuing a run reloads it; an empty slot starts a fresh one.
 */

import { el, clearNode } from '../core/dom.js';
import { back } from '../core/router.js';
import { attachButtonSounds, play } from '../core/audio.js';
import { readAllSlots, deleteSlot, describeSlot, SLOT_COUNT } from './save.js';
import { getWorld } from './worlds.js';
import { startNewRun, loadRun } from './run.js';
import { livesRow, icon } from '../ui/widgets.js';
import { startMenuScene } from '../menu/menu-scene.js';
import { toast } from '../ui/toast.js';

function timeAgo(ts) {
  if (!ts) return 'never';
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${Math.floor(hours / 24)} d ago`;
}

export const SlotsScreen = {
  id: 'slots',

  mount(root) {
    startMenuScene();
    const grid = el('div.slot-grid');

    async function render() {
      clearNode(grid);
      const slots = await readAllSlots();
      for (const { slot, data } of slots) {
        const info = describeSlot(data);
        if (!info) {
          grid.append(
            el('div.panel.slot-card.is-empty', { onclick: () => start(slot) }, [
              el('span.slot-name', { text: `Slot ${slot}` }),
              el('p.muted', { text: 'Empty — start a new journey.' }),
              el('div.slot-actions', {}, [
                el('button.btn.btn--small.btn--gold', { onclick: () => start(slot) }, ['New Game']),
              ]),
            ]),
          );
          continue;
        }

        const world = getWorld(info.world);
        grid.append(
          el('div.panel.slot-card', {}, [
            el('div.row', { style: { justifyContent: 'space-between' } }, [
              el('span.slot-name', { text: `Slot ${slot}` }),
              info.completed ? el('span.chip.chip--legendary', { text: 'Finished' }) : null,
            ]),
            el('div.slot-line', {}, [el('span', { text: 'World' }), el('span', { text: world.name })]),
            el('div.slot-line', {}, [el('span', { text: 'Level' }), el('span', { text: String(info.level) })]),
            el('div.slot-line', {}, [
              el('span', { text: 'Gold' }),
              el('span.row', {}, [icon('coin', 0.9), String(info.gold)]),
            ]),
            livesRow(info.lives, info.maxLives),
            el('div.slot-line.muted', {}, [
              el('span', { text: 'Saved' }),
              el('span', { text: timeAgo(info.savedAt) }),
            ]),
            el('div.slot-actions', {}, [
              el('button.btn.btn--small.btn--gold', { onclick: () => resume(slot, data) }, [
                info.completed ? 'View ending' : 'Continue',
              ]),
              el('button.btn.btn--small.btn--danger', { onclick: () => erase(slot) }, ['Erase']),
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
      await deleteSlot(slot);
      toast(`Slot ${slot} erased`, 'bad');
      render();
    }

    const screen = el('div.screen', {}, [
      el('div.screen-header', {}, [
        el('button.btn.btn--small.btn--ghost', { onclick: () => back('title') }, ['◀ Back']),
        el('h1.screen-title', { text: 'Story Mode' }),
        el('span.chip', { text: `${SLOT_COUNT} slots` }),
      ]),
      grid,
      el('p.muted.center', {
        text: 'Progress saves automatically after every encounter.',
      }),
    ]);

    root.append(screen);
    attachButtonSounds(screen);
    render();
  },
};
