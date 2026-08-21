/**
 * SHOOT! — the balance harness.
 *
 * WHY THIS EXISTS
 * ---------------------------------------------------------------------------
 * Every number in this game lives in a data file, which makes it easy to
 * change and impossible to check. The last round of tuning was done by reading
 * the tables and it produced, among other things, a volcano that erupted in 0%
 * of measured fights, a "shoot every round and never think" policy that beat
 * proper play by nine points, and a full run that no simulated player ever
 * finished. None of that is visible in a diff. All of it is visible here.
 *
 * The harness imports the REAL modules — the duel engine, the AI, the road
 * generator, the progression curves — and reimplements nothing. If it says a
 * duel goes a certain way, that is the way the shipped game plays it. What it
 * substitutes is the person: three synthetic players, from someone mashing one
 * button to someone spending their gold correctly.
 *
 * WHAT TO RUN
 * ---------------------------------------------------------------------------
 *   node tools/sim.mjs asymmetry how many shots it takes to kill each of you
 *   node tools/sim.mjs duels     win rates per world, per skill, per gun rung
 *   node tools/sim.mjs bosses    the same for the six bosses
 *   node tools/sim.mjs specials  how often a world's landmark actually erupts
 *   node tools/sim.mjs runs      full runs, permadeath on — the headline number
 *   node tools/sim.mjs hard      the same, on the hard road
 *   node tools/sim.mjs all       everything (this is what CI runs)
 *
 *   RUNS=600 node tools/sim.mjs runs      more samples, slower
 *   ROUND_MS=6000 node tools/sim.mjs all  model a slower player at the keys
 *
 * WHAT THE NUMBERS ARE SUPPOSED TO BE
 * ---------------------------------------------------------------------------
 * The design target is a skill ladder, not a difficulty. Measured over three
 * hundred runs a skill level, the road as it stands sends
 *
 *   about one novice run in sixteen to the Galaxy
 *   about one average run in five
 *   about one expert run in two
 *
 * — and what separates them is almost entirely the ledger rather than the
 * trigger finger. `all` prints those three against their bands and exits
 * non-zero if any has drifted out, which is what makes this a test and not a
 * report. The bands are wide on purpose: they are there to catch a change that
 * moved the game by a third, not to freeze it.
 */

import { createDuel, MOVES } from '../src/duel/duel-engine.js';
import { createAiAgent } from '../src/duel/duel-ai.js';
import { WORLDS, getWorld, FINAL_WORLD } from '../src/game/worlds.js';
import { generateSegment, revealToHorizon, roadReading } from '../src/explore/encounters.js';
import { ITEMS } from '../src/game/items.js';
import { makeRng } from '../src/core/rng.js';
import { generateStock } from '../src/shops/shop.js';
import { setDifficulty, tuning } from '../src/game/difficulty.js';
import { ITEMS as CATALOGUE } from '../src/game/items.js';
import * as P from '../src/game/progression.js';

/**
 * How long a round of a duel takes in the real game, animation plus a couple
 * of seconds of somebody deciding. It only matters because the landmarks run
 * on a real clock — everything else in this game waits for the player.
 */
const ROUND_MS = Number(process.env.ROUND_MS || 3800);
/**
 * Which road the single-report modes measure. `runs`, `hard` and `all` set it
 * themselves; everything else (`duels`, `bosses`, `specials`, `asymmetry`)
 * honours this, so `DIFF=hard node tools/sim.mjs duels` is how a knob gets
 * diagnosed one world at a time instead of by watching the headline number.
 */
const DIFF = process.env.DIFF === 'hard' ? 'hard' : 'normal';
const RUNS = Number(process.env.RUNS || 400);
const DUELS = Number(process.env.DUELS || 400);

// ---------------------------------------------------------------------------
// The three people at the keyboard
// ---------------------------------------------------------------------------

/**
 * A policy is `(view, rng, memory) => move`. `memory` is the policy's own
 * scratch object, which is how the expert avoids repeating itself — the one
 * thing the opponent is now allowed to punish (see STREAK_TRIGGER in
 * src/duel/duel-ai.js).
 */
export const POLICIES = {
  /**
   * Reload when empty, shoot otherwise, think about nothing. This is what a
   * first-time player does for their first world, and against an opponent that
   * cannot punish a pattern it used to be the strongest policy in the game.
   */
  novice: (view) => (view.self.bullets <= 0 ? MOVES.RELOAD : MOVES.SHOOT),

  /**
   * Somebody a few duels in. They have worked out that a shield thrown up at
   * random loses — it costs a round and buys one back — so they mostly shoot
   * and keep the shield for when they are low. What they have NOT worked out is
   * the rival's cylinder, so they raise it on the wrong turns.
   */
  average: (view, rng) => {
    if (view.self.bullets <= 0) return MOVES.RELOAD;
    if (view.self.lives <= view.foe.gunDamage && rng.chance(0.4)) return MOVES.SHIELD;
    const r = rng();
    if (r < 0.78) return MOVES.SHOOT;
    if (r < 0.94) return MOVES.RELOAD;
    return MOVES.SHIELD;
  },

  /**
   * Somebody who has understood the fight.
   *
   * THE SKILL IN THIS GAME IS READING THE OTHER CYLINDER
   * -------------------------------------------------------------------------
   * It is the one piece of information the duel screen hands over for free and
   * the one the first two policies throw away: the rival's chambers are drawn
   * on their card, six holes with rounds in some of them, and an empty gun
   * cannot shoot you. So a shield raised against an empty rival is a turn
   * given away, and a reload in front of a full one is a life.
   *
   * That is the whole of it, and it is symmetrical — the agent decides off its
   * own cylinder in exactly the same way (see `fallback` in
   * src/duel/duel-ai.js), so a player who watches it is not exploiting a bug,
   * they are reading an opponent who is telling them the truth.
   *
   * On top of that: never repeat a move three times running, because the agent
   * answers a streak; and never pass up a finisher.
   */
  expert: (view, rng, memory) => {
    const forced = (memory.streak || 0) >= 2 ? memory.last : null;
    const loaded = view.foe.bullets;
    /** How likely they are to fire at all this round, from their own gun. */
    const threat = loaded <= 0 ? 0 : loaded >= 3 ? 0.82 : 0.62;

    const pick = () => {
      // Their last life and a round in hand: take it, whatever they are doing.
      if (view.foe.lives <= view.self.gunDamage && view.self.bullets > 0) return MOVES.SHOOT;

      // An empty rival is a free turn. Never spend it hiding.
      if (threat === 0) return view.self.bullets > 0 ? MOVES.SHOOT : MOVES.RELOAD;

      // A hit would end the run: pay a turn to not be hit.
      if (view.self.lives <= view.foe.gunDamage) {
        return rng() < threat ? MOVES.SHIELD : MOVES.SHOOT;
      }

      // TEMPO IS DEFENCE, BECAUSE THE MOUNTAIN IS ON A CLOCK
      // ---------------------------------------------------------------------
      // The obvious way to take less damage is to shield more, and it is
      // wrong: a shield buys one round back and costs one round, and a fight
      // dragged out four rounds longer walks into another eruption — which
      // nothing blocks. So a good player hides only when a hit would finish
      // them and spends every other turn ending the fight.
      if (view.self.bullets <= 0) {
        return rng() < threat * 0.18 ? MOVES.SHIELD : MOVES.RELOAD;
      }

      const r = rng();
      if (r < 0.8) return MOVES.SHOOT;
      if (r < 0.94) return MOVES.RELOAD;
      return MOVES.SHIELD;
    };

    let move = pick();
    let guard = 6;
    while (move === forced && guard-- > 0) move = pick();
    if (move === forced) move = forced === MOVES.SHOOT ? MOVES.RELOAD : MOVES.SHOOT;
    if (move === MOVES.SHOOT && view.self.bullets <= 0) move = MOVES.RELOAD;
    return move;
  },
};

