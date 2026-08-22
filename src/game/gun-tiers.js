/**
 * SHOOT! — The revolver ladder.
 *
 * Seven guns, one per forge level, and they are seven GUNS rather than one gun
 * with a number over it. A player who has paid 27,845 gold for the last rung
 * has to be able to see what they bought from across the road, in the middle
 * of a fight, without reading anything.
 *
 * WHAT A TIER IS MADE OF
 * ---------------------------------------------------------------------------
 *   shape   which silhouette the gun is cut from. Three of them, so the
 *           outline changes twice on the way up and the change is legible at
 *           16 pixels: the short trail sixgun, the long-barrelled hunter with
 *           a rib and an ejector rod, and the ported Nova frame
 *   key     what it is made of, as palette overrides on the revolver art
 *   fx      what it throws when it goes off — the flash colour, the tracer,
 *           the sparks that come off the barrel, the light it sits in, and
 *           (at the top) the stars that go round it
 *   ritual  which animation the forge plays when this tier is bought. One per
 *           rung, and no two are the same performance — see
 *           `src/shops/forge-scene.js`
 *
 * NOTHING HERE IS A MECHANIC. The damage a shot does is `gunDamageAt` in
 * `src/game/progression.js` and it is a straight half-life per rung; every
 * field below is what that half-life LOOKS like. Keeping the two apart is what
 * lets the art get wilder and wilder without the balance moving with it.
 *
 * THE LAST ONE IS DELIBERATELY TOO MUCH
 * ---------------------------------------------------------------------------
 * The Nova has a nebula burning inside the frame, three stars in orbit around
 * it, a tail of cosmic dust off the muzzle and a shockwave on every shot. That
 * is not restraint, and it is not supposed to be: it is the end of a ladder
 * that costs more than the rest of the game's shopping put together, in the
 * world the game is named after finishing in.
 */

import { PALETTE } from '../art/palette.js';

/**
 * One rung each. The index IS the gun level, so a save that has never seen a
 * forge reads tier 0 and a maxed one reads the last entry.
 */
export const GUN_TIERS = [
  {
    id: 'iron',
    name: 'Trail Iron',
    blurb: 'The gun you rode in with. Honest, and nothing more than that.',
    shape: 'sixgun',
    /** No overrides: blued steel, a brass round showing, a leather grip. */
    key: {},
    fx: {
      flash: null,
      tracer: { core: PALETTE.goldLight, tail: PALETTE.gold, dust: PALETTE.sandLight },
      spark: null,
      glow: null,
      orbit: 0,
      ring: null,
    },
    ritual: null,
  },

  {
    id: 'tempered',
    name: 'Tempered Steel',
    blurb: 'Drawn down, re-hardened and hammered true. It no longer flinches.',
    shape: 'sixgun',
    key: { g: PALETTE.grey, G: PALETTE.greyDark, o: PALETTE.gold },
    fx: {
      flash: null,
      tracer: { core: PALETTE.bone, tail: PALETTE.goldLight, dust: PALETTE.sandLight },
      spark: { color: PALETTE.goldLight, rate: 0 },
      glow: null,
      orbit: 0,
      ring: null,
    },
    ritual: 'hammer',
  },

  {
    id: 'brass',
    name: 'Brass Longbarrel',
    blurb: 'A hand-poured brass frame on a barrel three inches longer than the law likes.',
    shape: 'longbarrel',
    key: {
      g: PALETTE.gold,
      G: PALETTE.goldDark,
      o: PALETTE.bone,
      T: PALETTE.woodDark,
      t: PALETTE.wood,
    },
    fx: {
      flash: { o: PALETTE.goldLight, y: PALETTE.goldDark, r: PALETTE.gold },
      tracer: { core: PALETTE.goldLight, tail: PALETTE.gold, dust: PALETTE.sand },
      spark: { color: PALETTE.gold, rate: 0.4 },
      glow: { color: PALETTE.gold, alpha: 0.1 },
      orbit: 0,
      ring: null,
    },
    ritual: 'braze',
  },

  {
    id: 'ivory',
    name: 'Ivory Hand',
    blurb: 'Silvered, scrimshawed, and cold enough in the hand to steady it.',
    shape: 'longbarrel',
    key: {
      g: PALETTE.steel,
      G: PALETTE.grey,
      o: PALETTE.blueLight,
      T: PALETTE.bone,
      t: PALETTE.boneDark,
    },
    fx: {
      flash: { W: PALETTE.white, O: PALETTE.bone, o: PALETTE.blueLight, y: PALETTE.blue, r: PALETTE.blue },
      tracer: { core: PALETTE.white, tail: PALETTE.blueLight, dust: PALETTE.bone },
      spark: { color: PALETTE.blueLight, rate: 0.55 },
      glow: { color: PALETTE.blueLight, alpha: 0.13 },
      orbit: 0,
      ring: null,
    },
    ritual: 'quench',
  },

  {
    id: 'ember',
    name: 'Emberbore',
    blurb: 'Never fully cooled. The bore still carries the colour of the fire it was cut in.',
    shape: 'longbarrel',
    key: {
      g: PALETTE.char,
      G: PALETTE.charDark,
      o: PALETTE.magma,
      T: PALETTE.leatherDark,
      t: PALETTE.magmaDeep,
    },
    fx: {
      flash: { W: PALETTE.emberGlow, O: PALETTE.magma, o: PALETTE.magmaDeep, y: PALETTE.redDark, r: PALETTE.redDeep },
      tracer: { core: PALETTE.emberGlow, tail: PALETTE.magma, dust: PALETTE.magmaDeep },
      spark: { color: PALETTE.magma, rate: 1.1 },
      glow: { color: PALETTE.magma, alpha: 0.2 },
      orbit: 0,
      ring: { color: PALETTE.magma, hot: PALETTE.emberGlow, scale: 0.7 },
    },
    ritual: 'bellows',
  },

  {
    id: 'starfall',
    name: 'Starfall',
    blurb: 'Re-forged around something that fell. It hums when the sky is clear.',
    shape: 'nova',
    key: {
      g: PALETTE.astralDark,
      G: PALETTE.voidRockDark,
      o: PALETTE.astralLight,
      T: PALETTE.voidRock,
      t: PALETTE.astral,
    },
    fx: {
      flash: { W: PALETTE.white, O: PALETTE.astralLight, o: PALETTE.astral, y: PALETTE.astralDark, r: PALETTE.astralDark },
      tracer: { core: PALETTE.astralLight, tail: PALETTE.astral, dust: PALETTE.white },
      spark: { color: PALETTE.astralLight, rate: 1.4 },
      glow: { color: PALETTE.astral, alpha: 0.24 },
      orbit: 2,
      ring: { color: PALETTE.astral, hot: PALETTE.astralLight, scale: 0.9 },
    },
    ritual: 'runes',
  },

  {
    id: 'nova',
    name: 'The Nova',
    blurb: 'A hole in the sky, held in one hand. Nothing on this road was built to take it.',
    shape: 'nova',
    key: {
      g: PALETTE.purple,
      G: PALETTE.cosmic,
      o: PALETTE.star,
      T: PALETTE.purpleDark,
      t: PALETTE.astralLight,
    },
    fx: {
      flash: { W: PALETTE.white, O: PALETTE.astralLight, o: PALETTE.purple, y: PALETTE.purpleDark, r: PALETTE.cosmic },
      tracer: { core: PALETTE.white, tail: PALETTE.purple, dust: PALETTE.astralLight },
      spark: { color: PALETTE.star, rate: 2.4 },
      glow: { color: PALETTE.purple, alpha: 0.34 },
      /** Stars in orbit around the gun itself. Only the last rung gets them. */
      orbit: 3,
      ring: { color: PALETTE.purple, hot: PALETTE.astralLight, scale: 1.25 },
      /** The whole frame is a window onto somewhere else. */
      nebula: true,
    },
    ritual: 'nova',
  },
];

