/**
 * SHOOT! — Duel screen.
 *
 * The presentation of a duel: three big buttons, both fighters' lives and
 * bullets, the round-by-round animation, and the battle overview that closes
 * the fight (the feature the third version was best remembered for).
 *
 * Readability rules:
 *  - Both fighters are drawn the same way: name, lives, and a six-chamber
 *    cylinder. An empty gun is six dark holes — the old screen printed the
 *    words "no bullets" under each fighter on every round of every duel.
 *  - Each button carries its cost as pips, not as a sentence. "+1 bullet · you
 *    are open" under Reload was the rulebook reprinted on every turn; the rules
 *    belong in How to Play, and the button belongs to the player who already
 *    knows them.
 *  - One callout line states the situation, and it sits directly above the
 *    controls so it never covers the duellists.
 *  - The enemy's abilities are shown up front, so nothing is a surprise twice —
 *    as icons, not as words. Poison, dynamite, bullet steal and mind control
 *    are things the player should recognise on sight, and the row of names they
 *    used to be was the only part of the screen asking to be read twice. The
 *    names are still on the tooltip and on `aria-label`.
 *  - What is currently *happening* to a fighter is separate from what they can
 *    do: live effects sit in their own row and count down.
 *
 * All rules live in duel-engine.js. This file never decides an outcome.
 */

import { el, clearNode, wait } from '../core/dom.js';
import { attachButtonSounds, play, playMusic } from '../core/audio.js';
import { setRenderer } from '../core/scene.js';
import { getState, setLives, hasVest, consumeVest, isImmuneToEffects, countOf } from '../game/player.js';
import { getWorld, FINAL_WORLD } from '../game/worlds.js';
import { generateEnemy, generateBoss, nextBossPhase, ABILITY_LABELS } from '../game/enemies.js';
import { createDuel, MOVES } from './duel-engine.js';
import { createLocalAgent, createAiAgent } from './duel-ai.js';
import { createDuelScene } from './duel-scene.js';
import { CHARACTER_TIMING } from '../art/sprites-character.js';
import { getWeatherState } from '../explore/weather.js';
import { getTimeState } from '../explore/daynight.js';
import { resolveDuel } from '../game/run.js';
import { openInventory } from '../ui/inventory-panel.js';
import {
  livesRow,
  updateLivesRow,
  cylinder,
  updateCylinder,
  icon,
  uiIcon,
  iconButton,
  statTile,
} from '../ui/widgets.js';
import { MAX_BULLETS } from './duel-engine.js';
import { getSettings } from '../core/settings.js';
import { toast } from '../ui/toast.js';
import { openHowToPlay } from '../ui/help.js';

/**
 * How long the screen waits on each beat of a round, in milliseconds.
 *
 * DRAW_MS covers the four-frame draw in src/art/sprites-character.js, so the
 * guns are levelled before either of them fires; BULLET_MS covers the tracer's
 * flight, so a life is only lost once the round has actually arrived.
 */
const DRAW_MS = 4 * CHARACTER_TIMING.aim;
const BULLET_MS = 260;

/** Combine weather and night into the modifier set the engine understands. */
function buildModifiers() {
  const weather = getWeatherState();
  const time = getTimeState();
  const mods = { ...(weather.duel || {}) };
  if (time.isNight) {
    mods.enemyAccuracyPenalty = (mods.enemyAccuracyPenalty || 0) + 0.1;
    mods.night = true;
  }
  mods.weatherLabel = weather.label;
  mods.weatherId = weather.id;
  return mods;
}

