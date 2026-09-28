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
import { paintWall, paintWallLow, paintWallCab, WALL_BOX, paintDesk, DESK_BOX, paintShelfA, SHELF_A_BOX, paintShelfB, SHELF_B_BOX, paintLateSill, LATE_SILL_BOX } from "./s27/drawn/room.js";
import * as LT from "./s27/drawn/laptop.js";
import { BASE_FL, BASE_FR, BASE_BACK_PAGE, NB_K, PENCIL_K, MUG_K, LID_END, NB_END, PENCIL_END, JAKCONT, CHAIR_K } from "./s27/drawn/keys.js";
import { paintDesigner, DES_BOX, paintDesigner2, DES2_BOX } from "./s27/drawn/designer.js";
import { DES2_GRID, DES2_MESH } from "./s27/drawn/des2mesh.js";
import { DES_GRID, DES_MESH } from "./s27/drawn/desmesh.js";
import { drawColorOwl } from "./s27/drawn/owl.js";
import { drawMug, drawMugSheet, drawNotebook, drawPencil } from "./s27/drawn/props.js";

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
// (fix pass 1) re-measured on luma profiles at x 300/800/1200: y 870 in the hold, then 872 (120.0), 875 (120.25), 877 (120.5),
// 879 (120.75), 881 (121.0), 893 (121.5), 900 (121.75), 904 (122.0), 907 (122.25), 909 (122.5), 912 (123.0)
const DESK_FRONT = [[119.72, 871], [120.0, 872], [120.25, 874], [120.5, 876], [120.75, 878], [121.0, 881], [121.5, 893], [121.75, 900], [122.0, 904], [122.25, 907], [122.5, 909], [123.0, 912], [123.6, 1010], [129.4, 1010]];
function deskH(t, Q) {
  if (t < HOLD_END) return I3;
  const Hb = hmul(hquad(BTEX, Q), C.baseRefInv);
  const yF = linAt(DESK_FRONT, t)[0], R = LT.BASE_CORNERS_REF;
  // x of the front edge's ends from the base-riding plane when it is well-behaved, clamped so the quad cannot twist
  const wAt = (x, y) => Hb[6] * x + Hb[7] * y + Hb[8];
  const L = happly(Hb, 0, 872), Rr = happly(Hb, 2206, 872);
  const xr = wAt(2206, 872) > 0.05 ? Math.min(Math.max(Rr[0], Q[2][0] + 400), Q[2][0] + 2400) : Q[2][0] + 1200;
  const xl = wAt(0, 872) > 0.05 ? Math.max(Math.min(L[0], Q[3][0] - 400), Q[3][0] - 2400) : Q[3][0] - 1200;
  const src = [R[3], R[2], [2206, 872], [0, 872]];
  const dst = [Q[3], Q[2], [xr, yF], [xl, yF]];
  const Hp = hquad(src, dst);
  // once the front edge has left the frame (122.4) the desk simply rides the base (the base swings ~90° in the end
  // orbit, which the pinned front edge cannot follow); blended over 122.4–123.0 through four anchor points
  const u = clamp01((t - 123.0) / 0.6);
  if (u <= 0) return Hp;
  if (u >= 1) return Hb;
  const A = [[700, 700], [1500, 700], [1500, 850], [700, 850]];
  return hquad(A, A.map(([x, y]) => { const a = happly(Hp, x, y), b = happly(Hb, x, y); return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]; }));
}