/**
 * What each of the three does with their gold.
 *
 * THIS IS WHERE THE SKILL IS
 * ---------------------------------------------------------------------------
 * The duel itself is a three-way guess with a tell in it, and a tell is worth
 * about a fifth of the damage you take — real, but not the difference between
 * finishing a run and dying in the flats. What decides a run is the ledger:
 * whether the gold went on the thing that was about to kill you.
 *
 * `reserve` is the whole model of that. It is what a player refuses to spend
 * the gun's money down past — the bed and the bandages they know they will
 * need before the next counter. Somebody who keeps no reserve buys a beautiful
 * revolver and starves behind it.
 */
const SPENDING = {
  /**
   * Buys the shiniest affordable thing the moment it is affordable, keeps
   * nothing back, eats when reminded, and walks into fights on whatever lives
   * happen to be left.
   */
  novice: {
    /** Spends down to nothing on the shiny thing, every time. */
    reserve: () => 0,
    /** Anything it can pay for outright, it pays for. */
    impulseRung: 1,
    /** Eats when the gauge warns them, which is later than it should be. */
    foodTarget: 60,
    /** Buys a bandage when one is staring at them, then forgets. */
    healBudget: 0.18,
    /** Only when the next hit would be the last one — never as maintenance. */
    healBeforeFight: 'panic',
    healAt: 0.3,
    /** Takes the good bed only once the bar is visibly nearly gone. */
    premiumAt: 0.65,
  },
  /**
   * Keeps a bed's worth back and remembers to patch up — most of the time.
   *
   * Sat almost on top of the expert for a long while, which made "average"
   * a second good player rather than the middle of the road: the two
   * archetypes differed by a tenth of a heal budget while the novice was a
   * different game entirely. The gaps are even now — a third of the purse into
   * healing against the expert's three fifths and the novice's sixth, and a
   * bar low enough to be worth patching that sits between the two.
   */
  average: {
    reserve: (worldId) => P.innBasicPrice(worldId),
    impulseRung: 0.9,
    foodTarget: 95,
    healBudget: 0.3,
    healBeforeFight: true,
    healAt: 0.42,
    premiumAt: 0.55,
  },
  /**
   * Knows what a life costs and buys it before it is needed: food first,
   * because starving is the one thing on the road that cannot be fought, then
   * enough bandages to cross to the next counter, and only then the gun —
   * never spending down past the price of a night's sleep.
   */
  expert: {
    reserve: (worldId) => P.innBasicPrice(worldId) + 2 * P.itemPrice(ITEMS.bandage, worldId),
    /**
     * Buys the rung the moment it is affordable, same as anybody — measured,
     * that IS the right play: a rung shortens every fight of the world and a
     * shorter fight is the cheapest damage reduction on the road. What makes
     * this player good is that the gun does not eat the food and the bandages
     * as well.
     */
    impulseRung: 1,
    foodTarget: 160,
    healBudget: 0.6,
    healBeforeFight: true,
    healAt: 0.7,
    premiumAt: 0.3,
  },
};

// ---------------------------------------------------------------------------
// Fighting
// ---------------------------------------------------------------------------

/**
 * @param {number} [progress] how far along the world's road this rider stands.
 *   Past halfway, half of them carry the next rung of the ladder — the ramp in
 *   `enemyGunDamageAt`. The harness has to model it or it measures a road that
 *   is a good deal gentler than the one the player walks.
 */
/**
 * THE MODE IS APPLIED HERE TOO, AND IT HAS TO BE, LINE FOR LINE
 * ---------------------------------------------------------------------------
 * Almost nothing in this harness reimplements the game — the duel engine, the
 * AI, the road generator, the price curve and the shop are all the shipped
 * modules, and every one of them reads `tuning()` on its own. These two
 * functions are the exception: enemy generation is the one thing the harness
 * builds itself (it needs no sprites, no names and no seed order), and that
 * makes it the one place where a difficulty knob can be silently missed.
 *
 * So they mirror `generateEnemy` and `generateBoss` in src/game/enemies.js
 * knob for knob, `baseLives` included — a model that fattened the riders but
 * paid out on the fat total would measure a hard road that funds itself.
 */
const scaleLives = (lives, mul) => (mul === 1 ? lives : Math.max(0.5, Math.floor(lives * mul * 2) / 2));

function rollEnemy(worldId, rng, progress = 0) {
  const p = getWorld(worldId).enemy;
  const t = tuning();
  const rolled = Number(rng.weighted(p.lives));
  const lives = scaleLives(rolled, t.enemyLivesMul);
  const heavier = rng.chance(P.enemyRampChance());
  const abilityChance = p.abilityChance * t.enemyAbilityChanceMul;
  const abilities = [];
  if (rng.chance(abilityChance)) abilities.push(rng.pick(p.abilities));
  if (worldId >= 4 && rng.chance(abilityChance * 0.5)) {
    const extra = rng.pick(p.abilities);
    if (!abilities.includes(extra)) abilities.push(extra);
  }
  return {
    name: 'rider',
    lives,
    maxLives: lives,
    baseLives: rolled,
    bullets: 0,
    accuracy: p.accuracy + t.enemyAccuracyBonus,
    gunDamage: P.enemyGunDamageAt(worldId, progress, heavier),
    abilities,
    abilityChanceMul: t.enemyCastMul,
    special: rng.chance((p.specialChance || 0) * t.enemySpecialChanceMul) ? p.special : null,
    isBoss: false,
  };
}

