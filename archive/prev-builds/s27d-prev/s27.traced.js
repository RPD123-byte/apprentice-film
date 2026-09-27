// s27 (117.52–129.30): out of the screen into the sunny morning room.
//   117.52–117.92  the camera pulls back out of the laptop screen (measured zoom 2.50 -> 1.0) under a radial blur,
//                  through a white wash that peaks at 117.64
//   117.92–119.8   hold on the laptop on the light wood desk: the colour site on the screen (with its owl on the
//                  yellow box), speakers on a low cabinet, mug, notebook and pencil, shelves with plants, the window
//   119.8–124.6    the camera swings round to the left (the laptop turns ~83 degrees like a turntable) and reveals the
//                  designer asleep on his folded arms, beanie, headphones round his neck; he enters at 120.9
//   125.4–127.1    the owl climbs out of the page on the screen, flies out (wings up, feet down), lands on the keyboard
//                  at 126.9, a happy ^^ blink and a wink, then sits looking at us
//   127.6–129.30   the camera starts round behind the laptop (the lid swings edge-on at ~128.6 and shows its back)
//
// The source is an AI-style camera move that does not keep the room rigid, so every element is its own layer driven by
// its own measured track (s27/data.js, data2.js, data3.js; scripts in snapshots/s27-meas and snapshots/s27-k-tools):
//   lid        page->frame homography of the screen content, SIFT, every frame 118.0–128.44 (then lid-outline fits)
//   base       top-face corners chamfer-fitted to the edges, hinge tied to the lid (keyframes after 127.64); the owl's
//              measured shadow rides it
//   room       vector traces of the source's room (flat colour regions + ink, objects cut out) at 119.6, 125.0, 129.28
//              and 14 key times along the move (s27/room*.js, s27/keys), each placed by the wall homography relative to
//              its own frame and cross-faded to the next; the hand-painted views only fill the edges
//   designer   traced at 125.0 s (a registered median, grain-free) and at 7 key times of the end orbit (s27/dkeys);
//              moved by a 12x9 mesh tracked on the source by template alignment (121.6–129.28), by a similarity
//              fitted on his outline while he enters (120.7–121.6)
//   owl        traced from the source on every frame 125.40–129.00 (s27/owlTrace.js), clipped to the display while it
//              is inside the page; then the 129.00 trace moved by the face's measured drift
//   mug, notebook, pencil   chamfer outline fits / keyframes read off gridded crops
// All traces are vector data (polygons + measured colours) redrawn with canvas paths; layers are composited through
// perspective-correct quads and meshes in WebGL (s27/gl.js).
import { W, H } from "../config.js";
import { getGL, hquad, hmul, happly, hinv } from "./s27/gl.js";
import { SCREEN, BG, BG_END, DES_GRID } from "./s27/data.js";
import { DES_ENTRY, MUG_A, MUG_B, MUG_C, LID_END, NOTEBOOK_K, PENCIL_K, BASE_ALL, OWL_END } from "./s27/data2.js";
import { DES_MESH, OWL_SHADOW } from "./s27/data3.js";
import { KEYS } from "./s27/keys/index.js";
import { hippiePageCanvas, releaseHippie } from "../lib/hippie.js";
import { paintWallA, paintDeskA, A_BOX, paintRoomB, B_BOX, paintRoomC, C_BOX, paintTraceA, paintTraceB, paintTraceC, paintTrace, KEY_BOX } from "./s27/room.js";
import * as LT from "./s27/laptop.js";
import { paintDesigner, DES_BOX, DES_SC, paintDesignerKey, DKEY_BOX } from "./s27/designer.js";
import { DKEYS } from "./s27/dkeys/index.js";
import { drawOwl, owlTraceAt, paintOwlTrace } from "./s27/owl.js";
import { paintMug, mugH, paintNotebookTop, paintPageStrip, paintPencil, NB_TEX } from "./s27/props.js";
import { canvas } from "./s27/paint.js";

