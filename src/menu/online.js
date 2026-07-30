/**
 * SHOOT! — Online lobby (Block 1).
 *
 * VISUALLY COMPLETE, DELIBERATELY INERT.
 *
 * This screen is built to its final level of finish so it never has to be
 * rebuilt: room browser, room detail, create-room dialog, join-by-code and the
 * matchmaking flow are all here with sample data and full animation. What is
 * missing is only the network layer.
 *
 * Every action routes through `comingSoon()`, which shows a toast and plays the
 * error cue — nothing throws, nothing dead-ends, navigation always keeps
 * working. When the backend lands, replace the bodies of the handlers marked
 * `// NETWORK:` and delete `SAMPLE_ROOMS`.
 */

import { el } from '../core/dom.js';
import { back } from '../core/router.js';
import { attachButtonSounds, play } from '../core/audio.js';
import { toast } from '../ui/toast.js';
import { getProfile } from '../core/settings.js';

/** Placeholder browser contents. NETWORK: replace with a live room feed. */
const SAMPLE_ROOMS = [
  { name: "Dead Man's Gulch", host: 'CALAMITY', players: 2, max: 2, mode: 'Duel · Best of 3', ping: 28, locked: false },
  { name: 'Rusty Spur Saloon', host: 'EL_TUERTO', players: 1, max: 2, mode: 'Duel · Sudden Death', ping: 46, locked: false },
  { name: 'High Noon Lobby', host: 'BONESAW', players: 1, max: 4, mode: 'Free-for-all', ping: 61, locked: true },
  { name: 'Coyote Ridge', host: 'MISS_ADA', players: 3, max: 4, mode: 'Free-for-all', ping: 112, locked: false },
  { name: 'The Last Round', host: 'DOC_HALLOW', players: 1, max: 2, mode: 'Duel · Best of 5', ping: 74, locked: false },
  { name: 'Buzzard Flats', host: 'SIX_SHOT', players: 2, max: 2, mode: 'Duel · Best of 3', ping: 155, locked: false },
  { name: 'Silver Vein Mine', host: 'PROSPECTOR', players: 2, max: 4, mode: 'Free-for-all', ping: 39, locked: false },
];

function comingSoon(what = 'Online play') {
  play('error');
  toast(`${what} — coming soon`, 'gold');
}

function pingQuality(ping) {
  if (ping < 60) return 'q3';
  if (ping < 120) return 'q2';
  return 'q1';
}

function roomRow(room) {
  const full = room.players >= room.max;
  return el(
    'div.list-row.room-row',
    {
      class: full ? 'is-full' : '',
      onclick: () => comingSoon('Joining rooms'),
      title: 'Coming soon',
    },
    [
      el('div.room-name.grow', {}, [
        el('span.title', { text: `${room.locked ? '🔒 ' : ''}${room.name}` }),
        el('span.meta', { text: `${room.mode} · host ${room.host}` }),
      ]),
      el('span.room-players', { text: `${room.players}/${room.max}` }),
      el('span.ping-bars', { class: pingQuality(room.ping) }, [el('i'), el('i'), el('i')]),
      el('span.room-ping', { text: `${room.ping}ms` }),
    ],
  );
}

/** Create-room dialog: complete form, inert Create button. */
function openCreateRoom(root) {
  const backdrop = el('div.modal-backdrop', {
    onclick: (e) => {
      if (e.target === backdrop) backdrop.remove();
    },
  });
  const modal = el('div.panel.modal', {}, [
    el('h2.panel-title', { text: 'Create Room' }),
    el('p.panel-sub', { text: 'Set up a table and wait for a challenger' }),
    el('div.col', {}, [
      el('div.field', {}, [
        el('label', { text: 'Room name' }),
        el('input.input', { type: 'text', value: `${getProfile().name}'S SALOON`, maxlength: '24' }),
      ]),
      el('div.field', {}, [
        el('label', { text: 'Mode' }),
        el('select.input', {}, [
          el('option', { text: 'Duel · Best of 3' }),
          el('option', { text: 'Duel · Best of 5' }),
          el('option', { text: 'Duel · Sudden Death' }),
          el('option', { text: 'Free-for-all (4)' }),
        ]),
      ]),
      el('div.field', {}, [
        el('label', { text: 'Starting lives' }),
        el('select.input', {}, [
          el('option', { text: '3 lives' }),
          el('option', { text: '5 lives' }),
          el('option', { text: '1 life · sudden death' }),
        ]),
      ]),
      el('label.toggle', {}, [el('input', { type: 'checkbox' }), 'Private room (invite code only)']),
      el('div.row', { style: { justifyContent: 'flex-end', marginTop: '10px' } }, [
        el('button.btn.btn--small.btn--ghost', { onclick: () => backdrop.remove() }, ['Cancel']),
        el(
          'button.btn.btn--small.btn--soon',
          { onclick: () => comingSoon('Creating rooms') },
          ['Create', el('span.tag-soon', { text: 'Soon' })],
        ),
      ]),
    ]),
  ]);
  backdrop.append(modal);
  root.append(backdrop);
  attachButtonSounds(backdrop);
}

