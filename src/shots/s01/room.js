// s01 room plate: everything that never moves except the figure and the right hand (figure.js).
// Plate coordinates = the t=0 source frame; every shape below was traced from labelled 2-4x grids of the
// source (snapshots/s01-fix1-meas/*.jpg). Values are a study of the source's light: pure black around the
// edges, the desk nearly white under the laptop, the gear only caught on its lamp-facing edges.
import { INK, DARK, grey, rng, taper, poly, blob, ell, rect, rrect, lin, rad, line, curve, stroke, grain, quadAt } from "./kit.js";
import { Plate } from "./engrave.js";
import { noise2 } from "../../lib/rng.js";

const PI = Math.PI;
const smoothstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// ---------------------------------------------------------------- back: cartons and boxes behind the desk
function paintBack(P) {
  const o = P.o;
  // wide carton behind the left speaker, the carton above the lid and its neighbour: toned faces with dark vertical
  // grain (fix pass 2b: no engraved line fill)
  face(P, [[555, 0], [850, 0], [850, 104], [662, 108]], lin(555, 0, 850, 0, [[0, 0.2], [0.5, 0.3], [1, 0.26]]), { dir: "v", n: 40, seed: 3, dark: 0.95, lite: 0.35, w: [1.4, 3.8] });
  face(P, [[902, 0], [1196, 0], [1192, 42], [906, 42]], lin(0, 0, 0, 42, [[0, 0.28], [1, 0.16]]), { dir: "v", n: 40, seed: 5, dark: 0.85, lite: 0.2, w: [1.2, 3] });
  face(P, [[1196, 0], [1300, 0], [1300, 42], [1192, 42]], 0.17, { dir: "v", n: 12, seed: 6, dark: 0.8, lite: 0.2, w: [1, 2.6] });
  // the big carton right of the lid (fix pass 2r, re-traced at 3x, b-carton2.jpg): a lit left face with heavy vertical
  // grain (source mean ~73, std ~68; brightest at x 1340-1395, y 100-160), its top seen from above (lit on the left
  // above the face's top edge, mean ~90, dark with a few lit streaks toward the lamp, ~15), and its front face in shadow
  // behind the lamp (~5), whose top edge (1395,97)-(1493,72) catches the light
  face(P, [[1290, 16], [1395, 97], [1366, 264], [1292, 242]], lin(1292, 0, 1395, 0, [[0, 0.2], [0.3, 0.42], [0.55, 0.8], [0.8, 0.96], [1, 0.92]]), { dir: "v", n: 44, seed: 7, dark: 0.95, lite: 0.2, w: [2.5, 6], edges: [[0, 1, 0.45, 1.5], [1, 2, 0.3]] });
  P.light(poly([[1290, 16], [1395, 97], [1366, 264], [1292, 242]]), (g) => { const q = g.createLinearGradient(0, 120, 0, 264); q.addColorStop(0, "rgba(0,0,0,0)"); q.addColorStop(1, "rgba(0,0,0,0.2)"); return q; });
  face(P, [[1296, 0], [1364, 0], [1362, 58], [1290, 16]], lin(1296, 0, 1364, 0, [[0, 0.32], [0.6, 0.62], [1, 0.66]]), { dir: "v", n: 20, seed: 11, dark: 0.95, lite: 0.35, w: [1.6, 4.2] });
  face(P, [[1364, 0], [1505, 0], [1493, 72], [1395, 97], [1362, 58]], 0.075, { style: 0, sp: 0.22, ink: 0.4, paleK: 0.4, dir: "v", n: 14, seed: 12, lite: 0.2, w: [0.8, 2], edges: [[0, 4, 0.2, 1.1]] });
  { const rs = rng(14); P.o.save(); for (let i = 0; i < 7; i++) { const x = 1436 + rs() * 64, y = 28 + rs() * 30; P.o.globalAlpha = 0.18 + rs() * 0.2; line(P.o, [[x, y], [x + 26 + rs() * 16, y + 18 + rs() * 8]], 1 + rs() * 1.2, INK, 140 + i); } P.o.restore(); }
  face(P, [[1395, 97], [1493, 72], [1560, 58], [1560, 250], [1366, 264]], 0.022, { style: 0, sp: 0.22, ink: 0.4, paleK: 0.35, dir: "v", n: 16, seed: 13, dark: 0.6, lite: 0.2, w: [0.8, 2.2], edges: [[0, 1, 0.4, 1.4], [1, 2, 0.25, 1.1]] });
  // the dark box behind the lamp and the right speaker (source 0-13): barely there, a few lit edges
  face(P, [[1560, 0], [1720, 0], [1716, 52], [1600, 62], [1560, 58]], 0.012, { style: 0, sp: 0.22, ink: 0.35, paleK: 0.3, dir: "u", n: 8, seed: 37, lite: 0.2, w: [0.8, 1.6], edges: [[3, 2, 0.18, 1]] });
  face(P, [[1600, 62], [1716, 52], [1722, 250], [1660, 256]], 0.012, { style: 0, sp: 0.22, ink: 0.35, paleK: 0.3, n: 8, seed: 39, lite: 0.2, w: [0.8, 1.6], edges: [[0, 1, 0.16, 1]] });
  // box behind the left speaker, lit side facing the laptop, dark top
  face(P, [[716, 236], [812, 222], [862, 262], [862, 282], [700, 298]], 0.16, { style: 2, dir: "u", n: 10, seed: 13, lite: 0.3, w: [0.8, 2] });
  face(P, [[742, 145], [805, 117], [812, 222], [760, 240]], lin(742, 0, 812, 0, [[0, 0.5], [1, 0.66]]), { dir: "v", n: 12, seed: 9, dark: 0.8, lite: 0.2, w: [1, 2.6], edges: [[1, 2, 0.3]] });
  face(P, [[700, 110], [806, 106], [805, 117], [742, 145], [705, 140]], 0.12, { style: 1, dir: "u", n: 8, seed: 10, lite: 0.3, w: [0.8, 1.8] });
}

// ---------------------------------------------------------------- periphery: toned volumes (fix pass 2b)
// Every box face is a flat dark tone (style 2: no engraved lines) with irregular grain: streaks whose spacing,
// angle, length and weight all vary, soft worn patches, and ink only on its lit edges (alpha 0.2-0.45). Tones are
// set so the face means match the source at t=0 (facem.py; the old engraved faces were ~1.4x too contrasty).
// fix pass 2r: `ink` < 1 cuts the face's lines wider and dimmer (the s01 engraver variant), `paleK` scales the pale
// streaks: the source's shadowed faces are dim grey texture, not bright white hairlines.
function face(P, q, val, { dir = "v", n = 16, seed = 1, dark = 0.55, lite = 0.1, wav = 0.006, w = [0.8, 2.4], edges = [], patches = 6, angle = null, style = 2, sp = 0.08, ink = 1, paleK = 1, vstreaks = 0 } = {}) {
  const o = P.o, r = rng(seed);
  const ang = angle != null ? angle : dir === "v" ? Math.atan2(q[3][1] - q[0][1], q[3][0] - q[0][0]) : Math.atan2(q[1][1] - q[0][1], q[1][0] - q[0][0]);
  // lit faces: a flat tone under the grain; dark ones: fine engraved hairlines (~3 px apart) that read as texture
  P.fill(poly(q), typeof val === "number" && ink < 1 ? Math.min(1, val / ink) : val, ang + (style === 1 ? 0.5 : 0), { style, spacing: sp, ink });
  // worn patches (value only)
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const [x, y] of q) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  P.v.save(); P.v.beginPath(); poly(q)(P.v); P.v.clip();
  for (let i = 0; i < patches; i++) {
    const cx = x0 + r() * (x1 - x0), cy = y0 + r() * (y1 - y0), rr = 6 + r() * Math.min(40, (x1 - x0 + y1 - y0) * 0.12), lt = r() < 0.5, al = 0.04 + r() * 0.08;
    const g = P.v.createRadialGradient(cx, cy, 0.5, cx, cy, rr); g.addColorStop(0, lt ? `rgba(255,255,255,${al})` : `rgba(0,0,0,${al * 1.5})`); g.addColorStop(1, "rgba(0,0,0,0)");
    P.v.fillStyle = g; P.v.fillRect(cx - rr, cy - rr, rr * 2, rr * 2);
  }
  P.v.restore();
  // value streaks along the face (fix pass 2r): the knife runs wider or thinner in irregular bands, so dim engraved
  // faces read as worn, streaky wood instead of an even grating
  if (vstreaks > 0) {
    const base = typeof val === "number" ? Math.min(1, val / ink) : 0.25;
    P.v.save(); P.v.beginPath(); poly(q)(P.v); P.v.clip(); P.v.filter = "blur(0.8px)"; P.v.lineCap = "round";
    for (let i = 0; i < vstreaks; i++) {
      const sP = r(), L = 0.2 + r() * 0.7, a0 = r() * (1 - L), pts = [];
      for (let k = 0; k <= 6; k++) { const tt = a0 + (L * k) / 6; pts.push(dir === "v" ? quadAt(q, sP, tt) : quadAt(q, tt, sP)); }
      P.v.strokeStyle = grey(Math.min(1, base * (0.2 + Math.pow(r(), 0.7) * 1.9))); P.v.globalAlpha = 0.85; P.v.lineWidth = 1.5 + r() * 4.5;
      P.v.beginPath(); P.v.moveTo(pts[0][0], pts[0][1]); for (const pt of pts.slice(1)) P.v.lineTo(pt[0], pt[1]); P.v.stroke();
    }
    P.v.restore();
  }
  // grain: irregular streaks along the face (dark ones and a few pale ones)
  o.save(); o.beginPath(); poly(q)(o); o.clip();
  let sPos = r() * 0.05;
  while (sPos < 1) {
    const L = 0.25 + r() * 0.75, a0 = r() * (1 - L), pale = r() < lite / (lite + 0.5);
    const pts = [];
    for (let k = 0; k <= 8; k++) {
      const tt = a0 + (L * k) / 8, ss = sPos + Math.sin(tt * (5 + r() * 6) + sPos * 40) * wav * (0.4 + r());
      pts.push(dir === "v" ? quadAt(q, ss, tt) : quadAt(q, tt, ss));
    }
    const ww = w[0] + Math.pow(r(), 1.6) * (w[1] - w[0]);
    const col = pale ? `rgba(242,240,234,${((0.1 + r() * 0.22) * paleK).toFixed(3)})` : `rgba(0,0,0,${(dark * (0.6 + r() * 0.5)).toFixed(2)})`;
    taper(o, pts, (u) => ww * (0.3 + 0.7 * Math.sin(PI * u)), col);
    sPos += (0.35 + Math.pow(r(), 2) * 1.6) / n;
  }
  o.restore();
  for (const [i, j, al, lw = 1.3] of edges) { o.save(); o.globalAlpha = al; line(o, [q[i], q[j]], lw, INK, seed + i * 7 + j); o.restore(); }
}

