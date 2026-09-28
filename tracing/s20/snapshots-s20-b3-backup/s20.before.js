// s20 (63.12–69.44): the wide room. Two locked-off setups:
//   A 63.12–66.84  the owl props the note card against the synth, turns, runs to the big grimy scissors leaning on
//                  the speaker, beats the dust and cobwebs off them (they come up bright chrome), backs off and stares;
//   B 66.84–69.44  the same drawing re-framed (measured per frame, see B1/B2 below): the owl crouches, lunges, grabs
//                  the scissors, whirls with them, then holds them up with a glint and a smirk, one wing on its hip.
//   69.40 (last frame) is a light-leak flash into s21.
// Drawing: everything is redrawn from measurements of the source (s20/trace/*.py; no source pixels are stored). The
// frames are un-graded (inverse of post.js), composited over time into clean views and traced into value-band outlines
// + ink centre-lines (+ two residual passes); data in s20/data/ (packed control points), painted by s20/tracedraw.js +
// tracedata.js. Layers:
//   rooms   A at rest (card and clean scissors included), what the moving card uncovers, the dusty/cobwebbed
//           scissors, the redrawn B2 room; B1 frames show A through the B1 camera and the measured B1 tone curve
//   owl     held keys where the source holds a drawing (rear 63.40–63.60, front 63.88–64.20, two stares 65.76–67.12;
//           each frame places its key by a measured affine), single-frame traces where it redraws every frame (the
//           push, turn, run, flap with its dust cloud, back-off, head lean, lunge, grab, whirl), and the hold drawing
//           (68.04–69.36, settled 67.76–68.00 by measured affines)
//   haze    the melting dust under the held stares: a traced additive light layer per frame
//   glint, 69.40 flash: measured per-frame light tables
// The owl2 rig (s20/owl2.js) is only a fallback; no frame uses it.
import { W, H } from "../config.js";
import { clamp, lerp, smooth } from "../lib/rng.js";
import { owlAt } from "./s20/owl.js";
import { owl2Layer } from "./s20/owl2.js";
import { decode, traceCanvas, ringsPath } from "./s20/tracedata.js";
import { ROOM_A } from "./s20/data/roomA.js";
import { ROOM_B2 } from "./s20/data/roomB2.js";
import { BEHIND } from "./s20/data/behind.js";
import { GRIMY } from "./s20/data/grimy.js";
import { HOLD } from "./s20/data/hold.js";
import { SC_MASK } from "./s20/data/scmask.js";
import { keyAt, drawKey, releaseKeys } from "./s20/owlkeys.js";
import { HAZE_LAYERS } from "./s20/data/haze_index.js";

const CUT = 66.84;
const M = 60;                                             // room canvases carry a margin (setup B shrinks the frame)
// Setup B camera, measured per frame (ORB + RANSAC affine fit of the static room, source frame 66.40 → frame t,
// residual ≈ 0.8 px): canvas setTransform(a, b, c, d, e, f) with x' = a·x + c·y + e, y' = b·x + d·y + f.
// B1 66.84–67.36 is anisotropic; a second nudge 67.40–67.48 settles into B2, held 67.52–69.40. From 67.40 the source
// room is a redrawn one (the speaker side panel and plant shift ≈ 13 px): that is the separately traced B2 room.
const B1 = [0.9846, -0.0002, 0.0000, 0.9703, 0.95, -3.6];
const B2 = [0.9910, -0.0004, -0.0004, 0.9646, -8.15, 1.3];
const CAM = [[67.4, [0.9862, -0.0002, -0.0011, 0.9690, -0.42, -2.61]], [67.44, [0.9888, -0.0003, -0.0001, 0.9669, -5.16, -0.39]], [67.48, [0.9908, -0.0006, -0.0005, 0.9648, -7.93, 1.73]]];
function camAt(tq) {
  if (tq < CUT - 1e-6) return null;
  if (tq < 67.4 - 1e-6) return B1;
  for (const [t, m] of CAM) if (Math.abs(tq - t) < 0.005) return m;
  return B2;
}
const mul = (A, B) => [A[0] * B[0] + A[2] * B[1], A[1] * B[0] + A[3] * B[1], A[0] * B[2] + A[2] * B[3], A[1] * B[2] + A[3] * B[3], A[0] * B[4] + A[2] * B[5] + A[4], A[1] * B[4] + A[3] * B[5] + A[5]];
const inv = (A) => { const d = A[0] * A[3] - A[1] * A[2]; return [A[3] / d, -A[1] / d, -A[2] / d, A[0] / d, (A[2] * A[5] - A[3] * A[4]) / d, (A[1] * A[4] - A[0] * A[5]) / d]; };

