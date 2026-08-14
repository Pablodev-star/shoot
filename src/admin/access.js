/**
 * SHOOT! — The Admin Panel's door.
 *
 * Two locks, in this order:
 *
 *   1. THE SIGIL. Three big letters drawn over the road while you are walking —
 *      see src/admin/sigil.js for what counts as one and why it cannot be
 *      stumbled into. Nothing on the screen hints that it exists.
 *   2. THE PASSPHRASE. The sigil only opens a box to type it into. Get it right
 *      and the slot is an admin slot from then on; get it wrong three times and
 *      that slot never opens again.
 *
 * THREE ATTEMPTS, PER SLOT, FOREVER
 * ---------------------------------------------------------------------------
 * The count is kept against the SLOT NUMBER and not against the run in it, and
 * it is written through the ordinary storage driver, so it outlives everything
 * a run can do to itself:
 *
 *   - dying erases the save and does not give the attempts back
 *   - erasing the slot by hand from the picker does not either
 *   - starting a new run in slot 2 inherits whatever slot 2 has left
 *
 * That is what "permanent" means here, and it is the point of a three-guess
 * lock: a tester is told the phrase and types it, and anybody else spends the
 * three guesses they will ever have on a word they have never seen. There is
 * deliberately no cooldown, no hint, and no way back — a lockout that can be
 * waited out is a lockout that can be brute-forced by somebody patient.
 *
 * THE PHRASE IS NOT IN THIS FILE
 * ---------------------------------------------------------------------------
 * What is stored is a fingerprint of it. That is not cryptography and it is not
 * pretending to be — anything shipped to a browser can be read — it is the same
 * courtesy as not printing the answer at the bottom of the page: somebody
 * reading the source to find out how the door works does not have the phrase
 * handed to them on the way past. Case and surrounding spaces are ignored
 * before hashing, because burning one of three permanent attempts on a capital
 * letter would be a cruel joke rather than a security measure.
 */

import { read, write } from '../core/storage.js';
import { el } from '../core/dom.js';
import { attachButtonSounds, play } from '../core/audio.js';
import { closeButton } from '../ui/widgets.js';
import { toast } from '../ui/toast.js';

const GATE_KEY = 'admin.gate';

/** Guesses a slot ever gets. */
export const MAX_ATTEMPTS = 3;

/** The fingerprint of the passphrase, lower-cased and trimmed. See above. */
const PHRASE_FINGERPRINT = '1d7s2pv-rpoffh';

/**
 * Two independent 32-bit walks over the string, printed base 36. Two of them
 * rather than one so that the odds of a wrong phrase happening to collide are
 * somewhere past astronomical rather than merely small.
 */
function fingerprint(text) {
  let h1 = 0x811c9dc5 >>> 0;
  let h2 = 0x01000193 >>> 0;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 16777619) >>> 0;
    h2 = Math.imul(h2 + c + i, 2246822519) >>> 0;
    h2 = ((h2 << 13) | (h2 >>> 19)) >>> 0;
  }
  return `${h1.toString(36)}-${h2.toString(36)}`;
}

/** The whole ledger: `{ slots: { "1": { attempts, unlocked, at } } }`. */
async function readGate() {
  const stored = await read(GATE_KEY);
  return { slots: {}, ...(stored || {}) };
}

async function writeGate(gate) {
  await write(GATE_KEY, gate);
  return gate;
}

function blankSlot() {
  return { attempts: 0, unlocked: false, at: 0 };
}

/** What a slot's door looks like right now. */
export async function slotAccess(slot) {
  const gate = await readGate();
  const record = { ...blankSlot(), ...(gate.slots[slot] || {}) };
  return {
    ...record,
    left: Math.max(0, MAX_ATTEMPTS - record.attempts),
    locked: !record.unlocked && record.attempts >= MAX_ATTEMPTS,
  };
}

/**
 * Spend one attempt on a slot.
 *
 * The attempt is written down BEFORE the answer is checked, so closing the tab
 * mid-guess is not a way to get a free one.
 *
 * @returns {Promise<{ok: boolean, left: number, locked: boolean}>}
 */
