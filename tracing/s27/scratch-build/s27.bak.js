// s27 (117.52–129.30): out of the screen into the sunny morning room — DRAWN rebuild.
// Everything on screen is drawn by code (src/shots/s27/drawn/*). The source film was used only to MEASURE: positions,
// outlines, timing, camera/plane motion and colours (tools: snapshots/s27d-tools, measurements: snapshots/s27d-meas).
//   117.52–117.92  pull-back out of the laptop screen: the held view drawn zoomed 2.5 -> 1 about the screen, under a
//                  radial zoom blur and a white wash (zoom measured from the page's size on the screen)
//   117.92–119.72  hold on the laptop on the desk (colour site on the screen, speakers, mug, notebook, shelves, window)
//   119.72–124.8   the camera swings round the laptop (~83° of lid yaw) and finds the designer asleep on his arms
//   125.44–127.1   the owl climbs out of the page, flies out and lands on the keyboard (^^ blink, wink)
//   127.6–129.30   the camera starts round behind the laptop; the lid goes edge-on (~128.64) and shows its back
// The source camera move is not rigid (the room is redrawn as it turns), so each element is its own plane or sprite,
// moved by its own measurement: the back wall by one masked-KLT homography, the screen by a SIFT page homography, the
// laptop base by hinge + hand-keyed corners (+ an ECC deck track in the end orbit), the designer by a KLT mesh warp,
// props and the owl by hand-read keyframes (keys.js).
import { W, H } from "../config.js";
import { getGL, hmul, hinv, happly, hquad } from "./s27/drawn/gl.js";
import { SCREEN, WALL, BASE_END, SHELF_B } from "./s27/drawn/tracks.js";
import { hippiePageCanvas } from "../lib/hippie.js";
import { paintWall, WALL_BOX, paintDesk, DESK_BOX, paintShelfA, SHELF_A_BOX, paintShelfB, SHELF_B_BOX } from "./s27/drawn/room.js";
import * as LT from "./s27/drawn/laptop.js";
import { BASE_FL, BASE_FR, BASE_BACK_PAGE, NB_K, PENCIL_K, MUG_K, LID_END, NB_END, PENCIL_END } from "./s27/drawn/keys.js";
import { paintDesigner, DES_BOX } from "./s27/drawn/designer.js";
import { DES_GRID, DES_MESH } from "./s27/drawn/desmesh.js";
import { drawColorOwl } from "./s27/drawn/owl.js";
import { drawMug, drawNotebook, drawPencil } from "./s27/drawn/props.js";

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const I3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];
const HOLD_END = 119.72;
const SHELF_SWAP = 122.52;

// ---------------------------------------------------------------- sampling helpers
function rowH(r) { return [r[1], r[2], r[3], r[4], r[5], r[6], r[7], r[8], 1]; }
// per-frame homography rows (0.04 s apart), linear between rows
function trackAt(T, t, before = null) {
  const n = T.length;
  if (t <= T[0][0]) return before || rowH(T[0]);
  if (t >= T[n - 1][0]) return rowH(T[n - 1]);
  let i = Math.min(n - 2, Math.max(0, Math.floor((t - T[0][0]) / 0.04)));
  while (i > 0 && T[i][0] > t) i--;
  while (i < n - 2 && T[i + 1][0] < t) i++;
  const a = T[i], b = T[i + 1], u = clamp01((t - a[0]) / (b[0] - a[0]));
  const out = new Array(9); for (let k = 0; k < 8; k++) out[k] = a[k + 1] + (b[k + 1] - a[k + 1]) * u; out[8] = 1;
  return out;
}
// keyframe rows [t, v1, v2, ...]: cubic Hermite with Catmull-Rom tangents scaled for uneven key spacing
function keyAt(K, t) {
  const n = K.length;
  if (t <= K[0][0]) return K[0].slice(1);
  if (t >= K[n - 1][0]) return K[n - 1].slice(1);
  let i = 1; while (i < n - 1 && K[i][0] < t) i++;
  const p1 = K[i - 1], p2 = K[i], p0 = K[Math.max(0, i - 2)], p3 = K[Math.min(n - 1, i + 1)];
  const d1 = p2[0] - p1[0], d0 = (p1[0] - p0[0]) || d1, d2 = (p3[0] - p2[0]) || d1, u = (t - p1[0]) / d1;
  const h00 = 2 * u * u * u - 3 * u * u + 1, h10 = u * u * u - 2 * u * u + u, h01 = -2 * u * u * u + 3 * u * u, h11 = u * u * u - u * u;
  return p1.slice(1).map((v, k0) => {
    const k = k0 + 1;
    const m1 = (p0 === p1 ? (p2[k] - p1[k]) / d1 : ((p2[k] - p1[k]) / d1 + (p1[k] - p0[k]) / d0) * 0.5) * d1;
    const m2 = (p3 === p2 ? (p2[k] - p1[k]) / d1 : ((p3[k] - p2[k]) / d2 + (p2[k] - p1[k]) / d1) * 0.5) * d1;
    return h00 * v + h10 * m1 + h01 * p2[k] + h11 * m2;
  });
}
// linear keys (for keys that must not overshoot)
function linAt(K, t) {
  const n = K.length;
  if (t <= K[0][0]) return K[0].slice(1);
  if (t >= K[n - 1][0]) return K[n - 1].slice(1);
  let i = 1; while (i < n - 1 && K[i][0] < t) i++;
  const a = K[i - 1], b = K[i], u = (t - a[0]) / (b[0] - a[0]);
  return a.slice(1).map((v, k) => v + (b[k + 1] - v) * u);
}