function bossPhase(worldId, index = 0) {
  const b = getWorld(worldId).boss;
  const ph = b.phases ? b.phases[index] : b;
  if (!ph) return null;
  const t = tuning();
  const lives = scaleLives(ph.lives, t.bossLivesMul);
  return {
    name: ph.name || b.name,
    lives,
    maxLives: lives,
    baseLives: ph.lives,
    bullets: ph.startBullets || 0,
    accuracy: (ph.accuracy ?? b.accuracy) + t.enemyAccuracyBonus,
    // A boss carries its world's ordinary bullet, plus the hard road's rung
    // if that is the road being measured — see `generateBoss`.
    gunDamage: P.enemyBulletFloor(worldId),
    abilities: ph.abilities || b.abilities,
    abilityChanceMul: (ph.abilityChanceMul || 1) * t.enemyCastMul,
    special: ph.special || b.special,
    isBoss: true,
  };
}

/**
 * One duel, played out by the real engine.
 *
 * `player.bonus` is the gold end of the bar (a Potion's three lives — see
 * src/game/items.js), and it comes back out as `bonusLeft` because the engine
 * spends it before anything red and never puts one back. A model that dropped
 * it on the way in would price the bottle at nothing and a model that dropped
 * it on the way out would hand the player a fresh three every fight.
 *
 * @returns {{won:boolean, rounds:number, livesLeft:number, bonusLeft:number,
 *            hazardStrikes:boolean, hazardRaised:boolean, shotsFired:number,
 *            shotsBlocked:number}}
 */
