// s07 room plate: cartons, the two speakers, the shelf upright, the chair, the desk, cables, pencil and the laptop
// body (the screen is drawn separately, in colour). Frame coordinates, measured on the source (29.6 s, grid crops).
import { poly, blob, lin, rad, line, curve, stroke, grain, rng, taper, INK, grey, inside, solid, erase, soft } from "./kit.js";

const PI = Math.PI;
const K = "#070707";
const ell = (x, y, rx, ry, rot = 0) => (c) => c.ellipse(x, y, rx, ry, rot, 0, PI * 2);
const inkA = (a) => `rgba(242,240,234,${a})`;
const blkA = (a) => `rgba(6,6,6,${a})`;

// vertical streaks (corrugated card, wood grain) inside a quad: dark or light tapered marks
function streaks(o, q, n, { color = blkA(0.7), w = 1.6, seed = 1, len = [0.3, 0.95], wav = 0.004, alpha = 1 } = {}) {
  grain(o, q, n, { dir: "v", w, color, seed, len, wav, alpha });
}
function clipPoly(o, pts, fn) { o.save(); o.beginPath(); poly(pts)(o); o.clip(); fn(); o.restore(); }

// ---------------------------------------------------------------- cartons
function carton(P, { top, front, side, vTop = 0.1, vFront, vSide = 0.05, seed = 1, grainN = 40, sideGrain = 0 }) {
  const o = P.o;
  // corrugated card, cut by hand: wide-spaced lines (not a barcode), broken by darker wavy grain of varying weight
  if (top) solid(P, poly(top), vTop, Math.atan2(top[1][1] - top[0][1], top[1][0] - top[0][0]), { spacing: 0.6 });
  if (side) solid(P, poly(side), vSide, PI / 2 - 0.03, { spacing: 0.62 });
  solid(P, poly(front), vFront, PI / 2 + 0.02, { spacing: 0.66 });
  for (const f of [top, side, front]) if (f) soft(P, poly(f), 0.45);
  clipPoly(o, front, () => {
    streaks(o, [front[0], front[1], front[2], front[3]], Math.round(grainN * 0.8), { color: blkA(0.6), w: 3.2, seed, len: [0.25, 1], wav: 0.012 });
    streaks(o, [front[0], front[1], front[2], front[3]], Math.round(grainN * 0.12), { color: inkA(0.22), w: 1.2, seed: seed + 7, len: [0.2, 0.7], wav: 0.01 });
  });
  if (side && sideGrain) clipPoly(o, side, () => streaks(o, side, sideGrain, { color: inkA(0.18), w: 1.1, seed: seed + 3, len: [0.3, 1], wav: 0.012 }));
  if (top) clipPoly(o, top, () => grain(o, top, 10, { dir: "h", w: 1.2, color: inkA(0.22), seed: seed + 5, len: [0.3, 0.9], wav: 0.015 }));
  // edges: the lit front edge catches a hairline, the far edges stay dark
  line(o, [front[0], front[1]], 1.5, inkA(0.55), seed + 11);
  if (side) line(o, [side[0], side[3]], 1.2, inkA(0.3), seed + 12);
}
// a strip of packing tape: flat grey with fine lengthwise creases, a lit edge and dark keylines
function tape(P, q, v, seed) {
  const o = P.o;
  solid(P, poly(q), v, 0, { style: 2 });
  clipPoly(o, q, () => { grain(o, q, 5, { dir: "v", w: 1, color: inkA(0.25), seed, len: [0.4, 1], wav: 0.02 }); grain(o, q, 4, { dir: "v", w: 1.2, color: blkA(0.4), seed: seed + 1, len: [0.3, 1], wav: 0.02 }); });
  line(o, [q[0], q[3]], 1.6, K, seed + 2); line(o, [q[1], q[2]], 1.4, inkA(0.45), seed + 3);
}
function paintCartons(P) {
  const o = P.o;
  // big carton top-left (behind the left speaker)
  carton(P, {
    top: [[0, 72], [150, 76], [240, 106], [0, 114]],
    front: [[0, 114], [240, 106], [252, 400], [0, 322]],
    side: [[240, 106], [276, 118], [292, 420], [252, 400]],
    vTop: 0.04, vFront: (g) => { const r = g.createLinearGradient(0, 110, 0, 330); r.addColorStop(0, grey(0.4)); r.addColorStop(0.6, grey(0.36)); r.addColorStop(1, grey(0.3)); return r; },
    vSide: 0.04, seed: 11, grainN: 40, sideGrain: 5,
  });
  // packing tape: a strip across the top continuing down the front to its flap
  tape(P, [[60, 76], [128, 78], [118, 114], [44, 114]], 0.26, 13);
  tape(P, [[44, 114], [118, 114], [117, 192], [42, 196]], 0.3, 14);
  // mid carton behind the lid (its lit front face runs along above the lid)
  carton(P, {
    top: [[248, 116], [520, 102], [688, 104], [690, 140], [328, 150]],
    front: [[328, 150], [690, 140], [690, 202], [328, 212]],
    side: [[248, 116], [328, 150], [328, 212], [256, 190]],
    vTop: 0.1, vFront: (g) => { const r = g.createLinearGradient(328, 0, 690, 0); r.addColorStop(0, grey(0.56)); r.addColorStop(0.5, grey(0.52)); r.addColorStop(1, grey(0.42)); return r; },
    vSide: 0.1, seed: 21, grainN: 60, sideGrain: 6,
  });
  tape(P, [[470, 104], [530, 103], [540, 144], [483, 146]], 0.3, 23);
  tape(P, [[483, 146], [540, 144], [541, 204], [484, 206]], 0.46, 24);
  // top-centre carton (cut by the frame top): lit strip on its right side of the face
  carton(P, {
    top: null,
    front: [[725, -2], [896, -2], [896, 164], [728, 168]],
    side: [[896, -2], [1046, -2], [1046, 118], [896, 164]],
    vFront: (g) => { const r = g.createLinearGradient(725, 0, 896, 0); r.addColorStop(0, grey(0.28)); r.addColorStop(0.45, grey(0.36)); r.addColorStop(0.6, grey(0.62)); r.addColorStop(0.85, grey(0.7)); r.addColorStop(1, grey(0.5)); return r; },
    vSide: 0.06, seed: 31, grainN: 34, sideGrain: 8,
  });
  tape(P, [[786, -2], [826, -2], [827, 62], [787, 64]], 0.36, 33);
  // carton behind the lid on the right: lit front, black side
  carton(P, {
    top: [[850, 166], [984, 134], [1052, 148], [978, 184]],
    front: [[855, 168], [978, 184], [979, 482], [862, 482]],
    side: [[978, 184], [1052, 148], [1052, 446], [979, 482]],
    vTop: 0.06, vFront: (g) => { const r = g.createLinearGradient(855, 0, 979, 0); r.addColorStop(0, grey(0.5)); r.addColorStop(0.4, grey(0.62)); r.addColorStop(0.62, grey(0.88)); r.addColorStop(0.85, grey(0.82)); r.addColorStop(1, grey(0.45)); return r; },
    vSide: 0.015, seed: 41, grainN: 30, sideGrain: 0,
  });
  // dim carton further back, right of it
  solid(P, poly([[1052, 142], [1136, 124], [1136, 236], [1052, 250]]), 0.03, PI / 2, { spacing: 0.3 });
  clipPoly(o, [[1052, 142], [1136, 124], [1136, 236], [1052, 250]], () => streaks(o, [[1052, 142], [1136, 124], [1136, 236], [1052, 250]], 5, { color: inkA(0.18), w: 1.2, seed: 45 }));
}