// ---------------------------------------------------------------- measured planes
let SCREEN_HOLD = null;
function screenHold() {   // median of the page homography over the static hold 117.96–119.64
  if (!SCREEN_HOLD) {
    const rows = SCREEN.filter((r) => r[0] >= 117.96 && r[0] <= 119.64);
    SCREEN_HOLD = [1, 2, 3, 4, 5, 6, 7, 8].map((k) => { const v = rows.map((r) => r[k]).sort((a, b) => a - b); return v[v.length >> 1]; });
    SCREEN_HOLD.push(1);
  }
  return SCREEN_HOLD;
}
function screenH(t) { return t < HOLD_END ? screenHold() : trackAt(SCREEN, t); }
function wallH(t) { return t < HOLD_END ? I3 : trackAt(WALL, t, I3); }

// lid corners (frame px) for its page-space corners TL TR BR BL; after 128.36 from the hand-read end keys
const LIDC = [[LT.LID.x0, LT.LID.y0], [LT.LID.x1, LT.LID.y0], [LT.LID.x1, LT.LID.y1], [LT.LID.x0, LT.LID.y1]];
let LID_TAB = null;
function lidCorners(t) {
  if (!LID_TAB) {
    const S = trackAt(SCREEN, 128.36);
    LID_TAB = [[128.36].concat(...LIDC.map(([x, y]) => happly(S, x, y)))].concat(LID_END);
  }
  const v = linAt(LID_TAB, t);
  return [[v[0], v[1]], [v[2], v[3]], [v[4], v[5]], [v[6], v[7]]];
}
const areaOf = (q) => { let a = 0; for (let i = 0; i < q.length; i++) { const p = q[i], r = q[(i + 1) % q.length]; a += p[0] * r[1] - r[0] * p[1]; } return a / 2; };

// base top face: texture corners -> frame corners
const BTEX = [[0, 0], [LT.BASE_TW, 0], [LT.BASE_TW, LT.BASE_TD], [0, LT.BASE_TD]];
function baseCornersMid(t) {
  const S = screenH(t);
  return [happly(S, BASE_BACK_PAGE[0][0], BASE_BACK_PAGE[0][1]), happly(S, BASE_BACK_PAGE[1][0], BASE_BACK_PAGE[1][1]), keyAt(BASE_FR, t), keyAt(BASE_FL, t)];
}
let BASE_127 = null;
function baseCorners(t) {
  if (t < HOLD_END) return LT.BASE_CORNERS_REF;
  if (t <= 127.6) return baseCornersMid(t);
  if (!BASE_127) BASE_127 = baseCornersMid(127.6);
  const D = trackAt(BASE_END, t);
  return BASE_127.map(([x, y]) => happly(D, x, y));
}

