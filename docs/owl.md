# The B&W owl kit — `src/lib/owlInk.js`

The black-and-white owl (0–110 s) is one parametric rig. Give it a pose and it draws a soft, glowing, nearly-white
bird with fine dark accents: big eyes (black stare, or glossy with catchlights, or sly / tired / startled), a crossed
sticking-plaster bandage on its right brow, headphones (band, cushions, cups), a small beak, feathery ear tufts,
folded / spread / raised / arm-like wings, talons. Everything is seeded: the same pose always gives the same pixels,
so a held owl never boils.

The kit draws **finished pixels** (Canvas2D, not an engraving plate): the owl is brighter and softer than the room and
must not be cut into line-hatch like the scenery. Drop it on top of your engraved room (after `P.engrave`, or onto
`P.o` with `owlOnPlate`). The global grade adds halation, so the owl glows by itself — don't add your own glow.

**The s12 hero is not drawn by the rig.** The held close-up (s09 → s12, 32.6–35.36 s) is `src/shots/s12/hero.js`:
measured control points (`s12/geo.js`) plus ink strokes, tail/talon outlines and headphone lines traced from the
source frame at 34.0 s (`s12/strokes.js`, `s12/parts.js`, `s12/tone.js`, scripts in `s12/trace/`). Use it (via
`S12.draw` as s09 does) when you need that exact drawing. The kit's `sit3q` preset is re-fitted to the same
measurements and is a fair stand-in, but visibly simpler (gallery page 3).

## Start here (F4c): the presets fitted to the source

The first-pass presets (`front`, `fly`, `hips`, … below) draw the owl as a generic cartoon: black stare eyes, a tall
headphone arch, paddle feathers. The source owl looks different in its front views, so F4c added parts that match it
(glossy eyes with catchlights, the heart-shaped facial disc, the small shield beak, the spiky tuft, a slim band with
edge-on cups, layered and raised wings, scalloped folded wings, feathered arms, gripping talons, solid ink over the
print mesh) and **six presets posed from measurements of one source frame each**. Start new work from these:

| preset | source frame | what | for |
|---|---|---|---|
| `perch` | 21.0 s | sitting facing us on his shoulder, glossy eyes, wings folded at the sides, talons gripping | s04, s06 |
| `perchTired` | 27.5 s | `perch` with heavy drooping lids, looking down | s06 |
| `flyFront` | 18.5 s | flying at us, eyes shut, wings spread wide (layered) | s02 (take-off / flight), s16 |
| `flyToward` | 44.8 s | coming down the corridor, glossy eyes wide, sweat drop, wings out, feet reaching | s14, s15 |
| `startle3q` | 36.0 s | big three-quarter close-up: pin eyes, beak open, sweat, one wing flung up (raised), fluffed edges | s13 |
| `hipsSmug` | 105.0 s | standing, feathered wings on the hips, sly eyes with heavy brows, grin beak | s20, s24, s25 |

`FIT_PLACE[name]` = `{ x, y, s, t }`: the frame placement the preset was fitted at and the source time. Drawing
`{ ...owlPose(name), ...FIT_PLACE[name] }` reproduces the fit (gallery pages 10–15). Silhouettes land within roughly
5–20 px of the source at those placements; see "Honest limits" for what does not match.

```js
import { drawOwl, owlLayer, owlPose, FIT_PLACE } from "../lib/owlInk.js";

// the shoulder owl exactly where it sits at 21.0 s
drawOwl(ctx, { ...owlPose("perch"), ...FIT_PLACE.perch });
// the same owl smaller, somewhere else, blinking tired
drawOwl(ctx, { ...owlPose("perchTired"), x: 1500, y: 520, s: 0.8 });
// swap parts on any preset: eyes, beak, sweat
drawOwl(ctx, { ...owlPose("perch", { eyes: { state: "sly" }, beak: { style: "grin", smirk: 1 } }), x, y, s: 0.6 });
drawOwl(ctx, { ...owlPose("perch", { eyes: { state: "pin" }, beak: { open: 0.6 }, sweat: { az: 0.75, el: 0.35, size: 14 } }), x, y, s: 0.6 });
// flight: animate the wing points yourself (they are plain arrays) or bank with rot
drawOwl(ctx, { ...owlPose("flyFront", { eyes: { state: "glossy" } }), x, y, s: 0.4, rot: -0.3 });
```