// ---------------------------------------------------------------- homography + mesh warp (the card during the push)
function homography(src, dst) {
  const A = [], b = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = src[i], [u, v] = dst[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v);
  }
  for (let c = 0; c < 8; c++) {
    let p = c; for (let r = c + 1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]]; [b[c], b[p]] = [b[p], b[c]];
    for (let r = 0; r < 8; r++) if (r !== c) { const f = A[r][c] / A[c][c]; for (let k = c; k < 8; k++) A[r][k] -= f * A[c][k]; b[r] -= f * b[c]; }
  }
  const h = b.map((v, i) => v / A[i][i]);
  return (x, y) => { const w = h[6] * x + h[7] * y + 1; return [(h[0] * x + h[1] * y + h[2]) / w, (h[3] * x + h[4] * y + h[5]) / w]; };
}
function tri(ctx, img, s0, s1, s2, d0, d1, d2) {
  const cx = (d0[0] + d1[0] + d2[0]) / 3, cy = (d0[1] + d1[1] + d2[1]) / 3, g = 0.6;
  const grow = (p) => { const dx = p[0] - cx, dy = p[1] - cy, l = Math.hypot(dx, dy) || 1; return [p[0] + dx / l * g, p[1] + dy / l * g]; };
  const a = grow(d0), bb = grow(d1), c = grow(d2);
  ctx.save(); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(bb[0], bb[1]); ctx.lineTo(c[0], c[1]); ctx.closePath(); ctx.clip();
  const [x0, y0] = s0, [x1, y1] = s1, [x2, y2] = s2;
  const den = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0);
  const m11 = ((d1[0] - d0[0]) * (y2 - y0) - (d2[0] - d0[0]) * (y1 - y0)) / den;
  const m12 = ((d2[0] - d0[0]) * (x1 - x0) - (d1[0] - d0[0]) * (x2 - x0)) / den;
  const m21 = ((d1[1] - d0[1]) * (y2 - y0) - (d2[1] - d0[1]) * (y1 - y0)) / den;
  const m22 = ((d2[1] - d0[1]) * (x1 - x0) - (d1[1] - d0[1]) * (x2 - x0)) / den;
  ctx.transform(m11, m21, m12, m22, d0[0] - m11 * x0 - m12 * y0, d0[1] - m21 * x0 - m22 * y0);
  ctx.drawImage(img, 0, 0);
  ctx.restore();
}
// warp img (whose pixel (0,0) is frame point (ox, oy)) so that frame quad src maps onto frame quad dst
function warpQuad(ctx, img, ox, oy, src, dst, nx = 8, ny = 12, pad = 18) {
  const Hm = homography(src, dst);
  const S = [], P = [];
  // parametrise the (slightly grown) source quad bilinearly
  const c = src.reduce((a, p) => [a[0] + p[0] / 4, a[1] + p[1] / 4], [0, 0]);
  const g = src.map((p) => { const dx = p[0] - c[0], dy = p[1] - c[1], l = Math.hypot(dx, dy); return [p[0] + dx / l * pad, p[1] + dy / l * pad]; });
  for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) {
    const u = i / nx, v = j / ny;
    const x = lerp(lerp(g[0][0], g[1][0], u), lerp(g[3][0], g[2][0], u), v), y = lerp(lerp(g[0][1], g[1][1], u), lerp(g[3][1], g[2][1], u), v);
    S.push([x - ox, y - oy]); P.push(Hm(x, y));
  }
  const at = (i, j) => j * (nx + 1) + i;
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const a = at(i, j), b = at(i + 1, j), cc = at(i + 1, j + 1), d = at(i, j + 1);
    tri(ctx, img, S[a], S[b], S[cc], P[a], P[b], P[cc]);
    tri(ctx, img, S[a], S[cc], S[d], P[a], P[cc], P[d]);
  }
}

