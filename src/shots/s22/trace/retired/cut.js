// s22: the owl walking the cut (74.52–79.76), drawn in code with s21's owl painter (s22/owl21.js, a copy of
// s21/owl.js) so the bird is the same one s21 hands over at 74.52. The source's owl here is ONE rigid drawing
// (owl + scissors + legs) slid along the cut and turned 90° per side, so this is built once as a sprite and only
// transformed per frame. The pose starts from s21's own cutting state at 74.52 (s21.js section C evaluated at that
// time: TOP, head centre (409.5, 89.9), s 0.34, the scissors, the feet) and is then re-fitted to s22's drawing —
// silhouette and landmarks measured on the grade-inverted median of the top-side frames (74.80–76.52, 42 frames,
// aligned on the cup track); the source is only measured, nothing of it is stored.
//
// Coordinates: the sprite is built in "cup-local" frame px — the continuous position of the measured cup track
// point is (0, 0). drawCut() places it at a track point (pixel-index coordinates, as the tracks are measured).
import { owlSprite, over, landmarks, silhouette } from "./owl21.js";
import { TOP } from "./poses21.js";
import { drawScissors, scissorsBox } from "./sc21.js";
import { softenCanvas } from "./soft21.js";
import { V } from "../../lib/owlInk.js";
import { drawArt } from "./art.js";

// s21's cutting state at 74.52, in s21 frame px (s21.js: TOP_CENTRE 406/85 + the pass-2 shift, SC_TOP, SNIP, the
// cut rings, TOP_FEET)
const RINGS_CUT = [{ u: 0.63, v: -0.19, rx: 0.26, ry: 0.115, rot: -0.41, t: 0.056 }, { u: 0.505, v: 0.18, rx: 0.165, ry: 0.145, rot: 0.35, t: 0.07 }];
const S21 = { head: [409.5, 89.9], s: 0.34, sc: { x: 494, y: 159, ang: 0.34, L: 89, open: 0.1 }, feet: [330, 395], line: 184 };