Cost at the fit placements (1x, this machine, gallery page 9 of the scratch project): perch 12 ms, flyFront 24 ms,
flyToward 11 ms, hipsSmug 23 ms, startle3q (full-frame, s = 2.6) 80 ms, perch at s = 0.3 1.4 ms. Cache held poses.

### F4c pose options (all optional; the old presets do not set them and draw exactly as before)

| key | meaning |
|---|---|
| `ink: "solid"` | the print mesh (screentone) only cuts the smooth tone: ink lines (pixels darker than their 7×7 mean by > 0.05) and anything darker than 0.5 (eyes, cups) stay solid, as in the source. Without it the mesh also cuts grey strokes into dashes |
| `merge: true` | head and body painted as ONE soft mass (no seam or shade under the head, as in every front view); head / body contour strokes are kept to the parts of each outline not buried in the other (`outsideRun`) |
| `disc: "line"` | the facial disc as two fine grey lobes round the eyes meeting in a V notch (a heart), the lower rim fading; `discOpts: { w, v, ticks }`. `disc: 1` = the older feathered rims |
| `grain` | paper mottle strength (1/255; the fitted presets use 2.5–4 — the default 6 reads as dirt on a clean front view) |
| `sweat: { az, el, size, rot }` | a sweat drop on the head sphere (mirrored with `flip`) |
| `head.edge`, `body.edge` | `featherEdge` options: the silhouette breaks into triangular feather tufts between `from`..`to` (fractions of the outline) |
| `tufts[i].spikes` (+ `fan`, `curl`, `valley`, `seed`) | a spiky tuft of n points (the source's right tuft) instead of the two-lobed leaf |
| `headphones.slim` | the thin dark band with a pale highlight and grey ribbed sliders (`drawBandSlim`) |
| `headphones.cupStyle: "side"` | cups seen edge-on from the front: dark pleated cushion + bright metal rim + yoke (`drawCupSide`) |
| `headphones.far: false` | do not draw the far half of the band or the far cup (three-quarter views where the head hides them) |
| `headphones.cupRot` | extra cup tilt (radians, mirrored per side) |
| `feet[i].mode: "grip"` | a perched foot seen from the front: short plump toes curling over the perch, dark hooked claws |
| `feet[i].claw: "dark"` | dark talons (front views) instead of the pale horn claws of s12 |
| `feet[i].front: true` | draw the foot over the belly (perched / facing us) instead of behind it |
| wing `style: "layered"` (spread) / `type: "raised"` | the layered wing: rows of overlapping feathers — primaries off the hand (`Wr → T`), secondaries off the arm (`S → Wr`) hanging toward `trail`, two covert rows, a leading-edge band. Extra keys: `n`, `m`, `len`, `spread`, `fw` (feather width), `secLen` (secondary length factor), `cov` (covert rows), `point` (0 round .. 1 lanceolate), `bulge`, `seed`. `raised` = pointed, narrow, engraved feathers (a wing flung up) |
| wing `style: "scallop"` (folded) | the front view's folded wing: a teardrop with `rows` of round covert tips and primaries to the tip |
| wing `style: "feathered"` (arm) | an arm-wing thick at the shoulder, tapering, covert scallops, a fan of pointed `nf` fingers past the hand toward `fingers`, `fingerLen` |
| `beak.style` | `"shield"` (the small pale front-view beak, `open` parts it) or `"grin"` (hooked upper beak, grin sweeping to `smirk` side) |

### F4c eye states (`eyes.state`, or per eye `eyes.left/right.state`)

| state | look | notes |
|---|---|---|
| `glossy` | round dark iris inside a thin white rim and fine ring, lighter low down, big catchlight upper-left + small lower-right | `iris` (0.76), `look` moves the iris (raise `lookGain` for bigger looks), `catch: false` drops the lights |
| `tired` | glossy under a heavy straight upper lid drooping to the outer corner | `lid` (0.43), `droop` (0.2), `plumage` (lid value) |
| `sly` | almond opening, heavy upper lid past the outer corner, thin lower lid, part of a glossy iris looking sideways, heavy brow slanting down to the beak | `top`, `bot`, `tilt`, `iris`, `lookX` (default sideways look), `brow`, `browSlant` |
| `scowl` | `sly` narrowed, brow slanted hard | same keys |
| `pin` | startled: big white eye, heavy ring, dot pupil in a fine iris ring | `pupil`, `ringW` |
| `shut` | a soft downward arc, lash tick, faint lid contour | |

All F4c eye weights are in eye radii, so they look the same at any size. The first-pass states (`stare`, `glare`,
`half`, `angry`, `smug`, `sleepy`, `wide`, `startled`, `closed`) are unchanged.

### F4c part functions

| function | what |
|---|---|
| `drawCupSide(g, { x, y, r, rot, open, side })` | edge-on headphone cup (front views) |
| `drawBandSlim(g, pts, { w, slider, ends, ribs })` | slim dark headband with sliders |
| `drawSweat(g, { x, y, size, rot })` | sweat drop |
| `discLine(g, H, eyes, { w, v, ticks, seed })` | heart facial disc (`H = headGeom(head)`, `eyes` = `[{ x, y, r, sx, side, nz }]`) |
| `featherEdge(outline, { step, depth, lean, base, from, to, seed })` → points | serrated outline; fill it with `polyPathFn(points)` |
| `polyPathFn(points)` | a path function of straight segments (for serrated outlines) |
| `layeredWing(spec)` / `wingGeom(spec)` | geometry of the layered wing (`feathers[]` with `row` pri / sec / gc / lc, `lead`, `at(u)`) / of any pose wing |
| `featherShape(root, dir, L, w, point)` | a round paddle (`point` 0) or a lanceolate feather (`point` → 1) |
| `inPoly(p, poly)`, `outsideRun(outline, other)` | point in polygon; the longest run of an outline outside another polygon |
| `drawFoot(g, { mode: "grip", size, toes, spread, claw })` | front-view gripping foot |
| `drawBeak(g, { style: "shield" \| "grin", w, l, open, smirk, turn, rot })` | F4c beaks |

## Quick start (first-pass presets and the rig)

```js
import { drawOwl, owlLayer, owlPose, HERO_PLACE } from "../lib/owlInk.js";

// one call per frame (≈5–12 ms at s ≤ 1, ≈57 ms for a full-frame owl — cache static poses, see below)
const a = drawOwl(ctx, { ...owlPose("fly"), x: 1100, y: 480, s: 0.6 });
// a.head, a.beak, a.eyes[0|1], a.wingTips[], a.wrists[], a.feet[], a.root, a.bbox  (frame px) — attach props here

// variations are plain overrides, merged deeply (objects merge, arrays replace):
drawOwl(ctx, { ...owlPose("front", { eyes: { state: "smug", look: [0.6, 0] }, beak: { smirk: 1 }, head: { roll: 0.1 } }), x, y, s: 0.8 });

// held pose: build once, blit every frame (animate by transforming the cached canvas)
let L = null;
draw(ctx, local) { if (!L) L = owlLayer({ ...owlPose("front"), x: 800, y: 500, s: 0.9 }); ctx.drawImage(L.canvas, L.x, L.y, L.w, L.h); }
```

## Placement (`drawOwl` / `owlLayer` options, besides the pose)

| key | meaning |
|---|---|
| `x, y` | frame position of the pose root (0,0) = middle of the body |
| `s` | frame px per owl unit. The head's vertical radius is ~100 units, so `s = 1` → a ≈200 px tall head, the whole sitting owl ≈ 420 px tall. The s12 placement is `HERO_PLACE = { x: 1296, y: 636, s: 2.6 }`. |
| `rot` | radians, whole bird (tumbling, banking) |
| `flip` | mirror left/right. The bandage stays on the owl's own right brow; light is mirrored back so it still comes from the frame's upper left |
| `lightFrame` | light direction in frame coords (unit vector toward the light), default `[-0.55,-0.83]` (upper left) |
| `res` | supersample (e.g. 2 for a layer you will zoom into) |
| `detail` | 0..1 texture amount; defaults from size (`s·res/1.2`). Below ≈0.3 the strokes, disc rims and screentone drop out (tiny owls stay clean); the paper grain fades in above ≈0.45 |
| `tone` | `false` skips the screentone + grain pass (≈2× faster; use for small or fast-moving owls) |
| `grain` | paper-mottle strength in 1/255 (default 6, scaled by detail; 0 = off) |
| `texture` | `"classic"` = the first-pass plumage texture (rim hatching, chest rows, 4.2 px mesh, no grain). Default = the hero-derived stroke language below |
| `clip` | `[x0,y0,x1,y1]` frame rect to limit the layer canvas (large owls partly off frame) |
| `canvas` | reuse a canvas for the layer (animated owls: pass the same canvas every frame) |
| `extra(g, geo)` | hook called last, in owl units, to draw props that must sit on top (held scissors etc.). `geo` has `H` (head geometry), `eyes`, `beak`, `wings`, `hp` (headphone geometry) and `toF` (units → frame) |

`owlLayer(...)` returns `{ canvas, x, y, w, h, anchors }`; `drawOwl(ctx, ...)` draws it and returns `anchors`.

### The plumage language (default texture)

Taken from the hero's traced ink (s12): a clean silhouette; long thin strokes running *along* the shadow-side edges
(`contourStrokes`), not hatching across them; sparse clusters of 2–3 soft strokes following the feather flow
(`plumageStrokes`); a crown fringe; folded wings as rows of lanceolate coverts whose lower edges sweep to the tip and
hook back, primaries converging on the tip, a heavy lower edge that swells toward the secondaries' end (measured
width profile) with the notch; tails as long spear feathers separated by dark keylines; a 3.7 px print mesh in the
mid-greys and a seeded 2-scale paper mottle in the lit whites.