// ---------------------------------------------------------------- speakers
// Drivers engraved, not rendered: a black cone cut with concentric ring lines (brighter on the lit side), the rubber
// surround a bright partial ring, a small dust cap with a crescent highlight, a dark rim round the whole.
function driver(P, x, y, rx, ry, rot, { lit = 0.55, seed = 1, la = 0.6 } = {}) {
  const o = P.o, r = rng(seed);
  solid(P, ell(x, y, rx * 1.16, ry * 1.16, rot), 0.04, 0, { style: 2 });
  o.save(); o.lineCap = "round";
  // surround: the bright rolled ring, lit toward the screen (lower right), with fine ring lines through it
  for (let k = 0; k < 4; k++) {
    const f = 1.03 + k * 0.03;
    o.strokeStyle = inkA(lit * (0.55 + 0.45 * (k === 1 || k === 2))); o.lineWidth = Math.max(1, rx * 0.028);
    o.beginPath(); o.ellipse(x, y, rx * f, ry * f, rot, la - 1.2 - r() * 0.3, la + 1.2 + r() * 0.3); o.stroke();
  }
  o.strokeStyle = inkA(lit * 0.35); o.lineWidth = 1;
  o.beginPath(); o.ellipse(x, y, rx * 1.08, ry * 1.08, rot, la + 1.8, la + 4.2); o.stroke();
  // cone: concentric grooves, each an arc that brightens toward the light and fades away from it
  for (let k = 0.95; k > 0.3; k -= 0.05 + r() * 0.03) {
    const span = 0.6 + r() * 1.1;
    o.strokeStyle = inkA(0.14 + 0.36 * r() * (k > 0.6 ? 1 : 0.6)); o.lineWidth = 0.9 + r() * 0.8;
    o.beginPath(); o.ellipse(x, y, rx * k, ry * k, rot, la - span, la + span * (0.5 + r() * 0.5)); o.stroke();
  }
  // dust cap
  o.fillStyle = "#0a0a0a"; o.beginPath(); o.ellipse(x - rx * 0.04, y - ry * 0.04, rx * 0.3, ry * 0.3, rot, 0, PI * 2); o.fill();
  o.strokeStyle = inkA(0.75); o.lineWidth = Math.max(1.2, rx * 0.045);
  o.beginPath(); o.ellipse(x - rx * 0.04, y - ry * 0.04, rx * 0.24, ry * 0.24, rot, la - 0.9, la + 0.5); o.stroke();
  o.strokeStyle = inkA(0.35); o.lineWidth = 1; o.beginPath(); o.ellipse(x - rx * 0.04, y - ry * 0.04, rx * 0.3, ry * 0.3, rot, 0, PI * 2); o.stroke();
  // dark keylines round the rim
  o.strokeStyle = K; o.lineWidth = 2.6; o.beginPath(); o.ellipse(x, y, rx * 1.16, ry * 1.16, rot, 0, PI * 2); o.stroke();
  o.lineWidth = 1.4; o.beginPath(); o.ellipse(x, y, rx * 0.99, ry * 0.99, rot, 0, PI * 2); o.stroke();
  o.restore();
}
// a speaker face: near-black wood, a few long wavy grain lines of varying weight (not a regular screen)
function woodFace(P, q, v, angle, seed, { n = 16, light = 0.3 } = {}) {
  const o = P.o;
  solid(P, poly(q), v, angle, { spacing: 0.75 });
  soft(P, poly(q), 0.4);
  clipPoly(o, q, () => {
    streaks(o, q, n, { color: inkA(light), w: 1.5, seed, len: [0.3, 1], wav: 0.02 });
    streaks(o, q, Math.round(n * 1.2), { color: blkA(0.8), w: 3.4, seed: seed + 1, len: [0.3, 1], wav: 0.015 });
  });
}
function paintSpeakers(P) {
  const o = P.o;
  // left speaker: front face (drivers) turned to the right, its right side face in dim light
  const LF = [[62, 396], [188, 332], [238, 752], [114, 824]];
  const LS = [[188, 332], [252, 346], [300, 726], [238, 752]];
  woodFace(P, LS, lin(0, 340, 0, 740, [[0, 0.36], [0.6, 0.26], [1, 0.16]]), PI / 2 - 0.12, 51, { n: 12, light: 0.32 });
  woodFace(P, LF, lin(62, 360, 238, 780, [[0, 0.24], [0.5, 0.18], [1, 0.1]]), PI / 2 - 0.1, 53, { n: 14, light: 0.3 });
  driver(P, 140, 441, 23, 48, 0.02, { lit: 0.7, seed: 55, la: 1.2 });
  driver(P, 156, 608, 52, 98, 0.03, { lit: 0.9, seed: 56, la: 1.0 });
  // bright bevelled edges
  line(o, [LF[0], LF[1]], 2.8, inkA(0.85), 57); line(o, [LF[0], LF[3]], 2, inkA(0.55), 58); line(o, [LF[1], LF[2]], 2.2, inkA(0.7), 59);
  line(o, [LS[1], LS[2]], 1.2, inkA(0.3), 60);
  // middle speaker behind his face: front face, dark left side, lit left edge
  const MF = [[1146, 198], [1320, 194], [1320, 502], [1146, 502]];
  solid(P, poly([[1128, 206], [1146, 198], [1146, 502], [1130, 494]]), 0.04, PI / 2, { spacing: 0.6 });
  woodFace(P, MF, lin(1146, 0, 1320, 0, [[0, 0.18], [1, 0.12]]), PI / 2, 61, { n: 12, light: 0.28 });
  driver(P, 1228, 263, 34, 35, 0, { lit: 0.7, seed: 63, la: 0.9 });
  driver(P, 1226, 392, 72, 74, 0, { lit: 0.8, seed: 64, la: 0.2 });
  line(o, [[1147, 200], [1147, 500]], 3, inkA(0.85), 65);
  line(o, [[1146, 198], [1320, 194]], 1.8, inkA(0.55), 66);
  line(o, [[1146, 500], [1320, 500]], 1.6, inkA(0.4), 67);
}

