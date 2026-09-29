// s04 (19.12–23.12): the owl glides in and lands on his right shoulder; held front close-up (he watches it sideways,
// pencil in his teeth); then the camera arcs round his left side, past his profile against the dark (~22.1–22.4), on
// behind him to over his shoulder at the laptop (MIXING DOWN on the screen). One continuous move in the source.
//
// Built as a rotoscope: 44 key drawings, each made from measurements of one source frame (s04/tkey.js: a 14-value
// study of simplified region outlines, the solid blacks and white-ink highlights, and the traced ink lines redrawn as
// tapered strokes; tone calibrated per key against its frame), carried to the frames round it by the measured motion
// (optical flow on a 24 px grid). Every source frame 19.12–23.08 is covered by exactly one key; keys switch on frame
// boundaries. The laptop's page (22.44–23.12) is s05's own page drawing (src/shots/s05/screen.js's sōko page, copied
// into s04/screen04.js), mapped through the screen's measured homography per frame. Scripts: snapshots/s04-k2/tr/.
//
// Measured beats (snapshots/s04-study, snapshots/s04-fix1-study, snapshots/s04-k2):
//   19.12–19.56  the camera pans (content +157, −121 px, ease-out); the owl glides in, eyes shut, wings spread
//   19.68        feet on his shoulder; 19.72 wings up; 19.76 eyes half open, 19.80 open; 19.84–20.20 wings fold
//   20.20–20.80  held (frame-to-frame change = grain only; source frames 20.08, 21.08, 22.08 and 23.08 repeat the
//                frame before them)
//   20.84–23.12  the arc: ~115° round his left side; his eyes swing from the owl to the lens 21.28–21.48; profile
//                ≈ 22.1–22.4 with the speaker entering left at 22.3; the laptop screen enters left at 22.44
import { W, H } from "../config.js";
import { Warper } from "./s04/morph.js";
import { paintKey, keyMesh } from "./s04/tkey.js";
import { drawScreen04, releaseScreen04, SCREEN_Q, screenQuadAt } from "./s04/screen04.js";
import { OWL_MASK } from "./s04/owlmask.js";
import { paintOwlFace, FACE_FRAMES } from "./s04/owlface.js";
import { FACE_FRAMES2 } from "./s04/owlface2.js";
import { paintHisEyes2, eyeDropPolys } from "./s04/hiseyes2.js";
import { EYES2 } from "./s04/eyes2.js";
import { paintPencil, pencilPoly, pencilBite } from "./s04/pencil2.js";
import { PENCIL_A, PENCIL_A_OFF, PENCIL_B } from "./s04/pencil2data.js";
import { paintHisFace } from "./s04/hisface.js";
import { paintPlaster, plasterPolys } from "./s04/plaster.js";
import { paintPencil3, paintMouth, pencilCPoly, teethPoly } from "./s04/pencil3.js";
import { paintCup, cupShell, cupRing } from "./s04/cup.js";
import { TCORR } from "./s04/tcorr.js";
import { K1912 } from "./s04/tk/k1912.js";
import { K1916 } from "./s04/tk/k1916.js";
import { K1928 } from "./s04/tk/k1928.js";
import { K1940 } from "./s04/tk/k1940.js";
import { K1952 } from "./s04/tk/k1952.js";
import { K1964 } from "./s04/tk/k1964.js";
import { K1972 } from "./s04/tk/k1972.js";
import { K1976 } from "./s04/tk/k1976.js";
import { K1980 } from "./s04/tk/k1980.js";
import { K1988 } from "./s04/tk/k1988.js";
import { K2000 } from "./s04/tk/k2000.js";
import { K2012 } from "./s04/tk/k2012.js";
import { K2020 } from "./s04/tk/k2020.js";
import { K2056 } from "./s04/tk/k2056.js";
import { K2092 } from "./s04/tk/k2092.js";
import { K2108 } from "./s04/tk/k2108.js";
import { K2124 } from "./s04/tk/k2124.js";
import { K2132 } from "./s04/tk/k2132.js";
import { K2140 } from "./s04/tk/k2140.js";
import { K2144 } from "./s04/tk/k2144.js";
import { K2148 } from "./s04/tk/k2148.js";
import { K2152 } from "./s04/tk/k2152.js";
import { K2156 } from "./s04/tk/k2156.js";
import { K2160 } from "./s04/tk/k2160.js";
import { K2164 } from "./s04/tk/k2164.js";
import { K2168 } from "./s04/tk/k2168.js";
import { K2172 } from "./s04/tk/k2172.js";
import { K2176 } from "./s04/tk/k2176.js";
import { K2180 } from "./s04/tk/k2180.js";
import { K2184 } from "./s04/tk/k2184.js";
import { K2188 } from "./s04/tk/k2188.js";
import { K2192 } from "./s04/tk/k2192.js";
import { K2196 } from "./s04/tk/k2196.js";
import { K2200 } from "./s04/tk/k2200.js";
import { K2204 } from "./s04/tk/k2204.js";
import { K2212 } from "./s04/tk/k2212.js";
import { K2216 } from "./s04/tk/k2216.js";
import { K2220 } from "./s04/tk/k2220.js";
import { K2224 } from "./s04/tk/k2224.js";
import { K2228 } from "./s04/tk/k2228.js";
import { K2232 } from "./s04/tk/k2232.js";
import { K2236 } from "./s04/tk/k2236.js";
import { K2240 } from "./s04/tk/k2240.js";
import { K2244 } from "./s04/tk/k2244.js";
import { K2248 } from "./s04/tk/k2248.js";
import { K2252 } from "./s04/tk/k2252.js";
import { K2256 } from "./s04/tk/k2256.js";
import { K2260 } from "./s04/tk/k2260.js";
import { K2264 } from "./s04/tk/k2264.js";
import { K2268 } from "./s04/tk/k2268.js";
import { K2272 } from "./s04/tk/k2272.js";
import { K2276 } from "./s04/tk/k2276.js";
import { K2280 } from "./s04/tk/k2280.js";
import { K2284 } from "./s04/tk/k2284.js";
import { K2288 } from "./s04/tk/k2288.js";
import { K2292 } from "./s04/tk/k2292.js";
import { K2296 } from "./s04/tk/k2296.js";
import { K2300 } from "./s04/tk/k2300.js";
import { K2304 } from "./s04/tk/k2304.js";

