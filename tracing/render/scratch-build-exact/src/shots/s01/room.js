// s01 room plate: everything that never moves except the figure and the right hand (figure.js).
// Plate coordinates = the t=0 source frame; every shape below was traced from labelled 2-4x grids of the
// source (snapshots/s01-fix1-meas/*.jpg). Values are a study of the source's light: pure black around the
// edges, the desk nearly white under the laptop, the gear only caught on its lamp-facing edges.
import { INK, DARK, grey, rng, taper, poly, blob, ell, rect, rrect, lin, rad, line, curve, stroke, grain, quadAt } from "./kit.js";

const PI = Math.PI;

// ---------------------------------------------------------------- back: cartons and boxes behind the desk
function paintBack(P) {
  const o = P.o;
  // wide carton behind the left speaker: soft vertical brush grain, its left edge a diagonal into black
  const cb = [[555, 0], [850, 0], [850, 104], [662, 108]];
  P.fill(poly(cb), lin(555, 0, 850, 0, [[0, 0.2], [0.5, 0.3], [1, 0.26]]), PI / 2, { spacing: 0.3 });
  grain(o, cb, 40, { dir: "v", w: 2.6, color: "rgba(0,0,0,0.9)", seed: 3, len: [0.6, 1] });
  // carton directly above the laptop lid
  const cm = [[902, 0], [1196, 0], [1192, 42], [906, 42]];
  P.fill(poly(cm), lin(0, 0, 0, 42, [[0, 0.34], [1, 0.2]]), PI / 2, { spacing: 0.28 });
  grain(o, cm, 44, { dir: "v", w: 2.2, color: "rgba(0,0,0,0.9)", seed: 5, len: [0.6, 1] });
  P.fill(poly([[1196, 0], [1300, 0], [1300, 42], [1192, 42]]), 0.22, PI / 2, { spacing: 0.3 });
  grain(o, [[1196, 0], [1300, 0], [1300, 42], [1192, 42]], 12, { dir: "v", w: 2, color: "rgba(0,0,0,0.85)", seed: 6 });
  // the tall lit carton face right of the lid, brightest on its right
  const ct = [[1300, 8], [1396, 96], [1368, 256], [1300, 226]];
  P.fill(poly(ct), lin(1300, 0, 1396, 0, [[0, 0.3], [0.5, 0.55], [1, 0.8]]), PI / 2 - 0.08, { spacing: 0.3 });
  grain(o, ct, 16, { dir: "v", w: 2.8, color: "rgba(0,0,0,0.8)", seed: 7, len: [0.35, 0.9] });
  line(o, [[1396, 96], [1368, 256]], 1.8, "rgba(242,240,234,0.5)", 8);
  // box behind the left speaker, lit side facing the laptop, dark top
  const cs = [[742, 145], [805, 117], [812, 222], [760, 240]];
  P.fill(poly(cs), lin(742, 0, 812, 0, [[0, 0.45], [1, 0.62]]), PI / 2 - 0.1, { spacing: 0.3 });
  grain(o, cs, 10, { dir: "v", w: 2.2, color: "rgba(0,0,0,0.8)", seed: 9 });
  P.fill(poly([[700, 110], [806, 106], [805, 117], [742, 145], [705, 140]]), 0.16, 0.3, { spacing: 0.35, style: 1 });
}