export async function attemptPhrase(slot, typed) {
  const gate = await readGate();
  const record = { ...blankSlot(), ...(gate.slots[slot] || {}) };
  if (record.unlocked) return { ok: true, left: MAX_ATTEMPTS - record.attempts, locked: false };
  if (record.attempts >= MAX_ATTEMPTS) return { ok: false, left: 0, locked: true };

  record.attempts += 1;
  const ok = fingerprint(String(typed || '').trim().toLowerCase()) === PHRASE_FINGERPRINT;
  if (ok) {
    record.unlocked = true;
    record.at = Date.now();
  }
  gate.slots[slot] = record;
  await writeGate(gate);
  return {
    ok,
    left: Math.max(0, MAX_ATTEMPTS - record.attempts),
    locked: !ok && record.attempts >= MAX_ATTEMPTS,
  };
}

/**
 * Every slot's standing, for the panel's own "how did I get in here" line.
 */
export async function allSlotAccess(count = 3) {
  const out = [];
  for (let slot = 1; slot <= count; slot++) out.push({ slot, ...(await slotAccess(slot)) });
  return out;
}

// ---------------------------------------------------------------------------
// The box you type it into
// ---------------------------------------------------------------------------

/**
 * Ask for the phrase.
 *
 * It says almost nothing: no title explaining what it opens, no hint, and no
 * mention of the word "admin" anywhere on it. Somebody who has drawn the sigil
 * by accident sees a locked box and closes it, and the three attempts are only
 * spent by somebody who types something.
 *
 * @param {number} slot
 * @returns {Promise<boolean>} true when the slot is now unlocked
 */
export function openPhrasePrompt(slot) {
  return new Promise((resolve) => {
    let settled = false;
    const input = el('input.input', {
      type: 'password',
      autocomplete: 'off',
      autocapitalize: 'off',
      spellcheck: 'false',
      'aria-label': 'Passphrase',
      placeholder: '',
    });
    const status = el('p.field-hint.center', { text: '' });
    const submit = el('button.btn.btn--sm.btn--gold', { onclick: () => tryIt() }, ['Enter']);

    const backdrop = el('div.modal-backdrop.gate-backdrop', {
      onclick: (e) => {
        if (e.target === backdrop) finish(false);
      },
    });

    function finish(result) {
      if (settled) return;
      settled = true;
      document.removeEventListener('keydown', onKey, true);
      backdrop.remove();
      resolve(result);
    }

    const onKey = (e) => {
      if (e.key === 'Escape') finish(false);
      if (e.key === 'Enter') {
        e.preventDefault();
        tryIt();
      }
      e.stopPropagation();
    };
    document.addEventListener('keydown', onKey, true);

    async function tryIt() {
      const typed = input.value;
      if (!typed.trim()) return;
      submit.disabled = true;
      const result = await attemptPhrase(slot, typed);
      if (result.ok) {
        play('levelUp');
        finish(true);
        return;
      }
      play('error');
      input.value = '';
      input.classList.remove('is-wrong');
      void input.offsetWidth;
      input.classList.add('is-wrong');
      if (result.locked) {
        status.textContent = 'This slot is closed for good.';
        input.disabled = true;
        submit.disabled = true;
        return;
      }
      status.textContent = `${result.left} ${result.left === 1 ? 'try' : 'tries'} left on this slot.`;
      submit.disabled = false;
    }

    const modal = el('div.panel.modal.modal--narrow.gate-modal', {
      role: 'dialog',
      'aria-label': 'Passphrase',
    }, [
      el('div.modal-header', {}, [
        el('h2.panel-title', { text: '· · ·' }),
        closeButton(() => finish(false)),
      ]),
      el('div.col', { style: { gap: 'var(--sp-3)' } }, [
        el('div.field.field--wide', {}, [input]),
        status,
      ]),
      el('div.modal-footer', { style: { justifyContent: 'center' } }, [submit]),
    ]);

    backdrop.append(modal);
    document.getElementById('app').append(backdrop);
    attachButtonSounds(backdrop);

    slotAccess(slot).then((access) => {
      if (settled) return;
      if (access.unlocked) {
        finish(true);
        return;
      }
      if (access.locked) {
        status.textContent = 'This slot is closed for good.';
        input.disabled = true;
        submit.disabled = true;
        return;
      }
      status.textContent = `${access.left} ${access.left === 1 ? 'try' : 'tries'} left on this slot.`;
      input.focus();
    });
  });
}