const M = 180;                       // key canvas margin (px): the flow may pull from outside the key frame
// The joins run straight on: s02's last frames and s05's first frames follow the source closely enough that the change
// of drawing at 19.12 and 23.12 is about the size of the source's own frame-to-frame motion (fidelity/s04.md).

// [key frame (25 fps index), key, lo, hi]: the key alone covers frames f+lo .. f+hi (its measured flows carry it).
// Frames between one entry's last pure frame and the next entry's first are a BLEND of the two keys, each warped to
// that frame by its own measured flow, weighted by position (so a new trace fades in over the frames between keys
// instead of switching on one frame). Keys: every 3rd frame through the glide; every frame over the owl's eyes
// opening (19.72-19.80) and the wing still out (20.12, 20.20); one key for the hold (20.28-20.80); every 4th frame
// into the swing; every frame 21.32-21.76, where the laptop lid sweeps 55-170 px per frame (a flow over two frames
// tears there); every 2nd frame to 22.08; every frame from 22.12 (the pencil and the profile turn too fast).
const TK = [
  [478, K1912, 0, 0], [479, K1916, 0, 0], [482, K1928, 0, 0], [485, K1940, 0, 0], [488, K1952, 0, 0],
  [491, K1964, 0, 0], [493, K1972, 0, 0], [494, K1976, 0, 0], [495, K1980, 0, 0], [497, K1988, 0, 0],
  [500, K2000, 0, 0], [503, K2012, 0, 0], [505, K2020, 0, 0], [514, K2056, -7, 6], [523, K2092, 0, 0],
  [527, K2108, -1, 0] /* 21.08 repeats 21.04: both are this key */, [531, K2124, 0, 0], [533, K2132, 0, 0], [535, K2140, -1, 0], [536, K2144, 0, 0],
  [537, K2148, 0, 0], [538, K2152, 0, 0], [539, K2156, 0, 0], [540, K2160, 0, 0], [541, K2164, 0, 0],
  [542, K2168, 0, 0], [543, K2172, 0, 0], [544, K2176, 0, 0], [545, K2180, 0, 0], [546, K2184, 0, 0], [547, K2188, 0, 0], [548, K2192, 0, 0],
  [549, K2196, 0, 0], [550, K2200, 0, 0], [551, K2204, 0, 0], [552, K2204, 0, 0] /* 22.08 repeats 22.04 in the source */, [553, K2212, 0, 0], [554, K2216, 0, 0], [555, K2220, 0, 0],
  [556, K2224, 0, 0], [557, K2228, 0, 0], [558, K2232, 0, 0], [559, K2236, 0, 0], [560, K2240, 0, 0],
  [561, K2244, 0, 0], [562, K2248, 0, 0], [563, K2252, 0, 0], [564, K2256, 0, 0], [565, K2260, 0, 0],
  [566, K2264, 0, 0], [567, K2268, 0, 0], [568, K2272, 0, 0], [569, K2276, 0, 0], [570, K2280, 0, 0],
  [571, K2284, 0, 0], [572, K2288, 0, 0], [573, K2292, 0, 0], [574, K2296, 0, 0], [575, K2300, 0, 0],
  [576, K2304, 0, 2]];
