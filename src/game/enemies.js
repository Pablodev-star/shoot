/**
 * SHOOT! — Enemy generation (Block 5a).
 *
 * Enemies are rolled from their world's profile: mostly one life early on,
 * steadily tougher and more likely to carry an ability as the worlds go by.
 * Bosses are fixed, hand-authored fights; the Galaxy boss has two phases.
 *
 * THE NAME IS THE SPRITE
 * ---------------------------------------------------------------------------
 * A world no longer carries a list of names and a bag of poncho colours to
 * roll independently. It carries a ROSTER: the archetypes that ride that
 * stretch of road, each of which is a look with its own art and its own set of
 * names (src/art/sprites-enemies.js). Rolling an enemy picks one archetype and
 * then one of that archetype's names, so "Bone Marshal" is always a skull in a
 * hat, and never a man in a green poncho who happens to have drawn that card.
 *
 * ABILITIES
 * ---------------------------------------------------------------------------
 * A rider carries ids, not rules. `abilityChance` is the odds that this one is
 * carrying anything at all — how often a rider who HAS a trick reaches for it
 * is a flat roll in the duel engine, and how often it picks that particular
 * trick out of its hand is `weight` on the ability.
 *
 * What the id resolves to is one of the fourteen mechanics in
 * src/game/world-abilities.js, wearing that world's name, icon and animation.
 * There is no separate enemy vocabulary: the swamp rot a preacher throws at
 * you is the poison you can buy in the bayou's shop, firing the same numbers.
 * Everything aimed AT the player is blocked outright by the Anti-Effect
 * Diadem; the landmarks are not, because a mountain is not aiming.
 *
 * THE SPECIAL
 * ---------------------------------------------------------------------------
 * A world also has one landmark ability, and a fraction of its riders are
 * carrying it (`specialChance`). Every boss carries its world's. Rolling it
 * here rather than at cast time means the duel screen can show it on the
 * enemy's card from the first round — nothing in this game is a surprise
 * twice — and it is the same field on a boss and on a drifter, so the engine
 * has one path.
 */

import { makeRng } from '../core/rng.js';
import { getWorld } from './worlds.js';
import { enemyGunDamage, enemyGunDamageAt, enemyRampChance } from './progression.js';
import { ARCHETYPES, getEnemySprites } from '../art/sprites-enemies.js';
import { getAbility } from './world-abilities.js';
import { OVERRIDES } from '../admin/overrides.js';
import { tuning } from './difficulty.js';

/**
 * Everything the rest of the game needs to know about one enemy's look.
 *
 * `scale` and `portrait` are almost always absent, and that is the point: a
 * fighter is drawn at the fighters' size and has no face beyond its sprite.
 * The two that carry them are the Stranger's phases — see the note on
 * `bossStranger` in src/art/sprites-enemies.js.
 */
function appearance(archetypeId, rng) {
  const archetype = ARCHETYPES[archetypeId] || ARCHETYPES.drifter;
  return {
    archetype: archetypeId,
    look: archetype.look,
    sprites: getEnemySprites(archetypeId),
    name: rng ? rng.pick(archetype.names) : archetype.names[0],
    scale: archetype.scale || 1,
    portrait: archetype.portrait || null,
    aura: archetype.aura || 0,
  };
}

/**
 * Roll a regular enemy for a world.
 *
 * `progress` is how far along that world's road this one is standing, 0 at the
 * border and 1 at the boss's door. It decides one thing: whether this rider is
 * allowed to be carrying the heavier gun (see `enemyGunDamageAt`). Half of the
 * ones past the halfway mark are, and the gun in their hand shows it.
 *
 * @param {number} worldId
 * @param {number} seed
 * @param {number} [progress] 0..1 along the world's road
 */
export function generateEnemy(worldId, seed, progress = 0) {
  const world = getWorld(worldId);
  const rng = makeRng(seed >>> 0);
  const profile = world.enemy;
  const hard = tuning();

  const rolled = Number(rng.weighted(profile.lives));
  const lives = scaleLives(rolled, hard.enemyLivesMul);
  // Rolled whether or not it can be used, so that a rider's whole hand comes
  // off one seed in one order and the road stays reproducible.
  const heavier = rng.chance(enemyRampChance());
  const abilityChance = profile.abilityChance * hard.enemyAbilityChanceMul;
  const abilities = [];
  if (rng.chance(abilityChance)) abilities.push(rng.pick(profile.abilities));
  // Late worlds can roll a second ability.
  if (worldId >= 4 && rng.chance(abilityChance * 0.5)) {
    const extra = rng.pick(profile.abilities);
    if (!abilities.includes(extra)) abilities.push(extra);
  }

  const { name, look, sprites, archetype } = appearance(rng.pick(profile.roster), rng);

  return applyOverrides({
    name,
    look,
    archetype,
    lives,
    maxLives: lives,
    /**
     * What this rider would have carried on the ordinary road, kept so the
     * purse can be paid on it. See `baseLives` in the note above `scaleLives`.
     */
    baseLives: rolled,
    bullets: 0,
    accuracy: profile.accuracy + hard.enemyAccuracyBonus,
    gunDamage: enemyGunDamageAt(worldId, progress, heavier),
    abilities,
    abilityChanceMul: hard.enemyCastMul,
    /** The world's landmark ability, if this one happens to be carrying it. */
    special: rng.chance((profile.specialChance || 0) * hard.enemySpecialChanceMul)
      ? profile.special || null
      : null,
    isBoss: false,
    sprites,
  });
}