// ---------------------------------------------------------------- the pull-back (117.52–117.92)
// zoom of the whole held view about WHIP_C (frame px): measured from the page's width on the screen relative to the
// hold (117.68 1.39, 117.72 1.215, 117.76 1.128, 117.80 1.063, 117.84 1.028, 117.88 1.009, 117.92 1.0) and, for the
// first frames, from the page's size (0.845 of the frame = 2.50 x the held 0.3385)
const WHIP_C = [1086, 447];
const WHIP_Z = [[117.52, 2.497], [117.56, 2.497], [117.6, 1.94], [117.64, 1.62], [117.68, 1.39], [117.72, 1.215], [117.76, 1.128], [117.8, 1.063], [117.84, 1.028], [117.88, 1.009], [117.92, 1.0]];
// radial blur amount, floor (blur at the centre), white wash (source mean luma 79, 79, 175, 210, 175, 160 ...)
const WHIP_FX = [[117.52, 0.32, 0.6, 0], [117.56, 0.32, 0.6, 0], [117.6, 0.24, 0.2, 0.56], [117.64, 0.3, 0.2, 0.86], [117.68, 0.27, 0.3, 0.42], [117.72, 0.17, 0.3, 0.08], [117.76, 0.09, 0.3, 0], [117.8, 0.05, 0.3, 0], [117.84, 0.027, 0.3, 0], [117.88, 0.006, 0, 0], [117.92, 0, 0, 0]];
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
  C.wallLow = G.tex("s27d:wallLow", paintWallLow);
  C.wallCab = G.tex("s27d:wallCab", paintWallCab);
  C.spCab = sprite(560, 200);
  C.shelfA = G.tex("s27d:shelfA", paintShelfA);
  C.shelfB = G.tex("s27d:shelfB", paintShelfB);
  C.lateSill = G.tex("s27d:lateSill", paintLateSill);
  C.wall125inv = hinv(trackAt(WALL, 125.0));
  const desk = paintDesk(0); C.deskS = desk.s; C.desk = G.tex("s27d:desk", () => desk.canvas);
  C.deskSoft = G.tex("s27d:deskSoft", () => paintDesk(1).canvas);
  C.deskFar = G.tex("s27d:deskFar", () => paintDesk(true).canvas);   // no front edge: used once the edge is off-frame
  C.deskEnd = G.tex("s27d:deskEnd", () => paintDesk(3).canvas);      // the end orbit's far desk (fix pass 2)
  C.spFarEdge = sprite(860, 330);
  C.lid = G.tex("s27d:lid", () => LT.paintLid(hippiePageCanvas()));
  C.lidBack = G.tex("s27d:lidBack", LT.paintLidBack);
  C.nearShade = G.tex("s27d:nearShade", () => {
    const c = document.createElement("canvas"); c.width = 4; c.height = 306; const g = c.getContext("2d");
    const gr = g.createLinearGradient(0, 0, 0, 306); gr.addColorStop(0, "rgba(120,70,45,0)"); gr.addColorStop(0.55, "rgba(120,70,45,0.1)"); gr.addColorStop(1, "rgba(120,70,45,0.3)");
    g.fillStyle = gr; g.fillRect(0, 0, 4, 306); return c;
  }, { mip: false });
  C.backstop = G.tex("s27d:backstop", () => solid("#dcc39f"), { mip: false });
  C.baseShadow = G.tex("s27d:baseShadow", () => {
    const c = document.createElement("canvas"); c.width = 4; c.height = 32; const g = c.getContext("2d");
    const gr = g.createLinearGradient(0, 0, 0, 32); gr.addColorStop(0, "rgba(90,55,45,0.55)"); gr.addColorStop(1, "rgba(90,55,45,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 4, 32); return c;
  }, { mip: false });
  C.lidEdge = G.tex("s27d:lidEdge", () => solid("#cfc8bf"), { mip: false });
  C.lidInk = G.tex("s27d:lidInk", () => solid("#4a403c"), { mip: false });
  C.baseTop = G.tex("s27d:baseTop", LT.paintBaseTop);
  C.baseFront = G.tex("s27d:baseFront", () => LT.paintBaseSide(false), { mip: false });
  C.baseRight = G.tex("s27d:baseRight", () => LT.paintBaseSide(true), { mip: false });
  C.des = G.tex("s27d:des", paintDesigner);
  C.des2 = G.tex("s27d:des2", paintDesigner2);
  C.pageOwl = G.tex("s27d:pageOwl", paintPageOwl);
  C.owlShadow = G.tex("s27d:owlShadow", paintOwlShadow, { mip: false });
  C.baseRefInv = hinv(hquad(BTEX, LT.BASE_CORNERS_REF));
  C.spMug = sprite(460, 420); C.spProps = sprite(1500, 420); C.spOwl = sprite(900, 800);
  C.spLine = sprite(720, 946); C.spChair = sprite(760, 386);
  C.sunTL = G.tex("s27d:sunTL", paintSunTL, { mip: false });
  C.spDeskLight = sprite(760, 290);
  C.spDeskLeft = sprite(440, 200);
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
function drawBase(G, Q, pre, t0 = 0) {
  const Ht = pre(hquad(BTEX, Q));
  const P = (x, y) => happly(Ht, x, y);
  const fl = P(0, LT.BASE_TD), fr = P(LT.BASE_TW, LT.BASE_TD), br = P(LT.BASE_TW, 0), bl = P(0, 0);
  // side depth: 24 px at the held view's front edge, scaled with the local size
  const dd = Math.max(10, 24 * Math.max(Math.hypot(fr[0] - fl[0], fr[1] - fl[1]) / 1074, Math.hypot(br[0] - fr[0], br[1] - fr[1]) / 1000, Math.hypot(fl[0] - bl[0], fl[1] - bl[1]) / 1000));
  const strip = (tex, a, b, y0 = 0, y1 = dd) => G.quadH(tex, hquad([[0, 0], [tex.w, 0], [tex.w, tex.h], [0, tex.h]], [[a[0], a[1] + y0], [b[0], b[1] + y0], [b[0], b[1] + y1], [a[0], a[1] + y1]]));
  // hang side faces under the edges that face down in the image
  const cx = (fl[0] + fr[0] + br[0] + bl[0]) / 4, cy = (fl[1] + fr[1] + br[1] + bl[1]) / 4;
  const edges = [[bl, fl, C.baseFront], [fl, fr, C.baseFront], [fr, br, C.baseRight]];
  for (const [a, b, tex] of edges) {
    let nx = b[1] - a[1], ny = -(b[0] - a[0]);
    const mx = (a[0] + b[0]) / 2 - cx, my = (a[1] + b[1]) / 2 - cy;
    if (mx * nx + my * ny < 0) { nx = -nx; ny = -ny; }
    if (ny > 0.15 * Math.hypot(nx, ny)) {
      // (fix pass 2) the base's contact shadow on the desk under its front (source: a -30..-45 luma band 8–12 px deep)
      if (tex === C.baseFront && t0 < 128.3) strip(C.baseShadow, a[0] < b[0] ? a : b, a[0] < b[0] ? b : a, dd * 0.8, dd * 1.45);
      strip(tex, a[0] < b[0] ? a : b, a[0] < b[0] ? b : a);
    }
  }
  G.quadH(C.baseTop, Ht);
}
function drawLid(G, t, pre) {
  if (t <= 128.36) { G.quadH(C.lid, pre(boxH(screenH(t), LT.LID_BOX, LT.LID_BOX.s))); return; }
  const q = lidCorners(t), a = areaOf(q);
  if (Math.abs(a) < 9000) {
    // edge-on (128.5–128.72): the lid's aluminium edge, light silver (source ~#cfc8bf band, 20–30 px wide) with a thin
    // dark ink outline — never a dark line
    const top = [(q[0][0] + q[1][0]) / 2, (q[0][1] + q[1][1]) / 2], bot = [(q[2][0] + q[3][0]) / 2, (q[2][1] + q[3][1]) / 2];
    const dx = bot[0] - top[0], dy = bot[1] - top[1], L = Math.hypot(dx, dy) || 1;
    const band = (hw, tex) => {
      const nx = -dy / L * hw, ny = dx / L * hw, nb = 1.9;   // a little wider at the bottom (nearer the camera)
      const xy = [top[0] - nx, top[1] - ny, top[0] + nx, top[1] + ny, bot[0] + nx * nb, bot[1] + ny * nb, bot[0] - nx * nb, bot[1] - ny * nb];
      G.mesh(tex, xy, [0, 0, 4, 0, 4, 4, 0, 4], [0, 1, 2, 0, 2, 3]);
    };
    band(10, C.lidInk); band(8, C.lidEdge);
    // (fix pass 2) the dark hinge block at the lid's lower end (source 128.6: a dark strip ~18 x 40 px at the hinge)
    { const ux = dx / L, uy = dy / L, nx = -uy * 9, ny = ux * 9, a0 = [bot[0] - ux * 40, bot[1] - uy * 40];
      G.mesh(C.lidInk, [a0[0] - nx, a0[1] - ny, a0[0] + nx, a0[1] + ny, bot[0] + nx, bot[1] + ny, bot[0] - nx, bot[1] - ny], [0, 0, 4, 0, 4, 4, 0, 4], [0, 1, 2, 0, 2, 3]); }
    return;
  }
  // the back, lit warm silver as it comes round (source 162,136,111 at 128.8) and darkening to 102,90,82 by 129.28
  if (a < 0) { const k = clamp01((129.02 - t) / 0.3); G.quadH(C.lidBack, pre(boxH(hquad(LIDC, q), LT.LID_BOX, LT.LID_BOX.s)), k > 0 ? { tint: [0.66, 0.56, 0.46, 0.75 * k] } : {}); return; }
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
  // end orbit: the source's figure is narrower on the left than the warped 125.0 s drawing, so clip the drawing to the
  // right of the measured jacket contour (keys.js JAKCONT) and re-ink that contour
  // (fix pass 2) the source redraws him between 128.0 and 128.3 (cup onto the ear, collar, forearm across the desk):
  // drawing 2 (keyed on 129.0) fades up over the warped 125.0 drawing, which then fades out behind it
  const a2 = clamp01((t - DES2_IN) / 0.2), a1 = 1 - clamp01((t - DES2_IN - 0.15) / 0.2);
  const cont = t >= 127.9 ? jacketContour(t) : null;
  const clipped = cont ? G.clip(clipPoly(cont)) : false;
  // (fix pass 2) under-fill: jacket colour between the measured contour and the drawing, so the silhouette follows the
  // source's contour even where the warped drawing falls short of it (it is clipped where the drawing overshoots)
  if (cont) drawUnderFill(G, t, cont);
  if (a1 > 0) G.mesh(C.des, desNodes(t).slice(1), DES_UV, DES_IDX, { alpha: a1 });
  if (a2 > 0) {
    if (!DES2_IDX) {
      const { X0, Y0, X1, Y1, GX, GY } = DES2_GRID, B2 = DES2_BOX;
      DES2_IDX = []; DES2_UV = [];
      for (let j = 0; j < GY - 1; j++) for (let i = 0; i < GX - 1; i++) { const k = j * GX + i; DES2_IDX.push(k, k + 1, k + GX, k + 1, k + GX + 1, k + GX); }
      for (let j = 0; j < GY; j++) for (let i = 0; i < GX; i++) DES2_UV.push((X0 + i * (X1 - X0) / (GX - 1) - B2.x) * B2.s, (Y0 + j * (Y1 - Y0) / (GY - 1) - B2.y) * B2.s);
    }
    G.mesh(C.des2, meshAt(DES2_MESH, t).slice(1), DES2_UV, DES2_IDX, { alpha: a2 });
  }
  if (clipped) { G.noclip(); drawContourInk(G, t, cont); }
}
const DES2_IN = 128.0;
let DES2_IDX = null, DES2_UV = null;
// per-frame node rows (0.04 s apart), linear between rows, held at the ends
function meshAt(M, t) {
  const n = M.length;
  if (t <= M[0][0]) return M[0];
  if (t >= M[n - 1][0]) return M[n - 1];
  let i = Math.min(n - 2, Math.max(0, Math.floor((t - M[0][0]) / 0.04)));
  while (i > 0 && M[i][0] > t) i--;
  while (i < n - 2 && M[i + 1][0] < t) i++;
  const a = M[i], b = M[i + 1], u = clamp01((t - a[0]) / (b[0] - a[0]));
  const out = new Array(a.length); out[0] = t; for (let k = 1; k < a.length; k++) out[k] = a[k] + (b[k] - a[k]) * u;
  return out;
}
function jacketContour(t) {
  const v = linAt(JAKCONT, Math.min(t, JAKCONT[JAKCONT.length - 1][0]));
  const P = []; for (let k = 0; k < v.length; k += 2) P.push([v[k], v[k + 1]]);
  return P;
}
function clipPoly(P) {
  const xy = [P[0][0], 1100];
  for (const [x, y] of P) xy.push(x, y);
  const e = P[P.length - 1];
  xy.push(e[0] - 10, -120, 2500, -120, 2500, 1100);
  return xy;
}
function drawContourInk(G, t, P) {
  const a = clamp01((t - 128.2) / 0.3);
  if (a <= 0) return;
  const cv = C.spLine, g = cv.getContext("2d");
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height);
  const Q = P.filter(([x]) => x > -20);
  if (Q.length < 2) return;
  g.beginPath(); g.moveTo(Q[0][0], Q[0][1]);
  for (let i = 1; i < Q.length - 1; i++) { const m = [(Q[i][0] + Q[i + 1][0]) / 2, (Q[i][1] + Q[i + 1][1]) / 2]; g.quadraticCurveTo(Q[i][0], Q[i][1], m[0], m[1]); }
  g.lineTo(Q[Q.length - 1][0], Q[Q.length - 1][1]);
  g.lineWidth = 4; g.strokeStyle = `rgba(29,21,19,${0.9 * a})`; g.lineJoin = "round"; g.lineCap = "round"; g.stroke();
  blitSprite(G, "s27d:spLine", cv, 0, 0, null);
}
function drawUnderFill(G, t, P) {
  const a = clamp01((t - 128.0) / 0.3);
  if (a <= 0) return;
  const cv = C.spLine, g = cv.getContext("2d");
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height);
  const e = P[P.length - 1];
  g.beginPath(); g.moveTo(P[0][0], P[0][1]);
  for (const [x, y] of P.slice(1)) g.lineTo(x, y);
  g.lineTo(e[0] + 40, e[1] + 60); g.lineTo(e[0] + 40, 640); g.lineTo(300, 760); g.lineTo(P[0][0] + 60, P[0][1] - 40); g.closePath();
  const gr = g.createLinearGradient(0, 250, 0, 760); gr.addColorStop(0, "#9d9c84"); gr.addColorStop(0.45, "#7a7f6c"); gr.addColorStop(1, "#56604e");
  g.fillStyle = gr; g.globalAlpha = a; g.fill(); g.globalAlpha = 1;
  blitSprite(G, "s27d:spLine", cv, 0, 0, null);
}
// the chair back at the far left (frame space, keys.js CHAIR_K), behind the designer
function drawChair(G, t) {
  if (t < CHAIR_K[0][0]) return;
  const [x0, y0] = keyAt(CHAIR_K, t);
  const cv = C.spChair, g = cv.getContext("2d");
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height);
  g.translate(0, -560);
  const yb = 832;
  const P = [[x0, yb], [x0 - 4, y0 + 40], [x0 + 6, y0 + 10], [x0 + 40, y0], [x0 + 420, y0 + 6], [x0 + 420, yb - 10]];
  g.beginPath(); g.moveTo(P[0][0], P[0][1]); for (const q of P.slice(1)) g.lineTo(q[0], q[1]); g.closePath();
  const gr = g.createLinearGradient(0, y0, 0, yb); gr.addColorStop(0, "#7a5042"); gr.addColorStop(0.15, "#6c4639"); gr.addColorStop(1, "#5e3e34");   // (fix pass 2) less saturated (source 84,55,46)
  g.fillStyle = gr; g.fill();
  g.lineWidth = 3; g.strokeStyle = "#1d1513"; g.stroke();
  g.beginPath(); g.moveTo(x0 + 10, y0 + 12); g.quadraticCurveTo(x0 + 40, y0 + 6, x0 + 200, y0 + 10); g.lineWidth = 3; g.strokeStyle = "rgba(170,110,90,0.5)"; g.stroke();
  blitSprite(G, "s27d:spChair", cv, 0, 560, null);
}
// warm window light pouring in at the top left at the very end of the move (source 129.0–129.28: the top-left corner
// warms to ~179,148,120 with diagonal bright bands)
function drawSunShaft(G, t) {
  const a = clamp01((t - 128.95) / 0.3);
  if (a <= 0) return;
  G.quadH(C.sunTL, [1, 0, 0, 0, 1, 0, 0, 0, 1], { alpha: a });
}
function paintSunTL() {
  const c = document.createElement("canvas"); c.width = 700; c.height = 600; const g = c.getContext("2d");
  const rg = g.createRadialGradient(0, 0, 40, 0, 0, 620); rg.addColorStop(0, "rgba(214,150,96,0.55)"); rg.addColorStop(0.6, "rgba(214,160,110,0.25)"); rg.addColorStop(1, "rgba(214,160,110,0)");
  g.fillStyle = rg; g.fillRect(0, 0, 700, 600);
  g.filter = "blur(18px)";
  for (const [x, w] of [[-60, 70], [110, 50], [240, 36]]) {
    g.beginPath(); g.moveTo(x, 0); g.lineTo(x + w, 0); g.lineTo(x + w - 260, 520); g.lineTo(x - 260, 520); g.closePath();
    g.fillStyle = "rgba(255,238,205,0.32)"; g.fill();
  }
  return c;
}

