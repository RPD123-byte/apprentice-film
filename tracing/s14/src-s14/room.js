// s14 room: the lit corridor of boxes and gear the owl flies into. Painted flat, as layers, in R40 coordinates
// (= the 40.00 s source frame, where the room first fills the screen). Every shape was traced from 2x labelled
// grids of that frame (snapshots/s14-src/qA..qD.jpg). Each layer gets an inverse-depth plane w(u,v) (measured
// with optical flow over 40.00-40.20: see fidelity/s14.md) so the forward dolly after 40.0 s shows parallax.
import { Plate } from "../../lib/engrave.js";
import { packLayer } from "./paint.js";
import { INK, DARK, grey, rng, taper, poly, blob, ell, lin, rad, line, curve, stroke, quadAt, grain, G, VEC, inside } from "./kit.js";
import { TONE } from "./tone.js";
import { STROKES } from "./strokes.js";

const PI = Math.PI;
const mk = (w, h) => { const c = document.createElement("canvas"); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; };

// A layer: an engraving plate plus a coverage (alpha) canvas, both in R40 coordinates through an offset.
export class Lay {
  constructor(rect, sc, name = "") {
    const [x0, y0, x1, y1] = rect;
    this.rect = rect; this.sc = sc; this.name = name; this.n = 0;
    this.P = new Plate(x1 - x0, y1 - y0, sc);
    for (const g of [this.P.v, this.P.d, this.P.o]) g.translate(-x0, -y0);
    // fix pass 1: tapered strokes on the overlay are recorded as centre lines (kit.js) and re-stroked per frame
    this.vec = []; this.P.o.__vec = this.vec;
    this.A = mk((x1 - x0) * sc, (y1 - y0) * sc);
    this.a = this.A.getContext("2d");
    this.a.scale(sc, sc); this.a.translate(-x0, -y0);
    this.a.fillStyle = "#fff"; this.a.strokeStyle = "#fff"; this.a.lineJoin = "round"; this.a.lineCap = "round";
    // fix pass 1: a fill-id map (id = fill index + 1, 0 = none) so the compositor can re-tone every fill per frame
    this.I = mk((x1 - x0) * sc, (y1 - y0) * sc);
    this.ia = this.I.getContext("2d");
    this.ia.scale(sc, sc); this.ia.translate(-x0, -y0);
  }
  get o() { return this.P.o; }
  fill(path, value, angle, opts = {}) {
    // per-fill value gain from the tone audit (s14/tone.js: measured against the source at 40.08-40.24)
    const k = (!this.noTone && TONE[this.name] && TONE[this.name][this.n]) || 1;
    if (globalThis.__s14rec) globalThis.__s14rec(this.name, this.n, path, value);
    this.n++;
    if (k !== 1) { G.k = k; if (typeof value === "number") value = Math.min(1, value * k); }
    this.P.fill(path, value, angle, opts);
    G.k = 1;
    if ((opts.alpha ?? 1) > 0.5) {
      this.a.beginPath(); path(this.a); this.a.fill();
      if (this.n <= 255) { this.ia.fillStyle = `rgb(${this.n},0,0)`; this.ia.beginPath(); path(this.ia); this.ia.fill(); }
    }
  }
  light(path, value, op = "source-over", alpha = 1) { this.P.light(path, value, op, alpha); }
  cover(path) { this.a.beginPath(); path(this.a); this.a.fill(); }
  // contour helpers that also count as coverage
  line(pts, w, color = INK, seed = 1, ends = 0.45) { line(this.o, pts, w, color, seed, ends); line(this.a, pts, w, "#fff", seed, ends); }
  curve(pts, w, color = INK, seed = 1, o = {}) { curve(this.o, pts, w, color, seed, o); curve(this.a, pts, w, "#fff", seed, o); }
  // fix pass 1: hand the plate to the compositor unbaked (value, directions, overlay, occlusion, fill ids; the ink
  // strokes as centre lines): the charcoal finish is computed there per screen pixel (s14/gl.js)
  pack(opaque = false) {
    const out = packLayer(this.P, opaque ? null : this.A, this.vec, this.sc, this.I);
    this.P = null; this.A = null; this.a = null; this.I = null; this.ia = null;
    return out;
  }
}

