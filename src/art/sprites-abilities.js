/**
 * SHOOT! — Ability icons.
 *
 * One 16 x 16 icon for every themed ability and every world special in
 * src/game/world-abilities.js, drawn to exactly the rules the item icons in
 * src/art/sprites-items.js follow: the same canvas, the same 1px ink outline,
 * the same light from the top left. They are merged into that file's icon set
 * at bake time rather than living in a set of their own, so `icon('emberBite')`
 * works the same way `icon('coin')` always has and there is one cache.
 *
 * WHY THEY ARE NOT JUST THE FOUR OLD ICONS RECOLOURED
 * ---------------------------------------------------------------------------
 * Because the point of a themed ability is that the player recognises the
 * *world* in it before they read anything. A green flask says "poison" in all
 * six worlds and says nothing else; a hornet, a frost crystal, a lungful of
 * marsh gas and an ember under a collar all cost the same life three rounds
 * later, and each one tells you where you are standing while it does it.
 *
 * The pairs are drawn to be told apart at a glance in the duel's tiny badge:
 * anything that steals a round has BRASS in it, anything that poisons is built
 * around a single organic shape, anything that ignores your shield is drawn
 * falling or bursting, and anything that takes your move is drawn around a
 * head. That is the second reading, under the world colour.
 *
 * The colour key is the one from sprites-items.js extended with the ramps the
 * last four biomes are drawn in — and extended with the SAME characters those
 * biomes use in src/art/env-kit.js, because one letter meaning one colour is a
 * rule that only pays if it holds across files.
 */

import { PALETTE } from './palette.js';

/**
 * Characters sprites-items.js does not use, carrying the biome ramps. Merged
 * into that file's key; a clash would be a bug, so nothing here re-uses a
 * letter it already has.
 */
export const ABILITY_KEY = {
  // Molten rock and brimstone
  '<': PALETTE.magma,
  '>': PALETTE.magmaDeep,
  '~': PALETTE.emberGlow,
  '^': PALETTE.charLight,
  '%': PALETTE.char,
  $: PALETTE.charDark,
  '#': PALETTE.sulfur,
  '@': PALETTE.sulfurLight,
  // Snow, then ice
  1: PALETTE.snowLight,
  2: PALETTE.snow,
  3: PALETTE.snowMid,
  4: PALETTE.snowShade,
  5: PALETTE.snowDeep,
  6: PALETTE.iceLight,
  7: PALETTE.ice,
  8: PALETTE.iceDark,
  // Grass
  h: PALETTE.grassLight,
  H: PALETTE.grass,
  J: PALETTE.grassDark,
  // Bog water and what grows on it
  F: PALETTE.bogLight,
  I: PALETTE.bog,
  L: PALETTE.bogDark,
  Q: PALETTE.bogDeep,
  A: PALETTE.algae,
  V: PALETTE.lichen,
  // Void stone and the light in it
  '!': PALETTE.voidRockLight,
  '?': PALETTE.voidRock,
  '&': PALETTE.voidRockDark,
  '=': PALETTE.astralLight,
  ':': PALETTE.astral,
  ';': PALETTE.astralDark,
};

/**
 * The icons. Keyed by the `icon` field of each entry in
 * src/game/world-abilities.js.
 */