// the desk plane (held-view ref px -> frame). The source camera is not rigid: while the laptop turns, the desk's front
// edge stays put at the bottom of the frame (y ≈ 862, measured on strips 119.8–121.6) and only then slides out of
// frame (121.6–122.4). So the desk is pinned to the base's two front corners (base track) and to its own front edge
// line (y = DESK_FRONT(t), x from the base-riding extrapolation).
const DESK_FRONT = [[119.72, 862], [121.6, 866], [122.4, 1010], [129.4, 1010]];
function deskH(t, Q) {
  if (t < HOLD_END) return I3;
  const Hb = hmul(hquad(BTEX, Q), C.baseRefInv);
  const yF = linAt(DESK_FRONT, t)[0], R = LT.BASE_CORNERS_REF;
  const L = happly(Hb, 0, 862), Rr = happly(Hb, 2206, 862);
  const src = [R[3], R[2], [2206, 862], [0, 862]];
  const dst = [Q[3], Q[2], [Math.max(Rr[0], Q[2][0] + 400), yF], [Math.min(L[0], Q[3][0] - 400), yF]];
  return hquad(src, dst);
}

// ---------------------------------------------------------------- the pull-back (117.52–117.92)
// zoom of the whole held view about WHIP_C (frame px): measured from the page's width on the screen relative to the
// hold (117.68 1.39, 117.72 1.215, 117.76 1.128, 117.80 1.063, 117.84 1.028, 117.88 1.009, 117.92 1.0) and, for the
// first frames, from the page's size (0.845 of the frame = 2.50 x the held 0.3385)
const WHIP_C = [1086, 447];
const WHIP_Z = [[117.52, 2.497], [117.56, 2.497], [117.6, 1.94], [117.64, 1.62], [117.68, 1.39], [117.72, 1.215], [117.76, 1.128], [117.8, 1.063], [117.84, 1.028], [117.88, 1.009], [117.92, 1.0]];
// radial blur amount, floor (blur at the centre), white wash (source mean luma 79, 79, 175, 210, 175, 160 ...)
const WHIP_FX = [[117.52, 0.17, 0.5, 0], [117.56, 0.17, 0.5, 0], [117.6, 0.24, 0.2, 0.62], [117.64, 0.3, 0.2, 0.86], [117.68, 0.18, 0.1, 0.42], [117.72, 0.11, 0.1, 0.16], [117.76, 0.06, 0.1, 0.05], [117.8, 0.035, 0.1, 0], [117.84, 0.018, 0.1, 0], [117.88, 0.006, 0, 0], [117.92, 0, 0, 0]];
function whipZ(t) {
  if (t >= 117.92) return null;
  const s = linAt(WHIP_Z, t)[0];
  return [s, 0, WHIP_C[0] * (1 - s), 0, s, WHIP_C[1] * (1 - s), 0, 0, 1];
}

// ---------------------------------------------------------------- cached textures and sprites
let C = null;
function solid(col) { const c = document.createElement("canvas"); c.width = c.height = 4; const g = c.getContext("2d"); g.fillStyle = col; g.fillRect(0, 0, 4, 4); return c; }
function sprite(w, h) { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; }
function build(G) {
  if (C) return C;
  C = {};
  C.wall = G.tex("s27d:wall", paintWall);
  C.shelfA = G.tex("s27d:shelfA", paintShelfA);
  C.shelfB = G.tex("s27d:shelfB", paintShelfB);
  const desk = paintDesk(); C.deskS = desk.s; C.desk = G.tex("s27d:desk", () => desk.canvas);
  C.lid = G.tex("s27d:lid", () => LT.paintLid(hippiePageCanvas()));
  C.lidBack = G.tex("s27d:lidBack", LT.paintLidBack);
  C.nearShade = G.tex("s27d:nearShade", () => {
    const c = document.createElement("canvas"); c.width = 4; c.height = 306; const g = c.getContext("2d");
    const gr = g.createLinearGradient(0, 0, 0, 306); gr.addColorStop(0, "rgba(120,70,45,0)"); gr.addColorStop(0.55, "rgba(120,70,45,0.1)"); gr.addColorStop(1, "rgba(120,70,45,0.3)");
    g.fillStyle = gr; g.fillRect(0, 0, 4, 306); return c;
  }, { mip: false });
  C.backstop = G.tex("s27d:backstop", () => solid("#dcc39f"), { mip: false });
  C.lidEdge = G.tex("s27d:lidEdge", () => solid("#3b3535"), { mip: false });
  C.baseTop = G.tex("s27d:baseTop", LT.paintBaseTop);
  C.baseFront = G.tex("s27d:baseFront", () => LT.paintBaseSide(false), { mip: false });
  C.baseRight = G.tex("s27d:baseRight", () => LT.paintBaseSide(true), { mip: false });
  C.des = G.tex("s27d:des", paintDesigner);
  C.pageOwl = G.tex("s27d:pageOwl", paintPageOwl);
  C.baseRefInv = hinv(hquad(BTEX, LT.BASE_CORNERS_REF));
  C.spMug = sprite(420, 420); C.spProps = sprite(1500, 420); C.spOwl = sprite(900, 800);
  return C;
}