const F0 = TK[0][0], F1 = TK[TK.length - 1][0] + TK[TK.length - 1][3];
// does key K carry a measured motion to offset off (0, a stored flow, or a frame measured as held)?
const hasOff = (K, off) => off === 0 || !!(K.flows && K.flows[String(off)]) || !!(K.held && K.held.includes(String(off)));
// the keys that draw frame fi: [{K, off, w}] (weights sum to 1)
export function keysAt(fi) {
  fi = Math.max(F0, Math.min(F1, fi));   // (outside the segment's frames -- previews: the nearest end, carried)
  for (let i = 0; i < TK.length; i++) {
    const [f, K, lo, hi] = TK[i];
    if (fi >= f + lo && fi <= f + hi) return [{ K, off: fi - f, w: 1 }];
    const nx = TK[i + 1];
    if (nx && fi > f + hi && fi < nx[0] + nx[2]) {
      const a0 = f + hi, b0 = nx[0] + nx[2], w = (fi - a0) / (b0 - a0);
      const A = { K, off: fi - f, w: 1 - w }, B = { K: nx[1], off: fi - nx[0], w };
      const okA = hasOff(A.K, A.off), okB = hasOff(B.K, B.off);
      if (okA && okB) return [A, B];
      if (okA || okB) return [{ ...(okA ? A : B), w: 1 }];
      throw new Error(`s04: no measured flow for frame ${fi}`);
    }
  }
  throw new Error(`s04: frame ${fi} not covered`);
}

// The landing (19.56-20.24): he and the room hold still while the owl lands, so re-tracing the whole frame every few
// frames made his face boil. There the hold key (20.56) is the base, carried back by its measured flow, and the
// per-frame keys are drawn only where the carried base fails to show the source frame (the owl and its wings:
// OWL_MASK, measured outlines, feathered). The base fades in over 19.56-19.60 and is the hold key itself from 20.28.
const BASE = { f: 514, from: 488, full: 489, to: 506 };
// fix1: the camera has settled by 19.56 (frame 489; phase correlation of the room and figure against 20.56: shift
// <= 0.03 px from 489 to 520, only grain and the owl change), so the hold key is drawn STILL over frames 489-520. Its
// stored flows there (offsets -25..+6) are measurement noise in the static figure (mean 0.6 px, p90 2 px, up to 13 px)
// and made the held face twitch frame to frame. Frame 488 (offset -26) still has the camera's last move and keeps
// its flow.
const STILL = { K: null, lo: -25, hi: 6 };
// source frames that repeat the frame before them (grain-level change): drawn as that frame
const REPEAT = { 502: 501 };
const baseW = (fi) => (fi < BASE.from || fi > BASE.to ? 0 : Math.min(1, (fi - BASE.from + 1) / (BASE.full - BASE.from + 1)));