// ---------------------------------------------------------------- left: stacked cartons falling into black
// One solid stack seen from above (traced: snapshots/s01-fix2-meas/z-left.jpg): each lit face (A, B) is the side of a
// box whose dark top (C, D, E) and shadowed side share its corners.
function paintLeft(P) {
  // fix pass 2r: the lit faces carry dense, irregular grain (source std 42-48 at means 96-118: strong dark streaks and
  // pale ones), the dark tops are brighter cross-hatch with a lit edge, the lower boxes (b-lowL.jpg, brightened) get
  // their lit diagonal-streaked sides and cross-hatched tops; the front below D stays black (source ~1)
  // A: the tall lit carton face, grain along it; its right side a dark strip
  const A = [[231, 77], [291, 246], [277, 333], [203, 184]];
  face(P, A, lin(205, 120, 285, 300, [[0, 0.8], [0.5, 0.73], [1, 0.58]]), { dir: "u", n: 34, seed: 21, dark: 0.72, lite: 0.3, w: [1, 3.4], edges: [[0, 1, 0.4], [3, 0, 0.22]] });
  face(P, [[291, 246], [300, 238], [296, 334], [277, 333]], 0.05, { n: 4, seed: 22, dark: 0.4 });
  // C: the dark top of the box whose side is B
  face(P, [[287, 221], [381, 209], [331, 334], [281, 334]], lin(290, 0, 380, 0, [[0, 0.08], [1, 0.15]]), { style: 1, dir: "u", n: 14, seed: 23, dark: 0.6, lite: 0.35, w: [0.8, 1.8], edges: [[0, 1, 0.25]] });
  // B: lit on its left, its right half turning into shadow
  const B = [[381, 221], [437, 377], [369, 577], [300, 440]];
  face(P, B, lin(320, 330, 445, 400, [[0, 0.66], [0.5, 0.58], [0.78, 0.39], [1, 0.18]]), { dir: "v", n: 38, seed: 24, dark: 0.75, lite: 0.3, w: [1, 3.4], edges: [[0, 3, 0.4], [0, 1, 0.2]] });
  // D: a cross-hatched top (lit from the desk side), its front edge caught; the front below it black
  face(P, [[162, 359], [306, 340], [300, 440], [125, 440]], lin(125, 0, 306, 0, [[0, 0.035], [1, 0.1]]), { style: 1, dir: "u", n: 16, seed: 25, dark: 0.6, lite: 0.4, w: [0.8, 2], edges: [[0, 1, 0.2], [3, 2, 0.28, 1.1]] });
  face(P, [[125, 440], [300, 440], [300, 470], [128, 468]], 0.06, { style: 0, sp: 0.2, ink: 0.5, n: 8, seed: 26, lite: 0.3, paleK: 0.6 });
  face(P, [[128, 468], [300, 470], [296, 560], [130, 560]], 0.004, { n: 2, seed: 20, patches: 0 });
  // E: a cross-hatched lit strip on top, a small lit face at its left end, the black front below; the box's lit side
  face(P, [[180, 605], [345, 625], [345, 645], [180, 650]], lin(180, 0, 345, 0, [[0, 0.06], [1, 0.1]]), { style: 1, ink: 0.7, dir: "u", n: 12, seed: 27, dark: 0.6, lite: 0.4, w: [0.8, 1.6], edges: [[0, 1, 0.2]] });
  face(P, [[150, 610], [210, 600], [250, 640], [260, 700], [200, 690]], 0.06, { style: 0, sp: 0.2, ink: 0.55, angle: 0.9, dir: "u", n: 8, seed: 32, lite: 0.35, paleK: 0.6, edges: [[0, 1, 0.2, 1]] });
  face(P, [[175, 650], [345, 645], [345, 755], [196, 790]], 0.006, { style: 0, n: 3, seed: 28, lite: 0.2, paleK: 0.4, w: [0.7, 1.2] });
  face(P, [[375, 565], [403, 562], [455, 700], [430, 760], [345, 640]], 0.066, { style: 0, sp: 0.22, ink: 0.55, angle: 1.2, dir: "u", n: 12, seed: 29, lite: 0.35, paleK: 0.7, w: [0.7, 1.6], edges: [[0, 1, 0.25, 1], [1, 2, 0.2, 1]] });
  // bottom-left: a box with a cross-hatched top, a lit diagonal-streaked right front and a dim left front
  face(P, [[190, 775], [330, 760], [400, 790], [300, 830], [200, 810]], 0.05, { style: 1, ink: 0.7, dir: "u", n: 12, seed: 30, lite: 0.45, w: [0.7, 1.5], edges: [[0, 1, 0.18]] });
  face(P, [[300, 790], [330, 760], [375, 830], [360, 946], [300, 946]], 0.075, { style: 0, sp: 0.22, ink: 0.55, angle: 1.15, dir: "u", n: 12, seed: 33, lite: 0.35, paleK: 0.7, w: [0.8, 1.8], edges: [[1, 2, 0.22, 1.1]] });
  face(P, [[140, 820], [300, 830], [300, 946], [130, 946]], 0.055, { style: 1, ink: 0.55, dir: "v", n: 12, seed: 31, lite: 0.4, paleK: 0.6, w: [0.7, 1.4], edges: [[0, 1, 0.16]] });
}

