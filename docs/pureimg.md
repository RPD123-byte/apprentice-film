# Pure Imagination page + feedback note card (`src/lib/pureimg.js`, `src/lib/notecard.js`)

Foundation F3. The retro event page seen on the laptop (s05 23.12–26.72, s07 29.04–30.56) and full-screen in the
close-up s08 (30.56–32.60), the red selection rectangle, and the note card (also the physical card in the B&W room,
57–69 s). Everything is drawn with canvas paths and text; no image of the source is used.

The page is an **original design** following the source page's composition and palette: dark green-black ground,
a U-shaped rainbow ribbon with a pastel tail (top right), a big rainbow sweeping under the wordmark, petals and
wedges behind "Pure", chunky cream wordmark with dark keylines, sparkles, clouds, a smiley ball, a daisy, nav
links, two pill buttons, a marquee strip and a "Get your tickets" button. The source's top-left logo (a third-party
brand mark) is replaced by an original two-line mark, "Wonder / Camp" in Shrikhand. The date/location line is plain
text set in the source's layout: the same font, weight, size, colour and position. The source's line gave a real
event's dates and city. On 2026-09-28 it was replaced with invented text, "April 24 - April 26, 2025" and "Linden
Hollow" (`PURE_DATE`, below). The render no longer uses the real text anywhere. Archived build copies under `tracing/`
(17 files: old copies of `s05/pure.js`, `s07/page.js` and `s08.js`, and some of s08's measuring scripts and font test
pages) and one review input in `process/` are kept as they ran, and still contain it. So does the git history.

## Page units

The page is drawn in **page units, 1600 × 1000** (the laptop screen rectified to 16:10).

- **Laptop screen quad** in the film frame (s05 and s07, identical to ±0.2 px between 24.3 and 30.44 s, measured by
  homography): TL (315, 246), TR (834, 168), BR (898, 519), BL (409, 648). Map `purePageCanvas` onto this quad.
  The corners were read by eye on zoomed crops, so they are good to about ±3 px.
- **Close-up (s08)**: frame(30.56) → page is the similarity `page = 0.41877·R(0.145°)·frame + (670.59, 106.50)`
  (SIFT fit of the close-up against the rectified laptop screen): the first frame shows page x 670.6–1594.4,
  y 106.5–505. Above page y 110.7 the source is black (the edge of its crop).
  The region x 670–1600, y 106–505 follows the close-up closely: U ribbon, pastel tail, stars, date line, pills,
  selection, card, the u–r–e of "Pure", the right-hand cloud. The rest of the page was measured on the laptop view
  (about 3 px per page unit of blur there) and is looser.

## `pureimg.js` API

```js
import { drawPurePage, purePageCanvas, purePageRegion, drawPureOverlay, pureStateAt, releasePure,
         PAGE_W, PAGE_H, PURE_SEL, PURE_CARD, PURE_DATE, PC, PURE_TICKET_TEXT, PURE_PLACEHOLDER } from "../lib/pureimg.js";
```

- `drawPurePage(ctx, opts)` paints the page in page units under the current transform (≈10 ms at 1600 × 1000).
- `purePageCanvas(w, h, opts)` returns a cached canvas of the whole page at w × h, for laptop screens. It is keyed by
  size and opts, so request the same size every frame.
- `purePageRegion(x0, y0, x1, y1, k, opts)` returns a cached canvas of a page region at k px per unit, for close-ups.
- `opts`: `{ ticketText, ticketCaret }`. `ticketText` replaces "Get your tickets" (`""` gives a blank button), and
  `ticketCaret` draws a caret after it.
- `drawPureOverlay(ctx, { sel, card })` draws the selection and the card in page units.
  - `sel`: 0 hides the selection, 0..1 is the pop-in progress, 1 is full size.
  - `card`: `null`, or a card state that goes to `drawNoteCard`: `{ appear, anchor, smiley, placeholder, text, caret }`.
- `pureStateAt(t)` returns `{ page, overlay }` for film time t on the laptop, from the measured timeline:
  ```js
  const st = pureStateAt(t);
  const screen = purePageCanvas(1600, 1000, st.page);      // then draw the overlay on it, or on top in page units
  drawPureOverlay(g, st.overlay);
  ```
- `releasePure()` clears the caches. `PURE_SEL` and `PURE_CARD` give the selection and card rectangles in page units.
  `PC` is the palette. Its colours are pre-grade: the global grade lifts and warms them a little.
