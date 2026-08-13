/**
 * SHOOT! — The wardrobe.
 *
 * What every garment is CALLED, what it is worth saying about it, and which
 * line of the ledger has to be crossed off before it can be worn. The art
 * itself is in `src/art/sprites-wardrobe.js`; this file is the catalogue, the
 * lock, and the drawer the outfit is kept in — exactly the split the forge
 * ladder uses (`src/game/gun-tiers.js` is data, the press is in the art).
 *
 * WHERE THE LOCK COMES FROM
 * ---------------------------------------------------------------------------
 * Nowhere in here. A garment does not name its achievement — the achievement
 * names its reward (`reward: { kind: 'clothing', slot, id }` in
 * src/game/achievements.js) and this file reads the list backwards. One
 * direction, one source of truth: retune an achievement, move a reward, drop a
 * line entirely, and the wardrobe follows without anybody remembering it exists.
 *
 * WHAT AN OUTFIT IS
 * ---------------------------------------------------------------------------
 * Four ids on the profile, next to the name — device-side, outside the save
 * slots, through the same storage driver as everything else. It survives a run
 * dying, because a hat earned by beating the boss of the Basin is not something
 * to lose to a bad duel in the Flats.
 *
 * The equipped outfit is validated on every read. A profile that arrives from
 * somewhere else claiming a Starcrown, with the ledger saying otherwise, walks
 * out in the hat it started in.
 */

import { getProfile, updateProfile } from '../core/settings.js';
import { setPlayerParts, composeFighter } from '../art/sprites-character.js';
import {
  DEFAULT_OUTFIT,
  OUTFIT_SLOTS,
  hasPiece,
  normalizeOutfit,
  outfitKey,
  outfitParts,
} from '../art/sprites-wardrobe.js';
import { ACHIEVEMENTS, isUnlocked, track } from './achievements.js';

export { DEFAULT_OUTFIT, OUTFIT_SLOTS };

/** What the tabs are called, and what a slot is for. */
export const SLOT_LABELS = {
  hat: { name: 'Hat', plural: 'Hats' },
  shirt: { name: 'Shirt', plural: 'Shirts' },
  pants: { name: 'Trousers', plural: 'Trousers' },
  boots: { name: 'Boots', plural: 'Boots' },
};

/**
 * Every garment, by slot, in the order the wardrobe lists it — the default
 * first, then the earned ones roughly in the order the road hands them over.
 *
 * `name` is what it is called. `blurb` is one line about what it is, written to
 * be read on the card next to the picture, never restating the picture.
 */