export const DuelScreen = {
  id: 'duel',

  mount(root, params = {}) {
    const player = getState();
    const world = getWorld(player.world);
    const isBoss = !!params.isBoss;
    const modifiers = buildModifiers();

    let enemy = isBoss
      ? generateBoss(player.world)
      : generateEnemy(player.world, (player.seed ^ ((params.encounter?.index ?? 0) * 2246822519)) >>> 0);

    playMusic(player.world === FINAL_WORLD ? 'themeGalaxy' : 'themeDuel');

    const scene = createDuelScene({
      worldId: player.world,
      biome: world.biome,
      tint: world.tint,
      seed: player.seed,
      enemySprites: enemy.sprites,
      shakeEnabled: getSettings().screenShake,
    });
    setRenderer(scene);

    const localAgent = createLocalAgent();
    let aiAgent = createAiAgent(enemy, modifiers, { thinkMs: 120 });

    const duel = createDuel({
      player: {
        name: 'You',
        lives: player.lives,
        maxLives: player.maxLives,
        bullets: 0,
        hasVest: hasVest(),
        immune: isImmuneToEffects(),
      },
      enemy,
      playerAgent: localAgent,
      enemyAgent: aiAgent,
      modifiers,
      onEvent: handleEngineEvent,
    });

    const roundLog = [];
    let vestConsumed = false;
    let finished = false;

    // --- fighter cards -----------------------------------------------------
    const playerLives = livesRow(player.lives, player.maxLives, { large: true });
    const enemyLives = livesRow(enemy.lives, enemy.maxLives, { large: true });
    const playerCylinder = cylinder(0, MAX_BULLETS);
    const enemyCylinder = cylinder(enemy.bullets || 0, MAX_BULLETS);
    // The tooltip is the archetype's own one-line description of itself, so
    // hovering a name says what you are looking at rather than repeating it.
    const enemyName = el('div.fighter-name', { text: enemy.name, 'data-tip': enemy.look || null });
    const enemyAbilities = el('div.effect-row');
    // What is currently working on each fighter, as opposed to what they can
    // do. Rebuilt every round from the engine's own state.
    const playerStatus = el('div.effect-row');
    const enemyStatus = el('div.effect-row');
    const playerCard = el('div.fighter-card', {}, [
      el('div.fighter-name', { text: 'You' }),
      playerLives,
      playerCylinder,
      playerStatus,
    ]);
    const enemyCard = el('div.fighter-card.is-enemy', {}, [
      enemyName,
      enemyLives,
      enemyCylinder,
      enemyAbilities,
      enemyStatus,
    ]);

    /**
     * The enemy's abilities, as pictures.
     *
     * They used to be a row of words under the fighter — "Bullet Steal",
     * "Mind Control" — which is the same information the icon carries, in the
     * one form that has to be read rather than recognised, on a screen where
     * the player is already reading a callout and three buttons. Every one of
     * these has had an icon since src/art/sprites-items.js grew the last two.
     * The name is still there for anyone who hovers or is using a reader.
     */
    function renderAbilities() {
      clearNode(enemyAbilities);
      (enemy.abilities || []).forEach((a) => enemyAbilities.append(effectBadge(a)));
      if (isImmuneToEffects() && (enemy.abilities || []).length) {
        enemyAbilities.append(
          effectBadge('immune', { label: 'Blocked by diadem', tone: 'is-blocked' }),
        );
      }
    }

    /**
     * Live status on a fighter: what is currently working on them, as opposed
     * to what they are capable of. Poison is the one the engine tracks, and it
     * counts down, so the badge carries the number of rounds left.
     */
    function renderStatus(row, side) {
      clearNode(row);
      if (side.poison > 0) {
        row.append(
          effectBadge('poison', {
            label: `Poisoned — ${side.poison} round${side.poison === 1 ? '' : 's'} left`,
            tone: 'is-active',
            count: side.poison,
          }),
        );
      }
      if (side.hasVest) {
        row.append(effectBadge('vest', { label: 'Vest — stops one fatal shot', tone: 'is-good' }));
      }
      if (side.immune) {
        row.append(effectBadge('immune', { label: 'Diadem — effects cannot touch you', tone: 'is-good' }));
      }
    }

    // --- centre ------------------------------------------------------------
    const roundPill = el('div.round-pill', { text: 'Round 1' });
    const callout = el('div.duel-callout.is-waiting', { role: 'status', 'aria-live': 'polite' }, [
      el('span', { text: 'Choose your move' }),
    ]);

    const atmosChips = [
      modifiers.weatherLabel && modifiers.weatherId !== 'clear'
        ? el('span.chip.chip--danger', {
            text: modifiers.weatherLabel,
            'data-tip': modifiers.misfireChance
              ? 'Wet powder — shots sometimes misfire'
              : 'Poor visibility — they read you less well',
          })
        : null,
      modifiers.night
        ? el('span.chip.chip--danger', { text: 'Night', 'data-tip': 'They aim worse in the dark' })
        : null,
      isBoss ? el('span.chip.chip--legendary', { text: 'Boss' }) : null,
    ].filter(Boolean);

    // --- controls ----------------------------------------------------------
    const buttons = {};
    const MOVE_SFX = { [MOVES.RELOAD]: 'reload', [MOVES.SHIELD]: 'shield', [MOVES.SHOOT]: 'shot' };

    /**
     * One move plate: icon, name, keyboard hint, and a cost strip.
     *
     * The cost strip is a picture of the transaction — a round gained, a round
     * spent, or nothing — rather than a line of prose. `tip` carries the full
     * explanation for anyone who hovers, and `aria-label` carries it for anyone
     * who cannot see the plate at all.
     */
    function moveButton(move, { label, iconName, key, cls, cost, tip }) {
      // `data-sfx` lets attachButtonSounds play the move's own cue instead of
      // the generic click, so pressing Shoot sounds like a revolver.
      const costNode = el('span.duel-cost', {}, cost());
      const btn = el(`button.btn.duel-btn.${cls}`, {
        onclick: () => submit(move),
        dataset: { sfx: MOVE_SFX[move] },
        'data-tip': tip,
        'aria-label': `${label}. ${tip}`,
      }, [
        uiIcon(iconName, 1.3),
        el('span.duel-btn-label', {}, [label, el('span.kbd', { text: key })]),
        costNode,
      ]);
      buttons[move] = btn;
      btn.costNode = costNode;
      btn.renderCost = () => {
        clearNode(costNode);
        cost().forEach((child) => child && costNode.append(child));
      };
      return btn;
    }

    const pip = (spent = false) => el('span.pip', { class: spent ? 'is-spent' : '' });

    const controls = el('div.duel-controls', {}, [
      moveButton(MOVES.RELOAD, {
        label: 'Reload',
        iconName: 'chamber',
        key: '1',
        cls: 'duel-btn--reload',
        cost: () => [el('span', { text: '+' }), pip()],
        tip: 'Load one round. You are open to a shot this turn.',
      }),
      moveButton(MOVES.SHIELD, {
        label: 'Shield',
        iconName: 'shieldPlate',
        key: '2',
        cls: 'duel-btn--shield',
        cost: () => [el('span', { text: 'Safe' })],
        tip: 'Nothing gets through. You gain nothing either.',
      }),
      moveButton(MOVES.SHOOT, {
        label: 'Shoot',
        iconName: 'revolver',
        key: '3',
        cls: 'duel-btn--shoot',
        cost: () => {
          const dry = duel.getSides().player.bullets <= 0;
          return dry ? [el('span', { text: 'Empty' })] : [el('span', { text: '−' }), pip(true)];
        },
        tip: 'Spend one round. Hits a rival who reloaded or shot.',
      }),
    ]);

    const itemButton = el('button.btn.btn--sm.btn--ghost', {
      onclick: () => openBag(),
      'data-tip': 'Use dynamite, poison or a bandage',
    }, [icon('shopTag', 1.1), 'Saddlebag', el('span.kbd', { text: 'I' })]);

    const helpButton = iconButton('question', {
      onClick: () => openHowToPlay(),
      label: 'How to play',
    });

    const screen = el('div.screen.duel-screen', {}, [
      el('div.duel-top', {}, [
        playerCard,
        el('div.duel-center', {}, [roundPill, ...atmosChips]),
        enemyCard,
      ]),
      // The bag and the guide sit on the callout line rather than on a row of
      // their own: a duel on a short screen was pushing them off the bottom.
      el('div.duel-bottom', {}, [
        el('div.duel-extras', {}, [helpButton, callout, itemButton]),
        controls,
      ]),
    ]);

    root.append(screen);
    attachButtonSounds(screen);
    renderAbilities();
    syncBars();

    // --- state sync --------------------------------------------------------
    function syncBars() {
      const sides = duel.getSides();
      updateLivesRow(playerLives, sides.player.lives, sides.player.maxLives);
      updateLivesRow(enemyLives, sides.enemy.lives, sides.enemy.maxLives);
      updateCylinder(playerCylinder, sides.player.bullets);
      updateCylinder(enemyCylinder, sides.enemy.bullets);
      renderStatus(playerStatus, sides.player);
      renderStatus(enemyStatus, sides.enemy);
      roundPill.textContent = `Round ${Math.max(1, duel.getRound() + (localAgent.isWaiting() ? 1 : 0))}`;

      // Shoot swaps its cost strip for "Empty" when the cylinder is out, so a
      // disabled button still says why it is disabled.
      buttons[MOVES.SHOOT].renderCost();
    }

    function setControlsEnabled(enabled) {
      const bullets = duel.getSides().player.bullets;
      for (const [move, btn] of Object.entries(buttons)) {
        btn.disabled = !enabled || (move === MOVES.SHOOT && bullets <= 0);
      }
      itemButton.disabled = !enabled || !hasDuelItems();
      controls.classList.toggle('is-waiting', !enabled);
    }

    function hasDuelItems() {
      return ['dynamite', 'poison', 'bandage', 'potion'].some((id) => countOf(id) > 0);
    }

    function setCallout(text, tone = '') {
      clearNode(callout);
      callout.className = `duel-callout ${tone}`.trim();
      callout.append(el('span', { text }));
    }

    function submit(move, fromKeyboard = false) {
      if (!localAgent.isWaiting()) return;
      if (fromKeyboard) play(MOVE_SFX[move]);
      setControlsEnabled(false);
      setCallout('Both of you draw…', 'is-waiting');
      localAgent.submit(move);
    }

    function openBag() {
      openInventory({
        context: 'duel',
        canUse: (id) => ['dynamite', 'poison', 'bandage', 'potion', 'carrot', 'apple'].includes(id),
        useOpts: () => ({
          lives: duel.getSides().player.lives,
          maxLives: duel.getSides().player.maxLives,
        }),
        onUse: (id, result) => {
          if (result.effect === 'dynamite' || result.effect === 'poison') {
            duel.useItemEffect(result.effect);
            scene.fx.banner = result.effect === 'dynamite' ? 'DYNAMITE!' : 'POISONED!';
            scene.fx.bannerTimer = 900;
            syncBars();
          }
          if (result.effect === 'heal') {
            const sides = duel.getSides();
            sides.player.lives = Math.min(sides.player.maxLives, sides.player.lives + result.amount);
            syncBars();
          }
        },
      });
    }

    const onKey = (e) => {
      if (e.key === '1') submit(MOVES.RELOAD, true);
      if (e.key === '2') submit(MOVES.SHIELD, true);
      if (e.key === '3') submit(MOVES.SHOOT, true);
      if ((e.key === 'i' || e.key === 'I') && !itemButton.disabled) openBag();
    };
    window.addEventListener('keydown', onKey);

    // --- engine events -----------------------------------------------------
    function handleEngineEvent(event) {
      if (event.type === 'vest' && !vestConsumed) {
        vestConsumed = true;
        consumeVest();
        toast('Your vest stopped the bullet', 'good');
        scene.fx.banner = 'VEST HOLDS!';
        scene.fx.bannerTimer = 900;
      }
      // An ability going off lights its own icon rather than printing its name
      // over the fight: the picture is already on screen, and the player has
      // been looking at it since the round started.
      if (event.type === 'ability') flashEffect(enemyAbilities, event.ability);
      if (event.type === 'ability-blocked') {
        flashEffect(enemyStatus, 'immune');
        toast('The diadem blocked it', 'good');
      }
      if (event.type === 'phase') {
        scene.fx.banner = 'PHASE TWO';
        scene.fx.bannerTimer = 1400;
        scene.fx.whiteout = 400;
        scene.fx.shake = 500;
      }
    }

    /**
     * The round, played out.
     *
     * The beats are deliberately uneven. Both fighters go for their guns at the
     * same time — that is the draw, and it is the same length every round so
     * the player learns it. Then the shot: a flash, a tracer crossing the road,
     * and only after it lands does anyone lose a life. Lives used to drop on
     * the same frame the gun came out, which meant the bullet was a decoration
     * arriving after the fact.
     */
    async function animate(res) {
      const draws = (move) => move === MOVES.SHOOT || move === MOVES.RELOAD;
      const poseFor = (move) =>
        move === MOVES.SHIELD ? 'shield' : draws(move) ? 'aim' : 'idle';

      scene.setPose('player', poseFor(res.playerMove));
      scene.setPose('enemy', poseFor(res.enemyMove));

      if (res.playerMove) setCallout(`${moveWord(res.playerMove)} vs ${moveWord(res.enemyMove)}`);
      // Long enough for the four-frame draw to finish: the guns are up before
      // either of them can go off.
      await wait(DRAW_MS);

      if (res.playerFires || res.enemyFires) {
        if (res.playerFires) scene.fire('player');
        if (res.enemyFires) scene.fire('enemy');
        play('shot');
        // A single shot rocks the frame; a simultaneous trade rocks it harder.
        scene.fx.shake = res.playerFires && res.enemyFires ? 220 : 140;
        await wait(BULLET_MS);
      }
      if (res.playerDry || res.enemyDry) play('emptyGun');
      if (res.playerMisfired || res.enemyMisfired) toast('Wet powder — misfire!', 'bad');

      if (res.hits.player) {
        scene.impact('player');
        scene.setPose('player', 'hit');
        scene.fx.shake = 340;
        playerCard.classList.remove('is-hit');
        void playerCard.offsetWidth;
        playerCard.classList.add('is-hit');
        play('hit');
      }
      if (res.hits.enemy) {
        scene.impact('enemy');
        scene.setPose('enemy', 'hit');
        scene.fx.shake = 260;
        enemyCard.classList.remove('is-hit');
        void enemyCard.offsetWidth;
        enemyCard.classList.add('is-hit');
        play('hit');
      }

      syncBars();
      const [text, tone] = describe(res);
      setCallout(text, tone);
      await wait(res.hits.player || res.hits.enemy ? 640 : 400);
      scene.setPose('player', 'idle');
      scene.setPose('enemy', 'idle');
    }

    function moveWord(move) {
      if (move === MOVES.SHOOT) return 'Shoot';
      if (move === MOVES.SHIELD) return 'Shield';
      if (move === MOVES.RELOAD) return 'Reload';
      return '—';
    }

    /** @returns {[string, string]} message and tone class */
    function describe(res) {
      if (res.terminatedBy === 'item') return ['That finished it', 'is-good'];
      if (res.terminatedBy === 'ability') return ['Caught by their trick!', 'is-bad'];
      if (res.hits.player && res.hits.enemy) return ['You both go down a life', 'is-bad'];
      if (res.hits.enemy) return ['You hit them!', 'is-good'];
      if (res.hits.player) return ['They hit you!', 'is-bad'];
      if (res.playerDry) return ['Your gun is empty', 'is-bad'];
      if (res.playerMove === MOVES.SHOOT && res.enemyMove === MOVES.SHIELD) return ['Blocked — bullet wasted', ''];
      if (res.enemyMove === MOVES.SHOOT && res.playerMove === MOVES.SHIELD) return ['You blocked it', 'is-good'];
      if (res.playerMove === MOVES.RELOAD && res.enemyMove === MOVES.RELOAD) return ['You both reload', ''];
      return ['Nothing doing', ''];
    }

    // --- main loop ---------------------------------------------------------
    async function loop() {
      while (!finished) {
        if (duel.isOver()) {
          await endDuel(duel.getResult());
          return;
        }

        setControlsEnabled(true);
        setCallout('Choose your move', 'is-waiting');
        const res = await duel.playRound();
        if (finished) return;
        if (!res) {
          if (duel.isOver()) await endDuel(duel.getResult());
          return;
        }

        if (res.playerMove) {
          roundLog.push(res);
          if (aiAgent.observe) aiAgent.observe(res.playerMove);
        }
        await animate(res);

        if (duel.isOver()) {
          const result = duel.getResult();
          if (result.winner === 'player' && enemy.isBoss) {
            const next = nextBossPhase(enemy);
            if (next) {
              enemy = next;
              // The new agent has to go into the engine, not just this closure.
              aiAgent = createAiAgent(enemy, modifiers, { thinkMs: 120 });
              duel.setEnemy(next, aiAgent);
              // …and the new art has to go into the scene.
              scene.setEnemySprites(next.sprites);
              enemyName.textContent = next.name;
              if (next.look) enemyName.dataset.tip = next.look;
              else delete enemyName.dataset.tip;
              renderAbilities();
              syncBars();
              setCallout('They are not finished…', 'is-bad');
              await wait(1000);
              continue;
            }
          }
          await endDuel(result);
          return;
        }
      }
    }

    async function endDuel(result) {
      finished = true;
      setControlsEnabled(false);
      const won = result.winner === 'player';
      play(won ? 'win' : 'lose');
      scene.fx.banner = won ? 'YOU WIN' : 'YOU LOSE';
      scene.fx.bannerTimer = 1600;

      const sides = duel.getSides();
      setLives(sides.player.lives);
      setCallout(won ? 'You win the duel' : 'You are down', won ? 'is-good' : 'is-bad');

      await wait(720);
      showOverview(won, sides);
    }

    /** Battle overview: the round-by-round table from version 3. */
    function showOverview(won, sides) {
      const rows = roundLog.map((r) =>
        el('tr', {}, [
          el('td', { text: String(r.round) }),
          el('td', { class: `mv mv--${r.playerMove}`, text: labelFor(r.playerMove, r.playerDry) }),
          el('td', { class: `mv mv--${r.enemyMove}`, text: labelFor(r.enemyMove, r.enemyDry) }),
          el('td', { text: outcomeFor(r) }),
        ]),
      );

      const shotsFired = roundLog.filter((r) => r.playerFires).length;
      const hits = roundLog.filter((r) => r.hits.enemy).length;
      const accuracy = shotsFired ? Math.round((hits / shotsFired) * 100) : 0;

      const overlay = el('div.modal-backdrop', {}, [
        el('div.panel.modal.overview', { role: 'dialog', 'aria-label': 'Battle overview' }, [
          el('div', { class: `result-banner ${won ? 'is-win' : 'is-loss'}` }, [
            el('div.headline', { text: won ? 'Duel won' : 'Duel lost' }),
            el('div.muted', { text: `${enemy.name} · ${roundLog.length} rounds` }),
          ]),
          el('div.stat-grid', {}, [
            statTile('Shots fired', shotsFired),
            statTile('Hits', hits),
            statTile('Accuracy', `${accuracy}%`),
            statTile('Lives left', sides.player.lives),
          ]),
          el('div.divider', { text: 'Round by round' }),
          el('div.overview-table-wrap', {}, [
            el('table.overview-table', {}, [
              el('thead', {}, [
                el('tr', {}, [
                  el('th', { text: '#' }),
                  el('th', { text: 'You' }),
                  el('th', { text: enemy.name }),
                  el('th', { text: 'Result' }),
                ]),
              ]),
              el('tbody', {}, rows),
            ]),
          ]),
          el('div.modal-footer', { style: { justifyContent: 'center' } }, [
            el('button.btn.btn--primary', {
              onclick: () => {
                overlay.remove();
                resolveDuel({ won, enemy, isBoss });
              },
            }, [won ? 'Back to the road' : 'Continue']),
          ]),
        ]),
      ]);
      document.getElementById('app').append(overlay);
      attachButtonSounds(overlay);
      overlay.querySelector('.btn--primary')?.focus();
    }

    function labelFor(move, dry) {
      if (!move) return '—';
      if (move === MOVES.SHOOT) return dry ? 'Shoot (empty)' : 'Shoot';
      return move === MOVES.SHIELD ? 'Shield' : 'Reload';
    }

    function outcomeFor(r) {
      if (r.hits.player && r.hits.enemy) return 'Trade';
      if (r.hits.enemy) return 'You hit';
      if (r.hits.player) return 'You were hit';
      if (r.playerMisfired || r.enemyMisfired) return 'Misfire';
      return '—';
    }

    loop();

    return () => {
      finished = true;
      localAgent.cancel();
      window.removeEventListener('keydown', onKey);
    };
  },
};