let C = null;
function build() {
  if (!C) {
    const mk = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
    C = { warper: new Warper(W, H), cache: [], o: mk(W, H), t: mk(W, H), m: mk(W / 2, H / 2), m2: mk(W / 2, H / 2) };
  }
  glideEyes();
  return C;
}
// fix1: the laptop lid's outer rim (a white-ink line traced 5-60 px outside the screen's left and top edges) is a
// soft grey band in the source (about 10 px wide, peak ~85 graded at 23.00), not a thin white line (3 px, ~177): on
// the keys where the screen is in frame those lines are drawn at half value and three times the width
const RIM = { v: 0.5, w: 3 };
// (fix2: kept. The review saw 'a bright white outer rim'; measured across the lid's top and left edges on 22.60, 22.76
// and 23.00, the rim drawn this way is at or under the source's (22.60 top edge: 104 against the source's 176 at the
// bezel, 67 against 104 at the outer rim). Dropping these lines and drawing a rim at offsets measured on 23.00 put it
// 3-6 px off on the other keys and raised σ6 by 0.04-0.09, so it was not kept.)
function lidRim(t) {
  const q = screenQuadAt(t);
  if (!q) return null;
  const edges = [[q[3], q[0]], [q[0], q[1]]];   // left edge (bottom-left -> top-left), top edge (top-left -> top-right)
  return (x, y) => {
    for (const [a, b] of edges) {
      const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy), u = ((x - a[0]) * dx + (y - a[1]) * dy) / (L * L);
      if (u < -0.1 || u > 1.05) continue;
      const d = ((x - a[0]) * dy - (y - a[1]) * dx) / L;   // > 0: outside (left of the left edge, above the top edge)
      if (d > 3 && d < 60) return RIM;
    }
    return null;
  };
}
// fix1: the owl's feather lines (review: 'black, jagged cracks across the white body and wing'): on the keys where the
// owl's head motion is measured (s04/owlface.js, owlface2.js: 19.80-22.32), the traced dark lines inside its body --
// the hold frame's head and body outline without the headphone cups and the talons, carried by that motion -- are
// drawn light (paint >= 150) and thin (<= 1.5 px), as the source's fine grey feather lines
// (fix2: the folded wing added -- the review: 'black branching cracks remain on the lower wing at 21.48-21.84'; the
// right cup (x 1765-1820, y 254-364 on 20.56) and the talons (y > 555) stay out)
const OWL_BODY = [[1565, 215], [1640, 190], [1740, 200], [1775, 260], [1785, 375], [1840, 395], [1890, 440], [1915, 510], [1895, 570], [1820, 580], [1800, 550], [1650, 555], [1545, 545], [1520, 450], [1560, 370], [1560, 260]];
function owlFeathers(t) {
  const F = FACE_FRAMES[t.toFixed(2)] || FACE_FRAMES2[t.toFixed(2)];
  if (!F) return null;
  const [a, b, tx, c, d, ty] = F.A, P = OWL_BODY.map(([x, y]) => [a * x + b * y + tx, c * x + d * y + ty]);
  const inP = (x, y) => { let q = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, yi] = P[i], [xj, yj] = P[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) q = !q; } return q; };
  return (st) => {
    const p = st.pts[Math.floor(st.pts.length / 2)];
    if (!inP(p[0], p[1])) return;
    st.v = Math.max(st.v, 150); st.w = st.w.map((w) => Math.min(1.5, w * 0.75));
  };
}
// fix1: the speaker (review: its woofers 'read as a grinning face': thin traced dark lines across the cone's lit lower
// lip and black specks round the face). Its front face per source frame, MEASURED (trace/fix1/speaker_track.py: the
// quad on 23.08 at 2x, carried back frame by frame by coarse-to-fine ECC affines of the face, correlation 0.87-0.999,
// initialised by the measured image motion): on the keys from 22.28 the traced dark lines and small solid blacks on
// it (the quad grown by 6 px) are dropped, so its value study (dark cone, lit surround, rim) shows alone
const SPK_Q = {
  "22.28": [[-63.7, 488.2], [93.0, 453.3], [133.5, 921.0], [-23.6, 951.6]],
  "22.32": [[-2.8, 467.6], [170.9, 434.3], [204.3, 889.7], [30.3, 918.8]],
  "22.36": [[55.9, 451.4], [239.2, 419.2], [273.2, 862.8], [89.6, 890.9]],
  "22.40": [[117.4, 434.8], [308.4, 402.9], [338.2, 837.1], [146.9, 865.0]],
  "22.44": [[183.4, 419.7], [372.3, 390.2], [397.7, 814.3], [208.6, 840.0]],
  "22.48": [[246.7, 402.6], [443.1, 374.8], [465.0, 789.2], [268.4, 813.2]],
  "22.52": [[305.8, 387.9], [508.9, 361.1], [527.7, 765.7], [324.5, 788.8]],
  "22.56": [[398.5, 364.9], [610.4, 339.5], [632.1, 732.5], [420.0, 754.3]],
  "22.60": [[453.5, 353.4], [665.5, 329.4], [681.4, 716.5], [469.2, 736.9]],
  "22.64": [[512.1, 338.6], [724.8, 317.5], [739.9, 697.5], [527.1, 715.1]],
  "22.68": [[566.3, 326.4], [782.1, 307.9], [795.1, 680.4], [579.1, 695.4]],
  "22.72": [[615.2, 315.1], [831.9, 297.0], [848.1, 663.7], [631.3, 678.4]],
  "22.76": [[667.2, 303.9], [879.7, 290.4], [891.9, 651.2], [679.3, 661.4]],
  "22.80": [[715.0, 291.9], [929.2, 280.7], [939.1, 636.2], [724.9, 644.2]],
  "22.84": [[757.5, 282.4], [971.8, 272.8], [982.1, 621.0], [767.7, 627.4]],
  "22.88": [[799.1, 273.4], [1012.5, 265.2], [1022.3, 608.7], [808.9, 613.8]],
  "22.92": [[838.5, 266.0], [1051.2, 259.9], [1057.4, 599.9], [844.7, 603.0]],
  "22.96": [[915.7, 249.3], [1119.3, 244.8], [1125.3, 577.8], [921.7, 579.2]],
  "23.00": [[946.8, 243.6], [1144.2, 239.6], [1148.3, 569.7], [950.9, 570.6]],
  "23.04": [[980.0, 240.0], [1166.0, 232.0], [1168.0, 560.0], [982.1, 565.0]],
  "23.08": [[980.0, 240.0], [1166.0, 232.0], [1168.0, 560.0], [982.0, 565.0]]
};
function speakerDrop(t) {
  const Q = SPK_Q[t.toFixed(2)];
  if (!Q) return null;
  const cx = Q.reduce((a, p) => a + p[0], 0) / 4, cy = Q.reduce((a, p) => a + p[1], 0) / 4;
  const P = Q.map(([x, y]) => { const dx = x - cx, dy = y - cy, L = Math.hypot(dx, dy) || 1; return [x + (dx / L) * 6, y + (dy / L) * 6]; });
  return (x, y) => {
    let q = false;
    for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, yi] = P[i], [xj, yj] = P[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) q = !q; }
    return q;
  };
}
// the pencil (fix1, s04/pencil2.js): the model and its measured affine for a key time, and its velocity (px per frame,
// the model's middle moved between the neighbouring measured frames)
function pencilAt(t) {
  const key = t.toFixed(2), which = PENCIL_A[key] ? "A" : PENCIL_B[key] ? "B" : null;
  if (!which) return null;
  const T = which === "A" ? PENCIL_A : PENCIL_B, A = T[key];
  const mid = which === "A" ? [1050, 727] : [1240, 486];
  const at = (Q) => [Q[0] * mid[0] + Q[1] * mid[1] + Q[2], Q[3] * mid[0] + Q[4] * mid[1] + Q[5]];
  const p = T[(t - 0.04).toFixed(2)], n = T[(t + 0.04).toFixed(2)];
  let v = [0, 0];
  if (p && n) { const a = at(p), b = at(n); v = [(b[0] - a[0]) / 2, (b[1] - a[1]) / 2]; }
  else if (p || n) { const a = at(p || A), b = at(n || A); v = [b[0] - a[0], b[1] - a[1]]; }
  const off = which === "A" ? PENCIL_A_OFF[key] || 0 : 0;
  // (the traced lines are dropped only over the pencil itself, +2 px: his teeth rest on its top edge)
  // (fix2: B grown 6 px: the traced dark line along its lower edge lay 3-6 px outside the model and read as a ragged black edge)
  return { which, A, v, off, poly: pencilPoly(which, A, which === "B" ? 6 : 2, off), bite: pencilBite(which, A, off) };
}
const inPoly = (x, y, P) => { let q = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, yi] = P[i], [xj, yj] = P[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) q = !q; } return q; };
// fix2: the pen hatching's weight per key (s04/hatch.js). Off where the camera moves faster than ~20 px per frame
// (the figure's median image motion, from the measured frame-to-frame flow s04/hatchflow.js): the glide's pan (28-33 px
// per frame to 19.32; 11 at 19.36, under 9 from 19.40) and the swing from 21.56 (15-180 px per frame to 23.04), where
// the source is soft and motion-blurred; faded out over the keys 21.48-21.52 (12-19 px per frame). The landing keys
// 19.64-20.20 are drawn only inside the owl's outlines (landing()), where nothing is hatched: 0.
function hatchWeight(K) {
  const t = K.t;
  if (K === K2056) return 1;
  if (t < 19.35) return 0;
  if (t > 19.6 && t < 20.26) return 0;
  if (t > 21.45) return Math.max(0, Math.min(1, (21.56 - t) / 0.12));
  return 1;
}
// (the owl flying in at the upper right on the keys 19.40 and 19.52, frame px: not hatched)
const HATCH_OWL_RECT = [1420, -200, 2400, 640];
// fix2 (review: 'the traced eyes have no irises at all' on the glide keys 19.12-19.40, then the authored eyes pop in at
// 19.52): his authored eyes on the glide keys too. Placed by the face's measured motion over the camera's pan (the face
// region's ECC affine from 20.56 to each frame, s04/pencil2data.js PENCIL_A 19.12-19.56, content +157 / -121 px,
// ease-out) composed onto 19.52's measured eye track (checked: an ECC affine of each eye region of 19.52 against the
// glide frames agrees within 0.6 px, trace/fix2/glide_eyes.py); the pupil and iris as on 19.52 (he watches the owl);
// v = the face's image motion there (px per frame, from the neighbouring frames' affines), for the smear.
let GLIDE_EYES = false;
function glideEyes() {
  if (GLIDE_EYES) return;
  GLIDE_EYES = true;
  const mul = (P, Q) => [P[0] * Q[0] + P[1] * Q[3], P[0] * Q[1] + P[1] * Q[4], P[0] * Q[2] + P[1] * Q[5] + P[2],
    P[3] * Q[0] + P[4] * Q[3], P[3] * Q[1] + P[4] * Q[4], P[3] * Q[2] + P[4] * Q[5] + P[5]];
  const inv = (A) => { const [a, b, tx, c, d, ty] = A, k = a * d - b * c; return [d / k, -b / k, (b * ty - d * tx) / k, -c / k, a / k, (c * tx - a * ty) / k]; };
  const E0 = EYES2["19.52"], F0i = inv(PENCIL_A["19.52"]), mid = [1100, 330];
  const at = (F) => [F[0] * mid[0] + F[1] * mid[1] + F[2], F[3] * mid[0] + F[4] * mid[1] + F[5]];
  for (let f = 478; f <= 487; f++) {
    const key = (f / 25).toFixed(2), F = PENCIL_A[key];
    if (!F || EYES2[key]) continue;
    const R = mul(F, F0i), p = PENCIL_A[((f - 1) / 25).toFixed(2)], n = PENCIL_A[((f + 1) / 25).toFixed(2)];
    const a = at(p || F), b = at(n || F), sp = p && n ? 2 : 1, v = [(b[0] - a[0]) / sp, (b[1] - a[1]) / sp];
    const out = {};
    // (the source's glide frames are soft: the eyes defocused with the pan's speed and laid at part strength over the
    // key, reaching full strength at 19.40, where the pan has slowed to ~9 px per frame)
    const spd = Math.hypot(v[0], v[1]), soft = 0.8 + Math.max(0, spd - 8) * 0.09, alpha = Math.min(1, 0.7 + 0.3 * Math.max(0, (f - 482) / 3));
    for (const k of ["L", "R"]) if (E0[k]) out[k] = { ...E0[k], A: mul(R, E0[k].A), v, soft, alpha };
    EYES2[key] = out;
  }
}
// key canvases, built on first use; at most 5 kept (a cache only: a key's pixels never depend on it)
function keyCanvas(K) {
  const hit = C.cache.find((e) => e.K === K);
  if (hit) return hit.c;
  // (the 22.44 and 22.48 keys were traced without a screen cut-out: the page's first sliver is cut out of them here, by
  // its measured quad, so the page shows there as on the later keys)
  const q = !(K.cut && K.cut.length) && K.t >= 22.43 ? screenQuadAt(K.t) : null;
  // his eyes (fix1, s04/hiseyes2.js): authored, placed by the measured eye track on every key to 22.08 (near eye) /
  // 21.88 (far eye), drawn under the traced ink (the traced lines inside the eyes are dropped; hair strands stay on top)
  const e = EYES2[K.t.toFixed(2)];
  const pen = pencilAt(K.t), spk = speakerDrop(K.t), pl = plasterPolys(K.t, 12), pc = pencilCPoly(K.t, 5), th = teethPoly(K.t, 2), cup = cupShell(K.t), cupR = cupRing(K.t);
  const dropFn = pen || spk || pl || pc || th || cup ? (x, y) => (cup && (Math.hypot(x - cup.x, y - cup.y) < cup.r || cupR(x, y))) || (pen && inPoly(x, y, pen.poly) && !(pen.bite && inPoly(x, y, pen.bite))) || (spk && spk(x, y)) ||
    (pl && pl.some((P) => inPoly(x, y, P))) || (pc && inPoly(x, y, pc)) || (th && inPoly(x, y, th)) : null;
  const c = paintKey(q ? { ...K, cut: [q] } : K, M, { tcorr: TCORR[K.t.toFixed(2)], dimBright: lidRim(K.t),
    under: e ? (g) => paintHisEyes2(g, M, e, K.t, EYES2) : null, dropIn: e ? eyeDropPolys(e) : null, darkMap: owlFeathers(K.t), dropFn,
    thinEdge: K.t >= 21.9 && K.t <= 22.52, hatch: { hold: K2056, wk: hatchWeight(K), xr: K.t < 19.6 ? HATCH_OWL_RECT : null } });
  // the brows (hair strokes along measured centre lines, carried by the same eye track) and, on the hold key, the
  // sweat drops
  // (fix1: the sweat drops on every tracked key from 20.84: the three forehead drops while their eye is tracked, the
  // cheek drop to 21.72 -- where its carried place was checked against the source's drop)
  if (e && K.t > 19.5) { const kg = c.getContext("2d"); paintHisFace(kg, M, 0, K === K2056 ? null : e, K === K2056 ? true : K.t >= 20.83 ? (K.t <= 21.73 ? [0, 1, 2, 3] : [0, 1, 2]) : false); kg.setTransform(1, 0, 0, 1, 0, 0); }
  paintMouth(c.getContext("2d"), M, K.t);   // (fix2: the open mouth under his teeth, 22.12-22.52, s04/pencil3.js)
  if (pen) paintPencil(c.getContext("2d"), M, pen.which, pen.A, pen.v, pen.off);
  // fix2: the owl's plaster, 22.20-23.08 (s04/plaster.js), where the tracer left dark scribbles
  if (pl) paintPlaster(c.getContext("2d"), M, K.t, 244 + (K.ts || 0));
  if (cup) paintCup(c.getContext("2d"), M, K.t);   // fix2: the near cup's shell face smoothed and its rims clean, 22.16-22.72 (s04/cup.js)
  // fix2: the pencil end-on (22.16-22.32) and his upper teeth on it (22.12-22.52), s04/pencil3.js
  paintPencil3(c.getContext("2d"), M, K.t);
  C.cache.push({ K, c });
  while (C.cache.length > 5) { const old = C.cache.shift(); C.warper.forget(old.c); }
  return c;
}
function drawKeys(ks) {
  const Wp = C.warper;
  Wp.clear();
  for (const k of ks) {
    const off = k.K === K2056 && k.off >= STILL.lo && k.off <= STILL.hi ? 0 : k.off;
    Wp.draw(keyCanvas(k.K), keyMesh(k.K, off, M), k.w, ks.length > 1);
  }
  return Wp.c;
}
// the owl's outlines at frame fi, filled and feathered (half resolution)
function owlMask(fi) {
  const polys = OWL_MASK[String(fi)] || [];
  const g = C.m2.getContext("2d");
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W / 2, H / 2);
  g.setTransform(0.5, 0, 0, 0.5, 0, 0); g.fillStyle = "#fff"; g.strokeStyle = "#fff"; g.lineJoin = "round"; g.lineWidth = 8; g.beginPath();
  for (const P of polys) { g.moveTo(P[0][0], P[0][1]); for (let i = 1; i < P.length; i++) g.lineTo(P[i][0], P[i][1]); g.closePath(); }
  g.fill(); g.stroke();   // (fix1: dilated 4 px, then a short feather -- the 12 px feather left a grey ghost past the wing tips)
  const m = C.m.getContext("2d");
  m.setTransform(1, 0, 0, 1, 0, 0); m.clearRect(0, 0, W / 2, H / 2);
  m.filter = "blur(1.25px)"; m.drawImage(C.m2, 0, 0); m.filter = "none";
  return C.m;
}