// ---------------------------------------------------------------- the card: measured quads (setup A frame)
// Final lean (63.44 on): corners fitted to the edges at 64.12. During the push (63.12–63.40) the card slides right
// and straightens; the smiley track (per frame) gives the progress f, with a 15 px lift mid-way.
const CARD_Q0 = [[1040, 232], [1245, 197], [1346, 748], [1144, 674]];
const CARD_Q1 = [[1305, 247], [1503, 222], [1444, 813], [1227, 722]];
const CARD_F = [[63.12, 0], [63.16, 0.063], [63.2, 0.138], [63.24, 0.224], [63.28, 0.351], [63.32, 0.48], [63.36, 0.647], [63.4, 0.99], [63.44, 1]];
function cardQuad(t) {
  let f = 1;
  if (t < 63.44) { f = 0; for (let i = 1; i < CARD_F.length; i++) if (t < CARD_F[i][0] + 1e-6) { const [ta, fa] = CARD_F[i - 1], [tb, fb] = CARD_F[i]; f = fa + (fb - fa) * clamp((t - ta) / (tb - ta)); break; } }
  const lift = -15 * Math.sin(Math.PI * f);
  return CARD_Q0.map((p, i) => [lerp(p[0], CARD_Q1[i][0], f), lerp(p[1], CARD_Q1[i][1], f) + lift]);
}
// the card's resting outline (its paper, rim and the thickness strip on the right), and the synth's outline in front
// of it (measured on the A composite: rounded top-left corner, slanted end cap, the foot)
const CARD_OUT = [[1299, 240], [1311, 236], [1500, 214], [1512, 222], [1514, 236], [1456, 812], [1446, 822], [1232, 730], [1220, 718], [1222, 706], [1294, 252]];
const SYNTH_OUT = [[1445, 581], [1600, 588], [2270, 625], [2270, 1010], [1362, 825], [1346, 802], [1333, 786], [1333, 772], [1345, 740], [1360, 705], [1380, 665], [1400, 630], [1420, 597], [1432, 585]];
const polyPath = (g, P) => { g.moveTo(P[0][0], P[0][1]); for (let i = 1; i < P.length; i++) g.lineTo(P[i][0], P[i][1]); g.closePath(); };
const Q1G = (() => { const c = CARD_Q1.reduce((a, p) => [a[0] + p[0] / 4, a[1] + p[1] / 4], [0, 0]); return CARD_Q1.map((p) => { const dx = p[0] - c[0], dy = p[1] - c[1], l = Math.hypot(dx, dy); return [p[0] + dx / l * 22, p[1] + dy / l * 22]; }); })();
// colour on the traced (grey) card: warm paper, the yellow smiley with its warm halo (measured at 64.08: core
// RGB (227,205,134) out to r 18, (234,220,207) at r 30, no tint past r 37; paper R−B ≈ +10)
const SMILEY = [1370.5, 296.7];
function cardColour(ctx, map = (p) => p) {
  ctx.save();
  ctx.globalCompositeOperation = "multiply"; ctx.fillStyle = "rgb(255,251,245)";
  ctx.beginPath(); CARD_OUT.forEach((p, i) => { const q = map(p); i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); }); ctx.closePath(); ctx.fill();
  const [x, y] = map(SMILEY), r = 38 * Math.hypot(map([SMILEY[0] + 1, SMILEY[1]])[0] - x, map([SMILEY[0] + 1, SMILEY[1]])[1] - y);
  ctx.globalCompositeOperation = "color";
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, "rgba(232,200,110,1)"); g.addColorStop(0.47, "rgba(232,200,110,1)"); g.addColorStop(0.62, "rgba(236,196,150,0.8)"); g.addColorStop(0.8, "rgba(236,200,180,0.45)"); g.addColorStop(1, "rgba(236,210,200,0)");
  ctx.fillStyle = g; ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
  ctx.restore();
}
// the typed line on the card, redrawn with the card's font (the trace leaves its pixels blank): measured baseline
// start (left of the first glyph) and end (right of the last), cap height, along the card's own vertical (the card
// leans back: its verticals run (−0.164, 1)). The B2 redraw of the card reads "Ths is really good" in the source.
const CARD_TEXT = {
  A: { text: "This is really good", a: [1308, 386], b: [1444, 381], cap: 13 },
  B2: { text: "Ths is really good", a: [1294, 373], b: [1422, 369], cap: 13 },
};
function drawCardText(g, T, color = "rgb(66,54,54)") {
  const n = T.text.length, dx = T.b[0] - T.a[0], dy = T.b[1] - T.a[1], L = Math.hypot(dx, dy);
  g.save();
  g.font = "500 20px 'Geist Mono'";
  const adv = g.measureText("M").width, capH = g.measureText("T").actualBoundingBoxAscent || 14;
  const lb = g.measureText(T.text[0]).actualBoundingBoxLeft || 0;
  const sx = L / (adv * (n - 0.12)), sy = T.cap / capH;
  // local x along the baseline (px per font unit sx), local y along the card vertical (sy)
  const ex = [dx / L * sx, dy / L * sx], ey = [-0.164 * sy, 1 * sy];
  g.setTransform(ex[0], ex[1], ey[0], ey[1], T.a[0] + M + lb * ex[0], T.a[1] + M + lb * ex[1]);
  g.fillStyle = color; g.textBaseline = "alphabetic"; g.fillText(T.text, 0, 0);
  g.restore();
}
const SC_BOX = [548, 262, 876, 874];                      // bbox of the silhouette (+ a few px)
// the region cobwebs + scissors occupy (grimy layer clip), frame px
const SC_POLY = [[555, 245], [705, 250], [795, 275], [805, 450], [835, 600], [905, 675], [995, 755], [995, 835], [885, 905], [755, 905], [700, 710], [635, 565], [555, 490]];

