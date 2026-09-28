// s28 (129.30–136.00): from behind the laptop, the designer asleep at his desk in the sunlit morning room.
//
// Beats (measured on the source, see fidelity/s28.md):
//   129.30–131.36  the camera orbits ~42° round the sleeping designer, easing out (per-frame camera solved from 3047
//                  KLT tracks: orbit about a vertical axis through a pivot just behind him, plus a small pan/tilt);
//                  the laptop lid sweeps from the right of his face to the left; the owl peeks out at 129.3.
//                  The source repeats a frame at 129.56 and 130.56 — so does this shot.
//   131.36–136.00  locked. He breathes: head/beanie rise ~2 px then settle ~5 px lower (131.5–132.5), rise back
//                  134.4–135.4. Half-open, contented eyes close 133.00–133.44 and reopen 134.92–135.10.
//   135.78–136.00  the end card starts its dissolve (s40's measured linear alpha), drawn here via overlayEndCard.
//
// Rendering: the room is the six key paintings re-projected through per-key depth grids (fitted planes + reconstructed points): six measured key paintings of the
// room (129.32, 129.72, 130.12, 130.52, 130.92, 131.6) through a projective-texture shader; the designer is a mesh over his measured
// depth surface, textured by the two nearest of eleven key drawings of him; the lid is its measured quad per frame.
// All key drawings are vector traces of measured outlines and colours (src/shots/s28/keys/*.js), painted on first use.
import { W, H } from "../config.js";
import { canvas } from "./s28/draw.js";
import { camAt, camFrom } from "./s28/cam.js";
import { createGL } from "./s28/gl.js";
import { drawTrace } from "./s28/trace.js";
import { LIDQ, BREATH } from "./s28/data.js";
import { DEPTH } from "./s28/depth.js";
import { overlayEndCard } from "./s40/card.js";
import { FIG, ROOM, NLOCK } from "./s28/keys/index.js";

const LOCK = 131.36;                                  // camera locked from here
const frameT = (t) => Math.round(t * 25) / 25;        // the source's frame grid
const keyName = (t) => String(Math.round(t * 100));
// ---------------------------------------------------------------- breathing (per frame, from 131.36)
// control points in final-view px: head, beanie, shoulder, hand, forearm; sigma of each influence
const CPS = [[1200, 540, 140], [1390, 240, 150], [720, 380, 220], [1300, 665, 90], [1000, 790, 160]];
function breath(t) {
  if (t < LOCK) return CPS.map(() => [0, 0]);
  const k = Math.max(0, Math.min(BREATH.length - 1, Math.round((t - BREATH[0][0]) * 25)));
  const r = BREATH[k];
  const hand = [r[7], r[8]];
  return [[r[1], r[2]], [r[3], r[4]], [r[5], r[6]], hand, [hand[0] * 0.8, hand[1] * 0.8]];
}

// ---------------------------------------------------------------- key selection
// Orbit: the key nearest in time is drawn on top of the second nearest; they cross-fade over ~4 frames around the
// midpoint between keys. Locked: the fades follow the measured eye closure (133.00–133.44) and reopening
// (134.92–135.10); in between the nearest open/closed drawing is held.
function nearestTwo(t, times) {
  const o = times.map((tk, i) => [Math.abs(t - tk), i]).sort((a, b) => a[0] - b[0]);
  const [d1, i1] = o[0], [d2, i2] = o[1];
  return { top: i1, low: i2, a: Math.min(1, 0.5 + (d2 - d1) / 0.16) };
}
const FIG_T = FIG.map(([D]) => D.t);
const NORB = FIG.length - NLOCK;                       // orbit keys, then the locked ones (by time)
// locked keys: 131.44 132.6 (open) | 133.12 133.24 133.36 (closing) | 133.88 (shut) | 134.96 135.04 135.12 (opening) | 135.52
const SCHED = [[131.44, 0], [132.6, 1], [133.0, 1], [133.12, 2], [133.24, 3], [133.36, 4], [133.48, 5], [134.92, 5], [134.96, 6],
  [135.04, 7], [135.12, 8], [135.52, 9]].map(([t, k]) => [t, NORB + k]);