// ---------------------------------------------------------------- right: steel shelving in the dark
// Traced on 2-3x grids of the source (snapshots/s01-fix3-meas/g-right-a.jpg, g-right-b.jpg, s01-fix2r-meas/b-perR-*.jpg,
// brightened 3x): a wooden beam on the diagonal (its narrow left face lit), a rack unit with a knob, a stack of dark
// boxes in the middle, a slotted upright from the top right corner to the floor, the desk's slanted right leg, a strut,
// a box face, and boxes low on the right. Fix pass 2r: everything here is dim engraving (wide dim lines, ink 0.25-0.5)
// with ink only on lamp-facing edges at alpha <= 0.3; face means measured in plate polygons at t=0 (render / source
// before: beam's lit face 16 / 43, its broad face 30 / 12, upright 34 / 13, box face 34 / 16, low box top 16 / 5).
function paintRight(P) {
  const o = P.o;
  const barQ = (a, b, w) => { const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy), nx = (-dy / L) * w / 2, ny = (dx / L) * w / 2; return [[a[0] + nx, a[1] + ny], [b[0] + nx, b[1] + ny], [b[0] - nx, b[1] - ny], [a[0] - nx, a[1] - ny]]; };
  const D = (q, mean, o2 = {}) => face(P, q, mean * 1.2 / 255, { style: 0, sp: 0.3, ink: 0.45, paleK: 0.7, dark: 0.7, lite: 0.3, patches: 8, ...o2, n: (o2.n || 8) * 2.2, vstreaks: (o2.n || 8) * 4 });
  // the beam on the diagonal: a narrow lit face on its left (source mean 43), the broad top face dark (12)
  D([[1826, 82], [1840, 78], [2052, 398], [2040, 406]], 52, { dir: "v", n: 5, seed: 43, ink: 0.55, w: [0.8, 1.8], edges: [[0, 3, 0.3, 1.2]] });
  D([[1840, 78], [1868, 66], [2076, 388], [2052, 398]], 11, { dir: "v", n: 8, seed: 42, w: [0.8, 2] });
  // the rack unit hanging beside it: a dark box (13), its left edge caught, a knob
  const rk = [[1895, 30], [1925, 15], [2075, 215], [2045, 260]];
  D(rk, 14, { dir: "v", n: 8, seed: 44, w: [0.7, 1.6], edges: [[0, 3, 0.25, 1.1]] });
  P.fill(ell(2022, 220, 10, 16, 0.45), 0.2, 0, { style: 2 });
  P.fill(ell(2019, 214, 4, 6, 0.45), 0.38, 0, { style: 2 });
  // the stack in the middle: two dark boxes and a lower one (fronts 16 / 6 / 4), edges caught at 1840-1960 x 380-470
  D([[1795, 275], [1880, 300], [1885, 470], [1840, 480]], 18, { dir: "v", n: 8, seed: 53, w: [0.7, 1.5], edges: [[0, 1, 0.22, 1.1], [0, 3, 0.18, 1]] });
  D([[1880, 300], [1960, 330], [1955, 460], [1885, 470]], 9, { dir: "h", n: 8, seed: 55, style: 1, ink: 0.35, w: [0.7, 1.4], edges: [[3, 2, 0.2, 1]] });
  D([[1840, 480], [1955, 460], [1960, 560], [1860, 560]], 4, { dir: "h", n: 6, seed: 56, ink: 0.3, w: [0.7, 1.4], edges: [[0, 1, 0.16, 1]] });
  // the device on the stack's front: dim reels and a panel line
  for (const [x, y, rr] of [[1830, 420], [1846, 452]]) {
    P.fill(ell(x, y, rr, rr * 1.15, 0.3), 0.03, 0, { style: 2 });
    o.save(); o.strokeStyle = "rgba(242,240,234,0.16)"; o.lineWidth = 1.1; o.beginPath(); o.ellipse(x, y, rr, rr * 1.15, 0.3, 2.2, 5.6); o.stroke(); o.restore();
  }
  o.save(); o.globalAlpha = 0.14; line(o, [[1806, 320], [1818, 470]], 1, INK, 57); o.restore();
  // the slotted upright from the top right corner to the floor: a dim rail (13), slots as dark dashes, its left
  // (lamp-side) edge caught, brightest at y 400-600 (source ridge 60-100 there)
  const up = barQ([2214, 150], [1790, 928], 30);
  face(P, up, (g) => { const r = g.createLinearGradient(2214, 150, 1790, 928); r.addColorStop(0, grey(0.1)); r.addColorStop(0.3, grey(0.2)); r.addColorStop(0.5, grey(0.22)); r.addColorStop(0.75, grey(0.12)); r.addColorStop(1, grey(0.1)); return r; }, { style: 0, sp: 0.22, ink: 0.45, dir: "h", n: 6, seed: 41, lite: 0.2, paleK: 0.3, w: [0.7, 1.5], wav: 0.005, edges: [[0, 1, 0.3, 1.3]] });
  {
    const dx = 1790 - 2214, dy = 928 - 150, ang = Math.atan2(dy, dx);
    for (let s2 = 0.05; s2 < 0.97; s2 += 0.034) {
      const cx = 2214 + dx * s2, cy = 150 + dy * s2;
      o.save(); o.translate(cx, cy); o.rotate(ang); o.fillStyle = "rgba(2,2,2,0.85)"; o.beginPath(); o.roundRect(-7, -3, 14, 6, 2); o.fill(); o.restore();
    }
  }
  // the desk's slanted right leg (26) and a strut behind it (19)
  D([[1690, 562], [1722, 566], [1640, 772], [1606, 768]], 32, { dir: "v", n: 6, seed: 91, ink: 0.55, w: [0.8, 2], edges: [[0, 3, 0.28, 1.2]] });
  D(barQ([1800, 468], [1880, 702], 20), 20, { dir: "h", n: 5, seed: 45, ink: 0.5, edges: [[3, 2, 0.2, 1]] });
  // a box face in the dark (16), vertical lines
  D([[1758, 598], [1800, 610], [1836, 712], [1820, 796], [1772, 790]], 21, { dir: "u", n: 8, seed: 49, angle: 1.35, w: [0.7, 1.5], edges: [[0, 1, 0.18, 1]] });
  // boxes low on the right (source: the lit left face 30, its top 5, the front box's top 28, front 42, side 21)
  D([[1968, 795], [2025, 708], [2085, 808], [2020, 880]], 42, { dir: "u", n: 10, seed: 51, angle: -1.0, ink: 0.45, w: [0.7, 1.6], edges: [[0, 1, 0.3, 1.2]] });
  D([[2025, 705], [2150, 715], [2206, 730], [2206, 790], [2085, 808]], 5, { dir: "u", n: 8, seed: 52, style: 1, ink: 0.3, w: [0.7, 1.4], edges: [[0, 1, 0.18, 1]] });
  D([[1865, 795], [1960, 790], [1970, 860], [1880, 865]], 40, { dir: "u", n: 10, seed: 50, style: 1, ink: 0.45, edges: [[0, 1, 0.28, 1.1]] });
  D([[1820, 865], [1940, 860], [1950, 946], [1815, 946]], 58, { dir: "v", n: 10, seed: 58, style: 1, ink: 0.55, edges: [[0, 1, 0.25, 1.1]] });
  D([[1940, 860], [2010, 880], [2020, 946], [1950, 946]], 28, { dir: "v", n: 8, seed: 59, ink: 0.4 });
  D([[2085, 808], [2206, 790], [2206, 946], [2020, 946], [2020, 880]], 4, { dir: "v", n: 8, seed: 57, ink: 0.3, w: [0.7, 1.4] });
  // faint cables in the dark at the top
  o.save(); o.globalAlpha = 0.16;
  curve(o, [[1690, 0], [1740, 60], [1760, 160], [1745, 260]], 1.4, INK, 51);
  curve(o, [[1860, 20], [1820, 100], [1792, 190], [1780, 300]], 1.2, INK, 52);
  curve(o, [[1600, 60], [1680, 50], [1740, 20]], 1.1, INK, 53);
  o.restore();
}

// ---------------------------------------------------------------- floor and under the desk
// Planks running away from us, their seams converging toward a vanishing point far above the frame (~(1190,-890),
// fitted to seams at (644,809)-(600,946) and (1512,815)-(1537,946)); the desk's shadow is a dark cross-hatched band
// (y 785-850) with dark strokes hanging down from it; the lower planks are mid-grey, worn lighter in patches,
// falling into black toward both sides (z-floorL.jpg, z-floorR.jpg).
const FLOOR_VP = [1190, -890];
function paintFloor(P) {
  const o = P.o;
  const [vx, vy] = FLOOR_VP;
  const atY = (xb, y) => xb + (vx - xb) * ((946 - y) / (946 - vy));        // x of the seam that ends at (xb, 946)
  const seams = []; for (let xb = 170, k = 0; xb < 2050; xb += 88 + ((k * 37) % 23), k++) seams.push(xb);
  const Y0 = 780;
  for (let i = 0; i < seams.length - 1; i++) {
    const a = seams[i], b = seams[i + 1];
    const q = [[atY(a, Y0), Y0], [atY(b, Y0), Y0], [b, 946], [a, 946]];
    const ang = Math.atan2(946 - Y0, (a + b) / 2 - atY((a + b) / 2, Y0));
    const lit = 0.9 + 0.2 * Math.sin(i * 2.3);                                // planks differ a little
    // light worn wood (flat tone); the desk's shadow is inked over it (z-floor3.jpg): a grid of dark lines at the
    // back, then dark strokes hanging down the plank, tapering out by y ~850-935
    P.fill(poly(q), (g) => { const r = g.createLinearGradient(0, Y0, 0, 946); r.addColorStop(0, grey(0.08)); r.addColorStop(0.3, grey(0.58 * lit)); r.addColorStop(1, grey(0.74 * lit)); return r; }, ang, { style: 2 });
    const rc = rng(1400 + i);
    o.save(); o.beginPath(); o.moveTo(q[0][0], q[0][1]); o.lineTo(q[1][0], q[1][1]); o.lineTo(q[2][0], q[2][1]); o.lineTo(q[3][0], q[3][1]); o.closePath(); o.clip();
    o.fillStyle = "#060606"; o.fillRect(0, Y0 - 5, 2206, 9);
    for (let y = Y0 + 4; y < 836; y += 6.2 + rc() * 1.2) {
      const f = 1 - (y - Y0) / 60, xa = atY(a, y) - 3, xc = atY(b, y) + 3;
      o.globalAlpha = 0.85 + 0.15 * f;
      taper(o, [[xa, y], [(xa + xc) / 2, y + (rc() - 0.5)], [xc, y + (rc() - 0.5) * 1.5]], () => 1.8 + 2.4 * f * (0.8 + rc() * 0.4), "#060606");
    }
    for (let u = rc() * 0.1; u < 1.02; u += 0.085 + rc() * 0.04) {
      const xb = a + (b - a) * u, yEnd = 850 + Math.pow(rc(), 0.8) * 85;
      const pts = []; for (let y = Y0; y <= yEnd; y += 8) pts.push([atY(xb, y) + (rc() - 0.5) * 0.6, y]);
      o.globalAlpha = 0.8 + rc() * 0.2;
      const w0 = 2.6 + rc() * 1.6, yb = (836 - Y0) / (yEnd - Y0);
      taper(o, pts, (t) => (t < yb ? w0 : w0 * Math.pow(1 - (t - yb) / (1 - yb), 0.7)), "#070707");
    }
    o.restore();
  }
  // falling into black toward both sides and at the back (under the desk)
  const fl = [[150, Y0], [2060, Y0], [2060, 946], [150, 946]];
  P.light(poly(fl), (g) => { const r = g.createLinearGradient(250, 0, 1950, 0); r.addColorStop(0, "rgba(0,0,0,0.85)"); r.addColorStop(0.1, "rgba(0,0,0,0.45)"); r.addColorStop(0.2, "rgba(0,0,0,0)"); r.addColorStop(0.74, "rgba(0,0,0,0)"); r.addColorStop(0.86, "rgba(0,0,0,0.55)"); r.addColorStop(1, "rgba(0,0,0,0.92)"); return r; });
  // worn, lighter patches on the lower planks
  const r = rng(61);
  for (let i = 0; i < 120; i++) {
    const x = 420 + r() * 1350, y = 860 + r() * 86, rx = 5 + r() * 20, ry = 3 + r() * 8, lite = r() < 0.45;
    P.light(ell(x, y, rx, ry, (r() - 0.5) * 0.3), (g) => { const gr = g.createRadialGradient(x, y, 1, x, y, rx); gr.addColorStop(0, lite ? `rgba(255,255,255,${(0.14 + r() * 0.2).toFixed(2)})` : `rgba(0,0,0,${(0.08 + r() * 0.14).toFixed(2)})`); gr.addColorStop(1, lite ? "rgba(255,255,255,0)" : "rgba(0,0,0,0)"); return gr; });
  }
  // seams: dark, a little irregular
  for (const xb of seams) {
    const pts = []; for (let y = Y0 + 6; y <= 946; y += 12) pts.push([atY(xb, y) + (r() - 0.5) * 1.2, y]);
    o.save(); o.globalAlpha = 0.9; taper(o, pts, (u) => 1.6 + 1.8 * u, "#040404"); o.restore();
  }
  // cables on the floor (fix pass 2r, traced on 2.2-3.5x grids of the source, g-cabL/g-cabL2/g-cabR2.jpg): on the left
  // the three cables hanging off the desk (paintCables) run on into open, overlapping coils, plus a thick cable lying
  // across the front; on the right the cable dropping off the desk at x ~1445 runs back along the floor into one big
  // loop, and a second cable comes down past it from the shelving
  const loop = (pts, seed, w = 5, hl = 0.7) => { curve(o, pts, w, "#050505", seed, { ends: 0.9 }); curve(o, pts.map(([x, y]) => [x - w * 0.24, y - w * 0.28]), w * 0.26, `rgba(242,240,234,${hl})`, seed + 1, { ends: 0.3 }); };
  loop([[430, 838], [475, 850], [535, 858], [566, 876], [589, 896], [598, 922], [594, 946]], 70, 5.5, 0.55);
  loop([[552, 688], [520, 698], [492, 726], [481, 758], [489, 788], [507, 814], [530, 842], [556, 866], [582, 884]], 72, 4.5, 0.5);
  loop([[640, 946], [660, 905], [650, 870], [615, 858], [580, 866]], 73, 4.5, 0.4);
  loop([[1612, 812], [1596, 832], [1604, 852], [1628, 868], [1660, 886], [1692, 890], [1716, 876], [1724, 850], [1712, 822], [1686, 800], [1654, 789], [1624, 790], [1602, 802], [1578, 800]], 74, 5, 0.5);
  loop([[1726, 700], [1731, 760], [1732, 806], [1729, 854], [1719, 888], [1703, 914], [1687, 935], [1680, 946]], 76, 5, 0.45);
  // under the desk: black; the slanted desk legs catch a little light
  // the left leg: a dim board in the dark (source mean ~12 over 490-550 x 590-760), fine lines along it, one lit edge
  P.fill(poly([[494, 572], [524, 572], [596, 772], [566, 772]]), 0.19, 1.23, { spacing: 0.3, ink: 0.5 });
  o.save(); o.globalAlpha = 0.3; line(o, [[496, 575], [567, 770]], 1.2, INK, 90); o.restore();
}

