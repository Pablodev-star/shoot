/**
 * SHOOT! — Exploration screen.
 *
 * Renders the journey and the travelling HUD. All the logic lives elsewhere
 * (walk engine, hunger, day/night, weather, run controller); this file draws and
 * wires buttons.
 *
 * HUD RULES
 *  - One band at the top holds everything: place, lives, hunger, gold. There is
 *    no second panel.
 *  - There is deliberately NO progress bar and NO timer toward the next
 *    encounter.
 *  - There is also no status line. It used to read "Walking" over a picture of
 *    a man walking, then "Riding on" over a picture of a man riding. A caption
 *    that restates the animation is worse than no caption: it takes up the
 *    middle of the screen and teaches the player that the text can be ignored.
 *    Weather and nightfall arrive as a toast when they change and are visible
 *    in the sky the rest of the time.
 *  - The saddlebag is one tap away at all times and pauses the walk while open.
 *  - So is the trail map, once you own one. It is the only readout of what is
 *    coming that the road has, and it is drawn rather than written — see
 *    src/ui/map-panel.js.
 */

import { el } from '../core/dom.js';
import { setRenderer } from '../core/scene.js';
import { EVENTS, on } from '../core/events.js';
import { attachButtonSounds, playMusic } from '../core/audio.js';
import { drawSprite, frameAt, tinted } from '../art/pixel.js';
import {
  getCharacterSprites,
  CHARACTER_TIMING,
  HORSE_TIMING,
  HORSE_FRAME_LIFT,
  RIDER_OFFSET,
  PLAYER_SIZE,
  HORSE_SIZE,
} from '../art/sprites-character.js';
import { createParallax, heroX as heroAnchorX } from './parallax.js';
import { createScare } from './scare.js';
import * as weather from './weather.js';
import { starvationProgress } from './hunger.js';
import { createVitalPops } from '../art/vital-pop.js';
import { createEmberAura } from '../art/ember-aura.js';
import { emberIntensity, horseEmberIntensity } from '../game/wardrobe.js';
import { getEngine, getSlot, quitToMenu } from '../game/run.js';
import { armSigil, slotAccess, openAdminDirect } from '../admin/access.js';
import { getState, getInventory, countOf } from '../game/player.js';
import { getWorld } from '../game/worlds.js';
import { icon, iconButton } from '../ui/widgets.js';
import { trailBand } from '../ui/statusbar.js';
import { openInventory } from '../ui/inventory-panel.js';
import { openTrailMap } from '../ui/map-panel.js';
import { toast } from '../ui/toast.js';
import { confirmDialog } from '../ui/confirm.js';
import { openHowToPlay } from '../ui/help.js';

/**
 * The plain-language notice when the weather turns used to be a table in this
 * file, keyed by weather id. It lives on the weather itself now — a sky that
 * knows how long it lasts and what it does to a duel may as well know what to
 * say when it arrives, and a table out here is one more place to forget to
 * edit when a new one is added.
 */