/**
 * A LIFE TOTAL BENT BY THE MODE, AND A LIFE TOTAL THE PURSE IS PAID ON
 * ---------------------------------------------------------------------------
 * `goldForEnemy` and `expForEnemy` measure a kill in RIDERS — this one's life
 * total over what a standard rider of that world carries (see `riderWeight` in
 * src/game/progression.js). That is exactly the right shape, and it has one
 * consequence nobody wants here: scale every rider up by a quarter and the
 * whole economy scales up by a quarter with it, so the hard road would pay for
 * its own difficulty and the forge ladder would be finished a world early.
 *
 * So a rider carries two numbers. `lives` is what you have to shoot through and
 * `baseLives` is what the road pays out on, and the two are the same on the
 * ordinary road because the multiplier is one. Nothing else in the game knows
 * the difference: `resolveDuel` is the only reader, and the duel engine fights
 * the bar that is actually in front of it.
 *
 * AND IT ROUNDS DOWN, WHICH IS THE DIFFERENCE BETWEEN HARD AND IMPOSSIBLE
 * ---------------------------------------------------------------------------
 * Every life figure in the game lands on the half-diamond grid, and on the
 * shallow end of the road that grid is COARSE — src/game/progression.js has the
 * same note over `toHalfDown` and it is the same trap. A Dust Flats rider
 * carries one diamond; a quarter more of one, rounded to nearest, is one and a
 * half. That is not "a quarter tougher", it is a fifty per cent longer fight
 * against a gun that does half a life, on the shallowest bar the game ever has
 * — measured, it took a world-one duel from a third of the bar to fifty-five
 * per cent and ended ninety-five per cent of all hard runs in the first world.
 *
 * Rounding DOWN puts the error on the player's side at exactly the point where
 * the grid is coarsest. The opening world comes out untouched, the Prairie
 * gains half a diamond, and by the Galaxy — where a diamond is a twelfth of a
 * rider rather than the whole of one — the multiplier lands almost exactly
 * where it says it does. The mode gets harder as the numbers get big enough to
 * express it, which is the only place it can afford to.
 */
function scaleLives(lives, mul) {
  if (mul === 1) return lives;
  return Math.max(0.5, Math.floor(lives * mul * 2) / 2);
}

/**
 * The admin's hand on the rider, applied after the roll rather than instead of
 * it.
 *
 * That order is the whole design: the world's own distribution still runs, the
 * seed still produces the road it was going to produce, and what a tester has
 * changed is a named field on top — so turning one dial does not silently
 * resequence everything downstream of the rng. Every field defaults to "leave
 * it alone" (see src/admin/overrides.js), and a bent rider is otherwise an
 * ordinary rider: nothing else in the game asks where its numbers came from.
 */
function applyOverrides(enemy) {
  const o = OVERRIDES.enemy;
  const out = { ...enemy };
  if (o.lives != null) {
    out.lives = o.lives;
    out.maxLives = o.lives;
  }
  if (o.accuracy != null) out.accuracy = o.accuracy;
  if (o.gunDamage != null) out.gunDamage = o.gunDamage;
  if (o.abilities) out.abilities = [...o.abilities];
  if (o.special !== undefined) out.special = o.special;
  if (o.abilityChanceMul !== 1) out.abilityChanceMul = (out.abilityChanceMul || 1) * o.abilityChanceMul;
  if (o.archetype) {
    const look = appearance(o.archetype);
    out.archetype = o.archetype;
    out.look = look.look;
    out.sprites = look.sprites;
    out.scale = look.scale;
    out.portrait = look.portrait;
    out.aura = look.aura;
    out.name = look.name;
  }
  if (o.name) out.name = o.name;
  return out;
}

/**
 * Build one enemy from a description rather than from a world.
 *
 * This is what the Admin Panel's custom battle hands the duel screen: the same
 * object shape `generateEnemy` produces, assembled from a form instead of from
 * a seed. It goes through `appearance` like everything else, so a made-up
 * fighter is drawn, named and scaled by the same rules as a rolled one — a
 * sandbox opponent that renders differently from a real one is a sandbox that
 * cannot be used to test rendering.
 *
 * @param {object} spec
 * @returns {object} an enemy the duel engine will accept
 */