// The laptop page (22.44-23.12), as the source shows it: soft (a constant defocus), glowing, and smeared along the
// screen's own motion while it swings in (22.44-22.64). The smear is the page quad's measured velocity (centroid,
// px per frame, from the neighbouring measured quads) times the shutter; the same shutter as the room's smear.
// (the source's page is smeared only while it moves fast: past ~25 px per frame; at 22.84, 36 px per frame, it is
// nearly sharp)
// (fix1: the smear starts at 40 px per frame, so the entry frames 22.44-22.52 keep a crisp edge as in the source.
// A gamma of 1.2 on the page was tried, as the review suggested: it darkened the page region below the source's mean
// (47.5 against 54.6 at 23.00, 52.4 without it) and raised σ6, so PAGE_GAMMA stays 1: the page's difference is its
// content, which is s05's drawing)
const SHUTTER = 0.4, SMEAR0 = 40, DEFOCUS = 1.6, BLOOM = 0.22, PAGE_GAMMA = 1.0;
function screenVel(fi) {
  const i = SCREEN_Q.findIndex((r) => Math.round(r[0] * 25) === fi);
  if (i < 0) return [0, 0];
  const a = SCREEN_Q[Math.max(0, i - 1)], b = SCREEN_Q[Math.min(SCREEN_Q.length - 1, i + 1)];
  const n = Math.round((b[0] - a[0]) * 25) || 1;
  let vx = 0, vy = 0; for (let k = 1; k < 9; k += 2) { vx += (b[k] - a[k]) / 4; vy += (b[k + 1] - a[k + 1]) / 4; }
  return [vx / n, vy / n];
}
function screenLayer(ctx, t, fi) {
  if (!C.sc) { C.sc = document.createElement("canvas"); C.sc.width = W; C.sc.height = H; C.sd = document.createElement("canvas"); C.sd.width = W; C.sd.height = H; }
  const sg = C.sc.getContext("2d");
  sg.setTransform(1, 0, 0, 1, 0, 0); sg.globalAlpha = 1; sg.globalCompositeOperation = "source-over"; sg.clearRect(0, 0, W, H);
  if (!drawScreen04(sg, t, { soft: 0, blur: 0 })) return;
  const [vx, vy] = screenVel(fi), L = Math.max(0, Math.hypot(vx, vy) - SMEAR0) * SHUTTER;
  const dg = C.sd.getContext("2d");
  dg.setTransform(1, 0, 0, 1, 0, 0); dg.globalAlpha = 1; dg.clearRect(0, 0, W, H);
  dg.drawImage(C.sc, 0, 0);
  if (L > 1.5) {   // smear: a 16-tap box along the motion (repeated halving), centred
    const ux = vx / Math.hypot(vx, vy), uy = vy / Math.hypot(vx, vy);
    for (let d = L / 16; d < L; d *= 2) { dg.globalAlpha = 0.5; dg.drawImage(C.sd, ux * d, uy * d); }
    dg.globalAlpha = 1;
    sg.clearRect(0, 0, W, H); sg.drawImage(C.sd, -ux * L / 2, -uy * L / 2);
  } else { sg.clearRect(0, 0, W, H); sg.drawImage(C.sd, 0, 0); }
  // gamma over the page's bounding box
  if (PAGE_GAMMA !== 1) { const q = screenQuadAt(t); if (q) {
    const x0 = Math.max(0, Math.floor(Math.min(...q.map((p) => p[0]))) - 2), x1 = Math.min(W, Math.ceil(Math.max(...q.map((p) => p[0]))) + 2);
    const y0 = Math.max(0, Math.floor(Math.min(...q.map((p) => p[1]))) - 2), y1 = Math.min(H, Math.ceil(Math.max(...q.map((p) => p[1]))) + 2);
    if (x1 > x0 && y1 > y0) {
      if (!C.lut) { C.lut = new Uint8ClampedArray(256); for (let i = 0; i < 256; i++) C.lut[i] = Math.round(255 * Math.pow(i / 255, PAGE_GAMMA)); }
      const id = sg.getImageData(x0, y0, x1 - x0, y1 - y0), d = id.data, lut = C.lut;
      for (let k = 0; k < d.length; k += 4) { d[k] = lut[d[k]]; d[k + 1] = lut[d[k + 1]]; d[k + 2] = lut[d[k + 2]]; }
      sg.putImageData(id, x0, y0);
    } } }
  // defocus, then the glow of the lit page
  ctx.save();
  ctx.filter = `blur(${DEFOCUS}px)`; ctx.drawImage(C.sc, 0, 0);
  ctx.filter = "blur(10px)"; ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = BLOOM; ctx.drawImage(C.sc, 0, 0);
  ctx.restore();
}

