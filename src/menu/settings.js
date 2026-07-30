/**
 * SHOOT! — Settings (Block 1).
 */

import { el } from '../core/dom.js';
import { back } from '../core/router.js';
import { attachButtonSounds, play } from '../core/audio.js';
import { getSettings, updateSettings, LANGUAGES } from '../core/settings.js';
import { toast } from '../ui/toast.js';

export const SettingsScreen = {
  id: 'settings',
  mount(root) {
    const settings = getSettings();

    const volumeValue = el('span.value', { text: `${Math.round(settings.volume * 100)}%` });
    const volume = el('input', {
      type: 'range',
      min: '0',
      max: '100',
      value: String(Math.round(settings.volume * 100)),
      oninput: (e) => {
        const v = Number(e.target.value) / 100;
        volumeValue.textContent = `${e.target.value}%`;
        updateSettings({ volume: v });
      },
      onchange: () => play('click'),
    });

    const language = el(
      'select.input',
      {
        onchange: (e) => {
          const chosen = LANGUAGES.find((l) => l.id === e.target.value);
          if (!chosen || !chosen.available) {
            e.target.value = 'en';
            toast('Only English is available right now', 'gold', 'error');
            return;
          }
          updateSettings({ language: chosen.id });
        },
      },
      LANGUAGES.map((l) =>
        el('option', {
          value: l.id,
          selected: l.id === settings.language,
          text: l.available ? l.label : `${l.label} (soon)`,
        }),
      ),
    );

    const check = (key, label, initial) =>
      el('label.toggle', {}, [
        el('input', {
          type: 'checkbox',
          checked: initial,
          onchange: (e) => updateSettings({ [key]: e.target.checked }),
        }),
        label,
      ]);

    const screen = el('div.screen', {}, [
      el('div.screen-header', {}, [
        el('button.btn.btn--small.btn--ghost', { onclick: () => back('title') }, ['◀ Back']),
        el('h1.screen-title', { text: 'Settings' }),
        el('span', {}),
      ]),

      el('div.panel', { style: { width: 'min(620px, 96%)' } }, [
        el('div.settings-form', {}, [
          el('div.setting-row', {}, [el('label', { text: 'Volume' }), volume, volumeValue]),
          el('div.setting-row', {}, [
            el('label', { text: 'Mute' }),
            check('muted', 'Silence all audio', settings.muted),
            el('span'),
          ]),
          el('div.setting-row', {}, [el('label', { text: 'Language' }), language, el('span')]),
          el('div.setting-row', {}, [
            el('label', { text: 'Screen shake' }),
            check('screenShake', 'Shake the camera on gunfire', settings.screenShake),
            el('span'),
          ]),
          el('div.setting-row', {}, [
            el('label', { text: 'Hints' }),
            check('showHints', 'Show tips during duels', settings.showHints),
            el('span'),
          ]),
        ]),
        el('p.muted.center', {
          style: { marginTop: '16px', fontSize: '12px' },
          text: 'Audio currently uses synthesised placeholder cues — see src/core/audio.js.',
        }),
      ]),
    ]);

    root.append(screen);
    attachButtonSounds(screen);
  },
};
