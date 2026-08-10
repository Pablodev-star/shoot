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
  /**
   * Dust Snatch — the gust, and the round it has just hooked out of the gun.
   *
   * It used to be a bullet inside a ring of grit, which is a picture of a round
   * that is perfectly safe where it is. The ability TAKES it: the curl is on
   * the left with its hook open and the brass is already outside it, which is
   * also what the cast now does on the road (see `fx` in world-abilities.js).
   */
  dustSnatch: [
    '................',
    '....zzzz........',
    '..zzEEEEz.......',
    '.zEEz...zz......',
    'zEEz......z.....',
    'zEz........z.k..',
    'zE..........kSk.',
    'zEz.........kOk.',
    'zEEz........kOk.',
    '.zEEz.......kyk.',
    '..zzEEEEz...kkk.',
    '....zzzz........',
    '........zz......',
    '.........z......',
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
  /**
   * Deep Freeze — a man sealed inside the block, not a slab falling near one.
   *
   * The old icon was weather: ice coming down, with speed lines over it. What
   * the ability actually does is stop somebody dead for two rounds, and the
   * animation now grows a shell up over the fighter — so the badge shows the
   * same thing the road does, a silhouette behind glass.
   */
  iceFall: [
    '................',
    '....kkkkkkkk....',
    '...k66666666k...',
    '..k6677777766k..',
    '..k67TTTTTT76k..',
    '..k677TccT776k..',
    '..k677rrrr776k..',
    '..k677rwwr776k..',
    '..k677TTTT776k..',
    '..k677TT.TT76k..',
    '..k677TT.TT76k..',
    '..k6788888876k..',
    '..k6788888886k..',
    '...k88888888k...',
    '....kkkkkkkk....',
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
  /**
   * Gravity Pull — the hole, and the cylinder going into it.
   *
   * A well with a lit rim rather than the rounded rectangle it used to be, and
   * the brass is drawn ON ITS WAY IN, strung out along the pull. The old icon
   * had the bullet sitting quietly beside the shape, which is a picture of two
   * objects rather than of one taking the other.
   */
  gravityPull: [
    '................',
    '.....kk==kk.....',
    '...kk=::::=kk...',
    '..k=::&&&&::=k..',
    '..k=:&&;;&&:=k..',
    '.k=::&;;;;&::=k.',
    '.k=::&;;;;&::=k.',
    '..k=:&&;;&&:=k..',
    '..k=::&&&&::=k..',
    '...kk=::::=kk...',
    '.....kk==kk.....',
    '............kk..',
    '....=......kOOk.',
    '.......=...kOOk.',
    '..........=kyyk.',
    '...........kkk..',
  ],
  /**
   * Void Mirror — the plane, and the round coming back off it.
   *
   * The badge used to be a star, from a version of this ability that was called
   * Star Rot and did something else. What it does now is send the next shot
   * back at whoever fired it, so the icon is the mirror with a round leaving it
   * the way it came — the one picture that explains the rule without a tooltip.
   */
  starRot: [
    '................',
    '...kkkkkkkkk....',
    '..k=========k...',
    '..k=:::::::=k...',
    '..k=:W:::::=k...',
    '..k=::W::::=k...',
    '..k=:::W:::=k...',
    '..k=::::W::=k...',
    '..k=:::::::=k...',
    '..k=========k...',
    '...kkkkkkkkk....',
    '................',
    '.kk.............',
    'kOOk...=........',
    '.kk.......=.....',
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
  /**
   * Dust Devil — a twister under its wall cloud, with the light winding down
   * the front of it.
   *
   * Two passes ago this was a stack of horizontal bars: every band centred on
   * the same axis, which is a diagram of a twister rather than a twister — it
   * read as a pile of plates. The pass after that leaned the bars over, which
   * fixed the axis and left the other half of the problem, because a lean is
   * not a rotation either.
   *
   * What turns is the HIGHLIGHT. There is one lit pixel run per row and it
   * walks across the funnel as the eye goes down — right, right, right, then
   * back left, then right again — which is a helix seen side on, and it is the
   * same thing the landmark's three ribbons do in
   * src/art/sprites-hazards.js. The icon and the thing on the horizon are the
   * same object drawn at two sizes, which is the whole job of an icon.
   */
  duststorm: [
    '.kkkkkkkkkkkk...',
    '.kEEEeeeeeezk...',
    '.kzeeeeeezzzk...',
    '..kzeeEeeezk....',
    '...kzeEEeezk....',
    '...kzeeEEezk....',
    '....kzeeEEzk....',
    '....kzeeEzk.....',
    '.....kzeEzk.....',
    '.....kzEezk.....',
    '.....kEezk......',
    '......kEzk......',
    '......kzEk......',
    '......kzek......',
    '...kzeeEEeezk...',
    '..z..zeezee..z..',
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
