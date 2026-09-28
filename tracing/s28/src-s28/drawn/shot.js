// s28 (129.30-136.00), drawn: from behind the laptop, the designer asleep in the sunlit room.
//   seam (129.32-129.44): the source has no cut at 129.30 (one continuous orbit), so this shot opens on s27's own
//     129.28 drawing, carried on by the measured motion (figure track, room planes, lid corners) and dissolved into
//     this shot's drawing over three frames (every step then stays at or under the source's own step);
//   orbit (129.30-131.36): room layers re-projected per plane with the measured camera (geo.js), figure key drawings
//     moved by their measured motion (tracks.js), the lid from its measured corners (lid.js); the key hand-overs are
//     one-frame switches (A -> B at 129.84, B -> L at 130.16), so nothing ever turns see-through;
//   locked (131.36-136.00): the locked room + the locked figure with measured breathing and eye timing.
import { W, H } from "../../../config.js";
import { createGL } from "./gl.js";
import { canvas } from "./kit.js";
import { paintRoomL, paintShafts, dustMotes, CORNER_X, DESK_POLY } from "./roomL.js";
import { paintFigL, eyes } from "./figL.js";
import { paintKeyB } from "./figB.js";
import { paintKeyA } from "./figA.js";
import { paintRightX, paintDeskA, paintDeskB, paintOrbitGlow, paintOrbitBeam, drawBase, drawChair, drawMug } from "./roomX.js";
import { drawLid, lidQuad } from "./lid.js";
import { BREATH } from "./measure.js";
import { LOCK, Hplane, happly, homog, BACK, RIGHT, DESK } from "./geo.js";
import { trackMap, invert, keyBMap } from "./trackmap.js";
import { overlayEndCard } from "../../s40/card.js";
import { FIGL } from "./figLdata.js";

// s27 (read-only): its last frame is where this shot must start. Loaded defensively so a broken s27 cannot take s28 down.
const S27 = await import("../../s27.js").then((m) => m.shot || null, () => null);

const REF = 131.6;                                   // locked camera = identity
const frameT = (t) => Math.ceil(t * 25 - 1e-6) / 25;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const smooth = (u) => u * u * (3 - 2 * u);
// eye openness, measured frame by frame on crops: open until 133.08, shut by 133.28; open again 135.08 -> 135.22
function eyeK(t) {
  if (t < 133.08) return 1;
  if (t < 133.28) return 1 - (t - 133.08) / 0.2;
  if (t < 135.08) return 0;
  if (t < 135.22) return (t - 135.08) / 0.14;
  return 1;
}
// breathing (fix 2): the head, hair and beanie move as one piece (a feathered head mask; the beanie a little further, by
// its own measured offset), the rest by Gaussian control points (locked px, sigma): the shoulder pinned, the hand and
// the forearm by the measured hand / head offsets. Gains from the source's own motion on the 133.0-134.0 plateau vs 131.5
// over the BREATH table's head / beanie / hand offsets there (head dy 5.1, beanie dy 6.0, hand dy 2.2).
// (re-measured this pass on the same plateau, render vs source: hair +6.4, beanie dy +6.5 / dx +0.4, mouth +6.1, fingers
// +2.6, forearm +1.3, shoulder 0; the table's beanie dx of ~2.9 is not seen in the source, so it is damped)
const HEAD_G = [0.5, 1.2], BEANIE_G = [0.14, 1.08], HAND_G = 1.3;
const CPS = [[720, 330, 160], [1300, 665, 90], [1150, 710, 100], [980, 800, 150]];
function breath(t) {
  if (t < LOCK) return null;
  const k = Math.max(0, Math.min(BREATH.length - 1, Math.round((t - BREATH[0][0]) * 25)));
  const r = BREATH[k];
  const head = [r[1] * HEAD_G[0], r[2] * HEAD_G[1]], bean = [r[3] * BEANIE_G[0], r[4] * BEANIE_G[1]], hand = [r[7] * HAND_G, r[8] * HAND_G];
  return { head, bean, cp: [[0, 0], hand, [r[1] * 0.3, r[2] * 0.3], [hand[0] * 0.5, hand[1] * 0.5]] };
}
// the head mask (face, hair, beanie, headphones; its lower edge along the cheek's contact with the hand) and the beanie
// mask, both feathered ~20 px, sampled at 1/4 scale
const HEADM = [[1030, 300], [1080, 250], [1160, 150], [1300, 100], [1460, 110], [1600, 240], [1630, 460], [1590, 600], [1500, 650],
  [1430, 662], [1380, 652], [1300, 646], [1240, 650], [1170, 660], [1120, 658], [1090, 640], [1030, 560], [1000, 470], [1000, 380]];