// ---------------------------------------------------------------- left: stacked cartons falling into black
// One solid stack seen from above (traced: snapshots/s01-fix2-meas/z-left.jpg): each lit face (A, B) is the side of a
// box whose dark top (C, D, E) and shadowed side share its corners; values from region means of the source.
function paintLeft(P) {
  const o = P.o;
  // A: the tall lit carton face, engraved along its grain; its right side a dark strip
  const A = [[231, 77], [291, 246], [277, 333], [203, 184]];
  P.fill(poly(A), lin(205, 120, 285, 300, [[0, 0.75], [0.5, 0.67], [1, 0.53]]), 1.23, { spacing: 0.22 });
  grain(o, A, 9, { dir: "u", w: 1.8, color: "rgba(0,0,0,0.55)", seed: 21, len: [0.3, 0.8], wav: 0.03 });
  const Aside = [[291, 246], [300, 238], [296, 334], [277, 333]];
  P.fill(poly(Aside), 0.06, 1.5, { spacing: 0.4 });
  o.save(); o.globalAlpha = 0.55; line(o, [[231, 77], [291, 246]], 1.4, INK, 20); o.globalAlpha = 0.3; line(o, [[203, 184], [231, 77]], 1.2, INK, 19); o.restore();
  // C: the dark top of the box whose side is B, sharing A's lower right corner
  const C = [[287, 221], [381, 209], [331, 334], [281, 334]];
  P.fill(poly(C), lin(290, 0, 380, 0, [[0, 0.08], [1, 0.16]]), 0.05, { spacing: 0.34, style: 1 });
  // B: lit on its left, its right half turning into shadow with dense streaks
  const B = [[381, 221], [437, 377], [369, 577], [300, 440]];
  P.fill(poly(B), lin(300, 440, 437, 377, [[0, 0.74], [0.45, 0.66], [0.72, 0.24], [1, 0.11]]), 1.23, { spacing: 0.24 });
  grain(o, B, 14, { dir: "v", w: 2.2, color: "rgba(0,0,0,0.6)", seed: 23, len: [0.4, 0.95], wav: 0.02 });
  o.save(); o.globalAlpha = 0.45; line(o, [[381, 221], [300, 440]], 1.4, INK, 24); o.globalAlpha = 0.25; line(o, [[381, 221], [437, 377]], 1.2, INK, 26); o.restore();
  // D: a dark top on the left, its right end meeting A's foot and B's left corner
  const D = [[162, 359], [306, 340], [300, 440], [125, 440]];
  P.fill(poly(D), lin(125, 0, 306, 0, [[0, 0.04], [1, 0.16]]), 0.06, { spacing: 0.36, style: 1 });
  P.fill(poly([[125, 440], [300, 440], [300, 470], [128, 468]]), 0.03, 1.5, { spacing: 0.4 });
  // E: the lower box top, and the box's shadowed front below it
  const E = [[180, 598], [387, 588], [383, 640], [175, 650]];
  P.fill(poly(E), lin(175, 0, 387, 0, [[0, 0.03], [1, 0.12]]), 0.04, { spacing: 0.36, style: 1 });
  P.fill(poly([[175, 650], [383, 640], [395, 760], [196, 790]]), 0.02, 1.5, { spacing: 0.45 });
  // the side of the box below B, dark with a few lines
  P.fill(poly([[375, 560], [440, 580], [450, 760], [395, 760]]), 0.05, 1.45, { spacing: 0.34 });
  // bottom-left boxes: dim, cross-hatched, one faint lit edge
  P.fill(poly([[150, 790], [300, 765], [312, 946], [160, 946]]), lin(150, 0, 312, 0, [[0, 0.02], [1, 0.07]]), 1.45, { spacing: 0.42, style: 1 });
  P.fill(poly([[312, 770], [440, 760], [470, 946], [320, 946]]), 0.03, 1.5, { spacing: 0.45, style: 1 });
  o.save(); o.globalAlpha = 0.22; line(o, [[300, 765], [312, 946]], 1.6, INK, 25); o.restore();
}