// ---------------------------------------------------------------- desk
// fix pass 2r: the front edge is level at y 542 (column profiles of the t=0 source: the top edge's dark line sits at
// 541-543 from x 520 to 1700), the top is engraved wood (style-0 lines along the grain, ~4 px apart, merging into
// white in the light), and its tone is a measured 2-D value field (knots below: 20-40 px column medians of the source
// per row band, snapshots/s01-fix2r-meas), not a smooth glow.
export const DESK = [[507, 352], [560, 340], [700, 296], [860, 280], [1290, 262], [1480, 264], [1712, 300], [1782, 542], [443, 542]];
const knots = (rows) => (x, y) => {
  // rows: [[y, [[x, v], ...]], ...] sorted by y; piecewise linear in x per row, linear between rows
  const at = (ks) => { if (x <= ks[0][0]) return ks[0][1]; for (let i = 1; i < ks.length; i++) if (x <= ks[i][0]) { const [a, va] = ks[i - 1], [b, vb] = ks[i]; return va + (vb - va) * (x - a) / (b - a); } return ks[ks.length - 1][1]; };
  if (y <= rows[0][0]) return at(rows[0][1]);
  for (let i = 1; i < rows.length; i++) if (y <= rows[i][0]) { const [ya, ka] = rows[i - 1], [yb, kb] = rows[i], u = (y - ya) / (yb - ya); return at(ka) * (1 - u) + at(kb) * u; }
  return at(rows[rows.length - 1][1]);
};
// the left end: a plateau of mid-grey wood, then a ramp into the light that moves right toward the back
const DESK_L = knots([
  [300, [[680, 0.13], [720, 0.5], [760, 0.45], [800, 0.47], [845, 0.5], [870, 0.6]]],
  [330, [[560, 0.04], [640, 0.12], [680, 0.52], [720, 0.6], [760, 0.7], [800, 0.8], [840, 0.92], [870, 1]]],
  [360, [[505, 0.06], [530, 0.12], [560, 0.3], [600, 0.5], [640, 0.66], [680, 0.84], [720, 0.95], [760, 1]]],
  [400, [[470, 0.08], [520, 0.2], [560, 0.4], [600, 0.5], [640, 0.86], [680, 1]]],
  [440, [[455, 0.22], [480, 0.3], [520, 0.42], [560, 0.48], [600, 0.66], [640, 0.92], [690, 1]]],
  [480, [[445, 0.2], [480, 0.28], [520, 0.4], [575, 0.4], [605, 0.8], [640, 0.92], [680, 1]]],
  [542, [[445, 0.2], [480, 0.3], [520, 0.44], [575, 0.44], [605, 0.8], [640, 0.93], [680, 1]]],
]);
// the right end: falling off from x ~1500 into the dark, sooner at the back (the speaker's and the mug's shadows are
// separate shapes)
const DESK_R = knots([
  [262, [[1290, 0.5], [1400, 0.46], [1480, 0.3], [1520, 0.12]]],
  [300, [[1240, 0.82], [1320, 0.85], [1400, 0.56], [1440, 0.42], [1480, 0.3], [1520, 0.1]]],
  [330, [[1360, 0.95], [1400, 0.9], [1440, 0.55], [1480, 0.24], [1520, 0.11], [1560, 0.06]]],
  [360, [[1440, 0.97], [1480, 0.7], [1520, 0.5], [1560, 0.33], [1600, 0.14], [1640, 0.06]]],
  [400, [[1450, 1], [1540, 0.62], [1580, 0.64], [1620, 0.44], [1660, 0.16], [1700, 0.04]]],
  [440, [[1480, 0.98], [1520, 0.86], [1560, 0.8], [1600, 0.64], [1640, 0.4], [1680, 0.17], [1720, 0.08]]],
  [480, [[1485, 1], [1520, 0.92], [1560, 0.72], [1600, 0.56], [1640, 0.5], [1680, 0.4], [1720, 0.26], [1760, 0.15]]],
  [542, [[1490, 1], [1525, 0.96], [1560, 0.8], [1600, 0.68], [1640, 0.48], [1680, 0.4], [1720, 0.25], [1760, 0.14], [1790, 0.1]]],
]);
// paint a value field f(x, y) (0..1) into the plate's value map over a box, clipped to a path (computed at 2 px)
function valueField(P, path, x0, y0, x1, y1, f, res = 2) {
  const w = Math.ceil((x1 - x0) / res), h = Math.ceil((y1 - y0) / res);
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const g = c.getContext("2d"), im = g.createImageData(w, h);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const v = Math.round(Math.max(0, Math.min(1, f(x0 + (i + 0.5) * res, y0 + (j + 0.5) * res))) * 255), k = (j * w + i) * 4;
    im.data[k] = im.data[k + 1] = im.data[k + 2] = v; im.data[k + 3] = 255;
  }
  g.putImageData(im, 0, 0);
  P.v.save(); P.v.beginPath(); path(P.v); P.v.clip(); P.v.imageSmoothingEnabled = true; P.v.drawImage(c, x0, y0, w * res, h * res); P.v.restore();
}
// the same for the direction map (angle, spacing, style, ink per pixel), drawn without smoothing so styles never blend
function dirField(P, path, x0, y0, x1, y1, f, res = 2) {
  const w = Math.ceil((x1 - x0) / res), h = Math.ceil((y1 - y0) / res);
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const g = c.getContext("2d"), im = g.createImageData(w, h);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    let [a, sp, st, ink] = f(x0 + (i + 0.5) * res, y0 + (j + 0.5) * res); a %= Math.PI; if (a < 0) a += Math.PI;
    const k = (j * w + i) * 4;
    im.data[k] = Math.round((a / Math.PI) * 255); im.data[k + 1] = Math.round(sp * 255); im.data[k + 2] = st + 4 * Math.max(0, Math.min(63, Math.round((1 - ink) * 64))); im.data[k + 3] = 255;
  }
  g.putImageData(im, 0, 0);
  P.d.save(); P.d.beginPath(); path(P.d); P.d.clip(); P.d.imageSmoothingEnabled = false; P.d.drawImage(c, x0, y0, w * res, h * res); P.d.restore();
}
function paintDesk(P) {
  const o = P.o, v = P.v;
  const top = poly(DESK);
  // direction: engraved lines along the grain (the desk runs a hair uphill to the right in the plate)
  // per-pixel ink: the mid-tones are cut as wider, dimmer lines (ink 0.62-1 with the value), so the ends read as soft
  // grey wood with darker streaks rather than black-and-white stripes; the value map is divided by the same ink
  const deskB = (x, y) => Math.min(DESK_L(x, y), DESK_R(x, y));
  const deskInk = (x, y) => Math.round(Math.min(1, 0.55 + 0.5 * deskB(x, y)) * 64) / 64;
  dirField(P, top, 440, 260, 1790, 544, (x, y) => [-0.004, 0.42, 0, deskInk(x, y)]);
  // row-to-row irregularity in the mid-tones: some grain lines swell, others thin out (noise ~3.5 px across the grain,
  // ~60 px along it), so the ends read as streaky wood rather than ruled lines
  valueField(P, top, 440, 260, 1790, 544, (x, y) => {
    const b = deskB(x, y), m = 4 * b * (1 - b);
    return b * (1 + 0.42 * m * noise2(x / 60, y / 3.5, 17) + 0.18 * m * noise2(x / 14, y / 2.2, 19)) / deskInk(x, y);
  });
  // shadows of the gear (soft): the left speaker's wedge on the back-left, the carton's and the right speaker's at the
  // back right, the mug's (cast to the right and a dark crescent under it)
  v.save(); v.beginPath(); top(v); v.clip();
  v.filter = "blur(6px)";
  const sh = (pts, a) => { v.fillStyle = `rgba(0,0,0,${a})`; v.beginPath(); poly(pts)(v); v.fill(); };
  sh([[560, 340], [700, 296], [735, 300], [650, 350], [590, 380], [556, 370]], 0.55);
  sh([[1500, 380], [1540, 378], [1600, 404], [1622, 436], [1580, 444], [1540, 440]], 0.45);
  v.filter = "blur(3px)";
  sh([[1446, 426], [1470, 438], [1500, 440], [1530, 430], [1536, 444], [1500, 450], [1462, 446]], 0.4);
  v.filter = "none"; v.restore();
  // grain: irregular darker streaks painted into the value (so the knife runs thinner there), dense and dark toward
  // both ends, sparse faint dashes across the lit middle; a few paler streaks
  const r = rng(101);
  const topY = (x) => { const T = [[443, 542], [507, 352], [560, 340], [700, 296], [860, 280], [1290, 262], [1480, 264], [1712, 300], [1782, 542]]; for (let i = 1; i < T.length; i++) if (x <= T[i][0]) { const [x0, y0] = T[i - 1], [x1, y1] = T[i]; return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0); } return 542; };
  const leftX = (y) => 443 + ((542 - y) / 190) * 64, rightX = (y) => 1712 + ((y - 300) / 242) * 70;
  v.save(); v.beginPath(); top(v); v.clip(); v.lineCap = "round";
  for (let y = 300; y < 540; y += 2.2 + r() * 2.6) {
    // one streak per ~5 px of depth at each end, a faint one now and then across the middle
    for (const side of [0, 1, 2]) {
      let x, L, val, w;
      if (side === 0) { x = leftX(y) + 6 + Math.pow(r(), 1.3) * 170; L = 20 + r() * 110; val = 0.12 + r() * 0.2; w = 1 + r() * 2.2; }
      else if (side === 1) { x = 1500 + Math.pow(r(), 0.8) * (rightX(y) - 1500); L = 25 + r() * 110; val = 0.1 + r() * 0.22; w = 1 + r() * 2.2; }
      else { if (r() > 0.28) continue; x = 600 + r() * 940; L = 10 + r() * 36; val = 0.62 + r() * 0.25; w = 0.8 + r() * 0.8; }
      if (y < topY(x) + 3) continue;
      const pale = side < 2 && r() < 0.22;
      v.strokeStyle = grey(pale ? 0.72 + r() * 0.2 : val); v.globalAlpha = pale ? 0.5 : 0.85; v.lineWidth = w;
      const x0 = Math.max(leftX(y) + 2, x - L / 2), x1 = Math.min(rightX(y) - 2, x + L / 2);
      if (x1 - x0 < 6) continue;
      const dy = (r() - 0.5) * 2.4;
      v.beginPath(); v.moveTo(x0, y); v.quadraticCurveTo((x0 + x1) / 2, y + dy, x1, y + (r() - 0.5) * 1.6); v.stroke();
    }
  }
  v.globalAlpha = 1; v.restore();
  // the ends: slanted end-grain strokes along the left end, a cross-hatched block at the right end (g-deskLL/RR.jpg)
  P.fill(poly([[443, 542], [507, 352], [528, 350], [478, 542]]), lin(443, 0, 520, 0, [[0, 0.18], [1, 0.34]]), -1.26, { spacing: 0.3 });
  P.fill(poly([[1716, 372], [1732, 372], [1782, 542], [1678, 542], [1688, 470], [1706, 430]]), lin(0, 372, 0, 542, [[0, 0.08], [0.35, 0.2], [0.7, 0.34], [1, 0.36]]), 0.0, { style: 1, spacing: 0.32, ink: 0.8 });
  // crisp dark grain dashes on top (ink), mostly at the ends; the overlay sits above everything, so keep it off the
  // gear standing on the desk (mug, speakers, laptop)
  o.save();
  for (const f of [(c) => c.ellipse(1484, 390, 50, 56, 0, 0, 7), (c) => c.rect(1500, 360, 52, 70), poly([[548, 150], [665, 100], [720, 300], [616, 362]]), poly([[1508, 140], [1672, 190], [1632, 400], [1500, 345]]), DECK_PATH]) { o.beginPath(); o.rect(0, 0, 2206, 946); f(o); o.clip("evenodd"); }
  for (let i = 0; i < 260; i++) {
    const u = r(), y = 300 + r() * 238;
    const x = u < 0.45 ? leftX(y) + 4 + Math.pow(r(), 1.5) * 190 : u < 0.9 ? 1510 + Math.pow(r(), 0.9) * (rightX(y) - 1510) : 620 + r() * 880;
    if (y < topY(x) + 4) continue;
    const mid = u >= 0.9, L = mid ? 8 + r() * 22 : 16 + r() * 70;
    const x0 = Math.max(leftX(y) + 2, x - L / 2), x1 = Math.min(rightX(y) - 2, x + L / 2);
    if (x1 - x0 < 6) continue;
    o.globalAlpha = mid ? 0.1 + r() * 0.12 : 0.3 + r() * 0.35;
    curve(o, [[x0, y], [(x0 + x1) / 2, y + (r() - 0.5) * 2], [x1, y + (r() - 0.5) * 2]], mid ? 0.8 + r() * 0.4 : 0.9 + r() * 1.3, "#0a0a0a", 110 + i, { ends: 0.25 });
  }
  o.globalAlpha = 1; o.restore();
  // the front edge: one grey band (y 542-565) under a dark arris line with a thin lit line just below it
  // (profiles: ~100 across the middle, 50-70 at x 640, black at the left end, 55 at x 1600, 25 at x 1700)
  const band = [[443, 542], [1782, 542], [1782, 566], [443, 568]];
  P.fill(poly(band), lin(443, 0, 1782, 0, [[0, 0.06], [0.05, 0.07], [0.12, 0.2], [0.16, 0.25], [0.23, 0.36], [0.72, 0.4], [0.79, 0.36], [0.87, 0.23], [0.94, 0.11], [1, 0.06]]), 0.0, { style: 2 });
  // a little brushy unevenness along the band (value only; no ruled lines)
  { const rb = rng(197); v.save(); v.beginPath(); poly(band)(v); v.clip(); v.lineCap = "round";
    for (let i = 0; i < 90; i++) { const x = 460 + rb() * 1310, y = 545 + rb() * 19, L = 20 + rb() * 90, lt = rb() < 0.45; v.strokeStyle = lt ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.16)"; v.lineWidth = 1.5 + rb() * 2.5; v.beginPath(); v.moveTo(x, y); v.lineTo(x + L, y + (rb() - 0.5) * 1.5); v.stroke(); }
    v.restore(); }
  P.light(poly(band), (g) => { const q = g.createLinearGradient(0, 542, 0, 567); q.addColorStop(0, "rgba(0,0,0,0)"); q.addColorStop(0.6, "rgba(0,0,0,0.12)"); q.addColorStop(1, "rgba(0,0,0,0.3)"); return q; });
  line(o, [[443, 542.2], [1782, 542.2]], 1.9, "#050505", 192, 0.8);
  o.save(); o.globalAlpha = 0.55; line(o, [[470, 545], [1778, 545]], 1.4, INK, 193); o.globalAlpha = 0.2; line(o, [[600, 562.5], [1700, 562.5]], 1.1, INK, 194); o.restore();
  line(o, [[443, 567.5], [1782, 566]], 1.6, "#050505", 195, 0.8);
  // the lit left end, straight; the right end has no lit edge (it falls into the dark)
  line(o, [[443, 542], [507, 352]], 1.6, "rgba(242,240,234,0.45)", 190);
}