// ---------------------------------------------------------------- caches
// Layers are built on first use (a worker rendering only part of the shot builds only what it needs).
let C = null;
const WW = W + 2 * M, HH = H + 2 * M;
const HB = [700, 40, 1320, 870], CB = [1200, 196, 1530, 850];
const MAKE = {
  roomA() { const c = traceCanvas(decode(ROOM_A), -M, -M, WW, HH); drawCardText(c.getContext("2d"), CARD_TEXT.A); return c; },
  roomB2() { const c = traceCanvas(decode(ROOM_B2), -M, -M, WW, HH); drawCardText(c.getContext("2d"), CARD_TEXT.B2, "rgb(92,80,80)"); return c; },
  behind: () => traceCanvas(decode(BEHIND), -M, -M, WW, HH, { clear: true, clip: (g) => polyPath(g, Q1G) }),
  grimy: () => traceCanvas(decode(GRIMY), -M, -M, WW, HH, { clear: true, clip: (g) => polyPath(g, SC_POLY) }),
  // held owl + scissors (B2 frame), clipped to its measured silhouette
  hold() { const d = decode(HOLD); return traceCanvas(d, HB[0], HB[1], HB[2] - HB[0], HB[3] - HB[1], { clear: true, clip: (g) => ringsPath(g, d.mask) }); },
  // the card at rest cut out of the room (for the push), without the synth in front of it
  card() {
    const card = document.createElement("canvas"); card.width = CB[2] - CB[0]; card.height = CB[3] - CB[1];
    const g = card.getContext("2d"); g.translate(-CB[0], -CB[1]); g.save(); g.beginPath(); polyPath(g, CARD_OUT); g.clip(); g.drawImage(L("roomA"), -M, -M);
    // the part hidden by the synth at rest: plain paper, so it can show when the card is elsewhere
    g.beginPath(); polyPath(g, SYNTH_OUT); g.clip(); g.fillStyle = "rgb(214,210,204)"; g.fillRect(1300, 560, 240, 300); g.restore();
    return card;
  },
  // the clean scissors cut out of the room at their leaning pose, and the dusty version
  scClean: () => scCut(L("roomA")),
  scGrimy: () => scCut(L("grimy")),
  // the scissor-less B2 room mapped back into the A frame over the silhouette (grown 5 px): the empty lean spot
  patch() {
    const patch = document.createElement("canvas"); patch.width = SC_BOX[2] - SC_BOX[0] + 16; patch.height = SC_BOX[3] - SC_BOX[1] + 16;
    const g = patch.getContext("2d"); g.translate(-(SC_BOX[0] - 8), -(SC_BOX[1] - 8));
    g.save(); g.transform(...inv(B2)); g.drawImage(L("roomB2"), -M, -M); g.restore();
    const mk = document.createElement("canvas"); mk.width = patch.width; mk.height = patch.height;
    const m = mk.getContext("2d"); m.translate(-(SC_BOX[0] - 8), -(SC_BOX[1] - 8));
    m.beginPath(); ringsPath(m, SC_MASK); m.fillStyle = "#fff"; m.fill("evenodd"); m.lineWidth = 10; m.lineJoin = "round"; m.strokeStyle = "#fff"; m.stroke();
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = "destination-in"; g.drawImage(mk, 0, 0);
    return patch;
  },
};
function scCut(src) {
  const c = document.createElement("canvas"); c.width = SC_BOX[2] - SC_BOX[0]; c.height = SC_BOX[3] - SC_BOX[1];
  const g = c.getContext("2d"); g.translate(-SC_BOX[0], -SC_BOX[1]); g.beginPath(); ringsPath(g, SC_MASK); g.clip("evenodd"); g.drawImage(src, -M, -M); return c;
}
function L(name) { if (!(name in C)) C[name] = MAKE[name](); return C[name]; }
function build() {
  if (!C) C = { owls: new Map(), scratch: document.createElement("canvas") };
  return C;
}
function scratch() { const c = C.scratch; if (c.width !== W) { c.width = W; c.height = H; } const g = c.getContext("2d"); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H); return [c, g]; }

function owlCached(o) {
  const m = C.owls;
  if (!m.has(o.key)) {
    if (m.size > 40) m.delete(m.keys().next().value);
    m.set(o.key, owl2Layer(o.pose(), o.place));
  }
  return m.get(o.key);
}