export const WARDROBE = {
  hat: [
    { id: 'trail', name: 'Trail Hat', blurb: 'Sun-bleached felt with a working brim. It came with the road.' },
    { id: 'bandana', name: 'Road Agent', blurb: 'The same hat, and a kerchief up over the mouth. Nobody sees you draw.' },
    { id: 'sombrero', name: 'Prairie Sombrero', blurb: 'A brim wider than the man. The eyes stay in its shade all day.' },
    { id: 'fur', name: 'Whitecrown Ushanka', blurb: 'Pass fur, flaps down. Up there the wind is the thing that kills you.' },
    { id: 'sheriff', name: "Sheriff's Stetson", blurb: 'Pale felt, tall crown, a brass band. Somebody has to keep order.' },
    { id: 'tophat', name: "Gambler's Stovepipe", blurb: 'Silk, and a brim that has never been rained on.' },
    { id: 'horns', name: 'Basin Helm', blurb: 'Iron off the Brimstone floor, with the horns still on it.' },
    { id: 'starcrown', name: 'Starcrown', blurb: 'A circlet of void iron, and a ring of light that does not touch it.' },
  ],

  shirt: [
    { id: 'serape', name: 'Red Serape', blurb: 'Wool, one cream stripe, and every mile of the first world in it.' },
    { id: 'sheriffVest', name: 'Town Waistcoat', blurb: 'A clean shirt and a star over the heart. It means what it says.' },
    { id: 'duster', name: 'Oilskin Duster', blurb: 'Worn open, and long enough that the tails swing on the stride.' },
    { id: 'parka', name: 'Pass Parka', blurb: 'Quilted, with fur at the throat and again at the hem.' },
    { id: 'gambler', name: "Gambler's Black", blurb: 'Boiled shirt, black waistcoat, and a watch you never check.' },
    { id: 'ember', name: 'Cinder Coat', blurb: 'Char that never finished burning. The seams are still lit.' },
    { id: 'bones', name: 'Boneyard Shirt', blurb: 'Six of them are in the ground. This is what the seventh wears.' },
    { id: 'voidrobe', name: 'Horizon Cloth', blurb: 'Cut past the last horizon, with the sky still caught in the weave.' },
  ],

  pants: [
    { id: 'trail', name: 'Trail Trousers', blurb: 'Working canvas. Nothing to say about them, which is the idea.' },
    { id: 'chaps', name: 'Fringed Chaps', blurb: 'Leather over the jeans, cut long, fringed down the outside.' },
    { id: 'stripe', name: "Banker's Stripes", blurb: 'A gold seam up each leg, for a man who is carrying it.' },
    { id: 'quilted', name: 'Pass Quilting', blurb: 'Lined with pelt and turned out at the sides. Warm, and it shows.' },
    { id: 'iron', name: 'Riveted Greaves', blurb: 'Plate over the thighs. Heavy, and it looks it.' },
    { id: 'ash', name: 'Scorched Leggings', blurb: 'Basin char with the cracks still glowing through them.' },
    { id: 'star', name: 'Starfall Trousers', blurb: 'Cloth with a sky in it. The stars move when you do.' },
  ],

  boots: [
    { id: 'trail', name: 'Trail Boots', blurb: 'The pair you walked in on. They have held up.' },
    { id: 'spurs', name: 'Rowel Spurs', blurb: 'Riding boots, and a wheel of brass behind each heel.' },
    { id: 'waders', name: 'Bayou Waders', blurb: 'Up past the knee, because down there everything is.' },
    { id: 'snow', name: 'Pass Boots', blurb: 'Tall, with the fleece turned down over the top of them.' },
    { id: 'ember', name: 'Emberwelt Boots', blurb: 'The melt never stopped running out of the welt.' },
    { id: 'gilded', name: 'Gilt Boots', blurb: 'Gold from the toe to the top. Loud, and meant to be.' },
    { id: 'star', name: 'Starfall Boots', blurb: 'They leave a little light wherever they land.' },
  ],
};

const BY_ID = new Map();
for (const slot of OUTFIT_SLOTS) {
  for (const item of WARDROBE[slot]) {
    item.slot = slot;
    BY_ID.set(`${slot}:${item.id}`, item);
  }
}

/**
 * Every reward the ledger hands out, read off the achievements themselves.
 * Built once, lazily, because the two files load in either order.
 * @type {Map<string, object>|null}
 */
let requirements = null;

function requirementIndex() {
  if (requirements) return requirements;
  requirements = new Map();
  for (const def of ACHIEVEMENTS) {
    const reward = def.reward;
    if (!reward || reward.kind !== 'clothing') continue;
    const item = BY_ID.get(`${reward.slot}:${reward.id}`);
    if (!item) {
      console.warn(`[wardrobe] "${def.id}" rewards a garment that does not exist`);
      continue;
    }
    requirements.set(`${reward.slot}:${reward.id}`, def);
  }
  return requirements;
}

/** The achievement a garment is locked behind, or null if it is free. */
export function requirementFor(slot, id) {
  return requirementIndex().get(`${slot}:${id}`) || null;
}

/** The garment an achievement hands over, or null. */
export function rewardOf(achievement) {
  const reward = achievement?.reward;
  if (!reward || reward.kind !== 'clothing') return null;
  return BY_ID.get(`${reward.slot}:${reward.id}`) || null;
}

