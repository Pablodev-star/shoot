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
import { initAchievementNotices } from './ui/achievement-notice.js';
import { loadSettings } from './core/settings.js';
import { loadAchievements, initAchievements, isUnlocked } from './game/achievements.js';
import { applyOutfit } from './game/wardrobe.js';
import { unlockHardMode } from './game/difficulty.js';

import { TitleScreen } from './menu/title.js';
import { OnlineScreen } from './menu/online.js';
import { ProfileScreen } from './menu/profile.js';
import { WardrobeScreen } from './menu/wardrobe.js';
import { SettingsScreen } from './menu/settings.js';
import { CreditsScreen } from './menu/credits.js';
import { AchievementsScreen } from './menu/achievements.js';
import { SlotsScreen } from './game/slots.js';
import { ExploreScreen } from './explore/explore-screen.js';
import { ShopScreen } from './shops/shop-screen.js';
import { InnScreen } from './shops/inn-screen.js';
import { ForgeScreen } from './shops/forge-screen.js';
import { TailorScreen } from './shops/tailor-screen.js';
import { DuelScreen } from './duel/duel-screen.js';
import { WorldIntroScreen, VictoryScreen, GameOverScreen } from './game/interstitials.js';

const SCREENS = [
  TitleScreen,
  OnlineScreen,
  ProfileScreen,
  WardrobeScreen,
  SettingsScreen,
  /**
   * Still registered, deliberately, with no way in from the menu — see the
   * note over the menu row in src/menu/title.js. Unregistering it would make
   * the screen unreachable from the console too, and the file is not being
   * retired, only unlinked.
   */
  CreditsScreen,
  AchievementsScreen,
  SlotsScreen,
  ExploreScreen,
  ShopScreen,
  InnScreen,
  ForgeScreen,
  TailorScreen,
  DuelScreen,
  WorldIntroScreen,
  VictoryScreen,
  GameOverScreen,
];

async function boot() {
  await loadSettings();
  /**
   * The ledger is read before anything can be earned, and its listeners go up
   * before the first screen mounts — an unlock that fires during the title
   * screen (a name saved, a slot picked) has to find both a loaded ledger and
   * a layer to land on.
   */
  await loadAchievements();
  initAchievements();
  /**
   * ANYBODY WHO ALREADY FINISHED THE GAME ALREADY HAS THE HARD ROAD
   * -------------------------------------------------------------------------
   * The unlock is a flag on the profile written when the Stranger goes down
   * (see `finishGame` in src/game/run.js), and it did not exist until this
   * release — so every player who beat the game before today would be told to
   * go and do it again. The ledger has said "The Stranger Falls" since the day
   * achievements shipped, so it is the honest record to migrate from.
   *
   * It runs here rather than inside `isHardUnlocked` because the difficulty
   * table is imported by the price curve, which is imported by nearly
   * everything: an edge from there to the achievement ledger would close a
   * cycle through half the game. Boot is the one place that already has both.
   *
   * Writing the flag also spends the first-time bit that decides whether the
   * announcement plays — which is correct. Somebody who finished the game last
   * month is not shown a cut-scene about a thing they are already holding.
   */
  if (isUnlocked('finished')) await unlockHardMode();
  /**
   * Dress the gunslinger before anything draws one. It goes here rather than
   * inside the rig because a garment is locked behind an achievement, so the
   * ledger has to be on the device first — and because the FIRST thing the
   * title screen does is put the player at the end of the road behind the menu.
   */
  applyOutfit();

  initScene(document.getElementById('scene-canvas'));
  initToasts(document.getElementById('toasts'));
  initAchievementNotices(document.getElementById('achievement-notices'));
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
  const [player, run, worlds, items, achievements, wardrobe] = await Promise.all([
    import('./game/player.js'),
    import('./game/run.js'),
    import('./game/worlds.js'),
    import('./game/items.js'),
    import('./game/achievements.js'),
    import('./game/wardrobe.js'),
  ]);
  window.SHOOT = { go, player, run, worlds, items, achievements, wardrobe };
}

boot().catch((err) => {
  console.error('[boot] failed', err);
  document.getElementById('screen-root').innerHTML =
    '<div class="screen"><div class="panel"><h1 class="panel-title">Trouble at the saloon</h1>' +
    '<p class="muted center">The game failed to start. Check the console for details.</p></div></div>';
});
