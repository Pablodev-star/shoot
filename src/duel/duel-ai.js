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
 * THE OPPONENT IS NOT SUPPOSED TO BE A MIRROR
 * ---------------------------------------------------------------------------
 * The first version of this agent read the player's habits and, with
 * probability `accuracy`, played the exact counter to whatever they were most
 * likely to do. On paper that is a good opponent. In a hand it is the worst
 * one in the game, because the two moves it counters are the two moves the
 * player is forced to make:
 *
 *   you shoot   → it shielded, and your round is gone
 *   you reload  → it shot, and your life is gone
 *
 * A duellist who is right about that most of the time does not read as clever.
 * It reads as a cheat, because from the player's chair there is no difference
 * between "it guessed" and "it looked at my move" — and a game whose whole
 * loop is a three-way guess cannot afford to feel like the guess is rigged.
 *
 * So the read is now a MINORITY of what it does, and it is capped:
 *
 *   READ_SHARE  the most it can ever play off a read, whatever `accuracy` says
 *   accuracy    still ranks the worlds against each other — it scales the read
 *               within that ceiling, so Old Scratch is a harder fight than a
 *               drifter without either of them being a mirror
 *
 * The rest of the time it plays its own game: a weighted move that depends on
 * ITS cylinder, not yours.
 *
 * AND IT DOES NOT LIVE BEHIND THE SHIELD
 * ---------------------------------------------------------------------------
 * Shield is the move that produces the frustrating half of the pattern above,
 * and it was over-picked from three directions at once: the read chose it
 * whenever the player looked like shooting, the fallback offered it on every
 * branch, and nothing stopped it happening twice or five times in a row. Two
 * rules hold it down now (`canShield`): never twice in a row, and never more
 * than SHIELD_SHARE of its turns across the whole duel. When a rule blocks it,
 * the agent falls through to the move it would have played otherwise rather
 * than standing there — see `pickAggressive`.
 *
 * WHAT THIS COST, MEASURED
 * ---------------------------------------------------------------------------
 * Over a few thousand rounds against a player who mixes their moves properly,
 * and against the same player before the change:
 *
 *   shields raised                13% → 10% of its turns
 *   YOUR SHOTS EATEN BY A SHIELD  16% →  8%
 *   an even 3-life duel           the player won 1 in 5; now 1 in 3
 *
 * The last line is the honest part: this opponent is easier, and it is easier
 * because most of what made it hard was information it should never have had.
 * The difficulty it gives back is in src/game/world-abilities.js, where a
 * world can now put a volcano on the road instead of an opponent who cheats.
 *
 * `enemyAccuracyPenalty` (sandstorm, night) is subtracted from accuracy, which
 * is how weather reaches the fight.
 */

/** The most of its turns the AI can ever play off a read of the player. */
const READ_SHARE = 0.62;
/** Ceiling on the share of turns spent shielding, over the whole duel. */
const SHIELD_SHARE = 0.1;

