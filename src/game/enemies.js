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
 *   bulletSteal  takes one bullet from the player
 *   poison       1 damage after 3 rounds, ignores shields
 *   dynamite     1 immediate damage, ignores shields
 *   mindControl  scrambles the player's chosen move for one round
 *
 * All four are blocked outright by the Anti-Effect Diadem.
 */

import { makeRng } from '../core/rng.js';
import { getWorld } from './worlds.js';
import { ARCHETYPES, getEnemySprites } from '../art/sprites-enemies.js';

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
  };
}

/**
 * Roll a regular enemy for a world.
 * @param {number} worldId
 * @param {number} seed
 */
export function generateEnemy(worldId, seed) {
  const world = getWorld(worldId);
  const rng = makeRng(seed >>> 0);
  const profile = world.enemy;

  const lives = Number(rng.weighted(profile.lives));
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
    abilities,
    isBoss: false,
    sprites,
  };
}

/** Build the world's boss (phase 1 if it has phases). */
export function generateBoss(worldId) {
  const world = getWorld(worldId);
  const cfg = world.boss;
  const phase = cfg.phases ? cfg.phases[0] : cfg;
  const { look, sprites, scale, portrait } = appearance(phase.archetype || cfg.archetype);
  return {
    name: phase.name || cfg.name,
    look,
    archetype: phase.archetype || cfg.archetype,
    lives: phase.lives,
    maxLives: phase.lives,
    bullets: phase.startBullets || 0,
    accuracy: phase.accuracy ?? cfg.accuracy,
    abilities: phase.abilities || cfg.abilities || [],
    abilityChanceMul: phase.abilityChanceMul || 1,
    isBoss: true,
    phaseIndex: 0,
    phases: cfg.phases || null,
    sprites,
    scale,
    portrait,
    /** The lines this boss says before the fight, if it has any. */
    intro: cfg.intro || null,
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
    phaseIndex: index,
    ...(look
      ? {
          look: look.look,
          archetype: phase.archetype,
          sprites: look.sprites,
          scale: look.scale,
          portrait: look.portrait,
        }
      : {}),
  };
}

export const ABILITY_LABELS = {
  bulletSteal: 'Bullet Steal',
  poison: 'Poison',
  dynamite: 'Dynamite',
  mindControl: 'Mind Control',
};