// ---------- table helpers ----------
function seg(T, t) { let i = 1; while (i < T.length - 1 && T[i][0] < t) i++; return i; }
function lerpRows(T, t) {
  if (t <= T[0][0]) return T[0].slice(1);
  if (t >= T[T.length - 1][0]) return T[T.length - 1].slice(1);
  const i = seg(T, t), a = T[i - 1], b = T[i], u = (t - a[0]) / (b[0] - a[0]);
  return a.slice(1).map((v, k) => v + (b[k + 1] - v) * u);
}
function crRows(T, t) {
  const n = T.length;
  if (t <= T[0][0]) return T[0].slice(1);
  if (t >= T[n - 1][0]) return T[n - 1].slice(1);
  const i = seg(T, t), p0 = T[Math.max(0, i - 2)], p1 = T[i - 1], p2 = T[i], p3 = T[Math.min(n - 1, i + 1)];
  const u = (t - p1[0]) / (p2[0] - p1[0]), u2 = u * u, u3 = u2 * u;
  return p1.slice(1).map((_, k0) => { const k = k0 + 1; return 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * u + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * u2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * u3); });
}
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const smooth = (v) => { v = clamp01(v); return v * v * (3 - 2 * v); };
function keys(K, t) {   // keyframe rows [t, ...values] with smooth (Catmull) interpolation
  return crRows(K, t);
}

// ---------- the whip (117.52–117.92) ----------
// One pull-back of the camera from the laptop screen: the room is drawn zoomed by Z about WHIP_C. Z is measured from
// the page's scale in the frame (camtrack on the page: s 0.845 at 117.52, 0.836 at 117.56, 0.656 at 117.60; then the
// screen homography tracked back through the blur: 1.36, 1.222, 1.123, 1.062, 1.028, 1.010, 1.0 at 117.68–117.92),
// divided by the page's settled scale on the screen (0.3383). The zoom's fixed point solves to (1078, 440).
const WHIP_C = [1078, 440];
const WHIP_S = [[117.52, 2.497], [117.56, 2.471], [117.6, 1.939], [117.64, 1.6], [117.68, 1.36], [117.72, 1.222], [117.76, 1.123], [117.8, 1.062], [117.84, 1.028], [117.88, 1.01], [117.92, 1.0]];
// radial blur amount (fraction of the radius smeared toward the centre, growing with distance) and white wash, per
// frame (source mean luma 79, 79, 175, 210, 175, 160 ... 160 at 117.52 ... 117.72)
// (117.52/117.56 re-tuned against the source: amount 0.17 with a floor of 0.5 so the centre is soft too, as in the source)
const WHIP_FX = [[117.52, 0.17, 0.0, 0, 0.5], [117.56, 0.17, 0.0, 0, 0.5], [117.6, 0.24, 0.62, 0, 0], [117.64, 0.3, 0.86, 0, 0], [117.68, 0.18, 0.42, 0, 0], [117.72, 0.11, 0.16, 0, 0], [117.76, 0.06, 0.05, 0, 0], [117.8, 0.035, 0, 0, 0], [117.84, 0.018, 0, 0, 0], [117.88, 0.006, 0, 0, 0], [117.92, 0, 0, 0, 0]];
function whipZoom(t) {
  if (t >= 117.92) return null;
  const s = lerpRows(WHIP_S, t)[0];
  return [s, 0, WHIP_C[0] * (1 - s), 0, s, WHIP_C[1] * (1 - s), 0, 0, 1];
}

// ---------- the page on the screen, with the page's own owl on its box ----------
// the owl as it sits on the page (measured at 117.0 s: eyes at (1995,147) and (2040,143), wings drooping out, feet on
// the box lid at OWL_PERCH)
const PAGE_OWL = { x: 2018, y: 146, s: 0.64, wings: 0.62, feet: 0, eyes: "open" };

