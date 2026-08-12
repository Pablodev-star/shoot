/**
 * SHOOT! — How to Play.
 *
 * The whole game is three buttons, but nothing on screen explains them unless
 * we do. This panel is reachable from the title screen, from settings and from
 * inside a duel, and it opens automatically the first time a player starts a
 * run.
 *
 * It is also where the duel rules now live in full. The duel screen used to
 * reprint them under its buttons on every turn of every fight; stating them
 * once, properly, in a place the player can return to is worth more than
 * stating them badly a thousand times.
 *
 * The outcome table is the centre of this panel: five prose rules about who
 * hits whom become one grid you can read in a single pass.
 */

import { el } from '../core/dom.js';
import { attachButtonSounds } from '../core/audio.js';
import { getSettings, updateSettings } from '../core/settings.js';
import { icon, uiIcon, closeButton } from './widgets.js';

const MOVES = [
  {
    key: 'reload',
    name: 'Reload',
    iconName: 'chamber',
    chip: '+1 round',
    body: 'Puts one round in the cylinder. You are open to a shot while you do it.',
  },
  {
    key: 'shield',
    name: 'Shield',
    iconName: 'shieldPlate',
    chip: 'costs nothing',
    body: 'Nothing gets through. You gain nothing either.',
  },
  {
    key: 'shoot',
    name: 'Shoot',
    iconName: 'revolver',
    chip: '−1 round',
    body: 'Needs a loaded round. Wasted on someone who shielded.',
  },
];

/** Every pairing, and what comes of it. Rows are you, columns are them. */
const OUTCOMES = [
  ['Reload', 'Reload', 'Nothing happens. You both gain a round.'],
  ['Reload', 'Shoot', 'You lose a life.'],
  ['Shield', 'Shoot', 'Blocked. Their round is wasted.'],
  ['Shoot', 'Reload', 'They lose a life.'],
  ['Shoot', 'Shield', 'Blocked. Your round is wasted.'],
  ['Shoot', 'Shoot', 'You both lose a life.'],
];

/**
 * The three things a player cannot work out by watching, plus the two the
 * interface is already telling them and they have not noticed yet.
 *
 * The cylinder line is the important one. Both fighters' chambers are drawn on
 * their cards and the opponent decides off its own — an empty gun reloads, a
 * full one fires — so it is the only genuine tell in the game and it is the
 * whole of the skill in a duel. Left unsaid, most players never look at it.
 */
const ROAD_RULES = [
  'You and your rival choose at the same time. Nobody sees the other move first.',
  'The first one out of lives loses the duel.',
  'Watch their cylinder. An empty gun cannot shoot you; a full one usually will.',
  'On the road, hunger drains as you walk. At zero it costs lives fast — faster the longer your life bar is.',
  'The map shows the next five stops. The road past them is decided as you walk it.',
];

/**
 * Open the panel.
 * @param {{onClose?: () => void}} opts
 */
export function openHowToPlay(opts = {}) {
  const backdrop = el('div.modal-backdrop', {
    onclick: (e) => {
      if (e.target === backdrop) close();
    },
  });

  function close() {
    backdrop.remove();
    document.removeEventListener('keydown', onKey);
    if (opts.onClose) opts.onClose();
  }

  const onKey = (e) => {
    if (e.key === 'Escape') close();
  };
  document.addEventListener('keydown', onKey);

  const moveClass = (name) => `mv--${name.toLowerCase()}`;

  const modal = el('div.panel.modal.modal--wide', { role: 'dialog', 'aria-label': 'How to play' }, [
    el('div.modal-header', {}, [
      el('h2.panel-title', { text: 'How to Play' }),
      closeButton(close),
    ]),

    el('div.modal-content', {}, [
      el('div.howto-moves', {},
        MOVES.map((m) =>
          el(`div.howto-move.is-${m.key}`, {}, [
            el('div.howto-move-head', {}, [
              uiIcon(m.iconName, 1.2),
              el('span', { text: m.name }),
              el('span.chip', { text: m.chip }),
            ]),
            el('p', { text: m.body }),
          ]),
        ),
      ),

      el('div.divider', { text: 'What beats what' }),
      el('table.howto-matrix', {}, [
        el('thead', {}, [
          el('tr', {}, [
            el('th', { text: 'You' }),
            el('th', { text: 'Them' }),
            el('th', { text: 'Result' }),
          ]),
        ]),
        el('tbody', {},
          OUTCOMES.map(([mine, theirs, result]) =>
            el('tr', {}, [
              el('td', { class: moveClass(mine), text: mine }),
              el('td', { class: moveClass(theirs), text: theirs }),
              el('td', { text: result }),
            ]),
          ),
        ),
      ]),

      el('div.divider', { text: 'The rest' }),
      el('div.howto-rules', {},
        ROAD_RULES.map((rule) => el('div.howto-rule', {}, [el('span.bullet'), el('span', { text: rule })])),
      ),

      el('div.divider', { text: 'Keys' }),
      el('div.row.row--center', {}, [
        el('span.chip', {}, [el('span.kbd', { text: '1' }), 'Reload']),
        el('span.chip', {}, [el('span.kbd', { text: '2' }), 'Shield']),
        el('span.chip', {}, [el('span.kbd', { text: '3' }), 'Shoot']),
        el('span.chip', {}, [el('span.kbd', { text: 'I' }), 'Saddlebag']),
        el('span.chip', {}, [el('span.kbd', { text: 'Esc' }), 'Close']),
      ]),

      el('div.row.row--center', { style: { marginTop: 'var(--sp-4)' } }, [
        icon('life', 1.2),
        el('span.muted', { text: 'Lives are red diamonds. Yours on the left, theirs on the right.' }),
      ]),
    ]),

    el('div.modal-footer', { style: { justifyContent: 'center' } }, [
      el('button.btn.btn--primary', { onclick: close }, ['Got it']),
    ]),
  ]);

  backdrop.append(modal);
  document.getElementById('app').append(backdrop);
  attachButtonSounds(backdrop);
  modal.querySelector('.btn--primary')?.focus();
  return { close };
}

/**
 * Show the panel once, the first time a player ever starts a run. After that it
 * is only ever opened deliberately.
 */
export function maybeShowFirstRunHelp() {
  const settings = getSettings();
  if (!settings.showHints || settings.seenHowTo) return false;
  updateSettings({ seenHowTo: true });
  openHowToPlay();
  return true;
}
