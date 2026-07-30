/**
 * SHOOT! — Screen router.
 *
 * Every full-screen view (title, story, online, shop, duel, ...) registers here.
 * The router owns:
 *   - mounting / unmounting screens into #screen-root
 *   - the animated transition between them (a saloon-door style wipe)
 *   - a back stack, so every screen gets a working "Back" without wiring
 *
 * A screen is `{ id, mount(root, params) -> void, unmount?() -> void }`.
 */

import { EVENTS, emit } from './events.js';
import { clearNode } from './dom.js';
import { play } from './audio.js';

const screens = new Map();
const stack = [];
let current = null;
let root = null;
let overlay = null;
let transitioning = false;

export function initRouter(rootNode, overlayNode) {
  root = rootNode;
  overlay = overlayNode;
}

export function register(screen) {
  screens.set(screen.id, screen);
}

export function currentScreen() {
  return current ? current.id : null;
}

const TRANSITION_MS = 320;

function runTransition(phase) {
  if (!overlay) return Promise.resolve();
  overlay.classList.toggle('is-closing', phase === 'in');
  overlay.classList.toggle('is-opening', phase === 'out');
  return new Promise((resolve) => setTimeout(resolve, TRANSITION_MS));
}

/**
 * Navigate to a screen.
 * @param {string} id
 * @param {object} params passed to the screen's mount()
 * @param {{replace?: boolean, silent?: boolean}} opts
 */
export async function go(id, params = {}, opts = {}) {
  const screen = screens.get(id);
  if (!screen) {
    console.error(`[router] unknown screen "${id}"`);
    return;
  }
  if (transitioning) return;
  transitioning = true;

  if (!opts.silent) play(opts.back ? 'back' : 'click');

  await runTransition('in');

  if (current && current.unmount) {
    try {
      current.unmount();
    } catch (err) {
      console.error(`[router] unmount of "${current.id}" threw`, err);
    }
  }
  if (current && !opts.replace && !opts.back) stack.push({ id: current.id, params: current.params });

  // Overlays (inventory, battle overview, dialogs) live outside #screen-root so
  // they can cover the whole app. Clear any that survived the old screen.
  document.querySelectorAll('#app > .modal-backdrop').forEach((node) => node.remove());

  clearNode(root);
  root.dataset.screen = id;
  current = { id, params, unmount: null };
  const unmount = screen.mount(root, params);
  current.unmount = typeof unmount === 'function' ? unmount : screen.unmount;

  emit(EVENTS.SCREEN_CHANGED, { id, params });

  await runTransition('out');
  transitioning = false;
}

/** Pop back to the previous screen (or to a fallback when the stack is empty). */
export async function back(fallback = 'title') {
  const prev = stack.pop();
  if (prev) await go(prev.id, prev.params, { back: true });
  else await go(fallback, {}, { back: true });
}

/** Wipe the back stack — used when entering/leaving a run. */
export function resetStack() {
  stack.length = 0;
}