function maskLUT(polys, blur) {
  const w = 552, h = 237, c = canvas(w, h), g = c.getContext("2d");
  g.filter = `blur(${blur}px)`; g.scale(0.25, 0.25); g.fillStyle = "#fff";
  for (const P of polys) { g.beginPath(); P.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill(); }
  const d = g.getImageData(0, 0, w, h).data;
  return (x, y) => {
    const u = clamp(x / 4, 0, w - 1.001), v = clamp(y / 4, 0, h - 1.001), i = Math.floor(u), j = Math.floor(v), fu = u - i, fv = v - j;
    const at = (a, b) => d[(b * w + a) * 4 + 3] / 255;
    return (at(i, j) * (1 - fu) + at(i + 1, j) * fu) * (1 - fv) + (at(i, j + 1) * (1 - fu) + at(i + 1, j + 1) * fu) * fv;
  };
}
function breathMap(d) {
  if (!S.headM) { S.headM = maskLUT([HEADM], 5); S.beanM = maskLUT([FIGL.beanie], 5); }
  const hm = S.headM, bm = S.beanM;
  return (x, y) => {
    let dx = 0, dy = 0, sw = 0;
    for (let i = 0; i < CPS.length; i++) {
      const [cx, cy, s] = CPS[i];
      const w = Math.exp(-((x - cx) ** 2 + (y - cy) ** 2) / (2 * s * s));
      dx += w * d.cp[i][0]; dy += w * d.cp[i][1]; sw += w;
    }
    const n = Math.max(1, sw); dx /= n; dy /= n;
    const m = hm(x, y), b = bm(x, y);
    const hx = d.head[0] + (d.bean[0] - d.head[0]) * b, hy = d.head[1] + (d.bean[1] - d.head[1]) * b;
    return [x + dx + (hx - dx) * m, y + dy + (hy - dy) * m];
  };
}

let S = null;
function res() {
  if (S) return S;
  const room = paintRoomL();
  S = { room, shaft: paintShafts(), fig: paintFigL(), eyesC: canvas(W, H), figK: -1, gl: createGL(W, H), tmp: canvas(W, H), lidC: canvas(W, H) };
  return S;
}
function orbitLayers() {
  if (S.backL) return;
  const clipLayer = (src, poly) => {
    const c = canvas(W, H), g = c.getContext("2d");
    g.save(); g.beginPath(); poly.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.clip(); g.drawImage(src, 0, 0); g.restore();
    return c;
  };
  S.backL = clipLayer(S.room, [[0, 0], [CORNER_X, 0], [CORNER_X, 800], [0, 800]]);
  S.rightL = clipLayer(S.room, [[CORNER_X, 0], [W, 0], [W, 930], [1878, 800], [CORNER_X, 800]]);
  S.deskL = clipLayer(S.room, DESK_POLY);
  S.rightX = paintRightX();
  S.deskA = paintDeskA();
  S.deskB = paintDeskB();
  S.glow = paintOrbitGlow();
  S.beam = paintOrbitBeam();
}
// the locked figure with eyes at openness k (cached per k step)
function lockedFig(k) {
  if (S.figK === k) return S.eyesC;
  const g = S.eyesC.getContext("2d");
  g.clearRect(0, 0, W, H);
  g.drawImage(S.fig.body, 0, 0);
  g.drawImage(S.fig.head, 0, 0);
  eyes(g, k);
  g.drawImage(S.fig.hair, 0, 0);
  g.drawImage(S.fig.front, 0, 0);
  S.eyesC.__dirty = true;
  S.figK = k;
  return S.eyesC;
}
const keyCanvas = (k) => (k === "L" ? lockedFig(1) : S["key" + k] || (S["key" + k] = k === "B" ? paintKeyB() : paintKeyA()));

