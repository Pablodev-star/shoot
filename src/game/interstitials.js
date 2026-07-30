/**
 * SHOOT! — World intro, victory and game over screens.
 *
 * The seams of the game loop: entering a world, ending a run and finishing the
 * game should each feel like a moment rather than a screen swap.
 */

import { el, wait } from '../core/dom.js';
import { go } from '../core/router.js';
import { attachButtonSounds, play, playMusic } from '../core/audio.js';
import { setRenderer } from '../core/scene.js';
import { getState } from './player.js';
import { getWorld, FINAL_WORLD } from './worlds.js';
import { livesRow, statTile } from '../ui/widgets.js';
import { startMenuScene } from '../menu/menu-scene.js';
import { createGalaxyScene } from './galaxy-scene.js';
import { getProfile } from '../core/settings.js';
import { maybeShowFirstRunHelp } from '../ui/help.js';

/** Shown when a new world starts. Auto-advances, or skip with a click/key. */
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
      cleanup();
      await go('explore');
    };

    const onKey = (e) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') advance();
    };
    window.addEventListener('keydown', onKey);
    const cleanup = () => window.removeEventListener('keydown', onKey);

    const screen = el('div.screen.intro-screen', {
      onclick: advance,
      role: 'button',
      'aria-label': `${world.name}. Continue.`,
    }, [
      el('div.panel.panel--paper.poster.intro-card', {}, [
        el('div.intro-eyebrow', {
          text: isFinal ? 'The last horizon' : `World ${worldId} of ${FINAL_WORLD}`,
        }),
        el('h1.intro-title', { text: world.name }),
        el('p.intro-sub', { text: world.subtitle }),
        el('div.row', { style: { justifyContent: 'center', marginTop: 'var(--sp-4)' } }, [
          livesRow(getState().lives, getState().maxLives, { large: true }),
        ]),
        el('p.muted.center', { style: { marginTop: 'var(--sp-2)' }, text: 'Lives restored' }),
        el('div.intro-continue', {}, ['Click anywhere to ride on ▸']),
      ]),
    ]);

    root.append(screen);
    attachButtonSounds(screen);
    play('levelUp');

    // First-time players get the rules once, before their first duel.
    if (worldId === 1) maybeShowFirstRunHelp();

    // Auto-advance after a beat so the game never stalls.
    wait(3600).then(advance);

    return () => {
      done = true;
      cleanup();
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

    const screen = el('div.screen.screen--centered', {}, [
      el('div.panel.poster', { style: { width: 'min(700px, 100%)' } }, [
        el('div.result-banner.is-win', {}, [
          el('div.headline', { text: 'The Stranger Falls' }),
          el('div.muted', { text: `${profile.name} rode past the last horizon and came back` }),
        ]),
        el('div.stat-grid', {}, [
          statTile('Level', player.level),
          statTile('Duels won', player.stats.duelsWon),
          statTile('Gold earned', player.stats.goldEarned, 'coin'),
          statTile('Distance', Math.round(player.stats.distance / 100)),
        ]),
        el('p.center', {
          style: { marginTop: 'var(--sp-4)' },
          text: 'Three years, four versions, one duel. Thanks for playing.',
        }),
        el('div.row', { style: { justifyContent: 'center', marginTop: 'var(--sp-5)' } }, [
          el('button.btn.btn--primary', { onclick: () => go('title') }, ['Back to the menu']),
        ]),
      ]),
    ]);

    root.append(screen);
    attachButtonSounds(screen);
    screen.querySelector('.btn--primary')?.focus();
  },
};

export const GameOverScreen = {
  id: 'gameOver',

  mount(root, params = {}) {
    startMenuScene();
    play('lose');
    const world = getWorld(params.world || getState().world);
    const player = getState();

    const screen = el('div.screen.screen--centered', {}, [
      el('div.panel.poster', { style: { width: 'min(620px, 100%)' } }, [
        el('div.result-banner.is-loss', {}, [
          el('div.headline', { style: { color: 'var(--red-light)' }, text: 'You went down' }),
          el('div.muted', { text: `Somewhere in ${world.name}` }),
        ]),
        el('div.stat-grid', {}, [
          statTile('Level reached', player.level),
          statTile('Duels won', player.stats.duelsWon),
          statTile('Gold', player.gold, 'coin'),
        ]),
        el('p.muted.center', {
          style: { marginTop: 'var(--sp-4)' },
          text: 'Your slot still holds the run as it stood at the last encounter — pick it up and try that fight again.',
        }),
        el('div.row', { style: { justifyContent: 'center', marginTop: 'var(--sp-5)' } }, [
          el('button.btn.btn--primary', { onclick: () => go('slots') }, ['Try again']),
          el('button.btn.btn--ghost', { onclick: () => go('title') }, ['Main menu']),
        ]),
      ]),
    ]);

    root.append(screen);
    attachButtonSounds(screen);
    screen.querySelector('.btn--primary')?.focus();
  },
};