export function customEnemy(spec = {}) {
  const archetypeId = ARCHETYPES[spec.archetype] ? spec.archetype : 'drifter';
  const { look, sprites, scale, portrait, aura, name } = appearance(archetypeId);
  const lives = Math.max(0.5, Number(spec.lives) || 1);
  return {
    name: spec.name || name,
    look,
    archetype: archetypeId,
    lives,
    maxLives: lives,
    bullets: Math.max(0, Number(spec.bullets) || 0),
    accuracy: spec.accuracy ?? 0.5,
    gunDamage: spec.gunDamage ?? 0.5,
    abilities: [...(spec.abilities || [])],
    abilityChanceMul: spec.abilityChanceMul ?? 1,
    special: spec.special || null,
    isBoss: !!spec.isBoss,
    phaseIndex: 0,
    phases: null,
    sprites,
    scale,
    portrait,
    aura,
    intro: null,
    cardSub: spec.cardSub || null,
  };
}

/** Build the world's boss (phase 1 if it has phases). */
export function generateBoss(worldId) {
  const world = getWorld(worldId);
  const cfg = world.boss;
  const phase = cfg.phases ? cfg.phases[0] : cfg;
  const hard = tuning();
  const lives = scaleLives(phase.lives, hard.bossLivesMul);
  const { look, sprites, scale, portrait, aura } = appearance(phase.archetype || cfg.archetype);
  return applyOverrides({
    name: phase.name || cfg.name,
    look,
    archetype: phase.archetype || cfg.archetype,
    lives,
    maxLives: lives,
    /** What the purse is paid on, whatever the mode put in front of you. */
    baseLives: phase.lives,
    bullets: phase.startBullets || 0,
    accuracy: (phase.accuracy ?? cfg.accuracy) + hard.enemyAccuracyBonus,
    /**
     * A boss carries its world's ORDINARY bullet, not the ramped one.
     *
     * It had the heavy one for a while, on the reasoning that a boss stands at
     * the end of the road and everything else out there is ramped. That
     * reasoning is fine and the arithmetic is not: the ramp is a flat half a
     * life, so what it costs depends entirely on how deep the bar is, and a
     * boss fight is the longest fight in its world. On the Dust Flats bar it
     * took Big Jed from six hits to three and turned the tutorial boss into a
     * quarter of all deaths in the game. The rider ramp is a spike inside a
     * five-round fight; the same spike inside a ten-round one is a wall.
     */
    gunDamage: enemyGunDamage(worldId),
    abilities: phase.abilities || cfg.abilities || [],
    abilityChanceMul: (phase.abilityChanceMul || 1) * hard.enemyCastMul,
    /** A boss always has its world's special. It is the fight's centrepiece. */
    special: phase.special || cfg.special || null,
    isBoss: true,
    phaseIndex: 0,
    phases: cfg.phases || null,
    sprites,
    scale,
    portrait,
    aura,
    /** The lines this boss says before the fight, if it has any. */
    intro: cfg.intro || null,
    /** Second line of the name card the entrance puts up. */
    cardSub: cfg.cardSub || null,
  });
}

/** Advance a multi-phase boss. Returns null when there is no next phase. */
export function nextBossPhase(boss) {
  if (!boss.phases) return null;
  const index = boss.phaseIndex + 1;
  if (index >= boss.phases.length) return null;
  const phase = boss.phases[index];
  // A phase with its own archetype is a different-looking fight, which is the
  // whole point of the Stranger taking the cloak off — and it can be a
  // different *size*, which is the point of him growing when he does.
  const look = phase.archetype ? appearance(phase.archetype) : null;
  const hard = tuning();
  const lives = scaleLives(phase.lives, hard.bossLivesMul);
  return {
    ...boss,
    name: phase.name,
    lives,
    maxLives: lives,
    baseLives: phase.lives,
    bullets: phase.startBullets || 0,
    accuracy: phase.accuracy + hard.enemyAccuracyBonus,
    abilities: phase.abilities || boss.abilities,
    abilityChanceMul: (phase.abilityChanceMul || 1) * hard.enemyCastMul,
    special: phase.special || boss.special || null,
    phaseIndex: index,
    ...(look
      ? {
          look: look.look,
          archetype: phase.archetype,
          sprites: look.sprites,
          scale: look.scale,
          portrait: look.portrait,
          aura: look.aura,
        }
      : {}),
  };
}

/**
 * Ability id → the name it goes by. It comes out of the catalogue rather than
 * being listed twice: "poison" in the bayou is called swamp rot, and the one
 * place that decides is src/game/world-abilities.js.
 */
export function abilityLabel(id) {
  return getAbility(id).label;
}

/** Ability id → the sentence that explains it to somebody who hovers it. */
export function abilityTip(id) {
  return getAbility(id).tip;
}