// helpers -----------------------------------------------------------------------------------------------
const quad = (q) => poly(q);
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
// hand-traced polygon contours: kept faint once the traced ink strokes (strokes.js) carry the real lines
export const EDGE_K = { v: 0.25 };
function edges(L, q, w, color, seed = 1, closed = true) {
  const pts = closed ? [...q, q[0]] : q;
  const o = L.o, ga = o.globalAlpha;
  o.globalAlpha = ga * EDGE_K.v;
  for (let i = 0; i < pts.length - 1; i++) L.line([pts[i], pts[i + 1]], w, color, seed + i);
  o.globalAlpha = ga;
}
// the source's ink lines, traced from the 40.00 frame (trace/trace_room.py): tapered black strokes whose width is
// the measured ink mass and whose alpha is the measured darkness ratio
// (fix pass 1: the source's contours at 40.00 measure 4-5 px at half depth, the traced widths ran 5-9 -> x0.7, cap 5)
export const STROKE_K = { w: 0.7, a: 1.0, cap: 5, minLen: 60 };
// (fix pass 1) regions redrawn from measurements, where the traced lines would double the new drawing
const SUPPRESS = {
  // (the desk leg's left contour at x ~1190 was traced onto the floor: a dark diagonal line across it in the dolly)
  floor: [[[1150, 690], [1270, 690], [1270, 900], [1150, 900]]],
  left: [[[505, 425], [668, 425], [668, 604], [505, 604]], [[846, 436], [890, 443], [956, 731], [903, 724]], [[488, 702], [676, 676], [678, 770], [488, 786]]],
};
function inkStrokes(L, name) {
  const S = STROKES[name];
  if (!S) return;
  const o = L.o;
  o.save();
  for (const f of S) {
    const n = f.length / 4;
    if (n < 2) continue;
    if (SUPPRESS[name]) {
      let mx = 0, my = 0; for (let i = 0; i < n; i++) { mx += f[4 * i] / n; my += f[4 * i + 1] / n; }
      if (SUPPRESS[name].some((q) => inside(q, mx, my))) continue;
    }
    const pts = [], ws = [];
    let vs = 0;
    for (let i = 0; i < n; i++) { pts.push([f[4 * i], f[4 * i + 1]]); ws.push(Math.min(STROKE_K.cap, f[4 * i + 2] * STROKE_K.w)); vs += f[4 * i + 3]; }
    const v = Math.min(1, (vs / n) * STROKE_K.a);
    // densify so the width can taper at the ends
    const q = [], qw = [];
    for (let i = 0; i < n - 1; i++) {
      const k = Math.max(1, Math.ceil(Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]) / 5));
      for (let j = 0; j < k; j++) { const t = j / k; q.push([pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t]); qw.push(ws[i] + (ws[i + 1] - ws[i]) * t); }
    }
    q.push(pts[n - 1]); qw.push(ws[n - 1]);
    const m = q.length;
    // (fix pass 1) strokes under 60 px are mostly the source's texture marks, not contours: flag them (luma + 2) so
    // the compositor fades them as the camera closes in; the long ones are the room's contours
    let len = 0; for (let i = 1; i < n; i++) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    const k0 = L.vec.length;
    taper(o, q, (u) => { const i = Math.min(m - 1, Math.round(u * (m - 1))); return qw[i] * (0.35 + 0.65 * Math.min(1, Math.sin(Math.PI * u) * 3)); }, `rgba(0,0,0,${v.toFixed(3)})`);
    if (len < STROKE_K.minLen) for (let j = k0; j < L.vec.length; j++) L.vec[j].l += 2;
  }
  o.restore();
}
// a cardboard carton face as the source paints it: soft flat tone (a little mottled, never blotchy), a few brush grain
// strokes, a heavy dark contour, the flap seam near the top with a tape strip across it, sometimes a label; faces
// in shadow get a cross-hatch instead of flat tone
function carton(L, q, v, seed, { grainDir = "v", tape = true, label = false, lit = 0, edge = "rgba(6,6,6,0.95)", ang = PI / 2, hatch = false, flap = true, ew = 3, side = 0, sideW = 0.12, sideV = 0.45, over = 0.5, band = null } = {}) {
  const r = rng(seed);
  const [a, b, c, d] = q;
  L.fill(quad(q), lin(a[0], a[1], b[0], c[1], [[0, v * (1.08 - lit * 0.25)], [0.5, v], [1, v * (0.86 + lit * 0.4)]]), ang, { spacing: 0.3, style: hatch ? 1 : 2 });
  // fix pass 2: the source's cartons read as solid boxes: a lit vertical band where the face turns to the light, the
  // shadow of the box above along the top edge, soft charcoal clouds, and (side) the narrow face turned toward the
  // corridor, darker and hatched
  if (band) {
    const [u0, uw, gain] = band;
    const bq = [quadAt(q, u0, 0), quadAt(q, u0 + uw, 0), quadAt(q, u0 + uw, 1), quadAt(q, u0, 1)];
    L.light(quad(bq), lin(bq[0][0], 0, bq[1][0], 0, [[0, v], [0.35, Math.min(0.95, v * gain)], [0.7, Math.min(0.95, v * gain * 0.97)], [1, v]]), "lighten", 1);
  }
  mottle(L, q, seed + 17, 0.22);
  grain(L.o, q, 2 + Math.round(r() * 3), { dir: grainDir, w: 1.2, color: `rgba(0,0,0,${0.12 + r() * 0.12})`, seed: seed + 3, len: [0.25, 0.7], wav: 0.01 });
  grain(L.o, q, 2, { dir: grainDir, w: 1.0, color: `rgba(242,240,234,${0.05 + v * 0.1})`, seed: seed + 5, len: [0.2, 0.45], wav: 0.01 });
  if (side) {
    const u0 = side < 0 ? 0 : 1 - sideW, u1 = u0 + sideW;
    const sq = [quadAt(q, u0, 0), quadAt(q, u1, 0), quadAt(q, u1, 1), quadAt(q, u0, 1)];
    L.fill(quad(sq), lin(sq[0][0], 0, sq[1][0], 0, [[0, v * sideV * (side < 0 ? 0.8 : 1.15)], [1, v * sideV * (side < 0 ? 1.15 : 0.8)]]), PI / 2 + 0.35 * side, { spacing: 0.28, style: 1 });
    L.line([side < 0 ? sq[1] : sq[0], side < 0 ? sq[2] : sq[3]], 2.2, "rgba(0,0,0,0.85)", seed + 21);
  }
  if (over > 0) {
    const oq = [quadAt(q, 0, 0), quadAt(q, 1, 0), quadAt(q, 1, 0.22), quadAt(q, 0, 0.22)];
    L.light(quad(oq), lin(0, oq[0][1], 0, oq[3][1], [[0, 1 - over], [0.35, 1 - over * 0.45], [1, 1]]), "multiply", 1);
  }
  if (flap) {
    const f0 = 0.1 + r() * 0.06;
    L.line([quadAt(q, 0.01, f0), quadAt(q, 0.99, f0 + (r() - 0.5) * 0.02)], 1.7, "rgba(0,0,0,0.7)", seed + 6);
    if (tape) {
      const u0 = 0.4 + r() * 0.15, du = 0.12;
      const tq = [quadAt(q, u0, 0), quadAt(q, u0 + du, 0), quadAt(q, u0 + du, f0 + 0.16), quadAt(q, u0, f0 + 0.16)];
      L.fill(quad(tq), Math.min(0.9, v * 1.06 + 0.02), ang, { spacing: 0.3, style: 2 });
      L.line([tq[1], tq[2]], 1.2, "rgba(0,0,0,0.55)", seed + 7); L.line([tq[0], tq[3]], 1.2, "rgba(0,0,0,0.55)", seed + 8);
    }
  }
  if (label) {
    const u0 = 0.18 + r() * 0.4, v0 = 0.32 + r() * 0.3, du = 0.18 + r() * 0.08, dv = 0.12 + r() * 0.06;
    const lq = [quadAt(q, u0, v0), quadAt(q, u0 + du, v0), quadAt(q, u0 + du, v0 + dv), quadAt(q, u0, v0 + dv)];
    L.fill(quad(lq), Math.min(0.85, v * 1.04), ang, { spacing: 0.3, style: 2 });
    edges(L, lq, 1.6, "rgba(0,0,0,0.8)", seed + 11);
  }
  shadeHatch(L, q, hatch ? 0.8 : Math.max(0, 0.7 - v) * 0.7, seed + 19, { from: hatch ? 0 : 0.35 });
  edges(L, q, ew, edge, seed + 13);
}
// pen hatching in dark ink over a face (the source shades its cardboard and wood with fine dark hatching, densest
// low down and in shadow): `amt` 0..1, two families when amt > 0.5
function shadeHatch(L, q, amt, seed, { ang = 0.9, from = 0.35, sp = 5.5, w = 1.0 } = {}) {
  if (amt <= 0.02) return;
  const r = rng(seed), o = L.o;
  const xs = q.map((p) => p[0]), ys = q.map((p) => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const pc = o.__clip;
  o.__clip = (x, y) => inside(q, x, y);
  const fam = (a, k, sp2) => {
    const dx = Math.cos(a), dy = Math.sin(a), nx = -dy, ny = dx;
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, R = Math.hypot(x1 - x0, y1 - y0) / 2 + 4;
    for (let t = -R; t < R; t += sp2 * (0.8 + r() * 0.4)) {
      const px = cx + nx * t, py = cy + ny * t;
      // strokes broken into dashes; each dash only where the face is low enough (the shade ramps up from `from`)
      for (let u = -R; u < R; u += 8 + r() * 16) {
        const L0 = 6 + r() * 14, ax = px + dx * u, ay = py + dy * u, f = (ay - y0) / Math.max(1, y1 - y0);
        const dens = Math.max(0, Math.min(1, (f - from) / (1 - from + 1e-3))) * k;
        if (r() > dens) continue;
        const col = `rgba(0,0,0,${(0.18 + 0.3 * r()) * Math.min(1, amt * 1.4)})`, lw = w * (0.7 + r() * 0.6);
        const nq = Math.max(2, Math.ceil(L0 / 2.5)), pts = [];
        for (let j = 0; j <= nq; j++) pts.push([ax + (dx * L0 * j) / nq, ay + (dy * L0 * j) / nq]);
        taper(o, pts, lw, col);
      }
    }
  };
  fam(ang, amt, sp);
  if (amt > 0.5) fam(ang + 1.3, (amt - 0.5) * 2, sp * 1.2);
  o.__clip = pc;
}
// cloudy blotches in a carton face (the source's cardboard is mottled light and dark)
function mottle(L, q, seed, amt = 0.25) {
  const r = rng(seed), v = L.P.v;
  const xs = q.map((p) => p[0]), ys = q.map((p) => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const w = x1 - x0, h = y1 - y0, n = 3 + Math.round((w * h) / 2500);
  v.save(); v.beginPath(); poly(q)(v); v.clip();
  v.filter = `blur(${Math.max(2, Math.min(w, h) * 0.12)}px)`;
  for (let i = 0; i < Math.min(n, 18); i++) {
    const cx = x0 + r() * w, cy = y0 + r() * h, rx = w * (0.12 + r() * 0.2), ry = h * (0.1 + r() * 0.18);
    v.globalCompositeOperation = r() < 0.6 ? "multiply" : "screen";
    const k = v.globalCompositeOperation === "multiply" ? 1 - amt * (0.5 + r() * 0.5) : amt * 0.5 * r();
    v.fillStyle = grey(k); v.beginPath(); v.ellipse(cx, cy, rx, ry, r() * 3, 0, 7); v.fill();
  }
  v.restore();
}
// a thick cable: a dark tube with a grey body and a thin highlight
// (fix pass 1: cables are solid things: their recorded strokes scale with the surface, VEC.kind = 1)
const solid = (fn) => { const k = VEC.kind; VEC.kind = 1; try { fn(); } finally { VEC.kind = k; } };
function cable(o, pts, w, seed, opts = {}) { solid(() => cable0(o, pts, w, seed, opts)); }
function cable0(o, pts, w, seed, { body = 0.42, hi = 0.75 } = {}) {
  curve(o, pts, w, "rgba(4,4,4,0.95)", seed);
  curve(o, pts, w * 0.55, `rgba(${Math.round(body * 255)},${Math.round(body * 253)},${Math.round(body * 248)},0.95)`, seed + 1);
  curve(o, pts.map(([x, y]) => [x - w * 0.12, y - w * 0.12]), Math.max(0.8, w * 0.14), `rgba(242,240,234,${hi})`, seed + 2);
}
// a heavy cable hanging between two points (a catenary-ish sag), dark with a thin rim light on its upper side;
// also marks coverage when L is given
function droop(L, a, b, sag, w, seed, hi = 0.35) { solid(() => droop0(L, a, b, sag, w, seed, hi)); }
function droop0(L, a, b, sag, w, seed, hi = 0.35) {
  const pts = [];
  for (let i = 0; i <= 10; i++) { const t = i / 10; pts.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t + sag * 4 * t * (1 - t)]); }
  L.curve(pts, w, "rgba(5,5,5,0.97)", seed, { ends: 0.7 });
  curve(L.o, pts.map(([x, y]) => [x - w * 0.15, y - w * 0.3]), Math.max(0.9, w * 0.2), `rgba(242,240,234,${hi})`, seed + 1, { ends: 0.3 });
}
function hang(L, pts, w, seed, hi = 0.35) { solid(() => hang0(L, pts, w, seed, hi)); }
function hang0(L, pts, w, seed, hi = 0.35) {
  L.curve(pts, w, "rgba(5,5,5,0.97)", seed, { ends: 0.6 });
  curve(L.o, pts.map(([x, y]) => [x - w * 0.28, y]), Math.max(0.9, w * 0.2), `rgba(242,240,234,${hi})`, seed + 1, { ends: 0.3 });
}
// wood board: tone with running grain and a lit edge
function board(L, q, v, seed, { dir = "u", ang = 0, litEdge = 0.6, n = 14 } = {}) {
  L.fill(quad(q), v, ang, { spacing: 0.28 });
  shadeHatch(L, q, Math.max(0, 0.6 - v) * 0.8, seed + 29, { from: 0.2, ang: ang + 0.8 });
  grain(L.o, q, n, { dir, w: 1.5, color: "rgba(0,0,0,0.5)", seed, len: [0.3, 1], wav: 0.015 });
  grain(L.o, q, Math.round(n * 0.6), { dir, w: 1.2, color: `rgba(242,240,234,${0.15 + v * 0.3})`, seed: seed + 1, len: [0.2, 0.7], wav: 0.015 });
  if (litEdge > 0) L.line([q[0], q[1]], 1.6, `rgba(242,240,234,${litEdge})`, seed + 2);
  edges(L, q, 1.8, "rgba(6,6,6,0.85)", seed + 3);
}

// ================================================================= BACK: black corridor, dim boxes receding along it
function paintBack(L) {
  // the far end of the corridor is black; along both sides of it dim, cross-hatched carton stacks recede toward
  // the vanishing point (source 40.00: faint stacks at x 950-1010 and 1110-1240, getting smaller toward the end)
  const VP = [1104, 470];
  const stack = (x0, x1, y0, y1, n, seed, v) => {
    const r = rng(seed);
    let y = y0;
    for (let i = 0; i < n && y < y1; i++) {
      const h = (y1 - y0) / n * (0.8 + r() * 0.4), dx = (r() - 0.5) * 10;
      const q = [[x0 + dx, y], [x1 + dx, y], [x1 + dx, y + h], [x0 + dx, y + h]];
      L.fill(quad(q), v * (0.7 + r() * 0.5), 0.9 + r() * 0.4, { spacing: 0.35, style: 1 });
      edges(L, q, 1.6, "rgba(0,0,0,0.9)", seed + i * 3);
      y += h;
    }
  };
  stack(1112, 1180, 250, 700, 7, 71, 0.1);
  stack(1060, 1112, 330, 660, 6, 72, 0.06);
  stack(1004, 1052, 300, 640, 6, 73, 0.065);
  stack(955, 1004, 260, 690, 7, 74, 0.11);
  // the corridor floor running away into the dark
  L.fill(poly([[930, 700], [1200, 700], [1150, 640], [1060, 640]]), lin(0, 640, 0, 700, [[0, 0.02], [1, 0.1]]), -PI / 2, { spacing: 0.35, style: 2 });
  void VP;
}

// ================================================================= CEILING: lit wooden planks converging on the corridor
function paintCeiling(L) {
  const VP = [1110, 380];
  const top = [[300, -40], [1900, -40], [1760, 60], [1560, 116], [1300, 140], [1100, 150], [900, 150], [620, 120], [440, 60]];
  L.fill(poly(top), lin(0, -40, 0, 150, [[0, 0.27], [0.45, 0.21], [0.8, 0.12], [1, 0.04]]), PI / 2, { spacing: 0.3, style: 2 });
  const r = rng(8);
  // planks: dark seams toward the vanishing point with paler boards between, brushy grain along them
  for (let i = 0; i < 40; i++) {
    const x = 300 + i * 40 + r() * 16;
    const p0 = [x, -40], p1 = mix(p0, VP, 0.36 + r() * 0.06);
    line(L.o, [p0, p1], 1.8 + r() * 1.2, `rgba(0,0,0,${0.55 + r() * 0.3})`, 30 + i, 0.25);
    for (let k = 0; k < 3; k++) {
      const a = 0.02 + r() * 0.2, b = a + 0.06 + r() * 0.14, off = 8 + r() * 24;
      const q0 = mix([x + off, -40], VP, a), q1 = mix([x + off, -40], VP, b);
      line(L.o, [q0, q1], 1 + r() * 1.2, r() < 0.5 ? `rgba(242,240,234,${0.1 + r() * 0.18})` : `rgba(0,0,0,${0.2 + r() * 0.25})`, 60 + i * 5 + k, 0.2);
    }
  }
  // the ceiling fades into black toward the corridor end
  L.light(poly([[640, 110], [1600, 100], [1500, 170], [720, 170]]), 0, "source-over", 0.55);
}

