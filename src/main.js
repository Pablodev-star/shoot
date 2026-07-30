/**
 * SHOOT! — Entry point.
 *
 * Boots the shared canvas, the router and the toast layer, registers every
 * screen, then opens the title screen.
 *
 * BOOT ORDER MATTERS
 *   1. settings (audio volume must be applied before any cue plays)
 *   2. scene canvas (screens may install a renderer as they mount)
 *   3. router + screens
 */

import { initScene } from './core/scene.js';
import { initRouter, register, go } from './core/router.js';
import { initToasts } from './ui/toast.js';
import { loadSettings } from './core/settings.js';

import { TitleScreen } from './menu/title.js';
import { OnlineScreen } from './menu/online.js';
import { ProfileScreen } from './menu/profile.js';
import { SettingsScreen } from './menu/settings.js';
import { CreditsScreen } from './menu/credits.js';
import { SlotsScreen } from './game/slots.js';
import { ExploreScreen } from './explore/explore-screen.js';
import { ShopScreen } from './shops/shop-screen.js';
import { InnScreen } from './shops/inn-screen.js';
import { DuelScreen } from './duel/duel-screen.js';
import { WorldIntroScreen, VictoryScreen, GameOverScreen } from './game/interstitials.js';

const SCREENS = [
  TitleScreen,
  OnlineScreen,
  ProfileScreen,
  SettingsScreen,
  CreditsScreen,
  SlotsScreen,
  ExploreScreen,
  ShopScreen,
  InnScreen,
  DuelScreen,
  WorldIntroScreen,
  VictoryScreen,
  GameOverScreen,
];

async function boot() {
  await loadSettings();

  initScene(document.getElementById('scene-canvas'));
  initToasts(document.getElementById('toasts'));
  initRouter(document.getElementById('screen-root'), document.getElementById('transition'));

  SCREENS.forEach(register);

  exposeDevHook();

  await go('title', {}, { silent: true });
}

/**
 * Development hook. Lets you jump between screens and poke at the run state
 * from the browser console (`SHOOT.go('shop', { encounter: { index: 0 } })`,
 * `SHOOT.player.addGold(1000)`, `SHOOT.run.beginWorld(6)`). It reads and
 * writes the same modules the game uses — there is no separate debug path.
 */
async function exposeDevHook() {
  const [player, run, worlds, items] = await Promise.all([
    import('./game/player.js'),
    import('./game/run.js'),
    import('./game/worlds.js'),
    import('./game/items.js'),
  ]);
  window.SHOOT = { go, player, run, worlds, items };
}

boot().catch((err) => {
  console.error('[boot] failed', err);
  document.getElementById('screen-root').innerHTML =
    '<div class="screen"><div class="panel"><h1 class="panel-title">Trouble at the saloon</h1>' +
    '<p class="muted center">The game failed to start. Check the console for details.</p></div></div>';
});