// ---------------------------------------------------------------- window light on the desk (fix pass 2)
// The source's crisp diagonal wedge of sunlight on the desk left of the laptop does not stay fixed to the desk plane
// as the camera turns, so it is a frame-space layer keyed on luma profiles of the source (rows y 720–840):
// hold (118.6): bright from x 100–250 at y 840 to x 330–470 at y 720 (source 186–194 against the desk's ~150);
// 121.0: x 300–530 at y 840 to x 480–560 at y 720, with the far left in shade (source -15..-20 against the render).
// Rows: [t, light quad x0,y0 .. x3,y3 (frame px), light alpha, shade alpha]
const DESK_LIGHT = [
  [117.92, 70, 872, 240, 872, 505, 690, 365, 690, 0.42, 0],
  [119.72, 70, 872, 240, 872, 505, 690, 365, 690, 0.42, 0],
  [121.0, 280, 872, 545, 872, 575, 700, 490, 700, 0.42, 1],
  [121.5, 330, 890, 600, 890, 620, 710, 540, 710, 0.3, 0.6],
  [121.9, 380, 900, 640, 900, 660, 720, 590, 720, 0, 0],
];
function drawDeskLight(G, t, Z) {
  if (t < 117.92 || t > 121.9) return;
  const v = linAt(DESK_LIGHT, t), [la, sa] = [v[8], v[9]];
  if (la <= 0 && sa <= 0) return;
  const cv = C.spDeskLight, g = cv.getContext("2d"), ox = 0, oy = 660;
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height); g.translate(-ox, -oy);
  const q = [[v[0], v[1]], [v[2], v[3]], [v[4], v[5]], [v[6], v[7]]];
  const poly = (P) => { g.beginPath(); g.moveTo(P[0][0], P[0][1]); for (const p of P.slice(1)) g.lineTo(p[0], p[1]); g.closePath(); };
  if (sa > 0) { g.filter = "blur(10px)"; poly([[-40, 700], [q[3][0], 700], [q[0][0], 900], [-40, 900]]); g.fillStyle = `rgba(110,62,40,${0.2 * sa})`; g.fill(); }
  if (la > 0) { g.filter = "blur(4px)"; poly(q); g.fillStyle = `rgba(255,246,222,${la})`; g.fill(); }
  g.filter = "none";
  blitSprite(G, "s27d:spDeskLight", cv, ox, oy, Z);
}