// place a texture drawn in (box) coordinates at scale s through homography Hm (box coords -> frame)
function boxH(Hm, box, s) { return hmul(Hm, [1 / s, 0, box.x, 0, 1 / s, box.y, 0, 0, 1]); }
// draw a sprite canvas (drawn in frame px offset by ox, oy) through the global pre-transform Z
function blitSprite(G, key, cv, ox, oy, Z) {
  const tex = G.dyn(key, cv);
  G.quadH(tex, Z ? hmul(Z, [1, 0, ox, 0, 1, oy, 0, 0, 1]) : [1, 0, ox, 0, 1, oy, 0, 0, 1]);
}

// ---------------------------------------------------------------- laptop
function drawBase(G, Q, pre) {
  const Ht = pre(hquad(BTEX, Q));
  const P = (x, y) => happly(Ht, x, y);
  const fl = P(0, LT.BASE_TD), fr = P(LT.BASE_TW, LT.BASE_TD), br = P(LT.BASE_TW, 0), bl = P(0, 0);
  // side depth: 24 px at the held view's front edge, scaled with the local size
  const dd = Math.max(10, 24 * Math.max(Math.hypot(fr[0] - fl[0], fr[1] - fl[1]) / 1074, Math.hypot(br[0] - fr[0], br[1] - fr[1]) / 1000, Math.hypot(fl[0] - bl[0], fl[1] - bl[1]) / 1000));
  const strip = (tex, a, b) => G.quadH(tex, hquad([[0, 0], [tex.w, 0], [tex.w, tex.h], [0, tex.h]], [a, b, [b[0], b[1] + dd], [a[0], a[1] + dd]]));
  // hang side faces under the edges that face down in the image
  const cx = (fl[0] + fr[0] + br[0] + bl[0]) / 4, cy = (fl[1] + fr[1] + br[1] + bl[1]) / 4;
  const edges = [[bl, fl, C.baseFront], [fl, fr, C.baseFront], [fr, br, C.baseRight]];
  for (const [a, b, tex] of edges) {
    let nx = b[1] - a[1], ny = -(b[0] - a[0]);
    const mx = (a[0] + b[0]) / 2 - cx, my = (a[1] + b[1]) / 2 - cy;
    if (mx * nx + my * ny < 0) { nx = -nx; ny = -ny; }
    if (ny > 0.15 * Math.hypot(nx, ny)) strip(tex, a[0] < b[0] ? a : b, a[0] < b[0] ? b : a);
  }
  G.quadH(C.baseTop, Ht);
}
function drawLid(G, t, pre) {
  if (t <= 128.36) { G.quadH(C.lid, pre(boxH(screenH(t), LT.LID_BOX, LT.LID_BOX.s))); return; }
  const q = lidCorners(t), a = areaOf(q);
  if (Math.abs(a) < 9000) {
    // edge-on (128.5–128.72): a thin dark slab at least 12 px wide along the lid's midline
    const top = [(q[0][0] + q[1][0]) / 2, (q[0][1] + q[1][1]) / 2], bot = [(q[2][0] + q[3][0]) / 2, (q[2][1] + q[3][1]) / 2];
    const dx = bot[0] - top[0], dy = bot[1] - top[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L * 7, ny = dx / L * 7;
    const xy = [top[0] - nx, top[1] - ny, top[0] + nx, top[1] + ny, bot[0] + nx, bot[1] + ny, bot[0] - nx, bot[1] - ny];
    G.mesh(C.lidEdge, xy, [0, 0, 4, 0, 4, 4, 0, 4], [0, 1, 2, 0, 2, 3]);
    return;
  }
  G.quadH(a > 0 ? C.lid : C.lidBack, pre(boxH(hquad(LIDC, q), LT.LID_BOX, LT.LID_BOX.s)));
}

// ---------------------------------------------------------------- the designer (mesh warp of the 125.0 s drawing)
let DES_IDX = null, DES_UV = null;
function desNodes(t) {
  const M = DES_MESH, n = M.length;
  if (t <= M[0][0]) {   // before the track starts he is entering from the left: extrapolate the first frames' velocity
    const a = M[0], b = M[1], k = (t - a[0]) / (b[0] - a[0]);
    return a.map((v, i) => (i === 0 ? t : v + (b[i] - v) * k));
  }
  if (t >= M[n - 1][0]) return M[n - 1];
  let i = Math.min(n - 2, Math.max(0, Math.floor((t - M[0][0]) / 0.04)));
  while (i > 0 && M[i][0] > t) i--;
  while (i < n - 2 && M[i + 1][0] < t) i++;
  const a = M[i], b = M[i + 1], u = clamp01((t - a[0]) / (b[0] - a[0]));
  const out = new Array(a.length); out[0] = t; for (let k = 1; k < a.length; k++) out[k] = a[k] + (b[k] - a[k]) * u;
  return out;
}
function drawDesigner(G, t) {
  if (t < DES_MESH[0][0] - 0.3) return;
  const { X0, Y0, X1, Y1, GX, GY } = DES_GRID, B = DES_BOX;
  if (!DES_IDX) {
    DES_IDX = []; DES_UV = [];
    for (let j = 0; j < GY - 1; j++) for (let i = 0; i < GX - 1; i++) { const k = j * GX + i; DES_IDX.push(k, k + 1, k + GX, k + 1, k + GX + 1, k + GX); }
    for (let j = 0; j < GY; j++) for (let i = 0; i < GX; i++) DES_UV.push((X0 + i * (X1 - X0) / (GX - 1) - B.x) * B.s, (Y0 + j * (Y1 - Y0) / (GY - 1) - B.y) * B.s);
  }
  G.mesh(C.des, desNodes(t).slice(1), DES_UV, DES_IDX);
}

// ---------------------------------------------------------------- props (per-frame sprites from keys)
function drawMugSprite(G, t, Z) {
  const [x, y, w, hd] = keyAt(MUG_K, Math.max(MUG_K[0][0], t));
  const cv = C.spMug, g = cv.getContext("2d"), ox = Math.round(x - 210), oy = Math.round(y - 120);
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height); g.translate(-ox, -oy);
  drawMug(g, x, y, w, hd);
  blitSprite(G, "s27d:spMug", cv, ox, oy, Z);
}
function nbAt(t) {
  if (t <= 127.6) return keyAt(NB_K, Math.max(NB_K[0][0], t));
  const v = NB_K[NB_K.length - 1].slice(1), [dx, dy] = keyAt(NB_END, t);
  for (let k = 0; k < 8; k += 2) { v[k] += dx; v[k + 1] += dy; }
  return v;
}
function pencilAt(t) { return t <= 127.6 ? keyAt(PENCIL_K, Math.max(PENCIL_K[0][0], t)) : keyAt(PENCIL_END, t); }
function drawPropsSprite(G, t, Z) {
  const n = nbAt(t), p = pencilAt(t);
  const xs = [n[0], n[2], n[4], n[6], p[0], p[2]], ys = [n[1], n[3], n[5], n[7], p[1], p[3]];
  const ox = Math.round(Math.min(...xs) - 60), oy = Math.round(Math.min(...ys) - 40);
  const cv = C.spProps, g = cv.getContext("2d");
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height); g.translate(-ox, -oy);
  drawNotebook(g, [n[0], n[1]], [n[2], n[3]], [n[4], n[5]], [n[6], n[7]], n[8]);
  drawPencil(g, [p[0], p[1]], [p[2], p[3]]);
  blitSprite(G, "s27d:spProps", cv, ox, oy, Z);
}