// ---------------------------------------------------------------- the scissors' state
// grime: dusty until 65.48, cleaned to bright chrome by 65.72 (blade brightness track 123 → 140 → 168); the cobwebs
// strung over them go with the dust (they are part of the dusty layer).
const grimeAt = (t) => 1 - smooth(clamp((t - 65.48) / 0.24));
// ---------------------------------------------------------------- the hold (B2 frame): one static drawing 68.04–69.36,
// reached through a settle 67.76–68.00 (ECC affine fits of the hold drawing to each source frame, crop origin (740,70):
// template → frame)
const SETTLE = {
  67.76: [0.9853, -0.0036, 9.2234, -0.0057, 1.0075, -3.7473],
  67.8: [1.0315, -0.0337, 8.9395, 0.0559, 0.9689, 0.8250],
  67.84: [1.0189, -0.0620, 28.5443, 0.0315, 0.9623, 17.8266],
  67.88: [1.0077, -0.0202, 9.2041, 0.0052, 0.9807, 13.6708],
  67.92: [1.0033, -0.0030, -0.0515, 0.0004, 0.9956, 3.9842],
  67.96: [0.9997, 0.0028, -1.8029, -0.0018, 1.0012, 0.5818],
  68.0: [1.0, 0.0012, -0.6887, -0.0007, 1.0007, 0.2755],
};
const HOLD_T0 = 67.76;
function drawHoldOwl(ctx, tq) {
  const w = SETTLE[+tq.toFixed(2)];
  ctx.save();
  if (w) {
    const [a, c, e, b, d, f] = w, ox = 740, oy = 70;
    ctx.transform(a, b, c, d, e + ox - a * ox - c * oy, f + oy - b * ox - d * oy);
  }
  ctx.drawImage(L("hold"), HB[0], HB[1]);
  ctx.restore();
}

// ---------------------------------------------------------------- glint (B2 frame)
// Measured per frame against the hold drawing (pre-grade additive light, s20/trace: glint table): the centre sits at
// (1170,157) on the blade tips; a soft core whose radial profile (r = 8, 16, 24, 32, 40, 50, 60, 70, 80, 95 px) grows
// 67.96–68.44 and shrinks to nothing by 69.00, and four thin rays whose reach (to half strength) grows with it:
// up (tilted ≈ 0.06 rad), left, right (≈ 1.12 × left) and a short down ray (≈ 0.6 × up). [core, up reach, left reach]
const GLINT_T = {
  67.92: [[0.17, 0.01, 0, 0, 0, 0, 0, 0, 0, 0], 1, 3],
  67.96: [[0.65, 0.28, 0.08, 0.01, 0, 0, 0, 0, 0, 0], 12, 14],
  68.0: [[0.6, 0.26, 0.08, 0.01, 0, 0, 0, 0, 0, 0], 41, 34],
  68.04: [[0.79, 0.4, 0.2, 0.08, 0.02, 0, 0, 0, 0, 0], 54, 51],
  68.08: [[0.92, 0.6, 0.33, 0.18, 0.09, 0.02, 0, 0, 0, 0], 60, 60],
  68.12: [[0.94, 0.73, 0.46, 0.28, 0.17, 0.07, 0.01, 0, 0, 0], 78, 68],
  68.16: [[0.94, 0.83, 0.56, 0.37, 0.23, 0.11, 0.04, 0.01, 0, 0], 82, 77],
  68.2: [[0.97, 0.89, 0.66, 0.46, 0.3, 0.16, 0.07, 0.03, 0, 0], 86, 84],
  68.24: [[0.97, 0.93, 0.75, 0.54, 0.37, 0.21, 0.12, 0.04, 0.01, 0], 92, 89],
  68.28: [[0.97, 0.95, 0.81, 0.61, 0.44, 0.27, 0.15, 0.08, 0.03, 0], 101, 95],
  68.32: [[0.97, 0.97, 0.86, 0.68, 0.5, 0.32, 0.2, 0.11, 0.05, 0], 106, 100],
  68.36: [[0.96, 0.97, 0.9, 0.73, 0.56, 0.38, 0.24, 0.14, 0.07, 0.01], 110, 109],
  68.4: [[0.96, 0.96, 0.95, 0.78, 0.61, 0.42, 0.28, 0.17, 0.09, 0.03], 114, 111],
  68.44: [[0.97, 0.97, 0.96, 0.83, 0.67, 0.47, 0.32, 0.2, 0.12, 0.03], 119, 116],
  68.48: [[0.97, 0.97, 0.94, 0.77, 0.61, 0.41, 0.27, 0.16, 0.09, 0.02], 114, 110],
  68.52: [[0.96, 0.97, 0.9, 0.72, 0.54, 0.36, 0.22, 0.13, 0.06, 0.01], 110, 104],
  68.56: [[0.96, 0.97, 0.9, 0.72, 0.54, 0.36, 0.22, 0.13, 0.07, 0.01], 109, 104],
  68.6: [[0.96, 0.95, 0.84, 0.66, 0.48, 0.31, 0.19, 0.1, 0.04, 0.01], 105, 99],
  68.64: [[0.96, 0.95, 0.78, 0.59, 0.42, 0.27, 0.15, 0.07, 0.03, 0], 100, 94],
  68.68: [[0.96, 0.93, 0.73, 0.55, 0.38, 0.23, 0.12, 0.06, 0.01, 0], 94, 90],
  68.72: [[0.96, 0.9, 0.69, 0.49, 0.33, 0.19, 0.09, 0.03, 0.01, 0], 88, 86],
  68.76: [[0.95, 0.84, 0.62, 0.43, 0.28, 0.15, 0.07, 0.02, 0, 0], 84, 82],
  68.8: [[0.95, 0.79, 0.55, 0.37, 0.23, 0.11, 0.04, 0, 0, 0], 83, 78],
  68.84: [[0.94, 0.7, 0.47, 0.28, 0.16, 0.07, 0.01, 0, 0, 0], 76, 73],
  68.88: [[0.88, 0.59, 0.34, 0.19, 0.09, 0.02, 0, 0, 0, 0], 57, 59],
  68.92: [[0.77, 0.43, 0.21, 0.09, 0.03, 0, 0, 0, 0, 0], 51, 50],
  68.96: [[0.52, 0.18, 0.04, 0, 0, 0, 0, 0, 0, 0], 1, 18],
  69.0: [[0.06, 0, 0, 0, 0, 0, 0, 0, 0, 0], 1, 2],
};
const GLINT_R = [8, 16, 24, 32, 40, 50, 60, 70, 80, 95];
function drawGlint(ctx, tq) {
  const G = GLINT_T[+tq.toFixed(2)];
  if (!G) return;
  const [rad, Lu, Ll] = G, x = 1170, y = 157, R = GLINT_R[GLINT_R.length - 1];
  ctx.save(); ctx.globalCompositeOperation = "lighter";
  const g = ctx.createRadialGradient(x, y, 0, x, y, R);
  g.addColorStop(0, `rgba(255,255,255,${Math.min(1, rad[0] * 1.03)})`);
  GLINT_R.forEach((r, i) => g.addColorStop(r / R, `rgba(255,255,255,${rad[i]})`));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.fill();
  // a ray: full strength to ~half its reach, then fading out a little past the reach; tapering width
  const ray = (ang, L, w0, a0 = 1) => {
    if (L < 4) return;
    const dx = Math.cos(ang), dy = Math.sin(ang), E = L * 1.25;
    const gr = ctx.createLinearGradient(x, y, x + dx * E, y + dy * E);
    gr.addColorStop(0, `rgba(255,255,255,${a0})`); gr.addColorStop(0.5, `rgba(255,255,255,${a0})`); gr.addColorStop(0.8, `rgba(255,255,255,${0.5 * a0})`); gr.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gr; ctx.beginPath();
    ctx.moveTo(x - dy * w0, y + dx * w0); ctx.lineTo(x + dx * E - dy * 0.6, y + dy * E + dx * 0.6); ctx.lineTo(x + dx * E + dy * 0.6, y + dy * E - dx * 0.6); ctx.lineTo(x + dy * w0, y - dx * w0); ctx.closePath(); ctx.fill();
  };
  ray(-Math.PI / 2 - 0.06, Lu, 3.2); ray(Math.PI, Ll, 3); ray(0, Ll * 1.12, 3); ray(Math.PI / 2 + 0.05, Lu * 0.6, 2.4, 0.8);
  ray(-Math.PI * 0.75, Lu * 0.35, 1.4, 0.35); ray(Math.PI * 0.25, Lu * 0.22, 1.2, 0.3);
  ctx.restore();
}