// ---------------------------------------------------------------- right: steel shelving in the dark
function paintRight(P) {
  const o = P.o;
  // the dim mass of shelving, boxes and cables (nothing but true shadow is pure black): faint grain everywhere
  P.fill(poly([[1760, 0], [2206, 0], [2206, 946], [1790, 946]]), 0.035, 1.05, { spacing: 0.4 });
  // the wood-grain box behind the right speaker
  const gb = [[1600, 62], [1716, 52], [1722, 250], [1624, 262]];
  P.fill(poly(gb), lin(1600, 0, 1722, 0, [[0, 0.16], [0.15, 0.1], [1, 0.06]]), PI / 2 - 0.05, { spacing: 0.26 });
  grain(o, gb, 12, { dir: "v", w: 1.8, color: "rgba(0,0,0,0.75)", seed: 40, len: [0.4, 0.9], wav: 0.02 });
  const bar = (a, b, w, v, seed, { slots = false, edge = 0.3 } = {}) => {
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy), nx = (-dy / L) * w / 2, ny = (dx / L) * w / 2;
    const q = [[a[0] + nx, a[1] + ny], [b[0] + nx, b[1] + ny], [b[0] - nx, b[1] - ny], [a[0] - nx, a[1] - ny]];
    P.fill(poly(q), v, Math.atan2(dy, dx), { spacing: 0.3 });
    o.save(); o.globalAlpha = edge * 0.7; line(o, [q[0], q[1]], 1.4, INK, seed); o.globalAlpha = edge * 0.3; line(o, [q[3], q[2]], 1.1, INK, seed + 1); o.restore();
    if (slots) {
      o.fillStyle = "#000";
      for (let s = 0.2; s < 0.8; s += 0.04) {
        const cx = a[0] + dx * s, cy = a[1] + dy * s;
        o.save(); o.translate(cx, cy); o.rotate(Math.atan2(dy, dx)); o.fillRect(-6, -w * 0.2, 12, w * 0.4); o.restore();
      }
    }
  };
  // the big rail and the rack unit hanging on it, a knob
  bar([1818, 60], [2070, 420], 36, 0.1, 43, { edge: 0.22 });
  const rk = [[1886, 30], [1960, 20], [2082, 262], [2012, 290]];
  P.fill(poly(rk), 0.09, 1.1, { spacing: 0.3 });
  for (const [x, y] of [[1925, 60], [1952, 110], [1980, 165]]) P.fill(ell(x, y, 5, 7, 0.45), 0.3, 0, { style: 2 });
  o.save(); o.globalAlpha = 0.3; line(o, [rk[0], rk[1], rk[2]], 1.4, INK, 48); o.restore();
  P.fill(ell(2022, 214, 10, 15, 0.45), 0.34, 0.4, { style: 2 });
  // a dark box in the middle, cross-hatched faces, one lit edge
  const mb = [[1788, 280], [1900, 250], [1945, 500], [1830, 530]];
  P.fill(poly(mb), lin(1788, 0, 1945, 0, [[0, 0.1], [1, 0.14]]), 1.35, { spacing: 0.28 });
  grain(o, mb, 10, { dir: "v", w: 1.6, color: "rgba(0,0,0,0.7)", seed: 49, len: [0.4, 0.9] });
  P.fill(poly([[1900, 250], [1960, 240], [2000, 480], [1945, 500]]), 0.06, 1.4, { spacing: 0.35 });
  o.save(); o.globalAlpha = 0.16; line(o, [mb[0], mb[1], mb[2]], 1.2, INK, 49); o.restore();
  // slotted upright on the diagonal and thin struts
  bar([2206, 150], [1812, 925], 18, 0.1, 41, { slots: true, edge: 0.25 });
  bar([1790, 330], [1845, 930], 10, 0.05, 45, { edge: 0.2 });
  bar([1650, 560], [1600, 940], 12, 0.06, 47, { edge: 0.18 });
  // lower boxes, cross-hatched with lit edges
  P.fill(poly([[1835, 800], [1960, 708], [2085, 780], [2080, 946], [1840, 946]]), 0.09, 0.6, { spacing: 0.32 });
  P.fill(poly([[1960, 708], [2080, 700], [2080, 833], [1966, 840]]), 0.13, PI / 2, { spacing: 0.3 });
  o.save(); o.globalAlpha = 0.28; line(o, [[1835, 800], [1960, 708], [2080, 700]], 1.4, INK, 50); o.restore();
  P.fill(poly([[2085, 780], [2206, 760], [2206, 946], [2080, 946]]), 0.04, 1.5, { spacing: 0.4, style: 1 });
  // faint cables in the dark at the top right
  o.save(); o.globalAlpha = 0.22;
  curve(o, [[1690, 0], [1740, 60], [1760, 160], [1745, 260]], 1.6, INK, 51);
  curve(o, [[1790, 0], [1800, 90], [1780, 190], [1730, 300]], 1.3, INK, 52);
  curve(o, [[1600, 60], [1680, 50], [1740, 20]], 1.2, INK, 53);
  o.restore();
}

