/**
 * SHOOT! — Settings.
 *
 * Each row states what the setting does, not just what it is called, so nothing
 * needs guessing. Changes apply instantly and save themselves.
 */

import { el } from '../core/dom.js';
import { back } from '../core/router.js';
import { attachButtonSounds, play } from '../core/audio.js';
import { getSettings, updateSettings, LANGUAGES } from '../core/settings.js';
import { toast } from '../ui/toast.js';
import { backButton, toggle } from '../ui/widgets.js';
import { openHowToPlay } from '../ui/help.js';

/** One settings row: label + description on the left, control on the right. */
function row(name, desc, control) {
  return el('div.setting-row', {}, [
    el('div.setting-label', {}, [
      el('span.name', { text: name }),
      el('span.desc', { text: desc }),
    ]),
    el('div.setting-control', {}, Array.isArray(control) ? control : [control]),
  ]);
}

export const SettingsScreen = {
  id: 'settings',

  mount(root) {
    const settings = getSettings();

    const volumeValue = el('span.value', { text: `${Math.round(settings.volume * 100)}%` });
    const volume = el('input.grow', {
      type: 'range',
      min: '0',
      max: '100',
      step: '5',
      value: String(Math.round(settings.volume * 100)),
      'aria-label': 'Volume',
      oninput: (e) => {
        volumeValue.textContent = `${e.target.value}%`;
        updateSettings({ volume: Number(e.target.value) / 100 });
      },
      onchange: () => play('click'),
    });

    const language = el('div.select-wrap.grow', {}, [
      el(
        'select.input',
        {
          'aria-label': 'Language',
          onchange: (e) => {
            const chosen = LANGUAGES.find((l) => l.id === e.target.value);
            if (!chosen || !chosen.available) {
              e.target.value = 'en';
              play('error');
              toast('Only English is available right now', 'gold');
              return;
            }
            updateSettings({ language: chosen.id });
          },
        },
        LANGUAGES.map((l) =>
          el('option', {
            value: l.id,
            selected: l.id === settings.language,
            text: l.available ? l.label : `${l.label} — soon`,
          }),
        ),
      ),
    ]);

    const screen = el('div.screen', {}, [
      el('div.screen-header', {}, [
        backButton(() => back('title')),
        el('h1.screen-title', { text: 'Settings' }),
        el('span'),
      ]),

      el('div.screen-body', { style: { maxWidth: 'var(--content)' } }, [
        el('div.panel.col', { style: { gap: 'var(--sp-4)' } }, [
          el('div.divider', { text: 'Audio' }),
          el('div.settings-list', {}, [
            row('Volume', 'How loud everything is.', [volume, volumeValue]),
            row(
              'Mute',
              'Silence the game entirely.',
              toggle({
                label: settings.muted ? 'Muted' : 'Sound on',
                checked: settings.muted,
                onChange: (checked) => updateSettings({ muted: checked }),
              }),
            ),
          ]),

          el('div.divider', { text: 'Game' }),
          el('div.settings-list', {}, [
            row('Language', 'More languages arrive with online mode.', language),
            row(
              'Screen shake',
              'Kick the camera when a shot lands.',
              toggle({
                label: 'Shake on gunfire',
                checked: settings.screenShake,
                onChange: (checked) => updateSettings({ screenShake: checked }),
              }),
            ),
            row(
              'Hints',
              'Show tips and the first-run guide.',
              toggle({
                label: 'Show hints',
                checked: settings.showHints,
                onChange: (checked) => updateSettings({ showHints: checked }),
              }),
            ),
            row(
              'How to play',
              'The duel rules, any time you want them.',
              el('button.btn.btn--sm.btn--ghost', { onclick: () => openHowToPlay() }, ['Open guide']),
            ),
          ]),

          el('p.field-hint.center', {
            text: 'Audio currently uses synthesised placeholder cues — see src/core/audio.js.',
          }),
        ]),
      ]),
    ]);

    root.append(screen);
    attachButtonSounds(screen);
  },
};