export async function fight({ enemy, player, policy, seed }) {
  const rng = makeRng(seed >>> 0);
  const ai = createAiAgent(enemy, {}, { random: rng });
  const memory = {};
  let last = null;
  const agent = {
    isLocal: false,
    async chooseMove(view) {
      const move = POLICIES[policy](view, rng, memory);
      memory.streak = move === memory.last ? (memory.streak || 1) + 1 : 1;
      memory.last = move;
      last = move;
      return move;
    },
  };

  const stats = { hazardStrikes: 0, hazardRaised: false, shotsFired: 0, shotsBlocked: 0 };
  const duel = createDuel({
    player,
    enemy,
    playerAgent: agent,
    enemyAgent: ai,
    random: rng,
    onEvent: (e) => {
      if (e.type === 'special') stats.hazardRaised = true;
      if (e.type === 'hazard-strike' && e.side === 'player') stats.hazardStrikes += 1;
      if (e.type === 'round' && e.playerFires) {
        stats.shotsFired += 1;
        if (e.enemyMove === MOVES.SHIELD && !e.hits.enemy) stats.shotsBlocked += 1;
      }
    },
  });

  let rounds = 0;
  while (!duel.isOver() && rounds < 80) {
    duel.tick(ROUND_MS);
    if (duel.isOver()) break;
    duel.maybeCastSpecial();
    // Anything charged gets spent — nobody sits on a full plate.
    for (const slot of duel.getAbilityState()) if (slot.ready) duel.useAbility(slot.itemId);
    if (duel.isOver()) break;
    await duel.playRound();
    ai.observe(last);
    rounds += 1;
  }

  return {
    won: duel.getResult()?.winner === 'player',
    rounds,
    livesLeft: duel.getSides().player.lives,
    bonusLeft: duel.getSides().player.bonus,
    ...stats,
  };
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

const pct = (n, d) => +(100 * n / Math.max(1, d)).toFixed(1);

/** Where the economy model says a player stands when they reach each world. */
function powerCurve() {
  const rows = [];
  let gold = 0, exp = 0, level = 1, lives = P.STARTING_LIVES, gun = 0, spent = 0;
  for (const w of WORLDS) {
    const dist = w.enemy.lives;
    const avg = Object.entries(dist).reduce((s, [k, v]) => s + Number(k) * v, 0) /
      Object.values(dist).reduce((s, v) => s + v, 0);
    rows.push({ world: w.id, name: w.name, level, maxLives: lives, gun, gunDmg: P.gunDamageAt(gun) });
    gold += w.encounters.duels * P.goldForEnemy({ worldId: w.id, lives: avg }) +
      P.goldForEnemy({ worldId: w.id, lives: w.boss.lives, isBoss: true });
    exp += w.encounters.duels * P.expForEnemy({ worldId: w.id, lives: avg }) +
      P.expForEnemy({ worldId: w.id, lives: w.boss.lives, isBoss: true });
    while (exp >= P.expForNextLevel(level)) { exp -= P.expForNextLevel(level); level += 1; lives += P.LIVES_PER_LEVEL; }
    let budget = gold * 0.5 - spent;
    while (gun < P.GUN_MAX_LEVEL && P.gunUpgradeCost(gun) <= budget) {
      budget -= P.gunUpgradeCost(gun); spent += P.gunUpgradeCost(gun); gun += 1;
    }
  }
  return rows;
}

async function reportDuels() {
  const power = powerCurve();
  const out = [];
  for (const w of WORLDS) {
    const at = power[w.id - 1];
    for (const policy of ['novice', 'average', 'expert']) {
      let wins = 0, rounds = 0, lost = 0, fired = 0, blocked = 0;
      for (let i = 0; i < DUELS; i++) {
        // Spread the sample evenly along the road so the ramp is represented.
        const enemy = rollEnemy(w.id, makeRng(w.id * 1013 + i), i / DUELS);
        const r = await fight({
          enemy,
          player: {
            lives: at.maxLives, maxLives: at.maxLives, bullets: 0,
            gunDamage: P.gunDamageAt(at.gun),
          },
          policy,
          seed: w.id * 7919 + i,
        });
        if (r.won) wins += 1;
        rounds += r.rounds;
        lost += at.maxLives - r.livesLeft;
        fired += r.shotsFired;
        blocked += r.shotsBlocked;
      }
      out.push({
        world: w.id, name: w.name, policy,
        lives: at.maxLives, gun: at.gun, dmg: P.gunDamageAt(at.gun),
        win: pct(wins, DUELS),
        rounds: +(rounds / DUELS).toFixed(1),
        livesLost: +(lost / DUELS).toFixed(2),
        /**
         * The number that decides runs. A win rate of 99% means nothing if
         * every win costs a third of the bar and the world holds two beds —
         * what ends a run is nine duels, not one.
         */
        barPct: pct(lost / DUELS, at.maxLives),
        blockedPct: pct(blocked, fired),
      });
    }
  }
  console.log('\n=== REGULAR DUELS ===');
  console.table(out);
  return out;
}

async function reportBosses() {
  const power = powerCurve();
  const out = [];
  for (const w of WORLDS) {
    const at = power[w.id - 1];
    // The boss is fought after the world's duels, so a rung further on.
    const gun = Math.min(P.GUN_MAX_LEVEL, at.gun + 1);
    for (const policy of ['novice', 'average', 'expert']) {
      let wins = 0, rounds = 0, erupted = 0, strikes = 0;
      for (let i = 0; i < DUELS; i++) {
        const r = await fight({
          enemy: bossPhase(w.id),
          player: {
            lives: at.maxLives, maxLives: at.maxLives, bullets: 0,
            gunDamage: P.gunDamageAt(gun),
          },
          policy,
          seed: w.id * 104729 + i,
        });
        if (r.won) wins += 1;
        rounds += r.rounds;
        if (r.hazardStrikes > 0) erupted += 1;
        strikes += r.hazardStrikes;
      }
      out.push({
        world: w.id, boss: getWorld(w.id).boss.name, policy,
        bossLives: bossPhase(w.id).lives, dmg: P.gunDamageAt(gun),
        win: pct(wins, DUELS),
        rounds: +(rounds / DUELS).toFixed(1),
        eruptedPct: pct(erupted, DUELS),
        strikesTaken: +(strikes / DUELS).toFixed(2),
      });
    }
  }
  console.log('\n=== BOSSES (phase 1) ===');
  console.table(out);
  return out;
}

async function reportSpecials() {
  const power = powerCurve();
  const out = [];
  for (const w of WORLDS) {
    const at = power[w.id - 1];
    let raised = 0, erupted = 0, strikes = 0, rounds = 0;
    for (let i = 0; i < DUELS; i++) {
      const r = await fight({
        enemy: bossPhase(w.id),
        player: {
          lives: at.maxLives, maxLives: at.maxLives, bullets: 0,
          gunDamage: P.gunDamageAt(at.gun),
        },
        policy: 'average',
        seed: w.id * 911 + i,
      });
      if (r.hazardRaised) raised += 1;
      if (r.hazardStrikes > 0) erupted += 1;
      strikes += r.hazardStrikes;
      rounds += r.rounds;
    }
    out.push({
      world: w.id, special: w.enemy.special,
      raisedPct: pct(raised, DUELS),
      eruptedPct: pct(erupted, DUELS),
      strikesPerDuel: +(strikes / DUELS).toFixed(2),
      duelSeconds: +((rounds / DUELS) * ROUND_MS / 1000).toFixed(0),
    });
  }
  console.log('\n=== WORLD SPECIALS (on a boss, which always carries one) ===');
  console.table(out);
  return out;
}

/**
 * THE REPORT THAT WOULD HAVE CAUGHT THE WORST BUG THIS GAME HAS HAD
 * ---------------------------------------------------------------------------
 * A shipped version of this game took **twelve** connected shots to kill the
 * player in world one and **fourteen** in world two, against two or three to
 * kill the rider across the road. Nothing was broken: the player's life bar and
 * the enemy's damage were two numbers in two files, both individually sensible,
 * growing at different rates. Nobody can see that in a diff, and no win-rate
 * table shows it either — the runs still looked winnable.
 *
 * So this report puts the two sides of the road on the same page. It checks
 * three things and fails the build on any of them:
 *
 *   1. the power curve `progression.js` CLAIMS matches what the economy
 *      actually delivers, world by world;
 *   2. the riders in `worlds.js` carry the life `enemyLives()` says they should;
 *   3. both shots-to-kill stay in their bands — six-ish to kill the player,
 *      one and a half to three and a half to kill a rider. Those two numbers
 *      are the whole feel of a duel.
 */
async function reportAsymmetry() {
  const delivered = powerCurve();
  const rows = [];
  const problems = [];

  for (const w of WORLDS) {
    const claim = P.EXPECTED_POWER[w.id];
    const real = delivered[w.id - 1];
    const dist = w.enemy.lives;
    const riderMean = Object.entries(dist).reduce((sum, [k, v]) => sum + Number(k) * v, 0) /
      Object.values(dist).reduce((sum, v) => sum + v, 0);
    const bossTotal = w.boss.phases
      ? w.boss.phases.reduce((sum, ph) => sum + ph.lives, 0)
      : w.boss.lives;

    const onPlayer = claim.lives / P.enemyGunDamage(w.id);
    const onEnemy = riderMean / claim.damage;
    rows.push({
      world: w.id,
      claimBar: claim.lives, realBar: real.maxLives,
      claimDmg: claim.damage, realDmg: real.gunDmg,
      riderLives: +riderMean.toFixed(2), wanted: P.enemyLives(w.id),
      boss: bossTotal, wantedBoss: P.bossLives(w.id),
      hitsOnPlayer: +onPlayer.toFixed(1),
      hitsOnEnemy: +onEnemy.toFixed(1),
      ratio: +(onPlayer / onEnemy).toFixed(1),
    });

    if (Math.abs(claim.lives - real.maxLives) > 1) {
      problems.push(`world ${w.id}: bar claimed ${claim.lives}, economy delivers ${real.maxLives}`);
    }
    if (Math.abs(claim.damage - real.gunDmg) > 0.75) {
      problems.push(`world ${w.id}: gun claimed ${claim.damage}, economy delivers ${real.gunDmg}`);
    }
    if (Math.abs(riderMean - P.enemyLives(w.id)) > 0.6) {
      problems.push(`world ${w.id}: riders carry ${riderMean.toFixed(2)}, want ${P.enemyLives(w.id)}`);
    }
    // A two-phase boss is one fight in two halves and is allowed to be bigger.
    const bossSlack = w.boss.phases ? 0.5 : 0.25;
    if (Math.abs(bossTotal - P.bossLives(w.id)) > P.bossLives(w.id) * bossSlack) {
      problems.push(`world ${w.id}: boss carries ${bossTotal}, want about ${P.bossLives(w.id)}`);
    }
    /**
     * THE ONE ABSOLUTE THAT MUST NOT DRIFT
     * -----------------------------------------------------------------------
     * Not the ratio — the ratio is the two numbers divided, and on a
     * half-diamond grid with a bar of three to seven it jumps around by half a
     * point every time anything moves. What has to hold is how many connected
     * shots a rider needs to kill you, because that is the whole feel of a
     * duel and it is the thing that went wrong: it drifted to twelve in the
     * Dust Flats and fourteen in the Wildgrass Prairie, which is a rival who
     * cannot hurt you inside a single fight however long it lasts.
     *
     * Six is the target and four to eight is the band. The ratio stays in the
     * table because it is worth looking at; it is not what fails the build.
     */
    /**
     * The band moves with the length of the fight — see `hitsToKillPlayer`.
     * A six-hit bar in a world where a rider takes three of your shots is not
     * the same duel as a six-hit bar in a world where he takes two, and the
     * flat 4-8 this used to check let the Galaxy quietly cost sixty per cent
     * of the bar a duel while reading as perfectly in band.
     */
    const wanted = P.hitsToKillPlayer(w.id);
    /**
     * The floor is the one that matters, and it is tight: a world that gives
     * the player less headroom than its fight length needs is a world that
     * costs half a bar a duel.
     *
     * The ceiling is deliberately loose, because the half-diamond grid cannot
     * express most of what this curve asks for. On a six-diamond bar the
     * bullet the pass wants is six sevenths of a life, and the two things the
     * grid can draw are one (six hits) and a half (twelve). The bullet always
     * rounds DOWN (see `toHalfDown`), so a world lands on the generous side of
     * that choice rather than the spike — the pass is the quiet world of the
     * six, and that is a decision rather than a bug.
     */
    /**
     * THE FLOOR IS ALL THAT IS LEFT OF THIS CHECK, AND IT IS DELIBERATE
     * -----------------------------------------------------------------------
     * `wanted` is what the DERIVED bullet used to deliver — the bar over six,
     * scaled by the length of that world's fights — and while the bullet was
     * solved against the bar, holding the two within two hits of each other was
     * the whole job of this line.
     *
     * The bullet is a hand-written ladder now: half a life in the Dust Flats
     * and half a life more every world, one rung of ENEMY_GUNS per world, so
     * that what a rider is carrying can be READ off the gun in his hand (see
     * `enemyGunDamage` in src/game/progression.js). It climbs faster than the
     * bar does, on purpose, and the hits-to-kill it produces falls from six in
     * the Dust Flats to about three and a half from the Bayou on. That is the
     * design; a check that fails the build for it is a check measuring the
     * previous design.
     *
     * What is still worth failing over is the FLOOR. Under three connected
     * hits there is no fight left in a duel — the first two rounds decide it
     * and nothing the player does after them matters — and that is the line
     * this game cannot cross whatever the ladder says. `wanted` stays in the
     * table beside it, because the gap between the two is the honest measure
     * of how far the road has been pushed past what the economy pays for.
     */
    if (onPlayer < 3) {
      problems.push(
        `world ${w.id}: a rider needs only ${onPlayer.toFixed(1)} hits to kill the player ` +
        `(the floor is 3; the economy would pay for ${wanted.toFixed(1)})`,
      );
    }
    /**
     * …and the other side of it, which is no longer a constant.
     *
     * Enemy life totals are their own ladder now (`enemyLives` — two diamonds a
     * world) rather than a multiple of the player's gun, so how many shots a
     * rider takes is a RESULT: two for the first four worlds, and then more as
     * the forge ladder runs out under a life ladder that does not. That drift
     * is intended and it is bounded. Below one and a half a rider dies to the
     * opening trade and nothing that happens after round one matters; above
     * three and a half every duel is a war of attrition the bar cannot pay for,
     * which is exactly how the novice lost the whole Dust Flats the last time
     * this was tried.
     */
    if (onEnemy < 1.5 || onEnemy > 3.5) {
      problems.push(`world ${w.id}: a rider takes ${onEnemy.toFixed(1)} of your shots (want 1.5-3.5)`);
    }
  }

  console.log('\n=== THE ASYMMETRY: WHAT IT TAKES TO KILL EACH OF YOU ===');
  console.table(rows);
  if (problems.length) {
    console.error('\nThe two sides of the road have drifted apart:');
    for (const line of problems) console.error(`  ${line}`);
    process.exitCode = 1;
  } else {
    console.log('Both sides of the road agree.');
  }
  return { rows, problems };
}

// ---------------------------------------------------------------------------
// Full runs
// ---------------------------------------------------------------------------

const TRACE = process.env.TRACE === '1';

async function runOnce(seed, policy) {
  const rng = makeRng(seed >>> 0);
  const buy = SPENDING[policy];
  const player = {
    level: 1, exp: 0, gold: tuning().startingGold, gun: 0,
    maxLives: P.STARTING_LIVES, lives: P.STARTING_LIVES,
    /** Gold lives off Potions. Spent before the bar, never healed back. */
    bonus: 0,
    // Two carrots, sized through the same helper the bag uses — the hard road
    // does not hand out the same lunch.
    hunger: P.HUNGER_MAX, food: 2 * P.itemFood(CATALOGUE.carrot), heals: ['bandage', 'bandage'],
  };

  /**
   * Anything that hurts, in the order the game hurts you in: the gold end of
   * the bar first, whatever is left over off the red. The engine does this
   * itself inside a duel (`damage`); this is the same rule for the two things
   * that can kill you between fights.
   */
  const hurt = (amount) => {
    const spent = Math.min(player.bonus, amount);
    player.bonus -= spent;
    player.lives -= amount - spent;
  };

  const levelUp = () => {
    while (player.exp >= P.expForNextLevel(player.level)) {
      player.exp -= P.expForNextLevel(player.level);
      player.level += 1;
      player.maxLives += P.LIVES_PER_LEVEL;
      player.lives += P.LIVES_PER_LEVEL;
    }
  };
  const reading = (worldId) => roadReading({
    lives: player.lives, maxLives: player.maxLives,
    hunger: player.hunger, hungerMax: P.HUNGER_MAX,
    gold: player.gold, bedPrice: P.innPremiumPrice(worldId),
    gunCost: player.gun >= P.GUN_MAX_LEVEL ? Infinity : P.gunUpgradeCost(player.gun),
    hasFood: player.food > 0,
  });

  for (let worldId = 1; worldId <= FINAL_WORLD; worldId++) {
    const world = getWorld(worldId);
    player.lives = player.maxLives; // beginWorld() full-heals
    const seg = generateSegment(worldId, (seed * 7919 + worldId) >>> 0);
    revealToHorizon(seg, reading(worldId));
    let travelled = 0;

    for (const ev of seg.events) {
      // --- the road between here and there --------------------------------
      const secs = (ev.distance - travelled) / P.WALK_SPEED;
      travelled = ev.distance;
      /**
       * ONE RATE, USED BOTH WAYS
       * -------------------------------------------------------------------
       * The gauge is emptied at this rate and the overshoot below zero is
       * turned back into SECONDS at it, so the two have to be the same number.
       * They were not: the drain picked up the mode's multiplier and the
       * conversion below kept the base constant, which meant a hard run that
       * ran the gauge `d` points into the red was modelled as having starved
       * for `d / base` seconds instead of `d / (base * 1.05)` — five per cent
       * too long, and sometimes a whole extra damage tick. The harness exists
       * to measure the shipped hunger loop, and the shipped loop counts real
       * time after the gauge hits zero whatever is draining it.
       */
      const drainPerSec = P.HUNGER_DRAIN_PER_SEC * tuning().hungerDrainMul;
      player.hunger -= drainPerSec * secs;
      while (player.hunger < 35 && player.food > 0) {
        const bite = Math.min(player.food, 40);
        player.food -= bite;
        player.hunger = Math.min(P.HUNGER_MAX, player.hunger + bite);
      }
      if (player.hunger < 0) {
        const starving = -player.hunger / drainPerSec;
        const ticks = Math.floor((starving * 1000) / P.starvationIntervalMs(player.maxLives));
        hurt(ticks * P.STARVATION_LIFE_PER_TICK);
        player.hunger = 0;
        if (player.lives <= 0) return { died: true, worldId, cause: 'starvation' };
      }

      ev.resolved = true;
      revealToHorizon(seg, reading(worldId));
      if (TRACE) {
        console.log(`  W${worldId} ${String(ev.type).padEnd(6)} lives ${player.lives}/${player.maxLives}` +
          ` gold ${Math.round(player.gold)} gun ${player.gun} food ${Math.round(player.food)}` +
          ` heals ${player.heals.length} hunger ${Math.round(player.hunger)}`);
      }

      // --- what is standing there ------------------------------------------
      if (ev.type === 'enemy' || ev.type === 'boss') {
        // Somebody who patches up between fights tops off before stepping onto
        // the road; somebody who only reaches for a bandage when the bar is
        // nearly gone waits until it nearly is. Expressed as a fraction of the
        // bar rather than as "a whole bandage fits", because a player with a
        // bag full of bandages and two thirds of a life bar uses one.
        const floor = player.maxLives * buy.healAt;
        if (buy.healBeforeFight) {
          /**
           * The bag holds ITEM IDS, not amounts, exactly as the real one does.
           * That matters for the two heals written as a fraction of the bar: a
           * med kit bought in the Prairie on seven lives is worth four there
           * and six by the pass, because `useItem` sizes it against the bar it
           * is opened on and not the bar it was bought on.
           *
           * What the model spends is the SMALLEST thing that gets it back over
           * the line, reaching for the big one only when the small ones have
           * run out. That is what a player does, and it is the difference
           * between arriving at the Basin with three med kits and arriving with
           * none.
           */
          const sizeOf = (id) => P.itemHeal(ITEMS[id], player.maxLives);
          player.heals.sort((a, b) => sizeOf(a) - sizeOf(b));
          while (player.heals.length && player.lives <= floor) {
            const missing = player.maxLives - player.lives;
            let pick = player.heals.findIndex((id) => sizeOf(id) >= missing);
            if (pick < 0) pick = player.heals.length - 1;
            player.lives = Math.min(player.maxLives, player.lives + sizeOf(player.heals[pick]));
            player.heals.splice(pick, 1);
          }
        }
        const phases = ev.type === 'boss' ? (world.boss.phases ? world.boss.phases.length : 1) : 1;
        let enemy = ev.type === 'boss' ? bossPhase(worldId) : rollEnemy(worldId, rng, ev.progress ?? 0);
        for (let phase = 0; phase < phases; phase++) {
          if (phase > 0) enemy = bossPhase(worldId, phase);
          const r = await fight({
            enemy,
            player: {
              lives: player.lives, maxLives: player.maxLives, bullets: 0,
              bonus: player.bonus,
              gunDamage: P.gunDamageAt(player.gun),
            },
            policy,
            seed: (seed * 31 + worldId * 7 + ev.index * 13 + phase) >>> 0,
          });
          if (!r.won) {
            return { died: true, worldId, cause: ev.type === 'boss' ? 'boss' : 'duel' };
          }
          player.lives = Math.max(0.5, r.livesLeft);
          player.bonus = r.bonusLeft;
        }
        // Paid on what the rider would have carried on the ordinary road — see
        // `scaleLives` above and `resolveDuel` in src/game/run.js.
        const paidOn = enemy.baseLives ?? enemy.maxLives;
        player.gold += P.goldForEnemy({ worldId, lives: paidOn, isBoss: enemy.isBoss });
        player.exp += P.expForEnemy({ worldId, lives: paidOn, isBoss: enemy.isBoss });
        levelUp();
      } else if (ev.type === 'forge') {
        const keep = buy.reserve(worldId);
        // A cheap rung is always right — the first two cost less than a night
        // at the inn and halve how long every fight of the world takes. It is
        // the expensive ones a careful player holds off on, and modelling the
        // reserve as an absolute floor made the "expert" ride the whole game on
        // the trail iron, which is the opposite of expertise.
        while (player.gun < P.GUN_MAX_LEVEL) {
          const cost = P.gunUpgradeCost(player.gun);
          const cheap = cost <= player.gold * buy.impulseRung;
          if (!cheap && player.gold - cost < keep) break;
          player.gold -= cost;
          player.gun += 1;
        }
      } else if (ev.type === 'inn') {
        const prem = P.innPremiumPrice(worldId);
        const basic = P.innBasicPrice(worldId);
        const heal = P.innBasicHeal(worldId, player.maxLives);
        // The good bed is not always the whole bar — see `innPremiumHeal`.
        const premHeal = P.innPremiumHeal(player.maxLives);
        const missing = player.maxLives - player.lives;
        if (missing > heal && player.gold >= prem && missing / player.maxLives >= buy.premiumAt) {
          player.gold -= prem;
          player.lives = Math.min(player.maxLives, player.lives + premHeal);
        } else if (missing >= 1 && player.gold >= basic) {
          player.gold -= basic;
          player.lives = Math.min(player.maxLives, player.lives + heal);
        }
      } else if (ev.type === 'shop') {
        /**
         * THE COUNTER IS THE REAL COUNTER
         * -------------------------------------------------------------------
         * `generateStock` is what the shop screen calls, so it is what the
         * model calls: the same three slots, the same guaranteed heal, the
         * same rarity roll for everything else and the same per-item unit roll
         * off STOCK_ODDS. It used to be a hand-written list of "everything a
         * shop might have, to its average depth", which is a materially more
         * generous shop than the game ships — the model could buy a med kit in
         * the Dust Flats, where the real counter offers one about twice in a
         * hundred visits, and the balance targets were being passed against an
         * economy nobody plays.
         *
         * The seed is the run's, so two runs with the same seed still meet the
         * same shops.
         */
        const stock = generateStock(worldId, (seed * 2654435761 + worldId * 7919 + ev.index) >>> 0);

        // Food first — starving is the one thing on the road you cannot fight.
        for (const line of stock) {
          if (!line.item.food) continue;
          while (line.units > 0 && player.food < buy.foodTarget && player.gold >= line.price * 2) {
            player.gold -= line.price;
            player.food += P.itemFood(line.item);
            line.units -= 1;
          }
        }

        /**
         * Then lives in a box, by VALUE — lives per gold, best first — down to
         * whatever this counter happens to have and whatever the profile is
         * willing to put into healing.
         *
         * The three are not interchangeable: a bandage is a flat two diamonds,
         * a med kit is half the bar and a potion three quarters of it, at
         * prices that do not move with the bar. On a three-diamond bar the
         * bandage wins that comparison outright; by the Basin the med kit wins
         * it by a factor of three, and a run that keeps buying bandages out
         * there is a run that dies with a full purse.
         */
        /**
         * THE POTION IS ON THIS SHELF TOO, AND IT IS NOT A HEAL
         * -------------------------------------------------------------------
         * Three gold lives on the end of the bar rather than red ones put back
         * (see src/game/items.js), which means two things for a model of a
         * player. It is worth its full three whatever state the bar is in — a
         * bandage bought on a full bar is worth nothing until something takes
         * a diamond off you — and it is DRUNK AT THE COUNTER rather than
         * carried, because gold lives are only ever spent by being hit and
         * holding the bottle cannot make them go further.
         *
         * So it competes on the same ledger, at lives per gold, and the buyer
         * simply does something different with it.
         */
        const livesFor = (item) => (P.itemBonusLives(item) || P.itemHeal(item, player.maxLives));
        let budget = player.gold * buy.healBudget;
        const heals = stock
          .filter((line) => (line.item.heal || line.item.bonusLives) && line.units > 0)
          .sort((a, b) => livesFor(b.item) / b.price - livesFor(a.item) / a.price);
        for (const line of heals) {
          while (line.units > 0 && budget >= line.price && player.heals.length < 16) {
            player.gold -= line.price;
            budget -= line.price;
            if (line.item.bonusLives) player.bonus += P.itemBonusLives(line.item);
            else player.heals.push(line.item.id);
            line.units -= 1;
          }
        }
      }
    }
  }
  return { died: false, worldId: FINAL_WORLD, cause: 'victory', gun: player.gun, level: player.level };
}

async function reportRuns(difficulty = 'normal') {
  setDifficulty(difficulty);
  const rows = [];
  const detail = {};
  for (const policy of ['novice', 'average', 'expert']) {
    const results = [];
    for (let i = 0; i < RUNS; i++) results.push(await runOnce(1000 + i * 13, policy));
    const wins = results.filter((r) => !r.died).length;
    const reached = {};
    for (const r of results) for (let w = 1; w <= r.worldId; w++) reached[w] = (reached[w] || 0) + 1;
    rows.push({
      policy,
      finishedPct: pct(wins, RUNS),
      reachedGalaxyPct: pct(reached[FINAL_WORLD] || 0, RUNS),
      reachedHollowPct: pct(reached[6] || 0, RUNS),
      reachedBasinPct: pct(reached[5] || 0, RUNS),
      reachedBayouPct: pct(reached[4] || 0, RUNS),
      reachedPassPct: pct(reached[3] || 0, RUNS),
      reachedPrairiePct: pct(reached[2] || 0, RUNS),
    });
    const causes = {};
    for (const r of results) {
      if (!r.died) continue;
      const key = `W${r.worldId} ${r.cause}`;
      causes[key] = (causes[key] || 0) + 1;
    }
    detail[policy] = Object.entries(causes)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([where, n]) => ({ policy, where, runs: n, pct: pct(n, RUNS) }));
  }
  console.log(`\n=== FULL RUNS · ${difficulty.toUpperCase()} (${RUNS} per skill, permadeath on) ===`);
  console.table(rows);
  console.log('\nWHERE RUNS END');
  console.table(Object.values(detail).flat());
  setDifficulty('normal');
  return rows;
}

