/**
 * SHOOT! — Duel engine (Block 5b).
 *
 * THE RULES (unchanged since the very first prototype):
 *
 *   RELOAD  +1 bullet. You are VULNERABLE this turn.
 *   SHIELD  bullets unchanged. You are PROTECTED this turn.
 *   SHOOT   costs 1 bullet. You are VULNERABLE this turn.
 *             · rival vulnerable → rival loses 1 life
 *             · rival protected  → nothing happens, the bullet is spent
 *
 *   Both shoot in the same turn → both lose a life.
 *   First to zero lives loses the duel.
 *
 * AGENTS
 * ---------------------------------------------------------------------------
 * The engine never reads input and never draws. Each side is an *agent*:
 *
 *   { chooseMove(publicView): Promise<'reload'|'shield'|'shoot'> }
 *
 * The story mode passes a local UI agent and an AI agent. The future online
 * mode passes the same UI agent and a remote agent that resolves when the
 * opponent's move arrives over the network — the engine does not change.
 *
 * MODIFIERS
 * ---------------------------------------------------------------------------
 * `modifiers` comes from weather and the time of day:
 *   misfireChance          both sides may misfire (wet powder in the rain)
 *   enemyAccuracyPenalty   the AI reads you less reliably (sandstorm, night)
 */

export const MOVES = { RELOAD: 'reload', SHIELD: 'shield', SHOOT: 'shoot' };

/** Bullets a duellist can hold at once. */
export const MAX_BULLETS = 6;
/** Rounds before poison deals its damage. */
export const POISON_DELAY = 3;

/**
 * @param {object} config
 * @param {object} config.player   { lives, maxLives, bullets, hasVest, immune }
 * @param {object} config.enemy    from src/game/enemies.js
 * @param {object} config.playerAgent
 * @param {object} config.enemyAgent
 * @param {object} [config.modifiers]
 * @param {(event: object) => void} [config.onEvent]
 * @param {() => number} [config.random] injectable RNG for tests
 */
