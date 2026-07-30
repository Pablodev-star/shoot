/**
 * SHOOT! — World intro, victory and game over screens (Block 5b).
 *
 * These are the seams of the game loop: they exist so entering a world, ending
 * a run and finishing the game all feel like moments rather than screen swaps.
 */

import { el, wait } from '../core/dom.js';
import { go } from '../core/router.js';
import { attachButtonSounds, play, playMusic } from '../core/audio.js';
import { setRenderer } from '../core/scene.js';
import { getState } from './player.js';
import { getWorld, FINAL_WORLD } from './worlds.js';
import { livesRow, icon } from '../ui/widgets.js';
import { startMenuScene } from '../menu/menu-scene.js';
import { createGalaxyScene } from './galaxy-scene.js';
import { getProfile } from '../core/settings.js';

/** Shown when a new world starts. Auto-advances, or skip with a click. */
export const WorldIntroScreen = {
  id: 'worldIntro',

  mount(root, params = {}) {
    const worldId = params.worldId || getState().world;
    const world = getWorld(worldId);
    const isFinal = worldId === FINAL_WORLD;

    if (isFinal) {
      setRenderer(createGalaxyScene());
      playMusic('themeGalaxy');
    } else {
      startMenuScene();
    }

    let done = false;
    const advance = async () => {
      if (done) return;
      done = true;
      await go('explore');
    };

    const screen = el('div.screen.intro-screen', { onclick: advance }, [
      el('div.panel.panel--paper.poster.intro-card', {}, [
        el('div.intro-eyebrow', { text: isFinal ? 'The last horizon' : `World ${worldId} of ${FINAL_WORLD}` }),
        el('h1.intro-title', { text: world.name }),
        el('p.intro-sub', { text: world.subtitle }),
        el('div.row', { style: { justifyContent: 'center', marginTop: '12px' } }, [
          livesRow(getState().lives, getState().maxLives, { big: true }),
        ]),
        el('p.muted.center', { style: { marginTop: '10px' }, text: 'Lives restored. Click to ride on.' }),
      ]),
    ]);

    root.append(screen);
    attachButtonSounds(screen);
    play('levelUp');

    // Auto-advance after a beat so the game never stalls.
    wait(3200).then(advance);

    return () => {
      done = true;
    };
  },
};

export const VictoryScreen = {
  id: 'victory',

  mount(root) {
    setRenderer(createGalaxyScene());
    playMusic('themeGalaxy');
    play('win');

    const player = getState();
    const profile = getProfile();

    const screen = el('div.screen', {}, [
      el('div.panel.poster', { style: { width: 'min(700px, 96%)' } }, [
        el('h1.panel-title', { style: { fontSize: '34px' }, text: 'The Stranger Falls' }),
        el('p.panel-sub', { text: `${profile.name} rode past the last horizon and came back` }),
        el('div.stat-grid', {}, [
          el('div.stat-tile', {}, [el('span.k', { text: 'Level' }), el('span.v', { text: String(player.level) })]),
          el('div.stat-tile', {}, [el('span.k', { text: 'Duels won' }), el('span.v', { text: String(player.stats.duelsWon) })]),
          el('div.stat-tile', {}, [el('span.k', { text: 'Gold earned' }), el('span.v', { text: String(player.stats.goldEarned) })]),
          el('div.stat-tile', {}, [
            el('span.k', { text: 'Distance' }),
            el('span.v', { text: `${Math.round(player.stats.distance / 100)}` }),
          ]),
        ]),
        el('p.center', {
          style: { marginTop: '16px' },
          text: 'Three years, four versions, one duel. Thanks for playing.',
        }),
        el('div.row', { style: { justifyContent: 'center', marginTop: '18px' } }, [
          el('button.btn.btn--primary', { onclick: () => go('title') }, ['Back to the menu']),
        ]),
      ]),
    ]);

    root.append(screen);
    attachButtonSounds(screen);
  },
};

export const GameOverScreen = {
  id: 'gameOver',

  mount(root, params = {}) {
    startMenuScene();
    play('lose');
    const world = getWorld(params.world || getState().world);
    const player = getState();

    const screen = el('div.screen', {}, [
      el('div.panel.poster', { style: { width: 'min(620px, 96%)' } }, [
        el('h1.panel-title', { style: { color: 'var(--red-light)' }, text: 'You went down' }),
        el('p.panel-sub', { text: `Somewhere in ${world.name}` }),
        el('div.stat-grid', {}, [
          el('div.stat-tile', {}, [el('span.k', { text: 'Level reached' }), el('span.v', { text: String(player.level) })]),
          el('div.stat-tile', {}, [el('span.k', { text: 'Duels won' }), el('span.v', { text: String(player.stats.duelsWon) })]),
          el('div.stat-tile', {}, [
            el('span.k', { text: 'Gold' }),
            el('span.v', {}, [icon('coin', 1), String(player.gold)]),
          ]),
        ]),
        el('p.muted.center', {
          style: { marginTop: '14px' },
          text: 'Your slot keeps the run as it stood at the last encounter.',
        }),
        el('div.row', { style: { justifyContent: 'center', marginTop: '18px' } }, [
          el('button.btn', { onclick: () => go('slots') }, ['Save slots']),
          el('button.btn.btn--primary', { onclick: () => go('title') }, ['Main menu']),
        ]),
      ]),
    ]);

    root.append(screen);
    attachButtonSounds(screen);
  },
};