// ---------------------------------------------------------------- floor and under the desk
function paintFloor(P) {
  const o = P.o;
  // planks running away from us (vertical), lit round the chair, falling into black toward the desk and the sides
  const fl = [[300, 772], [1900, 772], [1900, 946], [300, 946]];
  P.fill(poly(fl), (g) => {
    const r = g.createLinearGradient(0, 772, 0, 946);
    r.addColorStop(0, grey(0.05)); r.addColorStop(0.25, grey(0.2)); r.addColorStop(0.6, grey(0.5)); r.addColorStop(1, grey(0.66)); return r;
  }, PI / 2, { spacing: 0.26 });
  P.light(poly(fl), (g) => { const r = g.createLinearGradient(300, 0, 1900, 0); r.addColorStop(0, "rgba(0,0,0,0.8)"); r.addColorStop(0.12, "rgba(0,0,0,0.1)"); r.addColorStop(0.35, "rgba(0,0,0,0)"); r.addColorStop(0.65, "rgba(0,0,0,0)"); r.addColorStop(0.85, "rgba(0,0,0,0.15)"); r.addColorStop(1, "rgba(0,0,0,0.85)"); return r; }, "source-over", 1);
  // cross-hatched band where the floor meets the dark
  P.fill(poly([[330, 770], [1850, 770], [1850, 818], [330, 818]]), 0.13, 0.0, { spacing: 0.3, style: 1 });
  // plank seams and dark knots: irregular vertical strokes, converging a little toward the back
  const r = rng(61);
  for (let i = 0; i < 90; i++) {
    const xb = 330 + r() * 1520, xt = 1090 + (xb - 1090) * 0.92, y0 = 800 + r() * 60, y1 = 946;
    const k0 = (y0 - 790) / 156;
    stroke(o, [[xt + (xb - xt) * k0, y0], [xb, y1]], 2 + r() * 3.5, "rgba(4,4,4,0.9)", 62 + i, 0.6);
  }
  // cables coiled on the floor
  const loop = (pts, seed) => { curve(o, pts, 5, "#050505", seed, { ends: 0.9 }); curve(o, pts.map(([x, y]) => [x - 1.2, y - 1.4]), 1.3, "rgba(242,240,234,0.7)", seed + 1, { ends: 0.3 }); };
  loop([[620, 850], [560, 830], [480, 840], [430, 880], [450, 925], [540, 940], [640, 925], [690, 890], [660, 850], [590, 845], [520, 870], [500, 910], [540, 946]], 70);
  loop([[600, 770], [560, 820], [520, 860], [470, 900], [420, 946]], 72);
  loop([[1450, 800], [1500, 850], [1560, 880], [1650, 870], [1720, 890], [1740, 930], [1680, 946]], 74);
  loop([[1600, 946], [1620, 900], [1680, 860], [1760, 850], [1800, 880]], 76);
  // under the desk: black; the slanted desk legs catch a little light
  P.fill(poly([[490, 572], [528, 572], [585, 772], [548, 772]]), 0.28, 1.28, { spacing: 0.3 });
  P.fill(poly([[1690, 562], [1728, 562], [1700, 772], [1662, 772]]), 0.2, 1.7, { spacing: 0.3 });
  o.save(); o.globalAlpha = 0.4; line(o, [[490, 572], [548, 772]], 1.6, INK, 90); line(o, [[1728, 562], [1700, 772]], 1.4, INK, 91); o.restore();
}

