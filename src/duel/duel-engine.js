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
 *
 * ABILITIES ARE IDS, AND AN ID IS A THEME OVER ONE OF FOUR RULES
 * ---------------------------------------------------------------------------
 * An enemy carries ability *ids* — `swampRot`, `iceFall`, `cinderSnatch` — and
 * this file resolves each one to the base effect it is a version of before it
 * does anything with it (`baseEffectOf`). There are still exactly four rules
 * here and there always were; what changed is that the bayou's poison is
 * called swamp rot, comes up out of the ground green, and is the same rule.
 * See src/game/world-abilities.js.
 *
 * AND THERE IS ONE THING IN HERE THAT DOES NOT WAIT FOR A ROUND
 * ---------------------------------------------------------------------------
 * A world SPECIAL — the volcano, the twister, the rift — is cast once by an
 * enemy that has one, and from then on it runs on a real clock instead of on
 * turns: see `tick` and src/duel/duel-hazard.js. It is the only thing in this
 * engine that can take a life while both duellists are standing still, which
 * is exactly what it is for.
 */

import { baseEffectOf, getSpecial, SPECIAL_TIMING } from '../game/world-abilities.js';
import { createHazard } from './duel-hazard.js';

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
      /** Lives the pending poison will take when it bites. See `tickPoison`. */
      poisonAmount: 1,
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
      poisonAmount: 1,
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
  /** Why the duel stopped, when it stopped somewhere other than a shot. */
  let terminationCause = null;

  /**
   * The world special this enemy is carrying, and the landmark it turns into
   * once it is spent.
   */
  let special = getSpecial(config.enemy.special);
  let specialUsed = false;

  /**
   * EVERY LANDMARK ON THE ROAD, WHOEVER RAISED IT
   * -------------------------------------------------------------------------
   * There can be two: the enemy's permanent one and the player's one-shot. So
   * a hazard is not a single field any more, it is an entry that knows who
   * owns it and who it falls on — `{ clock, owner, target }` — and `tick` does
   * not care which is which. That is the only change the player's special
   * needed on this side: the same clock, aimed the other way.
   */
  const hazards = [];

  /**
   * The player's charged abilities, one entry per equipped slot.
   *
   * `charge` counts rounds and nothing else — not damage taken, not shots
   * fired — because the one thing every duel has exactly one of per round is a
   * round. See the tuning tables in src/game/world-abilities.js.
   */
  const abilities = (config.player.abilities || []).map((spec) => ({
    spec,
    charge: 0,
    spent: false,
  }));
  /**
   * Set by the player's mind control, and cleared by the next round that
   * resolves — see the note in `playRound`. It survives the gap between rounds
   * on purpose: the plate is live in that gap, and a charge spent there has to
   * buy something.
   */
  let forcedEnemyMove = null;

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

  /**
   * Resolve one ability against the player.
   *
   * `ability` is the id the enemy carries and `base` is the rule it stands
   * for — the log carries the id, because the screen has been showing that
   * icon since round one and it is the one that has to light up.
   */
  function applyEnemyAbility(ability, playerMove) {
    const player = sides.player;
    if (player.immune) {
      log('ability-blocked', { ability });
      return playerMove;
    }
    switch (baseEffectOf(ability)) {
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
          player.poisonAmount = 1;
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

  // --- the world special ----------------------------------------------------

  /**
   * Ask whether the enemy spends its special now.
   *
   * The SCREEN calls this between rounds rather than the engine calling it
   * inside one, and that is deliberate: raising a volcano is an event the
   * player is owed a look at, and there is nowhere inside `playRound` to put
   * two seconds of camera without either interrupting a draw or arriving after
   * the round it changed. The decision is still the engine's — the roll, the
   * timing policy and the once-per-duel rule all live here.
   *
   * @returns {object|null} the spec that was cast, for the screen to announce
   */
  function maybeCastSpecial() {
    if (over || enemyHazard() || specialUsed || !special) return null;
    const chance = round < SPECIAL_TIMING.earlyRounds
      ? SPECIAL_TIMING.earlyChance
      : SPECIAL_TIMING.lateChance;
    if (random() >= chance) return null;
    specialUsed = true;
    raiseHazard(special, 'enemy');
    log('special', { special: special.id, spec: special, owner: 'enemy' });
    return special;
  }

  /** Put a landmark on the road. `owner` raised it; it falls on the other one. */
  function raiseHazard(spec, owner) {
    const entry = {
      clock: createHazard(spec, random),
      spec,
      owner,
      target: owner === 'enemy' ? 'player' : 'enemy',
    };
    hazards.push(entry);
    return entry;
  }

  const enemyHazard = () => hazards.find((h) => h.owner === 'enemy') || null;

  /** One strike out of an eruption: it is not a shot, so no shield stops it. */
  function applyHazardStrike(entry, ev) {
    const victim = sides[entry.target];
    const hit = damage(entry.target, ev.damage, { ignoreShield: true, source: 'hazard' });
    if (ev.steal && victim.bullets > 0) {
      victim.bullets = Math.max(0, victim.bullets - ev.steal);
    }
    /**
     * The diadem is not in this. It blocks things aimed AT you — a hex, a
     * whisper, a hand in your belt — and what is falling out of the sky was
     * not aimed at anybody. The vest still works, because the vest is a
     * physical object and `damage` honours it for free.
     */
    if (ev.poisons && victim.poison === 0) {
      victim.poison = POISON_DELAY;
      victim.poisonAmount = 1;
    }
    log('hazard-strike', {
      special: entry.spec.id,
      owner: entry.owner,
      side: entry.target,
      damage: ev.damage,
      hit,
      steal: ev.steal || 0,
      lives: victim.lives,
    });
    if (checkEnd()) terminationCause = entry.owner === 'enemy' ? 'hazard' : 'ability';
  }

  /**
   * Advance the real-time half of the duel. The screen calls this once per
   * frame with the frame's own `dt`; with nothing raised it costs one branch.
   */
  function tick(dt) {
    if (over || hazards.length === 0) return;
    for (let i = hazards.length - 1; i >= 0; i--) {
      const entry = hazards[i];
      for (const ev of entry.clock.tick(dt)) {
        if (ev.type === 'strike') applyHazardStrike(entry, ev);
        else log(`hazard-${ev.type}`, { special: entry.spec.id, owner: entry.owner });
        if (over) return;
      }
      // A one-shot is done the moment it goes quiet: the mountain the player
      // called down is not part of the road, it was a favour.
      if (entry.clock.isSpent()) hazards.splice(i, 1);
    }
  }

  // --- the player's charged abilities ---------------------------------------

  /**
   * Spend a charged ability on the enemy.
   *
   * Like a thrown item, this is a FREE ACTION: it does not cost the player
   * their move, and it can be pressed while the engine is still waiting for
   * one. That is the whole shape of the feature — an ability is not a fourth
   * move competing with reload, shield and shoot, it is a thing you do *as
   * well as* one of them, which is what makes the timing interesting rather
   * than just expensive.
   *
   * @param {string} itemId the equipped item's id
   * @returns {{ok: boolean, reason?: string, spec?: object}}
   */
  function useAbility(itemId) {
    if (over) return { ok: false, reason: 'The fight is over.' };
    const slot = abilities.find((a) => a.spec.itemId === itemId);
    if (!slot) return { ok: false, reason: 'Not in hand.' };
    if (slot.spent) return { ok: false, reason: 'Already spent this duel.' };
    if (slot.charge < slot.spec.charge) return { ok: false, reason: 'Still charging.' };

    const spec = slot.spec;
    slot.charge = 0;
    if (spec.kind === 'special') {
      // Once per duel, like the enemy's — and for the same reason: a landmark
      // that can be called twice is not a landmark, it is a weapon.
      slot.spent = true;
      raiseHazard({ ...spec, id: spec.id }, 'player');
      log('player-special', { special: spec.id, spec, owner: 'player' });
      return { ok: true, spec };
    }

    applyPlayerBasic(spec);
    log('player-ability', { ability: spec.id, spec, side: 'enemy' });
    checkEnd();
    return { ok: true, spec };
  }

  /** The four base effects, aimed at the enemy for once. */
  function applyPlayerBasic(spec) {
    const enemy = sides.enemy;
    switch (spec.base) {
      case 'bulletSteal': {
        const taken = Math.min(enemy.bullets, spec.amount || 1);
        enemy.bullets -= taken;
        if (spec.take) {
          sides.player.bullets = Math.min(MAX_BULLETS, sides.player.bullets + Math.min(taken, spec.take));
        }
        break;
      }
      case 'poison':
        if (enemy.poison === 0) {
          enemy.poison = spec.delay || POISON_DELAY;
          enemy.poisonAmount = spec.amount || 1;
        }
        break;
      case 'dynamite':
        damage('enemy', spec.amount || 1, { ignoreShield: true, source: 'ability' });
        break;
      case 'mindControl':
        // Their hand goes to the wrong thing. Set for this round only; see the
        // note in src/game/world-abilities.js on why it is a forced move and
        // not the scramble the enemy's version uses.
        forcedEnemyMove = MOVES.RELOAD;
        break;
      default:
        break;
    }
  }

  /** Charge state for the screen's meters. */
  function getAbilityState() {
    return abilities.map((a) => ({
      itemId: a.spec.itemId,
      spec: a.spec,
      charge: Math.min(a.charge, a.spec.charge),
      cost: a.spec.charge,
      ready: !a.spent && a.charge >= a.spec.charge,
      spent: a.spent,
    }));
  }

  /** Player items used mid-duel are queued and resolved at the top of a round. */
  function useItemEffect(effect) {
    if (over) return;
    if (effect === 'dynamite') {
      damage('enemy', 1, { ignoreShield: true, source: 'dynamite' });
      log('item', { effect, side: 'player' });
    } else if (effect === 'poison') {
      if (sides.enemy.poison === 0) {
        sides.enemy.poison = POISON_DELAY;
        sides.enemy.poisonAmount = 1;
      }
      log('item', { effect, side: 'player' });
    }
    checkEnd();
  }

  /**
   * Poison ticks down a round at a time and bites once, for whatever the thing
   * that applied it was worth — `poisonAmount`, which is 1 for everything the
   * enemy and the saddlebag can do and 2 for the basin's and the Galaxy's
   * player-side rot. The countdown is the same either way, so the badge on the
   * fighter card needs no new state to read.
   */
  function tickPoison(sideId) {
    const side = sides[sideId];
    if (side.poison <= 0) return;
    side.poison -= 1;
    if (side.poison === 0) {
      damage(sideId, side.poisonAmount || 1, { ignoreShield: true, source: 'poison' });
      side.poisonAmount = 1;
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

    const [rawPlayerMove, chosenEnemyMove] = await Promise.all([
      sides.player.agent.chooseMove(publicView('player')),
      sides.enemy.agent.chooseMove(publicView('enemy')),
    ]);

    /**
     * The enemy picks its move the instant the round opens, long before the
     * player has pressed anything — so the player's mind control cannot stop
     * it being chosen, only stop it being carried out. It overrides the choice
     * after the fact, which is both the only place it can go and exactly what
     * the ability says it does: their hand goes to the wrong thing.
     *
     * IT IS CLEARED WHEN IT IS SPENT, NOT WHEN A ROUND OPENS
     * -----------------------------------------------------------------------
     * The first version reset this at the top of `playRound`, which quietly
     * threw the ability away for anybody who pressed it a beat early. An
     * ability is a free action and the plate is live during the animation
     * between rounds, so a player who charged mind control and hit Q while the
     * last round was still playing out spent the charge and got nothing —
     * silently, with no way to tell it had happened. Clearing it on use means
     * it always lands: on this round if it was set while the engine was
     * waiting, on the next one if it was set in the gap.
     */
    const enemyMove = forcedEnemyMove || chosenEnemyMove;
    forcedEnemyMove = null;

    // An item thrown from the inventory — or a rock out of an erupting
    // mountain — can end the duel while the engine is still waiting for a
    // move. Hand back a well-formed terminal resolution so the screen can
    // close the fight instead of stalling.
    if (over) {
      const resolution = makeResolution({ terminatedBy: terminationCause || 'item' });
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

    // A round has been fought, so everything in the player's hands is a round
    // closer to being worth using.
    for (const slot of abilities) {
      if (!slot.spent) slot.charge = Math.min(slot.spec.charge, slot.charge + 1);
    }

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
    // A phase that never spent its special can still spend it. One that is
    // already up stays up: the point of a landmark is that it does not care
    // whose fight it is any more.
    special = getSpecial(next.special) || special;
    over = false;
    ended = null;
    terminationCause = null;
    log('phase', { name: next.name, lives: next.lives });
  }

  return {
    playRound,
    useItemEffect,
    setEnemy,
    maybeCastSpecial,
    useAbility,
    getAbilityState,
    tick,
    getSides: () => sides,
    getRound: () => round,
    isOver: () => over,
    getResult: () => ended,
    /** Every landmark currently on the road, with the side that raised it. */
    getHazards: () => hazards,
    /** The enemy's landmark, or null — the one the countdown chip is about. */
    getHazard: () => enemyHazard()?.clock || null,
    /** The special this enemy is carrying, spent or not — the card shows it. */
    getSpecialSpec: () => special,
    MOVES,
  };
}