// ---------------------------------------------------------------- the low cabinet behind the mug in the end orbit (fix pass 2)
// In the source its top stays horizontal while the wall plane swings, so it is a frame-space layer keyed on the
// source's cabinet edges (cab_seq.jpg). Rows: [t, x0, x1, top y, bottom y]
const CAB_K = [[128.72, 1700, 1850, 546, 640], [128.8, 1700, 1850, 550, 640], [129.0, 1724, 1994, 570, 650], [129.16, 1740, 2230, 575, 680], [129.28, 1704, 2230, 580, 700], [129.32, 1695, 2230, 582, 705]];
function drawCabinet(G, t) {
  if (t < 128.72) return;
  const a = clamp01((t - 128.72) / 0.15), [x0, x1, yt, yb] = linAt(CAB_K, t);
  const cv = C.spCab, g = cv.getContext("2d"), ox = 1660, oy = 520;
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height); g.translate(-ox, -oy); g.globalAlpha = a;
  const gr = g.createLinearGradient(x0, 0, x1, 0); gr.addColorStop(0, "#d6b690"); gr.addColorStop(0.55, "#cfae88"); gr.addColorStop(1, "#b8977a");
  g.fillStyle = gr; g.fillRect(x0, yt, x1 - x0, yb - yt);
  g.fillStyle = "#e3c9a6"; g.fillRect(x0, yt, x1 - x0, 7);
  g.lineWidth = 2; g.strokeStyle = "#5a4034"; g.beginPath(); g.moveTo(x0, yt); g.lineTo(x1, yt); g.moveTo(x0, yt + 7); g.lineTo(x1, yt + 7); g.moveTo(x0, yt); g.lineTo(x0, yb); g.stroke();
  // drawers: two fronts with a seam and small pulls
  g.lineWidth = 1.4; g.strokeStyle = "rgba(90,64,52,0.7)";
  const xm = x0 + (x1 - x0) * 0.48;
  g.beginPath(); g.moveTo(x0 + 8, yt + 16); g.lineTo(x1, yt + 16); g.moveTo(xm, yt + 16); g.lineTo(xm, yb); g.stroke();
  g.fillStyle = "rgba(90,64,52,0.8)"; for (const px of [(x0 + xm) / 2, (xm + x1) / 2]) g.fillRect(px - 10, yt + 26, 20, 3);
  g.globalAlpha = 1;
  blitSprite(G, "s27d:spCab", cv, ox, oy, null);
}