// ---------------------------------------------------------------- speakers
// fix pass 2r: dark wood fronts cut as dim engraving along the face (source ~0.1 with lighter vertical grain), a lit bevel
// down the lamp-side edge, black side faces; drivers are black cones with a glossy white surround arc (~200 deg on the
// lit side, 3 px), a streaky glossy crescent on the cone's inner wall and a dust cap with a highlight (b-spkR.jpg,
// c-spkL.jpg). Driver sizes re-measured: left woofer r 48 at (649,250), right woofer r 46 at (1564,296), right
// tweeter r 27 at (1586,212).
function driver(P, x, y, rr, rot, { arc = 2.1, seed = 1, hl = 1 } = {}) {
  const o = P.o, v = P.v, r = rng(seed);
  P.fill(ell(x, y, rr, rr * 0.94, rot), 0.06, 0, { style: 2 });
  P.fill(ell(x, y, rr * 0.8, rr * 0.75, rot), rad(x, y, 1, rr * 0.8, [[0, 0.02], [0.75, 0.035], [1, 0.07]]), 0, { style: 2 });
  // `arc` = screen angle (rad, y down) toward the lit side of the cone
  const cx = Math.cos(arc), cy = Math.sin(arc);
  // the glossy crescent: the cone's inner wall on the lit side, a broad bright band (value), streaked
  v.save(); v.beginPath(); v.ellipse(x, y, rr * 0.79, rr * 0.74, rot, 0, 7); v.clip();
  v.beginPath(); v.ellipse(x, y, rr * 0.79, rr * 0.74, rot, 0, 7); v.ellipse(x - cx * rr * 0.2, y - cy * rr * 0.2, rr * 0.66, rr * 0.62, rot, 0, 7, true);
  v.filter = "blur(1.2px)"; v.fillStyle = `rgba(255,255,255,${(0.82 * hl).toFixed(2)})`; v.fill("evenodd"); v.filter = "none";
  v.restore();
  o.save(); o.lineCap = "round";
  o.beginPath(); o.ellipse(x, y, rr * 0.79, rr * 0.74, rot, 0, 7); o.clip();
  for (let k = 0; k < 5; k++) {
    // a few dark streaks across the gloss (brush marks) and two thin bright ones
    const a0 = arc - rot + (r() - 0.5) * 1.8, rk = 0.62 + r() * 0.16, sp = 0.2 + r() * 0.35, dark = k < 3;
    o.strokeStyle = dark ? `rgba(8,8,8,${(0.25 + r() * 0.25).toFixed(2)})` : `rgba(250,249,245,${(0.5 * hl).toFixed(2)})`; o.lineWidth = dark ? rr * (0.02 + r() * 0.03) : 1.1;
    o.beginPath(); o.ellipse(x, y, rr * rk, rr * rk * 0.94, rot, a0 - sp / 2, a0 + sp / 2); o.stroke();
  }
  o.restore();
  o.save(); o.lineCap = "round";
  // the surround's rim: a glossy thin arc over ~200 deg on the lit side, strongest in the middle
  for (let k = 0; k < 7; k++) {
    const u0 = -1.75 + k * 0.5, u1 = u0 + 0.62, al = hl * 0.75 * Math.pow(Math.cos(((u0 + u1) / 2) / 1.9), 1.5);
    if (al <= 0.02) continue;
    o.strokeStyle = `rgba(242,240,234,${al.toFixed(2)})`; o.lineWidth = 2.2 * (0.5 + 0.5 * Math.cos((u0 + u1) / 2 / 1.9));
    o.beginPath(); o.ellipse(x, y, rr * 0.9, rr * 0.845, rot, arc - rot + u0, arc - rot + u1); o.stroke();
  }
  // dust cap: dark dome with a glossy highlight on the side toward the lamp (away from the crescent)
  P.fill(ell(x - cx * rr * 0.05, y - cy * rr * 0.05, rr * 0.2, rr * 0.19, rot), rad(x, y, 1, rr * 0.2, [[0, 0.16], [1, 0.06]]), 0, { style: 2 });
  o.fillStyle = `rgba(230,229,225,${(0.7 * hl).toFixed(2)})`; o.beginPath(); o.ellipse(x - cx * rr * 0.1, y - cy * rr * 0.12, rr * 0.08, rr * 0.05, rot - 0.6, 0, 7); o.fill();
  o.strokeStyle = "rgba(6,6,6,0.95)"; o.lineWidth = 2; o.beginPath(); o.ellipse(x, y, rr, rr * 0.94, rot, 0, 7); o.stroke();
  o.strokeStyle = "rgba(8,8,8,0.9)"; o.lineWidth = 1.2; o.beginPath(); o.ellipse(x, y, rr * 0.8, rr * 0.75, rot, 0, 7); o.stroke();
  o.restore();
}
function speaker(P, face, bevel, side, drivers, { faceV = 0.12, sideV = 0.01, seed = 1, lit = 0.4 } = {}) {
  const o = P.o;
  P.fill(poly(side), sideV, 1.5, { style: 2 });
  const ang = Math.atan2(face[3][1] - face[0][1], face[3][0] - face[0][0]);
  // dark wood (flat tone), lighter toward the lamp-facing top, with strong streaky grain along the face and worn patches
  P.fill(poly(face), lin(face[0][0], face[0][1], face[2][0], face[2][1], [[0, faceV * 1.5], [0.5, faceV], [1, faceV * 0.7]]), ang, { style: 2 });
  { const r = rng(seed + 3); P.v.save(); P.v.beginPath(); poly(face)(P.v); P.v.clip(); P.v.filter = "blur(4px)";
    for (let i = 0; i < 10; i++) { const q = quadAt(face, r(), r()), rr = 8 + r() * 18, lt = r() < 0.55; P.v.fillStyle = lt ? `rgba(255,255,255,${(0.05 + r() * 0.08).toFixed(3)})` : `rgba(0,0,0,${(0.1 + r() * 0.1).toFixed(3)})`; P.v.beginPath(); P.v.ellipse(q[0], q[1], rr, rr * 1.8, ang, 0, 7); P.v.fill(); }
    P.v.restore(); }
  if (bevel) P.fill(poly(bevel), lit, ang, { style: 2 });
  grain(o, face, 26, { dir: "v", w: 3, color: "rgba(0,0,0,0.75)", seed, len: [0.25, 0.9], wav: 0.012 });
  grain(o, face, 18, { dir: "v", w: 1.6, color: "rgba(242,240,234,0.2)", seed: seed + 7, len: [0.15, 0.6], wav: 0.014 });
  for (const [x, y, rr, rot, arc, hl] of drivers) driver(P, x, y, rr, rot, { arc, hl, seed: seed + Math.round(x) });
}
function paintSpeakers(P) {
  const o = P.o;
  // left: front face faces the desk light; lit left bevel; dark left side in shadow
  const LF = [[560, 158], [665, 108], [715, 300], [616, 358]];
  speaker(P, LF, [[560, 158], [572, 153], [628, 351], [616, 358]], [[560, 158], [556, 162], [612, 362], [616, 358]],
    [[624, 172, 25, -0.45, 2.3, 0.85], [649, 250, 48, -0.45, 2.2, 1]], { faceV: 0.175, seed: 201, lit: 0.38 });
  P.fill(poly([[560, 158], [665, 108], [652, 100], [548, 150]]), 0.14, -0.44, { style: 2 });
  o.save(); o.globalAlpha = 0.3; line(o, [[560, 158], [665, 108]], 1.3, INK, 202); o.globalAlpha = 0.6; line(o, [[560, 158], [616, 358]], 1.5, INK, 203); o.globalAlpha = 0.1; line(o, [[665, 108], [715, 300]], 1.1, INK, 204); o.restore();
  // right: turned toward the laptop; a dark front with a lit bevel down its left edge, a narrow black side face
  const RF = [[1548, 148], [1652, 200], [1612, 392], [1508, 340]];
  speaker(P, RF, [[1548, 148], [1559, 153], [1519, 345], [1508, 340]], [[1652, 200], [1670, 197], [1630, 394], [1612, 392]],
    [[1586, 212, 27, 0.43, 0.75, 0.9], [1564, 296, 46, 0.43, 1.75, 1]], { faceV: 0.15, sideV: 0.01, seed: 211, lit: 0.36 });
  o.save(); o.globalAlpha = 0.7; line(o, [[1548, 148], [1652, 200]], 1.8, INK, 212); o.globalAlpha = 0.45; line(o, [[1548, 148], [1508, 340]], 1.4, INK, 213); o.globalAlpha = 0.18; line(o, [[1670, 197], [1630, 394]], 1, INK, 214); o.restore();
}