export function createDuel(config) {
  const random = config.random || Math.random;
  const onEvent = config.onEvent || (() => {});
  const modifiers = config.modifiers || {};

  const sides = {
    player: {
      id: 'player',
      name: config.player.name || 'You',
      lives: config.player.lives,
      maxLives: config.player.maxLives,
      bullets: config.player.bullets || 0,
      hasVest: !!config.player.hasVest,
      immune: !!config.player.immune,
      poison: 0,
      pendingItem: null,
      agent: config.playerAgent,
    },
    enemy: {
      id: 'enemy',
      name: config.enemy.name,
      lives: config.enemy.lives,
      maxLives: config.enemy.maxLives,
      bullets: config.enemy.bullets || 0,
      hasVest: false,
      immune: false,
      poison: 0,
      abilities: config.enemy.abilities || [],
      abilityChanceMul: config.enemy.abilityChanceMul || 1,
      accuracy: config.enemy.accuracy ?? 0.5,
      agent: config.enemyAgent,
    },
  };

  let round = 0;
  let over = false;
  let ended = null;
  /** Set when an enemy ability damaged the player during the current round. */
  let abilityHitPlayer = false;

  /** What agents are allowed to see. Both sides get the same shape. */
  function publicView(selfId) {
    const self = sides[selfId];
    const foe = sides[selfId === 'player' ? 'enemy' : 'player'];
    return {
      round,
      self: { lives: self.lives, bullets: self.bullets, poison: self.poison },
      foe: { lives: foe.lives, bullets: foe.bullets, poison: foe.poison },
      modifiers,
    };
  }

  function log(type, payload) {
    onEvent({ type, round, ...payload });
  }

  /** Apply damage, honouring shields unless the source ignores them. */
  function damage(sideId, amount, { ignoreShield = false, protectedNow = false, source = 'shot' } = {}) {
    const side = sides[sideId];
    if (!ignoreShield && protectedNow) return false;
    if (side.hasVest && side.lives - amount <= 0) {
      side.hasVest = false;
      log('vest', { side: sideId });
      return false;
    }
    side.lives = Math.max(0, side.lives - amount);
    log('damage', { side: sideId, amount, source, lives: side.lives });
    return true;
  }

  /**
   * The enemy's ability roll for this round, resolved before moves are locked
   * in so mind control can actually scramble the player's choice.
   */
  function rollEnemyAbility() {
    const enemy = sides.enemy;
    if (!enemy.abilities || enemy.abilities.length === 0) return null;
    const chance = 0.18 * enemy.abilityChanceMul;
    if (random() >= chance) return null;
    return enemy.abilities[Math.floor(random() * enemy.abilities.length)];
  }

  function applyEnemyAbility(ability, playerMove) {
    const player = sides.player;
    if (player.immune) {
      log('ability-blocked', { ability });
      return playerMove;
    }
    switch (ability) {
      case 'bulletSteal': {
        if (player.bullets > 0) {
          player.bullets -= 1;
          sides.enemy.bullets = Math.min(MAX_BULLETS, sides.enemy.bullets + 1);
          log('ability', { ability, side: 'enemy' });
        }
        return playerMove;
      }
      case 'poison': {
        if (player.poison === 0) {
          player.poison = POISON_DELAY;
          log('ability', { ability, side: 'enemy' });
        }
        return playerMove;
      }
      case 'dynamite': {
        abilityHitPlayer = damage('player', 1, { ignoreShield: true, source: 'dynamite' });
        log('ability', { ability, side: 'enemy' });
        return playerMove;
      }
      case 'mindControl': {
        const options = [MOVES.RELOAD, MOVES.SHIELD, MOVES.SHOOT];
        const scrambled = options[Math.floor(random() * options.length)];
        log('ability', { ability, side: 'enemy', from: playerMove, to: scrambled });
        return scrambled;
      }
      default:
        return playerMove;
    }
  }

  /** Player items used mid-duel are queued and resolved at the top of a round. */
  function useItemEffect(effect) {
    if (over) return;
    if (effect === 'dynamite') {
      damage('enemy', 1, { ignoreShield: true, source: 'dynamite' });
      log('item', { effect, side: 'player' });
    } else if (effect === 'poison') {
      if (sides.enemy.poison === 0) sides.enemy.poison = POISON_DELAY;
      log('item', { effect, side: 'player' });
    }
    checkEnd();
  }

  function tickPoison(sideId) {
    const side = sides[sideId];
    if (side.poison <= 0) return;
    side.poison -= 1;
    if (side.poison === 0) {
      damage(sideId, 1, { ignoreShield: true, source: 'poison' });
    }
  }

  function normalise(side, move) {
    if (move === MOVES.SHOOT && side.bullets <= 0) {
      log('dryfire', { side: side.id });
      return { move: MOVES.SHOOT, dry: true };
    }
    return { move, dry: false };
  }

  function checkEnd() {
    if (sides.player.lives <= 0 || sides.enemy.lives <= 0) {
      over = true;
      const playerDead = sides.player.lives <= 0;
      const enemyDead = sides.enemy.lives <= 0;
      // Simultaneous knockout: the challenger (player) loses the tie, exactly
      // as in every previous version of the game.
      ended = { winner: playerDead ? 'enemy' : enemyDead ? 'player' : null, rounds: round };
    }
    return over;
  }

  /**
   * Every resolution the engine hands back has the same shape, including the
   * ones where the round ended early (an ability or a thrown item finished the
   * duel before moves could resolve). The UI reads these fields unconditionally,
   * so a partial object would crash the animation.
   */
  function makeResolution(extra = {}) {
    return {
      round,
      ability: null,
      playerMove: null,
      enemyMove: null,
      playerDry: false,
      enemyDry: false,
      playerMisfired: false,
      enemyMisfired: false,
      playerFires: false,
      enemyFires: false,
      hits: { player: false, enemy: false },
      lives: { player: sides.player.lives, enemy: sides.enemy.lives },
      bullets: { player: sides.player.bullets, enemy: sides.enemy.bullets },
      ended,
      /** Set when the round did not play out normally. */
      terminatedBy: null,
      ...extra,
    };
  }

  /** Play one full round. Returns the resolution for the UI to animate. */
  async function playRound() {
    if (over) return null;
    round += 1;

    const ability = rollEnemyAbility();
    abilityHitPlayer = false;

    const [rawPlayerMove, enemyMove] = await Promise.all([
      sides.player.agent.chooseMove(publicView('player')),
      sides.enemy.agent.chooseMove(publicView('enemy')),
    ]);

    // An item thrown from the inventory can end the duel while the engine is
    // still waiting for a move. Hand back a well-formed terminal resolution so
    // the screen can close the fight instead of stalling.
    if (over) {
      const resolution = makeResolution({ terminatedBy: 'item' });
      log('round', resolution);
      return resolution;
    }

    let playerMove = rawPlayerMove;
    if (ability) playerMove = applyEnemyAbility(ability, playerMove);
    if (checkEnd()) {
      const resolution = makeResolution({
        ability,
        playerMove,
        terminatedBy: 'ability',
        hits: { player: abilityHitPlayer, enemy: false },
      });
      log('round', resolution);
      return resolution;
    }

    const p = normalise(sides.player, playerMove);
    const e = normalise(sides.enemy, enemyMove);

    // --- resolve bullets ---------------------------------------------------
    if (p.move === MOVES.RELOAD) sides.player.bullets = Math.min(MAX_BULLETS, sides.player.bullets + 1);
    if (e.move === MOVES.RELOAD) sides.enemy.bullets = Math.min(MAX_BULLETS, sides.enemy.bullets + 1);
    if (p.move === MOVES.SHOOT && !p.dry) sides.player.bullets -= 1;
    if (e.move === MOVES.SHOOT && !e.dry) sides.enemy.bullets -= 1;

    // --- misfires (rain) ---------------------------------------------------
    const misfire = modifiers.misfireChance || 0;
    const playerMisfired = p.move === MOVES.SHOOT && !p.dry && random() < misfire;
    const enemyMisfired = e.move === MOVES.SHOOT && !e.dry && random() < misfire;
    if (playerMisfired) log('misfire', { side: 'player' });
    if (enemyMisfired) log('misfire', { side: 'enemy' });

    // --- resolve shots -----------------------------------------------------
    const playerFires = p.move === MOVES.SHOOT && !p.dry && !playerMisfired;
    const enemyFires = e.move === MOVES.SHOOT && !e.dry && !enemyMisfired;
    const playerProtected = p.move === MOVES.SHIELD;
    const enemyProtected = e.move === MOVES.SHIELD;

    const hits = { player: false, enemy: false };
    if (playerFires) hits.enemy = damage('enemy', 1, { protectedNow: enemyProtected });
    if (enemyFires) hits.player = damage('player', 1, { protectedNow: playerProtected });

    // --- poison ticks ------------------------------------------------------
    tickPoison('player');
    tickPoison('enemy');

    checkEnd();

    const resolution = {
      round,
      ability,
      playerMove: p.move,
      enemyMove: e.move,
      playerDry: p.dry,
      enemyDry: e.dry,
      playerMisfired,
      enemyMisfired,
      playerFires,
      enemyFires,
      hits,
      lives: { player: sides.player.lives, enemy: sides.enemy.lives },
      bullets: { player: sides.player.bullets, enemy: sides.enemy.bullets },
      ended,
    };
    log('round', resolution);
    return resolution;
  }

  /**
   * Swap the enemy in without ending the duel — used for the Galaxy boss's
   * second phase. The player's bullets and lives carry over.
   *
   * Pass `agent` to install a controller built for the new stats: without it
   * the incoming phase would keep playing with the previous phase's accuracy
   * and move history.
   */
  function setEnemy(next, agent) {
    Object.assign(sides.enemy, {
      name: next.name,
      lives: next.lives,
      maxLives: next.maxLives,
      bullets: next.bullets || 0,
      accuracy: next.accuracy,
      abilities: next.abilities || [],
      abilityChanceMul: next.abilityChanceMul || 1,
      poison: 0,
      agent: agent || sides.enemy.agent,
    });
    over = false;
    ended = null;
    log('phase', { name: next.name, lives: next.lives });
  }

  return {
    playRound,
    useItemEffect,
    setEnemy,
    getSides: () => sides,
    getRound: () => round,
    isOver: () => over,
    getResult: () => ended,
    MOVES,
  };
}