// ---------------------------------------------------------------- the far desk's edge in the end orbit (fix pass 2)
// The desk's right edge swings round as the camera orbits: first its side edge running down-right with the wall beyond
// it, then (from ~129.0) its front edge running down-left from the corner, with the front face and the dark drawer
// unit under it. Located on each frame from the thin ink line (black-hat peaks on rows y 660–940), frame px.
// Rows: [t, top x, top y, bottom x (at y 946)]
const FAR_EDGE = [
  [128.45, 1790, 686, 2320], [128.52, 1800, 690, 2283], [128.6, 1812, 690, 2250], [128.72, 1805, 660, 2150], [128.8, 1846, 660, 2085],
  [128.92, 1935, 700, 1998], [129.04, 2010, 680, 1922], [129.16, 2100, 690, 1866], [129.28, 2200, 705, 1835], [129.32, 2232, 710, 1815],
];
function drawFarEdge(G, t) {
  if (t < 128.45) return;
  const a = clamp01((t - 128.45) / 0.12);
  const [xt, yt, xb] = linAt(FAR_EDGE, t), yb = 946;
  const cv = C.spFarEdge, g = cv.getContext("2d"), ox = 1350, oy = 620;
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height); g.translate(-ox, -oy); g.globalAlpha = a;
  const front = t > 128.97;   // the front edge (desk below-left of it, face + drawer under it)
  // the pale far desk top (source 211–215, 202–205, 171–173), fading in from the left under the laptop
  const dg = g.createLinearGradient(1350, 0, 1560, 0); dg.addColorStop(0, "rgba(235,226,185,0)"); dg.addColorStop(1, "rgba(235,226,185,1)");
  g.beginPath(); g.moveTo(1350, yt - 10); g.lineTo(xt, yt - 10); g.lineTo(xt, yt); g.lineTo(xb, yb); g.lineTo(1350, yb); g.closePath(); g.fillStyle = dg; g.fill();
  if (!front) {
    // beyond the side edge: the wall under the window (source 160,144,138 at (2050–2200, 700–850))
    g.beginPath(); g.moveTo(xt, yt); g.lineTo(2220, yt - 10); g.lineTo(2220, yb); g.lineTo(xb, yb); g.closePath(); g.fillStyle = "#a8968f"; g.fill();
  } else {
    // under the front edge: the face (a band ~18 px) and the dark drawer unit; the wall right of the corner
    // (the region under the corner turns from the grey wall at 129.0 (153,138,132) to the brown desk end at 129.28 (~137,99,79))
    const k = clamp01((t - 129.04) / 0.22), mix = (p, q) => Math.round(p + (q - p) * k);
    g.beginPath(); g.moveTo(xt, yt); g.lineTo(2220, yt - 4); g.lineTo(2220, yb); g.lineTo(xb, yb); g.closePath(); g.fillStyle = `rgb(${mix(168, 138)},${mix(150, 100)},${mix(143, 80)})`; g.fill();
    g.beginPath(); g.moveTo(xt, yt); g.lineTo(xt + 22, yt + 12); g.lineTo(xb + 26, yb); g.lineTo(xb, yb); g.closePath(); g.fillStyle = "#b08a6e"; g.fill();
    g.lineWidth = 2; g.strokeStyle = "rgba(58,37,32,0.8)"; g.beginPath(); g.moveTo(xt + 22, yt + 12); g.lineTo(xb + 26, yb); g.stroke();
  }
  g.lineWidth = 3; g.strokeStyle = "#3a2520"; g.lineCap = "round"; g.beginPath(); g.moveTo(xt, yt); g.lineTo(xb, yb); g.stroke();
  g.globalAlpha = 1;
  blitSprite(G, "s27d:spFarEdge", cv, ox, oy, null);
}