// ---------------------------------------------------------------- right side: shelf upright, box, chair
function paintRight(P) {
  const o = P.o;
  // metal shelf upright with slots, leaning; two short cross bars
  const U = [[1956, -2], [1999, -2], [1952, 480], [1917, 480]];
  solid(P, poly(U), lin(1950, 0, 1990, 0, [[0, 0.14], [0.5, 0.24], [1, 0.1]]), PI / 2 - 0.08, { spacing: 0.45 });
  soft(P, poly(U), 0.4);
  line(o, [[1957, -2], [1918, 478]], 1.6, inkA(0.55), 71); line(o, [[1990, -2], [1945, 478]], 1.2, inkA(0.35), 72);
  for (let k = 0; k < 9; k++) {
    const y = 20 + k * 52, x = 1976 - y * 0.09;
    o.fillStyle = K; o.beginPath(); o.roundRect(x - 5, y, 10, 26, 4); o.fill();
  }
  solid(P, poly([[1888, 84], [1952, 90], [1950, 104], [1886, 98]]), 0.3, 0.1, { spacing: 0.2 });
  solid(P, poly([[1902, 110], [1950, 116], [1949, 126], [1900, 121]]), 0.22, 0.1, { spacing: 0.2 });
  // box on the right, behind the chair: lit top edge, wood-grain front (hand-cut, wide lines)
  const BF = [[2046, 400], [2206, 378], [2206, 622], [2050, 618]];
  solid(P, poly([[2062, 386], [2206, 350], [2206, 380], [2046, 402]]), 0.12, -0.2, { spacing: 0.6 });
  woodFace(P, BF, lin(0, 390, 0, 620, [[0, 0.3], [1, 0.14]]), PI / 2, 75, { n: 10, light: 0.3 });
  line(o, [BF[0], BF[1]], 1.6, inkA(0.55), 76);
  // a smaller box / stool under it (measured (2057–2138, 617–780)): lit top, grained front, dark side
  const SB = [[2064, 644], [2138, 636], [2132, 774], [2070, 782]];
  solid(P, poly([[2058, 622], [2130, 612], [2138, 636], [2064, 644]]), 0.34, -0.12, { spacing: 0.5 });
  woodFace(P, SB, lin(0, 640, 0, 780, [[0, 0.26], [1, 0.12]]), PI / 2 + 0.03, 77, { n: 8, light: 0.3 });
  solid(P, poly([[2138, 636], [2160, 626], [2156, 760], [2132, 774]]), 0.04, PI / 2, { spacing: 0.6 });
  line(o, [[2058, 622], [2130, 612]], 1.6, inkA(0.6), 78); line(o, [[2064, 644], [2138, 636]], 1.2, inkA(0.4), 79);
}