// ---------------------------------------------------------------- desk
export const DESK = [[507, 352], [560, 340], [700, 296], [860, 280], [1290, 262], [1480, 264], [1712, 300], [1781, 537], [442, 546]];
function paintDesk(P) {
  const o = P.o;
  // the slab: near-white under the lamp and the laptop, falling off toward both ends (measured medians per 60 px)
  P.fill(poly(DESK), (g) => {
    const r = g.createLinearGradient(440, 0, 1781, 0);
    for (const [x, v] of [[440, 0.24], [500, 0.34], [560, 0.52], [600, 0.72], [640, 0.88], [700, 0.97], [760, 1], [1440, 1], [1500, 0.93], [1540, 0.76], [1600, 0.52], [1660, 0.4], [1720, 0.26], [1781, 0.12]]) r.addColorStop((x - 440) / 1341, grey(v));
    return r;
  }, -0.012, { style: 2 });
  // shadows: behind the left speaker, the back edge on the right, the far left corner
  P.light(poly([[507, 352], [720, 322], [700, 390], [520, 430]]), (g) => { const r = g.createLinearGradient(0, 330, 0, 430); r.addColorStop(0, "rgba(0,0,0,0.55)"); r.addColorStop(1, "rgba(0,0,0,0)"); return r; }, "source-over", 1);
  P.light(poly([[1290, 262], [1480, 264], [1712, 300], [1730, 380], [1500, 390], [1300, 300]]), (g) => { const r = g.createLinearGradient(0, 262, 0, 400); r.addColorStop(0, "rgba(0,0,0,0.55)"); r.addColorStop(1, "rgba(0,0,0,0)"); return r; }, "source-over", 1);
  P.light(poly([[700, 296], [860, 280], [860, 330], [700, 340]]), (g) => { const r = g.createLinearGradient(0, 280, 0, 340); r.addColorStop(0, "rgba(0,0,0,0.45)"); r.addColorStop(1, "rgba(0,0,0,0)"); return r; }, "source-over", 1);
  // wood grain: sparse, irregular short dark dashes, thickening and crowding toward both ends
  const r = rng(101);
  const topY = (x) => { const T = [[442, 546], [507, 352], [560, 340], [700, 296], [860, 280], [1290, 262], [1480, 264], [1712, 300], [1781, 537]]; for (let i = 1; i < T.length; i++) if (x <= T[i][0]) { const [x0, y0] = T[i - 1], [x1, y1] = T[i]; return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0); } return 537; };
  const leftX = (y) => 442 + ((546 - y) / 194) * 65, rightX = (y) => 1712 + ((y - 300) / 237) * 69;
  o.save();
  for (let i = 0; i < 260; i++) {
    const u = r();
    let x = u < 0.38 ? 450 + Math.pow(r(), 1.4) * 300 : u < 0.8 ? 1780 - Math.pow(r(), 1.4) * 380 : 700 + r() * 760;
    const end = u < 0.38 ? (x - 450) / 300 : u < 0.8 ? (1780 - x) / 380 : 1;      // 0 at the desk's end .. 1 inboard
    const y = topY(x) + 8 + r() * (536 - topY(x) - 10);
    if (y < 300 || y > 537) continue;
    const L = (end < 1 ? 30 + r() * 120 : 12 + r() * 40) * (0.7 + r() * 0.6);
    let x0 = x - L / 2, x1 = x + L / 2;
    x0 = Math.max(x0, leftX(y) + 3); x1 = Math.min(x1, rightX(y) - 3);
    if (x1 - x0 < 8) continue;
    const w = end < 1 ? 1.2 + (1 - end) * 1.4 + r() * 0.6 : 0.9 + r() * 0.6;
    o.globalAlpha = end < 1 ? 0.45 + (1 - end) * 0.35 + r() * 0.15 : 0.22 + r() * 0.22;
    const dy = (r() - 0.5) * 3;
    curve(o, [[x0, y], [(x0 + x1) / 2, y + dy], [x1, y + (r() - 0.5) * 3]], w, "#0a0a0a", 110 + i, { ends: 0.25 });
  }
  // the far left corner and the right end: cross-hatched darker wood
  o.globalAlpha = 1;
  o.restore();
  P.fill(poly([[442, 546], [507, 352], [540, 345], [490, 546]]), lin(442, 0, 540, 0, [[0, 0.2], [1, 0.42]]), 0.1, { spacing: 0.3, style: 1 });
  P.fill(poly([[1690, 296], [1712, 300], [1781, 537], [1745, 538]]), lin(1690, 0, 1781, 0, [[0, 0.3], [1, 0.12]]), -0.05, { spacing: 0.3, style: 1 });
  // edges: the two visible ends, straight (the back edge hides behind the gear)
  line(o, [[442, 546], [507, 352]], 2, "rgba(242,240,234,0.75)", 190);
  line(o, [[1712, 300], [1781, 537]], 1.8, "rgba(242,240,234,0.55)", 191);
  // front edge: a lit lip, then the dark band of the edge
  P.fill(poly([[442, 546], [1781, 537], [1783, 562], [444, 572]]), 0.1, 0.0, { spacing: 0.3 });
  line(o, [[442, 546.5], [1781, 537.5]], 2.2, "#050505", 192);
  line(o, [[446, 549.5], [1779, 540.5]], 1.4, "rgba(242,240,234,0.8)", 193);
  line(o, [[446, 567], [1779, 558]], 1.2, "rgba(242,240,234,0.35)", 194);
}