/** Matchmaking preview: the real search UI, clearly flagged as a preview. */
function openMatchmaking(root) {
  const statuses = [
    'Saddling up…',
    'Scanning the territory…',
    'Looking for a challenger…',
    'Checking their trigger finger…',
  ];
  let i = 0;

  const status = el('div.mm-status', { text: statuses[0] });
  const backdrop = el('div.modal-backdrop');
  const modal = el('div.panel.modal', {}, [
    el('div.matchmaking', {}, [
      el('h2.panel-title', { text: 'Quick Match' }),
      el('div.mm-spinner'),
      status,
      el('p.muted.center', {
        text: 'Preview only — matchmaking servers are not live yet.',
      }),
      el('button.btn.btn--small.btn--ghost', { onclick: () => stop() }, ['Cancel']),
    ]),
  ]);
  backdrop.append(modal);
  root.append(backdrop);
  attachButtonSounds(backdrop);

  const timer = setInterval(() => {
    i = (i + 1) % statuses.length;
    status.textContent = statuses[i];
  }, 1400);

  const giveUp = setTimeout(() => {
    clearInterval(timer);
    status.textContent = 'No games found — online is still being built.';
    modal.querySelector('.mm-spinner')?.classList.add('hidden');
  }, 6000);

  function stop() {
    clearInterval(timer);
    clearTimeout(giveUp);
    backdrop.remove();
  }
}

export const OnlineScreen = {
  id: 'online',
  mount(root) {
    const list = el('div.list.room-list');
    SAMPLE_ROOMS.forEach((r) => list.append(roomRow(r)));

    const codeInput = el('input.input', {
      type: 'text',
      maxlength: '6',
      placeholder: '––––––',
      oninput: (e) => {
        e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
      },
    });

    const screen = el('div.screen', {}, [
      el('div.screen-header', {}, [
        el('button.btn.btn--small.btn--ghost', { onclick: () => back('title') }, ['◀ Back']),
        el('h1.screen-title', { text: 'Online' }),
        el('span.chip.chip--live', {}, [el('span.dot-live'), 'Preview']),
      ]),

      el('div.construction-banner', {}, [
        'Online mode is under construction — the lobby below is a preview of the finished interface',
      ]),

      el('div.online-layout', {}, [
        el('div.panel', {}, [
          el('div.row', { style: { justifyContent: 'space-between', marginBottom: '10px' } }, [
            el('h2.panel-title', { style: { margin: '0' }, text: 'Room Browser' }),
            el('button.btn.btn--small.btn--ghost', {
              onclick: () => comingSoon('Refreshing the browser'),
            }, ['⟳ Refresh']),
          ]),
          list,
        ]),

        el('div.online-side', {}, [
          el('div.panel', {}, [
            el('h2.panel-title', { text: 'Play' }),
            el('div.col', {}, [
              el('button.btn.btn--wide.btn--soon', { onclick: () => openMatchmaking(root) }, [
                'Quick Match',
                el('span.tag-soon', { text: 'Soon' }),
              ]),
              el('button.btn.btn--wide.btn--soon', { onclick: () => openCreateRoom(root) }, [
                'Create Room',
                el('span.tag-soon', { text: 'Soon' }),
              ]),
            ]),
          ]),

          el('div.panel', {}, [
            el('h2.panel-title', { text: 'Join with Code' }),
            el('div.join-code', {}, [
              codeInput,
              el('button.btn.btn--small.btn--soon', {
                onclick: () => comingSoon('Joining by code'),
              }, ['Join']),
            ]),
            el('p.muted.center', {
              style: { marginTop: '10px', fontSize: '12px' },
              text: 'Ask a friend for their six-character room code.',
            }),
          ]),

          el('div.panel', {}, [
            el('h2.panel-title', { text: 'Your Standing' }),
            el('div.stat-grid', {}, [
              el('div.stat-tile', {}, [el('span.k', { text: 'Rank' }), el('span.v', { text: '—' })]),
              el('div.stat-tile', {}, [el('span.k', { text: 'Wins' }), el('span.v', { text: '—' })]),
              el('div.stat-tile', {}, [el('span.k', { text: 'Streak' }), el('span.v', { text: '—' })]),
            ]),
            el('p.muted.center', {
              style: { marginTop: '10px', fontSize: '12px' },
              text: 'Ranked standings unlock when online play goes live.',
            }),
          ]),
        ]),
      ]),
    ]);

    root.append(screen);
    attachButtonSounds(screen);
  },
};
