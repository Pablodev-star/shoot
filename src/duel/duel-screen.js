/**
 * SHOOT! — Duel screen.
 *
 * The presentation of a duel: three big buttons, both fighters' lives and
 * bullets, the round-by-round animation, and the battle overview that closes
 * the fight (the feature the third version was best remembered for).
 *
 * Readability rules:
 *  - Each button says what it costs and what it does to you, every turn.
 *  - Shoot with no bullets is disabled and says so, instead of failing silently.
 *  - One callout line, centre screen, always states the current situation:
 *    your move / their move / what happened.
 *  - The enemy's abilities are listed up front, so nothing is a surprise twice.
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
import { getWeatherState } from '../explore/weather.js';
import { getTimeState } from '../explore/daynight.js';
import { resolveDuel } from '../game/run.js';
import { openInventory } from '../ui/inventory-panel.js';
import { livesRow, updateLivesRow, icon, statTile } from '../ui/widgets.js';
import { getSettings } from '../core/settings.js';
import { toast } from '../ui/toast.js';
import { openHowToPlay } from '../ui/help.js';

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
    const playerBullets = el('div.bullet-row');
    const enemyBullets = el('div.bullet-row');
    const enemyName = el('div.fighter-name', { text: enemy.name });
    const enemyAbilities = el('div.row.row--tight');
    const playerCard = el('div.fighter-card', {}, [
      el('div.fighter-name', { text: 'You' }),
      playerLives,
      playerBullets,
    ]);
    const enemyCard = el('div.fighter-card.is-enemy', {}, [enemyName, enemyLives, enemyBullets, enemyAbilities]);

    function renderAbilities() {
      clearNode(enemyAbilities);
      (enemy.abilities || []).forEach((a) =>
        enemyAbilities.append(
          el('span.chip.chip--rare', {
            text: ABILITY_LABELS[a] || a,
            'data-tip': ABILITY_TIPS[a] || '',
          }),
        ),
      );
      if (isImmuneToEffects() && (enemy.abilities || []).length) {
        enemyAbilities.append(el('span.chip.chip--legendary', { text: 'Blocked by diadem' }));
      }
    }

    function renderBullets(node, count) {
      clearNode(node);
      for (let i = 0; i < Math.max(count, 0); i++) node.append(icon('bullet', 1.1));
      if (count <= 0) node.append(el('span.empty-label', { text: 'no bullets' }));
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

    function moveButton(move, label, hint, key, cls) {
      // `data-sfx` lets attachButtonSounds play the move's own cue instead of
      // the generic click, so pressing Shoot sounds like a revolver.
      const hintNode = el('span.duel-btn-hint', { text: hint });
      const btn = el(`button.btn.duel-btn.${cls}`, {
        onclick: () => submit(move),
        dataset: { sfx: MOVE_SFX[move] },
        'aria-label': `${label}: ${hint}`,
      }, [
        el('span.duel-btn-top', {}, [
          el('span.duel-btn-label', { text: label }),
          el('span.kbd', { text: key }),
        ]),
        hintNode,
      ]);
      buttons[move] = btn;
      btn.hintNode = hintNode;
      return btn;
    }

    const controls = el('div.duel-controls', {}, [
      moveButton(MOVES.RELOAD, 'Reload', '+1 bullet · you are open', '1', 'duel-btn--reload'),
      moveButton(MOVES.SHIELD, 'Shield', 'nothing gets through', '2', 'duel-btn--shield'),
      moveButton(MOVES.SHOOT, 'Shoot', 'spend 1 bullet', '3', 'duel-btn--shoot'),
    ]);

    const itemButton = el('button.btn.btn--sm.btn--ghost', {
      onclick: () => openBag(),
      'data-tip': 'Use dynamite, poison or a bandage',
    }, [icon('shopTag', 1.1), 'Saddlebag', el('span.kbd', { text: 'I' })]);

    const helpButton = el('button.btn.btn--sm.btn--icon.btn--ghost', {
      onclick: () => openHowToPlay(),
      'aria-label': 'How to play',
      'data-tip': 'How to play',
    }, ['?']);

    const screen = el('div.screen.duel-screen', {}, [
      el('div.duel-top', {}, [
        playerCard,
        el('div.duel-center', {}, [roundPill, ...atmosChips]),
        enemyCard,
      ]),
      callout,
      el('div.duel-bottom', {}, [
        controls,
        el('div.row', { style: { justifyContent: 'center' } }, [itemButton, helpButton]),
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
      renderBullets(playerBullets, sides.player.bullets);
      renderBullets(enemyBullets, sides.enemy.bullets);
      roundPill.textContent = `Round ${Math.max(1, duel.getRound() + (localAgent.isWaiting() ? 1 : 0))}`;

      // The Shoot button explains itself rather than just greying out.
      const dry = sides.player.bullets <= 0;
      buttons[MOVES.SHOOT].hintNode.textContent = dry ? 'no bullets — reload first' : 'spend 1 bullet';
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
      if (event.type === 'ability-blocked') toast('The diadem blocked it', 'good');
      if (event.type === 'phase') {
        scene.fx.banner = 'PHASE TWO';
        scene.fx.bannerTimer = 1400;
      }
    }

    // --- round animation ---------------------------------------------------
    async function animate(res) {
      const poseFor = (move) =>
        move === MOVES.SHOOT ? 'shoot' : move === MOVES.SHIELD ? 'shield' : 'idle';
      scene.fx.playerPose = poseFor(res.playerMove);
      scene.fx.enemyPose = poseFor(res.enemyMove);

      if (res.playerMove) setCallout(`${moveWord(res.playerMove)} vs ${moveWord(res.enemyMove)}`);
      await wait(280);

      if (res.playerFires || res.enemyFires) {
        scene.fx.flash = 140;
        scene.fx.flashSide =
          res.playerFires && res.enemyFires ? 'both' : res.playerFires ? 'player' : 'enemy';
        if (res.playerFires) scene.spawnBullet('player');
        if (res.enemyFires) scene.spawnBullet('enemy');
        play('shot');
        await wait(280);
      }
      if (res.playerDry || res.enemyDry) play('emptyGun');
      if (res.playerMisfired || res.enemyMisfired) toast('Wet powder — misfire!', 'bad');

      if (res.hits.player) {
        scene.fx.playerPose = 'hit';
        scene.fx.shake = 320;
        playerCard.classList.remove('is-hit');
        void playerCard.offsetWidth;
        playerCard.classList.add('is-hit');
        play('hit');
      }
      if (res.hits.enemy) {
        scene.fx.enemyPose = 'hit';
        scene.fx.shake = 240;
        enemyCard.classList.remove('is-hit');
        void enemyCard.offsetWidth;
        enemyCard.classList.add('is-hit');
        play('hit');
      }

      syncBars();
      const [text, tone] = describe(res);
      setCallout(text, tone);
      await wait(res.hits.player || res.hits.enemy ? 640 : 400);
      scene.fx.playerPose = 'idle';
      scene.fx.enemyPose = 'idle';
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
              enemyName.textContent = next.name;
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

/** Plain-language explanations for the enemy ability chips. */
const ABILITY_TIPS = {
  bulletSteal: 'They can take one of your bullets',
  poison: 'Poison costs you a life three rounds later',
  dynamite: 'Dynamite ignores your shield',
  mindControl: 'They can scramble your chosen move',
};