// figure key at t. Hard switches on single frames, where the two keys' measured errors against the source cross
// (forced-key renders, figure region, sigma 4: A|B equal at 129.80, B better from 129.84; B|L equal at 130.00, L better
// from 130.16). A dissolve between two differently drawn keys shows both silhouettes half-transparent; a one-frame
// switch on the moving camera does not.
const SWITCH_AB = 129.82, SWITCH_BL = 130.14;
function figKeys(t) {
  if (t < SWITCH_AB) return ["A", null, 0];
  if (t < SWITCH_BL) return ["B", null, 0];
  return ["L", null, 0];
}
// the room at frame tf (orbit), into ctx
function drawRoomOrbit(ctx, tf) {
  const G = S.gl;
  G.begin([0.937, 0.918, 0.859, 1]);
  const plane = (L, ref, P, alpha = 1) => {
    if (alpha <= 0.001) return;
    const Hm = Hplane(ref, tf, P);
    G.draw({ canvas: L }, (x, y) => happly(Hm, x, y), { nx: 32, ny: 16, alpha });
  };
  plane(S.rightX, 129.32, RIGHT);
  plane(S.rightL, REF, RIGHT);
  plane(S.backL, REF, BACK);
  // desk: three views of it, cross-faded (129.32 -> 129.96 -> locked)
  const aB = clamp((tf - 129.76) / 0.24, 0, 1), aL = clamp((tf - 130.48) / 0.32, 0, 1);
  if (aB < 1) plane(S.deskA, 129.32, DESK);
  if (aL < 1) plane(S.deskB, 129.96, DESK, aB);
  plane(S.deskL, REF, DESK, aL);
  ctx.drawImage(G.canvas, 0, 0);
  // warm glow over the left third and the shaded near desk seen in the orbit (screen / multiply, re-projected)
  const ga = clamp((131.2 - tf) / 0.5, 0, 1);
  if (ga > 0) {
    G.begin([0, 0, 0, 0]);
    const Hd = Hplane(129.96, tf, DESK);
    G.draw({ canvas: S.glow.shade }, (x, y) => happly(Hd, x, y), { nx: 24, ny: 12, alpha: ga });
    ctx.drawImage(G.canvas, 0, 0);
  }
  // the beam's ray streaks on the left wall (fix 2), strongest 129.6-130.3, re-projected with the back wall
  const ba = clamp((tf - 129.4) / 0.2, 0, 1) * clamp((130.7 - tf) / 0.3, 0, 1);
  if (ba > 0) {
    const Hb = Hplane(129.96, tf, BACK);
    for (const [L, op] of [[S.beam.light, "screen"], [S.beam.dark, "multiply"]]) {
      G.begin([0, 0, 0, 0]);
      G.draw({ canvas: L }, (x, y) => happly(Hb, x, y), { nx: 24, ny: 12, alpha: ba });
      ctx.save(); ctx.globalCompositeOperation = op; ctx.drawImage(G.canvas, 0, 0); ctx.restore();
    }
  }
  // the orbit room hands over to the locked room over the last frames of the (by then almost still) camera
  const lr = clamp((tf - 131.2) / 0.16, 0, 1);
  if (lr > 0) { ctx.save(); ctx.globalAlpha = lr; ctx.drawImage(S.room, 0, 0); ctx.restore(); }
  drawChair(ctx, tf);
  drawMug(ctx, tf);
  drawBase(ctx, tf);
}
// the warm sun tint over the left third lies over the figure too (multiply: warmer without brightening; re-projected
// with the back wall)
function drawGlow(ctx, tf) {
  const ga = clamp((131.2 - tf) / 0.5, 0, 1);
  if (ga <= 0) return;
  const G = S.gl;
  G.begin([0, 0, 0, 0]);
  const Hm = Hplane(129.96, tf, BACK);
  G.draw({ canvas: S.glow.screen }, (x, y) => happly(Hm, x, y), { nx: 24, ny: 12, alpha: ga });
  ctx.save(); ctx.globalCompositeOperation = "multiply"; ctx.drawImage(G.canvas, 0, 0); ctx.restore();
}
// key L in the orbit (fix 2): the locked drawing moved by its track does not follow the source's silhouette, which
// changes with the view (a 3D back and sleeve seen from the side). Measured correction: anchors on the key's back and
// sleeve outline (locked px) and, per source frame, their displacement onto the source's silhouette mapped back through
// the track (intersection along the outline normal; snapshots/s28-fix2-work/lcorr.mjs). Gaussian-weighted (sigma 60,
// normalised, pinned by zero anchors inside the figure), linear in time, gone by 130.60.
const LC_A = [[879, 236], [834, 234], [793, 251], [756, 276], [718, 301], [688, 334], [658, 366], [629, 399], [597, 430], [566, 462],
  [534, 494], [506, 518], [504, 563], [498, 608], [483, 650], [464, 691], [448, 733], [438, 776], [458, 811], [502, 820], [547, 825]];
