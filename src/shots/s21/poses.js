// s21's owl poses (units of s21/owl.js: head radius 100, origin = head centre, facing right), measured on the source
// (see fidelity/s21.md). Kept apart from the shot so a neighbouring shot (s22 continues the cutting walk in the same
// framing) can draw the same bird: import { TOP } from "./s21/poses.js" and { owlSprite } from "./s21/owl.js".
import { over } from "./owl.js";

// ---------------------------------------------------------------- owl poses (s21/owl.js units: head r = 100,
// origin = head centre, facing right). Measured on head-centred unit grids of the source (70.44, 71.20, 71.92,
// 72.00, 72.12, 72.20, 72.44, 72.92, 74.00).
// pass 2: the eye's white fuller (the lid covers less), the brow shorter toward the beak; the band ~7 px wide
// like the source's (was ~4); the head's top a little flatter (square 2.5)
export const FACE = {
  // (fix pass: a narrow slit of a white under a heavy brow wedge, sunk in a grey socket — see owl.js paintEye)
  // (the brow: an arch that starts low behind the eye, peaks over its back third and falls heavily to the front
  // corner — source 70.40 at 7x: (253, 787) → (262, 784) → (272, 790))
  eye: { az: 0.5, el: -0.2, dx: 0, dy: 0, rx: 24, ry: 19, slit: 1.2, brow: 0.85, look: [0.45, 0.15], pupil: 0.5, open: 0, vbrow: 0, tilt: 0.08, reach: 1.15, browFrom: -1.3, b0y: 0.45, b1x: 0.3, b1y: 1.75, b2y: 0.05, round: 0, bot: 1.15, browLift: 0, socket: 0.68, socketA: 0.4 },
  // (fix pass: a side-on hooked beak ~12 × 10 px, projecting from the face (source 71.00: root (385, 787), tip (395, 796)))
  beak: { side: true, el: -0.35, lift: 0.98, w: 30, l: 32, dir: 0.35, muzzle: 0, mOff: [0, 0], mh: 62, ml: 40, mdir: 0 },
  // the band stands up off the head in a loop (source 69.48–71.20: its apex ~10 px above the crown)
  phones: { cupAz: -0.05, cupEl: 0.1, r: 44, lit: 0, bandW: 22, bandLift: 1.1, bandH: 1.35, bandTilt: 0.2, cupOff: [0, 0],
    loop: { k: 0, c: [-70, -66], rx: 24, ry: 31, rot: 0.12, w: 17, v: 0.28 } },
  // (fix pass 1b) the plaster: an outlined strip with a triangular pad under it (s21/owl.js paintPlasterPad)
  // (the nape shade exists on every pose so blends never pop; only the flight turns it on)
  nape: { c: [-70, -25], rx: 0.8, ry: 1.1, rot: 0.3, v: 0.45, a: 0, blur: 18 },
  // (vis: its opacity — hidden while it walks and crouches, where the source shows only mottle on the crown)
  bandage: { style: "pad", az: -0.25, el: 0.78, off: [0, 0], rot: 0.02, len: 64, wd: 10, tw: 24, th: 16, tdx: 6, line: 0.36, a: 0.85, lwPx: 1.35, vis: 0 },
};
// A) walking in (70.44): head 3/4 to the right, body behind and below it, the tail out to the lower left
// (pass 2, measured on source/probe overlays at 70.44: the cup is smaller and ~3 px lower than FACE gives, the eye
// ~5 px higher)
export const WALK = {
  ...FACE,
  // (fix pass: ~2–4 px lower than pass 2 put it — lmk overlays at 70.40 / 71.00 put its centre on the source's lid)
  // (round 3: head-window NCC fit over 69.76–70.72, 0.74 → 0.84 — the cup ~6 px lower and smaller, sitting further
  // round the back, the eye 1–2 px lower; the head 4.5 px back and 1.4 px lower on the body)
  eye: { ...FACE.eye, el: -0.095, az: 0.365 },
  // the band: a grey loop standing ~13 px up off the back of the head (source 70.80), not an arc over the crown
  // (round 3: the band as dark as the source's, ~60–80 post-grade — it was a light grey loop)
  // (fix pass 2: the look-up's arch was tried for the walking band too — fitted to 7x crops at 70.40 / 70.60 / 70.80 —
  // and made the walk's head window worse, MAE 21.8 → 24.0 over 69.6–70.8; a 1.4× wider, raised, darker 3-D band
  // measured 21.8–22.3; round 3's band is kept)
  phones: { ...FACE.phones, cupEl: -0.08, cupAz: 0.2, r: 35, bandSq: 0.6, bandTone: 0.3, bandH: 1.3 },
  // (the source's walking head is lower-topped: its crown sits 5–9 px under ours over 69.5–71.9 while eye and cup
  // line up — squashed to 0.8 in height)
  head: { yaw: 0.9, nod: 0, roll: 0.05, r: 90, bump: 12, square: 2.5, sx: 1, sy: 0.8125, jowl: 0.08, off: [-15, 4.5], outOff: [0, 0], dent: { ang: -0.95, amp: 0, w: 0.3 } },
  shade: 0.8,
  // (fix pass 1b: more plumage texture and deeper grey modelling, as the review asked — 45 scallop strokes (26), a
  // deeper belly shade, the neck's shadow on the chest, a ragged body edge; measured neutral (detail inside the owl
  // unchanged, walk MAE +0.2). Mottle 0.18 was tried and darkened the mid-tones 3–6 levels, so it stays 0.13)
  mottle: 0.13, scallopN: 45, bellyV: 0.6, bellyA: 0.6, neckA: 0.45, neckV: 0.55, edgeJit: 5,
  // (fix pass: fitted by silhouette IoU over 69.80–70.80 with the fan wing and the measured legs in place —
  // 0.681 → 0.703: the body stands more upright and reaches further down at the back, the tail hangs lower)
  // (round 3: body-window NCC fit over 69.92–70.64, 0.913 → 0.920: the body ~4 px lower and fuller, the tail longer)
  body: { x: -46.25, y: 140.5, a: 154, b: 109, rot: 2.31, egg: 0.4 },
  tail: { base: [-157, 217], tip: [-247, 268], w: 34, n: 2 },
  // (pass 2: the source's carrying wing sweeps its feathers forward-down toward the rings — the first pass hung a
  // comb of long secondaries straight down)
  // (fix pass: a FAN of long pointed feathers, measured on a 6x crop at 70.40: shoulder (215, 815), hand tip (300, 812)
  // just inside the upper ring, lower-edge tips at (240, 843) (250, 847) (262, 845) (275, 840) (288, 830))
  // (9x crop at 70.40: shoulder (215, 815), hand tip (300, 812) just inside the upper ring, lowest back tip (230, 848),
  // the serrated lower edge 16 px under the straight tip line; secondaries point 60° down, primaries 29° up)
  grip: { type: "fan", S: [-135, 94], B: [-85, 204], sag: 55, thB: 60, thP: -29, n: 8, aim: "upper", off: [-16, -7] },
};
// looking up (71.20): more upright, the head tipped back, the eye rolled up (the brow stays angry)
export const LOOK = over(WALK, {
  // (round 3: head-window NCC fit over 71.12–71.60, 0.840 → 0.860: head 1 px lower and a little taller, the eye
  // further round toward the back, the cup lower and further back)
  // (then corrected by hand on gridded 6x crops at 71.36: the head outline 4–5 px further forward with the eye kept —
  // front edge (392, 780) as the source's; the band a dark loop at the back edge, the cup's lower part x 340–362)
  // (fix pass 1b) re-fitted with the new face on red/cyan overlays and gridded 7–10x crops at 71.20 / 71.36 / 71.60:
  // the source's look-up head is narrower than the walking one, its brow chamfered down to the muzzle, the lower face
  // full round it (the owl.js dent / bump / jowl); head window x 330–410 / y 745–805 MAE 28.2 → 20.0, NCC 0.85 → 0.92
  // (round 3 had yaw 0.9, nod −0.4, roll −0.05, sy 0.8875, off [0, 7.5])
  head: { yaw: 0.9, nod: -0.4, roll: -0.05, sx: 0.75, sy: 0.97, jowl: 0.7, bump: 42, off: [-19, 4], dent: { ang: -0.95, amp: 3, w: 0.3 } },
  // (fix pass: silhouette fit over 71.20–71.60, IoU 0.756 → 0.764)
  // (round 3: body-window NCC fit over 71.12–71.60, 0.908 → 0.917: a little shorter and higher, the tail tip 6 px in)
  // (fix pass 1b: the review asked for the body ~12 px lower so the belly hangs over the legs; 20 units (6 px) lower
  // raised the body-window MAE at 71.20 / 71.56 from 20.3 to 23.2 — kept where round 3 fitted it)
  body: { x: -11.25, y: 157.5, a: 153, b: 104, rot: 2.23, egg: 0.06 },
  tail: { base: [-118, 244], tip: [-167, 317], w: 42 },
  eye: { look: [0.3, -0.55], open: 0.35, bot: 0.45, el: -0.28, az: 0.7, browLift: 0.5,
    // (fix pass 1b) the ROUND look-up eye (source 71.36 at 7x: a white ~13 × 12 px centred ≈ (369, 777), the pupil in
    // its top front, a thin grey brow arching from (360, 772) over (369, 770) to (380, 771), no black wedge)
    round: 1, rr: 19.5, rSx: 1.12, rdx: 23, rdy: -17.5, rLook: [0.75, -0.8], rPupil: 0.36, rLid: 0.2, socketA: 0.1,
    rBrow: [[-1.35, -0.35], [-0.8, -1.1], [0, -1.3], [0.9, -1.3], [1.8, -1.05]], rBrowW: 0.26 },
  // (fix pass 1b) the plaster: an outlined strip with a triangular pad under it on the crown (source 71.36 at 7x: the
  // strip x 354–370 / y 765–768, the pad's apex ≈ (361, 771))
  bandage: { az: -0.25, el: 0.78, off: [2, 19], vis: 1 },
  // (fix pass 1b) the bulbous muzzle of the look-up (source 71.36 at 7x: its front at x ≈ 389, top y ≈ 775, the lip
  // line at y ≈ 781)
  beak: { dir: 0.08, muzzle: 1, mOff: [16, -4], mh: 52, ml: 40, mdir: 0.03 },
  // the cup stays low at the back while the head tips up (source 71.20: ~6 px lower, 4 px further forward)
  // (fix pass 1b) the band a thick dark LOOP standing off the back of the head with a dark hole in it (source 71.36 at
  // 7x: outer x 330–353, top y ≈ 754, the hole x 339–345 / y 759–769) — it was squeezed to a grey column; the cup
  // under it ≈ x 336–356 / y 781–797
  // (fix pass 2) the loop redrawn as one ARCH (s21/owl.js paintLoop arch): its centreline read on 7x crops at 71.20 / 71.60
  // — from behind the cup top (337, 785) up (335, 776) (336, 763) (342, 756) to the apex (347, 754), forward (352, 757)
  // onto the crown (355, 761), ~6 px thick; the dark gap under it ≈ (344, 764), 6 × 10 px
  phones: { cupAz: 0.05, cupEl: -0.24, r: 38, bandTilt: 0.1, bandSq: 0.3, bandTone: 0.3, cupOff: [-8, 3], loop: { k: 1, c: [-60, -64], hole: 0.06,
    arch: [[-71, -2.5], [-77.4, -33.9], [-70.6, -76.3], [-50.5, -97], [-31.2, -103], [-15, -93.2], [-6.1, -78.1]], holeC: [-44, -72.6], holeR: [10.7, 16.7], w: 19, v: 0.28 } },
  // (71.40: shoulder (330, 810), hand tip (412, 802), lowest back tip (343, 842), the lower edge 22 px under the tip line)
  // (fix pass 2: a coordinate descent of the fan against the source (harness score, window head + (−28…82, −5…85) px,
  // σ1.5, 1 − NCC + MAE/100, 71.12–71.60: 0.409 → 0.343) puts the hand tip ~3 px further into the upper ring's hole and
  // the wing's back and lower edge lower — the source's front feathers grip into the ring; round 3 / 1b: S [−113, 88],
  // B [−70, 195], sag 73, off [−15, −12])
  grip: { S: [-121, 112], B: [-54, 187], sag: 65, thB: 55, thP: -30, off: [9, 4] },
});
// crouched for take-off (71.92): low and forward, the head down over the rings
export const CROUCH = over(WALK, {
  // (round 3: head-window NCC fit over 71.84–71.96, 0.78 → 0.87)
  head: { yaw: 0.95, nod: 0.3, roll: 0.08, sy: 0.7875, off: [-16.5, 0] },
  // (fix pass: silhouette fit over 71.84–71.96, IoU 0.658 → 0.700)
  body: { x: -85, y: 136, a: 170, b: 121, rot: 2.57, egg: 0.4 },
  tail: { base: [-222, 213], tip: [-310, 240], w: 46 },
  // (71.92: shoulder (340, 832), hand tip (422, 840) in the upper ring, lowest back tip (345, 856), sag 13 px)
  grip: { S: [-159, 107], B: [-142, 187], sag: 43, thB: 60, thP: -11, off: [-13, -10] },
  eye: { el: -0.17, az: 0.26 },
  beak: { dir: 0.6 },
  phones: { cupEl: -0.05, cupAz: 0.025, r: 41, bandSq: 1, bandTone: 0.5, bandH: 1.3 },
});
// B) flying: the body hangs under the head, legs dangle
export const FLY = over(WALK, {
  // (round 3, from gridded 6x crops at 72.16 / 72.40: the crown 7–8 px lower with the eye where it was — the head
  // flatter (sy 0.8) and 2 px lower; the cup ~9 px lower, bigger and less foreshortened, the band a thick dark loop
  // standing ~10 px off the crown)
  head: { yaw: 0.9, nod: 0, roll: 0, sy: 0.8, off: [0, 6] },
  // (pass 2: the flying body is much plumper than the first pass drew it — fitted by silhouette IoU over 72.04–72.40
  // and 72.68–72.96 with the wings and legs in place: ×1.3 long, ×1.44 wide, 28 units lower)
  body: { x: -35, y: 188, a: 146, b: 138, rot: 1.95, egg: 0.14 },
  tail: { base: [-88, 295], tip: [-188, 345], w: 40, n: 3 },
  grip: null,
  shade: 0.85,
  // (in flight the source's eye is a slit under a heavy brow in a dark socket, 72.16–72.60)
  // (eye-window NCC over 72.04–72.56, ncc 0.8–0.94: the source's eye (+2.4, +1.1) px from ours)
  // (fix pass 1b) not the black crescent: a straight heavy scowl falling from above the back of the eye to its front
  // corner, over a small white in a dark socket (source 72.32–72.56)
  eye: { el: -0.04, az: 0.5, dx: 7, dy: 3, slit: 0.5, brow: 0.95, socket: 0.45, socketA: 0.8, browFrom: -1.1, b0y: 1.25, b1x: 0.5, b1y: 1.05, b2y: 0.15, ry: 16 },
  // (round 3: in flight the source's face is a round muzzle with only a small beak showing — 72.20–72.72)
  beak: { dir: 0.5, shrink: 0.4 },
  phones: { cupEl: -0.25, cupAz: -0.05, r: 46, fxMin: 0.7, bandSq: 1, bandTone: 0, bandH: 1.45, bandLift: 1.15, bandW: 24 },
  // (fix pass 1b) no ear tufts in flight: round 3's two white pointed tufts read as cat ears on the silhouette
  // (72.44–72.76); the source's climbing head shows a dark band and nape across the crown instead. Kept as zero-size
  // entries so they grow into TOP's as it lands.
  tufts: [{ at: -0.42, size: 0, width: 0.3, lean: -0.25 }, { at: 0.95, size: 0, width: 0.26, lean: 0.2 }],
  // (fix pass 1b) the back of the head and the nape in shadow (the review measured the back half of the head 15–20
  // levels brighter than the source's at 72.24–72.56; a head-window check, x ±30 px round the head over 72.16–72.60,
  // prefers a light touch: none 28.5, a 0.45 over the whole back 29.7, this 28.4 MAE)
  // (fix pass 2: narrowed to the rear third, as the review asked — head window 28.33 → 28.28; stronger or wider shades
  // measured 28.31–28.43, so the flight head's remaining gap there is not the shade)
  nape: { c: [-80, -20], rx: 0.45, ry: 1.0, rot: 0.3, v: 0.55, a: 0.35, blur: 12 },
  // the plaster on the crown in front of the band (source 72.16 / 72.32: the outlined strip and pad ~18 px above the
  // head centre)
  bandage: { vis: 1, off: [-12, 2], len: 46, wd: 9, tw: 18, th: 12, tdx: 4, a: 0.6 },
});
// C) on the header's top edge (74.00): hunched forward, the head rolled down over the blades, the back high
// pass 2: the head centre sits (+6.5, +4.9) px from the first pass's (fitted to the source's cup, eye, beak tip, head
// top and face front at 74.00); the body, tail and grip are moved back by the same amount so the silhouette stays
export const TOP = {
  ...FACE,
  // (round 3: the face bulges further down-forward to meet the upper ring — bump 12 → 32; 73.60 / 74.00 at 3–4x)
  // (fix pass 1b: the outline alone 14 units (≈ 5 px) back and the face bump 32 → 22 — the overlays at 73.80–74.48
  // showed a steady ~5 px render-only crescent along the face front and a source-only sliver along the upper back; eye,
  // beak, cup and band stay where they were fitted; face-window NCC at 74.00 0.81 → 0.85)
  head: { yaw: 1.0, nod: 0.45, roll: 0.1, r: 94, bump: 22, square: 2.4, sx: 1, sy: 1, jowl: 0.08, off: [0, 0], outOff: [-14, 0], dent: { ang: -0.95, amp: 0, w: 0.3 } },
  body: { x: -101, y: 108, a: 138, b: 124, rot: 2.52, egg: 0.1 },
  // (fix pass: the source's tail up here is a spiky fan of three narrow pointed feathers)
  tail: { base: [-204, 178], tip: [-331, 186], w: 34, n: 3, fan: 0.22 },
  bandage: { ...FACE.bandage, vis: 0 },
  // the grip wing (source 73.60/74.00): long primaries fanned to the right along the lower ring, the outermost one
  // hooked into the upper ring
  // (shoulder (285, 108), wrist (336, 138), hand tip (352, 146) frame px at 74.00)
  // (fix pass: the fan, from 4.5–9x crops at 74.00: the leading edge from the chest (300, 112) down to the hand on the
  // rings, a row of long pointed feathers pointing 35° down-forward whose tips run from (285, 165) to (385, 158))
  // (fix pass 1b: 6 uneven feathers, not a comb of 9 — lengths ±20 %, angles ±8°, seeded — with faint dividers; the
  // scissors are drawn over it from 73.3, so the lower ring's whole outline shows)
  // (fix pass 2: a coordinate descent of the fan (harness score, window head + (−25…85, 10…90) px, σ1.5, 1 − NCC + MAE/100,
  // 73.60–74.40 every 0.2 s: 0.390 → 0.306) raises its top edge into the grey mass under the beak and pulls the hand tip
  // out of the lower ring's hole, which is dark in the source — round 3/1b: S [−106, 65], A [144, 200], B [−150, 221],
  // sag 15, thP 35, lead 0.03)
  grip: { type: "fan", S: [-121, 85], A: [108, 192], B: [-150, 216], sag: 20, thB: 62, thP: 30, n: 6, lead: 0.31, jit: 1, jseed: 23, divA: 0.75,
    // (fix pass 2) the source's wing up here carries long dark feather lines (74.00 / 74.40 at 5.5x): dividers from
    // each notch most of the way up the feather, a line along each tip, a firm leading edge and extra strokes
    // (the long leading-edge line read on blackhat line maps at 73.60 / 74.00 / 74.40: from ≈ (−95, 67) to (20, 145) units
    // off the head centre, ~34° down — the fill's top edge above it is chest)
    pl: { divL: 0.8, divW: 2.2, divV: 0.3, tipV: 0.4, tipL: 0.45, leadW: 1.8, leadV: 0.3, covV: 0.45, n: 7, v: 0.45, w: 1.6, len: 0.6, seed: 5, from: 0.45,
      leadPts: [[-96, 68], [-35, 108], [35, 152]] } },
  // the big hooked beak angled down to the upper ring (source 74.00: from under the eye (347, 106) to the tip (356, 128))
  // (fix pass: drawn side-on, hooked: root under the eye, tip (356, 129) on the upper ring)
  // (source 74.00 at 7x: root under the front of the eye (349, 110), tip (356, 127) on the upper ring, ~10 px wide)
  // (round 3: what hooks into the upper ring is the grip wing's finger — see s21.js drawFinger; the beak itself is a
  // small pale V under the eye pointing down, ~9 × 10 px, over the wing's leading edge (73.60 at 8x: (305–314, 116–126)))
  // (fix pass 1b: the hooked side beak restored at the source's size, the review's measure at 74.00: root under the
  // front of the eye (349, 110), the hooked tip (356, 127) on the upper ring; checked on a red/cyan overlay)
  // (fix pass 2: a darker lower mandible, lowV 0.4, was tried — face window MAE 20.1 → 20.3 at 74.00 — and dropped)
  beak: { side: true, front: true, overWing: true, el: -0.336, lift: 0.66, off: [9, 17.5], w: 34, l: 44, dir: 1.1, shrink: 0, muzzle: 0, mOff: [0, 0], mh: 62, ml: 40, mdir: 0 },
  // (the band a thick grey arch whose top sits ~11 px over the crown: fitted to its apex (345, 47) at 74.00)
  phones: { ...FACE.phones, cupAz: -0.47, cupEl: 0.047, lit: 1, r: 50, fxMin: 0.68, bandW: 30, bandLift: 1.12, bandH: 1.15, bandTilt: -0.05 },
  shade: 0.92,
  // (fix pass: a little more mottle than the walk — the source is lined and blotchy up here, not a clean disc)
  // (fix pass 2: 0.22 — the lit body was a flat clipped white, |I − σ2| 2.9 / 2.5 against the source's 5.0 / 4.6 in the
  // body windows at 74.00 / 74.40; with the wing strokes now 5.2 / 4.4, p10 187 / 196 against 189 / 194, window MAE
  // +0.6 / +0.8 — the grade's vignette caps this corner at ~209–214, under the source's median, so darker texture cannot
  // be balanced by lifting the whites)
  mottle: 0.22,
  // the source's head reads as bright as the body up here (p50 213 vs our 198 before)
  headShade: 0.95,
  // (7x at 74.00: a round, open white ~12 × 9 px, the iris low in its front, the brow a short heavy wedge over its
  // front half)
  // (round 3: eye-window NCC over 73.36–74.48 puts the source's eye (−3.0, +2.4) px from ours on every frame)
  eye: { ...FACE.eye, dx: -9, dy: 7, az: 0.527, el: 0.074, look: [0.2, 0.45], pupil: 0.6, tilt: -0.05, slit: 1.1, browFrom: -0.35, reach: 1.05, brow: 0.8, b0y: 1.75, b1y: 1.1, b2y: 0.45, socket: 0.68, socketA: 0.2, look: [-0.6, 0.35], iris: 1.1, irisV: 0.3,
    // (fix pass 1b: 9x at 74.00 — the brow is grey diagonal wrinkle strokes, not a black wedge; the iris a bigger grey
    // disc low in the front of the white)
    browV: 0.3, furrow: 1.5, round: 0,
    // (fix pass 2, 8x crops at 73.60 / 74.00 / 74.40: the white holds a round GREY iris near its middle under a thin grey
    // upper lid; over the front of the eye two long dark furrow strokes fall to its front corner — no hairy wedge)
    lidW: 0.12, lidV: 0.3, brow: 0, furrow: 0, iris: 1.0, irisV: 0.42,
    wrk: [{ p: [[-0.33, -1.43], [0.33, -0.79], [0.87, 0]], w: 0.34, v: 0.15 }, { p: [[0.33, -1.75], [0.73, -1.11], [1.13, -0.32]], w: 0.28, v: 0.2 }] },
  // two short pointed ear tufts either side of the band (source 74.00: tips at (320, 48) and (356, 60))
  tufts: [{ at: -0.36, size: 30, width: 0.3, lean: -0.2 }, { at: 0.66, size: 22, width: 0.24, lean: 0.1 }],
};
// spread wings in flight (near = viewer-left, over the body; far = viewer-right, behind it), blended
// DOWN (0) → LEVEL (0.35) → UP (1)
export const W_UP = [
  { layer: "mid", S: [-80, 100], Wr: [-193, 22], T: [-284, -26], trail: [-0.55, 0.84], len: 135, nP: 7, nS: 5, fan: 0.9, tipX: 0.3, seed: 3 },
  { layer: "back", S: [70, 60], Wr: [152, 11], T: [214, -30], trail: [0.5, 0.87], len: 95, nP: 6, nS: 3, fan: 0.9, tipX: 0.3, seed: 7 },
];
export const W_LEVEL = [
  { layer: "mid", S: [-80, 120], Wr: [-202, 96], T: [-302, 78], trail: [-0.15, 0.99], len: 133, nP: 7, nS: 5, fan: 0.9, tipX: 0.3, seed: 3 },
  { layer: "back", S: [70, 90], Wr: [168, 83], T: [246, 75], trail: [0.15, 0.99], len: 98, nP: 6, nS: 3, fan: 0.9, tipX: 0.3, seed: 7 },
];
export const W_DOWN = [
  { layer: "mid", S: [-70, 150], Wr: [-174, 185], T: [-261, 220], trail: [0.35, 0.94], len: 126, nP: 7, nS: 5, fan: 0.9, tipX: 0.3, seed: 3 },
  { layer: "back", S: [70, 120], Wr: [168, 153], T: [250, 169], trail: [-0.25, 0.97], len: 98, nP: 6, nS: 3, fan: 0.9, tipX: 0.3, seed: 7 },
];