// ---------- owl flight: face centre (x, y), scale, wings, feet; read off gridded crops every 0.04–0.16 s ----------
// 125.4–126.3 it is inside the screen (clipped to the display), from 126.32 it is out in the room.
const OWL_K = [
  [125.4, 1742, 354, 0.27, 0.62, 0], [125.72, 1714, 362, 0.37, 0.7, 0], [125.96, 1712, 386, 0.45, 0.8, 0],
  [126.12, 1702, 388, 0.48, 0.9, 0], [126.2, 1683, 390, 0.55, 1.0, 0], [126.28, 1648, 390, 0.66, 1.05, 0],
  [126.36, 1612, 380, 0.95, 1.15, 0], [126.44, 1538, 362, 1.05, 1.3, 0.3], [126.52, 1483, 378, 1.03, 1.45, 0.6],
  [126.6, 1465, 381, 1.0, 1.35, 0.9], [126.68, 1423, 408, 1.0, 1.1, 1], [126.76, 1402, 475, 1.05, 1.5, 1],
  [126.84, 1379, 496, 1.0, 1.6, 0.5], [126.92, 1383, 515, 1.0, 0.8, 0], [127.0, 1380, 522, 1.0, 0.35, 0],
  [127.08, 1370, 514, 1.02, 0.08, 0], [127.16, 1370, 509, 1.01, 0, 0], [127.24, 1371, 506, 1.0, 0, 0], [127.4, 1372, 505, 1.0, 0, 0],
];
function owlState(t) {
  if (t < 125.4) return null;
  if (t > 127.4) { const [x, y, s, sx, rot] = crRows(OWL_END, t); return { x, y, s, sx, rot, sy: 1, wings: 0, feet: 0, eyes: "open", inScreen: false }; }
  let [x, y, s, wings, feet] = keys(OWL_K, t);
  let sy = 1;
  if (t > 126.9 && t < 127.1) sy = 1 - 0.05 * Math.sin(Math.PI * (t - 126.9) / 0.2);     // squash on landing
  const eyes = t >= 126.88 && t < 126.98 ? "happy" : t >= 126.98 && t < 127.04 ? "wink" : "open";
  return { x, y, s, sy, wings, feet, eyes, inScreen: t < 126.32 };
}

// ---------- the designer: motion field (mesh warp of the 125.0 s painting) ----------
const GX = 12, GY = 9;
function desPositions(t) {
  const G = DES_GRID;
  const sim = (r) => { const [s, rot, tx, ty] = r; const c = Math.cos(rot) * s, sn = Math.sin(rot) * s; return G.map(([x, y]) => [c * x - sn * y + tx, sn * x + c * y + ty]); };
  const mesh = (tt) => { const M = crRows(DES_MESH, tt), P = []; for (let i = 0; i < M.length; i += 2) P.push([M[i], M[i + 1]]); return P; };
  if (t >= 121.6) return mesh(t);
  // entering (before 121.6 too little of him is in frame to track the mesh): the similarity chamfer-fitted on his outline,
  // blended into the tracked mesh over 121.4-121.6
  const r = crRows(DES_ENTRY, t); if (t < 121.28) r[1] = 0.025;
  const a = sim(r);
  if (t < 121.4) return a;
  const b = mesh(121.6), u = smooth((t - 121.4) / 0.2);
  return a.map((p, i) => [p[0] + (b[i][0] - p[0]) * u, p[1] + (b[i][1] - p[1]) * u]);
}
// mesh with one extrapolated ring of points on every side (so the texture beyond the tracked grid is carried along)
const EX = GX + 2, EY = GY + 2;
function extend(P) {
  const at = (i, j) => P[j * GX + i], out = [];
  for (let j = -1; j <= GY; j++) for (let i = -1; i <= GX; i++) {
    const ci = Math.max(0, Math.min(GX - 1, i)), cj = Math.max(0, Math.min(GY - 1, j));
    const ni = ci + (i < 0 ? 1 : i >= GX ? -1 : 0), nj = cj + (j < 0 ? 1 : j >= GY ? -1 : 0);
    const a = at(ci, cj), bi = at(ni, cj), bj = at(ci, nj), bij = at(ni, nj);
    // p = a + (a - b) per extrapolated direction
    let x = a[0], y = a[1];
    if (i < 0 || i >= GX) { x += a[0] - bi[0]; y += a[1] - bi[1]; }
    if (j < 0 || j >= GY) { x += a[0] - bj[0]; y += a[1] - bj[1]; }
    if ((i < 0 || i >= GX) && (j < 0 || j >= GY)) { /* corner: sum of both offsets already applied */ }
    out.push([x, y]);
  }
  return out;
}
let DES_IDX = null;
function meshIdx() {
  if (!DES_IDX) { DES_IDX = []; for (let j = 0; j < EY - 1; j++) for (let i = 0; i < EX - 1; i++) { const k = j * EX + i; DES_IDX.push(k, k + 1, k + EX, k + 1, k + EX + 1, k + EX); } }
  return DES_IDX;
}
function meshDraw(G, tex, Pdst, Psrc, box, sc, alpha) {
  const xy = [], uv = [];
  for (const p of extend(Pdst)) xy.push(p[0], p[1]);
  for (const p of extend(Psrc)) uv.push((p[0] - box.x0) * sc, (p[1] - box.y0) * sc);
  G.mesh(tex, xy, uv, meshIdx(), { alpha });
}
// designer views: the 125.0 painting (warped by the mesh from its own grid) until 127.6, then the traced key views of the
// end of the move, each warped from its own frame's mesh P(tk) to P(t), cross-faded between neighbours
const DVIEWS = [[125.0, null], [127.6, null]].concat(DKEYS.map((k) => [k[0], k]));
function drawDesigner(G, t) {
  if (t < 120.7) return;
  const P = desPositions(t);
  let i = 0; while (i < DVIEWS.length - 1 && DVIEWS[i + 1][0] <= t) i++;
  const a = DVIEWS[i], b = DVIEWS[Math.min(i + 1, DVIEWS.length - 1)];
  const view = (v, alpha) => {
    if (!v[1]) { meshDraw(G, G.tex("s27:designer", paintDesigner), P, DES_GRID, DES_BOX, DES_SC, alpha); return; }
    const key = `s27:dkey:${v[0].toFixed(2)}`;
    meshDraw(G, G.tex(key, () => paintDesignerKey(v[1][1], v[1][2], v[1][3])), P, desPositions(v[0]), DKEY_BOX, 1, alpha);
  };
  for (const v of DVIEWS) { const k = v[1] ? `s27:dkey:${v[0].toFixed(2)}` : null, r = k && G.texes.get(k); if (r && v !== a && v !== b) { G.gl.deleteTexture(r.tex); G.texes.delete(k); } }
  view(a, 1);
  if (b !== a && t > a[0] && (a[1] || b[1])) view(b, clamp01((t - a[0]) / (b[0] - a[0])));
}