function figPair(t) {
  if (t < 131.44) return nearestTwo(t, FIG_T.slice(0, NORB + 1));
  for (let i = 0; i < SCHED.length - 1; i++) {
    const [a, ka] = SCHED[i], [b, kb] = SCHED[i + 1];
    if (t <= b) {
      if (ka === kb) return { top: ka, low: ka, a: 1 };
      const u = (t - a) / (b - a);
      return u >= 0.5 ? { top: kb, low: ka, a: u } : { top: ka, low: kb, a: 1 - u };
    }
  }
  const k = SCHED[SCHED.length - 1][1];
  return { top: k, low: k, a: 1 };
}

// ---------------------------------------------------------------- the laptop lid (measured quad per frame)
function lidQuad(t) {
  const k = Math.max(0, Math.min(LIDQ.length - 1, Math.round((t - LIDQ[0][0]) * 25)));
  return LIDQ[k].slice(1);
}
const lerp2 = (a, b, u) => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
const dist = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
function drawLid(ctx, t) {
  const q = lidQuad(t);
  const P = [[q[0], q[1]], [q[2], q[3]], [q[4], q[5]], [q[6], q[7]]];
  const r = 22 * dist(P[0], P[1]) / 740;
  const c = [(P[0][0] + P[1][0] + P[2][0] + P[3][0]) / 4, (P[0][1] + P[1][1] + P[2][1] + P[3][1]) / 4];
  const path = (g, inset, dx = 0, dy = 0) => {
    const [A, B, Cc, D] = P.map((p) => { const p2 = lerp2(p, c, inset / Math.max(1, dist(p, c))); return [p2[0] + dx, p2[1] + dy]; });
    const ra = r / dist(A, B), rd = r / dist(A, D), rb = r / dist(B, Cc);
    g.beginPath();
    g.moveTo(...lerp2(A, B, ra));
    g.lineTo(...lerp2(B, A, ra));
    g.quadraticCurveTo(B[0], B[1], ...lerp2(B, Cc, rb));
    g.lineTo(Cc[0], Cc[1]);
    g.lineTo(D[0], D[1]);
    g.lineTo(...lerp2(A, D, rd));
    g.quadraticCurveTo(A[0], A[1], ...lerp2(A, B, ra));
    g.closePath();
  };
  ctx.save();
  // the lid's side (its thickness) shows as a pale strip on the left while the camera is round to the right
  const th = Math.max(0, Math.min(1, (LOCK - t) / 2));
  if (th > 0.01) {
    path(ctx, 0, -9 * th, 2 * th);
    ctx.fillStyle = "#b9b6b4"; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = "#1f1716"; ctx.stroke();
  }
  // measured on 132.4 s: dark keyline, a thin pale bevel line ~5 px in along the top and right edges, a second dark
  // line, then the matte grey face (slightly darker toward the bottom)
  path(ctx, 0);
  const gr = ctx.createLinearGradient(0, Math.min(q[1], q[3]), 0, Math.max(q[5], q[7]));
  gr.addColorStop(0, "#615b5b"); gr.addColorStop(0.5, "#5d5757"); gr.addColorStop(1, "#555050");
  ctx.fillStyle = gr; ctx.fill();
  ctx.save(); path(ctx, 0); ctx.clip();
  const edge = (inset, w, col) => {
    const [A, B, Cc] = P.map((p) => lerp2(p, c, inset / Math.max(1, dist(p, c))));
    ctx.beginPath(); ctx.moveTo(...lerp2(A, B, 0.02)); ctx.lineTo(...lerp2(B, A, r / dist(A, B)));
    ctx.quadraticCurveTo(B[0], B[1], ...lerp2(B, Cc, r / dist(B, Cc))); ctx.lineTo(...lerp2(B, Cc, 0.97));
    ctx.lineWidth = w; ctx.strokeStyle = col; ctx.lineCap = "round"; ctx.stroke();
  };
  edge(5.5, 2.6, "#948e8c");
  edge(9, 1.8, "#3a3436");
  ctx.restore();
  path(ctx, 0); ctx.lineWidth = 3.6; ctx.strokeStyle = "#1c1413"; ctx.lineJoin = "round"; ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------- key meshes and canvases (lazy)
// grid over the key's image, lifted to 3D with the key's camera and the measured depth of each vertex
function keyMesh(G, box, maxRatio = 99) {
  const cam = camAt(frameT(G.t));
  const { u0, v0, step, nu, nv, s } = G;
  const pos = new Float32Array(nu * nv * 3), uv = new Float32Array(nu * nv * 2), idx = [];
  const Rt = cam.R;
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
    const k = j * nu + i, u = u0 + i * step, v = v0 + j * step, z = s[k];
    const dc = [(u - cam.cx) / cam.f * z, (v - cam.cy) / cam.f * z, z];
    // world = C + R^T dc
    pos.set([0, 1, 2].map((a) => cam.C[a] + Rt[0][a] * dc[0] + Rt[1][a] * dc[1] + Rt[2][a] * dc[2]), k * 3);
    uv.set([(u - box[0]) / box[2], (v - box[1]) / box[3]], k * 2);
  }
  // triangles; those spanning a depth jump (an object's edge against the wall behind) are left out, so the key
  // does not smear there and the other keys fill in
  // a depth jump shows as a spike in the second difference of disparity (1/z), which is ~0 on any plane
  const bad = new Uint8Array(nu * nv);
  const inv = (i, j) => 1 / s[Math.max(0, Math.min(nv - 1, j)) * nu + Math.max(0, Math.min(nu - 1, i))];
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
    const c = inv(i, j);
    const lx = Math.abs(inv(i - 1, j) - 2 * c + inv(i + 1, j)), ly = Math.abs(inv(i, j - 1) - 2 * c + inv(i, j + 1));
    if (Math.max(lx, ly) > maxRatio) bad[j * nu + i] = 1;
  }
  const ok = (a, b, c) => !(bad[a] || bad[b] || bad[c]);
  for (let j = 0; j < nv - 1; j++) for (let i = 0; i < nu - 1; i++) {
    const k = j * nu + i;
    if (ok(k, k + 1, k + nu + 1)) idx.push(k, k + 1, k + nu + 1);
    if (ok(k, k + nu + 1, k + nu)) idx.push(k, k + nu + 1, k + nu);
  }
  return { pos, uv, idx: new Uint16Array(idx) };
}
function bbox(rings, pad) {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const r of rings) for (const [x, y] of r) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  return [Math.floor(x0 - pad), Math.floor(y0 - pad), Math.ceil(x1 + pad), Math.ceil(y1 + pad)];
}
let R = null;
function res() {
  if (!R) R = { gl: createGL(W, H), fig: new Map(), room: new Map() };
  return R;
}
function figKey(i) {
  const C = R.fig;
  if (!C.has(i)) {
    const [D, gname] = FIG[i];
    const [x0, y0, x1, y1] = bbox(D.sil, 16);
    const c = canvas(x1 - x0, y1 - y0), g = c.getContext("2d");
    g.translate(-x0, -y0);
    // pinholes between the traced regions: a softened copy of the regions underneath fills them with nearby colour,
    // clipped to the key's silhouette so nothing spills outside
    g.save();
    g.beginPath(); for (const r of D.sil) { r.forEach((p, k) => (k ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); }
    g.clip();
    g.filter = "blur(4px)"; drawTrace(g, { regions: D.regions }); g.filter = "none";
    g.restore();
    drawTrace(g, { regions: D.regions, ink: D.ink });
    const key = { canvas: c, mesh: keyMesh(DEPTH[gname], [x0, y0, x1 - x0, y1 - y0]), t: D.t, cam: camAt(frameT(D.t)), lid: lidQuad(D.t) };
    C.set(i, key);
    for (const k of [...C.keys()]) if (C.size > 4 && k !== i) { R.gl.dropTexture(C.get(k).canvas); R.gl.dropTexture(C.get(k).full.canvas); C.delete(k); }
  }
  return C.get(i);
}
function roomKey(i) {
  const C = R.room;
  if (!C.has(i)) {
    const D = ROOM[i];
    const c = canvas(W, H), g = c.getContext("2d");
    drawTrace(g, D);
    // an untouched copy (its hidden parts filled from their surroundings) is the last-resort base layer
    const base = canvas(W, H); base.getContext("2d").drawImage(c, 0, 0);
    // what this key could not see (behind the figure and the lid) stays only as a faint fallback
    g.save(); g.globalCompositeOperation = "destination-out"; g.globalAlpha = 0.97; g.fillStyle = "#000";
    for (const r of D.hide) { g.beginPath(); r.forEach((p, k) => (k ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); g.fill(); }
    // the lid's keyline and bevel reach a little beyond its fitted quad: clear a wider margin round it
    if (D.t < LOCK + 0.3) {
      const q = lidQuad(D.t);
      g.beginPath(); g.moveTo(q[0], q[1]); g.lineTo(q[2], q[3]); g.lineTo(q[4], q[5] + 80); g.lineTo(q[6], q[7] + 80); g.closePath();
      g.lineWidth = 26; g.lineJoin = "round"; g.strokeStyle = "#000"; g.stroke(); g.fill();
    }
    g.restore();
    const G = DEPTH["room" + keyName(D.t)];
    C.set(i, { canvas: c, mesh: keyMesh(G, [0, 0, W, H], 0.15), full: { canvas: base, mesh: keyMesh(G, [0, 0, W, H]) }, t: D.t });
    // keep the five most recently used room keys
    for (const k of [...C.keys()]) if (C.size > 5 && k !== i && Math.abs(ROOM[k].t - D.t) > 0.3) { R.gl.dropTexture(C.get(k).canvas); R.gl.dropTexture(C.get(k).full.canvas); C.delete(k); }
  }
  return C.get(i);
}
const ROOM_T = ROOM.map((D) => D.t);

export const shot = {
  draw(ctx, local, t) {
    const tf = frameT(t);
    const S = res();
    const cam = camAt(tf);
    const gl = S.gl;
    gl.begin([0.93, 0.9, 0.82, 1]);
    // room: all keys, farthest in time first; the nearest on top (cross-fading with the second nearest)
    const tr = Math.min(tf, 131.6);
    const order = ROOM_T.map((tk, i) => [Math.abs(tr - tk), i]).sort((a, b) => b[0] - a[0]);
    const { a: ra } = nearestTwo(tr, ROOM_T);
    // base: the nearest key's full mesh (no culling at depth jumps) under everything, so nothing is left uncovered
    gl.draw(roomKey(order[order.length - 1][1]).full, cam, {});
    order.forEach(([, i], n) => {
      if (n < order.length - 3) return;                       // two nearest (+ one more as fallback) are enough
      gl.draw(roomKey(i), cam, { alpha: n === order.length - 1 ? ra : 1 });
    });
    // figure: the second key first (only where the top key could not see — behind its lid — unless cross-fading)
    const { top, low, a } = figPair(tf);
    const bt = breath(tf);
    const disp = (K) => { const bk = breath(frameT(K.t)); return bt.map((d, i) => [d[0] - bk[i][0], d[1] - bk[i][1]]); };
    const T = figKey(top), Lk = figKey(low);
    if (low !== top) gl.draw(Lk, cam, { cps: CPS, disp: disp(Lk), hole: { cam: T.cam, quad: T.lid, now: lidQuad(tf), band: 55, keep: a < 0.999 ? 1 : 0 } });
    gl.draw(T, cam, { cps: CPS, disp: disp(T), alpha: a });
    ctx.drawImage(gl.canvas, 0, 0);
    // laptop lid
    drawLid(ctx, tf);
    // the end card's dissolve begins inside this shot (135.78) — s40's own measured alpha
    if (t >= 135.78 && t < 136.0) overlayEndCard(ctx, t);
  },
  release() { if (R) R.gl.release(); R = null; },
};
