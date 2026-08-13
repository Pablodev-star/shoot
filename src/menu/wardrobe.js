/**
 * SHOOT! — The wardrobe screen.
 *
 * Reached by tapping the avatar on the profile — the pencil in the corner of
 * the plate is the invitation. Clothes on the left, the man wearing them on the
 * right, and nothing is committed until Save.
 *
 * THE MANNEQUIN IS THE POINT
 * ---------------------------------------------------------------------------
 * Every other way of showing an outfit is a list of four nouns. So the right
 * half of the screen is the gunslinger himself, breathing on the spot in the
 * idle loop the game uses everywhere else, wearing what is currently selected —
 * not what is currently SAVED. Pick a hat and it is on his head before your
 * finger is off the card, which is the whole reason to draw him at all.
 *
 * NOTHING IS COMMITTED UNTIL SAVE
 * ---------------------------------------------------------------------------
 * The preview is composed off to one side (`previewSprites`) and never touches
 * the rig's own cache, so the man at the end of the road behind this screen
 * keeps wearing the saved outfit while you try things on in front of him. Save
 * writes the profile, dresses the rig, and the backdrop changes on the next
 * frame — along with the profile portrait, the road, the saddle and the duel.
 *
 * LOCKED IS DRAWN, NOT HIDDEN
 * ---------------------------------------------------------------------------
 * Same rule as the achievements screen it borrows from: every garment in the
 * game is on this screen from the first minute, a locked one greyed to a flat
 * mannequin with the line it is waiting for printed underneath. You cannot go
 * and earn something you have never been shown.
 */

import { el, clearNode } from '../core/dom.js';
import { back } from '../core/router.js';
import { attachButtonSounds, play } from '../core/audio.js';
import { startMenuScene } from './menu-scene.js';
import { backButton, uiIcon } from '../ui/widgets.js';
import { toast } from '../ui/toast.js';
import { getProfile } from '../core/settings.js';
import { CHARACTER_TIMING } from '../art/sprites-character.js';
import { pieceThumb, lockedThumb } from '../art/sprites-wardrobe.js';
import { makeCanvas, drawSprite, frameAt, crisp } from '../art/pixel.js';
import {
  OUTFIT_SLOTS,
  getOutfit,
  getWardrobe,
  previewSprites,
  saveOutfit,
} from '../game/wardrobe.js';

/** Source pixels per drawn pixel on the mannequin, and the room around him. */
const STAGE = { scale: 7, w: 26, h: 30 };