// ---------- wall / desk ----------
function wallH(t) {
  if (t <= 126.6) return lerpRows(BG, Math.max(119.6, t));
  const H0 = lerpRows(BG, 126.6);
  if (t <= 127.6) return H0;
  const a = crRows(BG_END, t);
  return hmul([a[0], a[1], a[2], a[3], a[4], a[5], 0, 0, 1], H0);
}

// ---------- laptop ----------
function stripMesh(G, tex, top, bot) {
  const n = top.length, xy = [], uv = [], idx = [];
  for (let i = 0; i <= n; i++) { const a = top[i % n], b = bot[i % n]; xy.push(a[0], a[1], b[0], b[1]); uv.push(4, 1, 4, tex.h - 1); }
  for (let i = 0; i < n; i++) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
  G.mesh(tex, xy, uv, idx);
}
function baseHcm(t) {
  const c = crRows(BASE_ALL, Math.max(119.6, t));
  return hquad([[-LT.BW / 2, LT.BD], [LT.BW / 2, LT.BD], [LT.BW / 2, 0], [-LT.BW / 2, 0]], [[c[0], c[1]], [c[2], c[3]], [c[4], c[5]], [c[6], c[7]]]);
}
function drawBase(G, t, Z) {
  const side = G.tex("s27:side", LT.paintSideStrip, { mip: false });
  const Hcm = hmul(Z, baseHcm(t));
  const outline = LT.rrPoly(-LT.BW / 2, 0, LT.BW / 2, LT.BD, 1.3, 5);
  const k = 0.84 + (1.74 - 0.84) * clamp01((t - 119.8) / 3.6);   // side height (measured: 17 px at the front at 119.6, 24 px at 125.0)
  const top = outline.map(([x, z]) => happly(Hcm, x, z));
  const bot = outline.map(([x, z]) => { const p = happly(Hcm, x, z), q = happly(Hcm, x + 0.5, z), r = happly(Hcm, x, z + 0.5);
    const s = Math.sqrt(Math.abs((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]))) / 0.5; return [p[0], p[1] + k * s]; });
  stripMesh(G, side, top, bot);
  G.quadH(G.tex("s27:baseTop", LT.paintBaseTop), LT.baseTopH(Hcm));
  drawOwlShadow(G, t, Hcm);
  // the ports on the laptop's right side (measured at 125.0: SD slot z 9.7-7.5 cm, two ports 6.6-5.3 and 4.4-3.0 cm),
  // shown once that side turns toward the camera
  const sideAt = (z) => { const p = happly(Hcm, LT.BW / 2, z), q = happly(Hcm, LT.BW / 2 + 0.5, z), r = happly(Hcm, LT.BW / 2, z + 0.5);
    const s = Math.sqrt(Math.abs((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]))) / 0.5; return [p, [p[0], p[1] + k * s]]; };
  const [a0, a1] = sideAt(10.2), [b0, b1] = sideAt(2.5);
  if (b0[0] - a0[0] > 40) {
    const tex = G.tex("s27:ports", LT.paintPorts, { mip: false });
    G.quadH(tex, hquad([[0, 0], [tex.w, 0], [tex.w, tex.h], [0, tex.h]], [a0, b0, b1, a1]), { alpha: clamp01((b0[0] - a0[0] - 40) / 60) });
  }
}
// the owl's shadow on the deck (measured outline in base cm, so it rides the base through the orbit): a purple-grey veil
// that scales the silver by the measured ratio (~0.76, 0.68, 0.70 at its core), softened at quarter resolution
let shC = null;
function drawOwlShadow(G, t, Hcm) {
  if (t < 126.44) return;
  let i = 0; while (i < OWL_SHADOW.length - 1 && OWL_SHADOW[i + 1][0] <= t + 1e-6) i++;
  const p = OWL_SHADOW[i][1];
  if (!shC) shC = canvas(W / 4, H / 4);
  const g = shC.getContext("2d");
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, shC.width, shC.height);
  g.filter = "blur(0.7px)"; g.beginPath();
  for (let k = 0; k < p.length; k += 2) { const q = happly(Hcm, p[k] / 20, p[k + 1] / 20); k ? g.lineTo(q[0] / 4, q[1] / 4) : g.moveTo(q[0] / 4, q[1] / 4); }
  g.closePath(); g.fillStyle = "rgba(80,40,45,0.4)"; g.fill(); g.filter = "none";
  G.quadH(G.dyn("s27:owlShadow", shC), [4, 0, 0, 0, 4, 0, 0, 0, 1]);
}
// the lid: page homography until 128.44 (front showing); lid-outline corners after 128.8 (back showing); in between the
// corners are interpolated (the lid passes edge-on)
const LID_RECT = [[LT.LID.x0, LT.LID.y0], [LT.LID.x1, LT.LID.y0], [LT.LID.x1, LT.LID.y1], [LT.LID.x0, LT.LID.y1]];
function lidCorners(t) {
  if (t <= 128.44) { const Hs = crRows(SCREEN, Math.max(118, t)); return LID_RECT.map(([x, y]) => happly(Hs, x, y)); }
  if (t >= 128.8) { const c = crRows(LID_END, t); return [[c[0], c[1]], [c[2], c[3]], [c[4], c[5]], [c[6], c[7]]]; }
  const a = lidCorners(128.44), b = lidCorners(128.8), u = (t - 128.44) / 0.36;
  return a.map((p, i) => [p[0] + (b[i][0] - p[0]) * u, p[1] + (b[i][1] - p[1]) * u]);
}
function drawLid(G, t, Z, withOwl) {
  const side = G.tex("s27:side", LT.paintSideStrip, { mip: false });
  const C = lidCorners(t).map(([x, y]) => happly(Z, x, y));
  const Hl = hquad(LID_RECT, C);                       // lid (page px) -> frame
  const area = (C[1][0] - C[0][0]) * (C[3][1] - C[0][1]) - (C[1][1] - C[0][1]) * (C[3][0] - C[0][0]);
  const lo = LT.rrPoly(LT.LID.x0, LT.LID.y0, LT.LID.x1, LT.LID.y1, 60, 5);
  // rim thickness: a fixed ~9 px band pushed away from the viewer side (image-space normal offset of the outline)
  const top = lo.map(([x, y]) => happly(Hl, x, y));
  const cx = top.reduce((s, p) => s + p[0], 0) / top.length;
  const th = t < 119.8 ? 0 : 9;
  const bot = top.map(([x, y]) => [x + (x < cx ? -1 : 1) * th * 0.6, y + th * 0.2]);
  if (th) stripMesh(G, side, top, bot);
  if (area > 0 || (t > 128.5 && t < 128.63)) {     // the source still shows the screen side at 128.60 (a sliver)
    const tex = G.tex(`s27:lidFront:${withOwl}`, () => LT.paintLidFront(pageTexCanvas(withOwl)));
    const S = LT.LID_SC, o = 4 / S;
    G.quadH(tex, hmul(Hl, [1 / S, 0, LT.LID.x0 - o, 0, 1 / S, LT.LID.y0 - o, 0, 0, 1]));
  } else {
    const tex = G.tex("s27:lidBack", LT.paintLidBack);
    const S = LT.LID_SC, o = 4 / S;
    // the back seen from behind: mirror x in lid space
    const M = [-1 / S, 0, LT.LID.x1 + o, 0, 1 / S, LT.LID.y0 - o, 0, 0, 1];
    G.quadH(tex, hmul(Hl, M));
  }
  return Hl;
}
const PAGE_CANVAS = {};
function pageTexCanvas(withOwl) {
  if (!PAGE_CANVAS[withOwl]) {
    const c = canvas(2206, 946), g = c.getContext("2d");
    g.drawImage(hippiePageCanvas(), 0, 0);
    if (withOwl) drawOwl(g, { ...PAGE_OWL });
    PAGE_CANVAS[withOwl] = c;
  }
  return PAGE_CANVAS[withOwl];
}

