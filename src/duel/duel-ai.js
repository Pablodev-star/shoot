/**
 * SHOOT! — Duel agents (Block 5b).
 *
 * Two implementations of the same one-method interface the engine expects:
 *
 *   { chooseMove(view): Promise<'reload'|'shield'|'shoot'> }
 *
 *   createLocalAgent()  — resolves when the player clicks a button
 *   createAiAgent()     — the story-mode opponent
 *
 * A third implementation (a remote agent that resolves when the opponent's move
 * arrives from the server) is all the online mode will need to add.
 */

import { MOVES } from './duel-engine.js';

/** Human player: the duel screen calls `submit()` from its buttons. */
export function createLocalAgent() {
  let resolver = null;
  return {
    isLocal: true,
    chooseMove() {
      return new Promise((resolve) => {
        resolver = resolve;
      });
    },
    /** True while the engine is waiting for input. */
    isWaiting: () => resolver !== null,
    submit(move) {
      if (!resolver) return false;
      const done = resolver;
      resolver = null;
      done(move);
      return true;
    },
    cancel() {
      resolver = null;
    },
  };
}

/**
 * Story-mode AI.
 *
 * It does not cheat: it cannot see the player's move for this round. Instead it
 * builds a frequency model of what the player has done so far and, with
 * probability `accuracy`, plays the counter to the player's most likely move.
 * The rest of the time it plays a sane but non-optimal weighted move.
 *
 *   counter(reload) = shoot     counter(shoot) = shield     counter(shield) = reload
 *
 * `enemyAccuracyPenalty` (sandstorm, night) is subtracted from accuracy, which
 * is how weather reaches the fight.
 */
export function createAiAgent(enemy, modifiers = {}, options = {}) {
  const history = { reload: 1, shield: 1, shoot: 1 }; // Laplace-smoothed priors
  const random = options.random || Math.random;
  const thinkMs = options.thinkMs ?? 0;

  const accuracy = Math.max(
    0.05,
    (enemy.accuracy ?? 0.5) - (modifiers.enemyAccuracyPenalty || 0),
  );

  function mostLikelyPlayerMove(view) {
    // A player with no bullets almost has to reload — weight that in.
    const weights = { ...history };
    if (view.foe.bullets <= 0) {
      weights.shoot = 0.05;
      weights.reload *= 2.2;
    }
    let best = MOVES.RELOAD;
    let bestValue = -Infinity;
    for (const [move, value] of Object.entries(weights)) {
      if (value > bestValue) {
        bestValue = value;
        best = move;
      }
    }
    return best;
  }

  function counterTo(move, view) {
    if (move === MOVES.RELOAD) return view.self.bullets > 0 ? MOVES.SHOOT : MOVES.RELOAD;
    if (move === MOVES.SHOOT) return MOVES.SHIELD;
    return MOVES.RELOAD; // they shielded — free reload
  }

  function fallback(view) {
    const bullets = view.self.bullets;
    const roll = random();
    if (bullets <= 0) return roll < 0.8 ? MOVES.RELOAD : MOVES.SHIELD;
    if (bullets >= 3) return roll < 0.6 ? MOVES.SHOOT : roll < 0.85 ? MOVES.SHIELD : MOVES.RELOAD;
    if (roll < 0.42) return MOVES.SHOOT;
    if (roll < 0.75) return MOVES.RELOAD;
    return MOVES.SHIELD;
  }

  return {
    isLocal: false,
    /** Feed the player's actual move back in after each round. */
    observe(playerMove) {
      if (history[playerMove] != null) history[playerMove] += 1;
    },
    async chooseMove(view) {
      if (thinkMs) await new Promise((r) => setTimeout(r, thinkMs));

      // On the brink, always protect what is left if there is any threat.
      if (view.self.lives === 1 && view.foe.bullets > 0 && random() < 0.55) {
        return MOVES.SHIELD;
      }
      // A finishing shot is never passed up.
      if (view.foe.lives === 1 && view.self.bullets > 0 && random() < 0.5 + accuracy * 0.4) {
        return MOVES.SHOOT;
      }
      if (random() < accuracy) {
        return counterTo(mostLikelyPlayerMove(view), view);
      }
      return fallback(view);
    },
  };
}