// ---------------------------------------------------------------- the owl, with its motion effects
function drawOwlLayer(ctx, O, L) {
  const fx = O.fx;
  if (fx.blur) {
    // directional motion blur: offset copies along the motion (dir, default horizontal), softened, plus a fainter
    // sharp copy so the drawing still reads through the smear
    const [sc, g] = scratch(), n = fx.blur > 12 ? 15 : 9, dir = fx.dir ?? 0, cd = Math.cos(dir), sd = Math.sin(dir);
    for (let i = 0; i < n; i++) { const d = (i / (n - 1) - 0.5) * fx.blur * 2; g.save(); g.globalAlpha = 1.6 / n; g.drawImage(L.canvas, L.x + d * cd, L.y + d * sd, L.w, L.h); g.restore(); }
    ctx.save(); ctx.filter = `blur(${fx.blur > 12 ? 3 : 1.5}px)`; ctx.drawImage(sc, 0, 0); ctx.restore();
    ctx.save(); ctx.globalAlpha = fx.sharp ?? 0.5; ctx.drawImage(L.canvas, L.x, L.y, L.w, L.h); ctx.restore();
  } else ctx.drawImage(L.canvas, L.x, L.y, L.w, L.h);
}


// ---------------------------------------------------------------- traced haze layers (A frame; one per frame)
let HZC = { t: null, c: null };
export const HAZE_OPTS = { blur: 3 };
function drawHaze(ctx, tq, H) {
  if (HZC.t !== tq) {
    const d = decode(H), [x0, y0, x1, y1] = H.box;
    const c = traceCanvas(d, x0, y0, x1 - x0, y1 - y0, { clear: true, clip: (g) => ringsPath(g, d.mask), bg: H.add ? "#000" : undefined });
    HZC = { t: tq, c, x0, y0 };
  }
  // additive: the traced layer is the haze's measured lift, added over the room
  ctx.save(); if (H.add) ctx.globalCompositeOperation = "lighter"; if (HAZE_OPTS.blur) ctx.filter = `blur(${HAZE_OPTS.blur}px)`;
  ctx.drawImage(HZC.c, HZC.x0, HZC.y0); ctx.restore();
}