// ---------- mug ----------
function mugState(t) {
  if (t <= 120.8) { const [cx, yt, w, h] = crRows(MUG_A, Math.max(119.6, t)); return { cx, yt, w, h: Math.max(147, h), flip: false }; }
  const a = MUG_A[MUG_A.length - 1];
  const A = (tt) => ({ cx: a[1] - 55 * (tt - 120.8), yt: a[2], w: a[3], h: 147 });
  if (t <= 121.4) return { ...A(t), flip: false };
  const b0 = MUG_B[0];
  if (t < b0[0]) {
    const p = A(121.4), u = (t - 121.4) / (b0[0] - 121.4);
    return { cx: p.cx + (b0[1] - p.cx) * u, yt: p.yt + (b0[2] - p.yt) * u, w: p.w + (b0[3] - p.w) * u, h: p.h + (b0[4] - p.h) * u, flip: u > 0.5 };
  }
  const bl = MUG_B[MUG_B.length - 1];
  if (t <= bl[0]) { const [cx, yt, w, h] = crRows(MUG_B, t); return { cx, yt, w, h, flip: true }; }
  const c0 = MUG_C[0], c0cx = c0[1] - 3;
  if (t < c0[0]) {
    const u = (t - bl[0]) / (c0[0] - bl[0]);
    return { cx: bl[1] + (c0cx - bl[1]) * u, yt: bl[2] + (c0[2] - bl[2]) * u, w: bl[3] + (129.5 - bl[3]) * u, h: bl[4] + (138.8 - bl[4]) * u, flip: u < 0.6 };
  }
  const [cx, yt, w, h] = crRows(MUG_C, t); return { cx, yt, w: 129.5, h: 138.8, flip: false };
}