- `PURE_DATE` is the date/location line: `{ size, lines, x2 }`.
  - `size` is the font size in page units (Poppins 600), fitted to the source's line. Line 2 is set at 0.72 of it.
  - Line 1 is right-aligned at page x 981, baseline 275.5.
  - Line 2 starts at `x2`, baseline 309.5. That centres its ink on page x 797, where the source's second line sat.
  - Line 2 must have no descenders (g, j, p, q, y). In the close-up the red selection line covers its baseline, so a
    descender would hang below the line.
  - It is the only copy. s08 redraws both lines from it with its own measured fits. The page copies in s05 and s07
    (`dateLine` in `src/shots/s05/pure.js` and `src/shots/s07/page.js`) import it.

### Laptop timeline, measured frame by frame on the rectified screen

| time (s) | event |
|---|---|
| 24.3 → | page on screen (static) |
| 25.16–25.36 | red selection pops in about its centre: scale 0.81 (25.20), 0.89 (25.24), 0.95 (25.28), 0.99 (25.32), 1 |
| 25.44–25.72 | card pops in about (45 %, 72 %) of the card: scale 0.29, 0.40, 0.58, 0.75, 0.90, 0.98, 1 at 25.48…25.72 |
| 25.7–26.72 | card shows two short grey placeholder lines; the smiley and the trash are grey (inactive) |
| 29.04 → | smiley yellow, trash dark (it changed while the laptop was off screen, in s06) |
| 29.04–29.12 | the ticket button is **blank** |
| 29.16–30.52 | text is typed into the ticket button from page x 679. The right edge of the typed run is tabled per frame (694 → 919). The source text is unreadable, so an original line (`PURE_TICKET_TEXT`) is revealed to the same widths. |

## `notecard.js` API

```js
import { drawNoteCard, noteCardCanvas, drawSelection, CARD_W, CARD_H, cardTextX, releaseNoteCards } from "../lib/notecard.js";
```

- `drawNoteCard(ctx, o)` paints the card with its top-left corner at `(o.x, o.y)`, `o.w` px wide (height = w·648/465).
  Give `o.h` instead of `o.w` to size it by height (`w` wins when both are given; neither = 1 px per card unit).
  Card geometry was measured on the close-up in card units (465 × 648): smiley at (196, 80) r 40, trash at (295, 80),
  textarea 51–423 × 160–600.5 (r 15, 3.5 line), button row at 532.5 with the divider at 237, text baseline 210
  from x 85 (Geist Mono 26, 15.6 advance).
  - `text`: typed string, one line.
  - `caret`: bool.
  - `placeholder`: grey lines, separated by `\n`.
  - `smiley`: 1 is yellow with its orange glow; 0 is the grey, inactive state.
  - `notch`: the speech nub on the left edge (the web widget has one). Traced on the close-up: a round head
    (centre (-26.5, 327.9), r 17.7) joined to the card by a wide neck (card edge y 299–356.5), with a small V where
    the neck's top edge meets the head.
  - `theme`: `"screen"` (web widget, default), `"room"` (the physical card in the B&W room: warm paper,
    maroon ink, yellow smiley), `"ink"` (pure black and white line art for engraved plates), or a custom
    `{ paper, paperTop, paperBot, ink, text, muted, outline, smiley, smileyHi, glow, face }`. A theme may also carry:
    - `rim: { dx, dy, color }`: the widget's hard dark rim, a copy of the body (and nub) offset by (dx, dy) and grown
      by 1.5 units, drawn under the card. The screen theme has `{ dx: -3.5, dy: -1.5 }`: on the close-up the rim is
      ~5 px of near-black on the left edge, ~3 px on the top, and only the keyline below and right. With a rim the nub
      has no keyline of its own (its lower edge meets the page directly).
    - `body: [x0, y0, x1, y1]`: card-unit extents of the body (default 0, 0, 465, 648). Also accepted as `o.body`.
    - `area`: any of `{ x0, y0, x1, y1, r, lw, btnY, divX }`, for the text box and the button row.
    - `trashLw`, `glowR` (halo outer radius as a fraction of the smiley radius, default 1.28),
      `glowStops` (`[[t, alpha], ...]`).
  - `appear` (0..1) with `anchor` ([u, v] card fractions): pop-in scale.
  - `alpha`, `textAlpha`.
  - `edge` (px): a dark rim below and right, for card thickness.
- `noteCardCanvas(w, o)` returns the same card cached on its own canvas, with `c.__pad` px of margin (room for the
  nub). Use it to warp the card onto a quad (for example in the room, where it is seen from low down) or to
  engrave it.
- `drawSelection(ctx, { x0, y0, x1, y1, width = 5, color, drag })` draws the red selection: a #c62e12 line with a thin
  dark rim on its lower and right side. `drag` (0..1) grows the rectangle from (x0, y0), for a drag-out.
