/**
 * SHOOT! — Title screen.
 *
 * One obvious primary action (Story Mode), one secondary (Online), and the
 * housekeeping screens tucked into a compact row so the eye lands on the game
 * first. The wordmark itself lives in `src/art/logo.js` — it is real pixel art,
 * baked to a canvas, not smoothed vector type.
 */

import { el, pixelImg } from '../core/dom.js';
import { go } from '../core/router.js';
import { attachButtonSounds, playMusic } from '../core/audio.js';
import { buildLogo } from '../art/logo.js';
import { startMenuScene } from './menu-scene.js';
import { getProfile } from '../core/settings.js';
import { openHowToPlay } from '../ui/help.js';

export const VERSION = 'v1.0 · Definitive Edition';

export const TitleScreen = {
  id: 'title',

  mount(root) {
    startMenuScene();
    playMusic('themeMenu');

    const profile = getProfile();

    // Secondary destinations are label-only: at this size an icon is noise, and
    // three words are read faster than three tiny pictures.
    const secondary = (label, screen) =>
      el('button.btn.btn--ghost', { onclick: () => go(screen) }, [el('span', { text: label })]);

    const screen = el('div.screen.title-screen', {}, [
      // The title is a picture, so it needs a name of its own — the screen has
      // no heading anywhere else for a screen reader to land on.
      el('div.logo-wrap', { role: 'img', 'aria-label': 'Shoot! — Western Duels' }, [
        pixelImg(buildLogo(), 1),
      ]),

      el('div.tagline', {}, [
        el('span', { text: 'Reload' }),
        el('span.sep'),
        el('span', { text: 'Shield' }),
        el('span.sep'),
        el('span', { text: 'Shoot' }),
      ]),

      el('nav.menu-nav.stagger', { 'aria-label': 'Main menu' }, [
        el('button.btn.btn--primary', { onclick: () => go('slots') }, ['Story Mode']),
        el('button.btn', { onclick: () => go('online') }, [
          'Online',
          el('span.stamp', { text: 'Soon' }),
        ]),
        el('div.menu-nav-row', {}, [
          secondary('Profile', 'profile'),
          secondary('Settings', 'settings'),
          secondary('Credits', 'credits'),
        ]),
        el('button.btn.btn--quiet', { onclick: () => openHowToPlay() }, ['How to play']),
      ]),

      el('div.title-footer', {}, [
        el('span', { text: profile.name }),
        el('span', { text: VERSION }),
      ]),
    ]);

    root.append(screen);
    attachButtonSounds(screen);
    screen.querySelector('.btn--primary')?.focus({ preventScroll: true });
  },
};