// ---------- notebook ----------
function drawNotebook(G, t, Z) {
  const c = crRows(NOTEBOOK_K, Math.max(119.6, t));
  const Hn = hmul(Z, hquad([[0, 0], [NB_TEX.W, 0], [NB_TEX.W, NB_TEX.D], [0, NB_TEX.D]], [[c[0], c[1]], [c[2], c[3]], [c[4], c[5]], [c[6], c[7]]]));
  const strip = G.tex("s27:pages", paintPageStrip, { mip: false });
  const outline = [[0, 0], [NB_TEX.W, 0], [NB_TEX.W, NB_TEX.D], [0, NB_TEX.D]];
  const top = [];
  for (let i = 0; i < 4; i++) { const a = outline[i], b = outline[(i + 1) % 4]; for (let k = 0; k < 8; k++) { const u = k / 8; top.push(happly(Hn, a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u)); } }
  // page block: 22 px deep at 119.6, deeper as the camera drops toward the desk (measured ~30 px at 125)
  const dep = 20 + 10 * clamp01((t - 120) / 3);
  stripMesh(G, strip, top, top.map((p) => [p[0], p[1] + dep]));
  G.quadH(G.tex("s27:nb", () => paintNotebookTop(false)), hmul(Hn, [1 / NB_TEX.S, 0, 0, 0, 1 / NB_TEX.S, 0, 0, 0, 1]));
}
function drawPencil(G, t, Z) {
  const [ex, ey, tx, ty] = crRows(PENCIL_K, Math.max(119.6, t));
  const a = happly(Z, ex, ey), b = happly(Z, tx, ty);
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const tex = G.tex("s27:pencil", () => { const c = canvas(1024, 64), g = c.getContext("2d"); g.scale(1024 / 100, 64 / 6.25); paintPencil(g, [0.5, 3.1], [99.5, 3.1], 4.4); return c; });
  const w = 12 * Math.min(1, L / 330 + 0.35), ux = (b[0] - a[0]) / L, uy = (b[1] - a[1]) / L, nx = -uy * w / 2 * 6.25 / 4.4, ny = ux * w / 2 * 6.25 / 4.4;
  const q = [[a[0] + nx, a[1] + ny], [b[0] + nx, b[1] + ny], [b[0] - nx, b[1] - ny], [a[0] - nx, a[1] - ny]];
  G.quadH(tex, hquad([[0, 0], [1024, 0], [1024, 64], [0, 64]], q));
}