/** Plain-language explanations for the enemy ability icons. */
const ABILITY_TIPS = {
  bulletSteal: 'They can take one of your bullets',
  poison: 'Poison costs you a life three rounds later',
  dynamite: 'Dynamite ignores your shield',
  mindControl: 'They can scramble your chosen move',
};

/**
 * Effect → the icon that stands for it. Adding an effect to the game means
 * adding a line here and a sprite in src/art/sprites-items.js; there is no
 * text path any more, on purpose.
 */
const EFFECT_ICONS = {
  bulletSteal: 'bulletSteal',
  poison: 'poison',
  dynamite: 'dynamite',
  mindControl: 'mindControl',
  vest: 'vest',
  immune: 'diadem',
};

/** Kick the animation on one badge in a row, if that effect is showing. */
function flashEffect(row, effect) {
  const badge = row?.querySelector(`[data-effect="${effect}"]`);
  if (!badge) return;
  badge.classList.remove('is-firing');
  void badge.offsetWidth; // restart the animation
  badge.classList.add('is-firing');
}

/**
 * One effect, as a framed pixel icon. The word it replaces is still carried by
 * `data-tip` and `aria-label`, so hovering explains it and a screen reader
 * reads it out — the icon replaces the *printed* label, not the information.
 */
function effectBadge(effect, { label, tone = '', count } = {}) {
  const name = label || ABILITY_LABELS[effect] || effect;
  const tip = ABILITY_TIPS[effect] ? `${name} — ${ABILITY_TIPS[effect]}` : name;
  return el('span.effect-badge', {
    class: tone,
    dataset: { effect },
    'data-tip': tip,
    role: 'img',
    'aria-label': tip,
  }, [
    icon(EFFECT_ICONS[effect] || 'skull', 1.15),
    count != null ? el('span.effect-count', { text: String(count) }) : null,
  ]);
}