export const ExploreScreen = {
  id: 'explore',

  mount(root, params = {}) {
    const engine = getEngine();
    const player = getState();
    const world = getWorld(player.world);
    const sprites = getCharacterSprites();
    const parallax = createParallax({
      seed: (player.seed ^ (player.world * 7919)) >>> 0,
      biome: world.biome,
    });
    parallax.setTint(world.tint);

    playMusic('themeWalk');

    // --- HUD ---------------------------------------------------------------
    const band = trailBand({
      hunger: true,
      actions: [
        iconButton('question', { onClick: () => openHowToPlay(), label: 'How to play' }),
        // A labelled button, not a cross: a cross in the corner of a running
        // game reads as "close this panel", and this one abandons the road.
        el('button.btn.btn--sm.btn--ghost', { onclick: () => leave() }, ['Menu']),
      ],
    });

    const bagCount = el('span.bag-count', { text: String(totalItems()) });
    const bagButton = el('button.btn.bag-button', {
      onclick: () => openBag(),
      'data-tip': 'Eat, use or sell what you are carrying',
    }, [icon('shopTag', 1.1), el('span', { text: 'Saddlebag' }), bagCount, el('span.kbd', { text: 'I' })]);

    /**
     * The Map is a tool you own rather than a charge you spend, so it gets its
     * own button on the road: digging through the saddlebag every time you want
     * to know what is coming is the friction that made the old Map dead weight.
     * The button only exists while you actually carry one.
     */
    const mapButton = el('button.btn.map-button', {
      onclick: () => openMap(),
      'data-tip': 'See the road ahead',
    }, [icon('map', 1.1), el('span', { text: 'Map' }), el('span.kbd', { text: 'M' })]);

    function syncMapButton() {
      mapButton.hidden = countOf('map') === 0;
    }

    function totalItems() {
      return getInventory().reduce((sum, e) => sum + e.qty, 0);
    }

    let bagOpen = false;
    function openBag() {
      if (bagOpen) return;
      bagOpen = true;
      engine.pause();
      openInventory({
        context: 'walk',
        onUse: (id, result) => {
          if (result.effect === 'map') openMap();
        },
        onClose: () => {
          bagOpen = false;
          engine.resume();
        },
      });
    }

    /**
     * The trail map. It pauses the walk on its own account: it can be opened
     * from the road as well as from inside the saddlebag, and in the second
     * case the bag is already holding the pause.
     */
    let mapOpen = false;
    function openMap() {
      if (mapOpen) return;
      if (countOf('map') === 0) {
        toast('You are not carrying a map', 'bad');
        return;
      }
      const panel = openTrailMap({
        engine,
        onClose: () => {
          mapOpen = false;
          if (!bagOpen) engine.resume();
        },
      });
      if (!panel) {
        toast('The road ahead is blank', 'bad');
        return;
      }
      mapOpen = true;
      engine.pause();
    }

    /**
     * The safe exit, and the only one. Leaving from the road writes the run as
     * it stands and the slot is waiting when you come back — which is worth
     * saying out loud now that dying does the opposite and erases it
     * (see `die` in src/game/run.js). Nobody should have to find that out from
     * the empty card.
     */
    async function leave() {
      engine.pause();
      const confirmed = await confirmDialog({
        title: 'Leave the road?',
        body: 'Your run is written to its slot as it stands right now, and you can pick it up from the same slot whenever you like. Only dying loses it.',
        confirmLabel: 'Save and leave',
      });
      if (confirmed) await quitToMenu();
      else engine.resume();
    }

    const onKey = (e) => {
      if (e.key === 'i' || e.key === 'I') openBag();
      if ((e.key === 'm' || e.key === 'M') && !mapOpen && !bagOpen) openMap();
    };
    window.addEventListener('keydown', onKey);

    /**
     * THE ONE DOOR THAT IS NOT ON THE SCREEN
     * -----------------------------------------------------------------------
     * A sigil drawn over the road opens the Admin Panel — three big letters,
     * then a passphrase, then three permanent tries per slot and no more. All
     * of it lives in src/admin/, none of it is advertised anywhere in the
     * interface, and nothing here changes for a player who never draws it: the
     * watcher only looks at strokes that start on the backdrop and are a third
     * of the screen across, so the bag, the map button and every drag on the
     * HUD go past it untouched.
     *
     * It is armed on the ROAD and only on the road. That is the spec's own
     * wording — "while you are walking" — and it is also the only screen in
     * the game with something to hold: the walk is paused for as long as the
     * panel is up.
     */
    const sigil = armSigil({
      engine,
      slot: () => getSlot(),
      // The sigil is the other way into the panel, and it is the way a slot
      // gets unlocked in the first place — so when it closes, the button below
      // asks storage again. Without this the button a tester has just earned
      // does not appear until something else remounts this screen.
      onAccessChanged: () => syncAdminButton(),
    });

    /**
     * …AND THE DOOR THAT IS ON THE SCREEN, ONCE THE FIRST ONE HAS BEEN OPENED
     * -----------------------------------------------------------------------
     * A slot that has been through the sigil and the passphrase is an admin
     * slot for good, so it gets a button: one tap, no letters, no word to type.
     * It is hidden by default in the only sense that matters — it does not
     * exist at all until the slot is unlocked — and it can be put away again
     * from inside the panel, which is what the `hidden` sync below reads.
     *
     * A player who has never opened the door has no way of knowing it is a
     * button that could ever be here: the node is created hidden and only
     * unhidden by an answer from storage that says this slot is already in.
     */
    let adminOpen = false;
    const adminButton = el('button.btn.admin-shortcut', {
      hidden: true,
      onclick: () => openPanel(),
      'data-tip': 'Open the workbench',
    }, [el('span', { text: 'Admin' })]);

    async function syncAdminButton() {
      const access = await slotAccess(getSlot());
      adminButton.hidden = !(access.unlocked && access.shortcut);
    }

    async function openPanel() {
      if (adminOpen) return;
      adminOpen = true;
      try {
        await openAdminDirect({ engine, slot: getSlot() });
      } finally {
        adminOpen = false;
        // The panel is where the button is put away from, so its own state is
        // re-read every time one comes down.
        syncAdminButton();
      }
    }

    const screen = el('div.screen.explore-screen', {}, [
      band,
      el('div.explore-actions', {}, [adminButton, mapButton, bagButton]),
    ]);

    root.append(screen);
    attachButtonSounds(screen);
    syncMapButton();
    syncAdminButton();

    /**
     * Eating and patching up, drawn on the traveller rather than announced in
     * a toast. The bag can be opened from here, from a counter and from the
     * middle of a fight, so the pop is driven by the event the bag fires and
     * not by this screen knowing what was tapped — see src/art/vital-pop.js.
     */
    const pops = createVitalPops();

    /**
     * THE COAT THAT IS ON FIRE
     * -----------------------------------------------------------------------
     * Nothing at all unless the player is wearing the Ember Reaver, which is
     * the reward for the hard road and the only garment in the game with live
     * particles on it — see src/art/ember-aura.js. Two emitters rather than
     * one: the man carries his own fire, and the barding carries the horse's,
     * so a rider in the full set is burning at both ends and a rider who only
     * bought the tack is not on fire himself.
     *
     * They are created unconditionally and left at zero intensity, because the
     * outfit can change while this screen is up — the Admin Panel can put
     * anything on a tester mid-crossing — and a renderer that only builds the
     * emitter it needed at mount is a renderer that cannot.
     */
    const embers = createEmberAura({ intensity: 0 });
    const horseEmbers = createEmberAura({ intensity: 0 });

    /**
     * THE ONE THING ON THIS ROAD THAT IS NOT SCENERY
     * -----------------------------------------------------------------------
     * Gallows Hollow's scare — see src/explore/scare.js for what it is and why
     * it is built the way it is. It is created unconditionally and handed the
     * world's scare position, which is null in the six worlds that do not have
     * one; everything below is then a no-op in those worlds.
     */
    const scare = createScare();
    scare.setPosition(engine.getScareAt());

    // --- live bindings -----------------------------------------------------
    const unsubs = [
      on(EVENTS.ITEM_USED, ({ effect, icon: iconName }) => pops.spawn(effect, iconName)),
      on(EVENTS.INVENTORY_CHANGED, () => {
        bagCount.textContent = String(totalItems());
        syncMapButton();
      }),
      on(EVENTS.WEATHER_CHANGED, (w) => {
        if (w.blurb) toast(w.blurb, w.tone);
      }),
      on(EVENTS.HUNGER_EMPTY, () => toast('Starving — eat something', 'bad')),
    ];

    // --- canvas renderer ---------------------------------------------------
    let elapsed = 0;
    let lastView = null;
    /**
     * The last frame's length, stashed so the embers can be stepped from
     * `render` rather than from `update`.
     *
     * Everything else on this screen advances in `update` because it knows
     * where it is without being told. The fire does not: it clings to whatever
     * is actually on the road, and the traveller's box is only settled inside
     * `render` — it depends on the ground line, on the walk anchor and, in the
     * saddle, on which airborne frame of the gallop is up. Stepping it a frame
     * behind the sprite it is burning on would leave a trail of embers hanging
     * where the horse was.
     */
    let frameDt = 16;
    const renderer = {
      onResize(view) {
        lastView = view;
      },

      update(dt) {
        elapsed += dt;
        frameDt = dt;
        engine.update(dt, lastView);
        // Read every frame rather than held from mount: an outfit saved in the
        // wardrobe, or forced on from the panel, has to reach the road on the
        // next frame the same way a new hat does.
        embers.setIntensity(emberIntensity());
        horseEmbers.setIntensity(horseEmberIntensity());
        // The prairie's fluff and fireflies drift on regardless of the walk —
        // the same rule the weather follows. A world that stops the moment the
        // saddlebag opens is a world the player can tell is a backdrop.
        parallax.updateAmbient(dt, lastView);
        pops.update(dt);
        parallax.setStructures(engine.visibleStructures());
        /**
         * The scare is stepped against the ODOMETER rather than against the
         * camera, and the two are the same number — but the odometer is the one
         * the encounters are measured in, and the scare has to go off in the
         * same space the quiet stretch was cut in.
         */
        scare.update(dt, engine.getTravelled());
      },

      render(ctx, view) {
        lastView = view;
        const s = view.scale;
        const cameraX = engine.getCameraX();
        /**
         * THE FLINCH
         * -------------------------------------------------------------------
         * The whole scene is drawn through the scare's camera kick for the six
         * hundred milliseconds after it fires, and nothing else in this file
         * knows about it: the shake belongs to the CAMERA, so it has to move
         * the ground, the traveller, the weather and the props together, and
         * the only place all four of those are drawn is here.
         *
         * The transform itself lives in `src/explore/scare.js` because the red
         * wash at the end of this function draws through it too, and the two
         * passes have to agree to the pixel. Outside the scare it is a bare
         * `save()` and costs nothing.
         *
         * The wash itself is deliberately NOT inside it. A flash that shakes
         * with the scene is a red rectangle sliding about; a flash that stays
         * still while the world moves under it is the screen itself being hit.
         */
        scare.beginKick(ctx, view);
        const gy = parallax.groundY(view);
        // The rain needs to know where the road is before it can break on it —
        // both edges of it, so a downpour lands across the depth of the floor
        // instead of stopping dead along the walk line.
        weather.setGroundLine(gy, parallax.planeTop(view));
        // Backdrop only: the light goes on after the traveller is in the scene,
        // so he stands in the hour of the day instead of in front of it.
        parallax.renderBackdrop(ctx, view, cameraX);
        const walking = !engine.isPaused();
        // The one place on the road that never moves. It comes from the
        // parallax because the buildings are placed against it — see
        // `drawStructures` — and two files disagreeing about where the
        // traveller stands is what put the shop doors off to his left.
        const heroX = heroAnchorX(view);

        /**
         * The skull on its stake, drawn with the props rather than with the
         * actors: it goes down after the scatter band and before the traveller,
         * which is exactly where an ordinary roadside prop sits, and that is
         * the point — until the moment it moves, it has to be indistinguishable
         * from the dozens of them the player has already walked past.
         */
        scare.draw(ctx, view, { cameraX, groundY: gy, heroX, biome: world.biome });

        // The traveller's shadow, thrown by whatever is up in the sky. A horse
        // is twice as wide as a man and throws twice the shadow.
        const mounted = getState().hasHorse;
        parallax.drawGroundShadow(ctx, view, heroX, (mounted ? HORSE_SIZE.w : PLAYER_SIZE.w) * s, gy);

        /**
         * A meal or a bandage washes over whoever is on the road — the man on
         * foot, or the man in the saddle without the horse he is sitting on.
         * It is laid over the sprite's own silhouette rather than over a
         * rectangle, so it takes the shape of the figure.
         */
        const wash = pops.wash();
        const washed = (frame, x, y) => {
          drawSprite(ctx, frame, x, y, s);
          if (!wash) return;
          ctx.globalAlpha = wash.alpha;
          drawSprite(ctx, tinted(frame, wash.color, 1), x, y, s);
          ctx.globalAlpha = 1;
        };

        if (mounted) {
          const gait = walking ? 'gallop' : 'idle';
          const horseFrames = sprites.horse[gait];
          const hTiming = walking ? HORSE_TIMING.gallop : HORSE_TIMING.idle;
          const frameIndex = frameAt(horseFrames, elapsed, hTiming);
          const horse = horseFrames[frameIndex];
          // The gallop's airborne frames leave the road. Lifting here rather
          // than inside the sprite keeps the rider on the horse's back.
          const lift = HORSE_FRAME_LIFT[gait][frameIndex] ?? 0;
          const hy = gy - horse.height * s + 2 * s - lift * s;

          // The fire clings to whatever is actually on the road: the animal's
          // own box, and the rider's box sitting on top of it.
          horseEmbers.update(frameDt, { x: heroX, y: hy, w: horse.width * s, h: horse.height * s, unit: s });
          const rx = heroX + RIDER_OFFSET.x * s;
          const ry = hy + RIDER_OFFSET.y * s;
          embers.update(frameDt, { x: rx, y: ry, w: PLAYER_SIZE.w * s, h: PLAYER_SIZE.h * s, unit: s });

          horseEmbers.draw(ctx, 'back');
          embers.draw(ctx, 'back');
          drawSprite(ctx, horse, heroX, hy, s);

          const riderFrames = sprites.rider.ride;
          const rider = riderFrames[frameAt(riderFrames, elapsed, CHARACTER_TIMING.ride)];
          washed(rider, rx, ry);
          horseEmbers.draw(ctx, 'front');
          embers.draw(ctx, 'front');
        } else {
          const frames = walking ? sprites.player.walk : sprites.player.idle;
          const timing = walking ? CHARACTER_TIMING.walk : CHARACTER_TIMING.idle;
          const frame = frames[frameAt(frames, elapsed, timing)];
          const fy = gy - frame.height * s + 2 * s;
          embers.update(frameDt, { x: heroX, y: fy, w: frame.width * s, h: frame.height * s, unit: s });
          embers.draw(ctx, 'back');
          washed(frame, heroX, fy);
          embers.draw(ctx, 'front');
        }

        // …and the plus or the carrot, which starts ON his chest and rises out
        // of it. Drawn whether he is on foot or in the saddle — the rider sits
        // higher, so the chest is higher.
        if (pops.active) {
          const w = (mounted ? HORSE_SIZE.w : PLAYER_SIZE.w) * s;
          pops.draw(ctx, heroX + w / 2, gy - (mounted ? 20 : 13) * s, s);
        }

        // Footfall dust while travelling — sand in the desert, dry earth off
        // the prairie trail. The colour comes from the biome; kicking up pale
        // sand on green grass was the giveaway that the ground had changed and
        // nothing else had.
        if (walking) {
          ctx.fillStyle = parallax.dust;
          for (let i = 0; i < 3; i++) {
            const phase = (elapsed / 260 + i * 0.33) % 1;
            ctx.globalAlpha = 0.45 * (1 - phase);
            ctx.fillRect(Math.round(heroX - phase * 26 * s), Math.round(gy - phase * 6 * s), s, s);
          }
          ctx.globalAlpha = 1;
        }

        // The near side of the road: the litter lane between the traveller and
        // the camera, and the bank at the bottom of the frame. It goes on after
        // him, which is the whole point of it — the road passes in front of the
        // man walking down it, and until it did he was standing on top of a
        // picture of one.
        parallax.renderForeground(ctx, view, cameraX);

        // Everything above is lit together, traveller included.
        parallax.applyLighting(ctx, view);
        // Then the things that are making their own light, or floating in
        // front of the scene rather than sitting in it.
        parallax.renderAmbient(ctx, view);
        weather.render(ctx, view);

        // The scene is finished; the camera stops being thrown here, so
        // everything after this is drawn on a screen that is not moving.
        scare.endKick(ctx);

        // Starving: a red pulse creeping in from the edges.
        const starve = getState().hunger <= 0 ? starvationProgress() : 0;
        if (starve > 0) {
          const vg = ctx.createRadialGradient(
            view.w / 2, view.h / 2, Math.min(view.w, view.h) * 0.2,
            view.w / 2, view.h / 2, Math.max(view.w, view.h) * 0.7,
          );
          vg.addColorStop(0, 'rgba(0,0,0,0)');
          vg.addColorStop(1, `rgba(141, 26, 24, ${0.25 + starve * 0.45})`);
          ctx.fillStyle = vg;
          ctx.fillRect(0, 0, view.w, view.h);
        }

        // And the scare's wash, last of all and over everything — the HUD is
        // DOM and sits above it, which is correct: the world went red, not the
        // interface.
        scare.drawFlash(ctx, view);
      },
    };

    setRenderer(renderer);

    if (params.resume) engine.resume();
    else engine.start();

    return () => {
      window.removeEventListener('keydown', onKey);
      sigil.dispose();
      unsubs.forEach((fn) => fn());
      band.dispose();
      engine.pause();
    };
  },
};
