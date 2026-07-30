/**
 * SHOOT! — How to Play.
 *
 * The whole game is three buttons, but nothing on screen explains them unless
 * we do. This panel is reachable from the title screen and from inside a duel,
 * and it opens automatically the first time a player starts a run.
 */

import { el } from '../core/dom.js';
import { attachButtonSounds } from '../core/audio.js';
import { getSettings, updateSettings } from '../core/settings.js';
import { icon } from './widgets.js';

const MOVES = [
  {
    key: 'reload',
    name: 'Reload',
    hint: '+1 bullet',
    body: 'You load a round — but you are wide open this turn.',
  },
  {
    key: 'shield',
    name: 'Shield',
    hint: 'no bullets spent',
    body: 'Nothing gets through. You gain nothing either.',
  },
  {
    key: 'shoot',
    name: 'Shoot',
    hint: 'costs 1 bullet',
    body: 'Hits a rival who reloaded or shot. Wasted on a shield.',
  },
];

const RULES = [
  'Both of you choose at the same time. Nobody sees the other move first.',
  'Shoot someone who is reloading or shooting and they lose a life.',
  'If you both shoot, you both lose a life.',
  'First one out of lives loses the duel.',
  'Out on the road: hunger drains as you walk, and at zero it costs you lives. Keep food in your bag.',
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

  const modal = el('div.panel.modal.modal--wide', { role: 'dialog', 'aria-label': 'How to play' }, [
    el('div.modal-header', {}, [
      el('h2.panel-title', { text: 'How to Play' }),
      el('button.btn.btn--sm.btn--icon.btn--ghost', { onclick: close, 'aria-label': 'Close' }, ['✕']),
    ]),
    el('div.modal-content', {}, [
      el('p.panel-sub', { text: 'Every duel is these three buttons' }),
      el('div.howto-moves', {},
        MOVES.map((m) =>
          el(`div.howto-move.is-${m.key}`, {}, [
            el('h4', {}, [m.name, el('span.chip', { text: m.hint })]),
            el('p', { text: m.body }),
          ]),
        ),
      ),
      el('div.divider', { text: 'The rules' }),
      el('div.howto-rules', {},
        RULES.map((rule) => el('div.howto-rule', {}, [el('span.bullet'), el('span', { text: rule })])),
      ),
      el('div.divider', { text: 'Controls' }),
      el('div.row', { style: { justifyContent: 'center' } }, [
        el('span.chip', {}, [el('span.kbd', { text: '1' }), 'Reload']),
        el('span.chip', {}, [el('span.kbd', { text: '2' }), 'Shield']),
        el('span.chip', {}, [el('span.kbd', { text: '3' }), 'Shoot']),
        el('span.chip', {}, [el('span.kbd', { text: 'I' }), 'Saddlebag']),
        el('span.chip', {}, [el('span.kbd', { text: 'Esc' }), 'Close']),
      ]),
      el('div.row', { style: { justifyContent: 'center', marginTop: 'var(--sp-4)' } }, [
        icon('life', 1.4),
        el('span.muted', { text: 'Lives are red diamonds — yours on the left, theirs on the right.' }),
      ]),
    ]),
    el('div.modal-footer', {}, [
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
