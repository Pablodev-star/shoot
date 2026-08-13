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
import { enemyGunDamage, enemyGunDamageAt, ENEMY_DAMAGE_RAMP_CHANCE } from './progression.js';
import { ARCHETYPES, getEnemySprites } from '../art/sprites-enemies.js';
import { getAbility } from './world-abilities.js';

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

  const lives = Number(rng.weighted(profile.lives));
  // Rolled whether or not it can be used, so that a rider's whole hand comes
  // off one seed in one order and the road stays reproducible.
  const heavier = rng.chance(ENEMY_DAMAGE_RAMP_CHANCE);
  const abilities = [];
  if (rng.chance(profile.abilityChance)) abilities.push(rng.pick(profile.abilities));
  // Late worlds can roll a second ability.
  if (worldId >= 4 && rng.chance(profile.abilityChance * 0.5)) {
    const extra = rng.pick(profile.abilities);
    if (!abilities.includes(extra)) abilities.push(extra);
  }

  const { name, look, sprites, archetype } = appearance(rng.pick(profile.roster), rng);

  return {
    name,
    look,
    archetype,
    lives,
    maxLives: lives,
    bullets: 0,
    accuracy: profile.accuracy,
    gunDamage: enemyGunDamageAt(worldId, progress, heavier),
    abilities,
    /** The world's landmark ability, if this one happens to be carrying it. */
    special: rng.chance(profile.specialChance || 0) ? profile.special || null : null,
    isBoss: false,
    sprites,
  };
}

/** Build the world's boss (phase 1 if it has phases). */
export function generateBoss(worldId) {
  const world = getWorld(worldId);
  const cfg = world.boss;
  const phase = cfg.phases ? cfg.phases[0] : cfg;
  const { look, sprites, scale, portrait, aura } = appearance(phase.archetype || cfg.archetype);
  return {
    name: phase.name || cfg.name,
    look,
    archetype: phase.archetype || cfg.archetype,
    lives: phase.lives,
    maxLives: phase.lives,
    bullets: phase.startBullets || 0,
    accuracy: phase.accuracy ?? cfg.accuracy,
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
    abilityChanceMul: phase.abilityChanceMul || 1,
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
  };
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
  return {
    ...boss,
    name: phase.name,
    lives: phase.lives,
    maxLives: phase.lives,
    bullets: phase.startBullets || 0,
    accuracy: phase.accuracy,
    abilities: phase.abilities || boss.abilities,
    abilityChanceMul: phase.abilityChanceMul || 1,
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