// ================================================================= FLOOR: grey stippled planks, lit along the corridor
function paintFloor(L) {
  const VP = [1104, 643];
  const v = L.P.v;
  // value study (fix pass 2, measured on the source at 40.08-40.64): a lit strip runs down the middle of the corridor
  // under the owl (luma ~175-200 round its feet, R40 ~(1030, 806) at 40.20 and (1060, 760) at 40.44), the flanks and
  // the floor under the desk and the shelving sink into shadow. Style 4: the source's printed halftone dot.
  L.P.fill(poly([[-160, 640], [2370, 640], [2370, 1010], [-160, 1010]]), 0.2, -PI / 2, { spacing: 0.3, style: 4 });
  L.cover(poly([[-160, 650], [2370, 650], [2370, 1010], [-160, 1010]]));
  v.save(); v.filter = "blur(34px)";
  const band = (x0, x1, X0, X1, val) => { v.fillStyle = grey(val); v.beginPath(); v.moveTo(x0, 662); v.lineTo(x1, 662); v.lineTo(X1, 1010); v.lineTo(X0, 1010); v.closePath(); v.fill(); };
  // (build 2 floor study, R40 grid over 40.08-40.40: the lit middle ~150-195, the flanks ~40-100)
  band(900, 1260, 200, 1640, 0.5);
  band(990, 1190, 560, 1380, 0.6);
  band(1030, 1160, 780, 1260, 0.7);
  band(1060, 1130, 900, 1180, 0.76);
  band(700, 900, -300, 560, 0.3);
  v.fillStyle = grey(0.1); v.beginPath(); v.moveTo(1265, 662); v.lineTo(2370, 662); v.lineTo(2370, 1010); v.lineTo(1480, 1010); v.closePath(); v.fill();
  v.fillStyle = grey(0.14); v.beginPath(); v.moveTo(-160, 662); v.lineTo(860, 662); v.lineTo(420, 1010); v.lineTo(-160, 1010); v.closePath(); v.fill();
  v.fillStyle = grey(0.05); v.fillRect(-160, 640, 2530, 26);
  v.restore();
  // charcoal streaks radiating from the far end, dense on the flanks and thinning out in the lit middle
  const r = rng(12), o = L.o;
  for (let i = 0; i < 170; i++) {
    const side = r() < 0.5 ? -1 : 1;
    const bx = 1030 + side * (60 + Math.pow(r(), 0.8) * 1500), p = [bx, 1010];
    const a = 0.1 + Math.pow(r(), 1.2) * 0.6, b = Math.min(1, a + 0.08 + r() * 0.3);
    const q0 = mix(VP, p, a), q1 = mix(VP, p, b), w = (1 + r() * 3.2) * (0.4 + b);
    const mid = Math.abs(bx - 1030) < 260;
    if (mid && r() < 0.65) continue;
    stroke(o, [q0, mix(q0, q1, 0.5), q1], w, r() < 0.85 ? `rgba(0,0,0,${0.18 + r() * 0.3})` : `rgba(242,240,234,${0.1 + r() * 0.18})`, 70 + i, 0.5);
  }
  // the black cable from the lower deck down to a coil on the floor in front of it
  const cab = [[652, 706], [646, 740], [640, 780], [650, 812], [690, 830], [760, 836], [830, 842], [862, 856], [846, 872], [780, 876], [700, 872], [640, 860], [626, 842], [652, 826], [720, 824]];
  solid(() => {
    curve(o, cab, 6.5, "rgba(4,4,4,0.97)", 5, { ends: 0.8 });
    curve(o, cab.map(([x, y]) => [x - 1, y - 2]), 1.2, "rgba(242,240,234,0.35)", 6, { ends: 0.3 });
  });
  floorZones(L);
}
// fix pass 1: tone zones on the floor (it has no Lay.fill regions): 8 sectors about the vanishing point x 3 depth
// bands, written into the fill-id map (ids 1..24) so the per-frame fill gains can shape the floor's light
export const FLOOR_RAYS = [-900, 300, 760, 960, 1100, 1260, 1500, 2000, 3200];
export const FLOOR_ROWS = [646, 725, 830, 1010];
function floorZones(L) {
  const VP = [1104, 643];
  const xAt = (X, y) => VP[0] + ((X - VP[0]) * (y - VP[1])) / (1010 - VP[1]);
  let id = 0;
  for (let j = 0; j < 3; j++) for (let i = 0; i < 8; i++) {
    id++;
    const y0 = FLOOR_ROWS[j], y1 = FLOOR_ROWS[j + 1];
    const q = [[xAt(FLOOR_RAYS[i], y0), y0], [xAt(FLOOR_RAYS[i + 1], y0), y0], [xAt(FLOOR_RAYS[i + 1], y1), y1], [xAt(FLOOR_RAYS[i], y1), y1]];
    if (globalThis.__s14rec) globalThis.__s14rec("floor", id - 1, poly(q), null);
    if (L.ia) { L.ia.fillStyle = `rgb(${id},0,0)`; L.ia.beginPath(); poly(q)(L.ia); L.ia.fill(); }
  }
}