export const shot = {
  draw(ctx, local, t) {
    build();
    // hold each 25 fps source frame (a no-op in the film render, which samples frame times exactly; previews sample
    // slightly early): every key lands on its own frames
    t = Math.ceil(t * 25 - 1e-6) / 25;
    let fi = Math.round(t * 25);
    if (REPEAT[fi]) { fi = REPEAT[fi]; t = fi / 25; }
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
    if (fi >= 561) { try { build(); screenLayer(ctx, t, fi); } catch (e) { console.warn("[s04] screen:", e); } }
    const ks = keysAt(fi), bw = baseW(fi);
    if (!bw) ctx.drawImage(drawKeys(ks), 0, 0);
    else landing(ctx, fi, ks);
    // the owl's eyes, beak and plaster as authored shapes (19.80-21.64, where its face is towards us), over the keys
    paintOwlFace(ctx, fi / 25, ks.reduce((s, k) => s + k.w * (k.K.ts || 0), 0));
  },
  release() { if (C) for (const e of C.cache) C.warper.forget(e.c); C = null; releaseScreen04(); },
};
// the landing: the carried hold key, with the per-frame keys inside the owl's outlines
// fix1: inside the owl's outlines the per-frame key is used only where the owl is (where either drawing is lit,
// measured on a blurred half-resolution luminance, so the owl's dark eyes and cups inside its white mass count as owl
// and the room's thin grey lines do not). Elsewhere inside the outlines both drawings show the dark room, and the
// per-frame key's room, dragged by the wing's flow, left a warped ghost past the wing tips (19.84-19.96).
const LITM = { blur: 8, lo: 70, hi: 120, zx: 1860 };   // (fix2: a constant -- it was read from the URL, a debug hook)
function litMask(fi, base) {
  const m = owlMask(fi), w = W / 2, h = H / 2;
  if (!C.h1) { C.h1 = document.createElement("canvas"); C.h1.width = w; C.h1.height = h; C.h2 = document.createElement("canvas"); C.h2.width = w; C.h2.height = h; }
  const g1 = C.h1.getContext("2d", { willReadFrequently: true }), g2 = C.h2.getContext("2d", { willReadFrequently: true });
  g2.setTransform(1, 0, 0, 1, 0, 0); g2.globalCompositeOperation = "source-over"; g2.fillStyle = "#000"; g2.fillRect(0, 0, w, h);
  g2.drawImage(C.o, 0, 0, w, h); g2.globalCompositeOperation = "lighten"; g2.drawImage(base, 0, 0, w, h); g2.globalCompositeOperation = "source-over";
  g1.setTransform(1, 0, 0, 1, 0, 0); g1.clearRect(0, 0, w, h); g1.filter = `blur(${LITM.blur}px)`; g1.drawImage(C.h2, 0, 0); g1.filter = "none";
  const L = g1.getImageData(0, 0, w, h).data, mg = m.getContext("2d", { willReadFrequently: true }), md = mg.getImageData(0, 0, w, h), a = md.data;
  // only in the wing's sweep zone right of the owl's head (x > 1860 frame px, feathered over 40 px): nearer the head
  // the dark headband and cups sit on the dark room, and there the base's (held) band showed as a second arc
  const [zx0, zx1] = [LITM.zx / 2, (LITM.zx + 40) / 2];
  for (let y = 0, k = 3; y < h; y++) for (let x = 0; x < w; x++, k += 4) {
    if (x < zx0) continue;
    const z = Math.min(1, (x - zx0) / (zx1 - zx0));
    const u = Math.max(0, Math.min(1, (L[k - 3] - LITM.lo) / (LITM.hi - LITM.lo)));
    a[k] = a[k] * (1 - z + z * u * u * (3 - 2 * u));
  }
  mg.putImageData(md, 0, 0);
  return m;
}
function landing(ctx, fi, ks) {
  const bw = baseW(fi);
  const og = C.o.getContext("2d");
  og.clearRect(0, 0, W, H); og.drawImage(drawKeys(ks), 0, 0);
  const base = drawKeys([{ K: K2056, off: fi - BASE.f, w: 1 }]);
  ctx.drawImage(base, 0, 0);
  const tg = C.t.getContext("2d");
  tg.globalCompositeOperation = "source-over"; tg.clearRect(0, 0, W, H); tg.drawImage(C.o, 0, 0);
  tg.globalCompositeOperation = "destination-in"; tg.imageSmoothingEnabled = true; tg.drawImage(litMask(fi, base), 0, 0, W, H);
  tg.globalCompositeOperation = "source-over";
  ctx.drawImage(C.t, 0, 0);
  if (bw < 1) { ctx.globalAlpha = 1 - bw; ctx.drawImage(C.o, 0, 0); ctx.globalAlpha = 1; }
}