// ---------------------------------------------------------------- speakers
function speaker(P, face, bevel, side, tw, wf, { faceV = 0.34, sideV = 0.05, seed = 1, lit = 0.6 } = {}) {
  const o = P.o;
  P.fill(poly(side), sideV, 1.5, { spacing: 0.35 });
  const ang = Math.atan2(face[3][1] - face[0][1], face[3][0] - face[0][0]);
  P.fill(poly(face), lin(face[0][0], face[0][1], face[2][0], face[2][1], [[0, faceV * 1.25], [1, faceV * 0.7]]), ang, { spacing: 0.26 });
  if (bevel) P.fill(poly(bevel), lit, ang, { spacing: 0.24 });
  grain(o, face, 12, { dir: "v", w: 1.6, color: "rgba(0,0,0,0.7)", seed, len: [0.3, 0.8], wav: 0.01 });
  // drivers: dark glossy cones in a grey surround; bright white glossy rims and a specular arc upper left
  for (const [x, y, rr, rot, hl] of [tw, wf]) {
    P.fill(ell(x, y, rr * 1.12, rr * 1.12 * 0.92, rot), 0.26, 0, { style: 2 });
    P.fill(ell(x, y, rr, rr * 0.92, rot), rad(x, y, 1, rr, [[0, 0.12], [0.55, 0.04], [0.85, 0.1], [1, 0.34]]), 0, { style: 2 });
    P.fill(ell(x - rr * 0.05, y - rr * 0.08, rr * 0.36, rr * 0.33, rot), rad(x - rr * 0.1, y - rr * 0.15, 0, rr * 0.36, [[0, 0.5], [1, 0.12]]), 0, { style: 2 });
    o.save();
    o.strokeStyle = "rgba(20,20,20,0.9)"; o.lineWidth = 1; o.beginPath(); o.ellipse(x, y, rr * 1.12, rr * 1.03, rot, 0, 7); o.stroke();
    o.lineCap = "round";
    // lit lower rim of the surround (glossy, white), a thinner inner rim
    o.strokeStyle = `rgba(246,245,240,${Math.min(0.95, hl + 0.2)})`;
    o.lineWidth = rr * 0.12; o.beginPath(); o.ellipse(x, y, rr * 0.9, rr * 0.83, rot, 1.45 - rot, 3.25 - rot); o.stroke();
    o.lineWidth = rr * 0.05; o.globalAlpha = 0.7; o.beginPath(); o.ellipse(x, y, rr * 1.04, rr * 0.96, rot, 1.3 - rot, 3.4 - rot); o.stroke();
    // specular arc on the upper left of the cone
    o.globalAlpha = 0.8; o.lineWidth = rr * 0.07; o.beginPath(); o.ellipse(x, y, rr * 0.72, rr * 0.66, rot, 3.6 - rot, 4.6 - rot); o.stroke();
    o.globalAlpha = 0.9; o.fillStyle = "rgba(250,249,245,0.9)"; o.beginPath(); o.ellipse(x - rr * 0.12, y - rr * 0.16, rr * 0.09, rr * 0.06, rot - 0.5, 0, 7); o.fill();
    o.restore();
  }
}
function paintSpeakers(P) {
  const o = P.o;
  // left: front face faces the desk light; lit left bevel; dark left side in shadow
  const LF = [[560, 158], [665, 108], [715, 300], [616, 358]];
  speaker(P, LF, [[560, 158], [574, 152], [630, 350], [616, 358]], [[560, 158], [556, 162], [612, 362], [616, 358]],
    [622, 180, 31, -0.45, 0.55], [650, 266, 46, -0.45, 0.85], { faceV: 0.14, seed: 201, lit: 0.45 });
  P.fill(poly([[560, 158], [665, 108], [652, 100], [548, 150]]), 0.35, -0.44, { spacing: 0.3 });
  o.save(); o.globalAlpha = 0.7; line(o, [[560, 158], [665, 108]], 1.8, INK, 202); line(o, [[560, 158], [616, 358]], 1.6, INK, 203); o.globalAlpha = 0.4; line(o, [[665, 108], [715, 300]], 1.4, INK, 204); o.restore();
  // right: turned toward the laptop; front nearly black, the top edge lit
  const RF = [[1548, 148], [1652, 200], [1612, 392], [1508, 340]];
  speaker(P, RF, null, [[1652, 200], [1672, 192], [1632, 384], [1612, 392]],
    [1588, 218, 22, 0.43, 0.75], [1566, 314, 34, 0.43, 0.9], { faceV: 0.07, sideV: 0.03, seed: 211 });
  P.fill(poly([[1548, 148], [1652, 200], [1672, 192], [1568, 142]]), 0.12, 0.43, { spacing: 0.3, style: 1 });
  o.save(); o.globalAlpha = 0.75; line(o, [[1548, 148], [1652, 200]], 2, INK, 212); o.globalAlpha = 0.35; line(o, [[1548, 148], [1508, 340]], 1.4, INK, 213); o.restore();
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
  cable(o, [[826, 370], [760, 374], [722, 398], [706, 430], [712, 462], [742, 502], [772, 542], [795, 590], [800, 640]], 5, 403);
  cable(o, [[818, 426], [772, 430], [735, 442], [698, 462], [664, 492], [636, 530], [620, 575], [615, 640], [630, 760], [620, 850]], 5, 405);
  cable(o, [[860, 262], [800, 300], [740, 335], [690, 368], [640, 405], [605, 440], [590, 480], [588, 520], [596, 560], [600, 620], [585, 720], [560, 800]], 5.5, 407);
  cable(o, [[640, 405], [590, 385], [530, 385], [490, 405], [470, 450], [478, 505], [505, 540], [540, 548], [575, 540]], 4.5, 409, 0.6);
  cable(o, [[700, 300], [680, 330], [640, 360], [600, 380], [560, 380]], 4, 411, 0.5);
  jack(o, 826, 856, 352); jack(o, 826, 856, 370); jack(o, 816, 856, 426, 12);
  // right side: to the lamp, behind the mug, and down over the front edge
  cable(o, [[1318, 346], [1352, 338], [1382, 318], [1402, 296], [1430, 282], [1470, 276]], 5, 421);
  cable(o, [[1318, 378], [1362, 372], [1388, 348], [1394, 318], [1380, 292], [1350, 282], [1300, 272], [1250, 262]], 5, 423);
  cable(o, [[1300, 290], [1350, 306], [1390, 352], [1402, 402], [1424, 460], [1440, 510], [1446, 552], [1448, 640], [1440, 760]], 5, 425);
  cable(o, [[1240, 262], [1350, 282], [1450, 306], [1500, 290], [1530, 270]], 4, 427, 0.5);
  jack(o, 1304, 1332, 346, 10); jack(o, 1304, 1336, 378, 11);
}