// ---------------------------------------------------------------- the owl
// on the page (page px): perched on the top gold box by the nav, measured on the screen at 118.5 s
const PAGE_OWL = { x: 2018, y: 122, s: 0.6 };   // feet on the box lid at OWL_PERCH (2022, 236); eye spacing 45 page px
function paintPageOwl() {   // texture px (u,v) -> page (1880 + u/2, v/2)
  const c = document.createElement("canvas"); c.width = 600; c.height = 520;
  const g = c.getContext("2d");
  g.scale(2, 2); g.translate(-1880, 0);
  drawColorOwl(g, { x: PAGE_OWL.x, y: PAGE_OWL.y, s: PAGE_OWL.s, eyes: "open" });
  return c;
}
// flight keys (read off 1–1.2x gridded crops; eye midpoint x,y; s = scale; rot; wings 0 folded..1 spread;
// lift = wing raise; feet 0 tucked..1 down)
const OWL_K = [
  //  t       x     y     s     rot    wings lift feet   (eye midpoint and eye spacing / 75 read on 1–0.8x gridded crops)
  [125.44, 1738, 344, 0.27, 0.00, 0.0, 0.5, 0.6],
  [125.60, 1732, 340, 0.31, 0.00, 0.0, 0.5, 0.5],
  [125.76, 1728, 364, 0.33, 0.00, 0.0, 0.5, 0.4],
  [125.92, 1715, 367, 0.38, 0.00, 0.1, 0.5, 0.3],
  [126.08, 1710, 389, 0.41, -0.03, 0.4, 0.6, 0.3],
  [126.20, 1678, 384, 0.47, -0.05, 0.9, 0.7, 0.3],
  [126.28, 1655, 387, 0.55, -0.06, 1.0, 0.5, 0.5],
  [126.36, 1594, 385, 0.62, -0.08, 1.0, 0.4, 0.6],
  [126.44, 1577, 367, 0.66, -0.08, 1.0, 0.5, 0.8],
  [126.52, 1486, 360, 0.74, -0.06, 1.0, 0.9, 1.0],
  [126.60, 1461, 359, 0.76, -0.05, 1.0, 1.0, 1.0],
  [126.68, 1427, 376, 0.84, -0.04, 1.0, 0.7, 1.0],
  [126.76, 1400, 452, 0.92, -0.02, 1.0, 1.0, 1.0],
  [126.84, 1377, 497, 0.90, 0.00, 1.0, 0.8, 1.0],
  [126.92, 1369, 540, 0.95, 0.00, 0.8, 0.0, 1.0],
  [127.00, 1365, 540, 0.93, 0.00, 0.4, 0.0, 1.0],
  [127.08, 1370, 520, 0.93, 0.00, 0.0, 0.0, 1.0],
  [127.20, 1371, 510, 0.91, 0.00, 0.0, 0.0, 1.0],
  [127.60, 1372, 497, 0.90, 0.00, 0.0, 0.0, 1.0],
];
// after the landing: the owl rides the keyboard while the camera starts round (face template-matched on the source
// 127.2–128.4; eye positions read on gridded crops 128.2–129.28); it turns toward a three-quarter view
const OWL_END = [
  [127.6, 1372, 497, 0.90, 0], [128.0, 1365, 502, 0.88, 0.05], [128.2, 1375, 518, 0.88, 0.15], [128.4, 1368, 522, 0.88, 0.3],
  [128.6, 1370, 533, 0.88, 0.45], [128.8, 1355, 540, 0.88, 0.6], [129.0, 1330, 553, 0.9, 0.8], [129.12, 1312, 566, 0.9, 0.9],
  [129.32, 1287, 582, 0.9, 1.0],
];
function owlEyes(t) { return t >= 126.88 && t < 126.98 ? "happy" : t >= 126.98 && t < 127.04 ? "wink" : "open"; }
function drawOwlLive(G, t, Hs, Z) {
  if (t < OWL_K[0][0]) return;
  let [x, y, s, rot, wings, lift, feet] = linAt(OWL_K, t), turn = 0;
  if (t > 127.6) { [x, y, s, turn] = keyAt(OWL_END, t); }
  const cv = C.spOwl, g = cv.getContext("2d");
  const ox = Math.round(x - 450), oy = Math.round(y - 330);
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height);
  g.save();   // (the clip must not outlive this frame: the sprite canvas is reused)
  g.translate(-ox, -oy);
  if (t < 126.34) {   // still inside the screen: clipped to the display glass
    const D = LT.DISP, q = [[D.x0, D.y0], [D.x1, D.y0], [D.x1, D.y1], [D.x0, D.y1]].map(([u, v]) => happly(Hs, u, v));
    g.beginPath(); g.moveTo(q[0][0], q[0][1]); for (let k = 1; k < 4; k++) g.lineTo(q[k][0], q[k][1]); g.closePath(); g.clip();
  }
  // its soft shadow on the deck once it is over the keyboard (source: the deck darkens to ~0.7 under and left of it)
  const sh = clamp01((t - 126.44) / 0.5) * (t < 128.5 ? 1 : clamp01((129.1 - t) / 0.6));
  if (sh > 0) {
    const fy = y + 190 * s * (t < 126.9 ? 1 + 0.6 * clamp01((126.9 - t) / 0.46) : 1);
    g.save(); g.globalAlpha = sh; g.filter = `blur(${Math.round(10 * s)}px)`;
    g.fillStyle = "rgba(70,55,55,0.45)";
    g.beginPath(); g.ellipse(x - 70 * s, fy + 4 * s, 150 * s, 26 * s, -0.05, 0, 7); g.fill();
    g.restore();
  }
  drawColorOwl(g, { x, y, s, rot, eyes: owlEyes(t), wings, lift, feet, turn });
  g.restore();
  blitSprite(G, "s27d:spOwl", cv, ox, oy, Z);
}