// The fit to s22's drawing. Silhouette IoU of the sprite against the source's silhouette (the owl brighter than its
// own halo, on the top-side median): 0.765 for s21's pose unchanged -> 0.844; landmarks (cup, eye, band apex, head
// front and top) within ~1 px. Units of the pose are s21's (head r = 100).
export const CUT_FIT = {
  cup: [0, 0],
  // head centre (cup-local px) and scale (frame px per s21 unit), fitted by silhouette IoU + landmarks
  head: [18.928, 6.598],
  s: 0.353,
  // over s21's TOP (s21 units): head, headphones, body, tail, the grip fan; the eye and beak are drawn in `face`
  pose: { bandage: null, head: { r: 95.239, nod: 0.362, yaw: 1.172, roll: 0.146 }, phones: { cupAz: -0.351, cupEl: -0.054, r: 46.799, bandH: 1.188, lit: 0.3, bandW: 22, bandTone: 0 }, eye: { az: 0.323, el: 0.03, hide: true }, body: { x: -70.865, y: 114.601, a: 169.721, b: 124.935, rot: 2.721 }, tail: { base: [-204.03, 160.351], tip: [-326.66, 195.421], w: 35.234, n: 3, fan: 0.05 }, grip: { S: [-97.009, 60.109], A: [129.599, 162.918], B: [-119.876, 216.109], sag: 43.137, n: 6, notch: 0.9, topLine: false, sepV: 0.6, sepW: 0.9 }, tufts: [{ at: -0.36, size: 30, width: 0.3, lean: -0.2 }], beak: { hide: true }, fringe: false, rim: 0.3, shade: 0.9, headShade: 0.97, bellyV: 0.84, bellyA: 0.4 },
  // the scissors: pivot screw (cup-local px), blade direction, length, opening; the far (lower) blade foreshortened
  // (fix pass: its tip rides on the cut line — tips measured at (187, 101) and (172, 107), i.e. frame y ~187 on the top
  // side, where the first fit left it ~8 px low / long)
  sc: { x: 105.538, y: 80.16, ang: 0.3165, L: 84.1, open: 0.133, farK: 0.853 },
  // feet x on the line (cup-local px) and the hips (s21 units)
  feet: [-70.929, 1.347],
  line: 103.5,
  hips: [[-182.089, 209.457], [-79.638, 226.069]],
  soft: 1.2,
  // finger rings, cup-local px: centre, centre-line semi-axes, thickness, frame angle of the major axis
  rings: [{ c: [57, 83], rx: 15.5, ry: 8.5, t: 5, rot: 0.1 }, { c: [66, 47], rx: 16, ry: 12.5, t: 4.5, rot: 0.5 }],
  // measured details over the head (cup-local px): the far wing's hand behind the upper ring, the face-disc line, the eye (a dark almond, a white crescent at its upper back, the lid), the brow ridge, the beak
  face: [
    { k: "fill", v: 0.64, pts: [[29, 38], [35, 34.5], [43, 35], [50, 39], [53, 46], [52, 55], [47, 61], [39, 62.5], [32, 59], [28, 52], [27.5, 44]] },
    { k: "ink", v: 0.3, a: 0.85, w: 1.6, pts: [[31, 39], [28.2, 45], [28.5, 53], [32.5, 59.5], [39, 62.5]] },
    { k: "ink", v: 0.5, a: 0.7, w: 1.1, pts: [[-6, 19], [-4, 27], [0, 34], [8, 41], [17, 46], [26, 49]] },
    { k: "fill", v: 0.06, pts: [[23.92, 14.46], [26.16, 12.22], [30.64, 12.0], [36.24, 13.9], [41.28, 17.82], [44.64, 21.52], [41.84, 24.32], [36.8, 26.56], [30.64, 26.56], [26.16, 24.76], [24.26, 20.06]] },
    { k: "fill", v: 0.82, pts: [[25.38, 15.02], [27.84, 13.34], [31.76, 13.34], [35.12, 14.8], [36.8, 16.48], [32.88, 17.04], [28.96, 17.6], [26.16, 18.38]] },
    { k: "ink", v: 0.03, w: 1.8, end: 0.3, pts: [[23.92, 13.9], [27.28, 11.77], [31.76, 11.77], [36.8, 13.56], [41.28, 17.37], [44.98, 21.63]] },
    { k: "ink", v: 0.5, a: 0.7, w: 1.4, pts: [[17, 1.2], [24, 0], [30, 1.5], [34.5, 5.5], [37.5, 10.5], [40, 15.5]] },
    { k: "ink", v: 0.75, a: 0.6, w: 1.5, pts: [[34, -10], [41, -8.5], [47, -3], [51, 6]] },
    { k: "ink", v: 0.62, a: 0.5, w: 1.0, pts: [[29, 28.6], [35, 29.6], [41, 28.4]] },
    { k: "fill", v: 0.78, pts: [[34.5, 25.5], [40, 24.5], [45.5, 26], [46.5, 31], [45.5, 35.5], [43.8, 38.5], [41, 36], [37.5, 32], [35, 28.5]] },
    { k: "ink", v: 0.45, a: 0.7, w: 1.3, pts: [[35, 27], [37.5, 32.5], [41.5, 36.5], [44, 38.6]] },
    { k: "ink", v: 0.2, w: 1.2, pts: [[46.3, 31.5], [45.6, 35.5], [43.9, 38.6]] },
  ],
  // feather separations of the near wing, over everything
  top: [
    { k: "ink", v: 0.4, a: 0.8, w: 1.4, pts: [[-5, 45], [10, 52], [25, 58], [40, 63], [52, 68]] },
    { k: "ink", v: 0.42, a: 0.75, w: 1.3, pts: [[-10, 58], [2, 64], [14, 70], [26, 75], [40, 80]] },
    { k: "ink", v: 0.45, a: 0.7, w: 1.2, pts: [[-12, 70], [-2, 77], [10, 83], [22, 87]] },
    { k: "ink", v: 0.45, a: 0.75, w: 1.4, pts: [[-38, 42], [-36, 52], [-32, 62], [-25, 71], [-17, 79], [-11, 85]] },
    { k: "ink", v: 0.55, a: 0.6, w: 1.2, pts: [[-30, 24], [-24, 33], [-20, 42], [-18, 50]] },
    { k: "ink", v: 0.45, a: 0.7, w: 1.2, pts: [[-98, 67.5], [-85, 71], [-72, 74]] },
  ],
};