// ---------------------------------------------------------------- laptop (no hands: those are figure.js)
// keyboard layout measured at 3x (snapshots/s01-fix1-meas/z-kb.jpg)
export const KEYS = (() => {
  const k = [];
  const row = (y, h, xs) => xs.forEach(([x0, x1]) => k.push([x0, y, x1 - x0, h]));
  const run = (x0, n, w, pitch) => Array.from({ length: n }, (_, i) => [x0 + i * pitch, x0 + i * pitch + w]);
  row(337, 8.5, run(893, 14, 20.5, 25.6));
  row(348, 12.5, [[891, 932], ...run(937, 12, 20.5, 25.1), [1238, 1252]]);
  row(364, 13.5, [[890, 920], ...run(925, 12, 20.5, 24.7)]);
  row(381, 14, [[886, 936], ...run(941, 11, 20.5, 24.6)]);
  k.push([1222, 364, 35, 31]);                                    // tall return
  row(399, 14, [[885, 941], ...run(946, 10, 20.5, 24.6), [1219, 1258]]);
  row(417, 15, [[885, 911], [915, 941], [945, 971], [975, 1003], [1008, 1098], [1102, 1130], [1133, 1160], [1163, 1186]]);
  k.push([1190, 425, 22, 8], [1215, 417, 22, 7], [1215, 426, 22, 7], [1242, 425, 21, 8]);
  return k;
})();
export const TRACKPAD = [1005, 447, 133, 58];
export const DECK_PATH = (c) => {
  c.moveTo(868, 304); c.lineTo(1268, 303); c.quadraticCurveTo(1305, 304, 1307, 330); c.lineTo(1310, 500);
  c.quadraticCurveTo(1310, 521, 1288, 522); c.lineTo(858, 523); c.quadraticCurveTo(836, 522, 837, 500);
  c.lineTo(840, 330); c.quadraticCurveTo(842, 305, 868, 304); c.closePath();
};
function paintLaptop(P) {
  const o = P.o;
  // lid: black, its top edge caught by the lamp
  const lid = [[845, 42], [1300, 42], [1286, 298], [864, 300]];
  P.fill(poly(lid), 0.05, 0, { style: 2 });
  line(o, [[852, 42.5], [1294, 42.5]], 1.8, "rgba(242,240,234,0.75)", 301);
  o.save(); o.globalAlpha = 0.45; line(o, [[846, 48], [864, 296]], 1.4, INK, 302); line(o, [[1299, 48], [1286, 294]], 1.4, INK, 303); o.restore();
  // deck
  const deck = DECK_PATH;
  P.fill(deck, lin(0, 304, 0, 523, [[0, 0.84], [0.2, 0.9], [0.5, 0.93], [0.85, 0.96], [1, 0.88]]), 0, { style: 2 });
  o.save(); o.strokeStyle = "#141414"; o.lineWidth = 1.8; o.beginPath(); deck(o); o.stroke(); o.restore();
  // hinge slot and the front notch
  P.fill(poly([[866, 298], [1286, 296], [1290, 309], [862, 311]]), 0.1, 0, { style: 2 });
  P.fill(poly([[868, 311], [1288, 309], [1290, 318], [866, 320]]), 0.5, 0, { style: 2 });
  o.save();
  o.strokeStyle = "rgba(20,20,20,0.6)"; o.lineWidth = 1.4; o.beginPath(); o.moveTo(842, 512); o.lineTo(1040, 512); o.quadraticCurveTo(1045, 519, 1050, 519); o.lineTo(1113, 519); o.quadraticCurveTo(1118, 519, 1123, 512); o.lineTo(1306, 511); o.stroke();
  // keyboard well
  o.strokeStyle = "rgba(60,60,60,0.55)"; o.lineWidth = 1; o.beginPath(); o.roundRect(884, 330, 374, 109, 5); o.stroke();
  o.restore();
  for (const [x, y, w, h] of KEYS) P.fill(rrect(x, y, w, h, 3), 0.6, 0, { style: 2 });
  o.save(); o.strokeStyle = "rgba(12,12,12,0.95)"; o.lineWidth = 1.3;
  for (const [x, y, w, h] of KEYS) { o.beginPath(); o.roundRect(x, y, w, h, 3); o.stroke(); }
  o.restore();
  // trackpad
  const [tx, ty, tw, th] = TRACKPAD;
  P.fill(rrect(tx, ty, tw, th, 5), 0.99, 0, { style: 2 });
  o.save(); o.strokeStyle = "rgba(40,40,40,0.75)"; o.lineWidth = 1.3; o.beginPath(); o.roundRect(tx, ty, tw, th, 5); o.stroke(); o.restore();
  // ports on the right side
  P.fill(rect(1305, 340, 6, 14), 0.2, 0, { style: 2 }); P.fill(rect(1306, 372, 6, 12), 0.2, 0, { style: 2 });
}