## Presets (`POSES`, `owlPose(name, overrides)`)

The F4c presets (`perch`, `perchTired`, `flyFront`, `flyToward`, `startle3q`, `hipsSmug`) are described at the top.
The first-pass presets:

| name | what | used for |
|---|---|---|
| `sit3q` | sitting three-quarter, head turned to viewer's left, tail right, hooded stare. Re-fitted (fix pass 1) to the s12 measurements (head IoU 0.95, head+body 0.96, wing 0.95, tail 0.84; eyes, beak top, plaster centre and near-cup centre on the measured points) | s09 fallback, anything that needs the hero pose at another size |
| `glare` | `sit3q` with the measured 35.20 head move (−2.63°), glare lids | s12-style pop |
| `sleep` | `sit3q` with the measured 35.28 head move (−5.15°), eyes shut | dozing |
| `front` | sitting facing us, wings folded at the sides | s02, s04, s06, s14, s16 |
| `frontStand` | `front` on visible legs, toes spread | s22, s23 |
| `hips` | `frontStand`, wings bent onto the hips, angry brows | s25 hands on hips |
| `smirk` | `frontStand`, smug lids, beak smirk, head tilted | s20 |
| `startled` | pin-prick pupils, beak open, wings flung up | s13, s25 |
| `wingUp` | startled, one wing flung up, the other folded | s13 |
| `tumble` | startled, wings thrown out unevenly, `rot: 2.3` (animate `rot`) | s16, s19 |
| `hold` | standing, both wings forward as arms (hands = `anchors.wingTips`) | holding the card / scissors |
| `fly` | wings spread level, feet dangling | s02, s14–s17, s26 |
| `flyDown` | wings on the downstroke | alternate with `fly` to flap |
| `angry` | `fly` with angry eyes and open beak | s24 |
| `walk` | side view walking right, head turned to face the way it goes (derived from the frozen first-pass sit3q, so it did not change when sit3q was re-fitted) | s14, s21, s22 |
| `carry` | standing, wings raised overhead, looking up | s23, s25 |

