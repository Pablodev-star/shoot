/**
 * SHOOT! — The travel band.
 *
 * Where am I, how many lives do I have, how hungry am I, how much gold. One
 * strip, in the same place, on every screen inside a run.
 *
 * It used to be two: a status bar and, on the road, a second full-width panel
 * underneath it holding the hunger meter and a row of weather chips. Together
 * they took a fifth of the screen before the game had drawn anything. The
 * hunger meter now lives here — it is a survival stat like lives and gold, and
 * it belongs with them — and the weather chips are gone, because the sky
 * already shows the weather.
 *
 * It subscribes to the event bus itself, so screens just mount it and forget.
 */

import { el } from '../core/dom.js';
import { EVENTS, on } from '../core/events.js';
import { getState, expProgress } from '../game/player.js';
import { getWorld, FINAL_WORLD } from '../game/worlds.js';
import { HUNGER_MAX, HUNGER_DRAIN_SANDSTORM_MUL } from '../game/progression.js';
import { getWeatherState } from '../explore/weather.js';
import { livesRow, updateLivesRow, meter, goldChip, uiIcon } from './widgets.js';

/**
 * @param {object} opts
 * @param {boolean} [opts.hunger] include the hunger meter (the road does; a
 *   shop counter does not — you cannot starve while browsing)
 * @param {HTMLElement[]} [opts.actions] trailing buttons
 * @returns {HTMLElement} with a `dispose()` method to drop its subscriptions
 */
export function trailBand(opts = {}) {
  const player = getState();
  const world = getWorld(player.world);

  const lives = livesRow(player.lives, player.maxLives);
  const gold = goldChip(player.gold);
  const levelChip = el('span.chip', {}, [el('span', { text: `Lv ${player.level}` })]);
  const worldLabel = el('span.world', { text: world.name });

  const hunger = opts.hunger
    ? meter({
        label: 'Hunger',
        iconName: 'hunger',
        ratio: player.hunger / HUNGER_MAX,
        value: `${Math.round(player.hunger)}%`,
      })
    : null;

  const node = el('div.trailband', {}, [
    el('div.trailband-place', {}, [uiIcon('signpost', 1), worldLabel]),
    el('span.rule'),
    lives,
    hunger ? el('span.rule') : null,
    hunger ? hunger.node : null,
    el('span.grow'),
    levelChip,
    gold,
    ...(opts.actions?.length ? [el('div.trailband-actions', {}, opts.actions)] : []),
  ]);

  const unsubs = [
    on(EVENTS.LIVES_CHANGED, ({ lives: l, maxLives }) => updateLivesRow(lives, l, maxLives)),
    on(EVENTS.GOLD_CHANGED, ({ gold: g }) => gold.setValue(g)),
    on(EVENTS.EXP_CHANGED, ({ level }) => {
      const p = expProgress();
      levelChip.firstChild.textContent = `Lv ${level}`;
      levelChip.dataset.tip = `${p.exp} / ${p.next} exp to level ${level + 1}`;
    }),
    on(EVENTS.WORLD_CHANGED, ({ world: id }) => {
      worldLabel.textContent = getWorld(id).name;
      worldLabel.dataset.tip = `World ${id} of ${FINAL_WORLD}`;
    }),
  ];

  if (hunger) {
    /**
     * A sandstorm eats your rations half again as fast. The meter says so
     * rather than leaving the player to notice that the bar is emptying while
     * the sky happens to be orange: a badge on the label, and a bar that looks
     * scoured — see `.bar.is-sandblasted`.
     */
    const syncWeatherFlag = () => {
      const sandstorm = getWeatherState().id === 'sandstorm';
      hunger.setFlag(
        sandstorm
          ? {
              text: `×${HUNGER_DRAIN_SANDSTORM_MUL}`,
              tip: 'The sandstorm is burning your rations faster',
              state: 'is-sandblasted',
            }
          : null,
      );
    };
    syncWeatherFlag();

    unsubs.push(
      on(EVENTS.HUNGER_CHANGED, ({ hunger: h }) =>
        hunger.set(h / HUNGER_MAX, `${Math.round(h)}%`),
      ),
      on(EVENTS.WEATHER_CHANGED, syncWeatherFlag),
    );
  }

  const p = expProgress();
  levelChip.dataset.tip = `${p.exp} / ${p.next} exp to level ${player.level + 1}`;
  worldLabel.dataset.tip = `World ${player.world} of ${FINAL_WORLD}`;

  node.dispose = () => unsubs.forEach((fn) => fn());
  return node;
}