const LC_T = [130.16, 130.24, 130.32, 130.40, 130.48];
const LC_D = [
  [[9, 14], [14, 21], [18, 28], [23, 35], [30, 46], [44, 33], [28, 55], [54, 29], [49, 41], [46, 55], [58, 52], [67, 28], [76, 4], [47, 17], [46, 21], [44, 20], [43, 20], [52, 4], [10, -8], [1, -9], [1, -6]],
  [[6, 12], [10, 18], [14, 24], [16, 30], [18, 34], [19, 37], [20, 39], [39, 21], [40, 33], [41, 48], [50, 44], [56, 24], [63, 4], [37, 13], [29, 13], [31, 14], [30, 14], [32, 3], [12, -20], [-1, 7], [0, 3]],
  [[4, 8], [7, 12], [10, 16], [13, 20], [16, 24], [20, 26], [26, 28], [30, 29], [35, 29], [36, 42], [48, 43], [54, 24], [61, 4], [34, 12], [29, 13], [32, 14], [43, 19], [60, 5], [10, -25], [4, -27], [3, -25]],
  [[0, 0], [2, 3], [4, 5], [6, 7], [8, 9], [10, 10], [12, 11], [14, 12], [16, 13], [18, 14], [20, 14], [25, 1], [-5, 0], [-25, -9], [-32, -15], [-34, -15], [-36, -16], [-46, -4], [-5, 12], [0, 2], [0, 0]],
  [[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [5, 2], [1, 0], [1, 0], [-1, 0], [-1, 0], [0, 0], [0, 0], [0, 0]],
];
const LC_Z = [[960, 390], [860, 450], [770, 520], [690, 600], [640, 700], [660, 790], [1000, 300], [1100, 560], [900, 700]];
function keyLCorr(tf) {
  if (tf >= 130.6) return null;
  let D;
  if (tf <= LC_T[0]) D = LC_D[0];
  else if (tf >= LC_T[LC_T.length - 1]) { const u = 1 - (tf - 130.48) / 0.12; D = LC_D[LC_D.length - 1].map(([x, y]) => [x * u, y * u]); }
  else {
    let i = 1; while (LC_T[i] < tf) i++;
    const u = (tf - LC_T[i - 1]) / (LC_T[i] - LC_T[i - 1]);
    D = LC_D[i - 1].map(([x, y], k) => [x + (LC_D[i][k][0] - x) * u, y + (LC_D[i][k][1] - y) * u]);
  }
  const s2 = 2 * 60 * 60;
  return (x, y) => {
    let dx = 0, dy = 0, sw = 0;
    for (let k = 0; k < LC_A.length; k++) { const w = Math.exp(-((x - LC_A[k][0]) ** 2 + (y - LC_A[k][1]) ** 2) / s2); dx += w * D[k][0]; dy += w * D[k][1]; sw += w; }
    for (const [zx, zy] of LC_Z) sw += Math.exp(-((x - zx) ** 2 + (y - zy) ** 2) / s2);
    const n = Math.max(1, sw);
    return [x + dx / n, y + dy / n];
  };
}
// key A in the orbit (fix 2): the same kind of measured silhouette correction for its back and sleeve (129.32 px), onto
// the source's silhouette at 129.40-129.80 mapped back through the key-A track (acorr.mjs; nulls filled along the
// outline, clamped to 45 px, smoothed [1 2 1]); ramps in from 0 at 129.32.
const AC_A = [[692, 281], [651, 266], [606, 261], [561, 259], [517, 258], [472, 261], [428, 268], [392, 295], [360, 326], [333, 362],
  [312, 402], [295, 443], [274, 484], [254, 524], [236, 565], [219, 607], [204, 649], [183, 689], [161, 728], [138, 766], [123, 808],
  [151, 818], [196, 813], [240, 807], [259, 840], [289, 861], [332, 873], [377, 872]];
const AC_T = [129.32, 129.40, 129.48, 129.56, 129.64, 129.72, 129.80];
const AC_D = [
  AC_A.map(() => [0, 0]),
  [[0, 0], [0, 1], [0, 1], [0, 2], [0, 2], [2, 5], [7, 10], [12, 14], [16, 15], [19, 12], [20, 9], [24, 10], [29, 14], [33, 16], [32, 14], [28, 11], [28, 9], [27, 8], [26, 6], [24, 4], [22, 2], [21, 1], [19, -1], [18, -3], [13, -8], [7, -18], [4, -24], [-2, -24]],
  [[0, 0], [0, 0], [0, 0], [0, 1], [0, 1], [2, 3], [6, 8], [10, 11], [14, 12], [17, 11], [16, 7], [14, 6], [18, 9], [22, 10], [22, 9], [22, 9], [27, 12], [33, 19], [31, 20], [22, 18], [14, 15], [6, 13], [-2, 10], [-11, 8], [-12, 1], [-2, -12], [4, -22], [-3, -27]],
  [[0, 0], [0, -1], [0, -2], [0, -2], [0, -3], [1, -1], [4, 4], [6, 7], [9, 8], [12, 8], [10, 5], [6, 3], [8, 4], [10, 5], [7, 3], [7, 3], [8, 4], [14, 8], [27, 16], [39, 24], [39, 25], [32, 22], [24, 19], [15, 16], [7, 13], [2, 7], [0, -2], [-1, -9]],
  [[0, 0], [0, -2], [0, -4], [-1, -6], [-1, -8], [-3, -10], [-9, -13], [-15, -17], [-19, -18], [-23, -15], [-30, -14], [-39, -17], [-40, -20], [-36, -17], [-36, -15], [-38, -14], [-39, -16], [-34, -18], [-22, -13], [-8, -6], [2, 1], [4, 8], [3, 15], [1, 21], [0, 28], [-3, 29], [-3, 21], [2, 15]],
  [[0, 0], [-2, -2], [-4, -5], [-6, -8], [-7, -10], [-9, -12], [-12, -15], [-17, -18], [-22, -20], [-27, -18], [-35, -16], [-42, -19], [-45, -22], [-45, -22], [-45, -22], [-45, -23], [-45, -24], [-45, -25], [-42, -24], [-35, -18], [-29, -7], [-25, 4], [-19, 14], [-14, 25], [-8, 35], [-6, 38], [-5, 25], [0, 0]],
  [[0, 0], [-1, -1], [-2, -2], [-2, -3], [-3, -5], [-4, -6], [-5, -7], [-7, -8], [-9, -8], [-12, -8], [-20, -9], [-29, -13], [-32, -15], [-36, -17], [-43, -20], [-45, -20], [-45, -22], [-44, -24], [-38, -22], [-29, -14], [-23, -7], [-19, -1], [-15, 4], [-10, 10], [-6, 15], [-4, 19], [-4, 15], [0, 0]],
];
const AC_Z = [[520, 420], [450, 560], [400, 700], [560, 600], [620, 360], [700, 560], [900, 450], [1000, 560], [800, 720]];
// Gaussian-weighted anchor displacement field (sigma 60, normalised, pinned by zero anchors), linear in time
function anchorField(ANCH, TS, DS, Z, tf) {
  if (tf <= TS[0] || tf >= TS[TS.length - 1] + 0.12) return null;
  let D;
  if (tf >= TS[TS.length - 1]) D = DS[DS.length - 1];
  else {
    let i = 1; while (TS[i] < tf) i++;
    const u = (tf - TS[i - 1]) / (TS[i] - TS[i - 1]);
    D = DS[i - 1].map(([x, y], k) => [x + (DS[i][k][0] - x) * u, y + (DS[i][k][1] - y) * u]);
  }
  const s2 = 2 * 60 * 60;
  return (x, y) => {
    let dx = 0, dy = 0, sw = 0;
    for (let k = 0; k < ANCH.length; k++) { const w = Math.exp(-((x - ANCH[k][0]) ** 2 + (y - ANCH[k][1]) ** 2) / s2); dx += w * D[k][0]; dy += w * D[k][1]; sw += w; }
    for (const [zx, zy] of Z) sw += Math.exp(-((x - zx) ** 2 + (y - zy) ** 2) / s2);
    const n = Math.max(1, sw);
    return [x + dx / n, y + dy / n];
  };
}
function keyMap(k, tf) {
  if (k === "B") return keyBMap(tf);
  const f = trackMap(k, tf);
  const c = k === "L" ? keyLCorr(tf) : anchorField(AC_A, AC_T, AC_D, AC_Z, tf);
  return c ? (x, y) => { const [u, v] = c(x, y); return f(u, v); } : f;
}
function drawKeyOn(ctx, k, tf) {
  const G = S.gl;
  G.begin([0, 0, 0, 0]);
  G.draw({ canvas: keyCanvas(k) }, keyMap(k, tf), { nx: 44, ny: 20 });
  ctx.drawImage(G.canvas, 0, 0);
}
// the sun shaft (screen) lights the room only (fix 2: it is drawn under the figure, which the source's shaft does not
// cross), re-projected with the back wall during the orbit; the dust motes float over everything
function drawSunShaft(ctx, tf) {
  const G = S.gl;
  if (tf >= LOCK) {
    ctx.save(); ctx.globalCompositeOperation = "screen"; ctx.drawImage(S.shaft, 0, 0); ctx.restore();
  } else {
    G.begin([0, 0, 0, 0]);
    const Hm = Hplane(REF, tf, BACK);
    G.draw({ canvas: S.shaft }, (x, y) => happly(Hm, x, y), { nx: 24, ny: 12 });
    ctx.save(); ctx.globalCompositeOperation = "screen"; ctx.drawImage(G.canvas, 0, 0); ctx.restore();
  }
}

// ---------------------------------------------------------------- the seam with s27 (129.32-129.44)
// fix 2: s27's 129.28 figure (and its owl) is drawn differently from key A, so dissolving it doubled every contour. Now
// only s27's room and lid dissolve out (under this shot's figure / over this shot's lid, both re-projected with the
// measured camera); the figure hands over hard at 129.32. (Even a perfect figure here would step ~24.7 from s27's
// 129.28 frame at sigma 4, so a hard cut of the whole frame cannot meet the source's 12.3 step.)
const SEAM_END = 129.44;
// s27's lid at 129.28 (its keys: page corners -> frame, back view), image-left top, right top, right bottom, left bottom
const LID27 = [[1400, 336], [1771, 357], [1643, 786], [1243, 871]];
// where s27's figure, owl and laptop base are in its 129.28 frame (cut out of its room layer, feathered)
const FIG_REGION = [[150, 946], [170, 560], [260, 380], [380, 270], [560, 230], [760, 150], [960, 95], [1150, 110], [1270, 220],
  [1300, 330], [1360, 480], [1380, 640], [1330, 760], [1280, 946]];
function s27Layers() {
  if (S.s27 !== undefined) return S.s27;
  S.s27 = null;
  if (!S27) return null;
  const f = canvas(W, H), g = f.getContext("2d");
  g.fillStyle = "#000"; g.fillRect(0, 0, W, H);
  try { g.save(); S27.draw(g, 129.28 - 117.52, 129.28); g.restore(); } catch (e) { return null; }
  const grow = (Q, d) => { const cx = Q.reduce((a, p) => a + p[0], 0) / 4, cy = Q.reduce((a, p) => a + p[1], 0) / 4; return Q.map(([x, y]) => { const l = Math.hypot(x - cx, y - cy) || 1; return [x + (x - cx) / l * d, y + (y - cy) / l * d]; }); };
  const path = (c, Q) => { c.beginPath(); Q.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); };
  const lid = canvas(W, H), gl = lid.getContext("2d");
  gl.save(); path(gl, grow(LID27, 3)); gl.clip(); gl.drawImage(f, 0, 0); gl.restore();
  const room = canvas(W, H), gr = room.getContext("2d");
  gr.drawImage(f, 0, 0);
  gr.globalCompositeOperation = "destination-out"; path(gr, grow(LID27, 3)); gr.fill();
  gr.filter = "blur(10px)"; path(gr, FIG_REGION.map(([x, y]) => [x + (x < 760 ? -14 : 14), y - 14])); gr.fill(); gr.filter = "none";
  gr.globalCompositeOperation = "source-over";
  gr.clearRect(0, 940, W, 6);                                   // s27's bottom-edge band is its own, not the room's
  S.s27 = { room, lid };
  return S.s27;
}
const seamA = (tf) => clamp(1 - (tf - 129.32) / (SEAM_END - 129.32), 0, 1);
// s27's room (without its figure), re-projected per plane from 129.28 to tf, at the dissolve's alpha (under the figure)
function drawSeamRoom(ctx, tf) {
  const L = s27Layers(), a = seamA(tf);
  if (!L || a <= 0.001) return;
  const G = S.gl;
  const Hb = Hplane(129.28, tf, BACK), Hr = Hplane(129.28, tf, RIGHT), Hd = Hplane(129.28, tf, DESK);
  const mapRoom = (x, y) => {
    const wd = smooth(clamp((y - 740) / 70, 0, 1)), wb = 1 - smooth(clamp((x - 620) / 160, 0, 1));
    const b = happly(Hb, x, y), r = happly(Hr, x, y), d = happly(Hd, x, y);
    return [(b[0] * wb + r[0] * (1 - wb)) * (1 - wd) + d[0] * wd, (b[1] * wb + r[1] * (1 - wb)) * (1 - wd) + d[1] * wd];
  };
  G.begin([0, 0, 0, 0]);
  G.draw({ canvas: L.room }, mapRoom, { nx: 64, ny: 28 });
  ctx.save(); ctx.globalAlpha = a; ctx.drawImage(G.canvas, 0, 0); ctx.restore();
}
// s27's lid, carried by the lid's measured corners, at the dissolve's alpha (over this shot's lid)
function drawSeamLid(ctx, tf) {
  const L = s27Layers(), a = seamA(tf);
  if (!L || a <= 0.001) return;
  const G = S.gl;
  const Hl = homog(lidQuad(129.28), lidQuad(tf));
  G.begin([0, 0, 0, 0]);
  G.draw({ canvas: L.lid }, (x, y) => happly(Hl, x, y), { nx: 8, ny: 8 });
  ctx.save(); ctx.globalAlpha = a; ctx.drawImage(G.canvas, 0, 0); ctx.restore();
}