function poseFor(F) {
  const s = F.s, H = F.head;
  let pose = over(TOP, F.pose || {});
  pose = { ...pose, wings: [], gripAim: 0, grip: { ...pose.grip, aim: "lower", off: [10, -20] } };
  const legs = [0, 1].map((k) => ({ hip: F.hips[k], foot: [(F.feet[k] - H[0]) / s, (F.line - H[1]) / s], toe: 40, w: 17, thigh: 44, lift: 0, far: k === 1, ...(F.legs?.[k] || {}) }));
  pose.legs = legs;
  // the grip fan (withGrip in s21.js with gripAim 0: the pose's own hand tip A)
  const g = pose.grip;
  pose = { ...pose, wings: [{ ...g, layer: "front" }] };
  return pose;
}
// rings given in cup-local px ({ c: [x, y], rx, ry (centre line), t (thickness), rot (frame rad of the major axis) })
// -> sc21's ring spec (u, v, rx, ry, t in units of L; rot relative to the handle direction)
export function ringSpec(sc, r) {
  const h = [-Math.cos(sc.ang), -Math.sin(sc.ang)], e2 = [-h[1], h[0]], d = [r.c[0] - sc.x, r.c[1] - sc.y];
  return { u: (d[0] * h[0] + d[1] * h[1]) / sc.L, v: (d[0] * e2[0] + d[1] * e2[1]) / sc.L, rx: r.rx / sc.L, ry: r.ry / sc.L, t: r.t / sc.L, rot: r.rot - (sc.ang + Math.PI) };
}
export function cutScissors(F = CUT_FIT) {
  const sc = { ...F.sc };
  return { ...sc, rings: F.rings ? F.rings.map((r) => ringSpec(sc, r)) : RINGS_CUT.map((r) => ({ ...r })) };
}
// geometry only (for fitting): outline polygons and landmarks in cup-local px
export function cutGeometry(F = CUT_FIT) {
  const pose = poseFor(F), place = { x: F.head[0], y: F.head[1], s: F.s };
  return { sil: silhouette(pose, place), lm: landmarks(pose, place), sc: cutScissors(F) };
}
// the sprite: { canvas, x, y, w, h } in cup-local px (res × supersampled)
export function cutSprite(F = CUT_FIT, { res = 2, canvas = null, soft = F.soft } = {}) {
  const pose = poseFor(F), sc = cutScissors(F);
  const B = owlSprite(pose, { x: F.head[0], y: F.head[1], s: F.s, res, canvas, extent: scissorsBox(sc), mid: (g) => drawScissors(g, sc),
    face: F.face ? (g) => drawArt(g, F.face) : null, top: F.top ? (g) => drawArt(g, F.top) : null });
  if (soft > 0.05) softenCanvas(B.canvas, soft * res / 2);
  return B;
}
// draw the sprite with its cup-local origin at the track point (ax, ay) (pixel-index coords), turned by m
export function drawCut(g, B, ax, ay, m = [1, 0, 0, 1], alpha = 1) {
  g.save();
  g.transform(m[0], m[1], m[2], m[3], ax + 0.5, ay + 0.5);
  if (alpha !== 1) g.globalAlpha *= alpha;
  g.drawImage(B.canvas, B.x, B.y, B.w, B.h);
  g.restore();
}