// ---------- compositing ----------
const BG125 = hinv(lerpRows(BG, 125.0));
const DBG = () => globalThis.__s27dbg || null;     // measuring hooks for the s27 tools (never set in the film)
// The traced views of the room along the move: [bracket time, frame time of the trace, texture key, painter, box].
// Between two neighbours the later one is laid first (it covers what the earlier one never saw), then the earlier one,
// then the later one again at the cross-fade weight. Each is placed by the wall track relative to its own frame.
const TRACES = (() => {
  const L = [[119.8, 119.6, "s27:traceA", paintTraceA, A_BOX]];
  for (const [tk, R, I] of KEYS) {
    if (tk > 124.7 && L[L.length - 1][1] < 125) { L.push([125.0, 125.0, "s27:traceB", paintTraceB, B_BOX], [127.6, 125.0, "s27:traceB", paintTraceB, B_BOX]); }
    L.push([tk, tk, `s27:key:${tk}`, () => paintTrace(R, I, KEY_BOX), KEY_BOX]);
  }
  L.push([129.28, 129.28, "s27:traceC", paintTraceC, C_BOX]);
  return L;
})();
function traceH(Z, Wt, e) { return hmul(Z, hmul(Wt, hmul(hinv(wallH(e[1])), [1, 0, e[4].x0, 0, 1, e[4].y0, 0, 0, 1]))); }
function drawTraces(G, t, Z, Wt) {
  let i = 0; while (i < TRACES.length - 1 && TRACES[i + 1][0] <= t) i++;
  const a = TRACES[i], b = TRACES[Math.min(i + 1, TRACES.length - 1)];
  // keep only the textures in use (each is a full-frame canvas)
  for (let k = 0; k < TRACES.length; k++) {
    const e = TRACES[k], r = G.texes.get(e[2]);
    if (r && e[2] !== a[2] && e[2] !== b[2]) { G.gl.deleteTexture(r.tex); G.texes.delete(e[2]); }
  }
  const ta = G.tex(a[2], a[3]);
  if (b === a || t <= a[0]) { G.quadH(ta, traceH(Z, Wt, a)); return; }
  const u = clamp01((t - a[0]) / (b[0] - a[0]));
  const tb = G.tex(b[2], b[3]);
  if (b[2] === a[2]) { G.quadH(ta, traceH(Z, Wt, a)); return; }
  G.quadH(tb, traceH(Z, Wt, b));
  G.quadH(ta, traceH(Z, Wt, a));
  if (u > 0) G.quadH(tb, traceH(Z, Wt, b), { alpha: u });
}
function roomLayers(G, t, Z) {
  if (DBG() && DBG().room === "mask") { G.quadH(G.tex("s27:dbgWhite", () => { const c = canvas(4, 4), g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, 4, 4); return c; }), [W / 4, 0, 0, 0, H / 4, 0, 0, 0, 1], { tint: [1, 0, 1, 1] }); return; }
  const Wt = wallH(t);
  // hand-painted underlay (shows only beyond the traced frames' edges): A frontal, B side, C behind
  const wA = smooth((123.5 - t) / 1.1), wC = smooth((t - 128.5) / 0.5);
  if (wA > 0) {
    const HA = hmul(Z, hmul(Wt, [1, 0, A_BOX.x0, 0, 1, A_BOX.y0, 0, 0, 1]));
    G.quadH(G.tex("s27:wallA", paintWallA), HA);
    G.quadH(G.tex("s27:deskA", paintDeskA), HA);
  }
  if (wA < 1 && wC < 1) G.quadH(G.tex("s27:roomB", paintRoomB), hmul(Z, hmul(Wt, hmul(BG125, [1, 0, B_BOX.x0, 0, 1, B_BOX.y0, 0, 0, 1]))), { alpha: wA > 0 ? 1 - wA : 1 });
  if (wC > 0) G.quadH(G.tex("s27:roomC", paintRoomC), hmul(Wt, hmul(hinv(wallH(129.28)), [1, 0, C_BOX.x0, 0, 1, C_BOX.y0, 0, 0, 1])), { alpha: wC });
  drawTraces(G, t, Z, Wt);
}
let owlC = null;
function owlTexture(G, t) {
  const o = owlState(t);
  if (!o) return null;
  if (!owlC) owlC = canvas(W, H);
  const g = owlC.getContext("2d");
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H);
  // 125.40-129.28: the owl traced from the source on that very frame (owlTrace.js); the hand-built owl is the fallback
  const tr = owlTraceAt(t);
  g.save();
  if (o.inScreen) {
    const Hs = crRows(SCREEN, t), q = [[LT.DISP.x0, LT.DISP.y0], [LT.DISP.x1, LT.DISP.y0], [LT.DISP.x1, LT.DISP.y1], [LT.DISP.x0, LT.DISP.y1]].map(([x, y]) => happly(Hs, x, y));
    g.beginPath(); g.moveTo(q[0][0], q[0][1]); for (const p of q.slice(1)) g.lineTo(p[0], p[1]); g.closePath(); g.clip();
  }
  if (tr) paintOwlTrace(g, tr); else drawOwl(g, o);
  g.restore();
  return G.dyn("s27:owlLayer", owlC);
}
function drawRoom(G, t, Z) {
  roomLayers(G, t, Z);
  const m = mugState(t);
  G.quadH(G.tex(`s27:mug:${m.flip}`, () => paintMug(m.flip)), hmul(Z, mugH(m.cx, m.yt, m.w, m.h, m.flip)));
  drawNotebook(G, t, Z);
  drawPencil(G, t, Z);
  drawBase(G, t, Z);
  const owl = t >= 125.4 ? owlTexture(G, t) : null;
  const behind = t >= 128.5;          // from here the camera is behind the lid and the lid hides part of the owl
  if (owl && behind) G.quadH(owl, [1, 0, 0, 0, 1, 0, 0, 0, 1]);
  drawLid(G, t, Z, t < 125.4);
  if (owl && !behind) G.quadH(owl, [1, 0, 0, 0, 1, 0, 0, 0, 1]);
}

