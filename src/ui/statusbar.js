/**
 * SHOOT! — In-run status bar.
 *
 * Where am I, how many lives do I have, how much gold, what level. The same
 * component in the same place on the road, in a shop, in an inn — so the player
 * builds one mental map of the UI instead of three.
 *
 * It subscribes to the event bus itself, so screens just mount it and forget.
 */

import { el } from '../core/dom.js';
import { EVENTS, on } from '../core/events.js';
import { getState, expProgress } from '../game/player.js';
import { getWorld, FINAL_WORLD } from '../game/worlds.js';
import { livesRow, updateLivesRow, icon } from './widgets.js';

/**
 * @param {{subtitle?: string, actions?: HTMLElement[]}} opts
 * @returns {HTMLElement} with a `dispose()` method to drop its subscriptions
 */
export function statusBar(opts = {}) {
  const player = getState();
  const world = getWorld(player.world);

  const lives = livesRow(player.lives, player.maxLives);
  const goldValue = el('span', { text: String(player.gold) });
  const goldChip = el('span.chip.chip--gold', { 'data-tip': 'Gold' }, [icon('coin', 1), goldValue]);
  const levelChip = el('span.chip', { 'data-tip': 'Level' }, [
    el('span', { text: `Lv ${player.level}` }),
  ]);
  const worldLabel = el('span.world', { text: world.name });
  const subLabel = el('span.sub', {
    text: opts.subtitle || `World ${player.world} of ${FINAL_WORLD}`,
  });

  const node = el('div.statusbar', {}, [
    el('div.statusbar-place', {}, [worldLabel, subLabel]),
    el('span.divider-v'),
    lives,
    el('span.grow'),
    levelChip,
    goldChip,
    ...(opts.actions || []),
  ]);

  const unsubs = [
    on(EVENTS.LIVES_CHANGED, ({ lives: l, maxLives }) => updateLivesRow(lives, l, maxLives)),
    on(EVENTS.GOLD_CHANGED, ({ gold }) => {
      goldValue.textContent = String(gold);
      goldChip.classList.remove('is-bumped');
      void goldChip.offsetWidth;
      goldChip.classList.add('is-bumped');
    }),
    on(EVENTS.EXP_CHANGED, ({ level }) => {
      const p = expProgress();
      levelChip.firstChild.textContent = `Lv ${level}`;
      levelChip.dataset.tip = `Level ${level} · ${p.exp}/${p.next} exp`;
    }),
    on(EVENTS.WORLD_CHANGED, ({ world: id }) => {
      worldLabel.textContent = getWorld(id).name;
      subLabel.textContent = `World ${id} of ${FINAL_WORLD}`;
    }),
  ];

  const p = expProgress();
  levelChip.dataset.tip = `Level ${player.level} · ${p.exp}/${p.next} exp`;

  node.dispose = () => unsubs.forEach((fn) => fn());
  return node;
}
