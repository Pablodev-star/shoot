/**
 * SHOOT! — Credits (Block 1).
 *
 * Doubles as the project's history: three years, four versions, two engines.
 */

import { el } from '../core/dom.js';
import { back } from '../core/router.js';
import { attachButtonSounds } from '../core/audio.js';
import { VERSION } from './title.js';

const ERAS = [
  {
    year: 'Version 1 — Roblox',
    text:
      'Born as a shower thought. A crude prototype with an unreadable fancy font, thick black outlines and a wooden backdrop — but working multiplayer. Duels were over too quickly, so three lives and a western coat of paint were added.',
  },
  {
    year: 'Version 2 — Single-file HTML/JS',
    text:
      'One enormous file, bots with no brains, and the first Story Mode: 3 worlds of 10 levels, experience, gold, random shops, inns that restored lives, scaling enemies, world bosses, common/rare/legendary items and three save slots.',
  },
  {
    year: 'Version 3 — Roblox, rebuilt',
    text:
      'The most played one. Real animated western UI, sound, a battle overview with per-round statistics, purchasable abilities, revolver loot boxes, leaderboards, chat tags, daily quests, a half-finished clan system — and monetisation nobody bought. Long sessions got repetitive, and it was eventually put down.',
  },
  {
    year: 'Version 4 — This one',
    text:
      'Rebuilt from nothing on the open web. No level select: you walk, and the desert decides what you meet. Hunger, a horse, weather, a day that turns to night, a real inventory, five worlds and whatever is waiting past the last one.',
  },
];

export const CreditsScreen = {
  id: 'credits',
  mount(root) {
    const screen = el('div.screen', {}, [
      el('div.screen-header', {}, [
        el('button.btn.btn--small.btn--ghost', { onclick: () => back('title') }, ['◀ Back']),
        el('h1.screen-title', { text: 'Credits' }),
        el('span.chip.chip--gold', { text: VERSION }),
      ]),

      el('div.panel.panel--paper.poster', { style: { width: 'min(760px, 97%)' } }, [
        el('div.credits-scroll', {}, [
          el('h3', { text: 'Shoot!' }),
          el('p', {
            text: 'A turn-based western duel. Reload, shield, shoot — the whole game has lived in those three buttons for three years.',
          }),

          el('h3', { text: 'The road here' }),
          ...ERAS.map((era) =>
            el('div.credits-era', {}, [
              el('div.year', { text: era.year }),
              el('p', { text: era.text }),
            ]),
          ),

          el('h3', { text: 'Made by' }),
          el('p', { text: 'Design, code, pixel art and everything else — Pablo.' }),

          el('h3', { text: 'Built with' }),
          el('p', {
            text: 'Plain HTML, CSS and JavaScript modules. No frameworks, no build step, no binary assets — every sprite in the game is drawn from character maps at load time. Hosted on GitHub Pages.',
          }),

          el('h3', { text: 'Thanks' }),
          el('p', {
            text: 'To the three or four friends who played the Roblox version every day when it was new. This one is the version that finally gets finished.',
          }),
        ]),
      ]),
    ]);

    root.append(screen);
    attachButtonSounds(screen);
  },
};