// ---------------------------------------------------------------- desk
// (extended under the owl and his shoulder to x 1560: the desk shows round the owl's lower left, no black notch)
export const DESK = [[0, 700], [120, 690], [260, 600], [340, 548], [600, 505], [830, 468], [1060, 450], [1140, 470], [1320, 490], [1480, 500],
  [1560, 504], [1560, 690], [1300, 716], [1173, 762], [1007, 822], [860, 884], [760, 952], [0, 952]];
// a band of parallel hatch strokes along the wood grain: n strokes spaced sp px, starting at (x, y), angle a,
// length L (each stroke varies), weight w
function hatchBand(o, x, y, a, L, n, sp, w, alpha, r, seed) {
  const nx = -Math.sin(a), ny = Math.cos(a);
  for (let k = 0; k < n; k++) {
    const off = k * sp + (r() - 0.5) * sp * 0.4, s0 = (r() - 0.5) * L * 0.3, len = L * (0.5 + r() * 0.6);
    const x0 = x + nx * off + Math.cos(a) * s0, y0 = y + ny * off + Math.sin(a) * s0;
    const pts = [[x0, y0], [x0 + Math.cos(a) * len * 0.5 + nx * (r() - 0.5) * 2, y0 + Math.sin(a) * len * 0.5 + ny * (r() - 0.5) * 2], [x0 + Math.cos(a) * len, y0 + Math.sin(a) * len]];
    stroke(o, pts, w * (0.6 + r() * 0.7), blkA(alpha * (0.7 + r() * 0.3)), seed + k, 0.25 + r() * 0.3, 4);
  }
}
function paintDesk(P) {
  const o = P.o;
  // value (measured on blurred samples): a lit pool in front of the laptop's left corner and under his right arm;
  // black in the lid's shadow between the left speaker and the laptop; dark toward the wall behind
  // engraved wood: lines along the boards (≈−0.36 rad on the left, −0.15 behind the laptop and toward the owl)
  solid(P, poly(DESK), 0.55, -0.36, { spacing: 0.22 });
  soft(P, poly(DESK), 0.5);
  { const d = P.d; d.save(); d.beginPath(); poly(DESK)(d); d.clip(); d.beginPath(); poly([[880, 440], [1560, 440], [1560, 720], [880, 720]])(d); d.fillStyle = P.constructor.dirColor(-0.15, 0.2, 0); d.fill(); d.restore(); }
  // (all lighting passes clipped to the desk: they must not leak value into the background above its top edge)
  P.v.save(); P.v.beginPath(); poly(DESK)(P.v); P.v.clip();
  P.light(poly(DESK), (g) => { const r = g.createRadialGradient(520, 900, 40, 520, 900, 520); r.addColorStop(0, grey(1)); r.addColorStop(0.6, grey(0.9)); r.addColorStop(1, grey(0.38)); return r; });
  P.light(poly([[0, 560], [260, 560], [280, 700], [200, 800], [120, 952], [0, 952]]), (g) => { const r = g.createLinearGradient(0, 600, 120, 950); r.addColorStop(0, grey(0.05)); r.addColorStop(0.6, grey(0.2)); r.addColorStop(1, grey(0.36)); return r; }, "darken");
  P.light(blob([[230, 540], [420, 510], [440, 640], [400, 700], [330, 740], [250, 740]]), 0.08, "darken");
  P.light(poly([[900, 440], [1480, 440], [1480, 720], [1100, 740], [900, 560]]), (g) => { const r = g.createRadialGradient(1260, 620, 20, 1260, 620, 320); r.addColorStop(0, grey(0.97)); r.addColorStop(0.6, grey(0.86)); r.addColorStop(1, grey(0.4)); return r; });
  P.light(blob([[1380, 500], [1560, 504], [1560, 650], [1430, 640], [1400, 580]]), 0.42, "darken", 0.8);
  // the middle speaker's shadow on the desk just below it
  P.light(blob([[1130, 500], [1330, 498], [1460, 510], [1460, 540], [1300, 548], [1140, 536]]), 0.16, "darken", 0.85);
  // the desk's dark front edge under the owl (measured 616–648 at x 1414–1530)
  P.light(poly([[1400, 612], [1560, 604], [1560, 652], [1400, 650]]), 0.1, "darken", 0.9);
  P.light(poly([[830, 440], [1560, 440], [1560, 560], [830, 560]]), (g) => { const r = g.createLinearGradient(0, 445, 0, 560); r.addColorStop(0, grey(0.06)); r.addColorStop(0.45, grey(0.25)); r.addColorStop(1, grey(0.8)); return r; }, "darken");
  P.v.restore();
  // wood grain: bands of black tapered hatching along the boards — heavy in the shade, sparse in the light
  const r = rng(91);
  o.save(); o.beginPath(); poly(DESK)(o); o.clip();
  for (let i = 0; i < 320; i++) {
    const x = -60 + r() * 1620, y = 440 + r() * 520;
    if (!inside(DESK, Math.max(0, x), y)) continue;
    const left = x < 900;
    const a = left ? -0.42 + (x / 900) * 0.12 : -0.12;
    // shade from the painted light: denser bands where the desk is darker
    const lit = left ? Math.max(0, 1 - Math.hypot(x - 520, y - 900) / 520) : Math.max(0, 1 - Math.hypot(x - 1260, y - 620) / 320);
    const dens = 0.35 + 0.65 * (1 - lit);
    if (r() > dens) continue;
    hatchBand(o, x, y, a, 50 + r() * 100, 3 + Math.floor(r() * 6 * dens), 4.5 + r() * 2.5, 1.0 + dens * 1.2, 0.5 + 0.45 * dens, r, 1000 + i * 17);
  }
  // board seams
  for (const [x0, y0, x1, y1] of [[0, 770, 330, 640], [0, 862, 560, 620], [140, 952, 700, 720], [1110, 548, 1560, 528], [1120, 648, 1560, 606]]) line(o, [[x0, y0], [x1, y1]], 1.6, blkA(0.7), 960 + x0);
  o.restore();
  // front edge of the desk under the laptop's right corner, and the black gap below it
  // (measured below the trackpad: base front face, a strip of lit desk top, the desk's hatched front face, black)
  const edge = [[704, 902], [1007, 820], [1100, 791], [1214, 752], [1300, 722], [1310, 768], [1173, 824], [1007, 874], [880, 922], [720, 952]];
  solid(P, poly(edge), 0.26, -0.34, { spacing: 0.22 });
  clipPoly(o, edge, () => { for (let k = 0; k < 9; k++) line(o, [[860, 896 + k * 5.5], [1310, 728 + k * 5.5]], 1.3, blkA(0.8), 970 + k); });
  line(o, [[860, 884], [1007, 822], [1173, 762], [1300, 716]], 2.2, K, 981);
  solid(P, poly([[880, 922], [1007, 874], [1173, 824], [1310, 768], [1360, 780], [1330, 952], [760, 952]]), 0.0, 0, { style: 2 });
}