// ---------------------------------------------------------------- cables and jacks
function cable(o, pts, w = 5, seed = 1, hl = 0.8) {
  curve(o, pts, w, "#050505", seed, { ends: 0.8 });
  curve(o, pts.map(([x, y]) => [x - w * 0.18, y - w * 0.22]), w * 0.24, `rgba(242,240,234,${hl})`, seed + 1000, { ends: 0.3 });
}
function jack(o, x0, x1, y, h = 11) {
  const g = o.createLinearGradient(0, y - h / 2, 0, y + h / 2);
  g.addColorStop(0, "#9a9a96"); g.addColorStop(0.3, "#f4f3ee"); g.addColorStop(0.55, "#d8d7d2"); g.addColorStop(1, "#6d6d6a");
  o.save(); o.fillStyle = g; o.beginPath(); o.roundRect(x0, y - h / 2, x1 - x0, h, 2); o.fill();
  o.strokeStyle = "#111"; o.lineWidth = 1.2; o.stroke();
  o.fillStyle = "#1a1a1a"; o.fillRect(x0 + (x1 - x0) * 0.35, y - h / 2, 1.6, h); o.fillRect(x0 + (x1 - x0) * 0.55, y - h / 2, 1.2, h);
  o.restore();
}
function paintCables(P) {
  const o = P.o;
  // left side: from the jacks over the desk, off the front edge and down to the floor
  cable(o, [[826, 352], [790, 346], [772, 325], [773, 300], [790, 280], [825, 266], [870, 256]], 5, 401);
  cable(o, [[826, 370], [760, 374], [722, 398], [706, 430], [712, 462], [742, 502], [770, 542], [790, 575], [800, 610]], 5, 403);
  // three cables fall off the front edge at x ~571, 583 and 626 and hang in S-curves to the floor (g-cabL2.jpg)
  cable(o, [[818, 426], [772, 430], [735, 442], [698, 462], [664, 492], [640, 520], [628, 542], [626, 580], [625, 612], [623, 650], [621, 690], [620, 740], [616, 770], [607, 800], [596, 830], [590, 860], [594, 900], [598, 922], [594, 946]], 5, 405);
  cable(o, [[860, 262], [800, 300], [740, 335], [690, 368], [640, 405], [605, 440], [590, 480], [584, 520], [583, 542], [597, 569], [609, 596], [616, 625], [620, 652], [620, 690], [617, 730], [610, 768], [598, 800], [583, 830], [560, 860], [540, 885], [530, 915], [528, 946]], 5.5, 407);
  cable(o, [[640, 405], [590, 385], [530, 385], [490, 405], [470, 450], [478, 505], [505, 530], [548, 538], [571, 542], [575, 570], [584, 597], [598, 621], [614, 646], [631, 671], [646, 700], [655, 725], [657, 748], [652, 770], [638, 795], [612, 818], [580, 838], [548, 858], [520, 876], [495, 900], [478, 930], [470, 946]], 4.8, 409, 0.6);
  cable(o, [[700, 300], [680, 330], [640, 360], [600, 380], [560, 380]], 4, 411, 0.5);
  jack(o, 826, 856, 352); jack(o, 826, 856, 370); jack(o, 816, 856, 426, 12);
  // right side: to the lamp, behind the mug, and down over the front edge
  cable(o, [[1318, 346], [1352, 338], [1382, 318], [1402, 296], [1430, 282], [1470, 276]], 5, 421);
  cable(o, [[1318, 378], [1362, 372], [1388, 348], [1394, 318], [1380, 292], [1350, 282], [1300, 272], [1250, 262]], 5, 423);
  cable(o, [[1300, 290], [1350, 306], [1390, 352], [1402, 402], [1424, 460], [1440, 510], [1446, 552], [1447, 620], [1446, 690], [1452, 735], [1475, 768], [1520, 790], [1570, 800], [1580, 800]], 5, 425);
  cable(o, [[1240, 262], [1350, 282], [1450, 306], [1500, 290], [1530, 270]], 4, 427, 0.5);
  jack(o, 1304, 1332, 346, 10); jack(o, 1304, 1336, 378, 11);
  // behind the laptop on the right: a pair of thick cables sagging from the hinge corner toward the lamp, in the
  // carton's shadow (traced at 3.5x, g-behR4.jpg: at x 1400 they lie at y ~298 and ~308)
  cable(o, [[1262, 256], [1300, 270], [1340, 285], [1380, 297], [1420, 303], [1460, 301], [1490, 290], [1512, 272]], 6, 431, 0.55);
  cable(o, [[1262, 266], [1300, 280], [1340, 295], [1380, 307], [1420, 313], [1458, 311], [1486, 301], [1506, 286]], 5.5, 433, 0.45);
  cable(o, [[1330, 262], [1370, 268], [1420, 276], [1470, 278], [1520, 268]], 4.5, 435, 0.35);
}