export const shot = {
  draw(ctx, local, tRaw) {
    const t = Math.round(tRaw * 25) / 25;           // the source's frame grid
    const G = getGL(W, H);
    if (DBG() && DBG().owl === "only") { G.begin(); const o = owlTexture(G, t); if (o) G.quadH(o, [1, 0, 0, 0, 1, 0, 0, 0, 1], { tint: [1, 1, 1, 1] }); ctx.drawImage(G.end(), 0, 0); return; }
    const fx = t < 117.92 ? lerpRows(WHIP_FX, t) : [0, 0, 0, 0];
    const blur = fx[0], flash = fx[1];
    if (blur > 0) G.beginFBO(); else G.begin();
    const Z = whipZoom(t) || [1, 0, 0, 0, 1, 0, 0, 0, 1];
    drawRoom(G, Math.max(118.0, t), Z);
    const rot = DBG() && DBG().rot !== undefined ? DBG().rot : (fx[2] || 0);
    const zb = DBG() && DBG().zb ? DBG().zb : null;      // measuring override [cx, cy, amount scale]
    if (blur > 0) G.zoomBlur(zb ? zb[0] : 1085, zb ? zb[1] : 300, blur * (zb ? zb[2] : 1), [0.9, 0.91, 0.88, flash], rot, zb && zb[3] !== undefined ? zb[3] : (fx[3] || 0));
    if (t >= 118.0) drawDesigner(G, t);
    ctx.drawImage(G.end(), 0, 0);
  },
  release() { const G = getGL(W, H); G.release("s27:"); DES_IDX = null; owlC = null; shC = null; PAGE_CANVAS.true = PAGE_CANVAS.false = null; releaseHippie(); },
};