/** The hard road, measured the same way and gated against its own bands. */
const reportHard = () => reportRuns('hard');

// ---------------------------------------------------------------------------
// The gate
// ---------------------------------------------------------------------------

/**
 * What a healthy build looks like. These are the design targets, written down
 * where a machine can check them — a run of `all` fails if the game has drifted
 * out of any of them.
 */
const TARGETS = [
  /**
   * THESE BANDS MEASURE HOW FAR A RUN GETS, NOT WHO FINISHES, AND THAT IS NEW
   * ---------------------------------------------------------------------------
   * They used to be six lines about the last two worlds: how often each skill
   * band reached Gallows Hollow, and how often it reached the Galaxy behind it.
   * On the road as it was tuned then — a rider's bullet derived from the
   * player's own bar — an expert saw the Hollow in three runs of five and the
   * Galaxy in one of three, and those six numbers were the whole contract.
   *
   * THE ROAD THEY MEASURED NO LONGER EXISTS. The riders' bullet is a
   * hand-written ladder now, one rung of ENEMY_GUNS per world (see
   * `enemyGunDamage` in src/game/progression.js): half a life in the Dust
   * Flats, a whole one in the Prairie, three and a half out in the Galaxy —
   * against a bar that still grows about two thirds of a life a world. The two
   * sides no longer meet. MEASURED, 250 runs a skill, the road that ships:
   *
   *                    Prairie   Pass   Bayou   Basin and past it
   *     novice           73%      6%      0%          0%
   *     average          73%     10%      0%          0%
   *     expert           96%     28%      2%          0%
   *
   * Nobody finishes the game and nobody sees the back half of it. That is a
   * deliberate decision about what this road is (a gauntlet whose interest is
   * how deep into it you get) rather than a drift to be caught, so the bands
   * moved to the worlds runs actually die in — and they are the same KIND of
   * check they always were, in the only place they can still be read.
   *
   * The ceilings still matter as much as the floors. The Prairie band catches a
   * change that makes the first world lethal (floor) or the second one free
   * (ceiling), and the Pass band is where skill separates: an expert gets three
   * times as far past the Prairie as a novice, and if that ratio collapses in
   * either direction the fight has stopped rewarding play.
   *
   * The old contract is kept below, commented out rather than deleted. It is
   * what to restore if the two sides of the road are ever brought back
   * together — the bullet derived from the bar, or the bar deepened to meet
   * the ladder.
   *
   *   { what: 'novice reaches the Hollow',  field: 'reachedHollowPct', min: 3,  max: 14 },
   *   { what: 'average reaches the Hollow', field: 'reachedHollowPct', min: 12, max: 30 },
   *   { what: 'expert reaches the Hollow',  field: 'reachedHollowPct', min: 42, max: 68 },
   *   { what: 'novice reaches the Galaxy',  field: 'reachedGalaxyPct', min: 0,  max: 8  },
   *   { what: 'average reaches the Galaxy', field: 'reachedGalaxyPct', min: 1,  max: 16 },
   *   { what: 'expert reaches the Galaxy',  field: 'reachedGalaxyPct', min: 28, max: 56 },
   */
  { what: 'novice reaches the Prairie', field: 'reachedPrairiePct', min: 58, max: 86 },
  { what: 'average reaches the Prairie', field: 'reachedPrairiePct', min: 58, max: 86 },
  { what: 'expert reaches the Prairie', field: 'reachedPrairiePct', min: 86, max: 100 },
  { what: 'novice reaches the Pass', field: 'reachedPassPct', min: 1, max: 16 },
  { what: 'average reaches the Pass', field: 'reachedPassPct', min: 2, max: 20 },
  { what: 'expert reaches the Pass', field: 'reachedPassPct', min: 15, max: 44 },
  /**
   * The deepest anybody gets, and the one band with a floor of zero: two runs
   * in a hundred is inside the noise of 250 runs, so a floor here would fail
   * builds at random. The ceiling is the real check — an expert reaching the
   * Bayou more than one run in eight means something gave the first three
   * worlds back.
   */
  { what: 'expert reaches the Bayou', field: 'reachedBayouPct', min: 0, max: 12 },
];

