# UI audit — what was wrong before the rebuild

Notes taken from reading every screen and screenshotting the running game at
390x844 (phone), 768x1024 (iPad portrait), 1024x768 (iPad landscape) and
1440x900 (desktop).

## 1. Things stretch (the iPad complaint)

| Where | What happened |
| --- | --- |
| `.screen-header` | `grid-template-columns: 1fr auto 1fr` with no `justify-items`. The Back button is a grid item, so it stretched to fill the whole left column — ~380px wide on iPad. Every menu screen had it. |
| `.setting-row` | The control column is `minmax(0, 1.4fr)`, so a language `<select>` and a volume slider stretched to ~470px. |
| Explore hunger meter | Spanned the full 1100px content width. A metre-wide hunger bar. |
| Slot cards | `minmax(260px, 1fr)` inside 1100px → three ~350px cards with 210px min-height and four lines of content in them. Mostly empty. |
| Duel fighter cards | `1fr auto 1fr` pinned them to opposite corners with a void between at desktop width. |
| Everything | One `--content-wide: 1100px` cap applied regardless of how much content a screen actually has. |

Root fix: grid items never stretch by default any more (`justify-items`
is set explicitly everywhere), controls have a `--field-max` cap, and each
screen declares its own `--screen-max` sized to its content.

## 2. Text that says nothing

- **`WALKING ···`** — a pill floating in the middle of the desert restating the
  animation the player is watching. Along with `Riding on`, `Night falls on the
  road`, `The sun comes up`, `Rummaging through your saddlebag`.
- **`NO BULLETS`** printed under both fighters, every round, in every duel.
- **`+1 bullet · you are open` / `nothing gets through` / `spend 1 bullet`** —
  the duel rules reprinted under all three buttons on every turn of every duel.
- **`THE SHOPKEEPER LAYS OUT 3 THINGS WORTH HAVING`** and **`A BED, A ROOF, AND
  NO ONE ASKING QUESTIONS`** — subtitles with no information in them.
- **`COMMON`** chip on every shop card, when the rarity is already the colour of
  the icon frame and the card edge, and when almost everything is common.
- **Online said "not finished" four times**: a striped construction banner, a
  `PREVIEW` badge, a `SOON` chip on every button, and "Preview only —
  matchmaking servers are not live yet" inside the matchmaking dialog.
- **`Your Standing`** on Online: three stat tiles reading `—`, `—`, `—`.
- **Settings** ended with `Audio currently uses synthesised placeholder cues —
  see src/core/audio.js`, a developer note on a player screen.
- **Status bar subtitle** duplicated the screen title: the shop showed
  `At the general store` directly above a heading reading `GENERAL STORE`.

## 3. Emoji / text glyphs used as icons

`◀` (back), `✕` (close, four screens), `▸` (continue), `+` (empty slot), `?`
(help), `·` (locked-room prefix and the room-code placeholder). All replaced
with baked 16x16 pixel-art icons from the game palette.

## 4. Screens that were hard to read

- **Online** — a room browser plus three stacked panels in a side rail. On iPad
  the third panel fell below the fold. Fake ranked data next to real-looking
  room data, with no clear line between "this works" and "this doesn't".
- **Shop / Inn** — a `.panel` wrapping a grid that was itself made of bordered
  cards: three nested frames. The shop could also roll the *same item twice*,
  so a visit could offer "Bandage, Carrot, Bandage".
- **Duel** — round pill, condition chips, two fighter cards and a floating
  callout all competed, and the callout sat on top of the duellists.
- **Inventory** — five filter tabs (`All / Food / Healing / Duel / Gear`) where
  `Healing` was a subset of the other two.
- **Explore** — two full-width bars stacked at the top ate a fifth of the
  screen before the game started.

## 5. No western identity

Everything was a brown vertical gradient with a 3px border and a rounded
corner. No wood, no iron, no rope, no paper, no hardware — the shapes could
have belonged to any genre.

## 6. The two venues were nowhere in particular

Fixed after the rebuild, and worth writing down because it is the same class of
problem as §2: things the player had to *read* that could have been *shown*.

| Where | What was wrong |
| --- | --- |
| Both backdrops | `createInteriorScene('shop')` and `createInteriorScene('inn')` drew the **same picture** — a horizontal plank wall, one lantern, floating dust — with one colour swapped. Two different places, one room. |
| Inn beds | Both offers drew the same 16 x 16 `bed` icon at 3x. The screen asked you to choose between two identical pictures, so the only difference between "Basic Bed" and "Premium Bed" was the price under them. |
| Shop | Three cards in a rectangle. Nothing on the screen said *shop* except the heading, which said it in words. |
| Both walls | Wall boards and floor boards ran the same way, so the two surfaces read as one flat thing folded over rather than as a corner you are standing in. |

What replaced them: two rooms with nothing in common but the boards
(`src/shops/interior-scene.js`), a stall — awning, valance, sign on ropes,
posts, counter — around the shop's goods, and two beds drawn once each in
`src/art/sprites-venue.js`. The wall's grain now runs vertically against the
floor's horizontal, furniture standing on the floor is drawn at twice the scale
of what is fixed to the wall behind it, and every prop is laid out from an edge
of the frame, because the HTML sits in a column down the middle and covers
almost everything between the two walls on a phone.

No text was added to either screen.