export function isOwned(slot, id) {
  if (!hasPiece(slot, id)) return false;
  const req = requirementFor(slot, id);
  return !req || isUnlocked(req.id);
}

export function findItem(slot, id) {
  return BY_ID.get(`${slot}:${id}`) || null;
}

/**
 * The wardrobe as the screen draws it: every slot, every garment, whether it
 * is owned, whether it is on, and what it is waiting for if it is not.
 */
export function getWardrobe(outfit = getOutfit()) {
  const slots = OUTFIT_SLOTS.map((slot) => {
    const items = WARDROBE[slot].map((item) => {
      const requirement = requirementFor(slot, item.id);
      return {
        ...item,
        requirement,
        owned: !requirement || isUnlocked(requirement.id),
        equipped: outfit[slot] === item.id,
      };
    });
    return {
      slot,
      label: SLOT_LABELS[slot],
      items,
      ownedCount: items.filter((i) => i.owned).length,
    };
  });
  const owned = slots.reduce((sum, s) => sum + s.ownedCount, 0);
  const total = slots.reduce((sum, s) => sum + s.items.length, 0);
  return { slots, owned, total };
}

// ---------------------------------------------------------------------------
// What is on
// ---------------------------------------------------------------------------

/**
 * The equipped outfit, with anything unknown or unearned replaced by the
 * default for that slot. Every read goes through here — a garment cannot be
 * worn out of a save file that was edited, or out of a ledger that was reset.
 */
export function getOutfit() {
  const stored = normalizeOutfit(getProfile().outfit || {});
  const out = {};
  for (const slot of OUTFIT_SLOTS) {
    out[slot] = isOwned(slot, stored[slot]) ? stored[slot] : DEFAULT_OUTFIT[slot];
  }
  return out;
}

/** Dress the rig. Everything that draws the player picks this up on its next frame. */
export function applyOutfit(outfit = getOutfit()) {
  setPlayerParts(outfitParts(outfit));
  return outfit;
}

/**
 * Save an outfit and put it on. Returns what was actually saved, which is not
 * always what was asked for — see `getOutfit`.
 */
export async function saveOutfit(outfit) {
  const worn = {};
  for (const slot of OUTFIT_SLOTS) {
    worn[slot] = isOwned(slot, outfit[slot]) ? outfit[slot] : DEFAULT_OUTFIT[slot];
  }
  await updateProfile({ outfit: worn });
  applyOutfit(worn);
  track('outfitSaved', { dressedUp: isDressedUp(worn) });
  return worn;
}

/** True if this outfit is anything other than what everybody starts in. */
export function isDressedUp(outfit) {
  return OUTFIT_SLOTS.some((slot) => outfit[slot] !== DEFAULT_OUTFIT[slot]);
}

// ---------------------------------------------------------------------------
// Trying things on
// ---------------------------------------------------------------------------

/**
 * A full animation set for an outfit that is NOT the one being worn — what the
 * mannequin on the wardrobe screen is breathing in while the player decides.
 *
 * Kept off the rig's own cache on purpose: nothing is committed until Save, and
 * the road behind the screen must not change clothes on a hover. Bounded, so a
 * long session of trying things on cannot grow without limit.
 */
const previews = new Map();
const PREVIEW_LIMIT = 24;

export function previewSprites(outfit) {
  const key = outfitKey(outfit);
  const hit = previews.get(key);
  if (hit) return hit;
  const set = composeFighter(outfitParts(outfit));
  previews.set(key, set);
  if (previews.size > PREVIEW_LIMIT) previews.delete(previews.keys().next().value);
  return set;
}

/** How many garments exist in total. */
export const TOTAL_GARMENTS = OUTFIT_SLOTS.reduce((sum, slot) => sum + WARDROBE[slot].length, 0);