// ================================================================= LEFT WALL: speaker, shelving, boxes, keyboard
function paintLeft(L) {
  const o = L.o, r = rng(21);
  // --- top-left: dark carton and a vented box above the speaker
  L.fill(quad([[-160, -20], [100, -20], [96, 176], [-160, 196]]), 0.1, PI / 2, { spacing: 0.35, style: 1 });
  const vent = [[70, 96], [262, 124], [262, 290], [70, 250]];
  L.fill(quad(vent), 0.2, 0.14, { spacing: 0.25 });
  for (let i = 0; i < 18; i++) { const t = (i + 0.5) / 18; L.line([quadAt(vent, 0.04, t), quadAt(vent, 0.97, t)], 1.8, "rgba(0,0,0,0.75)", 300 + i); }
  for (let i = 0; i < 9; i++) { const t = (i + 0.2) / 9; L.line([quadAt(vent, 0.06, t), quadAt(vent, 0.9, t)], 1.1, "rgba(242,240,234,0.3)", 320 + i); }
  edges(L, vent, 2, "rgba(0,0,0,0.9)", 310);
  L.fill(quad([[70, 20], [258, 30], [262, 124], [70, 96]]), 0.14, 0.1, { spacing: 0.3, style: 1 });
  // lit carton standing on end above the speaker, with a stencilled frame and a squiggle
  const lb = [[262, 22], [428, 40], [428, 290], [262, 290]];
  carton(L, lb, 0.58, 330, { tape: false, lit: 0.2 });
  edges(L, [[300, 118], [392, 126], [392, 238], [300, 232]], 1.6, "rgba(0,0,0,0.7)", 340);
  edges(L, [[312, 132], [380, 138], [380, 226], [312, 220]], 1.1, "rgba(0,0,0,0.45)", 342);
  curve(o, [[322, 196], [336, 180], [352, 204], [372, 186]], 1.6, "rgba(0,0,0,0.65)", 341);
  L.fill(quad([[262, 22], [428, 40], [428, 70], [262, 52]]), 0.66, 0.1, { spacing: 0.25 });

  // --- the speaker cabinet (front face turned toward the corridor): dark wood, the grain only outside the driver
  const cab = [[70, 180], [438, 310], [432, 606], [38, 604]];
  L.fill(quad([[-160, 150], [72, 178], [40, 606], [-160, 640]]), lin(-160, 0, 70, 0, [[0, 0.08], [1, 0.16]]), PI / 2, { spacing: 0.3, style: 2 });
  L.fill(quad(cab), lin(38, 300, 438, 400, [[0, 0.26], [0.6, 0.32], [1, 0.36]]), PI / 2 + 0.05, { spacing: 0.26, style: 2 });
  const cx = 236, cy = 444;
  o.__clip = (x, y) => inside(cab, x, y) && Math.hypot((x - cx) / 166, (y - cy) / 164) > 1;
  grain(o, cab, 34, { dir: "v", w: 1.6, color: "rgba(0,0,0,0.5)", seed: 400, len: [0.4, 1], wav: 0.01 });
  grain(o, cab, 16, { dir: "v", w: 1.2, color: "rgba(242,240,234,0.16)", seed: 401, len: [0.3, 0.8], wav: 0.01 });
  o.__clip = null;
  L.line([[80, 196], [432, 322]], 2.2, "rgba(242,240,234,0.55)", 402);
  L.line([[432, 322], [426, 598]], 1.6, "rgba(242,240,234,0.35)", 404);
  edges(L, cab, 3, "rgba(0,0,0,0.95)", 405);
  L.fill(quad([[438, 310], [446, 308], [446, 610], [432, 606]]), 0.08, PI / 2, { spacing: 0.3 });
  // the driver: dark flange with a lit rim on its lower right, dark surround, a grey cone lit low right, a dark dome
  L.fill(ell(cx, cy, 160, 158), 0.12, 0.4, { spacing: 0.22, style: 2 });
  o.strokeStyle = "rgba(242,240,234,0.55)"; o.lineWidth = 4; o.beginPath(); o.ellipse(cx, cy, 152, 150, 0, -0.2, 1.9); o.stroke();
  o.strokeStyle = "rgba(242,240,234,0.22)"; o.lineWidth = 2.5; o.beginPath(); o.ellipse(cx, cy, 152, 150, 0, 3.2, 4.5); o.stroke();
  for (const [dx, dy] of [[-96, -112], [108, -100], [118, 104], [-104, 118]]) {
    o.fillStyle = "rgba(10,10,10,0.9)"; o.beginPath(); o.arc(cx + dx, cy + dy, 6, 0, 7); o.fill();
    o.fillStyle = "rgba(242,240,234,0.45)"; o.beginPath(); o.arc(cx + dx - 1.5, cy + dy - 1.5, 1.8, 0, 7); o.fill();
  }
  L.fill(ell(cx - 2, cy + 2, 140, 139), rad(cx + 40, cy + 50, 60, 190, [[0, 0.2], [0.5, 0.1], [1, 0.04]]), 0.9, { spacing: 0.2, style: 2 });
  o.strokeStyle = "rgba(242,240,234,0.4)"; o.lineWidth = 5; o.beginPath(); o.ellipse(cx - 2, cy + 2, 127, 126, 0, 0.1, 1.5); o.stroke();
  const cc = [cx - 6, cy + 4];
  L.fill(ell(cc[0], cc[1], 114, 114), rad(cc[0] + 44, cc[1] + 54, 10, 170, [[0, 0.62], [0.45, 0.42], [1, 0.12]]), 0.6, { spacing: 0.24, style: 2 });
  o.save(); o.beginPath(); o.ellipse(cc[0], cc[1], 112, 112, 0, 0, 7); o.clip(); o.__clip = (x, y) => Math.hypot(x - cc[0], y - cc[1]) < 112;
  for (let i = 0; i < 110; i++) {
    const a = (i / 110) * 2 * PI + r() * 0.04, k = 0.5 + 0.5 * Math.cos(a - 0.9);
    const r0 = 44 + r() * 14, r1 = 96 + r() * 16;
    stroke(o, [[cc[0] + Math.cos(a) * r0, cc[1] + Math.sin(a) * r0], [cc[0] + Math.cos(a) * r1, cc[1] + Math.sin(a) * r1]], 2 + r() * 3, k > 0.45 ? `rgba(242,240,234,${0.1 + 0.3 * k * r()})` : `rgba(0,0,0,${0.3 + 0.4 * r()})`, 500 + i);
  }
  o.restore(); o.__clip = null;
  o.strokeStyle = "rgba(0,0,0,0.9)"; o.lineWidth = 3; o.beginPath(); o.ellipse(cc[0], cc[1], 114, 114, 0, 0, 7); o.stroke();
  o.strokeStyle = "rgba(0,0,0,0.9)"; o.lineWidth = 2.6; o.beginPath(); o.ellipse(cx, cy, 159, 157, 0, 0, 7); o.stroke();
  // dust cap: a dark dome with a small soft grey sheen high on it
  const dc = [cx - 16, cy - 2];
  L.fill(ell(dc[0], dc[1], 44, 43), rad(dc[0] + 12, dc[1] + 14, 2, 50, [[0, 0.2], [0.7, 0.07], [1, 0.03]]), 0.6, { spacing: 0.2, style: 2 });
  o.save(); o.filter = "blur(2px)"; o.fillStyle = "rgba(200,200,196,0.75)"; o.beginPath(); o.ellipse(dc[0] + 8, dc[1] - 16, 9, 6, -0.5, 0, 7); o.fill(); o.restore();
  o.strokeStyle = "rgba(0,0,0,0.9)"; o.lineWidth = 2.4; o.beginPath(); o.ellipse(dc[0], dc[1], 44, 43, 0, 0, 7); o.stroke();

  // --- carton under the speaker (the foreground box at lower left): lit top, the lit face running to the bottom
  const bx = [[26, 640], [478, 624], [482, 1010], [20, 1010]];
  L.fill(quad([[-160, 646], [26, 640], [20, 1010], [-160, 1010]]), lin(0, 640, 0, 1000, [[0, 0.46], [0.5, 0.42], [1, 0.3]]), PI / 2, { spacing: 0.3, style: 2 });
  L.fill(quad(bx), lin(0, 624, 0, 1000, [[0, 0.56], [0.35, 0.46], [0.7, 0.34], [1, 0.2]]), PI / 2 - 0.03, { spacing: 0.3, style: 2 });
  mottle(L, bx, 612, 0.12);
  grain(o, bx, 18, { dir: "v", w: 1.5, color: "rgba(0,0,0,0.3)", seed: 600, len: [0.3, 0.8], wav: 0.008 });
  grain(o, bx, 8, { dir: "v", w: 1.2, color: "rgba(242,240,234,0.14)", seed: 604, len: [0.2, 0.5], wav: 0.008 });
  const lab = [[250, 656], [318, 654], [320, 748], [252, 750]];
  L.fill(quad(lab), 0.56, PI / 2, { spacing: 0.3, style: 2 }); edges(L, lab, 1.5, "rgba(0,0,0,0.7)", 602);
  L.fill(quad([[-160, 600], [30, 604], [26, 640], [-160, 646]]), 0.5, 0.02, { spacing: 0.3, style: 2 });
  L.fill(quad([[30, 604], [440, 608], [478, 624], [26, 640]]), 0.68, 0.02, { spacing: 0.3, style: 2 });
  L.line([[60, 612], [300, 618]], 1.4, "rgba(0,0,0,0.5)", 605);
  L.line([[26, 640], [478, 624]], 2.8, "rgba(0,0,0,0.9)", 601);
  edges(L, bx, 3, "rgba(0,0,0,0.9)", 603);

  // --- shelving unit (traced from 2x grids, snapshots/s14-src/z1..z4.jpg): a pale leaning side board, dark back,
  // the CRT turned toward the corridor, a tape deck, a cable nest, a middle shelf, a second deck
  L.fill(quad([[440, 150], [505, 160], [490, 660], [440, 660]]), 0.22, PI / 2, { spacing: 0.3 });
  grain(o, [[440, 150], [505, 160], [490, 660], [440, 660]], 8, { dir: "v", w: 1.6, color: "rgba(0,0,0,0.5)", seed: 609 });
  L.fill(quad([[505, 0], [720, 0], [720, 800], [490, 800]]), 0.035, PI / 2, { spacing: 0.35 });
  const post = [[507, 0], [547, 0], [502, 660], [462, 660]];
  L.fill(quad(post), lin(462, 0, 547, 0, [[0, 0.62], [0.5, 0.78], [1, 0.6]]), PI / 2 - 0.06, { spacing: 0.24 });
  grain(o, post, 10, { dir: "v", w: 1.5, color: "rgba(0,0,0,0.55)", seed: 610, len: [0.3, 0.9] });
  edges(L, post, 2.2, "rgba(0,0,0,0.9)", 611);
  // right post of the lower bays
  const post2 = [[686, 425], [704, 428], [704, 612], [686, 610]];
  L.fill(quad(post2), 0.66, PI / 2, { spacing: 0.24 });
  edges(L, post2, 1.8, "rgba(0,0,0,0.9)", 612);
  // CRT: pale bezel seen in perspective (its face turned to the corridor), black glass
  const bez = [[552, 7], [712, 128], [690, 290], [522, 178]];
  L.fill(quad(bez), lin(522, 0, 712, 290, [[0, 0.82], [0.6, 0.78], [1, 0.66]]), 0.65, { spacing: 0.22 });
  const scr = [[566, 26], [698, 132], [674, 262], [534, 186]];
  L.fill(quad(scr), lin(566, 26, 674, 262, [[0, 0.02], [0.5, 0.05], [1, 0.02]]), 1.2, { spacing: 0.3 });
  edges(L, scr, 2.4, "rgba(0,0,0,0.95)", 620);
  edges(L, bez, 2.2, "rgba(0,0,0,0.9)", 621);
  L.line([[575, 36], [640, 86]], 1.2, "rgba(242,240,234,0.25)", 619);
  for (let i = 0; i < 3; i++) { const p = quadAt(bez, 0.72 + i * 0.07, 0.94); o.fillStyle = "rgba(0,0,0,0.7)"; o.beginPath(); o.ellipse(p[0], p[1], 3.5, 2.5, 0.6, 0, 7); o.fill(); }
  // monitor foot / riser
  L.fill(quad([[528, 180], [690, 288], [684, 300], [522, 196]]), 0.5, 0.6, { spacing: 0.24 });
  // tape deck under it, in the same perspective
  const deck = [[522, 238], [682, 322], [676, 404], [514, 350]];
  L.fill(quad(deck), lin(514, 238, 682, 404, [[0, 0.78], [1, 0.62]]), 0.5, { spacing: 0.22 });
  edges(L, deck, 2.2, "rgba(0,0,0,0.9)", 630);
  L.line([quadAt(deck, 0, 0.33), quadAt(deck, 1, 0.33)], 1.6, "rgba(0,0,0,0.75)", 634);
  for (const [u0, u1] of [[0.08, 0.36], [0.44, 0.76]]) {
    const w0 = [quadAt(deck, u0, 0.45), quadAt(deck, u1, 0.45), quadAt(deck, u1, 0.78), quadAt(deck, u0, 0.78)];
    L.fill(quad(w0), 0.2, 0.5, { spacing: 0.3 });
    edges(L, w0, 1.6, "rgba(0,0,0,0.9)", 631);
  }
  for (let i = 0; i < 3; i++) { const q0 = [quadAt(deck, 0.82, 0.42 + i * 0.16), quadAt(deck, 0.92, 0.42 + i * 0.16), quadAt(deck, 0.92, 0.52 + i * 0.16), quadAt(deck, 0.82, 0.52 + i * 0.16)]; edges(L, q0, 1.4, "rgba(0,0,0,0.85)", 635 + i); }
  for (let i = 0; i < 6; i++) { const p = quadAt(deck, 0.1 + i * 0.1, 0.18); o.fillStyle = "rgba(0,0,0,0.7)"; o.beginPath(); o.ellipse(p[0], p[1], 5, 3.5, 0.5, 0, 7); o.fill(); }
  // shelf board under the deck (slanting down to the right)
  board(L, [[506, 372], [704, 424], [704, 440], [506, 392]], 0.72, 640, { ang: 0.26, n: 7, litEdge: 0.8 });
  // cavity: a small shelf, a pale box with a dial, the cable nest (fix pass 1: its back is dark wood, not black)
  L.noTone = true; L.fill(quad([[502, 392], [690, 440], [690, 612], [502, 612]]), lin(502, 0, 690, 0, [[0, 0.16], [1, 0.1]]), PI / 2, { spacing: 0.35, style: 0 }); L.noTone = false;
  board(L, [[502, 500], [590, 505], [590, 520], [502, 516]], 0.5, 645, { n: 3 });
  // (fix pass 1: the pale box sits at x 610-665, y 538-610 on the 40.00 grid, a round dial low on it)
  const dev = [[609, 538], [664, 540], [662, 610], [607, 610]];
  L.fill(quad(dev), lin(607, 538, 664, 610, [[0, 0.74], [1, 0.58]]), PI / 2, { spacing: 0.24 });
  edges(L, dev, 1.8, "rgba(0,0,0,0.9)", 650);
  o.strokeStyle = "rgba(0,0,0,0.85)"; o.lineWidth = 2.2; o.beginPath(); o.ellipse(636, 580, 11, 13, 0, 0, 7); o.stroke(); o.beginPath(); o.arc(636, 582, 5, 0, 7); o.stroke();
  L.line([[622, 540], [626, 556]], 2.0, "rgba(0,0,0,0.8)", 651);
  // the coiled cable in the cubby (fix pass 1, traced on a 2.6x grid of 40.00): a pale grey cable with dark edges and
  // a white highlight, three long flat loops lying on top of each other, one loop to the right, one hanging over the
  // small shelf and the lead running down to the lower left
  for (const [pts, sd] of [
    [[[515, 453], [530, 437], [560, 432], [600, 436], [630, 447], [643, 461], [630, 478], [590, 486], [545, 484], [520, 472], [515, 455]], 1],
    [[[530, 458], [555, 445], [595, 446], [625, 456], [620, 470], [585, 477], [545, 473], [532, 462]], 2],
    [[[546, 463], [570, 453], [604, 455], [612, 465], [582, 470], [552, 469]], 3],
    [[[585, 492], [615, 487], [645, 496], [656, 512], [641, 527], [606, 531], [581, 520], [576, 505], [586, 492]], 4],
    [[[562, 488], [540, 505], [520, 540], [522, 562], [535, 579], [556, 583], [580, 575], [592, 560], [588, 538], [575, 520], [578, 500]], 5],
    [[[560, 500], [533, 528], [520, 562], [510, 610], [500, 660], [492, 692]], 6],
    [[[596, 530], [606, 546], [617, 558]], 7],
    [[[522, 468], [540, 452], [575, 441], [615, 444], [636, 455], [628, 470], [600, 481], [560, 480], [530, 474]], 8],
    [[[536, 452], [560, 440], [600, 441], [628, 452]], 9],
    [[[590, 500], [620, 495], [648, 505], [650, 518], [630, 524], [600, 522]], 10],
  ]) coil(L, pts, 7, 660 + sd * 5);
  // middle shelf board
  board(L, [[478, 616], [744, 606], [744, 634], [478, 660]], 0.74, 680, { ang: -0.03, n: 12, litEdge: 0.8 });
  // lower cavity with a second deck
  L.fill(quad([[486, 660], [706, 634], [706, 820], [486, 820]]), 0.03, 0, { spacing: 0.35 });
  // (fix pass 1, a 4x grid of 40.00: a hi-fi unit in perspective, its lines rising to the right: a pale top, a dark
  // groove under it, the front with a divider, two buttons and a dark door at the right, slots at the lower left)
  const deck2 = [[490, 707], [673, 680], [675, 768], [491, 782]];
  L.fill(quad(deck2), lin(0, 690, 0, 780, [[0, 0.74], [0.5, 0.66], [1, 0.46]]), -0.15, { spacing: 0.22, style: 2 });
  edges(L, deck2, 2.0, "rgba(0,0,0,0.9)", 690);
  const slot = [[497, 713], [669, 689], [669, 697], [497, 722]];
  L.fill(quad(slot), 0.1, -0.15, { spacing: 0.3, style: 2 });
  L.line([[492, 745], [672, 718]], 1.4, "rgba(0,0,0,0.75)", 691);
  L.line([[492, 700], [672, 674]], 1.2, "rgba(242,240,234,0.5)", 692);

  // --- carton stack by the keyboard: shadowed side faces, pale fronts sloping toward the corridor
  // (build 2, re-traced on a 1.6x grid of 40.00: the stack runs down to the floor at y ~780)
  const side = [[700, 52], [776, 52], [776, 782], [700, 782]];
  L.fill(quad(side), lin(700, 0, 776, 0, [[0, 0.2], [1, 0.32]]), PI / 2, { spacing: 0.3 });
  mottle(L, side, 701, 0.35);
  grain(o, side, 10, { dir: "v", w: 1.8, color: "rgba(0,0,0,0.55)", seed: 700, len: [0.2, 0.7] });
  edges(L, side, 2, "rgba(0,0,0,0.9)", 702);
  carton(L, [[776, 52], [856, 131], [860, 270], [792, 200]], 0.72, 710, { label: true, tape: false, lit: 0.1 });
  carton(L, [[792, 200], [882, 277], [882, 402], [794, 355]], 0.72, 720, { label: true, tape: false });
  carton(L, [[794, 355], [884, 402], [886, 610], [796, 600]], 0.5, 730, { label: true, tape: false });
  L.fill(quad([[856, 131], [874, 150], [878, 280], [860, 270]]), 0.5, PI / 2, { spacing: 0.3 });
  carton(L, [[700, 520], [752, 522], [752, 612], [700, 612]], 0.5, 740, { tape: false });
  carton(L, [[748, 380], [800, 384], [800, 618], [748, 616]], 0.78, 745, { tape: false });
  carton(L, [[742, 616], [806, 620], [806, 780], [742, 780]], 0.74, 747, { tape: false, side: -1, sideW: 0.3, sideV: 0.5, over: 0.5 });
  // --- more cartons and a bookshelf further down the wall
  // dim cartons behind (hatched, mottled), their tops sloping down toward the corridor
  const c1 = [[882, 126], [1000, 128], [1010, 256], [882, 256]];
  L.fill(quad(c1), 0.38, PI / 2, { spacing: 0.26, style: 0 }); mottle(L, c1, 751, 0.3); edges(L, c1, 2, "rgba(0,0,0,0.85)", 750);
  // (fix pass 1, a 2.4x grid of 40.00: under the two boxes a dark cabinet opening holds a robot toy and bottles, and
  // the cabinet's right side at x 1000-1050 is a bookshelf, its shelves sloping down to the right)
  const c2 = [[882, 256], [1000, 256], [1004, 440], [884, 440]];
  L.noTone = true; L.fill(quad(c2), 0.1, PI / 2, { spacing: 0.26, style: 0 }); L.noTone = false; mottle(L, c2, 756, 0.3); edges(L, c2, 2, "rgba(0,0,0,0.85)", 755);
  L.line([[884, 252], [1000, 254]], 1.6, "rgba(242,240,234,0.4)", 757);
  const bs = [[1000, 250], [1050, 262], [1050, 562], [1004, 556]];
  L.noTone = true; L.fill(quad(bs), 0.1, PI / 2, { spacing: 0.3 }); L.noTone = false;
  for (let j = 0; j < 5; j++) {
    const y0 = 300 + j * 52;
    for (let i = 0; i < 7; i++) { const x = 1006 + i * 6.3, y = y0 + (x - 1004) * 0.3; L.line([[x, y - 34 - r() * 8], [x + 0.5, y - 3]], 2.8, `rgba(242,240,234,${0.12 + r() * 0.22})`, 770 + j * 10 + i); }
    L.line([[1004, y0], [1050, y0 + 14]], 1.8, "rgba(242,240,234,0.35)", 800 + j);
  }
  board(L, [[1002, 404], [1050, 418], [1050, 424], [1002, 410]], 0.3, 800, { n: 2 });
  edges(L, bs, 2, "rgba(0,0,0,0.9)", 801);
  // tools and bottles on the shelf behind the keyboard
  L.fill(quad([[886, 320], [962, 320], [962, 440], [886, 440]]), 0.06, PI / 2, { spacing: 0.35 });
  for (const [x, y, w, h] of [[892, 330, 16, 78], [912, 344, 14, 66], [930, 356, 22, 52], [952, 334, 10, 80]]) {
    L.fill((c) => c.roundRect(x, y, w, h, 5), 0.3 + r() * 0.2, PI / 2, { spacing: 0.26 });
    L.line([[x + 3, y + 6], [x + 3, y + h - 6]], 1.4, "rgba(242,240,234,0.5)", 810 + x);
  }
  // cartons behind the keyboard (cross-hatched, in shadow)
  const kb1 = [[884, 436], [1000, 440], [1004, 590], [884, 588]];
  L.fill(quad(kb1), 0.52, 0.6, { spacing: 0.26, style: 2 }); shadeHatch(L, kb1, 0.6, 824, { from: 0 });
  edges(L, kb1, 2, "rgba(0,0,0,0.9)", 820);
  L.line([[976, 440], [980, 520]], 1.4, "rgba(0,0,0,0.6)", 821);
  const kb2 = [[870, 588], [1016, 590], [1018, 740], [870, 738]];
  L.fill(quad(kb2), 0.5, 0.6, { spacing: 0.26, style: 2 }); shadeHatch(L, kb2, 0.65, 825, { from: 0 });
  edges(L, kb2, 2, "rgba(0,0,0,0.9)", 822);
  carton(L, [[1000, 520], [1050, 520], [1050, 690], [1004, 690]], 0.4, 823, { tape: false });

  // --- the synth keyboard leaning on the cartons (fix pass 1, re-measured on 3-5x grids of 40.00 and luma profiles
  // along the key bed): a dark case (its narrow side face on the left, a bevelled front panel), a control strip with a
  // column of small buttons, two round buttons and two slider windows, and the key bed: white keys with fine
  // separators, black keys ~65% of the bed depth in groups of 2 and 3 (their centres measured along the bed)
  keyboard(L);
  deck2Parts(L);
  robotToy(L);
  // the ceiling's shadow over the tops of the stacks
  L.light(quad([[0, 0], [1060, 0], [1060, 110], [0, 110]]), lin(0, 0, 0, 110, [[0, 0.35], [1, 1]]), "multiply", 1);
}