// the desk's back-left corner during the turn (fix pass 2): in the source it stays near (290–350, 634–654) with its left
// edge dropping to the frame edge (wall showing above it), while the desk plane pinned to the base swings that corner
// off to the upper left. Rows: [t, corner x, corner y, edge y at x = 0] (read on 0.7x crops, deskleft.jpg)
const DESK_LEFT = [[119.72, 302, 654, 737], [120.4, 294, 648, 739], [121.0, 290, 637, 723], [121.4, 350, 634, 715], [121.9, 420, 630, 705]];
function drawDeskLeft(G, t, Z) {
  if (t < 119.9 || t > 121.9) return;
  const a = clamp01((t - 119.9) / 0.2) * (1 - clamp01((t - 121.6) / 0.3));
  const [cx, cy, y0] = linAt(DESK_LEFT, t);
  const cv = C.spDeskLeft, g = cv.getContext("2d"), ox = -10, oy = 590;
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height); g.translate(-ox, -oy); g.globalAlpha = a;
  const top = Math.min(cy, 640) - 14;
  g.beginPath(); g.moveTo(-10, top); g.lineTo(cx + 30, top); g.lineTo(cx + 30, cy); g.lineTo(cx, cy); g.lineTo(0, y0); g.lineTo(-10, y0 + 3); g.closePath();
  g.fillStyle = "#e6e2d4"; g.fill();
  g.lineWidth = 2.2; g.strokeStyle = "rgba(74,58,51,0.9)"; g.lineCap = "round";
  g.beginPath(); g.moveTo(-10, y0 + 3); g.lineTo(cx, cy); g.lineTo(cx + 30, cy); g.stroke();
  g.globalAlpha = 1;
  blitSprite(G, "s27d:spDeskLeft", cv, ox, oy, Z);
}

