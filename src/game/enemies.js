/**
 * SHOOT! — Enemy generation (Block 5a).
 *
 * Enemies are rolled from their world's profile: mostly one life early on,
 * steadily tougher and more likely to carry an ability as the worlds go by.
 * Bosses are fixed, hand-authored fights; the Galaxy boss has two phases.
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
import { PALETTE } from '../art/palette.js';
import { bakeEnemyVariant } from '../art/sprites-character.js';

/** Poncho colour sets so enemies are visually distinct from the player. */
const OUTFITS = [
  { light: '#6f7f9a', mid: '#47566f', dark: '#2b3648' },
  { light: '#8a6f4a', mid: '#5e4a2f', dark: '#3b2d1a' },
  { light: '#7c9a6a', mid: '#4f6b3f', dark: '#2f4227' },
  { light: '#9a6a86', mid: '#6b4258', dark: '#432838' },
  { light: '#a08a4a', mid: '#6f5c2c', dark: '#463819' },
];

const BOSS_OUTFIT = { light: PALETTE.purple, mid: PALETTE.purpleDark, dark: '#2a1145' };

const spriteCache = new Map();

function spritesFor(key, outfit) {
  if (!spriteCache.has(key)) {
    spriteCache.set(key, bakeEnemyVariant(outfit.light, outfit.mid, outfit.dark));
  }
  return spriteCache.get(key);
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

  const outfitIndex = rng.int(0, OUTFITS.length - 1);
  const name = rng.pick(profile.names);

  return {
    name,
    lives,
    maxLives: lives,
    bullets: 0,
    accuracy: profile.accuracy,
    abilities,
    isBoss: false,
    sprites: spritesFor(`enemy${outfitIndex}`, OUTFITS[outfitIndex]),
  };
}

/** Build the world's boss (phase 1 if it has phases). */
export function generateBoss(worldId) {
  const world = getWorld(worldId);
  const cfg = world.boss;
  const phase = cfg.phases ? cfg.phases[0] : cfg;
  return {
    name: phase.name || cfg.name,
    lives: phase.lives,
    maxLives: phase.lives,
    bullets: phase.startBullets || 0,
    accuracy: phase.accuracy ?? cfg.accuracy,
    abilities: phase.abilities || cfg.abilities || [],
    abilityChanceMul: phase.abilityChanceMul || 1,
    isBoss: true,
    phaseIndex: 0,
    phases: cfg.phases || null,
    sprites: spritesFor('boss', BOSS_OUTFIT),
  };
}

/** Advance a multi-phase boss. Returns null when there is no next phase. */
export function nextBossPhase(boss) {
  if (!boss.phases) return null;
  const index = boss.phaseIndex + 1;
  if (index >= boss.phases.length) return null;
  const phase = boss.phases[index];
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
  };
}

export const ABILITY_LABELS = {
  bulletSteal: 'Bullet Steal',
  poison: 'Poison',
  dynamite: 'Dynamite',
  mindControl: 'Mind Control',
};
