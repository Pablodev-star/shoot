/** Permanent revolver upgrades, offered only by generated forge stops. */
import { el } from '../core/dom.js';
import { attachButtonSounds, play, playMusic } from '../core/audio.js';
import { setRenderer } from '../core/scene.js';
import { getState, gunDamage, gunUpgradeCost, upgradeGun } from '../game/player.js';
import { finishEncounter } from '../game/run.js';
import { trailBand } from '../ui/statusbar.js';
import { toast } from '../ui/toast.js';
import { createInteriorScene } from './interior-scene.js';

export const ForgeScreen = {
  id: 'forge',
  mount(root) {
    playMusic('themeMenu');
    setRenderer(createInteriorScene('forge'));
    const level = el('span');
    const damage = el('span');
    const price = el('div.forge-price');
    const buy = el('button.btn.btn--gold', { onclick: improve });
    function render() {
      const state = getState();
      level.textContent = `Level ${state.gunLevel}`;
      damage.textContent = `${gunDamage().toFixed(1)} damage per shot`;
      price.textContent = `${gunUpgradeCost()} gold`;
      buy.textContent = `Improve to ${(gunDamage() + 0.5).toFixed(1)} damage`;
      buy.disabled = state.gold < gunUpgradeCost();
    }
    function improve() {
      if (!upgradeGun()) return toast('Not enough gold', 'bad');
      play('coin');
      toast('The revolver hits half a life harder', 'gold');
      render();
    }
    root.append(el('section.screen.forge-screen', {}, [trailBand(), el('div.panel.forge-panel', {}, [
      el('div.forge-anvil', { 'aria-hidden': 'true' }, [el('i'), el('b')]),
      el('h1.panel-title', { text: 'Blacksmith' }),
      el('p.muted', { text: 'Steel, sights and a careful trigger. Every improvement is permanent.' }),
      el('div.forge-stats', {}, [el('span.chip', {}, [level]), el('span.chip', {}, [damage])]),
      price, buy,
      el('button.btn.btn--ghost', { onclick: () => finishEncounter() }, ['Return to trail']),
    ])]));
    attachButtonSounds(root);
    render();
  },
  unmount() { setRenderer(null); },
};
