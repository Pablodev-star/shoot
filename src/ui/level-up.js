/**
 * SHOOT! — The level-up card.
 *
 * A level used to be a toast in the corner — "Level 4! +1 life" — in the same
 * nailed-sign style as "the shop is closed". It is the one steady reward the
 * road hands out, once or twice a world, so it gets a moment of its own: a
 * gold plate that slams in at the centre of the screen with the new number on
 * it and what it bought, a burst of sparks, and gone in two seconds. It never
 * takes a click and never blocks one.
 */

import { on, EVENTS } from '../core/events.js';
import { t } from '../core/i18n.js';

let host = null;

export function initLevelUp(root) {
  host = root;
  on(EVENTS.LEVEL_UP, ({ level, maxLives, gained }) => show(level, maxLives, gained));
}

function show(level, maxLives, gained = 1) {
  if (!host) return;
  host.querySelector('.levelup-card')?.remove();
  const card = document.createElement('div');
  card.className = 'levelup-card';
  card.setAttribute('role', 'status');

  const kicker = document.createElement('div');
  kicker.className = 'levelup-kicker';
  kicker.textContent = t('Level up');
  const num = document.createElement('div');
  num.className = 'levelup-num';
  num.textContent = String(level);
  const sub = document.createElement('div');
  sub.className = 'levelup-sub';
  sub.textContent = t('Max lives {n}', { n: maxLives });

  const sparks = document.createElement('div');
  sparks.className = 'levelup-sparks';
  for (let i = 0; i < 14; i++) {
    const s = document.createElement('i');
    const a = (i / 14) * Math.PI * 2;
    const r = 90 + Math.random() * 60;
    s.style.setProperty('--dx', `${Math.cos(a) * r}px`);
    s.style.setProperty('--dy', `${Math.sin(a) * r * 0.7}px`);
    s.style.animationDelay = `${Math.random() * 120}ms`;
    sparks.append(s);
  }

  card.append(sparks, kicker, num, sub);
  if (gained > 1) card.dataset.multi = `×${gained}`;
  host.append(card);
  card.addEventListener('animationend', (e) => {
    if (e.target === card) card.remove();
  });
  setTimeout(() => card.isConnected && card.remove(), 3200);
}
