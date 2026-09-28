// s14 room: the lit corridor of boxes and gear the owl flies into. Painted flat, as layers, in R40 coordinates
// (= the 40.00 s source frame, where the room first fills the screen). Every shape was traced from 2x labelled
// grids of that frame (snapshots/s14-src/qA..qD.jpg). Each layer gets an inverse-depth plane w(u,v) (measured
// with optical flow over 40.00-40.20: see fidelity/s14.md) so the forward dolly after 40.0 s shows parallax.
import { Plate, engraveCanvases } from "../../lib/engrave.js";
import { INK, DARK, grey, rng, taper, poly, blob, ell, lin, rad, line, curve, stroke, quadAt, grain } from "./kit.js";

const PI = Math.PI;
const mk = (w, h) => { const c = document.createElement("canvas"); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; };

// A layer: an engraving plate plus a coverage (alpha) canvas, both in R40 coordinates through an offset.
class Lay {
  constructor(rect, sc) {
    const [x0, y0, x1, y1] = rect;
    this.rect = rect; this.sc = sc;
    this.P = new Plate(x1 - x0, y1 - y0, sc);
    for (const g of [this.P.v, this.P.d, this.P.o]) g.translate(-x0, -y0);
    this.A = mk((x1 - x0) * sc, (y1 - y0) * sc);
    this.a = this.A.getContext("2d");
    this.a.scale(sc, sc); this.a.translate(-x0, -y0);
    this.a.fillStyle = "#fff"; this.a.strokeStyle = "#fff"; this.a.lineJoin = "round"; this.a.lineCap = "round";
  }
  get o() { return this.P.o; }
  fill(path, value, angle, opts = {}) {
    this.P.fill(path, value, angle, opts);
    if ((opts.alpha ?? 1) > 0.5) { this.a.beginPath(); path(this.a); this.a.fill(); }
  }
  light(path, value, op = "source-over", alpha = 1) { this.P.light(path, value, op, alpha); }
  cover(path) { this.a.beginPath(); path(this.a); this.a.fill(); }
  // contour helpers that also count as coverage
  line(pts, w, color = INK, seed = 1, ends = 0.45) { line(this.o, pts, w, color, seed, ends); line(this.a, pts, w, "#fff", seed, ends); }
  curve(pts, w, color = INK, seed = 1, o = {}) { curve(this.o, pts, w, color, seed, o); curve(this.a, pts, w, "#fff", seed, o); }
  // The source room is a soft tonal painting with a fine hatched texture, not a pure line cut: engrave the plate
  // twice (lines, and the same value as flat tone) and mix them, then lay the contour overlay on top.
  finish(opts, opaque = false, flat = 0.55) {
    const P = this.P;
    const lines = engraveCanvases(P.valC, P.dirC, opts);
    const dg = P.dirC.getContext("2d");
    const im = dg.getImageData(0, 0, P.dirC.width, P.dirC.height), dd = im.data;
    for (let i = 2; i < dd.length; i += 4) dd[i] = 2;
    dg.putImageData(im, 0, 0);
    const tone = engraveCanvases(P.valC, P.dirC, opts);
    const cut = document.createElement("canvas"); cut.width = lines.width; cut.height = lines.height;
    const g = cut.getContext("2d");
    g.drawImage(lines, 0, 0);
    g.globalAlpha = flat; g.drawImage(tone, 0, 0); g.globalAlpha = 1;
    g.drawImage(P.overC, 0, 0);
    if (!opaque) {
      g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
      g.globalCompositeOperation = "destination-in"; g.drawImage(this.A, 0, 0);
      g.restore();
    }
    this.P = null; this.A = null; this.a = null;
    return cut;
  }
}