// ---------------------------------------------------------------- lamp and mug
function paintLamp(P) {
  const o = P.o;
  // neck: a short cylinder going up-right, lit on its left
  const neck = [[1500, 104], [1524, 70], [1549, 72], [1540, 110], [1520, 118]];
  P.fill(blob(neck), lin(1500, 0, 1550, 0, [[0, 0.6], [0.4, 0.4], [1, 0.12]]), 2.2, { style: 2 });
  stroke(o, [[1503, 104], [1512, 88], [1524, 72]], 4, "rgba(242,240,234,0.9)", 501, 0.5);
  P.fill(ell(1537, 71, 12, 4, 0.1), 0.55, 0, { style: 2 });
  // the bell shade, mouth down-left toward the desk
  const shade = [[1436, 159], [1450, 140], [1470, 125], [1502, 109], [1522, 112], [1541, 137], [1555, 167], [1546, 200], [1537, 211], [1500, 196], [1465, 180]];
  P.fill(blob(shade), lin(1440, 130, 1550, 190, [[0, 0.55], [0.35, 0.42], [0.6, 0.24], [1, 0.12]]), 0.9, { spacing: 0.24 });
  grain(o, [[1470, 125], [1522, 112], [1546, 200], [1500, 196]], 9, { dir: "u", w: 1.3, color: "rgba(0,0,0,0.6)", seed: 503, len: [0.3, 0.8] });
  // mouth: a dark ellipse with the burning bulb and a lit rim
  P.fill(ell(1487, 187, 54, 13, 0.36), 0.03, 0, { style: 2 });
  P.fill(ell(1488, 182, 17, 8, 0.36), 1, 0, { style: 2 });
  P.light(ell(1488, 184, 30, 13, 0.36), (g) => { const r = g.createRadialGradient(1488, 183, 3, 1488, 183, 28); r.addColorStop(0, "rgba(255,255,255,0.9)"); r.addColorStop(1, "rgba(255,255,255,0)"); return r; }, "source-over", 1);
  o.save();
  o.strokeStyle = "rgba(200,198,192,0.8)"; o.lineWidth = 3; o.beginPath(); o.ellipse(1487, 187, 54, 13, 0.36, 0.1, PI - 0.2); o.stroke();
  o.strokeStyle = DARK; o.lineWidth = 1.6; o.beginPath(); o.ellipse(1487, 187, 55, 14.5, 0.36, 0, 7); o.stroke();
  o.restore();
  // highlight along the upper-left of the dome
  stroke(o, [[1439, 157], [1452, 140], [1470, 125], [1487, 116]], 5.5, "rgba(250,249,245,0.95)", 505, 0.45);
  stroke(o, [[1460, 150], [1476, 138], [1492, 131]], 4, "rgba(250,249,245,0.5)", 506, 0.5);
  curve(o, shade.slice(0, 7), 1.6, DARK, 507);
}
function paintMug(P) {
  const o = P.o;
  // the soft shadow it throws on the desk, to the right (the lamp is up left)
  P.light(ell(1545, 430, 62, 34), (g) => { const r = g.createRadialGradient(1540, 428, 4, 1545, 430, 62); r.addColorStop(0, "rgba(0,0,0,0.3)"); r.addColorStop(1, "rgba(0,0,0,0)"); return r; });
  // smooth ceramic: lit on the left, a soft core shadow right of centre, reflected light on the right edge
  const body = (c) => { c.moveTo(1437, 346); c.lineTo(1441, 420); c.quadraticCurveTo(1450, 438, 1480, 438); c.quadraticCurveTo(1510, 438, 1518, 420); c.lineTo(1526, 346); c.closePath(); };
  P.fill(body, lin(1437, 0, 1526, 0, [[0, 0.93], [0.2, 0.9], [0.5, 0.66], [0.72, 0.56], [0.9, 0.66], [1, 0.74]]), PI / 2, { style: 2 });
  // handle: a loop attached to the body, light with a dark outer contour
  o.save();
  o.strokeStyle = DARK; o.lineWidth = 11.5; o.beginPath(); o.ellipse(1518, 394, 20, 24, 0, -1.05, 1.2); o.stroke();
  o.strokeStyle = "rgba(214,213,208,1)"; o.lineWidth = 8; o.beginPath(); o.ellipse(1518, 394, 20, 24, 0, -1.05, 1.2); o.stroke();
  o.strokeStyle = "rgba(245,244,240,0.8)"; o.lineWidth = 2; o.beginPath(); o.ellipse(1518, 394, 22, 26, 0, -0.9, 0.2); o.stroke();
  o.strokeStyle = "rgba(20,20,20,0.8)"; o.lineWidth = 1.4; o.beginPath(); o.ellipse(1518, 394, 16, 20, 0, -1.0, 1.15); o.stroke();
  o.restore();
  // rim and coffee
  P.fill(ell(1482, 345, 45, 22, 0), 0.95, 0, { style: 2 });
  P.fill(ell(1481, 348, 38, 16.5, 0), 0.05, 0, { style: 2 });
  P.fill(ell(1488, 346, 13, 3.2, -0.05), 0.4, 0, { style: 2 });
  o.save();
  o.strokeStyle = DARK; o.lineWidth = 2; o.beginPath(); o.ellipse(1482, 345, 45, 22, 0, 0, 7); o.stroke();
  o.lineWidth = 1.2; o.beginPath(); o.ellipse(1481, 348, 38, 16.5, 0, 0, 7); o.stroke();
  o.lineWidth = 2.2; o.beginPath(); body(o); o.stroke();
  o.restore();
  // a few soft vertical shading strokes on the body
  const r = rng(551);
  for (let i = 0; i < 9; i++) { const x = 1470 + r() * 40; stroke(o, [[x, 372 + r() * 10], [x + 0.5, 425 - r() * 10]], 1.2 + r(), `rgba(60,60,58,${(0.15 + r() * 0.2).toFixed(2)})`, 560 + i, 0.5); }
}

export function paintRoom(P) {
  paintBack(P);
  paintLeft(P);
  paintRight(P);
  paintFloor(P);
  paintDesk(P);
  paintSpeakers(P);
  paintLaptop(P);
  paintCables(P);
  paintLamp(P);
  paintMug(P);
}
