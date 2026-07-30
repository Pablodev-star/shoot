/**
 * SHOOT! — Profile / account (Block 1).
 *
 * Local-only for now: the name is stored on the device through the storage
 * driver. When accounts arrive, this screen gains a "Sign in" panel and the
 * same driver starts pointing at the remote store — no other change needed.
 */

import { el, pixelImg } from '../core/dom.js';
import { back } from '../core/router.js';
import { attachButtonSounds } from '../core/audio.js';
import { getProfile, updateProfile } from '../core/settings.js';
import { getCharacterSprites } from '../art/sprites-character.js';
import { toast } from '../ui/toast.js';

export const ProfileScreen = {
  id: 'profile',
  mount(root) {
    const profile = getProfile();
    const sprites = getCharacterSprites();

    const nameInput = el('input.input', {
      type: 'text',
      value: profile.name,
      maxlength: '14',
      oninput: (e) => {
        e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9 _-]/g, '');
      },
    });

    const save = async () => {
      const name = nameInput.value.trim() || 'STRANGER';
      await updateProfile({ name });
      toast('Name saved', 'good', 'coin');
    };

    const s = profile.stats;
    const screen = el('div.screen', {}, [
      el('div.screen-header', {}, [
        el('button.btn.btn--small.btn--ghost', { onclick: () => back('title') }, ['◀ Back']),
        el('h1.screen-title', { text: 'Profile' }),
        el('span.chip', { text: 'Local' }),
      ]),

      el('div.panel.profile-card', {}, [
        el('div.avatar-plate', {}, [pixelImg(sprites.player.duel[2], 4)]),
        el('div.col', { style: { gap: '12px' } }, [
          el('div.field', {}, [el('label', { text: 'Gunslinger name' }), nameInput]),
          el('div.row', {}, [
            el('button.btn.btn--small.btn--gold', { onclick: save }, ['Save']),
            el('span.muted', { text: 'Shown on the title screen and, later, in online rooms.' }),
          ]),
        ]),
      ]),

      el('div.stat-grid', {}, [
        el('div.stat-tile', {}, [el('span.k', { text: 'Duels won' }), el('span.v', { text: String(s.duelsWon) })]),
        el('div.stat-tile', {}, [el('span.k', { text: 'Duels lost' }), el('span.v', { text: String(s.duelsLost) })]),
        el('div.stat-tile', {}, [el('span.k', { text: 'Worlds cleared' }), el('span.v', { text: String(s.worldsCleared) })]),
        el('div.stat-tile', {}, [el('span.k', { text: 'Gold earned' }), el('span.v', { text: String(s.goldEarned) })]),
        el('div.stat-tile', {}, [el('span.k', { text: 'Miles walked' }), el('span.v', { text: String(Math.floor(s.milesWalked)) })]),
      ]),

      el('div.panel', { style: { width: 'min(620px, 96%)' } }, [
        el('h2.panel-title', { text: 'Account' }),
        el('p.muted.center', {
          text: 'Cloud accounts arrive with online mode. Your progress is stored on this device for now.',
        }),
        el('div.row', { style: { justifyContent: 'center', marginTop: '12px' } }, [
          el('button.btn.btn--small.btn--soon', {
            onclick: () => toast('Accounts — coming soon', 'gold', 'error'),
          }, ['Sign In', el('span.tag-soon', { text: 'Soon' })]),
        ]),
      ]),
    ]);

    root.append(screen);
    attachButtonSounds(screen);
  },
};