Flap: interpolate between `fly` and `flyDown` wing points yourself (they are plain arrays), or alternate them on twos.
Tumble: animate `rot`. Blink: switch `eyes.state` to `"closed"` (first-pass) or `"shut"` (F4c) for 2 frames.

## The pose object (owl units, root = middle of the body, y down)

```js
{
  head:  { x, y, rx: 109, ry: 100, yaw, pitch, roll, square: 2.6, jowl: 0.05 },
         // yaw + turns the face to the viewer's right; pitch + looks up; roll + tilts clockwise.
         // square: superellipse exponent of the top half (flat, tufted brow); jowl: fuller cheeks
  tufts: [{ at, size, width, lean, second, curl }],   // ear tufts; at = polar angle from the top of the head (+ right)
  body:  { x, y, a, b, rot, egg, sag },               // egg: a = half length along rot (rot points at the tail end)
  tail:  { base:[x,y], tip:[x,y], w, n } | null,       // n long overlapping spear feathers
  wings: [                                              // drawn in order; layer "back" = behind the body
    { type: "folded", layer, S:[shoulder], T:[tip], width, back, dir, seed, style },  // dir +1 if the belly side is clockwise of S→T; style "classic" = first-pass texture
    { type: "spread", layer, S, Wr:[wrist], T, trail:[unit], len, spread, n, m },  // trail = direction the feathers hang
    { type: "arm",    layer, S, Wr, T, len },          // wing bent like an arm (hips, holding)
  ],
  feet:  [{ x, y, rot, size, mode: "perch"|"stand"|"dangle", toes: 3|4, spread, leg }],
  eyes:  { state, r, spread, el, look:[lx,ly], left:{...}, right:{...}, over:{...} },
         // spread/el = azimuth/elevation of the eyes on the head sphere; left/right override one eye (viewer's
         // left/right) with any drawEye option, plus `off: [dx, dy]` (head-local units) to nudge that eye's centre;
         // over applies to both. Useful per-eye keys: r, sx (width factor), pupil, look, lid, lidW, slant, hood, lookGain
  beak:  { el, lift, w, l, open: 0..1, smirk: 0..1, rot },
  bandage: { az, el, size, rot, sx, sy } | null,        // on the head sphere; az is mirrored with flip automatically
  headphones: { on, yaw, dx, dy, lift, r, bandR, bandH, tilt, open, cupEl, w, nearRibs },
         // the headphone rig has its own yaw/offset (the hero's headset sits turned further than the face);
         // lift = cup distance from the head centre (head radii), bandH = arch height, open = how much cup face shows
  light: [lx, ly],  flow: [fx, fy],  disc: 1            // light (owl units), main feather flow, facial-disc rims on/off
}
```