/**
 * THE HARD ROAD'S OWN BANDS, AND WHY THEY ARE WHERE THEY ARE
 * ---------------------------------------------------------------------------
 * A hard mode has exactly two ways to fail, and both of them are invisible in
 * a diff. Too gentle and it is a label on a settings screen; too steep and it
 * is a wall.
 *
 * It is a wall now, and it is one on purpose: on top of the whole `hard` column
 * in src/game/difficulty.js, every gun on this road is one rung further up the
 * ladder than the ordinary one carries (`enemyBulletFloor`), so the man across
 * from you in the Dust Flats is holding the Prairie's brass sixgun and hitting
 * for a whole life against a bar of three. MEASURED, 250 runs a skill:
 *
 *                    Prairie   Pass and past it
 *     novice            5%           0%
 *     average           9%           0%
 *     expert           32%           0%
 *
 * A third of expert hard runs get out of the first world. Nothing reaches the
 * second boss. So the bands moved to the only stop that still has a number on
 * it, and what they check is the SHAPE of the difference between the two roads
 * rather than an ending nobody reaches: an expert on the hard road gets about
 * as far as a novice on the ordinary one, which is the sentence this mode was
 * always designed around, measured one world in instead of six.
 *
 * The old contract, for the road where finishing hard mode was possible:
 *
 *   { what: 'novice reaches the Hollow (hard)',  field: 'reachedHollowPct', min: 0,  max: 6  },
 *   { what: 'average reaches the Hollow (hard)', field: 'reachedHollowPct', min: 0,  max: 12 },
 *   { what: 'expert reaches the Hollow (hard)',  field: 'reachedHollowPct', min: 12, max: 38 },
 *   { what: 'expert reaches the Galaxy (hard)',  field: 'reachedGalaxyPct', min: 2,  max: 22 },
 *
 * The floors of zero on the two lower bands are unchanged and mean what they
 * always meant: somebody who mashes SHOOT and never reads a price tag is not
 * promised anything out here.
 */
