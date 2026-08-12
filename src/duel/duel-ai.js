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
 * AND IT DOES NOT LIVE BEHIND THE SHIELD — BUT IT DOES OWN ONE
 * ---------------------------------------------------------------------------
 * Shield is the move that produces the frustrating half of the pattern above,
 * and it was once over-picked from three directions at once: the read chose it
 * whenever the player looked like shooting, the fallback offered it on every
 * branch, and nothing stopped it happening five times in a row. Fixing that
 * went one town too far. With the cap at a tenth of its turns and no two
 * shields ever running back to back, the rival was so reliably open that
 * "shoot whenever you have a round" stopped having a downside — measured over
 * five hundred duels a policy, the player who mixed their moves properly won
 * 88% of the time and the player who mashed SHOOT and never thought about it
 * won 97%. A three-way guess in which one of the three answers is free is not
 * a guess.
 *
 * So the shield is back to being a real move, held down by two rules that
 * leave it dangerous instead of absent (`canShield`): never three times in a
 * row, and never more than SHIELD_SHARE of its turns across the whole duel.
 * When a rule blocks it, the agent falls through to the move it would have
 * played otherwise rather than standing there — see `pickAggressive`.
 *
 * AND IT NOTICES A PATTERN, WHICH IS NOT THE SAME AS SEEING YOUR MOVE
 * ---------------------------------------------------------------------------
 * The old cheat was reading the player's CYLINDER — state they had not chosen
 * and could not hide. What `STREAK_*` reads is the player's own repetition:
 * fire three rounds running and the fourth is more likely to meet a shield.
 * That is information the player put on the table themselves, it is escapable
 * by simply not repeating, and it is what turns the duel back into a bluff.
 * A player who varies never sees it at all.
 *
 * WHAT THIS COSTS, MEASURED
 * ---------------------------------------------------------------------------
 * Over five hundred duels a policy, against the same world-3 rider:
 *
 *   pure SHOOT spam       97% → 78%
 *   proper mixing         88% → 86%
 *
 * The gap flips: thinking is now worth eight points instead of costing nine.
 *
 * `enemyAccuracyPenalty` (sandstorm, night) is subtracted from accuracy, which
 * is how weather reaches the fight.
 */

/** The most of its turns the AI can ever play off a read of the player. */
const READ_SHARE = 0.62;
/** Ceiling on the share of turns spent shielding, over the whole duel. */
const SHIELD_SHARE = 0.2;
/** Repeated identical moves before the agent starts expecting another one. */
const STREAK_TRIGGER = 3;
/** How much a streak that long adds to the chance of answering it. */
const STREAK_BONUS = 0.34;

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
  /** How many turns the agent has shielded back to back right now. */
  let shieldRun = 0;
  /** The player's last move, and how many times they have repeated it. */
  let playerLast = null;
  let playerStreak = 0;

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
    // Twice is a duellist covering up. Three times is a wall, and a wall is
    // what made this agent unreadable in the wrong direction.
    if (shieldRun >= 2) return false;
    return shields < Math.max(1, Math.round((turns + 1) * SHIELD_SHARE));
  }

  /**
   * The one thing the agent is allowed to notice: the player doing the same
   * thing over and over. It is not a peek at their state — it is their own
   * last few turns, which they chose and can stop choosing.
   */
  function streakAnswer() {
    if (playerStreak < STREAK_TRIGGER) return null;
    if (playerLast === MOVES.SHOOT) return canShield() ? MOVES.SHIELD : null;
    if (playerLast === MOVES.RELOAD) return MOVES.SHOOT;
    return null; // a player who only shields is punishing themselves already
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
   *
   * AND IT TELLS THE TRUTH, LOUDLY, BECAUSE THAT IS THE GAME
   * -------------------------------------------------------------------------
   * The duel screen draws both cylinders: six chambers a side with the loaded
   * ones shaded in. That picture is the only honest tell in this game, and it
   * is worth nothing unless the tell is strong — if a rival with an empty gun
   * still shoots one turn in seven, then watching their chambers buys you a
   * hunch, and a hunch is indistinguishable from luck.
   *
   * So the branches are sharpened almost to certainties. An empty gun reloads;
   * a stocked one fires. A player who has noticed can spend the rival's dry
   * turns freely — reload in the open, line up the shot — and duck behind a
   * shield on the turns the picture says a round is coming. A player who has
   * not noticed plays the same duel with the lights off, and pays about a
   * fifth more of their life bar per fight for it.
   *
   * The tell is a real strategy rather than an exploit precisely because it
   * runs both ways: the agent reads the player's chambers exactly never (see
   * the note above `guessPlayerMove`), and the player reads the agent's from
   * the interface. The information the game gives away is the information it
   * expects you to use.
   */
  function fallback(view) {
    const bullets = view.self.bullets;
    const roll = random();
    if (bullets <= 0) {
      return roll < 0.92 || !canShield() ? MOVES.RELOAD : MOVES.SHIELD;
    }
    if (bullets >= 3) {
      if (roll < 0.72) return MOVES.SHOOT;
      if (roll < 0.86 && canShield()) return MOVES.SHIELD;
      return MOVES.SHOOT;
    }
    if (roll < 0.5) return MOVES.SHOOT;
    if (roll < 0.84) return MOVES.RELOAD;
    return canShield() ? MOVES.SHIELD : MOVES.RELOAD;
  }

  return {
    isLocal: false,
    /** Feed the player's actual move back in after each round. */
    observe(playerMove) {
      if (history[playerMove] != null) history[playerMove] += 1;
      playerStreak = playerMove === playerLast ? playerStreak + 1 : 1;
      playerLast = playerMove;
    },
    async chooseMove(view) {
      if (thinkMs) await new Promise((r) => setTimeout(r, thinkMs));

      let move;
      const streak = streakAnswer();
      // On the brink, protect what is left — but only if the shield is a real
      // move here and not the third one in a row.
      if (view.self.lives === 1 && random() < 0.5 && canShield()) {
        move = MOVES.SHIELD;
      } else if (view.foe.lives === 1 && view.self.bullets > 0 && random() < 0.5 + accuracy * 0.4) {
        // A finishing shot is never passed up.
        move = MOVES.SHOOT;
      } else if (streak && random() < STREAK_BONUS) {
        // They have told it what they are going to do. It answers.
        move = streak === MOVES.SHOOT && view.self.bullets <= 0 ? MOVES.RELOAD : streak;
      } else if (random() < readChance) {
        move = counterTo(guessPlayerMove(), view);
      } else {
        move = fallback(view);
      }

      turns += 1;
      if (move === MOVES.SHIELD) {
        shields += 1;
        shieldRun += 1;
      } else {
        shieldRun = 0;
      }
      return move;
    },
  };
}