// ---------------------------------------------------------------- the shot
export const shot = {
  draw(ctx, local, t) {
    const G = getGL(W, H);
    build(G);
    const Z = whipZ(t);
    if (Z) G.beginFBO(); else G.begin();
    // backstop: desk colour under everything (the desk and wall planes are separate tracks and can part at the edges)
    G.quadH(C.backstop, [W / 4, 0, 0, 0, H / 4, 0, 0, 0, 1]);
    const pre = (Hm) => (Z ? hmul(Z, Hm) : Hm);
    const Hs = screenH(t), Q = baseCorners(t);
    const Hd = deskH(t, Q);
    G.quadH(C.desk, pre(boxH(Hd, DESK_BOX, C.deskS)));
    G.quadH(C.wall, pre(boxH(wallH(t), WALL_BOX, 1)));
    // the left shelf: A (held view, rides the wall) until the source swaps it behind his beanie, then B on its own track
    if (t < SHELF_SWAP) G.quadH(C.shelfA, pre(boxH(wallH(t), SHELF_A_BOX, 2)));
    else G.quadH(C.shelfB, pre(boxH(trackAt(SHELF_B, t), SHELF_B_BOX, 2)));
    // once the camera has turned, the near desk along the bottom of the frame reads darker in the source (125.0:
    // #bb9472 at y 900–920 against #dcbd93 higher up); a screen-space shade ramps in over 121.8–122.8
    const ns = clamp01((t - 121.8) / 1.0);
    if (ns > 0) G.quadH(C.nearShade, [W / 4, 0, 0, 0, 1, 640, 0, 0, 1], { alpha: ns });
    // mug (behind the lid), base, notebook + pencil
    drawMugSprite(G, t, Z);
    drawBase(G, Q, pre);
    drawPropsSprite(G, t, Z);
    // lid with the page (and the page's own owl until it climbs out); from 128.72 the lid is in front of the owl
    const lidFirst = t < 128.72;
    if (lidFirst) {
      drawLid(G, t, pre);
      if (t < 125.44) G.quadH(C.pageOwl, pre(hmul(Hs, [0.5, 0, 1880, 0, 0.5, 0, 0, 0, 1])));
    }
    drawDesigner(G, t);
    drawOwlLive(G, t, Hs, Z);
    if (!lidFirst) drawLid(G, t, pre);
    if (Z) {
      const [amt, floor, wash] = linAt(WHIP_FX, t);
      G.zoomBlur(WHIP_C[0], WHIP_C[1], amt, [1, 0.99, 0.96, wash], 0, floor);
    }
    ctx.drawImage(G.end(), 0, 0);
    // the source frame carries a 3-px dark band on its bottom edge from 117.92 on (rows 943–945)
    if (t >= 117.9) { ctx.fillStyle = "#0d0605"; ctx.fillRect(0, 943, W, 3); }
  },
  release() {
    if (C) { const G = getGL(W, H); G.release("s27d:"); C = null; }
  },
};