// ---------------------------------------------------------------- cables and pencil
function cable(o, pts, w = 6, seed = 1, hl = 0.8) {
  curve(o, pts, w, K, seed, { ends: 0.85 });
  curve(o, pts.map(([x, y]) => [x - w * 0.12, y - w * 0.2]), w * 0.28, inkA(hl), seed + 1000, { ends: 0.3 });
}
function plug(o, x0, y0, x1, y1, h = 14) {
  // a metal USB plug seen from above: box + strain relief, the long axis from (x0,y0) toward (x1,y1)
  const a = Math.atan2(y1 - y0, x1 - x0), L = Math.hypot(x1 - x0, y1 - y0);
  o.save(); o.translate(x0, y0); o.rotate(a);
  const g = o.createLinearGradient(0, -h / 2, 0, h / 2);
  g.addColorStop(0, "#f2f1ec"); g.addColorStop(0.5, "#d9d8d2"); g.addColorStop(1, "#8a8a86");
  o.fillStyle = g; o.beginPath(); o.roundRect(0, -h / 2, L * 0.7, h, 2); o.fill(); o.strokeStyle = K; o.lineWidth = 1.8; o.stroke();
  o.fillStyle = "#cfcfca"; o.beginPath(); o.roundRect(L * 0.7, -h * 0.34, L * 0.3, h * 0.68, 2); o.fill(); o.stroke();
  o.fillStyle = K; for (const f of [0.78, 0.86, 0.94]) o.fillRect(L * f, -h * 0.34, 1.4, h * 0.68);
  o.restore();
}
function paintCables(P, front) {
  const o = P.o;
  if (!front) {
  // behind the laptop: loops from the back to the right along the desk and under his sleeve
  cable(o, [[900, 470], [930, 470], [975, 482], [1000, 504], [990, 524], [950, 530], [915, 522]], 5, 101, 0.6);
  cable(o, [[906, 500], [960, 500], [1010, 520], [1060, 540], [1110, 552], [1200, 584], [1280, 610], [1340, 632], [1380, 650]], 5.5, 103, 0.7);
  cable(o, [[1000, 508], [1040, 500], [1080, 498], [1120, 510], [1170, 520]], 4, 105, 0.5);
  return;
  }
  // left: three plugs in the side ports, their cables looping down over the desk
  cable(o, [[418, 738], [360, 744], [312, 728], [298, 700], [312, 668], [352, 648], [392, 628], [420, 610]], 6, 111, 0.75);
  cable(o, [[392, 628], [330, 660], [290, 720], [250, 790], [222, 860], [210, 950]], 6.5, 113, 0.7);
  cable(o, [[452, 766], [404, 790], [384, 830], [394, 870], [446, 898], [560, 908], [680, 900], [760, 880]], 6, 115, 0.75);
  cable(o, [[496, 810], [430, 820], [376, 850], [352, 896], [360, 950]], 6, 117, 0.75);
  cable(o, [[0, 874], [80, 860], [170, 868], [226, 900], [240, 950]], 5.5, 119, 0.5);
  plug(o, 410, 733, 452, 742, 13); plug(o, 446, 760, 496, 770, 14); plug(o, 492, 800, 556, 815, 15);
  // pencil on the desk, pointing at the laptop
  const pa = [1160, 546], pb = [1416, 590];
  const ang = Math.atan2(pb[1] - pa[1], pb[0] - pa[0]), L = Math.hypot(pb[0] - pa[0], pb[1] - pa[1]);
  o.save(); o.translate(pa[0], pa[1]); o.rotate(ang);
  o.fillStyle = "#e9e8e2"; o.strokeStyle = K; o.lineWidth = 2;
  o.beginPath(); o.moveTo(0, 0); o.lineTo(34, -6); o.lineTo(L - 30, -6); o.lineTo(L - 30, 6); o.lineTo(34, 6); o.closePath(); o.fill(); o.stroke();
  o.fillStyle = "#bdbcb6"; o.fillRect(34, 1.5, L - 64, 4.5);
  o.strokeStyle = blkA(0.6); o.lineWidth = 1; o.beginPath(); o.moveTo(34, 0); o.lineTo(L - 30, 0); o.stroke();
  o.fillStyle = "#cfcec8"; o.beginPath(); o.roundRect(L - 30, -7, 22, 14, 2); o.fill(); o.lineWidth = 1.8; o.strokeStyle = K; o.stroke();
  o.fillStyle = "#e9e8e2"; o.beginPath(); o.roundRect(L - 9, -6.5, 12, 13, 5); o.fill(); o.stroke();
  o.fillStyle = K; o.beginPath(); o.moveTo(0, 0); o.lineTo(9, -1.6); o.lineTo(9, 1.6); o.closePath(); o.fill();
  o.restore();
}