// the robot toy in the cabinet opening (fix pass 1; 40.00: grey head x 930-962, y 332-362, body to y ~425, an arm)
function robotToy(L) {
  L.noTone = true;
  L.fill((c) => c.roundRect(930, 332, 32, 30, 6), lin(930, 0, 962, 0, [[0, 0.5], [1, 0.34]]), PI / 2, { style: 2 });
  L.fill((c) => c.roundRect(926, 364, 40, 58, 5), lin(926, 0, 966, 0, [[0, 0.44], [1, 0.28]]), PI / 2, { style: 2 });
  L.fill((c) => c.roundRect(914, 370, 11, 40, 4), 0.32, PI / 2, { style: 2 });
  for (const x of [940, 953]) { L.o.fillStyle = "rgba(0,0,0,0.85)"; L.o.beginPath(); L.o.arc(x, 346, 3, 0, 7); L.o.fill(); }
  edges(L, [[930, 332], [962, 332], [962, 362], [930, 362]], 1.6, "rgba(0,0,0,0.9)", 1880);
  edges(L, [[926, 364], [966, 364], [966, 422], [926, 422]], 1.6, "rgba(0,0,0,0.9)", 1884);
  L.line([[946, 332], [948, 318]], 1.4, "rgba(0,0,0,0.8)", 1888);
  L.noTone = false;
}
// the lower deck's front details (fix pass 1; drawn last in paintLeft so the tone table's fill order is kept)
function deck2Parts(L) {
  L.noTone = true;
  for (const [q, v] of [
    [[[614, 727], [634, 724], [634, 738], [614, 741]], 0.78], [[[644, 720], [665, 717], [665, 728], [644, 731]], 0.78],
    [[[630, 744], [667, 738], [667, 764], [630, 769]], 0.12], [[[502, 752], [529, 748], [529, 762], [502, 766]], 0.6],
    [[[532, 758], [626, 745], [626, 752], [532, 766]], 0.12],
  ]) { L.fill(quad(q), v, -0.15, { style: 2 }); edges(L, q, 1.5, "rgba(0,0,0,0.9)", 693 + q[0][0]); }
  L.fill(quad([[640, 748], [660, 745], [660, 754], [640, 757]]), 0.42, -0.15, { style: 2 });
  L.noTone = false;
}
// a pale cable (solid: it scales with the surface): dark edges, a grey body, a thin white highlight
function coil(L, pts, w, seed) {
  solid(() => {
    curve(L.o, pts, w, "rgba(5,5,5,0.95)", seed, { ends: 0.8 });
    curve(L.o, pts, w * 0.62, "rgba(128,128,124,0.95)", seed + 1, { ends: 0.7 });
    curve(L.o, pts.map(([x, y]) => [x - w * 0.1, y - w * 0.12]), Math.max(0.9, w * 0.14), "rgba(242,240,234,0.55)", seed + 2, { ends: 0.4 });
  });
}
// the keyboard (R40 px). Key bed: TL (848,440) TR (886,447) BR (952,729) BL (906,721); key lines slope ~0.17 down to
// the right (the bed's top and bottom edges). Black-key centres measured at 30% across the bed (y):
const KB_BLACK = [451, 460.5, 479, 489.5, 500, 519.5, 531.5, 550.5, 560.5, 572, 592.5, 604, 625, 636.5, 649, 671, 683.5, 704, 714.5];
function keyboard(L) {
  const o = L.o;
  L.noTone = true;
  const bed = [[848, 440], [886, 447], [952, 729], [906, 721]];
  // the bed parameter s whose point at u = 0.3 lies at height y
  const sAt = (y) => { let lo = 0, hi = 1; for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; if (quadAt(bed, 0.3, m)[1] < y) lo = m; else hi = m; } return (lo + hi) / 2; };
  // case: the side face (dark wood-grey, lit edge), the front panel (dark), the bevel between them
  const side = [[783, 414], [806, 409], [866, 758], [846, 764]];
  const front = [[806, 409], [888, 436], [957, 733], [866, 758]];
  L.fill(quad(side), lin(783, 0, 806, 0, [[0, 0.1], [1, 0.2]]), PI / 2 - 0.2, { spacing: 0.26, style: 0 });
  L.fill(quad(front), lin(806, 420, 957, 740, [[0, 0.3], [0.5, 0.26], [1, 0.2]]), 1.35, { spacing: 0.22, style: 2 });
  L.line([side[1], side[2]], 1.6, "rgba(242,240,234,0.55)", 861);
  L.line([side[0], side[1]], 1.4, "rgba(242,240,234,0.5)", 862);
  L.line([front[0], front[1]], 1.4, "rgba(242,240,234,0.45)", 863);
  edges(L, [side[0], front[1], front[2], side[3]], 2.4, "rgba(0,0,0,0.95)", 864);
  // inner bevel of the control strip
  L.line([[815, 424], [872, 740]], 1.1, "rgba(0,0,0,0.7)", 865);
  L.line([[817, 423], [874, 739]], 0.9, "rgba(242,240,234,0.3)", 866);
  // the column of small buttons at the top of the strip (x 828-842, y 440-495)
  for (let i = 0; i < 9; i++) {
    const y = 442 + i * 6.2, x = 829 + (y - 440) * 0.2;
    const b = [[x, y], [x + 11, y + 1.6], [x + 11.5, y + 4.2], [x + 0.5, y + 2.6]];
    L.fill(quad(b), 0.62 - (i % 2) * 0.1, 0.17, { style: 2 });
  }
  // two round buttons
  for (const [x, y] of [[845, 533], [857, 533]]) {
    L.fill(ell(x, y, 4.2, 3.6), 0.66, 0, { style: 2 });
    o.strokeStyle = "rgba(0,0,0,0.85)"; o.lineWidth = 1.3; o.beginPath(); o.ellipse(x, y, 4.2, 3.6, 0, 0, 7); o.stroke();
  }
  // the two slider windows: pale insets with a dark frame and a dark slot down the middle
  for (const w of [[[850, 558], [870, 558], [872, 610], [857, 610]], [[867, 627], [880, 627], [883, 663], [872, 663]]]) {
    L.fill(quad(w), lin(0, w[0][1], 0, w[2][1], [[0, 0.8], [1, 0.66]]), PI / 2, { style: 2 });
    edges(L, w, 1.8, "rgba(0,0,0,0.9)", 870 + w[0][1]);
    L.line([quadAt(w, 0.5, 0.08), quadAt(w, 0.5, 0.92)], 1.4, "rgba(0,0,0,0.6)", 871 + w[0][1]);
  }
  // key bed: white keys, lightly shaded toward the bottom and the far edge
  L.fill(quad(bed), lin(848, 440, 952, 729, [[0, 0.9], [0.6, 0.86], [1, 0.8]]), 0.17, { style: 2 });
  edges(L, bed, 1.8, "rgba(0,0,0,0.95)", 880);
  // white-key separators: at every black key and midway across the gaps (E-F, B-C)
  const seps = [];
  for (let i = 0; i < KB_BLACK.length; i++) {
    seps.push(KB_BLACK[i]);
    if (i < KB_BLACK.length - 1 && KB_BLACK[i + 1] - KB_BLACK[i] > 15) seps.push((KB_BLACK[i] + KB_BLACK[i + 1]) / 2);
  }
  seps.unshift(KB_BLACK[0] - 9.5);
  for (const y of seps) { const t = sAt(y); line(o, [quadAt(bed, 0, t), quadAt(bed, 1, t)], 1.1, "rgba(0,0,0,0.75)", 890 + Math.round(y)); }
  // black keys: a dark bar from the bed's near edge, 65% deep, a light top edge
  for (const y of KB_BLACK) {
    const t = sAt(y), h = 3.1 + (y - 440) * 0.0035;
    const dt = h / 290;
    const q = [quadAt(bed, 0, t - dt), quadAt(bed, 0.65, t - dt), quadAt(bed, 0.65, t + dt), quadAt(bed, 0, t + dt)];
    L.fill(quad(q), 0.05, 0.17, { style: 2 });
    line(o, [quadAt(bed, 0.02, t - dt * 0.6), quadAt(bed, 0.6, t - dt * 0.6)], 0.9, "rgba(242,240,234,0.35)", 900 + Math.round(y));
  }
  L.noTone = false;
}