// helpers -----------------------------------------------------------------------------------------------
const quad = (q) => poly(q);
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
function edges(L, q, w, color, seed = 1, closed = true) {
  const pts = closed ? [...q, q[0]] : q;
  for (let i = 0; i < pts.length - 1; i++) L.line([pts[i], pts[i + 1]], w, color, seed + i);
}
// a cardboard carton face: soft tone, brush grain, dark seams, a tape strip, maybe a small label
function carton(L, q, v, seed, { grainDir = "v", tape = true, label = false, lit = 0, edge = "rgba(8,8,8,0.9)", ang = PI / 2 } = {}) {
  const r = rng(seed);
  const [a, b, c, d] = q;
  L.fill(quad(q), lin(a[0], a[1], b[0], c[1], [[0, v * (1.1 - lit * 0.3)], [0.5, v], [1, v * (0.8 + lit * 0.5)]]), ang, { spacing: 0.3 });
  mottle(L, q, seed + 17, 0.3);
  grain(L.o, q, 10 + Math.round(r() * 8), { dir: grainDir, w: 1.6, color: `rgba(0,0,0,${0.35 + r() * 0.2})`, seed: seed + 3, len: [0.3, 0.9], wav: 0.01 });
  grain(L.o, q, 5, { dir: grainDir, w: 1.2, color: `rgba(242,240,234,${0.1 + v * 0.25})`, seed: seed + 5, len: [0.2, 0.6], wav: 0.01 });
  if (tape) { const t0 = 0.4 + r() * 0.2; L.line([quadAt(q, 0, t0), quadAt(q, 1, t0 + (r() - 0.5) * 0.04)], 1.4, "rgba(0,0,0,0.55)", seed + 7); }
  if (label) {
    const u0 = 0.3 + r() * 0.35, v0 = 0.25 + r() * 0.3, du = 0.18, dv = 0.12;
    const lq = [quadAt(q, u0, v0), quadAt(q, u0 + du, v0), quadAt(q, u0 + du, v0 + dv), quadAt(q, u0, v0 + dv)];
    edges(L, lq, 1.3, "rgba(0,0,0,0.75)", seed + 11);
  }
  edges(L, q, 2.2, edge, seed + 13);
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
function cable(o, pts, w, seed, { body = 0.42, hi = 0.75 } = {}) {
  curve(o, pts, w, "rgba(4,4,4,0.95)", seed);
  curve(o, pts, w * 0.55, `rgba(${Math.round(body * 255)},${Math.round(body * 253)},${Math.round(body * 248)},0.95)`, seed + 1);
  curve(o, pts.map(([x, y]) => [x - w * 0.12, y - w * 0.12]), Math.max(0.8, w * 0.14), `rgba(242,240,234,${hi})`, seed + 2);
}
// wood board: tone with running grain and a lit edge
function board(L, q, v, seed, { dir = "u", ang = 0, litEdge = 0.6, n = 14 } = {}) {
  L.fill(quad(q), v, ang, { spacing: 0.28 });
  grain(L.o, q, n, { dir, w: 1.5, color: "rgba(0,0,0,0.5)", seed, len: [0.3, 1], wav: 0.015 });
  grain(L.o, q, Math.round(n * 0.6), { dir, w: 1.2, color: `rgba(242,240,234,${0.15 + v * 0.3})`, seed: seed + 1, len: [0.2, 0.7], wav: 0.015 });
  if (litEdge > 0) L.line([q[0], q[1]], 1.6, `rgba(242,240,234,${litEdge})`, seed + 2);
  edges(L, q, 1.8, "rgba(6,6,6,0.85)", seed + 3);
}

// ================================================================= BACK: black corridor, faint far clutter
function paintBack(L) {
  // the far end of the corridor: black, with the faintest suggestion of stacked boxes
  const r = rng(5);
  for (let i = 0; i < 9; i++) {
    const x = 1030 + r() * 190, y = 180 + r() * 380, w = 30 + r() * 40, h = 24 + r() * 30;
    L.fill(quad([[x, y], [x + w, y], [x + w, y + h], [x, y + h]]), 0.025 + r() * 0.02, PI / 2, { spacing: 0.4 });
  }
}

// ================================================================= CEILING: dark planks converging on the corridor
function paintCeiling(L) {
  const VP = [1120, 330];
  const top = [[560, 0], [1640, 0], [1560, 110], [1480, 140], [1230, 132], [1100, 150], [900, 170], [760, 150]];
  // wedges so the stroke direction follows the planks toward the vanishing point
  const N = 18;
  for (let i = 0; i < N; i++) {
    const x0 = 560 + (1080 * i) / N, x1 = 560 + (1080 * (i + 1)) / N;
    const q = [[x0, 0], [x1, 0], mix([x1, 0], VP, 0.42), mix([x0, 0], VP, 0.42)];
    const ang = Math.atan2(VP[1], VP[0] - (x0 + x1) / 2);
    L.P.fill(poly(q), lin(0, 0, 0, 150, [[0, 0.16], [0.6, 0.1], [1, 0.04]]), ang, { spacing: 0.25 });
  }
  L.cover(poly(top));
  // plank seams: dark lines toward the vanishing point, a few pale streaks
  const r = rng(8);
  for (let i = 0; i < 26; i++) {
    const x = 560 + i * 42 + r() * 20;
    const p0 = [x, 0], p1 = mix(p0, VP, 0.34 + r() * 0.08);
    line(L.o, [p0, p1], 2, "rgba(0,0,0,0.7)", 30 + i);
    if (r() < 0.6) { const q0 = mix(p0, VP, 0.02 + r() * 0.1), q1 = mix(p0, VP, 0.18 + r() * 0.16); line(L.o, [[q0[0] + 8, q0[1]], [q1[0] + 6, q1[1]]], 1.3, `rgba(242,240,234,${0.12 + r() * 0.2})`, 60 + i); }
  }
  // the ceiling fades into black toward the corridor
  L.light(poly([[700, 110], [1560, 100], [1500, 170], [760, 190]]), 0, "source-over", 0.6);
}

// ================================================================= FLOOR: planks toward the corridor, a pool of light
function paintFloor(L) {
  const VP = [1104, 643];
  // wedges of planks: stroke direction toward the vanishing point
  const xs = [];
  for (let x = -1400; x <= 3600; x += 120) xs.push(x);
  for (let i = 0; i < xs.length - 1; i++) {
    const a = [xs[i], 946], b = [xs[i + 1], 946];
    const q = [mix(VP, a, 0.02), mix(VP, b, 0.02), b, a];
    const ang = Math.atan2(946 - VP[1], (xs[i] + xs[i + 1]) / 2 - VP[0]);
    L.P.fill(poly(q), 0.1, ang, { spacing: 0.3 });
  }
  L.cover(poly([[-10, 650], [2216, 650], [2216, 956], [-10, 956]]));
  // light: a pool on the floor round the owl's run, falling off to the sides and into the dark far end
  L.light((c) => c.ellipse(1060, 820, 560, 240, 0, 0, 7), rad(1060, 820, 0, 560, [[0, 0.3], [0.5, 0.2], [1, 0]]), "lighten", 1);
  L.light((c) => c.ellipse(1075, 745, 340, 95, 0, 0, 7), rad(1075, 745, 0, 340, [[0, 0.62], [0.5, 0.42], [1, 0]]), "lighten", 1);
  L.light((c) => c.ellipse(1085, 718, 300, 46, 0, 0, 7), rad(1085, 718, 0, 300, [[0, 0.82], [0.5, 0.6], [1, 0]]), "lighten", 1);
  // the far floor sinks into black at the corridor end
  L.light(poly([[-10, 640], [2216, 640], [2216, 690], [-10, 690]]), lin(0, 640, 0, 690, [[0, 0], [1, 0.0]]), "source-over", 0.7);
  // plank seams toward the vanishing point
  const r = rng(12);
  for (let i = 0; i < 60; i++) {
    const x = -900 + i * 74 + r() * 20;
    const p = [x, 960];
    line(L.o, [mix(VP, p, 0.08 + r() * 0.05), p], 1.0 + r() * 0.8, "rgba(0,0,0,0.28)", 70 + i, 0.2);
  }
  // cross joints of the boards (short, staggered)
  for (let k = 0; k < 70; k++) {
    const y = 670 + Math.pow(r(), 0.6) * 280;
    const s = (y - VP[1]) / 300;
    const x = VP[0] + (r() - 0.5) * 2600 * s;
    line(L.o, [[x - 36 * s, y], [x + 36 * s, y]], 1.0, "rgba(0,0,0,0.25)", 200 + k, 0.3);
  }
  // a fine print dot in the lit pool (the source floor carries a halftone)
  L.o.save(); L.o.beginPath(); L.o.ellipse(1070, 780, 420, 150, 0, 0, 7); L.o.clip();
  L.o.fillStyle = "rgba(0,0,0,0.22)";
  for (let y = 660; y < 946; y += 5) for (let x = 640 + ((y / 5) % 2) * 2.5; x < 1500; x += 5) { L.o.beginPath(); L.o.arc(x, y, 1.1, 0, 7); L.o.fill(); }
  L.o.restore();
  // the cable lying on the floor at the left
  curve(L.o, [[716, 648], [700, 700], [680, 760], [662, 830], [676, 880], [740, 900], [820, 896], [870, 884], [846, 868], [780, 874]], 5.2, "rgba(6,6,6,0.95)", 5);
  curve(L.o, [[716, 648], [700, 700], [680, 760], [662, 830], [676, 880], [740, 900], [820, 896], [870, 884]], 1.1, "rgba(242,240,234,0.35)", 6);
}

// ================================================================= LEFT WALL: speaker, shelving, boxes, keyboard
function paintLeft(L) {
  const o = L.o, r = rng(21);
  // --- top-left: dark carton and a vented box above the speaker
  L.fill(quad([[0, 0], [100, 0], [96, 176], [0, 186]]), 0.1, PI / 2, { spacing: 0.35, style: 1 });
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

  // --- the speaker cabinet (front face turned toward the corridor)
  const cab = [[70, 180], [438, 310], [432, 606], [38, 604]];
  L.fill(quad(cab), lin(38, 300, 438, 400, [[0, 0.34], [0.6, 0.42], [1, 0.46]]), PI / 2 + 0.05, { spacing: 0.26 });
  grain(o, cab, 36, { dir: "v", w: 1.6, color: "rgba(0,0,0,0.55)", seed: 400, len: [0.4, 1], wav: 0.01 });
  grain(o, cab, 18, { dir: "v", w: 1.2, color: "rgba(242,240,234,0.25)", seed: 401, len: [0.3, 0.8], wav: 0.01 });
  L.line([[80, 196], [432, 322]], 2.4, "rgba(242,240,234,0.75)", 402);
  L.line([[80, 196], [52, 596]], 2, "rgba(242,240,234,0.55)", 403);
  L.line([[432, 322], [426, 598]], 1.8, "rgba(242,240,234,0.45)", 404);
  edges(L, cab, 2.6, "rgba(0,0,0,0.95)", 405);
  L.fill(quad([[438, 310], [446, 308], [446, 610], [432, 606]]), 0.08, PI / 2, { spacing: 0.3 });
  // the driver: flange, surround, cone, dust cap
  const cx = 236, cy = 444;
  L.fill(ell(cx, cy, 160, 158), rad(cx - 30, cy - 40, 60, 200, [[0, 0.72], [0.5, 0.6], [1, 0.42]]), 0.4, { spacing: 0.22, style: 2 });
  for (const [dx, dy] of [[-96, -112], [108, -100], [118, 104], [-104, 118]]) {
    o.fillStyle = "rgba(10,10,10,0.9)"; o.beginPath(); o.arc(cx + dx, cy + dy, 6, 0, 7); o.fill();
    o.fillStyle = "rgba(242,240,234,0.7)"; o.beginPath(); o.arc(cx + dx - 1.5, cy + dy - 1.5, 2, 0, 7); o.fill();
  }
  // surround: a thick dark rubber ring with a sheen on its lower right
  L.fill(ell(cx - 2, cy + 2, 140, 139), rad(cx + 40, cy + 50, 60, 190, [[0, 0.3], [0.5, 0.14], [1, 0.05]]), 0.9, { spacing: 0.2, style: 2 });
  o.strokeStyle = "rgba(242,240,234,0.45)"; o.lineWidth = 5; o.beginPath(); o.ellipse(cx - 2, cy + 2, 127, 126, 0, 0.1, 1.5); o.stroke();
  // cone: radial brush streaks, lit lower right, darker upper left
  const cc = [cx - 6, cy + 4];
  L.fill(ell(cc[0], cc[1], 114, 114), rad(cc[0] + 44, cc[1] + 54, 10, 170, [[0, 0.78], [0.45, 0.55], [1, 0.12]]), 0.6, { spacing: 0.24, style: 2 });
  o.save(); o.beginPath(); o.ellipse(cc[0], cc[1], 112, 112, 0, 0, 7); o.clip();
  for (let i = 0; i < 110; i++) {
    const a = (i / 110) * 2 * PI + r() * 0.04, k = 0.5 + 0.5 * Math.cos(a - 0.9);
    const r0 = 44 + r() * 14, r1 = 96 + r() * 16;
    stroke(o, [[cc[0] + Math.cos(a) * r0, cc[1] + Math.sin(a) * r0], [cc[0] + Math.cos(a) * r1, cc[1] + Math.sin(a) * r1]], 2 + r() * 3, k > 0.45 ? `rgba(242,240,234,${0.15 + 0.45 * k * r()})` : `rgba(0,0,0,${0.3 + 0.4 * r()})`, 500 + i);
  }
  o.restore();
  o.strokeStyle = "rgba(0,0,0,0.9)"; o.lineWidth = 3; o.beginPath(); o.ellipse(cc[0], cc[1], 114, 114, 0, 0, 7); o.stroke();
  o.strokeStyle = "rgba(0,0,0,0.9)"; o.lineWidth = 2.6; o.beginPath(); o.ellipse(cx, cy, 159, 157, 0, 0, 7); o.stroke();
  // dust cap: dark dome with a hard highlight
  const dc = [cx - 20, cy - 4];
  L.fill(ell(dc[0], dc[1], 44, 43), rad(dc[0] + 12, dc[1] + 14, 2, 50, [[0, 0.22], [0.7, 0.07], [1, 0.02]]), 0.6, { spacing: 0.2, style: 2 });
  o.fillStyle = "rgba(242,240,234,0.95)"; o.beginPath(); o.ellipse(dc[0] + 6, dc[1] - 18, 11, 7, -0.5, 0, 7); o.fill();
  o.strokeStyle = "rgba(0,0,0,0.9)"; o.lineWidth = 2.4; o.beginPath(); o.ellipse(dc[0], dc[1], 44, 43, 0, 0, 7); o.stroke();

  // --- carton under the speaker: the top of it lit, the face falling into black
  const bx = [[26, 640], [478, 624], [482, 950], [20, 950]];
  L.fill(quad(bx), lin(0, 624, 0, 946, [[0, 0.6], [0.25, 0.46], [0.5, 0.14], [0.65, 0.0]]), PI / 2 - 0.03, { spacing: 0.3 });
  grain(o, bx, 26, { dir: "v", w: 1.6, color: "rgba(0,0,0,0.45)", seed: 600, len: [0.3, 0.8], wav: 0.008 });
  L.line([[250, 660], [252, 760]], 1.6, "rgba(0,0,0,0.5)", 602);
  L.fill(quad([[30, 604], [440, 608], [478, 624], [26, 640]]), 0.56, 0.02, { spacing: 0.3 });
  L.line([[26, 640], [478, 624]], 2.2, "rgba(0,0,0,0.85)", 601);
  edges(L, bx, 2.2, "rgba(0,0,0,0.9)", 603);

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
  // cavity: a small shelf, a pale box with a dial, the cable nest
  L.fill(quad([[502, 392], [690, 440], [690, 612], [502, 612]]), 0.04, 0, { spacing: 0.35 });
  board(L, [[502, 500], [590, 505], [590, 520], [502, 516]], 0.5, 645, { n: 3 });
  const dev = [[580, 526], [662, 530], [660, 610], [580, 608]];
  L.fill(quad(dev), lin(580, 526, 662, 610, [[0, 0.74], [1, 0.58]]), PI / 2, { spacing: 0.24 });
  edges(L, dev, 1.8, "rgba(0,0,0,0.9)", 650);
  o.strokeStyle = "rgba(0,0,0,0.85)"; o.lineWidth = 2.6; o.beginPath(); o.arc(632, 570, 10, 0, 7); o.stroke(); o.beginPath(); o.arc(634, 592, 7, 0, 7); o.stroke();
  L.line([[626, 526], [630, 548]], 2.2, "rgba(0,0,0,0.8)", 651);
  for (let i = 0; i < 10; i++) {
    const x = 540 + r() * 80, y = 450 + r() * 50, rx = 26 + r() * 34, ry = 12 + r() * 14;
    const pts = []; for (let k = 0; k <= 16; k++) { const a = (k / 16) * 2 * PI + i * 0.7; pts.push([x + Math.cos(a) * rx, y + Math.sin(a) * ry + k * 0.6]); }
    cable(o, pts, 5.5, 660 + i * 3, { body: 0.62 + r() * 0.2 });
  }
  cable(o, [[560, 520], [556, 560], [548, 610], [530, 660], [506, 700]], 5, 690, { body: 0.62 });
  cable(o, [[600, 500], [620, 520], [640, 530]], 5, 693, { body: 0.62 });
  // middle shelf board
  board(L, [[478, 616], [744, 606], [744, 634], [478, 660]], 0.74, 680, { ang: -0.03, n: 12, litEdge: 0.8 });
  // lower cavity with a second deck
  L.fill(quad([[486, 660], [706, 634], [706, 820], [486, 820]]), 0.03, 0, { spacing: 0.35 });
  const deck2 = [[486, 684], [672, 678], [676, 772], [488, 780]];
  L.fill(quad(deck2), lin(0, 678, 0, 780, [[0, 0.72], [1, 0.44]]), 0, { spacing: 0.22 });
  edges(L, deck2, 2.2, "rgba(0,0,0,0.9)", 690);
  L.line([quadAt(deck2, 0.02, 0.24), quadAt(deck2, 0.98, 0.24)], 1.6, "rgba(0,0,0,0.75)", 691);
  for (let i = 0; i < 2; i++) { const p = quadAt(deck2, 0.72 + i * 0.13, 0.45); edges(L, [[p[0] - 9, p[1] - 7], [p[0] + 9, p[1] - 7], [p[0] + 9, p[1] + 7], [p[0] - 9, p[1] + 7]], 1.6, "rgba(0,0,0,0.85)", 692 + i); }
  const slot = [quadAt(deck2, 0.06, 0.62), quadAt(deck2, 0.6, 0.62), quadAt(deck2, 0.6, 0.8), quadAt(deck2, 0.06, 0.8)];
  L.fill(quad(slot), 0.12, 0, { spacing: 0.3 });
  edges(L, slot, 1.4, "rgba(0,0,0,0.9)", 699);

  // --- carton stack by the keyboard: shadowed side faces, pale fronts sloping toward the corridor
  const side = [[700, 52], [776, 52], [776, 640], [700, 640]];
  L.fill(quad(side), lin(700, 0, 776, 0, [[0, 0.2], [1, 0.32]]), PI / 2, { spacing: 0.3 });
  mottle(L, side, 701, 0.35);
  grain(o, side, 10, { dir: "v", w: 1.8, color: "rgba(0,0,0,0.55)", seed: 700, len: [0.2, 0.7] });
  edges(L, side, 2, "rgba(0,0,0,0.9)", 702);
  carton(L, [[776, 52], [856, 131], [860, 270], [792, 200]], 0.84, 710, { label: true, tape: false, lit: 0.1 });
  carton(L, [[792, 200], [882, 277], [882, 402], [794, 355]], 0.86, 720, { label: true, tape: false });
  carton(L, [[794, 355], [884, 402], [886, 610], [796, 600]], 0.74, 730, { label: true, tape: false });
  L.fill(quad([[856, 131], [874, 150], [878, 280], [860, 270]]), 0.5, PI / 2, { spacing: 0.3 });
  carton(L, [[700, 520], [752, 522], [752, 612], [700, 612]], 0.5, 740, { tape: false });
  carton(L, [[748, 380], [800, 384], [800, 630], [748, 628]], 0.78, 745, { tape: false });
  // --- more cartons and a bookshelf further down the wall
  // dim cartons behind (hatched, mottled), their tops sloping down toward the corridor
  const c1 = [[882, 126], [1000, 128], [1010, 256], [882, 256]];
  L.fill(quad(c1), 0.3, 0.7, { spacing: 0.26, style: 1 }); mottle(L, c1, 751, 0.3); edges(L, c1, 2, "rgba(0,0,0,0.85)", 750);
  const c2 = [[882, 256], [1010, 256], [1016, 420], [884, 420]];
  L.fill(quad(c2), 0.26, 0.7, { spacing: 0.26, style: 1 }); mottle(L, c2, 756, 0.3); edges(L, c2, 2, "rgba(0,0,0,0.85)", 755);
  L.line([[900, 240], [1004, 244]], 1.6, "rgba(0,0,0,0.7)", 757);
  const bs = [[960, 262], [1030, 262], [1030, 548], [962, 548]];
  L.fill(quad(bs), 0.12, PI / 2, { spacing: 0.3 });
  for (let i = 0; i < 10; i++) { const x = 966 + i * 6.5; L.line([[x, 300 + r() * 20], [x + 1, 400]], 3, `rgba(242,240,234,${0.12 + r() * 0.2})`, 770 + i); }
  for (let i = 0; i < 9; i++) { const x = 968 + i * 7; L.line([[x, 420 + r() * 20], [x + 1, 530]], 3, `rgba(242,240,234,${0.1 + r() * 0.18})`, 790 + i); }
  board(L, [[962, 404], [1030, 404], [1030, 414], [962, 414]], 0.3, 800, { n: 2 });
  edges(L, bs, 2, "rgba(0,0,0,0.9)", 801);
  // tools and bottles on the shelf behind the keyboard
  L.fill(quad([[886, 320], [962, 320], [962, 440], [886, 440]]), 0.06, PI / 2, { spacing: 0.35 });
  for (const [x, y, w, h] of [[892, 330, 16, 78], [912, 344, 14, 66], [930, 356, 22, 52], [952, 334, 10, 80]]) {
    L.fill((c) => c.roundRect(x, y, w, h, 5), 0.3 + r() * 0.2, PI / 2, { spacing: 0.26 });
    L.line([[x + 3, y + 6], [x + 3, y + h - 6]], 1.4, "rgba(242,240,234,0.5)", 810 + x);
  }
  // cartons behind the keyboard (cross-hatched, in shadow)
  const kb1 = [[884, 436], [1000, 440], [1004, 590], [884, 588]];
  L.fill(quad(kb1), 0.34, 0.6, { spacing: 0.26, style: 1 });
  edges(L, kb1, 2, "rgba(0,0,0,0.9)", 820);
  L.line([[976, 440], [980, 520]], 1.4, "rgba(0,0,0,0.6)", 821);
  const kb2 = [[870, 588], [1016, 590], [1018, 740], [870, 738]];
  L.fill(quad(kb2), 0.28, 0.6, { spacing: 0.26, style: 1 });
  edges(L, kb2, 2, "rgba(0,0,0,0.9)", 822);
  carton(L, [[1000, 520], [1050, 520], [1050, 690], [1004, 690]], 0.16, 823, { tape: false });

  // --- the synth keyboard leaning on the cartons
  const K = [[802, 412], [880, 442], [954, 722], [892, 752]];
  L.fill(quad(K), lin(786, 410, 952, 724, [[0, 0.24], [1, 0.18]]), 1.25, { spacing: 0.22 });
  edges(L, K, 2.6, "rgba(0,0,0,0.95)", 830);
  L.line([K[0], K[1]], 1.6, "rgba(242,240,234,0.6)", 831);
  L.line([K[0], K[3]], 1.6, "rgba(242,240,234,0.45)", 832);
  const kq = [quadAt(K, 0.5, 0.05), quadAt(K, 0.96, 0.05), quadAt(K, 0.96, 0.97), quadAt(K, 0.5, 0.97)];
  L.fill(quad(kq), 0.88, 0.3, { spacing: 0.2, style: 2 });
  const NK = 26;
  for (let i = 0; i <= NK; i++) { const t = 0.05 + (0.92 * i) / NK; L.line([quadAt(K, 0.5, t), quadAt(K, 0.96, t)], 1.1, "rgba(0,0,0,0.8)", 840 + i); }
  for (let i = 0; i < NK; i++) {
    if (![1, 2, 4, 5, 6].includes(i % 7)) continue;
    const t = 0.05 + (0.92 * i) / NK;
    const bq = [quadAt(K, 0.5, t - 0.012), quadAt(K, 0.76, t - 0.012), quadAt(K, 0.76, t + 0.012), quadAt(K, 0.5, t + 0.012)];
    L.fill(quad(bq), 0.03, 0.3, { spacing: 0.3, style: 2 });
  }
  for (let i = 0; i < 6; i++) { const p = quadAt(K, 0.25, 0.12 + i * 0.07); o.fillStyle = "rgba(242,240,234,0.6)"; o.beginPath(); o.arc(p[0], p[1], 3.2, 0, 7); o.fill(); }
  for (let i = 0; i < 3; i++) { const a = quadAt(K, 0.14 + i * 0.1, 0.55), b = quadAt(K, 0.14 + i * 0.1, 0.72); L.line([a, b], 3.4, "rgba(242,240,234,0.6)", 850 + i); }
  const lcd = [quadAt(K, 0.1, 0.36), quadAt(K, 0.42, 0.36), quadAt(K, 0.42, 0.44), quadAt(K, 0.1, 0.44)];
  L.fill(quad(lcd), 0.72, 1.25, { style: 2 });
  edges(L, lcd, 1.4, "rgba(0,0,0,0.8)", 855);
  for (let i = 0; i < 4; i++) { const p = quadAt(K, 0.3, 0.8 + i * 0.04); o.fillStyle = "rgba(242,240,234,0.55)"; o.fillRect(p[0] - 4, p[1] - 3, 8, 6); }
  // the ceiling's shadow over the tops of the stacks
  L.light(quad([[0, 0], [1060, 0], [1060, 110], [0, 110]]), lin(0, 0, 0, 110, [[0, 0.35], [1, 1]]), "multiply", 1);
}

// ================================================================= RIGHT WALL: cartons, shelving, the glowing light, monitor, synth
function paintRight(L) {
  const o = L.o, r = rng(41);
  // dark hatched column between the corridor and the cartons
  L.fill(quad([[1204, 286], [1238, 280], [1238, 560], [1206, 560]]), 0.12, 0.8, { spacing: 0.3, style: 1 });
  // carton stack A (mottled grey)
  const A = [
    [[1244, 134], [1350, 134], [1352, 194], [1244, 194]], [[1236, 194], [1352, 194], [1352, 250], [1236, 250]],
    [[1244, 250], [1366, 250], [1366, 330], [1244, 330]], [[1250, 330], [1380, 330], [1380, 392], [1250, 392]],
    [[1246, 392], [1380, 392], [1380, 548], [1246, 548]],
  ];
  A.forEach((q, i) => carton(L, q, 0.3 + (i % 2) * 0.04, 900 + i * 10, { tape: i % 2 === 0, label: i === 4 }));
  // carton stack B (catching the light on its right edge)
  const B = [
    [[1380, 122], [1472, 122], [1484, 180], [1380, 184]], [[1380, 184], [1484, 180], [1484, 244], [1380, 248]],
    [[1382, 248], [1484, 244], [1484, 326], [1382, 326]], [[1382, 326], [1486, 326], [1486, 470], [1382, 470]],
    [[1382, 470], [1486, 470], [1486, 548], [1382, 548]],
  ];
  B.forEach((q, i) => carton(L, q, 0.56 + (i % 2) * 0.05, 960 + i * 10, { tape: i !== 3, label: i === 2 || i === 3, lit: 0.6 }));
  // shelving: dark back and the bays
  L.fill(quad([[1486, 0], [2206, 0], [2206, 552], [1486, 552]]), lin(1486, 0, 2206, 0, [[0, 0.1], [0.4, 0.07], [1, 0.04]]), 0.5, { spacing: 0.35, style: 1 });
  carton(L, [[1508, 56], [1590, 52], [1592, 168], [1510, 172]], 0.46, 1020, { tape: false, label: true });
  // left bay: a board with cables looped over it
  board(L, [[1490, 262], [1684, 204], [1684, 232], [1492, 294]], 0.44, 1030, { ang: -0.3, n: 6, litEdge: 0.7 });
  // right bay: two long boards climbing to the right
  board(L, [[1710, 270], [2136, 64], [2136, 96], [1712, 300]], 0.36, 1040, { ang: -0.45, n: 10, litEdge: 0.6 });
  board(L, [[1710, 100], [2136, -90], [2136, -60], [1712, 128]], 0.24, 1041, { ang: -0.42, n: 8, litEdge: 0.4 });
  // cables: dark loops piled on the boards and hanging
  for (let i = 0; i < 22; i++) {
    const inL = i < 10;
    const x = inL ? 1506 + r() * 170 : 1740 + r() * 300;
    const y = inL ? 200 - (x - 1490) * 0.3 + r() * 40 : 250 - (x - 1710) * 0.48 + r() * 30;
    const pts = []; const rx = 14 + r() * 24, ry = 16 + r() * 40;
    for (let k = 0; k <= 12; k++) { const a = (k / 12) * 2 * PI; pts.push([x + Math.sin(a) * rx, y + (1 - Math.cos(a)) * ry]); }
    curve(o, pts, 3.2, "rgba(6,6,6,0.9)", 1050 + i);
    curve(o, pts.map(([a, b]) => [a - 1, b - 1]), 1.1, `rgba(242,240,234,${inL ? 0.4 : 0.22})`, 1080 + i);
  }
  curve(o, [[1882, 150], [1886, 220], [1878, 300]], 3, "rgba(6,6,6,0.9)", 1070);
  L.fill((c) => c.roundRect(1872, 296, 12, 36, 3), 0.5, PI / 2, { spacing: 0.3 });
  // posts
  for (const [q, v, s] of [[[[1482, 200], [1500, 196], [1500, 552], [1484, 552]], 0.4, 1090], [[[1680, 24], [1706, 20], [1708, 544], [1684, 544]], 0.34, 1091], [[[2130, 0], [2190, 0], [2196, 720], [2136, 720]], 0.24, 1092]]) {
    board(L, q, v, s, { dir: "v", ang: PI / 2, litEdge: 0.3, n: 5 });
  }
  // the light behind the monitor: the brightest thing in the room, dust sparkling in it
  L.fill(quad([[1560, 300], [1690, 296], [1690, 500], [1560, 504]]), lin(1560, 0, 1690, 0, [[0, 0.3], [0.45, 0.62], [0.65, 1], [1, 1]]), 0.2, { style: 2 });
  L.light((c) => c.ellipse(1640, 390, 120, 150, 0, 0, 7), rad(1650, 390, 0, 150, [[0, 0.55], [0.5, 0.25], [1, 0]]), "lighter", 1);
  L.line([[1640, 306], [1640, 500]], 2, "rgba(0,0,0,0.5)", 1095);
  for (let i = 0; i < 90; i++) {
    const x = 1530 + r() * 110, y = 290 + r() * 150, s = 0.8 + r() * 1.6;
    o.fillStyle = `rgba(250,250,245,${0.4 + r() * 0.6})`; o.beginPath(); o.arc(x, y, s, 0, 7); o.fill();
  }
  // the old monitor on the desk, screen cracked
  const mon = [[1506, 392], [1638, 386], [1640, 522], [1508, 524]];
  L.fill(quad(mon), lin(1506, 392, 1640, 522, [[0, 0.6], [1, 0.72]]), 0, { spacing: 0.22 });
  edges(L, mon, 2.2, "rgba(0,0,0,0.9)", 1100);
  const ms = [[1518, 402], [1626, 398], [1628, 504], [1520, 508]];
  L.fill(quad(ms), lin(1518, 402, 1628, 504, [[0, 0.26], [0.6, 0.18], [1, 0.36]]), 0.9, { spacing: 0.26 });
  edges(L, ms, 1.8, "rgba(0,0,0,0.9)", 1101);
  const hub = [1566, 456];
  for (let i = 0; i < 9; i++) {
    const a = r() * 2 * PI, L1 = 20 + r() * 50, p1 = [hub[0] + Math.cos(a) * L1, hub[1] + Math.sin(a) * L1 * 0.8];
    L.line([hub, [(hub[0] + p1[0]) / 2 + (r() - 0.5) * 8, (hub[1] + p1[1]) / 2 + (r() - 0.5) * 8], p1], 1.3, "rgba(242,240,234,0.7)", 1110 + i);
  }
  // keyboard and mouse on the desk
  const kb = [[1412, 532], [1540, 528], [1546, 550], [1406, 552]];
  L.fill(quad(kb), 0.5, 0.05, { spacing: 0.2 });
  for (let i = 0; i < 16; i++) { const a = quadAt(kb, (i + 0.5) / 16, 0.2), b = quadAt(kb, (i + 0.5) / 16, 0.85); L.line([a, b], 1, "rgba(0,0,0,0.6)", 1120 + i); }
  edges(L, kb, 1.6, "rgba(0,0,0,0.9)", 1140);
  L.fill(ell(1556, 540, 18, 8, -0.05), 0.72, 0, { style: 2 });
  // the synth workstation: a lit panel of knobs and a display, white keys along its near edge
  const pan = [[1636, 500], [1758, 372], [2134, 296], [2058, 446]];
  // (quadAt(pan, u, v): u runs from the near edge back, v from left to right)
  L.fill(quad(pan), lin(1636, 450, 2134, 300, [[0, 0.3], [0.5, 0.24], [1, 0.12]]), -0.2, { spacing: 0.24 });
  edges(L, pan, 2.4, "rgba(0,0,0,0.95)", 1150);
  L.line([pan[1], pan[2]], 2, "rgba(242,240,234,0.55)", 1151);
  // key bed along the near edge: white keys, black keys
  const keys = [quadAt(pan, 0.0, 0.03), quadAt(pan, 0.34, 0.03), quadAt(pan, 0.34, 0.8), quadAt(pan, 0.0, 0.8)];
  L.fill(quad(keys), lin(1660, 480, 2000, 420, [[0, 0.92], [0.7, 0.78], [1, 0.5]]), -0.2, { spacing: 0.2, style: 2 });
  const NK = 30;
  for (let i = 0; i <= NK; i++) { const a = quadAt(keys, 0, i / NK), b = quadAt(keys, 1, i / NK); L.line([a, b], 1.2, "rgba(0,0,0,0.8)", 1160 + i); }
  for (let i = 0; i < NK; i++) {
    if (![1, 2, 4, 5, 6].includes(i % 7)) continue;
    const q = [quadAt(keys, 0.38, (i + 0.65) / NK), quadAt(keys, 1, (i + 0.65) / NK), quadAt(keys, 1, (i + 1.35) / NK), quadAt(keys, 0.38, (i + 1.35) / NK)];
    L.fill(quad(q), 0.03, 0, { style: 2 });
  }
  // knobs and buttons on the panel, the display at the back right
  for (let row = 0; row < 3; row++) for (let i = 0; i < 11; i++) {
    const p = quadAt(pan, 0.46 + row * 0.16, 0.06 + i * 0.058);
    o.fillStyle = "rgba(0,0,0,0.9)"; o.beginPath(); o.ellipse(p[0], p[1], 8, 6, -0.2, 0, 7); o.fill();
    o.fillStyle = "rgba(242,240,234,0.55)"; o.beginPath(); o.ellipse(p[0] - 1.5, p[1] - 2, 3, 2.2, -0.2, 0, 7); o.fill();
  }
  for (let i = 0; i < 6; i++) { const p = quadAt(pan, 0.4, 0.1 + i * 0.1); o.fillStyle = "rgba(242,240,234,0.5)"; o.fillRect(p[0] - 7, p[1] - 3, 14, 6); }
  const disp = [quadAt(pan, 0.55, 0.72), quadAt(pan, 0.9, 0.72), quadAt(pan, 0.9, 0.93), quadAt(pan, 0.55, 0.93)];
  L.fill(quad(disp), 0.1, 0, { spacing: 0.3 });
  edges(L, disp, 1.8, "rgba(242,240,234,0.45)", 1152);
  const fr = [[1636, 500], [2058, 446], [2062, 474], [1640, 534]];
  L.fill(quad(fr), 0.14, -0.1, { spacing: 0.3 });
  edges(L, fr, 2, "rgba(0,0,0,0.9)", 1200);
  // a stand leg under the synth, the far right dark
  L.light(quad([[2040, 0], [2206, 0], [2206, 560], [2040, 560]]), 0, "source-over", 0.35);
}

// ================================================================= UNDER THE DESK: cartons in the shadow of the top
function paintUnder(L) {
  const o = L.o;
  L.fill(quad([[1240, 640], [2206, 640], [2206, 946], [1240, 946]]), 0.025, 0, { spacing: 0.4 });
  // the carton: lit top, front and a darker side
  const top = [[1290, 670], [1546, 668], [1562, 726], [1262, 738]];
  L.fill(quad(top), lin(1262, 670, 1562, 730, [[0, 0.62], [1, 0.5]]), 0.02, { spacing: 0.24 });
  L.line([[1300, 704], [1552, 698]], 1.6, "rgba(0,0,0,0.6)", 1300);
  const fr = [[1262, 738], [1440, 732], [1440, 900], [1266, 906]];
  carton(L, fr, 0.46, 1310, { tape: false, label: true });
  const sd = [[1440, 732], [1562, 726], [1556, 880], [1440, 900]];
  carton(L, sd, 0.3, 1320, { tape: false });
  edges(L, top, 2, "rgba(0,0,0,0.9)", 1330);
  // a second carton further right, mostly in shadow
  carton(L, [[1604, 694], [1722, 690], [1722, 852], [1604, 858]], 0.28, 1340, { tape: true });
  L.fill(quad([[1722, 690], [1800, 700], [1800, 850], [1722, 852]]), 0.08, PI / 2, { spacing: 0.3 });
  // floor shadow under the desk
  L.light(quad([[1240, 880], [2206, 880], [2206, 946], [1240, 946]]), 0, "source-over", 0.7);
}

// ================================================================= DESK: top plank, apron, legs, cables over the edge
function paintDeskBase(L) {
  const o = L.o;
  // apron under the top
  const ap = [[1252, 604], [2206, 598], [2206, 654], [1252, 652]];
  L.fill(quad(ap), lin(1252, 0, 2206, 0, [[0, 0.46], [0.55, 0.32], [0.8, 0.1], [1, 0.04]]), 0.0, { spacing: 0.26 });
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
  board(L, [[1800, 652], [1868, 652], [1868, 790], [1800, 790]], 0.2, 1420, { dir: "v", ang: PI / 2, litEdge: 0.2, n: 5 });
  // cables slung over the front edge and hanging down to the floor
  for (const [pts, w] of [
    [[[1592, 600], [1576, 640], [1590, 720], [1610, 780], [1640, 840]], 7],
    [[[1612, 600], [1604, 650], [1624, 730], [1660, 790]], 6],
    [[[1660, 600], [1700, 650], [1760, 690], [1800, 740]], 6],
  ]) {
    curve(o, pts, w, "rgba(6,6,6,0.95)", 1460 + w); curve(L.a, pts, w, "#fff", 1);
    curve(o, pts.map(([x, y]) => [x - w * 0.25, y]), 1.2, "rgba(242,240,234,0.35)", 1470 + w);
  }
}
function paintDeskTop(L) {
  const o = L.o, r = rng(61);
  // the top plank's front face: bright weathered wood on the left, sinking into shadow on the right
  const tp = [[1152, 556], [2174, 550], [2174, 604], [1150, 604]];
  L.fill(quad(tp), lin(1150, 0, 2174, 0, [[0, 0.8], [0.3, 0.76], [0.6, 0.66], [0.75, 0.4], [0.9, 0.14], [1, 0.08]]), 0.0, { spacing: 0.24 });
  grain(o, tp, 18, { dir: "u", w: 1.8, color: "rgba(0,0,0,0.5)", seed: 1430, len: [0.1, 0.5], wav: 0.03 });
  grain(o, tp, 10, { dir: "u", w: 1.4, color: "rgba(242,240,234,0.55)", seed: 1431, len: [0.1, 0.4], wav: 0.03 });
  for (let i = 0; i < 6; i++) { const x = 1200 + r() * 700, y = 566 + r() * 28; curve(o, [[x, y], [x + 14, y - 3], [x + 26, y], [x + 14, y + 3], [x, y]], 1.2, "rgba(0,0,0,0.45)", 1440 + i); }
  L.line([[1152, 556], [2174, 550]], 2, "rgba(242,240,234,0.8)", 1450);
  L.line([[1150, 604], [2174, 604]], 2.8, "rgba(0,0,0,0.95)", 1451);
  L.line([[1152, 556], [1146, 580], [1150, 604]], 2.6, "rgba(0,0,0,0.9)", 1452);
  // the desk top surface just visible behind the plank's edge (a thin dark band)
  L.fill(quad([[1160, 546], [2174, 540], [2174, 551], [1156, 557]]), 0.12, 0, { spacing: 0.3 });
  // the cables where they cross the plank
  for (const [pts, w] of [[[[1592, 540], [1580, 570], [1576, 606]], 7], [[[1616, 542], [1606, 580], [1604, 606]], 6], [[[1648, 548], [1660, 606]], 6]]) {
    curve(o, pts, w, "rgba(6,6,6,0.95)", 1460 + w); curve(L.a, pts, w, "#fff", 1);
    curve(o, pts.map(([x, y]) => [x - w * 0.25, y]), 1.2, "rgba(242,240,234,0.35)", 1470 + w);
  }
}

// ---------------------------------------------------------------- build all layers
// planes: w(u,v) = a*u + b*v + c (1 = the keyboard's depth)
export const LAYERS = [
  { name: "back", rect: [0, 0, 2206, 946], sc: 1, plane: [0, 0, 0.78], paint: paintBack, opaque: true, blurK: 0 },
  { name: "ceiling", rect: [540, 0, 1660, 200], sc: 1.5, plane: [0, -1 / 600, 643 / 600], paint: paintCeiling, blurK: 0.3 },
  { name: "floor", rect: [0, 640, 2206, 946], sc: 1.5, plane: [0, 1 / 100, -6.43], paint: paintFloor, contrast: 1.1, blurK: 0.35 },
  { name: "left", rect: [0, 0, 1060, 946], sc: 2, plane: [-0.00039, 0, 0.98 + 975 * 0.00039], paint: paintLeft, blurK: 0.2 },
  { name: "right", rect: [1100, 0, 2206, 660], sc: 2, plane: [0.00068, 0, 0.97 - 1275 * 0.00068], paint: paintRight, blurK: 0.6 },
  { name: "under", rect: [1236, 636, 2206, 946], sc: 1.5, plane: [0, 0, 1.25], paint: paintUnder, blurK: 0.8 },
  { name: "deskBase", rect: [1180, 590, 2206, 946], sc: 2, plane: [0, 0, 1.3], paint: paintDeskBase, blurK: 0.9 },
  // the plank's sideways parallax matches w = 1.6, its vertical one w = 1.38 (measured 40.44–40.64)
  { name: "deskTop", rect: [1136, 530, 2206, 616], sc: 2.5, plane: [0, 0, 1, 1.6, 1.38], paint: paintDeskTop, blurK: 1 },
];

export function buildLayers(only = null) {
  const out = [];
  for (const D of LAYERS) {
    if (only && !only.includes(D.name)) continue;
    const L = new Lay(D.rect, D.sc);
    D.paint(L);
    const canvas = L.finish({ spacing: 3.6 * D.sc, seed: 3 + out.length * 7, contrast: D.contrast ?? 1.2 }, D.opaque, D.flat ?? 0.72);
    out.push({ ...D, canvas });
  }
  return out;
}