/** The tier for a gun level, clamped so an odd save can never fall off it. */
export function gunTier(level = 0) {
  const index = Math.max(0, Math.min(GUN_TIERS.length - 1, Math.round(level) || 0));
  return GUN_TIERS[index];
}

// ---------------------------------------------------------------------------
// THE OTHER SIDE OF THE ROAD
// ---------------------------------------------------------------------------

/**
 * WHAT A RIDER IS CARRYING, AND WHY YOU CAN SEE IT
 * ---------------------------------------------------------------------------
 * A rider's bullet is worth half a life in the Dust Flats and three and a half
 * in the Galaxy, and it steps up twice inside every world (see
 * `enemyGunDamageAt` in src/game/progression.js). That is the single most
 * important number in any fight and it used to be completely invisible: every
 * enemy in the game held the same blued sixgun, and the only way to learn that
 * this one hits twice as hard as the last one was to be hit by it.
 *
 * So the gun is the tell. Seven rungs, one per half-life, and no two next to
 * each other look alike — the silhouette changes twice on the way up and the
 * metal changes on every rung that the silhouette does not. A player who has
 * played two worlds can read "that one is carrying a longbarrel" from across
 * the road and knows to shield instead of trade.
 *
 * These are deliberately NOT the player's tiers. The forge ladder is the thing
 * the run's money is spent on and it earns its fireworks; a rider's gun is a
 * threat readout. Same shapes and the same four metals, no glow, no orbit, no
 * nebula.
 */
/**
 * Seven rungs, and one world each — the Dust Flats carry the first and the
 * Galaxy carries the last (`enemyGunDamage` in src/game/progression.js). The
 * `name` is not decoration: the duel card names what the man across the road is
 * holding and what it costs, so the silhouette in his hand and the number on
 * the card are two readings of the same fact.
 */
export const ENEMY_GUNS = [
  { damage: 0.5, shape: 'sixgun', finish: 'steel', name: 'Trail Sixgun' },
  { damage: 1, shape: 'sixgun', finish: 'brass', name: 'Brass Sixgun' },
  { damage: 1.5, shape: 'longbarrel', finish: 'steel', name: 'Steel Longbarrel' },
  { damage: 2, shape: 'longbarrel', finish: 'brass', name: 'Brass Longbarrel' },
  { damage: 2.5, shape: 'longbarrel', finish: 'bone', name: 'Bone Longbarrel' },
  { damage: 3, shape: 'nova', finish: 'bone', name: 'Bone Nova' },
  { damage: 3.5, shape: 'nova', finish: 'void', name: 'Void Nova' },
];

/**
 * The gun that goes with a rider's bullet.
 *
 * The ladder tops out and the bullet does not: a hard-road rider past halfway
 * in the Galaxy is carrying four and a half lives a shot, which is off the end
 * of this list. He holds the Void Nova, which is the honest answer — there is
 * no eighth silhouette, and the card beside him prints what it actually costs.
 *
 * @param {number} damage what one of their shots costs you
 * @returns {{damage:number, shape:string, finish:string, name:string}}
 */
export function enemyGunLook(damage = 0.5) {
  const rung = Math.round((Number(damage) || 0.5) / 0.5) - 1;
  return ENEMY_GUNS[Math.max(0, Math.min(ENEMY_GUNS.length - 1, rung))];
}
