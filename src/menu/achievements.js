/**
 * SHOOT! — Achievements screen.
 *
 * The ledger, read back. It took the Credits' place on the main menu (the
 * credits screen itself is untouched and still registered — it simply has no
 * door on it for now), because a menu entry is a promise about what the player
 * will find behind it, and a list of things still to do is worth more of the
 * front page than a history of the project.
 *
 * THE PERCENTAGE IS THE HEADLINE
 * ---------------------------------------------------------------------------
 * One number, at the top, big: how much of the game you have actually seen.
 * Everything else on the screen is that number taken apart — the count under
 * it, the bar behind it, and six sections that each say how much of themselves
 * is done. A player who opens this screen wants to know what is left, so what
 * is left is what the screen leads with.
 *
 * LOCKED IS NOT HIDDEN
 * ---------------------------------------------------------------------------
 * Every card is legible whether or not it has been earned: name, what it asks
 * for, and its reward slot. There are no secret achievements, because a secret
 * achievement is one the player cannot decide to go and get, and this list is
 * meant to be a set of things to go and do. Locked ones are simply drained of
 * colour, with a padlock where the medal goes.
 *
 * THE REWARD SLOT IS DRAWN EMPTY ON PURPOSE
 * ---------------------------------------------------------------------------
 * Every card carries a Reward row and every one of them currently reads as an
 * empty hanger. The wardrobe is not built yet; when it is, the reward moves
 * into the definition in src/game/achievements.js and the row here fills
 * itself in. Drawing the slot now is a promise the layout is already keeping
 * room for — nothing about this screen has to move when the clothes arrive.
 */

import { el } from '../core/dom.js';
import { back } from '../core/router.js';
import { attachButtonSounds } from '../core/audio.js';
import { startMenuScene } from './menu-scene.js';
import { backButton, uiIcon } from '../ui/widgets.js';
import { CATEGORIES, getAchievementState } from '../game/achievements.js';

export const AchievementsScreen = {
  id: 'achievements',

  mount(root) {
    startMenuScene();

    const { list, unlockedCount, total, percent } = getAchievementState();

    const screen = el('div.screen.achievements-screen', {}, [
      el('div.screen-header', {}, [
        backButton(() => back('title')),
        el('h1.screen-title', { text: 'Achievements' }),
        el('span.chip.chip--gold', { text: `${unlockedCount}/${total}` }),
      ]),

      el('div.screen-body', {}, [
        summary(percent, unlockedCount, total),
        ...CATEGORIES.map((category) => section(category, list)),
      ]),
    ]);

    root.append(screen);
    attachButtonSounds(screen);
  },
};

/** The headline: the percentage, the count, and the bar behind both. */
function summary(percent, unlockedCount, total) {
  return el('div.panel.panel--braced.ach-summary', {}, [
    el('div.ach-summary-figure', {}, [
      el('span.ach-summary-percent', { text: `${percent}%` }),
      el('span.ach-summary-label', { text: 'Complete' }),
    ]),
    el('div.ach-summary-meter', {}, [
      el('div.ach-bar', {
        role: 'meter',
        'aria-label': 'Achievements unlocked',
        'aria-valuemin': '0',
        'aria-valuemax': String(total),
        'aria-valuenow': String(unlockedCount),
      }, [
        el('div.ach-bar-fill', { style: { width: `${percent}%` } }),
      ]),
      el('p.ach-summary-note', {
        text: unlockedCount === total
          ? 'Every last one of them. There is nothing left on this road you have not done.'
          : `${unlockedCount} of ${total} earned · ${total - unlockedCount} still out there`,
      }),
      el('p.field-hint', {
        text: 'Kept on this device, alongside your profile — a run can end, these do not.',
      }),
    ]),
  ]);
}

/** One category: a divider that counts itself, then its cards. */
function section(category, list) {
  const mine = list.filter((a) => a.category === category.id);
  if (!mine.length) return null;
  const done = mine.filter((a) => a.unlocked).length;

  return el('div.ach-section', {}, [
    el('div.divider', { text: `${category.name} · ${done}/${mine.length}` }),
    el('p.ach-section-blurb', { text: category.blurb }),
    el('div.ach-grid.stagger', {}, mine.map(card)),
  ]);
}

function card(achievement) {
  const { unlocked, name, description, reward } = achievement;

  return el('div.ach-card', {
    class: unlocked ? 'is-unlocked' : 'is-locked',
    'aria-label': `${name}. ${description} ${unlocked ? 'Unlocked.' : 'Locked.'}`,
  }, [
    el('div.ach-card-top', {}, [
      el('div.ach-medal', {}, [uiIcon(unlocked ? 'star' : 'lock', 1.3)]),
      el('div.ach-card-text', {}, [
        el('div.ach-name', { text: name }),
        el('p.ach-desc', { text: description }),
      ]),
      unlocked ? el('span.ach-tick', {}, [uiIcon('check', 1)]) : null,
    ]),

    // The wardrobe hook. Empty for every achievement in the game today — see
    // the note at the top of this file.
    el('div.ach-reward', {}, [
      el('span.ach-reward-label', { text: 'Reward' }),
      reward
        ? el('span.ach-reward-value', { text: reward.name || reward.id })
        : el('span.ach-reward-empty', { text: 'Clothing — coming soon' }),
    ]),
  ]);
}
