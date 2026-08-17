/**
 * SHOOT! — Save slots (Block 5b).
 *
 * Three slots, exactly like the second version of the game had. Everything goes
 * through the storage driver in src/core/storage.js, so migrating to a remote
 * database later means changing that driver, not this file.
 *
 * A slot payload is:
 *   { version, difficulty, player, daynight, weather, travelled, segmentSeed,
 *     savedAt }
 *
 * `version` lets future releases migrate old saves instead of discarding them.
 *
 * `difficulty` is chosen once, when the slot is created, and never again — see
 * the note at the bottom of src/game/difficulty.js. It is on the SLOT rather
 * than on the device because it is a property of the road this run is walking:
 * two slots can hold two different games at once, and picking either of them
 * back up has to put the same one under you.
 */

import { read, write, remove } from '../core/storage.js';
import { DEFAULT_DIFFICULTY } from './difficulty.js';

export const SLOT_COUNT = 3;
/**
 * Bumped for the difficulty field. Nothing about the migration below needs the
 * number — it is additive, like every migration this file has ever done — but a
 * payload that carries a new field and the old version stamp is a payload that
 * cannot be told apart from a corrupt one later.
 */
export const SAVE_VERSION = 2;

const slotKey = (slot) => `save.slot${slot}`;

/** Read one slot. Returns null when empty or unreadable. */
export async function readSlot(slot) {
  const data = await read(slotKey(slot));
  if (!data) return null;
  return migrate(data);
}

/** Read all three slots at once (used by the slot picker). */
export async function readAllSlots() {
  const out = [];
  for (let i = 1; i <= SLOT_COUNT; i++) out.push({ slot: i, data: await readSlot(i) });
  return out;
}

export async function writeSlot(slot, payload) {
  return write(slotKey(slot), { version: SAVE_VERSION, ...payload });
}

export async function deleteSlot(slot) {
  return remove(slotKey(slot));
}

/**
 * Bring an older payload up to the current shape. Additive by design: unknown
 * fields are preserved, missing ones get defaults.
 */
function migrate(data) {
  const out = { ...data };
  if (!out.version) out.version = 1;
  if (!out.player) return null; // corrupt — treat the slot as empty
  if (typeof out.travelled !== 'number') out.travelled = 0;
  /**
   * A file written before there were two roads was written on the ordinary
   * one, which is exactly what the default says — so every save in the wild
   * comes back as the run it actually was rather than being told it is
   * something new.
   */
  if (!out.difficulty) out.difficulty = DEFAULT_DIFFICULTY;
  return out;
}

/** One-line summary for the slot card. */
export function describeSlot(data) {
  if (!data) return null;
  const p = data.player || {};
  return {
    world: p.world || 1,
    level: p.level || 1,
    gold: p.gold || 0,
    lives: p.lives ?? 3,
    maxLives: p.maxLives ?? 3,
    /** Gold lives a Potion left on the bar. Absent in saves written before them. */
    bonusLives: p.bonusLives || 0,
    savedAt: data.savedAt || 0,
    /** A finished run: the slot replays the ending instead of the road. */
    completed: !!data.completed,
    /** Which of the two roads this slot is walking. See src/game/difficulty.js. */
    difficulty: data.difficulty || DEFAULT_DIFFICULTY,
  };
}