- `cardTextX(n)` gives the caret x after n characters, in card units.

The room card (57–69 s) reads "This is really good", has no caret, and shows a yellow smiley with its glow in an
otherwise B&W frame: `noteCardCanvas(w, { theme: "room", text: "This is really good" })`, then warp.

## Typing in the close-up (s08)

Per-frame crops of the card, stabilised with the camera track. The first frame (30.56) already reads "This is r".

| letter | e | a | l | l | y | ␠ | g | o | o | d |
|---|---|---|---|---|---|---|---|---|---|---|
| first frame (s) | 30.76 | 30.88 | 31.00 | 31.12 | 31.28 | 31.40 | 31.56 | 31.68 | 31.84 | 31.96 |

The caret is steady (no blink) until 32.04 and gone from 32.08. Re-checked in fix pass 3: the text box's ink rises on
exactly the same frames in the render and the source for every letter.

## The close-up card as measured (s08, fix pass 3)

s08 draws the card with its own theme (`CARD_THEME` in `src/shots/s08.js`), measured on the first frame in F0 px
(frame-30.56 pixels; card units are 0.9958 px):
- **Edges** (subpixel, median per side): x 1451.3–1913.3, y 183.7–830.5. This is 0.9 unit in on the left and 2 units
  lower at the bottom than the 465 × 648 layout, so `body: [0.88, 0.18, 464.83, 650.04]`.
- **Rim** as in the screen theme, `{ dx: -3.3, dy: -1.4 }`, a touch lighter (alpha 0.8).
- **Text box**: line centres at x 1500.8 / 1871.4, y 342.1 / 780.7, button row 714.9, divider 1686.1. That gives
  `area: { x0: 50.3, y0: 159.4, x1: 422.5, y1: 599.85, lw: 3.9, btnY: 533.7, divX: 236 }`, with darker ink
  (#1b1b19, core ~12 levels darker than before) and `trashLw: 3.8`.
- **Smiley**: disc #b4a648 → #c4ba5d. The halo was measured in rings round the centre: `glowR: 1.4` with stops
  1 / .85 / .63 / .41 / .22 / .09 / 0 at t 0 / .3 / .44 / .56 / .69 / .83 / 1.
- **Typed text**: a Menlo-like face, 5% shorter than Menlo 26 for the same 15.5-unit advance, and lighter.
  - s08 sets it as Menlo 25.4 with letter-spacing 0.3 at x 82.75, baseline 208.5, and erodes the glyph edges
    with a 0.37-unit paper stroke.
  - These values were fitted on the glyph ink profiles at 31.72–32.56. The erode was re-set in pass 4 so the text's
    ink (paper minus level, summed per letter cell over frames 800–814) is 0.99 of the source's (0.42 gave 0.96).
- **Card shadow on the page**: thrown down and right. shadowBlur 44 F0 px, offset (9, 16), black 0.6. It is deepest
  by the bottom-right corner, on the cloud. The source / render ratio beside each edge is ~0.7 by the right and bottom
  edges, fading by ~50 px, and there is almost no shadow left of or above the card.
- **Residual light over the card**: a quadratic fit of source minus render (+4 levels at the left and right edges,
  ~0 in the middle) is folded into the card's light field.

## The close-up's camera (s08, pass 4)

The push-in is a digital zoom anchored on the frame's right edge (fixed point x ≈ 2206). `CAM` in `src/shots/s08.js`
is now fitted source-to-source: every source frame 765–814 against frame 764 by ECC (affine, the card's text box
masked), composed with frame 764's own placement of F0, and reduced to a similarity. The affine departs from that
similarity by under 0.11 px anywhere in frame, and the fitted roll is ~0 (|rot| < 0.006°). The previous table came
from render-against-source fits and had drifted to a 0.028° roll, about 1.3 px at the far edge by 32.5 s. Switching
lowered the late frames' blurred error by ~0.15 levels. Tools: `snapshots/s08-p4-tools/camfit.py` (scratch).

## Compare-tool sampling (for anyone checking s08, or any shot, with tools/compare.sh)

`hyperframes snapshot` renders time T at floor(T·30)/30, while its `--against` reference is the first source frame
at or after T (ffmpeg output seeking, i.e. ceil(T·25)/25). For T on the 25 fps grid (multiples of 0.04 s) s08 shows
exactly the reference frame: s08 holds each source frame and maps a time between two frames to the next one. For
other T (for example 31.25) the pair can be one frame apart; use multiples of 0.04 s. At T = 30.56 the snapshot tool
renders 916/30 = 30.533, which is still s07. The film render samples 764/25 = 30.56 and shows s08.