// ---------------------------------------------------------------- lamp and mug
function paintLamp(P) {
  const o = P.o;
  // neck: a tube continuing the shade's axis up and to the right, lit on its left (fix pass 2b: no separate cap)
  P.fill(blob([[1497, 116], [1506, 94], [1519, 74], [1532, 66], [1547, 70], [1553, 82], [1545, 104], [1537, 122], [1516, 124]]), lin(1497, 0, 1553, 0, [[0, 0.66], [0.35, 0.46], [0.7, 0.2], [1, 0.1]]), 2.2, { style: 2 });
  stroke(o, [[1501, 110], [1510, 90], [1522, 74]], 3.2, "rgba(242,240,234,0.75)", 501, 0.5);
  curve(o, [[1519, 74], [1532, 66], [1547, 70], [1553, 82]], 1.4, "rgba(242,240,234,0.35)", 502, { ends: 0.3 });
  // the bell shade, mouth down-left toward the desk
  const shade = [[1436, 159], [1450, 140], [1470, 125], [1502, 109], [1522, 112], [1541, 137], [1555, 167], [1546, 200], [1537, 211], [1500, 196], [1465, 180]];
  // smooth glossy metal (flat tone, no engraved stripes): lit upper left, falling into shadow on the right
  P.fill(blob(shade), lin(1445, 125, 1552, 185, [[0, 0.74], [0.25, 0.62], [0.5, 0.42], [0.75, 0.24], [1, 0.12]]), 0.9, { style: 2 });
  P.light(ell(1472, 146, 30, 13, -0.55), (g) => { const r = g.createRadialGradient(1472, 146, 2, 1472, 146, 30); r.addColorStop(0, "rgba(255,255,255,0.45)"); r.addColorStop(1, "rgba(255,255,255,0)"); return r; });
  // a few soft form lines on the shaded side
  for (const [pts, w, a] of [[[[1512, 116], [1528, 150], [1534, 196]], 1.6, 0.35], [[[1526, 118], [1540, 150], [1544, 190]], 1.4, 0.3], [[[1498, 118], [1512, 150], [1518, 194]], 1.2, 0.2]]) { o.save(); o.globalAlpha = a; stroke(o, pts, w, "#0a0a0a", 508 + pts[0][0], 0.5); o.restore(); }
  // mouth: a dark ellipse with the burning bulb and a lit rim
  P.fill(ell(1487, 187, 54, 13, 0.36), 0.03, 0, { style: 2 });
  P.fill(ell(1484, 183, 17, 8, 0.36), 1, 0, { style: 2 });
  P.light(ell(1488, 184, 30, 13, 0.36), (g) => { const r = g.createRadialGradient(1488, 183, 3, 1488, 183, 28); r.addColorStop(0, "rgba(255,255,255,0.9)"); r.addColorStop(1, "rgba(255,255,255,0)"); return r; }, "source-over", 1);
  o.save();
  o.strokeStyle = "rgba(200,198,192,0.25)"; o.lineWidth = 1.6; o.beginPath(); o.ellipse(1487, 187, 54, 13, 0.36, 0.1, PI - 0.2); o.stroke();
  o.strokeStyle = "rgba(248,247,242,0.95)"; o.lineWidth = 3.4; o.beginPath(); o.ellipse(1487, 187, 54, 13, 0.36, PI * 0.55, PI * 1.05); o.stroke();
  o.strokeStyle = DARK; o.lineWidth = 1.6; o.beginPath(); o.ellipse(1487, 187, 55, 14.5, 0.36, 0, 7); o.stroke();
  o.restore();
  // highlight along the upper-left of the dome
  stroke(o, [[1439, 157], [1452, 140], [1470, 125], [1487, 116]], 5.5, "rgba(250,249,245,0.95)", 505, 0.45);
  stroke(o, [[1460, 150], [1476, 138], [1492, 131]], 4, "rgba(250,249,245,0.5)", 506, 0.5);
  curve(o, shade.slice(0, 7), 1.6, DARK, 507);
}
// fix pass 2r: re-traced at 4x (g-mug.jpg) and per-row profiles: rounded white ceramic lit from the left and falling to
// ~0.2 at its right edge (x 1446-1461: 245, 1486: 180, 1501: 95, 1516: 50), a rounded bottom, a tall rim ellipse
// (1488,343) 39x24 with the inner wall lit on the right above the coffee, and a thick handle attached at y ~368 and
// ~420 with a dark contour, a grey face and the desk showing through its hole
const MUG_BODY = (c) => { c.moveTo(1449, 343); c.bezierCurveTo(1445, 368, 1441, 392, 1440, 414); c.bezierCurveTo(1440, 428, 1456, 437, 1484, 438); c.bezierCurveTo(1504, 438, 1514, 432, 1516, 420); c.bezierCurveTo(1519, 395, 1523, 368, 1527, 341); c.closePath(); };
function paintMug(P) {
  const o = P.o;
  // the soft contact shadow it throws on the desk, to the right (the lamp is up left)
  P.light(ell(1520, 432, 46, 14, 0.15), (g) => { const r = g.createRadialGradient(1515, 430, 3, 1520, 432, 46); r.addColorStop(0, "rgba(0,0,0,0.5)"); r.addColorStop(1, "rgba(0,0,0,0)"); return r; });
  // the handle: a closed thick loop (outer ~22 x 27, hole ~9 x 15) attached at y ~368 and ~420
  const HO = (c) => { c.moveTo(1514, 366); c.bezierCurveTo(1530, 362, 1546, 368, 1548, 388); c.bezierCurveTo(1550, 408, 1540, 422, 1514, 424); c.closePath(); };
  const HI = (c) => { c.moveTo(1519, 380); c.bezierCurveTo(1528, 378, 1536, 383, 1536, 394); c.bezierCurveTo(1536, 405, 1529, 412, 1518, 411); c.closePath(); };
  P.fill(HO, lin(1514, 370, 1548, 410, [[0, 0.55], [0.5, 0.5], [1, 0.36]]), 0, { style: 2 });
  P.fill(HI, 0.42, 0, { style: 2 });
  o.save(); o.lineJoin = "round";
  o.beginPath(); o.rect(1400, 300, 200, 160); MUG_BODY(o); o.clip("evenodd");
  o.strokeStyle = DARK; o.lineWidth = 2.6; o.beginPath(); HO(o); o.stroke(); o.lineWidth = 2.2; o.beginPath(); HI(o); o.stroke();
  o.strokeStyle = "rgba(225,224,219,0.55)"; o.lineWidth = 1.3; o.beginPath(); o.moveTo(1522, 369); o.bezierCurveTo(1534, 368, 1543, 375, 1545, 388); o.stroke();
  o.restore();
  // the body: lit from the left, grey across the middle, dark on the right; a little darker low down
  P.fill(MUG_BODY, lin(1440, 0, 1527, 0, [[0, 0.96], [0.2, 0.98], [0.35, 0.93], [0.52, 0.8], [0.65, 0.6], [0.78, 0.42], [0.9, 0.28], [1, 0.22]]), PI / 2, { style: 2 });
  P.light(MUG_BODY, (g) => { const r = g.createLinearGradient(0, 395, 0, 438); r.addColorStop(0, "rgba(0,0,0,0)"); r.addColorStop(1, "rgba(0,0,0,0.22)"); return r; });
  // soft vertical brush tone across the shaded half
  { const r = rng(551); P.v.save(); P.v.beginPath(); MUG_BODY(P.v); P.v.clip(); P.v.filter = "blur(1.6px)"; P.v.lineCap = "round";
    for (let i = 0; i < 12; i++) { const x = 1470 + r() * 44; P.v.strokeStyle = `rgba(0,0,0,${(0.06 + r() * 0.1).toFixed(3)})`; P.v.lineWidth = 2 + r() * 3; P.v.beginPath(); P.v.moveTo(x, 352 + r() * 12); P.v.lineTo(x - 1 + r() * 2, 432 - r() * 14); P.v.stroke(); }
    P.v.restore(); }
  // rim, the inner wall (lit on the right), the coffee low inside with a small highlight near the rim
  P.fill(ell(1488, 343, 39, 23.5, -0.1), 0.9, 0, { style: 2 });
  P.fill(ell(1488, 343, 34.5, 19.5, -0.1), lin(1454, 0, 1522, 0, [[0, 0.32], [0.45, 0.62], [0.8, 0.95], [1, 0.9]]), 0, { style: 2 });
  P.fill(ell(1486, 352, 31, 12.5, -0.08), 0.1, 0, { style: 2 });
  P.fill(ell(1502, 349, 9, 2.2, -0.2), 0.34, 0, { style: 2 });
  P.fill(ell(1476, 356, 6, 1.5, -0.05), 0.2, 0, { style: 2 });
  o.save(); o.lineJoin = "round";
  o.strokeStyle = DARK; o.lineWidth = 2; o.beginPath(); o.ellipse(1488, 343, 39, 23.5, -0.1, 0, 7); o.stroke();
  o.strokeStyle = "rgba(20,20,20,0.8)"; o.lineWidth = 1.2; o.beginPath(); o.ellipse(1488, 343, 34.5, 19.5, -0.1, 0, 7); o.stroke();
  o.lineWidth = 2; o.strokeStyle = DARK; o.beginPath(); o.moveTo(1449, 343); o.bezierCurveTo(1445, 368, 1441, 392, 1440, 414); o.bezierCurveTo(1440, 428, 1456, 437, 1484, 438); o.bezierCurveTo(1504, 438, 1514, 432, 1516, 420); o.bezierCurveTo(1519, 395, 1523, 368, 1527, 341); o.stroke();
  o.restore();
}

export function paintRoom(P) {
  paintBack(P);
  paintFloor(P);
  paintLeft(P);
  paintRight(P);
  paintDesk(P);
  paintSpeakers(P);
  paintLaptop(P);
  paintCables(P);
  paintLamp(P);
  paintMug(P);
}