export const ABILITY_ICONS = {
  // --- 1 · Dust Flats -------------------------------------------------------
  /** Dust Snatch — a round held in the middle of a spinning curl of grit. */
  dustSnatch: [
    '................',
    '....zzzz........',
    '...zEEEEz.......',
    '..zEeeeeEz......',
    '..zE....eEz.....',
    '.zEe..oo..ez....',
    '.zE..kOOk..Ez...',
    '.ze..kOOk..ez...',
    '.zE..kOOk..Ez...',
    '.zEe.kyyk.eEz...',
    '..zE.kkkk.Ez....',
    '..zEeeeeEz......',
    '...zEEEEz.......',
    '....zzzz........',
    '................',
    '................',
  ],

  /** Sand in the Eyes — an eye with a handful of the flats going into it. */
  sandBlind: [
    '................',
    '..z.............',
    '...zz...........',
    '.z..Ez..........',
    '...zzE.z........',
    '..zEz.zz........',
    '....kkkkkkkk....',
    '..kkzzEEEzzkkk..',
    '.kzEEkkkkkEEzk..',
    '.kzEkbBBBbkEzk..',
    '.kzEkbkkkbkEzk..',
    '.kzEEkkkkkEEzk..',
    '..kkzzEEEzzkkk..',
    '....kkkkkkkk....',
    '................',
    '................',
  ],

  // --- 2 · Wildgrass Prairie ------------------------------------------------
  /** Lasso Pull — a rope loop closing on a round, with the line running off. */
  lassoPull: [
    '................',
    '.....kkkk.......',
    '....kwwwwk......',
    '...kwdkkdwk.....',
    '...kwk..kwk.....',
    '..kwdk..kdwk....',
    '..kwk.kk.kwk....',
    '..kwk.kOk.kwk...',
    '..kwdkkOkkdwk...',
    '...kwwwOwwwk....',
    '....kkwywkk.....',
    '.....kkwkk......',
    '.......kwk......',
    '........kwk.....',
    '.........kk.....',
    '................',
  ],
  /** Hornet Sting — one hornet, wings out, and the sting under it. */
  hornetSting: [
    '................',
    '................',
    '..k..........k..',
    '..kk........kk..',
    '..kWk..kk..kWk..',
    '...kWkkOOkkWk...',
    '....kWkOOkWk....',
    '.....kkOOkk.....',
    '.....kkkkkk.....',
    '.....kOOOOk.....',
    '.....kkkkkk.....',
    '.....kOOOOk.....',
    '......kkkk......',
    '.......kk.......',
    '.......kk.......',
    '................',
  ],

  // --- 3 · Whitecrown Pass --------------------------------------------------
  /** Cold Grip — a round sealed inside a block of ice. */
  coldGrip: [
    '................',
    '...kkkkkkkkk....',
    '..k6666666668k..',
    '..k6777777778k..',
    '..k677kkkk778k..',
    '..k67kOOOOk78k..',
    '..k67kOOOOk78k..',
    '..k67kOOOOk78k..',
    '..k67kOOOOk78k..',
    '..k67kyyyyk78k..',
    '..k677kkkk778k..',
    '..k6777777788k..',
    '..k6788888888k..',
    '...kkkkkkkkkk...',
    '................',
    '................',
  ],
  /** Frostbite — a six-armed crystal with the middle gone black. */
  frostbite: [
    '................',
    '.......k........',
    '.....k.1.k......',
    '..k...k1k...k...',
    '...k1k111k1k....',
    '....k11111k.....',
    '.k1k1kkkkk1k1k..',
    '..k111k5k111k...',
    '.k1k1kkkkk1k1k..',
    '....k11111k.....',
    '...k1k111k1k....',
    '..k...k1k...k...',
    '.....k.1.k......',
    '.......k........',
    '................',
    '................',
  ],
  /** Ice Fall — a slab coming down, with the air lines it left above it. */
  iceFall: [
    '................',
    '..k..k....k..k..',
    '..k..k....k..k..',
    '..k..k....k..k..',
    '................',
    '.......kk.......',
    '......k11k......',
    '.....k1113k.....',
    '....k111133k....',
    '...k11133333k...',
    '..k1113333338k..',
    '.k111333333888k.',
    'k11333333888885k',
    'kkkkkkkkkkkkkkkk',
    '................',
    '................',
  ],

  // --- 4 · Blackwater Bayou -------------------------------------------------
  /** Mire Grasp — a hand out of the water with a round in its fingers. */
  mireGrasp: [
    '................',
    '.......kk.......',
    '......kOOk......',
    '.....kkOOkk.....',
    '..kk.kkOOkk.kk..',
    '.kIIkkIkkIkkIIk.',
    '.kIIkIIkkIIkIIk.',
    '.kIIIIIIIIIIIIk.',
    '..kIIIIIIIIIIk..',
    '...kIIIIIIIIk...',
    '....kIIIIIIk....',
    '.kFFkkIIIIkkFFk.',
    'kFFFFFkkkkFFFFFk',
    '.kLLLLLLLLLLLLk.',
    '..kkkkkkkkkkkk..',
    '................',
  ],
  /** Swamp Rot — a bubble of gas breaking the surface of black water. */
  swampRot: [
    '................',
    '.......kk.......',
    '......kAAk......',
    '......kAVk......',
    '.......kk.......',
    '....kkkkkkk.....',
    '...kAAAAAAAk....',
    '..kAAVVVVVAAk...',
    '..kAAVAAAVAAk...',
    '..kAAVVVVVAAk...',
    '...kAAAAAAAk....',
    '....kkkkkkk.....',
    '..kFFFFFFFFFk...',
    '..kIIIIIIIIIk...',
    '..kLLLLLLLLLk...',
    '...kkkkkkkkk....',
  ],
  /** Gas Burst — the same bubble, an instant later. */
  gasBurst: [
    '................',
    '..k....kk....k..',
    '...k..kAAk..k...',
    '....k.kAAk.k....',
    '..kAk.kkkk.kAk..',
    '...kk..AA..kk...',
    '.kAk.kAAAAk.kAk.',
    '.kkk.kAVVAk.kkk.',
    '.....kAVVAk.....',
    '.kkk.kAAAAk.kkk.',
    '.kAk..kAAk..kAk.',
    '...kk.kkkk.kk...',
    '....k.kAAk.k....',
    '...k..kAAk..k...',
    '..k....kk....k..',
    '................',
  ],
  /** Will-o'-Wisp — a cold light over the water, and its own reflection. */
  willOWisp: [
    '................',
    '.......k........',
    '......kAk.......',
    '.....kAWAk......',
    '....kAWWWAk.....',
    '....kAWWWAk.....',
    '.....kAWAk......',
    '......kAk.......',
    '.......k........',
    '................',
    '..kFFFFFFFFFk...',
    '..kIIkAAAkIIk...',
    '..kIIIkAkIIIk...',
    '..kLLLLLLLLLk...',
    '...kkkkkkkkk....',
    '................',
  ],

  // --- 5 · Brimstone Basin --------------------------------------------------
  /** Cinder Snatch — a round pulled out of the gun still glowing. */
  cinderSnatch: [
    '................',
    '.........k......',
    '....k...k<k.....',
    '...k<k.k<~<k....',
    '...k<~<k<~<k....',
    '....k<~<k<k.....',
    '.....kkkk.......',
    '.....kOOk.......',
    '....kkOOkk......',
    '...k~kOOk~k.....',
    '...k<kOOk<k.....',
    '....kkyyk.......',
    '.....kkkk.......',
    '................',
    '................',
    '................',
  ],
  /** Ember Bite — a coal with the fire still working inside it. */
  emberBite: [
    '................',
    '.........<......',
    '....<...<~<.....',
    '...<~<...<......',
    '....<...........',
    '.....kkkkk......',
    '...kk$%%%$kk....',
    '..k$%<~~~<%$k...',
    '..k%<~@@@~<%k...',
    '..k%<~@@@~<%k...',
    '..k$%<~~~<%$k...',
    '...kk$%%%$kk....',
    '.....kkkkk......',
    '................',
    '................',
    '................',
  ],
  /** Magma Spout — the ground opening, and what comes up out of it. */
  magmaSpout: [
    '................',
    '.......~........',
    '..~...k~k...~...',
    '.k~k.k<~<k.k~k..',
    '.k<k.k<~<k.k<k..',
    '..k...k<~<k.k...',
    '......k<~<k.....',
    '.....k<~~~<k....',
    '.....k<~~~<k....',
    '....k<<~~~<<k...',
    '...k$<<<<<<<$k..',
    '..k$%%$<<<$%%$k.',
    '.k%%%%%$<$%%%%%k',
    'k$$$$$$$$$$$$$$k',
    '.kkkkkkkkkkkkkk.',
    '................',
  ],
  /** Hell Whisper — a horned head, and the words coming off it. */
  hellWhisper: [
    '................',
    '..k..........k..',
    '..k$k......k$k..',
    '..k$$k....k$$k..',
    '...k$$kkkk$$k...',
    '....k$%%%%$k....',
    '...k$%%%%%%$k...',
    '..k$%<~%%~<%$k..',
    '..k$%%%%%%%%$k..',
    '..k$%%k~~k%%$k..',
    '...k$%%%%%%$k...',
    '....k$$$$$$k....',
    '.....kkkkkk.....',
    '..k.k......k.k..',
    '.k.k........k.k.',
    '................',
  ],

  // --- 6 · Galaxy -----------------------------------------------------------
  /** Gravity Pull — a round going somewhere it did not choose. */
  gravityPull: [
    '................',
    '................',
    '....kkkk........',
    '...k::::k.......',
    '..k:;;;;:k......',
    '..k:;&&;:k..kk..',
    '..k:;&&;:k.kOOk.',
    '..k:;;;;:k.kOOk.',
    '...k::::k..kOOk.',
    '....kkkk...kyyk.',
    '..=........kkkk.',
    '....=..=........',
    '.......=..=.....',
    '..........=..=..',
    '................',
    '................',
  ],
  /** Star Rot — a star with something growing through it. */
  starRot: [
    '................',
    '.......k........',
    '......k=k.......',
    '......k=k.......',
    '..k...k=k...k...',
    '...k=k=U=k=k....',
    '....k=UuU=k.....',
    '.kk==UuuuU==kk..',
    '....k=UuU=k.....',
    '...k=k=U=k=k....',
    '..k...k=k...k...',
    '......k=k.......',
    '......k=k.......',
    '.......k........',
    '................',
    '................',
  ],
  /** Meteor Strike — a rock arriving, with its own fire behind it. */
  meteorStrike: [
    '................',
    '.k..............',
    '..k=k...........',
    '...k=uk.........',
    '....k=uk...kk...',
    '.....k=uk.k!!k..',
    '......k=ukk?!k..',
    '.......k=k?&?k..',
    '........kk?&?k..',
    '.........k?&?k..',
    '.........kk?kk..',
    '..........kkk...',
    '................',
    '................',
    '................',
    '................',
  ],
  /** Mind Rift — a head with the space inside it come apart. */
  mindRift: [
    '................',
    '................',
    '.....kkkkkk.....',
    '...kkcccccckk...',
    '...kccck=kcck...',
    '...kcckk=kkck...',
    '...kck=uuu=kck..',
    '...kck=uuu=kck..',
    '...kckk=u=kkck..',
    '...kccck=kccck..',
    '....kcccccck....',
    '....kcCCCcck....',
    '.....kkkkkk.....',
    '................',
    '................',
    '................',
  ],

  // --- the six specials -----------------------------------------------------
  /** Dust Devil — the twister, seen from the road. */
  duststorm: [
    '................',
    '..kzzzzzzzzzk...',
    '...kEEEEEEEk....',
    '....kzzzzzk.....',
    '...kEEEEEEEk....',
    '....kzzzzzk.....',
    '.....kEEEk......',
    '....kzzzzzk.....',
    '.....kEEEk......',
    '......kzk.......',
    '.....kEEEk......',
    '......kzk.......',
    '......kEk.......',
    '.....kzzzk......',
    '..kkkkkkkkkkk...',
    '................',
  ],
  /** Hornet Tree — a dead cottonwood with the nest still in it. */
  hornetTree: [
    '................',
    '...kk......kk...',
    '..kMMk....kMMk..',
    '...kMMk..kMMk...',
    '....kMMkkMMk....',
    '.....kMMMMk.....',
    '....kkMMMMkk....',
    '...kOOkMMkOOk...',
    '..kOyyOkkOyyOk..',
    '..kOyyyOOyyyOk..',
    '...kOyyyyyyOk...',
    '....kOOOOOOk....',
    '.....kMMMMk.....',
    '.....kMMMMk.....',
    '..kkkkMMMMkkkk..',
    '................',
  ],
  /** Hanging Cornice — the lip of snow over the pass, already cracked. */
  cornice: [
    '................',
    '..........k.....',
    '.........k1k....',
    '........k11kk...',
    '.......k1113kk..',
    '......k111333kk.',
    '.....k11133333k.',
    '....k1113kkkkkk.',
    '...k11133k......',
    '..k1113333k.....',
    '.k111333333k....',
    'k11333333338k...',
    'k1333333388888k.',
    'k33338888888885k',
    'kkkkkkkkkkkkkkkk',
    '................',
  ],
  /** Blackdamp — the vent under the water, breathing. */
  blackdamp: [
    '................',
    '....k.....k.....',
    '...kAk...kAk....',
    '...kAk..kAAk....',
    '....k....kk.....',
    '.....kAAAk......',
    '.....kAAAk......',
    '......kkk.......',
    '..kFFFFFFFFFk...',
    '.kFIIIIIIIIIFk..',
    '.kIIkkIIkkIIIk..',
    '.kIILLIILLIIIk..',
    '.kLLLLLLLLLLLk..',
    '.kQQQQQQQQQQQk..',
    '..kkkkkkkkkkk...',
    '................',
  ],
  /** Volcano — the cone, lit, with what is running down the side of it. */
  volcano: [
    '................',
    '.......<........',
    '......<~<.......',
    '.....k<~<k......',
    '....k$~~~$k.....',
    '...k%%<~<%%k....',
    '...k%%%<%%%k....',
    '..k%%<%%%%%%k...',
    '..k%%<%%%%%%k...',
    '.k%%%<%%%%%%%k..',
    '.k%%%%<%%%%%%k..',
    'k%%%%%<%%%%%%%k.',
    'k$$$$$<$$$$$$$k.',
    'k$$$$$$$$$$$$$k.',
    '.kkkkkkkkkkkkk..',
    '................',
  ],
  /** The Rift — a tear in something that was not supposed to tear. */
  rift: [
    '................',
    '.......k........',
    '......k=k.......',
    '......k=k.......',
    '.....k=:=k......',
    '.....k=:=k......',
    '....k=:u:=k.....',
    '....k=:u:=k.....',
    '....k=:u:=k.....',
    '.....k=:=k......',
    '.....k=:=k......',
    '......k=k.......',
    '......k=k.......',
    '.......k........',
    '................',
    '................',
  ],
};
