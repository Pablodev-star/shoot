/**
 * SHOOT! — Confirmation dialog.
 *
 * Anything destructive (erasing a slot, abandoning a run) goes through here, so
 * a stray tap never costs a player their progress.
 *
 * @returns {Promise<boolean>} resolves true only when the player confirms.
 */

import { el } from '../core/dom.js';
import { attachButtonSounds } from '../core/audio.js';

export function confirmDialog({
  title,
  body,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
} = {}) {
  return new Promise((resolve) => {
    const backdrop = el('div.modal-backdrop', {
      onclick: (e) => {
        if (e.target === backdrop) finish(false);
      },
    });

    function finish(result) {
      document.removeEventListener('keydown', onKey);
      backdrop.remove();
      resolve(result);
    }

    const onKey = (e) => {
      if (e.key === 'Escape') finish(false);
      if (e.key === 'Enter') finish(true);
    };
    document.addEventListener('keydown', onKey);

    const modal = el('div.panel.modal', {
      role: 'alertdialog',
      'aria-label': title,
      style: { width: 'min(460px, 100%)' },
    }, [
      el('h2.panel-title', { text: title }),
      body ? el('p.center', { style: { marginTop: 'var(--sp-3)' }, text: body }) : null,
      el('div.modal-footer', { style: { justifyContent: 'center' } }, [
        el('button.btn.btn--sm.btn--ghost', { onclick: () => finish(false) }, [cancelLabel]),
        el(`button.btn.btn--sm${danger ? '.btn--danger' : '.btn--gold'}`, {
          onclick: () => finish(true),
        }, [confirmLabel]),
      ]),
    ]);

    backdrop.append(modal);
    document.getElementById('app').append(backdrop);
    attachButtonSounds(backdrop);
    modal.querySelector('.modal-footer .btn:last-child')?.focus();
  });
}