// ---------------------------------------------------------------- props (per-frame sprites from keys)
function drawMugSprite(G, t, Z) {
  const [x, y, w, hd] = keyAt(MUG_K, Math.max(MUG_K[0][0], t));
  const cv = C.spMug, g = cv.getContext("2d"), ox = Math.round(x - 210), oy = Math.round(y - 120);
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height); g.translate(-ox, -oy);
  if (t > 128.7) drawMugSheet(g, x, y, w, clamp01((t - 128.7) / 0.2));
  drawMug(g, x, y, w, hd);
  blitSprite(G, "s27d:spMug", cv, ox, oy, Z);
}
function nbAt(t) {
  if (t <= 127.6) return keyAt(NB_K, Math.max(NB_K[0][0], t));
  const v = NB_K[NB_K.length - 1].slice(1), [dx, dy] = keyAt(NB_END, t);
  for (let k = 0; k < 8; k += 2) { v[k] += dx; v[k + 1] += dy; }
  // (fix pass 2) the source's notebook foreshortens as the camera comes round: its right edge (B, C) ends ~90–110 px
  // further left at 128.8–129.0 (right edge x 1711 vs 1790 at 128.8)
  const r = linAt(NB_RIGHT, t)[0]; v[2] += r; v[4] += r;
  return v;
}
const NB_RIGHT = [[127.6, 0], [128.4, -20], [128.8, -90], [129.0, -110], [129.4, -110]];
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
  //  t       x     y     s      rot    wings lift feet
  // 125.44–126.28 read on 1.6x gridded crops (owl_flight.jpg); 126.32–127.60 from the detected eye pair on every source
  // frame (snapshots/s27-fix1-tools/owleyes.py: midpoint; s = 0.91 x iris spacing / 64, calibrated at 127.2 s)
  [125.44, 1738, 344, 0.27, 0.00, 0.0, 0.5, 0.6],
  [125.60, 1732, 340, 0.31, 0.00, 0.0, 0.5, 0.5],
  [125.76, 1730, 362, 0.33, 0.00, 0.0, 0.5, 0.4],
  [125.92, 1716, 372, 0.35, 0.00, 0.1, 0.5, 0.3],
  [126.00, 1709, 386, 0.36, -0.02, 0.2, 0.5, 0.3],
  [126.08, 1705, 387, 0.36, -0.03, 0.4, 0.6, 0.3],
  [126.16, 1702, 391, 0.37, -0.04, 0.7, 0.7, 0.3],
  [126.20, 1688, 391, 0.39, -0.05, 0.9, 0.7, 0.3],
  [126.28, 1675, 391, 0.41, -0.06, 1.0, 0.5, 0.5],
  [126.32, 1626, 382, 0.46, -0.07, 1.0, 0.45, 0.6],
  [126.36, 1594, 378, 0.53, -0.08, 1.0, 0.4, 0.6],
  [126.40, 1562, 375, 0.57, -0.08, 1.0, 0.45, 0.7],
  [126.44, 1534, 375, 0.63, -0.08, 1.0, 0.5, 0.8],
  [126.48, 1506, 374, 0.70, -0.07, 1.0, 0.7, 0.9],
  [126.52, 1482, 376, 0.73, -0.06, 1.0, 0.9, 1.0],
  [126.56, 1482, 376, 0.73, -0.06, 1.0, 0.9, 1.0],
  [126.60, 1460, 384, 0.78, -0.05, 1.0, 1.0, 1.0],
  [126.64, 1442, 397, 0.80, -0.045, 1.0, 0.85, 1.0],
  [126.68, 1428, 414, 0.84, -0.04, 1.0, 0.7, 1.0],
  [126.72, 1414, 433, 0.87, -0.03, 1.0, 0.85, 1.0],
  [126.76, 1402, 453, 0.90, -0.02, 1.0, 1.0, 1.0],
  [126.80, 1388, 477, 0.91, -0.01, 1.0, 0.9, 1.0],
  [126.84, 1382, 499, 0.925, 0.00, 1.0, 0.8, 1.0],
  [126.88, 1375, 520, 0.93, 0.00, 1.0, 0.3, 1.0],
  [126.92, 1369, 535, 0.93, 0.00, 1.0, 0.0, 1.0],
  [126.96, 1368, 537, 0.93, 0.00, 0.5, 0.0, 1.0],
  [127.00, 1367, 536, 0.925, 0.00, 0.0, 0.0, 1.0],
  [127.04, 1367, 532, 0.925, 0.00, 0.0, 0.0, 1.0],
  [127.08, 1367, 526, 0.925, 0.00, 0.0, 0.0, 1.0],
  [127.12, 1368, 520, 0.91, 0.00, 0.0, 0.0, 1.0],
  [127.16, 1369, 514, 0.91, 0.00, 0.0, 0.0, 1.0],
  [127.20, 1370, 509, 0.91, 0.00, 0.0, 0.0, 1.0],
  [127.28, 1371, 506, 0.91, 0.00, 0.0, 0.0, 1.0],
  [127.36, 1372, 504, 0.91, 0.00, 0.0, 0.0, 1.0],
  [127.60, 1372, 504, 0.91, 0.00, 0.0, 0.0, 1.0],
];
// after the landing: the owl rides the keyboard while the camera starts round and turns toward a three-quarter view.
// 127.6–128.4 from the detected eye pair; 128.4–129.32 read on 2.2x gridded crops (owl_face_end.jpg: both irises, the
// beak tip, the near cup; x = head centre from the head's left edge; turn fitted to the feature positions)
const OWL_END = [
  [127.6, 1372, 504, 0.91, 0], [127.76, 1373, 506, 0.91, 0], [128.0, 1375, 511, 0.91, 0], [128.2, 1381, 517, 0.94, 0.14],
  // (fix pass 2) 128.72–129.0 re-read on the new rig: head spans x 1308–1493, top 420, feet 736 at 128.8 (a rounder owl, not
  // a smaller one)
  [128.4, 1390, 525, 0.969, 0.36], [128.6, 1395, 529, 0.978, 0.5], [128.72, 1405, 538, 1.0, 0.62], [128.8, 1408, 546, 1.0, 0.76],
  [128.92, 1400, 552, 1.02, 0.88], [129.0, 1390, 556, 1.03, 0.95], [129.04, 1376, 554, 1.035, 0.96], [129.2, 1353, 569, 1.037, 1.0],
  [129.28, 1331, 573, 1.037, 1.0], [129.32, 1320, 575, 1.037, 1.0],
];
function owlEyes(t) { return t >= 126.86 && t < 126.98 ? "happy" : t >= 126.98 && t < 127.02 ? "wink" : "open"; }
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
  drawColorOwl(g, { x, y, s, rot, eyes: owlEyes(t), wings, lift, feet, turn });
  g.restore();
  blitSprite(G, "s27d:spOwl", cv, ox, oy, Z);
}