function drawOrbit(ctx, tf) {
  orbitLayers();
  drawRoomOrbit(ctx, tf);
  if (tf < SEAM_END) drawSeamRoom(ctx, tf);
  const [k0, k1, r] = figKeys(tf);
  if (k1 && r > 0.001) {
    // cross-dissolve two whole composites: (room + older key) under, (room + newer key) at r on top
    const g = S.tmp.getContext("2d");
    g.globalAlpha = 1; g.globalCompositeOperation = "copy"; g.drawImage(ctx.canvas, 0, 0); g.globalCompositeOperation = "source-over";
    drawKeyOn(ctx, k0, tf);
    drawKeyOn(g, k1, tf);
    ctx.save(); ctx.globalAlpha = r; ctx.drawImage(S.tmp, 0, 0); ctx.restore();
  } else { drawSunShaft(ctx, tf); drawKeyOn(ctx, k0, tf); }
  drawGlow(ctx, tf);
  dustMotes(ctx, tf, Hplane(REF, tf, BACK));
  drawLid(ctx, tf);
  if (tf < SEAM_END) drawSeamLid(ctx, tf);
}

export const shot = {
  draw(ctx, local, t) {
    const tf = frameT(t);
    res();
    if (tf < LOCK) { drawOrbit(ctx, tf); return; }
    ctx.drawImage(S.room, 0, 0);
    drawSunShaft(ctx, tf);
    const k = Math.round(eyeK(tf) * 20) / 20;
    const fig = lockedFig(k);
    const d = breath(tf);
    const G = S.gl;
    G.begin([0, 0, 0, 0]);
    G.draw({ canvas: fig }, breathMap(d), { nx: 60, ny: 26 });
    ctx.drawImage(G.canvas, 0, 0);
    dustMotes(ctx, tf, null);
    drawLid(ctx, tf);
    if (t >= 135.72 && t < 136.0) overlayEndCard(ctx, t);
  },
  release() { if (S) S.gl.release(); S = null; },
};
export { trackMap };