export const WardrobeScreen = {
  id: 'wardrobe',

  mount(root) {
    startMenuScene();

    const saved = getOutfit();
    /** What is being tried on. Only Save moves it onto the player. */
    const pending = { ...saved };
    let slot = 'hat';

    // --- the mannequin -----------------------------------------------------
    const stage = makeCanvas(STAGE.w * STAGE.scale, STAGE.h * STAGE.scale);
    stage.canvas.className = 'pixel wardrobe-figure';
    stage.canvas.style.width = `${STAGE.w * STAGE.scale}px`;
    stage.canvas.style.height = `${STAGE.h * STAGE.scale}px`;
    stage.canvas.setAttribute('role', 'img');
    stage.canvas.setAttribute('aria-label', 'Your gunslinger');
    crisp(stage.ctx);

    let raf = 0;
    let elapsed = 0;
    let last = performance.now();

    function frame(now) {
      elapsed += Math.min(64, Math.max(0, now - last));
      last = now;
      drawFigure(stage, pending, elapsed);
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    // --- the picker --------------------------------------------------------
    const tabRow = el('div.wardrobe-tabs', { role: 'tablist' });
    const grid = el('div.wardrobe-grid', { role: 'listbox', 'aria-label': 'Garments' });
    const wornList = el('dl.wardrobe-worn');
    const saveBtn = el('button.btn.btn--gold.btn--lg', { onclick: () => commit() }, ['Save']);
    const undoBtn = el('button.btn.btn--sm.btn--ghost', { onclick: () => undo() }, ['Undo']);

    function dirty() {
      return OUTFIT_SLOTS.some((s) => pending[s] !== saved[s]);
    }

    function renderTabs() {
      const { slots } = getWardrobe(pending);
      clearNode(tabRow);
      for (const entry of slots) {
        tabRow.append(el('button.btn.btn--sm.wardrobe-tab', {
          class: entry.slot === slot ? 'is-active' : '',
          role: 'tab',
          'aria-selected': entry.slot === slot ? 'true' : 'false',
          onclick: () => {
            if (slot === entry.slot) return;
            slot = entry.slot;
            renderTabs();
            renderGrid();
          },
        }, [
          el('span', { text: entry.label.plural }),
          el('span.wardrobe-tab-count', { text: `${entry.ownedCount}/${entry.items.length}` }),
        ]));
      }
      // Re-rendered controls are new nodes, so they have to be given their
      // hover and click cues again — `attachButtonSounds` is idempotent.
      attachButtonSounds(tabRow);
    }

    function renderGrid() {
      const { slots } = getWardrobe(pending);
      const entry = slots.find((s) => s.slot === slot);
      clearNode(grid);
      for (const item of entry.items) {
        grid.append(card(item, () => choose(item)));
      }
      attachButtonSounds(grid);
    }

    /**
     * Try something on. A locked card is not silently inert — it says what it
     * is waiting for, which is the only thing it is on the screen to do.
     * (The refusal noise comes off the card's own `data-sfx`.)
     */
    function choose(item) {
      if (!item.owned) {
        toast(`Locked — ${item.requirement.description}`, 'bad');
        return;
      }
      if (pending[item.slot] === item.id) return;
      pending[item.slot] = item.id;
      renderGrid();
      renderWorn();
    }

    function renderWorn() {
      const { slots } = getWardrobe(pending);
      clearNode(wornList);
      for (const entry of slots) {
        const item = entry.items.find((i) => i.equipped);
        wornList.append(el('div.wardrobe-worn-row', {
          class: pending[entry.slot] !== saved[entry.slot] ? 'is-changed' : '',
        }, [
          el('dt', { text: entry.label.name }),
          el('dd', { text: item ? item.name : '—' }),
        ]));
      }
      saveBtn.disabled = !dirty();
      undoBtn.hidden = !dirty();
    }

    function undo() {
      Object.assign(pending, saved);
      renderGrid();
      renderWorn();
    }

    async function commit() {
      if (!dirty()) return;
      const worn = await saveOutfit(pending);
      Object.assign(pending, worn);
      Object.assign(saved, worn);
      play('coin');
      toast('Outfit saved', 'good');
      renderGrid();
      renderWorn();
    }

    const { owned, total } = getWardrobe(pending);

    const screen = el('div.screen.wardrobe-screen', {}, [
      el('div.screen-header', {}, [
        backButton(() => back('profile')),
        el('h1.screen-title', { text: 'Wardrobe' }),
        el('span.chip.chip--gold', { text: `${owned}/${total}` }),
      ]),

      el('div.screen-body', {}, [
        el('div.wardrobe-layout', {}, [
          el('div.wardrobe-picker', {}, [
            tabRow,
            grid,
            el('p.field-hint', {
              text: 'Most of this is earned. Every locked piece says what it is waiting for.',
            }),
          ]),

          el('div.panel.panel--braced.wardrobe-stage', {}, [
            el('div.wardrobe-name', { text: getProfile().name }),
            el('div.wardrobe-plate', {}, [stage.canvas]),
            wornList,
            el('div.wardrobe-actions', {}, [undoBtn, saveBtn]),
          ]),
        ]),
      ]),
    ]);

    renderTabs();
    renderGrid();
    renderWorn();

    root.append(screen);
    attachButtonSounds(screen);

    return () => {
      cancelAnimationFrame(raf);
    };
  },
};

/** One garment. Owned ones are a picture of the thing; locked ones a mannequin. */
function card(item, onClick) {
  const locked = !item.owned;
  return el('button.wardrobe-card', {
    class: `${item.equipped ? 'is-equipped' : ''} ${locked ? 'is-locked' : ''}`.trim(),
    role: 'option',
    'aria-selected': item.equipped ? 'true' : 'false',
    'aria-label': locked
      ? `${item.name}. Locked. ${item.requirement.description}`
      : `${item.name}. ${item.blurb}`,
    'data-sfx': locked ? 'error' : 'click',
    onclick: onClick,
  }, [
    el('div.wardrobe-card-art', {}, [
      pixelSprite(locked ? lockedThumb(item.slot) : pieceThumb(item.slot, item.id), 4),
      locked ? el('span.wardrobe-card-lock', {}, [uiIcon('lock', 1)]) : null,
      item.equipped ? el('span.wardrobe-card-tick', {}, [uiIcon('check', 0.9)]) : null,
    ]),
    el('div.wardrobe-card-text', {}, [
      el('span.wardrobe-card-name', { text: item.name }),
      locked
        ? el('span.wardrobe-card-req', { text: item.requirement.name })
        : el('span.wardrobe-card-blurb', { text: item.blurb }),
    ]),
  ]);
}

/**
 * A baked canvas dropped straight into the DOM at an integer scale.
 *
 * Not `pixelImg`: that re-encodes a PNG per call, and this screen draws thirty
 * of them the moment it opens.
 */
function pixelSprite(sprite, scale) {
  const { canvas, ctx } = makeCanvas(sprite.width * scale, sprite.height * scale);
  crisp(ctx);
  ctx.drawImage(sprite, 0, 0, canvas.width, canvas.height);
  canvas.className = 'pixel';
  canvas.style.width = `${canvas.width}px`;
  canvas.style.height = `${canvas.height}px`;
  return canvas;
}

/**
 * The gunslinger, idling on his mark.
 *
 * Cleared and redrawn every frame with the pending outfit's own baked set, so
 * changing a hat is not a re-render of anything — the next frame simply has a
 * different sprite in it.
 */
function drawFigure(stage, outfit, elapsed) {
  const { canvas, ctx } = stage;
  const s = STAGE.scale;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const set = previewSprites(outfit);
  const frames = set.idle;
  const sprite = frames[frameAt(frames, elapsed, CHARACTER_TIMING.idle)];

  /** Where the soles land. The idle bob is inside the sprite, so this is fixed. */
  const footY = canvas.height - 2 * s;
  const x = Math.round((canvas.width - sprite.width * s) / 2);

  // A contact shadow, so he is standing on something rather than floating in a
  // box. Centred a pixel above the soles, which is what stops it reading as a
  // puddle he is hovering over.
  ctx.fillStyle = 'rgba(12, 8, 5, 0.45)';
  ctx.beginPath();
  ctx.ellipse(canvas.width / 2, footY - s, 7 * s, 1.5 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  drawSprite(ctx, sprite, x, footY - sprite.height * s, s);
}