// ---------------------------------------------------------------- laptop body (lid back + base, keys)
export const LID = [[288, 218], [846, 145], [912, 524], [398, 672]];
// keyboard well corners (TL, TR, BR, BL) along the hinge / toward the front
// rounded key cap path through a quad
function smoothKey(o, k) {
  const m = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  o.moveTo(...m(k[0], k[1], 0.15));
  for (let i = 0; i < 4; i++) { const a = k[i], b = k[(i + 1) % 4], c = k[(i + 2) % 4]; o.lineTo(...m(a, b, 0.85)); o.quadraticCurveTo(b[0], b[1], ...m(b, c, 0.15)); }
  o.closePath();
}
const qAt = (q, u, v) => {
  const a = [q[0][0] + (q[1][0] - q[0][0]) * u, q[0][1] + (q[1][1] - q[0][1]) * u];
  const b = [q[3][0] + (q[2][0] - q[3][0]) * u, q[3][1] + (q[2][1] - q[3][1]) * u];
  return [a[0] + (b[0] - a[0]) * v, a[1] + (b[1] - a[1]) * v];
};
function paintLaptop(P) {
  const o = P.o;
  // lid: black back of the screen; a thin lit rim along its top and left edges
  const lidPath = (c) => {
    const [a, b, cc, d] = LID;
    c.moveTo(a[0] + 10, a[1] - 2); c.lineTo(b[0] - 10, b[1] + 1); c.quadraticCurveTo(b[0], b[1], b[0] + 2, b[1] + 10);
    c.lineTo(cc[0], cc[1]); c.lineTo(d[0], d[1]); c.lineTo(a[0] - 1, a[1] + 12); c.quadraticCurveTo(a[0], a[1], a[0] + 10, a[1] - 2); c.closePath();
  };
  solid(P, lidPath, 0.02, 0, { style: 2 });
  // lit rim along the lid's top and left edges only (its bottom edge sinks into the hinge shadow)
  o.save(); o.strokeStyle = inkA(0.75); o.lineWidth = 2.2; o.lineCap = "round";
  o.beginPath(); o.moveTo(LID[3][0], LID[3][1]); o.lineTo(LID[0][0] - 1, LID[0][1] + 12); o.quadraticCurveTo(LID[0][0], LID[0][1], LID[0][0] + 10, LID[0][1] - 2);
  o.lineTo(LID[1][0] - 10, LID[1][1] + 1); o.quadraticCurveTo(LID[1][0], LID[1][1], LID[1][0] + 2, LID[1][1] + 10); o.lineTo(LID[2][0], LID[2][1]); o.stroke(); o.restore();
  line(o, [[292, 224], [842, 150]], 1.2, inkA(0.35), 201);
  // base: aluminium deck, lit, darker toward the back-left; side face with the ports; front lip
  // (front measured on column profiles below the trackpad: the top's front edge, a lit metal front face ~25 px
  // deep, then the desk's dark front edge and black under the desk)
  const FRONT_TOP = [[700, 878], [1007, 794], [1100, 765], [1212, 728]], FRONT_BOT = [[704, 902], [1007, 820], [1100, 791], [1214, 752]];
  const deck = [[404, 697], [410, 690], [918, 552], [966, 558], [1214, 716], [1212, 728], [1100, 765], [1007, 794], [712, 876], [700, 876]];
  solid(P, poly(deck), lin(420, 690, 900, 820, [[0, 0.7], [0.35, 0.9], [1, 0.97]]), -0.26, { style: 2 });
  solid(P, poly([[400, 700], [700, 876], [704, 902], [398, 716]]), 0.62, 0.57, { style: 2 });
  const face = [...FRONT_TOP, ...FRONT_BOT.slice().reverse()];
  solid(P, poly(face), lin(0, 760, 0, 800, [[0, 0.9], [1, 0.7]]), -0.32, { style: 2 });
  clipPoly(o, face, () => { for (let k = 0; k < 3; k++) line(o, FRONT_BOT.map(([x, y]) => [x, y - 3 - k * 4]), 1.1, blkA(0.5), 205 + k); });
  line(o, [[402, 698], [570, 805], [700, 878], ...FRONT_TOP.slice(1)], 2.4, K, 202);
  line(o, [[398, 716], ...FRONT_BOT], 2.2, K, 203);
  line(o, [[406, 695], [918, 554]], 2, inkA(0.8), 204);
  // the desk top under his forearm lies in its shadow
  P.light(blob([[1180, 740], [1330, 740], [1340, 790], [1250, 812], [1180, 800]]), 0.12, "darken", 0.85);
  // the right wrist's shadow on the deck (measured dark 712–750 at x 1150)
  P.light(blob([[1070, 716], [1140, 700], [1200, 694], [1214, 716], [1190, 736], [1140, 752], [1096, 760]]), 0.22, "darken", 0.9);
  // ports on the side face
  for (const [u, w] of [[0.13, 22], [0.3, 16], [0.47, 22], [0.64, 14], [0.83, 10]]) {
    const x = 400 + 300 * u, y = 692 + 186 * u;
    o.save(); o.translate(x, y); o.rotate(0.555); o.fillStyle = K; o.fillRect(0, 1, w, 7); o.restore();
  }
  // hinge shadow strip between lid and deck
  solid(P, poly([[398, 672], [912, 524], [918, 552], [404, 693]]), 0.03, 0, { style: 2 });
  // keyboard: key grid fitted (least squares homography) to 18 key centres detected on the source's two back rows
  // and the well's two front corners read at 1.8x (residual < 6 px); MacBook-style rows in key units (14.5 wide,
  // 6 rows): black caps with lit edges in a dark well
  const KH = [[45.122935, 44.796588, 457.30277], [-2.8098646, 43.368342, 684.29053], [0.011872366, 0.035228195, 1]];
  const kh = (u, v) => { const w = KH[2][0] * u + KH[2][1] * v + 1; return [(KH[0][0] * u + KH[0][1] * v + KH[0][2]) / w, (KH[1][0] * u + KH[1][1] * v + KH[1][2]) / w]; };
  const well = [kh(-0.2, -0.08), kh(14.7, -0.08), kh(14.7, 6.2), kh(-0.2, 6.2)];
  solid(P, poly(well), 0.16, -0.26, { style: 2 });
  o.save(); o.strokeStyle = blkA(0.55); o.lineWidth = 1.3; o.beginPath(); poly(well)(o); o.stroke(); o.restore();
  const ROWS = [
    [0.18, 0.82, Array(14).fill(1)], [1, 1, [...Array(13).fill(1), 1.5]], [2, 1, [1.5, ...Array(12).fill(1), 1]],
    [3, 1, [1.8, ...Array(11).fill(1), 1.7]], [4, 1, [2.3, ...Array(10).fill(1), 2.2]], [5, 1, [1, 1, 1, 1.25, 5, 1.25, 1, 1, 1, 1]],
  ];
  const r = rng(211), g = 0.09;
  o.save();
  for (const [v0, h, widths] of ROWS) {
    let u = 0;
    for (const w of widths) {
      const k = [kh(u + g, v0 + g), kh(u + w - g, v0 + g), kh(u + w - g, v0 + h - g), kh(u + g, v0 + h - g)];
      erase(P, poly(k));
      o.fillStyle = `rgb(${10 + r() * 8 | 0},${10 + r() * 8 | 0},${10 + r() * 8 | 0})`;
      o.beginPath(); smoothKey(o, k); o.fill();
      o.strokeStyle = inkA(0.42); o.lineWidth = 1.2; o.stroke();
      const c = kh(u + w * 0.3, v0 + h * 0.4);
      o.fillStyle = inkA(0.3); o.fillRect(c[0] - 1.5, c[1] - 1, 3, 2);
      o.strokeStyle = inkA(0.45); o.lineWidth = 1; o.beginPath(); o.moveTo(k[3][0], k[3][1]); o.lineTo(k[2][0], k[2][1]); o.stroke();
      u += w;
    }
  }
  o.restore();
  // the lit edge of the display glass just under the screen, and the deck's silver back edge between the hinge and
  // the keys (measured on column profiles: a bright hairline 1–6 px under the screen quad's lower edge, and a
  // 4–5 px bright strip ~45 px under it, e.g. y 656–660 at x 550, 612–616 at x 700)
  line(o, [[409, 652.5], [898, 523.5]], 4.6, inkA(0.92), 231, 0.7);
  line(o, [[404, 696], [918, 560]], 5, inkA(0.93), 232, 0.7);
  line(o, [[404, 701], [918, 565]], 1.4, blkA(0.6), 233, 0.7);
  // trackpad and the front notch
  const TP = [[852, 704], [1022, 657], [1072, 745], [902, 790]];
  solid(P, poly(TP), 0.98, -0.26, { style: 2 });
  o.save(); o.strokeStyle = blkA(0.55); o.lineWidth = 1.4; o.beginPath(); o.moveTo(TP[0][0], TP[0][1]); for (const p of [...TP, TP[0]]) o.lineTo(p[0], p[1]); o.stroke(); o.restore();
  line(o, [[970, 781], [1050, 759]], 3, blkA(0.55), 221);
  line(o, [[972, 776], [1048, 755]], 1.4, inkA(0.9), 222);
}