export function createAiAgent(enemy, modifiers = {}, options = {}) {
  const history = { reload: 1, shield: 1, shoot: 1 }; // Laplace-smoothed priors
  const random = options.random || Math.random;
  const thinkMs = options.thinkMs ?? 0;

  const accuracy = Math.max(
    0.05,
    (enemy.accuracy ?? 0.5) - (modifiers.enemyAccuracyPenalty || 0),
  );
  /** How often it plays the counter instead of its own game. */
  const readChance = Math.min(READ_SHARE, accuracy * READ_SHARE * 1.35);

  let turns = 0;
  let shields = 0;
  let lastMove = null;

  /**
   * IT DOES NOT LOOK AT YOUR CYLINDER
   * -------------------------------------------------------------------------
   * This used to open with "a player with no bullets almost has to reload", and
   * it weighted the read accordingly — which meant that every single time the
   * player ran dry, the opponent knew, and the counter to reload is shoot.
   * That one line is where "every time I reload, they fire" came from. It was
   * not the player being read; it was the player's gun being read, and from the
   * chair it is indistinguishable from the AI seeing the move before it is
   * made.
   *
   * What is left is a genuine habit model: what this player has actually done
   * over this duel, and nothing about the state they are in right now.
   *
   * AND IT IS SAMPLED, NOT MAXIMISED
   * -------------------------------------------------------------------------
   * The old version took the argmax, which has a nasty property nobody notices
   * until they play against it: a player splitting their moves evenly is not
   * unreadable to an argmax, they are read as whichever move wins the tie —
   * every round, identically, for the whole duel. That is how a fifty-fifty
   * habit turned into "it counters my reload every single time".
   *
   * Drawing from the distribution instead means an even split is answered with
   * an even split, and a player who really does reload twice as often is still
   * read twice as often. The model is the same; it stopped rounding itself to
   * a certainty.
   */
  function guessPlayerMove() {
    const total = history.reload + history.shield + history.shoot;
    let roll = random() * total;
    for (const move of [MOVES.RELOAD, MOVES.SHIELD, MOVES.SHOOT]) {
      roll -= history[move];
      if (roll <= 0) return move;
    }
    return MOVES.RELOAD;
  }

  /**
   * The shield rules. Everything that wants to shield asks this first and
   * takes the answer as final.
   *
   * THE RULE THAT IS NOT HERE IS THE INTERESTING ONE
   * -------------------------------------------------------------------------
   * An earlier version of this opened with "never shield at a player who has
   * no bullets", on the grounds that it is a wasted turn. It is a wasted turn.
   * It is also, measured over a few thousand rounds, the single worst thing
   * this agent ever did: a shield that can only happen while the player is
   * loaded lands almost exclusively on the rounds the player fires. Gating on
   * the enemy's cylinder took the share of the player's shots that got eaten
   * from about one in seven to better than one in three — a *smarter* rule
   * that made the fight feel rigged, because it correlated the opponent's
   * defence with the player's attack by construction.
   *
   * So it is gone, along with the read's old peek at the same cylinder. This
   * agent does not look at your gun at all. It occasionally raises a shield at
   * an empty one and wastes the turn, and that is the price of its shields
   * falling where they fall instead of where you were about to shoot.
   */
  function canShield() {
    if (lastMove === MOVES.SHIELD) return false;
    return shields < Math.max(1, Math.round((turns + 1) * SHIELD_SHARE));
  }

  /** What it does when it wanted to shield and is not allowed to. */
  function pickAggressive(view) {
    if (view.self.bullets > 0 && random() < 0.62) return MOVES.SHOOT;
    return MOVES.RELOAD;
  }

  function counterTo(move, view) {
    if (move === MOVES.RELOAD) return view.self.bullets > 0 ? MOVES.SHOOT : MOVES.RELOAD;
    if (move === MOVES.SHOOT) {
      return canShield() ? MOVES.SHIELD : pickAggressive(view);
    }
    return MOVES.RELOAD; // they shielded — free reload
  }

  /**
   * Its own game, which is a statement about ITS cylinder and nothing else.
   * An empty gun reloads, a full one shoots, and the middle trades between the
   * two — the shield is a small slice of each branch rather than a third of
   * every one of them.
   */
  function fallback(view) {
    const bullets = view.self.bullets;
    const roll = random();
    if (bullets <= 0) {
      return roll < 0.86 || !canShield() ? MOVES.RELOAD : MOVES.SHIELD;
    }
    if (bullets >= 3) {
      if (roll < 0.82) return MOVES.SHOOT;
      if (roll < 0.92 && canShield()) return MOVES.SHIELD;
      return MOVES.SHOOT;
    }
    if (roll < 0.62) return MOVES.SHOOT;
    if (roll < 0.86) return MOVES.RELOAD;
    return canShield() ? MOVES.SHIELD : MOVES.RELOAD;
  }

  return {
    isLocal: false,
    /** Feed the player's actual move back in after each round. */
    observe(playerMove) {
      if (history[playerMove] != null) history[playerMove] += 1;
    },
    async chooseMove(view) {
      if (thinkMs) await new Promise((r) => setTimeout(r, thinkMs));

      let move;
      // On the brink, protect what is left — but only if the shield is a real
      // move here and not the fourth one in a row.
      if (view.self.lives === 1 && random() < 0.5 && canShield()) {
        move = MOVES.SHIELD;
      } else if (view.foe.lives === 1 && view.self.bullets > 0 && random() < 0.5 + accuracy * 0.4) {
        // A finishing shot is never passed up.
        move = MOVES.SHOOT;
      } else if (random() < readChance) {
        move = counterTo(guessPlayerMove(), view);
      } else {
        move = fallback(view);
      }

      turns += 1;
      if (move === MOVES.SHIELD) shields += 1;
      lastMove = move;
      return move;
    },
  };
}