// ================================================================= ASIDE: the dark boxes behind stack A (fix pass 1)
// Template matching of the source (40.00 -> 40.24..40.64) puts the dark column left of stack A at w 0.89, behind the
// stack's fronts (w 0.98-1.01): as the camera closes in the stack slides out faster and uncovers more of these boxes
// (source 40.64: dark grey boxes at x 1305-1440, where a single wall layer showed the black corridor behind).
function paintASide(L) {
  L.noTone = true;
  const seams = [140, 196, 252, 332, 394, 470, 550, 642, 724];
  for (let i = 0; i < seams.length - 1; i++) {
    const y0 = seams[i], y1 = seams[i + 1], x1 = 1340;
    const q = [[1200 + (i % 2) * 3, y0], [x1, y0], [x1, y1], [1202 + (i % 2) * 3, y1]];
    L.fill(quad(q), lin(1200, 0, 1340, 0, [[0, 0.09], [0.4, 0.13], [1, 0.16]]), PI / 2, { spacing: 0.3, style: 0 });
    L.line([[q[0][0] + 2, y0 + 1.5], [x1, y0 + 1.5]], 1.2, "rgba(242,240,234,0.3)", 1600 + i);
    L.line([q[3], q[2]], 1.8, "rgba(0,0,0,0.85)", 1620 + i);
  }
  L.noTone = false;
}

// ================================================================= RIGHT WALL: cartons, shelving, the lit panel, laptop, groovebox
function paintRight(L) {
  const o = L.o, r = rng(41);
  // dark hatched column between the corridor and the cartons
  // (fix pass 1: the shaded left faces of stack A, near-black at 40.00 with faint vertical grain, dark grey late in
  // the dolly: single-direction grain and the boxes' seams, no cross-hatch)
  // (fix pass 1: this column moved to its own layer, "aside", at the depth template matching gives it (w 0.89):
  // the fill is kept, transparent, so the tone table's fill order holds)
  L.fill(quad([[1204, 286], [1238, 280], [1238, 560], [1206, 560]]), 0.12, PI / 2, { spacing: 0.3, style: 0, alpha: 0 });
  // carton stack A (pale grey, dark outlines)
  const A = [
    [[1250, 134], [1356, 134], [1358, 194], [1250, 194]], [[1236, 194], [1352, 194], [1352, 250], [1236, 250]],
    [[1244, 250], [1366, 250], [1366, 330], [1244, 330]], [[1250, 330], [1380, 330], [1380, 392], [1250, 392]],
    [[1246, 392], [1380, 392], [1380, 548], [1246, 548]],
  ];
  // (fix pass 2, traced on a 2x grid of 40.04: the lower boxes show their left faces, the bottom one a broad one)
  const AS = [0.06, 0.06, 0.14, 0.14, 0.28];
  A.forEach((q, i) => carton(L, q, 0.4 + (i % 2) * 0.05, 900 + i * 10, { tape: i % 2 === 0, label: i === 4, flap: i !== 3, side: -1, sideW: AS[i], sideV: 0.55, over: i ? 0.65 : 0.3, ew: 4.5 }));
  // the tops of stack A catch a little light
  L.fill(quad([[1256, 126], [1352, 126], [1356, 134], [1250, 134]]), 0.5, 0, { spacing: 0.3, style: 2 });
  // carton stack B (catching the light on its right edge), small labels
  const B = [
    [[1380, 122], [1472, 122], [1484, 180], [1380, 184]], [[1380, 184], [1484, 180], [1484, 244], [1380, 248]],
    [[1382, 248], [1484, 244], [1484, 326], [1382, 326]], [[1382, 326], [1486, 326], [1486, 470], [1382, 470]],
    [[1382, 470], [1486, 470], [1486, 548], [1382, 548]],
  ];
  B.forEach((q, i) => carton(L, q, 0.5 + (i % 2) * 0.05, 960 + i * 10, { tape: i !== 3, label: i === 2 || i === 3, lit: -0.3, side: -1, sideW: 0.1, sideV: 0.7, band: [0.12, 0.32, 1.35], over: i ? 0.6 : 0.25, ew: 4.5 }));
  // the stacks carry on down to the floor behind the desk (hidden at 40.00, uncovered as the desk slides out of
  // frame late in the dolly: source 40.60-40.72 shows cartons down to the floor there)
  carton(L, [[1244, 548], [1380, 548], [1382, 640], [1246, 640]], 0.34, 990, { tape: true });
  carton(L, [[1246, 640], [1382, 640], [1384, 722], [1248, 722]], 0.3, 995, { tape: false, label: true });
  carton(L, [[1382, 548], [1488, 548], [1490, 650], [1384, 650]], 0.44, 1000, { tape: false, label: true, lit: 0.4 });
  carton(L, [[1384, 650], [1490, 650], [1492, 730], [1386, 730]], 0.38, 1005, { tape: true, lit: 0.4 });
  L.fill(quad([[1206, 560], [1246, 560], [1248, 730], [1208, 730]]), 0.1, PI / 2, { spacing: 0.3, style: 0, alpha: 0 });
  // shelving: dark back and the bays (reaching past the frame edge so the dolly never shows a hard border)
  L.fill(quad([[1486, 0], [2360, 0], [2360, 560], [1486, 552]]), lin(1486, 0, 2360, 0, [[0, 0.18], [0.4, 0.14], [0.85, 0.08], [1, 0.04]]), PI / 2, { spacing: 0.35, style: 0 });
  carton(L, [[1508, 56], [1590, 52], [1592, 168], [1510, 172]], 0.42, 1020, { tape: false, label: true });
  // left bay: a board with cables looped over it; right bay: two long boards climbing to the right
  // (retraced on a 2x grid of 40.00: the left-bay board's front runs (1490,300)-(1690,240), 30 px thick)
  board(L, [[1490, 300], [1690, 240], [1690, 272], [1490, 332]], 0.46, 1030, { ang: -0.3, n: 9, litEdge: 0.7 });
  board(L, [[1490, 332], [1690, 272], [1690, 282], [1490, 344]], 0.12, 1031, { ang: -0.3, n: 2, litEdge: 0 });
  board(L, [[1706, 262], [2136, 50], [2136, 96], [1708, 290]], 0.5, 1040, { ang: -0.45, n: 14, litEdge: 0.6 });
  board(L, [[1708, 306], [2136, 104], [2136, 118], [1710, 322]], 0.12, 1042, { ang: -0.45, n: 3, litEdge: 0 });
  board(L, [[1706, 92], [2136, -110], [2136, -64], [1708, 132]], 0.34, 1041, { ang: -0.42, n: 10, litEdge: 0.4 });
  // cables (fix pass 1: the source's are grey tubes with dark edges and a highlight, coiled on the boards and hanging
  // over their edges, not black noodles)
  const sag = (a, b, h, n = 10) => Array.from({ length: n + 1 }, (_, i) => { const t = i / n; return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t + h * 4 * t * (1 - t)]; });
  for (let i = 0; i < 6; i++) {
    const x0 = 1535 + i * 24 + r() * 12, y0 = 300 - (x0 - 1490) * 0.47 - 6, x1 = x0 + 34 + r() * 40;
    const pts = sag([x0, y0], [x1, 300 - (x1 - 1490) * 0.47 - 4 + r() * 10], 26 + r() * 40);
    coil(L, pts, 5.2, 1050 + i * 3); L.cover((c) => { c.moveTo(pts[0][0], pts[0][1]); for (const p of pts) c.lineTo(p[0], p[1]); });
  }
  for (let i = 0; i < 4; i++) {
    const x0 = 1760 + i * 70 + r() * 20, y0 = 268 - (x0 - 1711) * 0.57, x1 = x0 + 50 + r() * 50;
    const pts = sag([x0, y0 - 4], [x1, 268 - (x1 - 1711) * 0.57 - 4], 30 + r() * 40);
    coil(L, pts, 5.4, 1080 + i * 3);
    const q2 = sag([x0 + 10, y0 - 150 * 0.6], [x1 + 6, 268 - (x1 + 6 - 1711) * 0.57 - 90], 24 + r() * 30);
    coil(L, q2, 5, 1100 + i * 3);
  }
  coil(L, [[1548, 286], [1552, 318], [1560, 348], [1566, 372]], 5.5, 1120);
  coil(L, [[1606, 262], [1610, 296], [1622, 332], [1628, 358]], 5, 1122);
  // the plug cable hanging straight down in the right bay
  hang(L, [[1888, 140], [1892, 200], [1888, 260], [1890, 318]], 5, 1125, 0.35);
  L.fill((c) => c.roundRect(1882, 316, 14, 36, 3), 0.42, PI / 2, { spacing: 0.3, style: 2 });
  // posts
  for (const [q, v, s] of [[[[1482, 200], [1500, 196], [1500, 552], [1484, 552]], 0.4, 1090], [[[1680, 24], [1706, 20], [1708, 544], [1684, 544]], 0.32, 1091], [[[2130, -10], [2190, -10], [2196, 720], [2136, 720]], 0.24, 1092]]) {
    board(L, q, v, s, { dir: "v", ang: PI / 2, litEdge: 0.3, n: 5 });
  }
  L.fill(quad([[2190, -10], [2360, -10], [2360, 720], [2196, 720]]), lin(2190, 0, 2360, 0, [[0, 0.14], [1, 0.05]]), PI / 2, { spacing: 0.3, style: 2 });
  // the lit panel behind the laptop: a narrow tall slab, the brightest thing in the room, a soft halo round it and
  // dust sparkling in the dark to its left (source 40.00: x 1645-1700, y 285-490)
  L.fill(quad([[1560, 286], [1640, 284], [1640, 500], [1560, 504]]), 0.05, 0, { spacing: 0.3, style: 2 });
  L.light((c) => c.ellipse(1672, 390, 95, 150, 0, 0, 7), rad(1672, 390, 10, 150, [[0, 0.5], [0.5, 0.22], [1, 0]]), "lighten", 1);
  L.fill(quad([[1646, 286], [1700, 284], [1702, 492], [1648, 494]]), lin(1646, 0, 1702, 0, [[0, 0.8], [0.3, 0.95], [1, 0.9]]), PI / 2, { style: 2 });
  L.line([[1646, 286], [1648, 494]], 1.8, "rgba(0,0,0,0.5)", 1095);
  // (fix pass 1: the dust hangs in the lamp's beam: a lit haze behind it, brightest by the slab, dark specks as well
  // as bright ones; source 40.00 x 1560-1645, y 290-420 is a grey haze, not a black starfield)
  L.light(quad([[1558, 288], [1648, 284], [1648, 440], [1558, 452]]), lin(1558, 0, 1648, 0, [[0, 0.16], [0.6, 0.36], [1, 0.52]]), "lighten", 1);
  const rs = rng(4107);
  for (let i = 0; i < 70; i++) {
    const x = 1564 + rs() * 80, y = 292 + rs() * 140, sz = 0.6 + rs() * 1.1;
    o.fillStyle = `rgba(0,0,0,${0.3 + rs() * 0.4})`; o.beginPath(); o.arc(x, y, sz, 0, 7); o.fill();
  }
  for (let i = 0; i < 110; i++) {
    const x = 1566 + r() * 78, y = 292 + r() * 120, sz = 0.7 + r() * 1.4;
    o.fillStyle = `rgba(250,250,245,${0.35 + r() * 0.6})`; o.beginPath(); o.arc(x, y, sz, 0, 7); o.fill();
  }
  // the laptop: a pale bezel, a dark cracked screen with a lit patch, the keyboard deck in front
  const mon = [[1504, 384], [1642, 378], [1644, 502], [1506, 506]];
  L.fill(quad(mon), lin(1504, 384, 1644, 502, [[0, 0.58], [1, 0.68]]), 0, { spacing: 0.22, style: 2 });
  const ms = [[1516, 395], [1630, 390], [1632, 492], [1518, 496]];
  L.fill(quad(ms), lin(1516, 395, 1632, 492, [[0, 0.1], [0.55, 0.16], [0.8, 0.3], [1, 0.4]]), 0.9, { spacing: 0.26, style: 2 });
  edges(L, ms, 2, "rgba(0,0,0,0.9)", 1101);
  edges(L, mon, 2.6, "rgba(0,0,0,0.9)", 1100);
  o.save(); o.beginPath(); poly(ms)(o); o.clip(); o.__clip = (x, y) => inside(ms, x, y);
  const hub = [1580, 440];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * 2 * PI + r() * 0.5, L1 = 30 + r() * 50;
    const p1 = [hub[0] + Math.cos(a) * L1, hub[1] + Math.sin(a) * L1 * 0.8], m = [(hub[0] + p1[0]) / 2 + (r() - 0.5) * 12, (hub[1] + p1[1]) / 2 + (r() - 0.5) * 12];
    line(o, [hub, m, p1], 1.1, "rgba(215,215,210,0.55)", 1110 + i, 0.2);
    if (r() < 0.6) line(o, [m, [m[0] + (r() - 0.5) * 30, m[1] + (r() - 0.5) * 24]], 0.9, "rgba(215,215,210,0.4)", 1130 + i, 0.2);
  }
  o.restore(); o.__clip = null;
  const deck = [[1440, 506], [1650, 500], [1664, 530], [1426, 538]];
  L.fill(quad(deck), 0.46, 0.05, { spacing: 0.2, style: 2 });
  for (let row = 0; row < 3; row++) for (let i = 0; i < 16; i++) {
    const a = quadAt(deck, (i + 0.15) / 16, 0.18 + row * 0.26), b = quadAt(deck, (i + 0.85) / 16, 0.36 + row * 0.26);
    o.fillStyle = "rgba(0,0,0,0.45)"; o.fillRect(a[0], a[1], b[0] - a[0], Math.max(1.5, b[1] - a[1]));
  }
  edges(L, deck, 2, "rgba(0,0,0,0.9)", 1140);
  L.fill(ell(1522, 540, 17, 7, -0.05), 0.66, 0, { style: 2 });
  // the thin stand leg under the synth; the far right sinks into shadow
  L.line([[2134, 296], [2030, 520]], 2.4, "rgba(150,150,146,0.5)", 1201);
  L.light(quad([[2040, -10], [2360, -10], [2360, 560], [2040, 560]]), 0, "source-over", 0.3);
}