// The chair's curved back rail crosses in front of his lower back (drawn after the figure). Measured at 1.3x:
// top edge (2206,735)…(1880,946), bottom edge (2206,796)…(1950,946); lit wood (~150/255) with grain along it.
export function paintChairRail(P) {
  const o = P.o;
  const railTop = [[2212, 732], [2160, 760], [2100, 798], [2040, 838], [1980, 876], [1920, 916], [1880, 952]];
  const railBot = [[1948, 952], [2000, 918], [2060, 882], [2130, 843], [2212, 796]];
  const rail = [...railTop, ...railBot];
  // dark wood (≈0.2) engraved along its length, a bright edge along the top (measured region mean 58, texture 47)
  solid(P, poly(rail), lin(2206, 740, 1900, 946, [[0, 0.36], [0.6, 0.3], [1, 0.22]]), -0.6, { spacing: 0.3 });
  soft(P, poly(rail), 0.35);
  clipPoly(o, rail, () => {
    const r = rng(77);
    for (let i = 0; i < 18; i++) {
      const f = (i + 0.5) / 18, off = f * 62;
      const pts = railTop.map(([x, y]) => [x + off * 0.5 + (r() - 0.5) * 2, y + off * 0.85 + (r() - 0.5) * 2]);
      const i0 = Math.floor(r() * 2), i1 = i0 + 3 + Math.floor(r() * 3);
      curve(o, pts.slice(i0, i1), 1 + r() * 1.3, (i % 4 === 0 ? inkA(0.25 + r() * 0.2) : blkA(0.35 + r() * 0.45)), 780 + i, { ends: 0.2 });
    }
  });
  curve(o, railTop, 2.6, K, 79);
  curve(o, railBot, 3, K, 80);
  curve(o, railTop.map(([x, y]) => [x + 1.5, y + 3.5]), 3.5, inkA(0.85), 81, { ends: 0.3 });
  curve(o, railTop.map(([x, y]) => [x + 3, y + 9]), 1.2, inkA(0.35), 82, { ends: 0.3 });
}

export function paintRoom(P) {
  paintCartons(P);
  paintRight(P);
  paintDesk(P);
  paintSpeakers(P);
  paintCables(P, false);
  paintLaptop(P);
  paintCables(P, true);
}
