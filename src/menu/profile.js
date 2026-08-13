/**
 * SHOOT! — Profile.
 *
 * Local-only for now: the name is stored on the device through the storage
 * driver. When accounts arrive this screen gains a sign-in panel and the same
 * driver starts pointing at the remote store — nothing else changes.
 */

import { el, pixelImg } from '../core/dom.js';
import { back, go } from '../core/router.js';
import { attachButtonSounds, play } from '../core/audio.js';
import { getProfile, updateProfile } from '../core/settings.js';
import { getCharacterSprites } from '../art/sprites-character.js';
import { toast } from '../ui/toast.js';
import { unlock } from '../game/achievements.js';
import { backButton, statTile, uiIcon } from '../ui/widgets.js';
import { OUTFIT_SLOTS, SLOT_LABELS, findItem, getOutfit } from '../game/wardrobe.js';

export const ProfileScreen = {
  id: 'profile',

  mount(root) {
    const profile = getProfile();
    const sprites = getCharacterSprites();

    const nameInput = el('input.input', {
      type: 'text',
      value: profile.name,
      maxlength: '14',
      'aria-label': 'Gunslinger name',
      oninput: (e) => {
        e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9 _-]/g, '');
        saveBtn.disabled = e.target.value.trim().length === 0;
      },
      onkeydown: (e) => {
        if (e.key === 'Enter') save();
      },
    });

    const saveBtn = el('button.btn.btn--sm.btn--gold', { onclick: () => save() }, ['Save name']);

    async function save() {
      const name = nameInput.value.trim() || 'STRANGER';
      nameInput.value = name;
      await updateProfile({ name });
      // A name of your own, and not the one everybody starts with.
      if (name !== 'STRANGER') unlock('named');
      // Everywhere the name is printed is built on mount, so the two on this
      // screen are the only ones that have to be told.
      avatarName.textContent = name;
      play('coin');
      toast('Name saved', 'good');
    }

    /**
     * The avatar is the door to the wardrobe.
     *
     * It is a button rather than a picture with a link under it because the
     * picture IS the thing being edited — and it carries a pencil in its top
     * right corner so that reads as an invitation rather than as decoration.
     * (The pencil is a UI sprite like everything else in the chrome: `pencil`
     * in src/art/sprites-ui.js.)
     */
    const avatarName = el('span.avatar-caption-name', { text: profile.name });
    const avatar = el('button.avatar-plate.avatar-button', {
      onclick: () => go('wardrobe'),
      'aria-label': 'Change your outfit',
      'data-tip': 'Change your outfit',
    }, [
      pixelImg(sprites.player.portrait, 4),
      el('span.avatar-edit', { 'aria-hidden': 'true' }, [uiIcon('pencil', 1.1)]),
    ]);

    /** What is on, in four lines, straight off the wardrobe. */
    const outfit = getOutfit();
    const wearing = el('div.profile-wearing', {}, OUTFIT_SLOTS.map((slot) => {
      const item = findItem(slot, outfit[slot]);
      return el('span.chip', {
        text: item ? item.name : SLOT_LABELS[slot].name,
        'data-tip': SLOT_LABELS[slot].name,
      });
    }));

    const s = profile.stats;
    const duels = s.duelsWon + s.duelsLost;
    const winRate = duels ? Math.round((s.duelsWon / duels) * 100) : 0;

    const screen = el('div.screen.profile-screen', {}, [
      el('div.screen-header', {}, [
        backButton(() => back('title')),
        el('h1.screen-title', { text: 'Profile' }),
        el('span.chip', { text: 'This device' }),
      ]),

      el('div.screen-body', {}, [
        el('div.panel.panel--braced.profile-card', {}, [
          el('div.avatar-column', {}, [
            avatar,
            el('span.avatar-caption', {}, [avatarName]),
          ]),
          el('div.col', { style: { gap: 'var(--sp-3)' } }, [
            el('div.field', {}, [
              el('label', { text: 'Gunslinger name' }),
              nameInput,
            ]),
            el('div.row', {}, [saveBtn]),
            el('div.field', {}, [
              el('label', { text: 'Wearing' }),
              wearing,
              el('button.btn.btn--sm.btn--ghost', { onclick: () => go('wardrobe') }, [
                uiIcon('pencil', 1),
                el('span', { text: 'Change outfit' }),
              ]),
            ]),
          ]),
        ]),

        // One line where a whole "Account" panel with an inert Sign In button
        // used to sit. It said the same thing the Online screen already says.
        el('p.field-hint.center', {
          text: 'Saved on this device. Accounts arrive with online play.',
        }),

        el('div.divider', { text: 'Lifetime record' }),
        el('div.stat-grid', {}, [
          statTile('Duels won', s.duelsWon),
          statTile('Duels lost', s.duelsLost),
          statTile('Win rate', `${winRate}%`),
          statTile('Worlds cleared', s.worldsCleared),
          statTile('Gold earned', s.goldEarned, 'coin'),
          statTile('Distance', Math.floor(s.milesWalked || 0)),
        ]),
      ]),
    ]);

    root.append(screen);
    attachButtonSounds(screen);
  },
};