// the owl's cast shadow on the deck: a soft purple-grey blob left of it on the trackpad side, which appears as it flies
// out over the keyboard (source: the deck at (1150–1230, 705–730) drops from 208,195,176 at 126.4 to 159,124,116 at
// 126.6 and stays so while it perches; blob measured over (1100–1325, 697–756) at 126.6 and (1120–1290, 693–743) at 127.0).
// Drawn in the 125.0 s frame and carried by the base in the end orbit.
const OSH_BOX = { x: 1040, y: 640, w: 360, h: 170 };
function paintOwlShadow() {
  const c = document.createElement("canvas"); c.width = OSH_BOX.w; c.height = OSH_BOX.h;
  const g = c.getContext("2d"); g.translate(-OSH_BOX.x, -OSH_BOX.y);
  // (fix pass 2) one even, neutral lavender-grey owl-shaped patch (source darkest 68,46,40, a* ~9; no dark core)
  g.filter = "blur(12px)"; g.fillStyle = "rgba(72,58,72,0.5)";
  g.beginPath(); g.ellipse(1230, 726, 118, 30, -0.05, 0, 7); g.fill();
  return c;
}
function drawOwlShadow(G, t, Q, pre) {
  const a = clamp01((t - 126.42) / 0.18) * (t < 128.5 ? 1 : clamp01((129.1 - t) / 0.6));
  if (a <= 0) return;
  let Hm = [1, 0, OSH_BOX.x, 0, 1, OSH_BOX.y, 0, 0, 1];
  if (t > 127.6) { if (!BASE_127) BASE_127 = baseCornersMid(127.6); Hm = hmul(hquad(BASE_127, Q), Hm); }
  G.quadH(C.owlShadow, pre(Hm), { alpha: a });
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
    // desk: the held view's crisp front edge fades to a soft shade as the camera turns (source edge contrast -74 at
    // 120.0, -45 at 120.75, -26 at 121.0, ~-15 after); the far desk once the edge has left the frame
    const dH = pre(boxH(Hd, DESK_BOX, C.deskS)), dk = clamp01((t - 120.1) / 1.0);
    if (t >= 123.3) { const de = clamp01((t - 128.2) / 0.3); if (de < 1) G.quadH(C.deskFar, dH); if (de > 0) G.quadH(C.deskEnd, dH, { alpha: de }); }
    else { if (dk > 0) G.quadH(C.deskSoft, dH); if (dk < 1) G.quadH(C.desk, dH, { alpha: 1 - dk }); }
    G.quadH(C.wall, pre(boxH(wallH(t), WALL_BOX, 1)));
    // (fix pass 2) the boxes and books right of the laptop are nearer than the wall: in the end orbit they drift right
    // of the wall plane (+60, +20 px by 129.28, measured against the source's box and book edges)
    {
      const k = clamp01((t - 128.6) / 0.68), e = k * k * (3 - 2 * k), Tl = [1, 0, 60 * e, 0, 1, 20 * e, 0, 0, 1];
      G.quadH(C.wallLow, pre(hmul(Tl, boxH(wallH(t), WALL_BOX, 1))));
      const ca = 1 - clamp01((t - 128.7) / 0.15);
      if (ca > 0) G.quadH(C.wallCab, pre(hmul(Tl, boxH(wallH(t), WALL_BOX, 1))), { alpha: ca });
      drawCabinet(G, t);
    }
    // the late sill right of the laptop (125.0 s frame coords, carried by the wall), fading in as the camera turns
    const ls = clamp01((t - 121.0) / 1.4) * (1 - clamp01((t - 128.2) / 0.3));   // (fix pass 2) gone before it magnifies
    if (ls > 0) G.quadH(C.lateSill, pre(boxH(hmul(wallH(t), C.wall125inv), LATE_SILL_BOX, 1)), { alpha: ls });
    // the left shelf: A (held view, rides the wall) until the source swaps it behind his beanie, then B on its own track
    if (t < SHELF_SWAP) G.quadH(C.shelfA, pre(boxH(wallH(t), SHELF_A_BOX, 2)));
    else G.quadH(C.shelfB, pre(boxH(trackAt(SHELF_B, t), SHELF_B_BOX, 2)));
    // once the camera has turned, the near desk along the bottom of the frame reads darker in the source (125.0:
    // #bb9472 at y 900–920 against #dcbd93 higher up); a screen-space shade ramps in over 121.8–122.8
    const ns = clamp01((t - 121.8) / 1.0);
    if (ns > 0) G.quadH(C.nearShade, [W / 4, 0, 0, 0, 1, 640, 0, 0, 1], { alpha: ns });
    drawDeskLight(G, t, Z);
    drawDeskLeft(G, t, Z);
    drawFarEdge(G, t);
    // mug (behind the lid), base, notebook + pencil
    drawMugSprite(G, t, Z);
    drawBase(G, Q, pre, t);
    drawOwlShadow(G, t, Q, pre);
    drawPropsSprite(G, t, Z);
    // lid with the page (and the page's own owl until it climbs out); from 128.72 the lid is in front of the owl
    const lidFirst = t < 128.72;
    if (lidFirst) {
      drawLid(G, t, pre);
      if (t < 125.44) G.quadH(C.pageOwl, pre(hmul(Hs, [0.5, 0, 1880, 0, 0.5, 0, 0, 0, 1])));
    }
    drawChair(G, t);
    // from 128.9 the designer's right sleeve comes in front of the owl (source 129.28: it hides the owl's lower left)
    if (t < 128.9) { drawDesigner(G, t); drawOwlLive(G, t, Hs, Z); } else { drawOwlLive(G, t, Hs, Z); drawDesigner(G, t); }
    if (!lidFirst) drawLid(G, t, pre);
    drawSunShaft(G, t);
    if (Z) {
      const [amt, floor, wash] = linAt(WHIP_FX, t);
      G.zoomBlur(WHIP_C[0], WHIP_C[1], amt, [0.98, 0.975, 0.965, wash], 0, floor);
    }
    ctx.drawImage(G.end(), 0, 0);
    // the source frame carries a 3-px dark band on its bottom edge from 117.92 on (rows 943–945)
    if (t >= 117.9) { ctx.fillStyle = "#0d0605"; ctx.fillRect(0, 943, W, 3); }
  },
  // (fix pass 2) grain back to 5/255: 8/255 amplified the grade's integer-hash row pattern into visible scanlines
  // (row-mean std 4.4 vs the source's 1.3 on a flat wall patch)
  grade() { return { grain: 5.0 / 255.0 }; },
  release() {
    if (C) { const G = getGL(W, H); G.release("s27d:"); C = null; }
  },
};