// ---------------------------------------------------------------- B1 tone: out = 0.88·A + 0.12·A²
function b1Tone(ctx) {
  const [sc, g] = scratch();
  g.drawImage(ctx.canvas, 0, 0);
  g.globalCompositeOperation = "multiply"; g.drawImage(ctx.canvas, 0, 0); g.globalCompositeOperation = "source-over";   // A²
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = "multiply"; ctx.fillStyle = "rgb(224,224,224)"; ctx.fillRect(0, 0, W, H);              // 0.88·A
  ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.12; ctx.drawImage(sc, 0, 0);
  ctx.restore();
}

// ---------------------------------------------------------------- the 69.40 flash
const LEAK = {"top_x": [21.3, 26.7, 38.0, 60.3, 69.1, 64.1, 54.3, 59.5, 72.9, 83.6, 98.2, 109.8, 72.8, 99.0, 101.3, 87.7, 70.9, 60.0, 58.2, 60.3, 63.2, 73.0, 90.7, 111.0, 116.7, 117.4, 120.1, 119.8, 86.8, 81.4, 109.0, 117.6, 115.5, 100.8, 77.6, 57.6, 44.9, 36.7, 27.4, 26.5, 21.1, 16.4, 13.0, 8.9, 11.2], "top_y": [62.0, 62.3, 62.9, 63.5, 66.2, 66.5, 69.3, 72.4, 75.4, 79.7, 82.8, 86.2, 88.1, 88.1, 77.9, 56.1, 24.8, 4.8, 0.5, -0.0], "left_y": [39.2, 43.5, 50.4, 52.7, 52.9, 51.6, 51.5, 52.1, 57.6, 55.7, 59.4, 57.0, 58.7, 56.6, 54.4, 48.6, 46.2, 46.9, 48.8, 45.7, 45.7], "left_x": [40.1, 40.2, 39.8, 40.2, 40.2, 41.6, 41.7, 42.8, 44.0, 45.5, 48.2, 51.0, 53.6, 57.0, 60.1, 63.3, 69.0, 73.3, 79.4, 82.8, 84.3, 79.5, 64.5, 42.8, 21.1, 7.3, 2.0, 0.4, 0.2], "right_y": [14.1, 18.2, 24.2, 22.0, 25.3, 32.8, 31.4, 33.4, 35.5, 39.9, 43.5, 47.3, 52.9, 59.6, 66.4, 67.8, 74.2, 78.1, 75.7, 77.0, 72.7], "right_x": [0.1, -0.0, 0.2, 1.3, 6.9, 20.7, 41.9, 67.7, 85.0, 94.1, 93.7, 86.8, 84.5, 76.4, 71.6, 68.1, 63.5, 61.2, 56.9, 54.0, 52.4, 49.7, 47.3, 44.2, 42.8, 42.1, 41.7, 40.6, 38.7, 38.8, 37.2, 36.3, 36.9, 37.4, 37.5, 36.7]};
let LEAKC = null;
function drawLeak(ctx) {
  if (!LEAKC) {
    const s = 2, w = Math.ceil(W / s), h = Math.ceil(H / s);
    LEAKC = document.createElement("canvas"); LEAKC.width = w; LEAKC.height = h;
    const g = LEAKC.getContext("2d"), im = g.createImageData(w, h), d = im.data;
    const lut = (arr, x0, dx, x) => { const f = (x - x0) / dx, i = Math.floor(f); if (i < 0) return arr[0]; if (i >= arr.length - 1) return arr[arr.length - 1]; return arr[i] + (arr[i + 1] - arr[i]) * (f - i); };
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const x = i * s + s / 2, y = j * s + s / 2;
      const top = lut(LEAK.top_x, 0, 50, x) * Math.max(0, lut(LEAK.top_y, 0, 8, y)) / 80;
      const left = lut(LEAK.left_x, 0, 6, x) * lut(LEAK.left_y, 120, 40, y) / 55 * (y > 100 ? 1 : 0);
      const right = lut(LEAK.right_x, 1990, 6, x + (y > 760 ? -Math.min(27, (y - 760) * 0.3) : 0)) * lut(LEAK.right_y, 120, 40, y) / 50 * (y > 100 ? 1 : 0);
      const v = Math.max(0, Math.min(255, Math.max(top, left, right))), k = (j * w + i) * 4;
      d[k] = d[k + 1] = d[k + 2] = v; d[k + 3] = 255;
    }
    g.putImageData(im, 0, 0);
  }
  ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.imageSmoothingEnabled = true; ctx.drawImage(LEAKC, 0, 0, W, H); ctx.restore();
}