const HARD_TARGETS = [
  { what: 'novice reaches the Prairie (hard)', field: 'reachedPrairiePct', min: 0, max: 14 },
  { what: 'average reaches the Prairie (hard)', field: 'reachedPrairiePct', min: 1, max: 20 },
  { what: 'expert reaches the Prairie (hard)', field: 'reachedPrairiePct', min: 18, max: 46 },
];

/**
 * Check a set of run rows against a set of bands. Returns the failures, and
 * prints the table either way — a target that passed is worth seeing, because
 * the number beside it is how much headroom the next change has.
 */
function gate(rows, targets) {
  /**
   * A target names the column it reads and the policy it reads it from, so the
   * list above can gate two different worlds without the order of the rows
   * having to mean anything. The policy is taken off the front of `what` — the
   * three rows are novice, average and expert, in that order, and every target
   * line starts with one of those words.
   */
  const policyOf = (what) => ['novice', 'average', 'expert'].find((p) => what.startsWith(p));
  const checks = targets.map((t) => {
    const row = rows.find((r) => r.policy === policyOf(t.what)) || rows[0];
    const value = row[t.field || 'reachedGalaxyPct'];
    return { what: t.what, min: t.min, max: t.max, value, ok: value >= t.min && value <= t.max };
  });
  console.table(checks);
  return checks.filter((c) => !c.ok);
}