// ================================================================= SYNTH: the groovebox on the right end of the desk
// its own layer: optical flow on the source puts it nearer than the wall behind it (w ~1.75-1.8 over 40.00-40.16)
function paintSynth(L) {
  const o = L.o, r = rng(43);
  // the groovebox: a dark sloped unit (value ~0.3), an LCD and rows of dark knobs and pads on its top, a short
  // keybed along the near edge, a dark front edge (traced from the 40.00 grid, snapshots/s14-src/qD.jpg)
  const pan = [[1636, 500], [1758, 372], [2134, 296], [2058, 446]];
  // (quadAt(pan, u, v): u runs from the near edge back, v from left to right)
  L.fill(quad(pan), lin(1636, 450, 2134, 300, [[0, 0.34], [0.5, 0.28], [1, 0.16]]), -0.2, { spacing: 0.24, style: 2 });
  mottle(L, pan, 1149, 0.12);
  edges(L, pan, 2.8, "rgba(0,0,0,0.95)", 1150);
  L.line([pan[1], pan[2]], 1.8, "rgba(242,240,234,0.45)", 1151);
  const keys = [quadAt(pan, 0.02, 0.1), quadAt(pan, 0.3, 0.1), quadAt(pan, 0.3, 0.66), quadAt(pan, 0.02, 0.66)];
  L.fill(quad(keys), lin(1700, 480, 1980, 430, [[0, 0.72], [0.7, 0.6], [1, 0.36]]), -0.2, { spacing: 0.2, style: 2 });
  const NK = 22;
  for (let i = 0; i <= NK; i++) { const a = quadAt(keys, 0, i / NK), b = quadAt(keys, 1, i / NK); L.line([a, b], 1.2, "rgba(0,0,0,0.8)", 1160 + i); }
  for (let i = 0; i < NK; i++) {
    if (![1, 2, 4, 5, 6].includes(i % 7)) continue;
    const q = [quadAt(keys, 0.4, (i + 0.65) / NK), quadAt(keys, 1, (i + 0.65) / NK), quadAt(keys, 1, (i + 1.35) / NK), quadAt(keys, 0.4, (i + 1.35) / NK)];
    L.fill(quad(q), 0.04, 0, { style: 2 });
  }
  edges(L, keys, 1.8, "rgba(0,0,0,0.9)", 1159);
  // knob rows on the left of the top, pads in the middle, the LCD at the back right, a row of small buttons
  for (let row = 0; row < 3; row++) for (let i = 0; i < 5; i++) {
    const p = quadAt(pan, 0.45 + row * 0.15, 0.12 + i * 0.055);
    o.fillStyle = "rgba(0,0,0,0.9)"; o.beginPath(); o.ellipse(p[0], p[1], 8, 6.5, -0.2, 0, 7); o.fill();
    o.fillStyle = "rgba(242,240,234,0.4)"; o.beginPath(); o.ellipse(p[0] - 1.5, p[1] - 2, 2.6, 2, -0.2, 0, 7); o.fill();
  }
  for (let row = 0; row < 4; row++) for (let i = 0; i < 4; i++) {
    const u0 = 0.38 + row * 0.1, v0 = 0.42 + i * 0.05;
    const pq = [quadAt(pan, u0, v0), quadAt(pan, u0 + 0.07, v0), quadAt(pan, u0 + 0.07, v0 + 0.038), quadAt(pan, u0, v0 + 0.038)];
    L.fill(quad(pq), 0.44, -0.2, { style: 2 }); edges(L, pq, 1.1, "rgba(0,0,0,0.85)", 1170 + row * 4 + i);
  }
  const disp = [quadAt(pan, 0.55, 0.68), quadAt(pan, 0.88, 0.68), quadAt(pan, 0.88, 0.86), quadAt(pan, 0.55, 0.86)];
  L.fill(quad(disp), 0.1, 0, { spacing: 0.3, style: 2 });
  edges(L, disp, 1.8, "rgba(242,240,234,0.42)", 1152);
  for (let i = 0; i < 6; i++) { const p = quadAt(pan, 0.4, 0.66 + i * 0.045); o.fillStyle = "rgba(242,240,234,0.4)"; o.fillRect(p[0] - 6, p[1] - 2.5, 12, 5); }
  const fr = [[1636, 500], [2058, 446], [2062, 474], [1640, 534]];
  L.fill(quad(fr), 0.1, -0.1, { spacing: 0.3, style: 2 });
  edges(L, fr, 2, "rgba(0,0,0,0.9)", 1200);
}