// ---------------------------------------------------------------- draw
export const shot = {
  debug: {},
  draw(ctx, local, t) {
    build();
    // quantise to the source's frame grid; exact frame times map to themselves, a seek up to ~0.9 frame early (as the
    // snapshot tool does) still lands on the frame it was asked for
    const fr = Math.ceil(t * 25 - 0.05), tq = fr / 25;
    const cam = camAt(tq), B = !!cam;
    const at = (k) => Math.abs(tq - k) < 0.005;
    const b2room = tq >= 67.52 - 1e-6;
    const KEY = keyAt(tq);

    ctx.save();
    if (b2room) {
      ctx.drawImage(L("roomB2"), -M, -M);
      ctx.save(); ctx.transform(...B2); cardColour(ctx); ctx.restore();
    } else {
      if (B) ctx.setTransform(...cam);
      ctx.drawImage(L("roomA"), -M, -M);
      if (tq < 63.44 - 1e-6) {
        // the push: the resting card is replaced by what it uncovers, the card is drawn at its moving quad, and the
        // synth (in front of it) is redrawn over it
        ctx.drawImage(L("behind"), -M, -M);
        const q = cardQuad(tq), Hq = homography(CARD_Q1, q);
        warpQuad(ctx, L("card"), CB[0], CB[1], CARD_Q1, q);
        cardColour(ctx, (p) => Hq(p[0], p[1]));
        ctx.save(); ctx.beginPath(); polyPath(ctx, SYNTH_OUT); ctx.clip(); ctx.drawImage(L("roomA"), -M, -M); ctx.restore();
      } else cardColour(ctx);
      const gr = grimeAt(tq);
      if (gr > 0.001) { ctx.save(); ctx.globalAlpha = gr; ctx.drawImage(L("grimy"), -M, -M); ctx.restore(); }
      // the dust: the flap / back-off frames' single-frame traces carry the source's own dust cloud; the held stares
      // (65.76–67.12) get the frame's traced haze layer (its measured added light)
      const HZ = HAZE_LAYERS[tq.toFixed(2)];
      if (HZ && !shot.debug.noDust) drawHaze(ctx, tq, HZ);
      if (!B) {
        // once the beating stops the cloud is behind the blades: the scissors are redrawn over it
        if (tq >= 65.56 - 1e-6 && tq < 66.84) {
          ctx.drawImage(L("scClean"), SC_BOX[0], SC_BOX[1]);
          if (gr > 0.001) { ctx.save(); ctx.globalAlpha = gr; ctx.drawImage(L("scGrimy"), SC_BOX[0], SC_BOX[1]); ctx.restore(); }
        }
      }
      // from 67.32 the scissors have left their lean: the spot shows the (scissor-less) B2 room, mapped into this frame
      if (tq >= 67.32 - 1e-6) ctx.drawImage(L("patch"), SC_BOX[0] - 8, SC_BOX[1] - 8);
    }
    ctx.restore();

    // B frame from here on (the owl's B keys are measured in B's own frame)
    if (shot.debug.noOwl) {
      // (measurement renders only: the room without the owl and the props it carries)
    } else if (KEY && KEY[8] === "screen") {
      // a single-frame trace of the owl and whatever it holds (the fast action frames), in screen coordinates
      drawKey(ctx, KEY);
    } else {
      if (tq >= HOLD_T0 - 1e-6) {
        drawHoldOwl(ctx, tq);
      } else if (KEY) {
        // a traced key drawing of the owl, placed by its measured affine (setup-A frame; B1 through the camera)
        ctx.save(); if (cam) ctx.setTransform(...cam); drawKey(ctx, KEY); ctx.restore();
      } else {
        const O = owlAt(tq);
        const Lo = owlCached(O);
        ctx.save();
        if (b2room) ctx.filter = "brightness(0.93)";           // B2 exposure (the B1 frames get it below, whole frame)
        if (O.inA && cam) { ctx.setTransform(...cam); drawOwlLayer(ctx, O, Lo); }
        else drawOwlLayer(ctx, O, Lo);
        ctx.restore();
      }
    }
    if (b2room) drawGlint(ctx, tq);
    // setup B1 shows the A drawing with a mid-tone dip: measured per value band (B1 frames vs the A drawing, pre-grade,
    // static areas) B = A·(0.88 + 0.12·A) (−3 % at mid-grey, whites unchanged). The B2 room and the hold are traced
    // from B2 frames and carry their own tone.
    if (B && !b2room) b1Tone(ctx);

    // 69.40: the one-frame flash that carries the cut into s21 — light round a frame (the next shot's screen bezel):
    // a top band above y 121, a left band left of x 138, a right band right of x ≈ 2027, each brightest just outside
    // the sharp inner edge. Measured against 69.36 (pre-grade additive light, s20/trace: leak profiles).
    if (fr === Math.round(69.4 * 25)) drawLeak(ctx);
  },
  release() { C = null; LEAKC = null; HZC = { t: null, c: null }; releaseKeys(); },
};