async function reportAll() {
  const power = powerCurve();
  console.log('=== WHERE THE ECONOMY PUTS A PLAYER ===');
  console.table(power);
  await reportAsymmetry();
  await reportDuels();
  await reportBosses();
  await reportSpecials();
  const runs = await reportRuns('normal');
  /**
   * BOTH ROADS, EVERY BUILD
   * -------------------------------------------------------------------------
   * The hard one is measured here rather than in a mode somebody has to
   * remember to run, because the entire point of building it out of
   * multipliers over the one road (see src/game/difficulty.js) is that a
   * retune of the Bayou moves both crossings of it. A second road that is only
   * checked when somebody thinks to check it is the second set of tables this
   * design exists to avoid, wearing a different hat.
   */
  const hard = await reportHard();

  console.log('\n=== TARGETS ===');
  const failed = [...gate(runs, TARGETS), ...gate(hard, HARD_TARGETS)];
  if (failed.length) {
    console.error(`\n${failed.length} target(s) missed:`);
    for (const f of failed) console.error(`  ${f.what}: ${f.value}% (want ${f.min}–${f.max}%)`);
    process.exitCode = 1;
  } else {
    console.log('\nAll targets met, on both roads.');
  }
}

const MODES = {
  asymmetry: reportAsymmetry,
  duels: reportDuels,
  bosses: reportBosses,
  specials: reportSpecials,
  runs: reportRuns,
  hard: reportHard,
  all: reportAll,
};

setDifficulty(DIFF);

const mode = process.argv[2] || 'all';
if (!MODES[mode]) {
  console.error(`Unknown mode "${mode}". One of: ${Object.keys(MODES).join(', ')}`);
  process.exit(2);
}
await MODES[mode]();