// ================================================================= UNDER THE DESK: cartons in the shadow of the top
function paintUnder(L) {
  L.fill(quad([[1240, 640], [2360, 640], [2360, 1010], [1240, 1010]]), 0.06, 0, { spacing: 0.4, style: 2 });
  // fix pass 2, re-traced on a 2x grid of 40.08 (mapped back to R40 with this layer's depth): a big carton seen
  // corner-on, its lit front face turned to the left, a broad hatched right side, a lit parallelogram top; a second
  // tall carton behind it to the right, lit on its front
  const FL = [1255, 702], FR = [1418, 736], BR = [1571, 700], BL = [1408, 670];
  const top = [FL, BL, BR, FR];
  L.fill(quad(top), lin(1255, 700, 1571, 700, [[0, 0.62], [0.5, 0.56], [1, 0.44]]), 0.25, { spacing: 0.24, style: 0 });
  mottle(L, top, 1299, 0.1);
  L.line([quadAt(top, 0.02, 0.5), quadAt(top, 0.98, 0.5)], 1.8, "rgba(0,0,0,0.6)", 1300);
  shadeHatch(L, top, 0.35, 1302, { from: 0, ang: 0.3, sp: 5 });
  const fr = [FL, FR, [1418, 912], [1255, 879]];
  carton(L, fr, 0.6, 1310, { tape: false, label: true, flap: false, lit: 0.2, over: 0 });
  grain(L.o, fr, 10, { dir: "v", w: 1.6, color: "rgba(0,0,0,0.25)", seed: 1311, len: [0.3, 0.9], wav: 0.006 });
  const sd = [FR, BR, [1571, 874], [1418, 912]];
  carton(L, sd, 0.3, 1320, { tape: false, flap: false, hatch: true, ang: 0.8, over: 0 });
  edges(L, top, 3, "rgba(0,0,0,0.9)", 1330);
  // the second carton (front x 1611-1805), lit on its front, dark to the right
  carton(L, [[1611, 696], [1805, 696], [1805, 921], [1611, 921]], 0.5, 1340, { tape: false, lit: -0.4, band: [0.05, 0.45, 1.2], over: 0.5 });
  L.fill(quad([[1805, 690], [1860, 700], [1860, 921], [1805, 921]]), 0.1, PI / 2, { spacing: 0.3, style: 1 });
  // floor shadow under the desk
  L.light(quad([[1240, 900], [2360, 900], [2360, 1010], [1240, 1010]]), 0, "source-over", 0.5);
}

// ================================================================= DESK: top plank, apron, legs, cables over the edge
function paintDeskBase(L) {
  const o = L.o;
  // apron under the top
  // (fix pass 2: the apron is lit along its length to the right leg at x ~1806, then the desk sinks into shadow)
  const ap = [[1252, 604], [1806, 602], [1806, 652], [1252, 652]];
  L.fill(quad(ap), lin(1252, 0, 1806, 0, [[0, 0.56], [0.6, 0.5], [1, 0.36]]), 0.0, { spacing: 0.26 });
  L.fill(quad([[1806, 602], [2360, 598], [2360, 654], [1806, 652]]), lin(1806, 0, 2360, 0, [[0, 0.14], [1, 0.03]]), 0.0, { spacing: 0.26 });
  grain(o, ap, 10, { dir: "u", w: 1.6, color: "rgba(0,0,0,0.55)", seed: 1400, len: [0.3, 1], wav: 0.02 });
  grain(o, ap, 6, { dir: "u", w: 1.2, color: "rgba(242,240,234,0.3)", seed: 1401, len: [0.2, 0.6], wav: 0.02 });
  edges(L, ap, 2.4, "rgba(0,0,0,0.9)", 1402);
  // left leg
  const lg = [[1190, 600], [1252, 600], [1252, 900], [1194, 900]];
  L.fill(quad(lg), lin(1190, 0, 1252, 0, [[0, 0.5], [0.45, 0.6], [1, 0.3]]), PI / 2, { spacing: 0.24 });
  grain(o, lg, 8, { dir: "v", w: 1.6, color: "rgba(0,0,0,0.55)", seed: 1410, len: [0.3, 1] });
  grain(o, lg, 5, { dir: "v", w: 1.2, color: "rgba(242,240,234,0.4)", seed: 1411, len: [0.2, 0.6] });
  edges(L, lg, 2.4, "rgba(0,0,0,0.9)", 1412);
  L.fill(quad([[1252, 652], [1270, 652], [1270, 900], [1252, 900]]), 0.08, PI / 2, { spacing: 0.3 });
  // right leg (in shadow)
  board(L, [[1808, 652], [1869, 652], [1869, 922], [1808, 922]], 0.36, 1420, { dir: "v", ang: PI / 2, litEdge: 0.3, n: 6 });
  // cables slung over the front edge and hanging down to the floor
  for (const [pts, w] of [
    [[[1592, 600], [1576, 640], [1590, 720], [1610, 780], [1640, 840]], 7],
    [[[1612, 600], [1604, 650], [1624, 730], [1660, 790]], 6],
    [[[1660, 600], [1700, 650], [1760, 690], [1800, 740]], 6],
  ]) {
    solid(() => { curve(o, pts, w, "rgba(6,6,6,0.95)", 1460 + w); curve(o, pts.map(([x, y]) => [x - w * 0.25, y]), 1.2, "rgba(242,240,234,0.35)", 1470 + w); });
    curve(L.a, pts, w, "#fff", 1);
  }
}
function paintDeskTop(L) {
  const o = L.o, r = rng(61);
  // the top plank's front face: bright weathered wood on the left, sinking into shadow on the right
  // (fix pass 2: luma profiles of 40.00 put the lit face at y 554 -> 590 at x 1200, 597 at 1400, 606 at 1700: the
  // plank's lower edge slopes down to the right; a dark underside shows below it)
  L.fill(quad([[1150, 588], [2174, 612], [2174, 622], [1150, 604]]), 0.06, 0.0, { spacing: 0.3, style: 2 });
  const tp = [[1152, 555], [2174, 551], [2174, 620], [1150, 590]];
  L.fill(quad(tp), lin(1150, 0, 2174, 0, [[0, 0.7], [0.3, 0.66], [0.6, 0.56], [0.75, 0.34], [0.9, 0.14], [1, 0.08]]), 0.0, { spacing: 0.24 });
  // (fix pass 1: the source's plank carries dense grain streaks that grow with it as the camera closes in: the
  // desk group's strokes are solid, VEC.kind 1, see LAYERS)
  grain(o, tp, 18, { dir: "u", w: 1.8, color: "rgba(0,0,0,0.5)", seed: 1430, len: [0.1, 0.5], wav: 0.03 });
  grain(o, tp, 10, { dir: "u", w: 1.4, color: "rgba(242,240,234,0.55)", seed: 1431, len: [0.1, 0.4], wav: 0.03 });
  grain(o, tp, 30, { dir: "u", w: 0.9, color: "rgba(0,0,0,0.35)", seed: 1432, len: [0.05, 0.3], wav: 0.02 });
  grain(o, tp, 16, { dir: "u", w: 0.8, color: "rgba(242,240,234,0.4)", seed: 1433, len: [0.05, 0.25], wav: 0.02 });
  for (let i = 0; i < 6; i++) { const x = 1200 + r() * 700, y = 566 + r() * 28; curve(o, [[x, y], [x + 14, y - 3], [x + 26, y], [x + 14, y + 3], [x, y]], 1.2, "rgba(0,0,0,0.45)", 1440 + i); }
  L.line([[1152, 556], [2174, 550]], 2, "rgba(242,240,234,0.8)", 1450);
  L.line([[1150, 590], [2174, 620]], 2.8, "rgba(0,0,0,0.95)", 1451);
  // (fix pass 1: the plank's end is squared off; the 4 px bulge here grew into a dark chevron 9x magnified at 40.64)
  L.line([[1152, 556], [1150.5, 573], [1150, 590]], 2.2, "rgba(0,0,0,0.9)", 1452);
  // the desk top surface just visible behind the plank's edge (a thin dark band)
  L.fill(quad([[1160, 546], [2174, 540], [2174, 551], [1156, 557]]), 0.12, 0, { spacing: 0.3 });
  // the cables where they cross the plank
  for (const [pts, w] of [[[[1592, 540], [1580, 570], [1576, 606]], 7], [[[1616, 542], [1606, 580], [1604, 606]], 6], [[[1648, 548], [1660, 606]], 6]]) {
    solid(() => { curve(o, pts, w, "rgba(6,6,6,0.95)", 1460 + w); curve(o, pts.map(([x, y]) => [x - w * 0.25, y]), 1.2, "rgba(242,240,234,0.35)", 1470 + w); });
    curve(L.a, pts, w, "#fff", 1);
  }
}

// ---------------------------------------------------------------- build all layers
// planes: w(u,v) = a*u + b*v + c (1 = the keyboard's depth)
// rects reach ~150 px past the frame edges (the dolly pulls the plate borders into view otherwise)
export const LAYERS = [
  { name: "back", rect: [0, 0, 2206, 946], sc: 1, plane: [0, 0, 0.78], paint: paintBack, opaque: true, blurK: 0 },
  { name: "ceiling", rect: [300, -40, 1900, 200], sc: 1.5, plane: [0, -1 / 600, 643 / 600], paint: paintCeiling, blurK: 0.3 },
  { name: "floor", rect: [-160, 640, 2370, 1010], sc: 1.5, plane: [0, 1 / 100, -6.43], paint: paintFloor, contrast: 1.1, blurK: 0.35 },
  // (fix pass 1: scale-compensated template matching 40.00 -> 40.24..40.64 puts the left wall ~0.04 farther than this
  // plane had it: w 1.00 at the keyboard, 1.09 at (600,200), 1.21 at (300,450), 0.91-0.95 at (1000,400))
  { name: "left", rect: [-160, -20, 1060, 1010], sc: 2, plane: [-0.00039, 0, 0.98 + 975 * 0.00039 - 0.04], paint: paintLeft, blurK: 0.2 },
  // fix pass 1: optical flow (40.00-40.24) gives w 0.99 at stack A, 1.05 at stack B, 1.06 at the laptop -> gentler slope
  { name: "aside", rect: [1180, 120, 1345, 740], sc: 2, plane: [0, 0, 0.89], paint: paintASide, blurK: 0.5 },
  { name: "right", rect: [1100, -20, 2360, 740], sc: 2, plane: [0.00045, 0, 0.98 - 1300 * 0.00045], paint: paintRight, blurK: 0.6 },
  { name: "synth", rect: [1600, 270, 2200, 560], sc: 2, plane: [0, 0, 1, 1.75, 1.45], paint: paintSynth, blurK: 0.8 },
  // fix pass 2 (build 2): the desk group scales isotropically about its own focus of expansion, x 1105 and a y that
  // climbs from ~626 to ~598 (s14.js DESK_CY): measured from the plank's left end on 50/25 px grids of every frame
  // 40.00-40.64 (front-face height 34 -> 310 px, i.e. magnification 1 -> 9.1). The plank's inverse depth is 1.62 at
  // its left end and grows 0.0006 per px to the right (its top edge tilts up to the right late in the move).
  { name: "under", solid: true, rect: [1236, 636, 2360, 1010], sc: 1.5, plane: [0.0004, 0, 1.5 - 1155 * 0.0004], paint: paintUnder, blurK: 0.8 },
  { name: "deskBase", solid: true, rect: [1180, 590, 2360, 1010], sc: 2, plane: [0.0006, 0, 1.6 - 1155 * 0.0006], paint: paintDeskBase, blurK: 0.9 },
  { name: "deskTop", solid: true, rect: [1136, 530, 2360, 616], sc: 2.5, plane: [0.0006, 0, 1.62 - 1155 * 0.0006], paint: paintDeskTop, blurK: 1, slices: 24 },
];

// the charcoal finish (s14/paint.js); null restores the flat engraved mix
export const PAINT = { hatchK: 0.4, streakK: 0.14, mottleK: 0.18, occK: 0.9, scratchK: 0.18, lift: 1 };
export function buildLayers(only = null) {
  const out = [];
  for (const D of LAYERS) {
    if (only && !only.includes(D.name)) continue;
    const L = new Lay(D.rect, D.sc, D.name);
    const k0 = VEC.kind; if (D.solid) VEC.kind = 1;
    D.paint(L);
    VEC.kind = k0;
    inkStrokes(L, D.name);
    const pk = L.pack(D.opaque);
    out.push({ ...D, pk, fin: { seed: 3 + out.length * 7, contrast: D.contrast ?? 1.2, ...PAINT, ...(D.paintOpts || {}) } });
  }
  return out;
}