// ---------------------------------------------------------------------------
// Arming the road
// ---------------------------------------------------------------------------

/**
 * Watch the exploration screen for the sigil, and open whatever the slot has
 * earned when it lands.
 *
 * The walk is paused around all of it — the box and the panel alike — because
 * an encounter firing while a tester is typing would put a duel on top of the
 * dialog. Everything here is loaded on demand: a player who never draws the
 * sigil never downloads a byte of the panel.
 *
 * @param {object} opts
 * @param {object} opts.engine the walk engine, so the road can be held
 * @param {() => number} opts.slot which permanent slot this run occupies
 * @returns {{dispose: () => void}}
 */
export function armSigil({ engine, slot }) {
  let busy = false;
  /**
   * THE ROAD HOLDS ITS BREATH BETWEEN THE LETTERS
   * -------------------------------------------------------------------------
   * Drawing three letters takes a couple of seconds, and the walk does not stop
   * for it — which means an encounter can come up between the P and the L, the
   * exploration screen unmounts, and the sigil is thrown away half finished.
   * Measured across a few dozen attempts that is about one in three on a busy
   * stretch of road, which is not a door, it is a lottery.
   *
   * So the first accepted letter pauses the walk, and it is handed back the
   * moment the sequence completes, breaks, or simply stops arriving. Yes, that
   * is technically a tell — but it only appears AFTER somebody has drawn a
   * screen-high P correctly, which is not something anybody does by accident,
   * and the walk pausing is something the player already sees every time they
   * open the saddlebag.
   */
  let holding = false;
  let releaseTimer = 0;

  const watcher = createWatcherLazily();

  function createWatcherLazily() {
    let live = null;
    // The recogniser is small, but the panel behind it is not, so the import
    // is deferred to the moment somebody actually draws something.
    import('./sigil.js').then(({ createSigilWatcher, STROKE_WINDOW }) => {
      live = createSigilWatcher({
        host: document.getElementById('app'),
        enabled: () => !busy && !document.querySelector('#app > .modal-backdrop'),
        onProgress: ({ index }) => {
          clearTimeout(releaseTimer);
          if (index === 0) {
            release();
            return;
          }
          if (!holding && !engine.isPaused()) {
            engine.pause();
            holding = true;
          }
          // A sequence that is never finished must not leave the road stopped,
          // so the hold outlives the recogniser's own window by a moment and
          // then gives up on its own.
          releaseTimer = setTimeout(release, STROKE_WINDOW + 500);
        },
        onComplete: open,
      });
    });
    return { dispose: () => live?.dispose() };
  }

  /** Give the walk back, if this watcher was the one that took it. */
  function release() {
    clearTimeout(releaseTimer);
    if (!holding) return;
    holding = false;
    if (!busy && onTheRoad()) engine.resume();
  }

  function onTheRoad() {
    return document.getElementById('screen-root')?.dataset.screen === 'explore';
  }

  async function open() {
    if (busy) return;
    busy = true;
    clearTimeout(releaseTimer);
    // The hold counts as walking: the sigil stopped the road on the player's
    // behalf, so closing the panel has to start it again.
    const wasWalking = holding || !engine.isPaused();
    holding = false;
    engine.pause();
    try {
      const current = slot();
      const access = await slotAccess(current);
      let allowed = access.unlocked;
      if (!allowed) {
        if (access.locked) {
          play('error');
          toast('Nothing happens', 'bad');
        } else {
          allowed = await openPhrasePrompt(current);
        }
      }
      if (allowed) {
        const { openAdminPanel } = await import('./panel.js');
        await openAdminPanel({ engine, slot: current });
      }
    } finally {
      busy = false;
      // Whoever routed away — a custom battle, a jump to another world — owns
      // the screen now, and resuming a walk that is no longer on screen would
      // start the road running underneath it.
      if (wasWalking && onTheRoad()) engine.resume();
    }
  }

  return {
    dispose: () => {
      clearTimeout(releaseTimer);
      holding = false;
      watcher.dispose();
    },
  };
}