## Parts (use directly for close-ups, props, or poses the rig does not cover)

All take a 2D context already transformed so that 1 unit = your drawing unit. When you call parts directly on a
scaled context, call `setPPU(pixelsPerUnit)` first so blur radii and hairline minimums come out right.

| function | what |
|---|---|
| `drawEye(g, { x, y, r, sx, rot, side, state, look, lookGain, hood, lid, pupil, slant, curve, brow, low, lidW, ext })` | one eye. `state`: `stare`, `glare`, `half`, `angry` (brow + slanted lid), `smug` (lids down, lower lid up, brow), `sleepy`, `wide`, `startled` (pin-prick pupil + iris ring), `closed`. `side` −1/+1 = viewer-left/right eye (sets which corner is inner). `look` moves the pupil by up to (1 − pupil) eye radii — use a smaller `pupil` (e.g. `wide`) or `lookGain` 2–3 for looks that read. `hood` 0..1 runs the black up under the inner half of the lid (the hero's hooded stare). `sx` foreshortens (turned head). Any `EYE_STATES` field can be overridden. |
| `drawBeak(g, { x, y, w, l, rot, turn, open, smirk })` | small hooked beak, top centre at (x,y). `turn` −1..1 shows one cheek; `open` drops the lower mandible |
| `drawBandage(g, { x, y, size, rot, cross, sx, sy })` | two crossed plasters (long perforated strip under, short padded strip over) |
| `drawHeadphones(g, H, HP, layer)` | the whole rig on a head (`H = headGeom(head)`, `HP = pose.headphones`); `layer` `"back"` (band behind the crown + far cup), `"front"` (band over the crown + near cup) or `"both"`, so you can paint the head in between. Returns the geometry |
| `drawCup(g, { x, y, r, rot, open, side })` | one headphone cup: ribbed dark cushion on the head side, brushed metal shell, dark-rimmed halftone plate, pale yoke arm, hinge. `side` +1 = plate faces viewer's right; `open` 0.4 (edge-on) .. 0.85 (3/4) |
| `drawBand(g, pts, { w, ends, ribs, halftone })` | headphone band along a polyline: metal strip, halftone inner half, knurled sliders at the ends |
| `headphoneGeom(H, HP)` | the band arc and cup positions for a head; split into front/back runs for correct overlap |
| `drawWing(g, spec, { light, detail })` | one wing on its own (`spec` = a pose wing object); returns its geometry |
| `drawTail(g, { base, tip, w, n }, { light, detail })` | a tail of `n` spear feathers |
| `drawFoot(g, { x, y, rot, size, mode, toes, spread, leg })` | talons: padded toes with scale creases, long pale hooked claws with a dark nail-bed crescent and inner keyline (accents scale down on small feet); `perch` curls over an edge, `stand` splays, `dangle` hangs |
| `headGeom(h)` | head outline + sphere projector `P(az, el, lift)` → `{x, y, nz}` (nz < 0 = facing away) + `at(phi)` outline point/normal |
| `tuftShape(H, t)`, `bodyOutline(b)`, `tailShape(t)`, `foldedWing(w)`, `spreadWing(w)`, `featherShape(root, dir, L, w)` | shape builders (point lists in units). `foldedWing(w).P(t, k)` = point at fraction t along shoulder→tip, k units toward the belly side |

### Plumage and feather-edge helpers

| function | what |
|---|---|
| `plumage(g, pathFn, { base, shade, light, depth, blur, keep })` | the soft-white fill: rim at `shade`, a blurred core pushed `depth` toward the light at `base`. `keep:[dx,dy]` keeps a second side bright |
| `softShade(g, clipPathFn, shapeFn, value, alpha, blur)` | soft shadow/glow inside a clip (belly shade, under the headphone cup) |
| `contourStrokes(g, outline, { light, thr, step, depth, len, w, color, from, to, density })` | long thin strokes running along the shadow-side part of an outline, just inside it (the source's feathered back edges) |
| `plumageStrokes(g, clipPathFn, box, dir(p, r), { density, len:[a,b], w:[a,b], n:[a,b], gap, color, keep })` | scattered clusters of 2–3 soft strokes following a flow field |
| `strokeGroup(g, p, dir, { n, len, w, gap, color, curve, seed })` | one cluster of near-parallel tapered strokes |
| `rimHatch(g, outline, {...})` | shadow-side inward hatching (first-pass look; still available) |
| `edgeFlicks(g, outline, { step, len, w, color, ang })` | sparse grey feather flicks just inside an outline |
| `featherRow(g, pts, { step, len, ang, gap })` | a row of strokes leaving a curve at an angle (facial-disc rims, brows, chest rows) |
| `regionFlicks(g, cx, cy, rx, ry, angle, n, len, seed)` | scattered strokes in an ellipse |
| `fringe(g, outline, {...})` | tiny spikes of plumage pushed out past a silhouette (use sparingly) |
| `screentone(canvas, { pitch, amp, white, range, grain, cross, keepInk, floor })` | the print mesh cut into the mid-greys of a finished layer (device px); `grain` (e.g. 6/255) adds the seeded paper mottle to the lit whites, `cross` < 1 weakens the second mesh family; `keepInk` (e.g. 0.05) leaves pixels darker than their 7×7 mean by more than that (ink lines) solid; `floor` (default 0.22) = no mesh below this value. Defaults = the original mesh exactly |
| `grainTile()` | the 128² seeded, unit-variance mottle tile (2 px speckle + 5 px blotches, skewed bright) |
| `plumagePlate(P, pathFn, { base, shade, angle, light, depth })` | the same soft-white value study painted into an engraving `Plate` (flat style 2), for owls that must live inside a plate |
| `owlOnPlate(P, pose)` | draw a finished owl onto `P.o` (composited over the engraving untouched) |
| `ink(g, pts, w, color, {end, bias, pow})`, `flick(g, p, dir, L, w, color)`, `walk(poly, step, seed, fn)`, `area(pts)` | swelling/tapering ink line through control points; a single tapered feather flick; walk along a polyline; signed area |

## Examples

```js
// s13 startled with one wing up, facing us, a little rotated back
drawOwl(ctx, { ...owlPose("wingUp"), x: 700, y: 520, s: 1.3, rot: -0.12 });

// s20 smirk with the head turned to camera-right and the eyes sliding left (smaller pupils so the look reads)
drawOwl(ctx, { ...owlPose("smirk", { head: { yaw: 0.3 }, headphones: { yaw: 0.3 }, eyes: { look: [-0.7, 0.1], over: { lookGain: 2 } } }), x, y, s: 0.5 });

// s24 angry, flying, scissors in the beak: draw the prop in owl units on top via `extra`
drawOwl(ctx, { ...owlPose("angry"), x, y, s: 0.9, extra: (g, geo) => drawScissors(g, geo.beak.x, geo.beak.y + 40) });

// tumbling: animate rot (and flip the startled face every few frames if you like)
drawOwl(ctx, { ...owlPose("tumble"), x, y, s: 0.7, rot: 2.3 + local * 9 });

// holding something: the hands are anchors.wingTips
const a = drawOwl(ctx, { ...owlPose("hold"), x, y, s: 0.8 });
drawCard(ctx, (a.wingTips[0][0] + a.wingTips[1][0]) / 2, a.wingTips[0][1]);

// tiny owl in the dark (no texture, no tone)
drawOwl(ctx, { ...owlPose("fly"), x, y, s: 0.12, tone: false });

// a close-up assembled from parts: a folded wing and tail at 2.2 px/unit, an eye on its own
setPPU(2.2); ctx.save(); ctx.translate(40, 60); ctx.scale(2.2, 2.2);
drawWing(ctx, { type: "folded", S: [30, 60], T: [260, 200], width: 58, back: 55, dir: 1 });
drawTail(ctx, { base: [220, 200], tip: [330, 240], w: 26, n: 3 });
ctx.restore();
setPPU(1); drawEye(ctx, { x: 900, y: 400, r: 180, side: 1, state: "angry", look: [0.3, 0.2] });

// the head between the two headphone layers (custom head drawing)
const H = headGeom(pose.head); drawHeadphones(g, H, pose.headphones, "back"); myHead(g, H); drawHeadphones(g, H, pose.headphones, "front");
```

## Gallery

`paintGallery(ctx, page)` paints: **0** every first-pass preset, **1** parts (eye states, look directions, beaks,
bandage, cups, band, feet, head yaw/pitch sweeps), **3** the kit's `sit3q` at `HERO_PLACE` (compare with the source at
34.0 s), **4** parts at close-up scale (folded wing + tail, talons, headphone front / 3-4 / side, large eye states),
**5** more first-pass presets and variations (wingUp, tumble, hold, a prop via `extra`, looks, flips, banking,
s = 0.2), **6** the F4c eye states (two sizes, looks), **7** the F4c presets and variations (part swaps, flips,
banking, yaw, s = 0.14–0.25), **8** the F4c parts at close-up scale (layered / raised / scallop / feathered-arm wings,
grip feet dark / pale, edge-on cups + slim band, shield / grin beaks, sweat, a `featherEdge` head with a spiky tuft and
`discLine`), **10–15** each fitted preset alone at `FIT_PLACE` (pair it with the source frame at `FIT_PLACE[name].t`).

- In a browser: serve the project root with any static server and open `tools/owl-gallery.html` (kept in
  `tracing/owl/tools-dev-pages/`; copy it back to `tools/` first, it imports `../src/lib/owlInk.js`; opens on page 7;
  page 2 is a live playground with sliders and anchor dots; the "fit" menu opens pages 10+).
- Headless (no server): a scratch HyperFrames project whose timeline shows page `floor(t)` — this pass used
  `snapshots/s12-f4c-gal/` (`index.html` + `src/` and `assets/` symlinked; page 9 there times `owlLayer`):
  `cd snapshots/s12-f4c-gal && npx --yes hyperframes@0.8.69 snapshot . --at 7.5,8.5,10.5 --no-end --describe false -o out`.
  `tools/owl-gallery.html` itself was checked the same way inside an iframe (`snapshots/s12-f4c-htmltest/`).

## Honest limits

- **The F4c presets were each fitted to ONE source frame** (placement, head / eye / beak / cup / wing / feet positions
  from 2x grid crops). At the fit placement the silhouettes land within roughly 5–20 px of the source (overlays in
  `snapshots/s12-f4c-meas/fit-*.jpg`); they were not tracked through the shots' motion.
  - `perch` / `perchTired`: silhouette, face layout and headphones close; the source's plumage is softer and its
    body shading greyer at the edges; the spiky tuft reads darker and more thorn-like than the source's soft tuft;
    the grip talons are smaller and simpler than the source's.
  - `flyFront` / `flyToward`: wing extents and head / body land on the source; the source's wing feathers are softer
    and more blurred (its flight frames are motion-soft) and the primaries overlap more.
  - `startle3q` is the loosest: body, head, eyes and the raised wing's outline land close, but the beak is the
    first-pass hooked beak (the source's open beak is bigger with a visible tongue), the feathered edges are regular
    triangles where the source has soft tufts, and the headphone band only roughly follows the source's arc.
  - `hipsSmug`: face (sly eyes, brows, grin) and stance read right; the feathered arms are simpler tubes than the
    source's wings and the standing feet are thin; no scissors (props belong to the shot).
- The first-pass presets are unchanged (bit-identical renders of gallery pages 0, 3 and 5 before / after F4c), so shots
  built on them do not move. Their look (black stare eyes, tall arch band, paddle feathers) is NOT the source's front
  views — prefer the F4c presets or switch parts with the options above.
- The headphone rig is a 3D arc on the head sphere; at strong yaw use `far: false` and lower `bandH`. The cups are
  generic drawings (the hero's cup in s12 is measured).
- `look` travel is small with large irises (by design); raise `lookGain`.
- Speed: see the F4c section; first-pass presets as before (`sit3q` at s = 2.6 ≈ 57 ms, `fly` s = 0.8 ≈ 11 ms,
  `front` s = 0.4 ≈ 5 ms, 2 ms with `tone: false`).
