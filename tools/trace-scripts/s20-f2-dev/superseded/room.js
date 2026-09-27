// s20 room plate (setup A framing, frame px): guitar case, the tall speaker with its lit side panel, the milk
// crate with the coiled cable, the plant, a small rack, the "MIXING. DO NOT KNOCK." sign, the carton stack behind
// the card, the studio monitor, the X keyboard stand, the rack table and the synth. Positions measured on the
// source (grids at 64.12 / 65.8 and a percentile clean plate of 63.44–66.8). The scissors are NOT in the plate.
import { Plate, grey } from "../../lib/engrave.js";
import { taper, INK } from "../../lib/ink.js";
import { smoothPath, sampleCurve } from "../../lib/paths.js";
import { rng, clamp } from "../../lib/rng.js";

const TAU = Math.PI * 2;
const poly = (pts) => (c) => { c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.closePath(); };
const blob = (pts) => (c) => smoothPath(c, pts, true);
const ell = (x, y, rx, ry, rot = 0) => (c) => c.ellipse(x, y, rx, ry, rot, 0, TAU);
const linear = (x0, y0, x1, y1, stops) => (g) => { const r = g.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, v]) => r.addColorStop(o, grey(v))); return r; };
const radial = (x, y, r0, r1, stops) => (g) => { const r = g.createRadialGradient(x, y, r0, x, y, r1); stops.forEach(([o, v]) => r.addColorStop(o, grey(v))); return r; };
const DARK = "#060606";
function line(o, pts, w, color = INK, per = 6) {
  const q = pts.length > 2 ? sampleCurve(pts, per) : pts;
  taper(o, q, (u) => w * (0.35 + 0.65 * Math.pow(Math.sin(Math.PI * clamp(u)), 0.5)), color);
}
function seg(o, a, b, w, color = INK) { taper(o, [a, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], b], (u) => w * (0.6 + 0.4 * Math.sin(Math.PI * u)), color); }
function strokePoly(o, pts, w, color, closed = true) { o.save(); o.strokeStyle = color; o.lineWidth = w; o.lineJoin = "round"; o.beginPath(); o.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) o.lineTo(p[0], p[1]); if (closed) o.closePath(); o.stroke(); o.restore(); }
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
// quad-local point: u across (TL->TR), v down (TL->BL), bilinear
const qpt = (q, u, v) => mix(mix(q[0], q[1], u), mix(q[3], q[2], u), v);
// vertical grain strokes inside a quad (wood / carton): white hairlines on dark, or dark lines on light
function grain(o, q, n, { color = INK, w = 1.2, seed = 1, alpha = 0.6, v0 = 0, v1 = 1, wob = 2 } = {}) {
  // brushy grain: seeded jitter in spacing, weight and length; strokes break and restart; a few clumps
  const r = rng(seed);
  o.save(); o.beginPath(); poly(q)(o); o.clip();
  let u = r() * 0.6 / Math.max(1, n);
  while (u < 1) {
    const clump = r() < 0.18;
    const segs = 1 + Math.floor(r() * 2.2);
    let a = v0 + r() * 0.2 * (v1 - v0);
    for (let sg = 0; sg < segs && a < v1; sg++) {
      const b = Math.min(v1, a + (v1 - v0) * (0.25 + r() * 0.7));
      const pts = [];
      for (let k = 0; k <= 6; k++) { const v = a + (b - a) * k / 6, p = qpt(q, u, v); pts.push([p[0] + Math.sin(k * 1.7 + u * 31) * wob * r(), p[1]]); }
      o.globalAlpha = alpha * (0.45 + 0.75 * r());
      line(o, pts, w * (0.35 + 1.3 * r() * r() + (clump ? 0.8 : 0)), color, 4);
      a = b + (v1 - v0) * (0.02 + r() * 0.08);
    }
    u += (1 / Math.max(1, n)) * (0.35 + 1.3 * r());
  }
  o.restore();
}

// ---------------------------------------------------------------- left: guitar case, speaker, crate, cable
function guitarCase(P) {
  // the case seen edge-on at the far left: a dark band with bright metal rims (several parallel bright lines), a latch
  const o = P.o;
  const L = [[152, -20], [147, 120], [145, 250], [158, 330], [186, 400], [203, 470], [210, 560]];
  const R = [[244, -20], [238, 120], [234, 250], [242, 330], [264, 400], [284, 460], [304, 560]];
  P.fill(poly([...L, ...R.slice().reverse()]), linear(140, 0, 300, 0, [[0, 0.16], [0.5, 0.1], [1, 0.05]]), 1.52, { spacing: 0.3, style: 0 });
  const at = (f) => L.map((p, i) => mix(p, R[i], f));
  for (const [f, w, a] of [[0.04, 3.2, 0.85], [0.16, 2.2, 0.7], [0.3, 3.6, 0.8], [0.44, 1.6, 0.55], [0.62, 2.6, 0.7], [0.8, 1.8, 0.5], [0.95, 3, 0.8]]) line(o, at(f), w, `rgba(232,230,224,${a})`);
  for (const f of [0.1, 0.37, 0.53, 0.71, 0.88]) line(o, at(f), 1.6, DARK);
  // latch
  const lq = [[168, 158], [200, 164], [198, 196], [166, 190]];
  P.fill(poly(lq), 0.8, 0, { style: 2 }); strokePoly(o, lq, 2, DARK);
  seg(o, [174, 172], [192, 175], 1.2, DARK); seg(o, [173, 180], [191, 183], 1.2, DARK);
}

function speaker(P) {
  const o = P.o, r = rng(7);
  // front face (dark wood, vertical grain)
  const front = [[266, 46], [552, 46], [552, 990], [266, 990]];
  P.fill(poly(front), linear(266, 0, 552, 0, [[0, 0.04], [0.6, 0.05], [1, 0.08]]), 1.5708, { spacing: 0.3, style: 0 });
  grain(o, front, 40, { color: INK, w: 1.0, seed: 11, alpha: 0.22 });
  // top slab (lit, horizontal grain) and the strip on its right
  P.fill(poly([[296, -20], [548, -20], [548, 44], [296, 48]]), linear(0, -20, 0, 48, [[0, 0.3], [1, 0.45]]), 0.02, { spacing: 0.3, style: 0 });
  line(o, [[296, 48], [552, 44]], 3, DARK);
  line(o, [[300, 30], [548, 26]], 1.4, "rgba(242,240,234,0.6)");
  // front bevel strip between the face and the lit side
  const bevel = [[552, 44], [612, 50], [622, 990], [552, 990]];
  P.fill(poly(bevel), linear(0, 50, 0, 946, [[0, 0.12], [0.22, 0.34], [0.36, 0.3], [0.45, 0.14], [0.8, 0.14], [1, 0.02]]), 1.5708, { spacing: 0.25, style: 2 });
  grain(o, bevel, 14, { color: DARK, w: 1.8, seed: 12, alpha: 0.7 }); grain(o, bevel, 6, { color: "rgba(236,234,228,1)", w: 1.4, seed: 112, alpha: 0.45 });
  // lit side panel (receding right), vertical grain
  const side = [[612, 50], [728, 168], [740, 990], [622, 990]];
  // lit side panel: bright from y ≈ 180 to 720, falling into shadow at the floor (source column means 111, 160–195, 122 @780, 78 @840, 5 @900)
  P.fill(poly(side), linear(0, 50, 0, 946, [[0, 0.6], [0.15, 0.95], [0.72, 0.95], [0.8, 0.72], [0.88, 0.4], [0.95, 0.04], [1, 0]]), 1.5708, { spacing: 0.18, style: 2 });
  grain(o, side, 46, { color: DARK, w: 2.0, seed: 13, alpha: 0.6, wob: 3 });
  line(o, [[612, 50], [728, 168]], 2.6, DARK); line(o, [[728, 168], [740, 990]], 2.4, DARK);
  line(o, [[552, 44], [612, 50]], 2, DARK); line(o, [[612, 50], [622, 990]], 2, DARK);
  // tweeter
  P.fill(ell(410, 182, 52, 54), radial(412, 180, 2, 54, [[0, 0.95], [0.1, 0.3], [0.25, 0.03], [0.72, 0.05], [0.85, 0.35], [1, 0.08]]), 0.8, { style: 2 });
  o.strokeStyle = INK; o.lineWidth = 2; o.beginPath(); ell(410, 182, 52, 54)(o); o.stroke();
  o.lineWidth = 1.2; o.globalAlpha = 0.5; o.beginPath(); ell(410, 182, 40, 42)(o); o.stroke(); o.globalAlpha = 1;
  // woofer (measured 66.40: mount ring centre (433,418) rx 139 ry 148, dust cap r ≈ 52 with a highlight at (436,412)):
  // a near-black cone with concentric grooves lit on the left and low down, radial strokes, a surround lit only on
  // the right (−60°…+60°), a dark cap
  const WX = 431, WY = 418;
  P.fill(ell(WX + 2, WY, 140, 149), radial(WX + 2, WY, 118, 149, [[0, 0.1], [0.5, 0.34], [0.85, 0.2], [1, 0.06]]), 0.8, { style: 2 });
  // cone base: a lit crescent low on the left (conic ramp round the axis), near-black elsewhere
  P.fill(ell(WX, WY, 122, 131), (g) => { const c = g.createConicGradient(0, WX, WY); for (const [o, v] of [[0, 0.06], [0.2, 0.1], [0.3, 0.42], [0.38, 0.62], [0.47, 0.5], [0.56, 0.2], [0.66, 0.05], [1, 0.06]]) c.addColorStop(o, grey(v)); return c; }, 0.8, { style: 2 });
  o.save(); o.beginPath(); ell(WX, WY, 122, 131)(o); o.clip(); o.lineCap = "round";
  // concentric grooves: bright where the lamp catches them (left and lower left), dim elsewhere
  for (let k = 0; k < 20; k++) {
    const f = 0.46 + k * 0.027, rx = 122 * f, ry = 131 * f;
    for (let sgm = 0; sgm < 24; sgm++) {
      const a0 = (sgm / 24) * TAU + r() * 0.1, a1 = a0 + TAU / 24 * (0.6 + r() * 0.5);
      const am = (a0 + a1) / 2, lit = Math.max(0, Math.cos(am - 2.4)) ** 0.8 * 0.95 + Math.max(0, Math.cos(am - 0.3)) ** 3 * 0.3;
      if (lit < 0.04 || r() > 0.3 + lit) continue;
      o.globalAlpha = Math.min(1, 0.2 + 0.8 * lit) * (0.65 + 0.35 * r()); o.strokeStyle = k % 3 === 2 ? "rgba(20,20,20,1)" : "rgba(226,224,218,1)"; o.lineWidth = 1.2 + 3.2 * lit * (0.4 + 0.6 * r());
      o.beginPath(); o.ellipse(WX, WY, rx, ry, 0, a0, a1); o.stroke();
    }
  }
  // radial hatching (dark strokes across the grooves)
  for (let i = 0; i < 70; i++) { const a = (i / 70) * TAU + r() * 0.05, r0 = 0.47 + r() * 0.1, r1 = 0.8 + r() * 0.18; o.globalAlpha = 0.5; o.strokeStyle = DARK; o.lineWidth = 1 + r(); o.beginPath(); o.moveTo(WX + Math.cos(a) * 122 * r0, WY + Math.sin(a) * 131 * r0); o.lineTo(WX + Math.cos(a) * 122 * r1, WY + Math.sin(a) * 131 * r1); o.stroke(); }
  o.restore(); o.globalAlpha = 1;
  // surround (r 122–140): lit only on the right
  o.save(); o.lineCap = "round";
  for (let k = 0; k < 4; k++) { o.strokeStyle = `rgba(236,234,228,${0.85 - k * 0.15})`; o.lineWidth = 3.6 - k * 0.6; o.beginPath(); o.ellipse(WX + 2, WY, 126 + k * 4, 135 + k * 4, 0, -1.05, 1.05); o.stroke(); }
  o.strokeStyle = "rgba(236,234,228,0.35)"; o.lineWidth = 1.4; o.beginPath(); o.ellipse(WX + 2, WY, 131, 140, 0, 1.3, 2.4); o.stroke();
  o.restore();
  // dust cap
  P.fill(ell(WX + 2, WY + 2, 54, 58), radial(WX + 6, WY - 6, 2, 58, [[0, 0.7], [0.12, 0.16], [0.3, 0.03], [1, 0.02]]), 0.8, { style: 2 });
  o.strokeStyle = "rgba(200,198,192,0.5)"; o.lineWidth = 1.6; o.beginPath(); o.ellipse(WX + 2, WY + 2, 54, 58, 0, 2.0, 4.2); o.stroke();
  o.strokeStyle = DARK; o.lineWidth = 3; o.beginPath(); ell(WX, WY, 122, 131)(o); o.stroke();
  o.strokeStyle = INK; o.lineWidth = 1.6; o.beginPath(); ell(WX + 2, WY, 140, 149)(o); o.stroke();
  for (const a of [-1.2, -0.45, 0.35, 1.1]) { const x = WX + 2 + Math.cos(a) * 146, y = WY + Math.sin(a) * 155; o.fillStyle = DARK; o.beginPath(); o.arc(x, y, 6, 0, TAU); o.fill(); o.strokeStyle = INK; o.lineWidth = 1.4; o.stroke(); }
  // lower woofer (mostly in shadow, behind the crate)
  P.fill(ell(508, 742, 80, 96), radial(508, 742, 10, 96, [[0, 0.02], [0.5, 0.05], [0.8, 0.12], [1, 0.04]]), 0.8, { style: 2 });
  o.globalAlpha = 0.5; o.strokeStyle = INK;
  for (const f of [1, 0.9, 0.78, 0.6]) { o.lineWidth = f === 1 ? 2 : 1.1; o.beginPath(); ell(508, 742, 80 * f, 96 * f)(o); o.stroke(); }
  o.globalAlpha = 1;
}

function crate(P) {
  const o = P.o, r = rng(21);
  // left side (receding, very dark lattice)
  P.fill(poly([[-40, 505], [172, 530], [172, 990], [-40, 990]]), 0.0, 0.8, { spacing: 0.3, style: 0 });
  o.save(); o.globalAlpha = 0.1; o.strokeStyle = INK; o.lineWidth = 1.4;
  for (let k = -400; k < 400; k += 60) { o.beginPath(); o.moveTo(k, 640); o.lineTo(k + 300, 990); o.stroke(); o.beginPath(); o.moveTo(k + 300, 640); o.lineTo(k, 990); o.stroke(); }
  o.restore();
  // front face frame
  const face = [[168, 532], [452, 540], [452, 990], [168, 990]];
  P.fill(poly(face), 0.0, 0, { spacing: 0.3 });
  // top rim bar
  P.fill(poly([[160, 526], [458, 534], [458, 552], [160, 546]]), 0.6, 0.02, { spacing: 0.2 });
  strokePoly(o, [[160, 526], [458, 534], [458, 552], [160, 546]], 2, DARK);
  // upper band: slatted window + side panels
  P.fill(poly([[200, 552], [410, 556], [410, 652], [200, 648]]), 0.5, 1.5708, { spacing: 0.25 });
  P.fill(poly([[282, 560], [396, 562], [396, 634], [282, 632]]), 0.1, 0, { spacing: 0.3 });
  for (let x = 288; x < 394; x += 10) { P.fill(poly([[x, 564], [x + 5, 564], [x + 5, 630], [x, 630]]), 0.8, 1.5708, { style: 2 }); }
  strokePoly(o, [[282, 560], [396, 562], [396, 634], [282, 632]], 2.4, DARK);
  strokePoly(o, [[206, 560], [272, 561], [272, 640], [206, 640]], 2, DARK);
  line(o, [[200, 652], [410, 656]], 2.6, DARK);
  // posts (lit, vertical lines)
  for (const [x0, x1] of [[168, 202], [408, 452]]) {
    const q = [[x0, 540], [x1, 540], [x1, 990], [x0, 990]];
    P.fill(poly(q), linear(x0, 0, x1, 0, [[0, 0.62], [1, 0.4]]), 1.5708, { spacing: 0.2 });
    grain(o, q, 5, { color: DARK, w: 1.8, seed: x0, alpha: 0.8, wob: 0.5 });
    strokePoly(o, q, 2, DARK);
  }
  // handle opening: a pale rounded frame round a dark hole, then the lattice below
  P.fill(poly([[292, 664], [396, 666], [392, 716], [296, 714]]), 0.02, 0, { spacing: 0.3 });
  o.save(); o.strokeStyle = "rgba(242,240,234,0.8)"; o.lineWidth = 5; o.beginPath(); o.roundRect(282, 652, 112, 90, 12); o.stroke();
  o.strokeStyle = DARK; o.lineWidth = 1.6; o.beginPath(); o.roundRect(288, 658, 100, 78, 9); o.stroke(); o.restore();
  o.save(); o.beginPath(); poly([[204, 748], [406, 750], [406, 990], [204, 990]])(o); o.clip();
  o.lineCap = "round";
  for (let k = -300; k < 400; k += 46) {
    for (const s of [1, -1]) {
      const a = [204 + k, 748], b = [204 + k + s * 242, 990];
      o.strokeStyle = "rgba(242,240,234,0.6)"; o.lineWidth = 3.4; o.beginPath(); o.moveTo(a[0], a[1]); o.lineTo(b[0], b[1]); o.stroke();
      o.strokeStyle = DARK; o.lineWidth = 1.4; o.beginPath(); o.moveTo(a[0] + 3, a[1]); o.lineTo(b[0] + 3, b[1]); o.stroke();
    }
  }
  o.restore();
  // horizontal bar under the handle
  P.fill(poly([[200, 742], [410, 745], [410, 752], [200, 749]]), 0.45, 0, { style: 2 });
}

function cables(P) {
  const o = P.o, r = rng(33);
  // coiled cables heaped on the crate: thick dark tubes wound in overlapping loops, each with a white contour and a
  // highlight along its top, twisted (the loops cross and change width)
  const tube = (pts, w) => {
    const q = sampleCurve(pts, 10);
    taper(o, q, (u) => w + 3, "rgba(236,234,228,0.6)");
    taper(o, q, (u) => w * (0.85 + 0.15 * Math.sin(u * 17)), "#0b0b0b");
    taper(o, q.map(([x, y]) => [x, y - w * 0.28]), (u) => Math.max(0.6, w * 0.12 * (0.5 + 0.5 * Math.sin(u * 9 + 1))), "rgba(236,234,228,0.5)");
  };
  const loops = [[140, 516, 150, 26, -0.03, 15], [215, 502, 160, 28, -0.05, 17], [110, 494, 105, 22, -0.08, 13], [262, 520, 118, 20, 0.02, 14], [84, 522, 88, 17, 0.0, 12], [180, 486, 120, 18, -0.06, 12]];
  for (const [x, y, rx, ry, rot, w] of loops) {
    const back = [], front = [];
    for (let i = 0; i <= 16; i++) { const a = Math.PI + (i / 16) * Math.PI; back.push([x + Math.cos(a) * rx, y + Math.sin(a) * ry + Math.sin(i * 1.3) * 1.5]); }
    for (let i = 0; i <= 16; i++) { const a = (i / 16) * Math.PI; front.push([x + Math.cos(a) * rx * 1.02, y + Math.sin(a) * ry * 0.9 + 3]); }
    tube(back, w * 0.85); tube(front, w);
  }
  // the thick corrugated cable dropping in front of the crate: dark, with a serrated white edge on its right
  const C = sampleCurve([[190, 488], [228, 505], [246, 560], [252, 640], [270, 740], [300, 830], [340, 910], [380, 990]], 18);
  taper(o, C, 24, "#0b0b0b");
  for (let i = 1; i < C.length - 1; i++) {
    const a = C[i - 1], b = C[i + 1], d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, nx = -(b[1] - a[1]) / d, ny = (b[0] - a[0]) / d;
    const sx = C[i][0] - nx * 11, sy = C[i][1] - ny * 11;   // right-hand edge (the curve runs down)
    o.strokeStyle = "rgba(242,240,234,0.9)"; o.lineWidth = 2.4;
    o.beginPath(); o.moveTo(sx, sy); o.lineTo(sx + nx * 6 + (b[0] - a[0]) / d * 3, sy + ny * 6 + (b[1] - a[1]) / d * 3); o.stroke();
  }
  taper(o, C.map(([x, y]) => [x - 9, y + 2]), 1.4, "rgba(242,240,234,0.4)");
  // thinner cables hanging from the rack down to the floor
  for (const pts of [[[780, 400], [786, 520], [800, 640], [790, 760], [770, 900]], [[800, 404], [812, 520], [830, 660], [826, 780]], [[820, 402], [838, 500], [856, 620], [862, 740]]]) {
    line(o, pts, 5, DARK); line(o, pts, 2.2, "rgba(242,240,234,0.6)");
  }
  // cable across the floor at the speaker foot
  line(o, [[560, 990], [620, 930], [700, 890], [760, 900], [790, 946], [760, 990]], 3, "rgba(242,240,234,0.5)");
}

function plant(P) {
  const o = P.o, r = rng(41);
  P.fill(poly([[646, 22], [700, 18], [694, 78], [652, 80]]), linear(646, 0, 700, 0, [[0, 0.6], [1, 0.3]]), 1.57, { spacing: 0.2 });
  strokePoly(o, [[646, 22], [700, 18], [694, 78], [652, 80]], 2, DARK);
  const leaves = [[640, 8, 0.4], [668, 30, 0.9], [700, 22, 0.3], [722, 44, 1.0], [748, 78, 0.9], [778, 88, 1.3], [756, 140, 1.2], [778, 160, 1.4], [768, 218, 1.5], [690, 62, 1.6], [735, 110, 1.1], [712, -6, 0.6]];
  const vine = [[690, 20], [720, 60], [745, 110], [760, 160], [765, 215]];
  line(o, vine, 1.8, "rgba(236,234,228,0.6)");
  // heart-shaped leaves: mid-dark fill, a bright white contour and pale veins (the lamp catches their edges)
  for (const [x, y, a] of leaves) {
    const L = 32 + r() * 8, w = 19 + r() * 5;
    const d = [Math.cos(a), Math.sin(a)], n = [-d[1], d[0]];
    const tip = [x + d[0] * L, y + d[1] * L];
    const pts = [[x, y], [x + d[0] * L * 0.1 + n[0] * w * 0.55, y + d[1] * L * 0.1 + n[1] * w * 0.55], [x + d[0] * L * 0.45 + n[0] * w * 0.6, y + d[1] * L * 0.45 + n[1] * w * 0.6], tip,
      [x + d[0] * L * 0.45 - n[0] * w * 0.6, y + d[1] * L * 0.45 - n[1] * w * 0.6], [x + d[0] * L * 0.1 - n[0] * w * 0.55, y + d[1] * L * 0.1 - n[1] * w * 0.55]];
    P.fill(blob(pts), 0.42 + r() * 0.15, a, { style: 2 });
    o.strokeStyle = "rgba(240,238,232,0.95)"; o.lineWidth = 2.4; o.beginPath(); smoothPath(o, pts, true); o.stroke();
    o.strokeStyle = DARK; o.lineWidth = 0.9; o.beginPath(); smoothPath(o, pts, true); o.stroke();
    seg(o, [x + d[0] * 3, y + d[1] * 3], [x + d[0] * L * 0.88, y + d[1] * L * 0.88], 1.6, "rgba(232,230,224,0.85)");
    for (const f of [0.3, 0.5, 0.7]) for (const sgn of [1, -1]) { const b0 = [x + d[0] * L * f, y + d[1] * L * f]; seg(o, b0, [b0[0] + (d[0] * 0.5 + n[0] * sgn) * w * 0.35, b0[1] + (d[1] * 0.5 + n[1] * sgn) * w * 0.35], 1.0, "rgba(232,230,224,0.6)"); }
  }
}

function rack(P) {
  const o = P.o;
  // dark tall unit behind (right of the speaker) with a dim edge
  P.fill(poly([[738, 168], [870, 175], [872, 760], [742, 760]]), 0.03, 1.57, { spacing: 0.3 });
  line(o, [[850, 180], [852, 700]], 1.4, "rgba(242,240,234,0.18)");
  // small rack unit with two rows of knobs
  const q = [[736, 282], [846, 318], [846, 408], [736, 392]];
  P.fill(poly(q), linear(736, 0, 846, 0, [[0, 0.35], [1, 0.22]]), 0.3, { spacing: 0.2 });
  strokePoly(o, q, 2, DARK);
  for (let row = 0; row < 2; row++) for (let i = 0; i < 5; i++) {
    const x = 758 + i * 18, y = 318 + row * 34 + i * 5.5;
    o.fillStyle = DARK; o.beginPath(); o.ellipse(x, y, 7, 8, 0, 0, TAU); o.fill();
    o.strokeStyle = "rgba(242,240,234,0.7)"; o.lineWidth = 1.3; o.beginPath(); o.ellipse(x - 1, y - 1, 7, 8, 0, 3.6, 5.8); o.stroke();
  }
}

// ---------------------------------------------------------------- middle: the sign, the dark gap
function sign(P) {
  const o = P.o;
  const q = [[897, 24], [1135, 3], [1142, 103], [907, 137]];
  P.fill(poly(q), 0.0, -0.09, { spacing: 0.3 });
  strokePoly(o, q, 2.2, "rgba(120,118,114,0.75)");
  strokePoly(o, [[903, 30], [1129, 10], [1136, 97], [912, 130]], 1, "rgba(120,118,114,0.5)");
  line(o, [[942, 0], [948, 26]], 1.4, "rgba(150,148,144,0.6)"); line(o, [[1090, -10], [1098, 8]], 1.4, "rgba(150,148,144,0.6)");
  for (const [x, y] of [[906, 34], [1126, 14], [1130, 92], [918, 126]]) { o.strokeStyle = "rgba(160,158,154,0.8)"; o.lineWidth = 1.5; o.beginPath(); o.arc(x, y, 3.5, 0, TAU); o.stroke(); }
  o.save(); o.translate(1018, 72); o.rotate(-0.095);
  o.fillStyle = "rgba(128,126,120,0.8)"; o.textAlign = "center";
  o.font = "400 31px 'Geist Mono'"; o.letterSpacing = "1px";
  o.save(); o.scale(0.92, 1.12); o.fillText("MIXING.", 2, -22 / 1.12); o.restore();
  o.save(); o.scale(0.88, 1.18); o.fillText("DO NOT KNOCK.", 0, 22 / 1.18); o.restore();
  o.restore();
}

// ---------------------------------------------------------------- right: cartons, monitor, stand, table
function cartons(P) {
  const o = P.o;
  // dim boxes left of the card
  const b1 = [[1200, 142], [1262, 146], [1262, 300], [1200, 298]];
  const b2 = [[1188, 272], [1268, 276], [1268, 470], [1188, 468]];
  const b3 = [[1262, 120], [1300, 118], [1300, 470], [1262, 470]];
  P.fill(poly(b3), 0.03, 1.57, { spacing: 0.3 });
  for (const [q, s] of [[b1, 61], [b2, 62]]) {
    P.fill(poly(q), linear(q[0][0], 0, q[1][0], 0, [[0, 0.3], [1, 0.18]]), 1.57, { spacing: 0.2, style: 2 });
    grain(o, q, 18, { color: DARK, w: 2.2, seed: s, alpha: 0.8 }); grain(o, q, 5, { color: "rgba(236,234,228,1)", w: 1.4, seed: 900 + 10, alpha: 0.35, wob: 1.5 });
    strokePoly(o, q, 2, DARK);
  }
  // the studio monitor at the top
  const mon = [[1298, -10], [1376, -10], [1376, 186], [1302, 190]];
  P.fill(poly(mon), 0.07, 1.57, { spacing: 0.3 });
  strokePoly(o, mon, 1.6, "rgba(242,240,234,0.35)");
  o.strokeStyle = "rgba(242,240,234,0.45)"; o.lineWidth = 1.6;
  for (const f of [1, 0.7, 0.35]) { o.beginPath(); o.ellipse(1340, 66, 28 * f, 30 * f, 0, 0, TAU); o.stroke(); }
  o.strokeRect(1318, 130, 36, 40);
  line(o, [[1300, 30], [1290, 90], [1296, 150], [1316, 186]], 1.4, "rgba(242,240,234,0.45)");
  // lit column top centre, and the box in front of it (both behind the card)
  const col = [[1392, -10], [1504, -10], [1504, 250], [1392, 250]];
  P.fill(poly(col), linear(1392, 0, 1504, 0, [[0, 0.95], [0.5, 0.92], [1, 0.8]]), 1.5708, { spacing: 0.18 });
  grain(o, col, 21, { color: DARK, w: 2.2, seed: 71, alpha: 0.7 }); grain(o, col, 6, { color: "rgba(236,234,228,1)", w: 1.4, seed: 900 + 12, alpha: 0.35, wob: 1.5 });
  line(o, [[1392, -10], [1392, 250]], 2.4, DARK);
  const boxTop = [[1356, 202], [1500, 88], [1520, 86], [1378, 210]];
  const box = [[1356, 202], [1500, 90], [1500, 470], [1356, 470]];
  P.fill(poly(box), linear(1356, 0, 1500, 0, [[0, 0.88], [1, 0.75]]), 1.5708, { spacing: 0.2, style: 2 });
  grain(o, box, 25, { color: DARK, w: 2.2, seed: 72, alpha: 0.75 }); grain(o, box, 7, { color: "rgba(236,234,228,1)", w: 1.4, seed: 900 + 14, alpha: 0.35, wob: 1.5 });
  line(o, [[1356, 202], [1500, 88]], 2.6, DARK);
  line(o, [[1356, 202], [1356, 470]], 2.4, DARK);
  // torn tape flap
  line(o, [[1408, 216], [1420, 206], [1432, 214], [1444, 204], [1452, 212]], 1.8, DARK);
  // big carton right of the card (mid value), a second one below, a lit one at the very top
  const rb = [[1500, 84], [1746, 88], [1746, 422], [1500, 420]];
  P.fill(poly(rb), linear(1500, 0, 1746, 0, [[0, 0.5], [0.6, 0.36], [1, 0.22]]), 1.5708, { spacing: 0.2, style: 2 });
  grain(o, rb, 46, { color: DARK, w: 2.4, seed: 73, alpha: 0.85 }); grain(o, rb, 13, { color: "rgba(236,234,228,1)", w: 1.4, seed: 900 + 26, alpha: 0.35, wob: 1.5 });
  P.fill(poly([[1510, 60], [1760, 62], [1746, 88], [1500, 84]]), 0.55, 0.02, { spacing: 0.2, style: 2 });
  line(o, [[1500, 84], [1746, 88]], 2.4, DARK);
  const rb2 = [[1500, 424], [1746, 426], [1746, 640], [1500, 640]];
  P.fill(poly(rb2), linear(1500, 0, 1746, 0, [[0, 0.48], [1, 0.22]]), 1.5708, { spacing: 0.2, style: 2 });
  grain(o, rb2, 43, { color: DARK, w: 2.4, seed: 74, alpha: 0.85 }); grain(o, rb2, 12, { color: "rgba(236,234,228,1)", w: 1.4, seed: 900 + 24, alpha: 0.35, wob: 1.5 });
  line(o, [[1500, 422], [1746, 426]], 3, DARK);
  const tb = [[1782, -10], [1872, -10], [1872, 96], [1782, 96]];
  P.fill(poly(tb), 0.4, 1.5708, { spacing: 0.2, style: 2 }); grain(o, tb, 14, { color: DARK, w: 2, seed: 75, alpha: 0.8 }); grain(o, tb, 4, { color: "rgba(236,234,228,1)", w: 1.4, seed: 900 + 8, alpha: 0.35, wob: 1.5 });
  // far dark cartons in the gap behind the stand
  P.fill(poly([[1746, 96], [1990, 110], [1990, 640], [1746, 640]]), 0.02, 1.57, { spacing: 0.3 });
}

function tube(P, a, b, w, cap = true) {
  // a dark steel tube (value ≈ 0.1) with a white contour and one highlight line, end caps
  const o = P.o;
  const d = [b[0] - a[0], b[1] - a[1]], L = Math.hypot(d[0], d[1]), u = [d[0] / L, d[1] / L], n = [-u[1], u[0]];
  const q = [[a[0] + n[0] * w / 2, a[1] + n[1] * w / 2], [b[0] + n[0] * w / 2, b[1] + n[1] * w / 2], [b[0] - n[0] * w / 2, b[1] - n[1] * w / 2], [a[0] - n[0] * w / 2, a[1] - n[1] * w / 2]];
  P.fill(poly(q), 0.08, Math.atan2(u[1], u[0]), { style: 2 });
  seg(o, q[0], q[1], 2.2, "rgba(236,234,228,0.9)"); seg(o, q[3], q[2], 1.6, "rgba(236,234,228,0.55)");
  seg(o, mix(q[0], q[3], 0.28), mix(q[1], q[2], 0.28), Math.max(1.4, w * 0.12), "rgba(240,238,232,0.85)");
  if (cap) for (const [p, sgn] of [[a, -1], [b, 1]]) {
    o.save(); o.translate(p[0], p[1]); o.rotate(Math.atan2(u[1], u[0]));
    o.fillStyle = "#101010"; o.beginPath(); o.ellipse(0, 0, w * 0.32, w * 0.62, 0, 0, TAU); o.fill();
    o.strokeStyle = "rgba(236,234,228,0.9)"; o.lineWidth = 2; o.stroke();
    o.strokeStyle = "rgba(236,234,228,0.5)"; o.lineWidth = 1.2; o.beginPath(); o.ellipse(0, 0, w * 0.14, w * 0.3, 0, 0, TAU); o.stroke();
    o.restore();
  }
}

function stand(P) {
  // X keyboard stand: two capped arms and four crossing legs (thick dark tubes) with a centre knob
  for (const [a, b] of [[[1650, 275], [1830, 612]], [[1722, 290], [1900, 618]], [[1896, 252], [1712, 604]], [[1946, 258], [1762, 608]]]) tube(P, a, b, 16, false);
  tube(P, [1772, 194], [2000, 256], 24);
  tube(P, [1580, 258], [1800, 302], 26);
  const o = P.o;
  P.fill(ell(1770, 476, 11, 17), 0.15, 0, { style: 2 }); o.strokeStyle = "rgba(236,234,228,0.85)"; o.lineWidth = 2; o.beginPath(); ell(1770, 476, 11, 17)(o); o.stroke();
}

function table(P) {
  const o = P.o;
  // top surface edge and the beams
  line(o, [[1860, 192], [2060, 136], [2240, 120]], 2, "rgba(242,240,234,0.45)");
  P.fill(poly([[2080, 118], [2240, 110], [2240, 180], [2080, 186]]), 0.08, 0, { spacing: 0.3 });
  o.fillStyle = "rgba(242,240,234,0.3)"; for (let x = 2090; x < 2230; x += 8) for (let y = 130; y < 176; y += 8) { o.beginPath(); o.arc(x, y + (x - 2090) * -0.03, 1.2, 0, TAU); o.fill(); }
  const beam1 = [[2000, 176], [2240, 170], [2240, 226], [2000, 226]];
  P.fill(poly(beam1), linear(0, 176, 0, 226, [[0, 0.3], [1, 0.18]]), 0.0, { spacing: 0.2 });
  grain(o, [[2000, 176], [2240, 170], [2240, 226], [2000, 226]], 0, {});
  const post = [[1990, 186], [2060, 184], [2060, 640], [1990, 640]];
  P.fill(poly(post), linear(1990, 0, 2060, 0, [[0, 0.36], [1, 0.2]]), 1.5708, { spacing: 0.2 });
  grain(o, post, 7, { color: DARK, w: 2.2, seed: 81, alpha: 0.85 });
  strokePoly(o, post, 2, DARK);
  const beam2 = [[1900, 318], [2240, 300], [2240, 372], [1900, 384]];
  P.fill(poly(beam2), linear(0, 300, 0, 384, [[0, 0.42], [1, 0.25]]), 0.0, { spacing: 0.2 });
  o.save(); o.beginPath(); poly(beam2)(o); o.clip(); o.globalAlpha = 0.8;
  for (let k = 0; k < 7; k++) line(o, [[1900, 326 + k * 9], [2240, 308 + k * 9]], 1.6, DARK);
  o.restore();
  // bracket plate with four bolts
  const br = [[1972, 300], [2044, 296], [2048, 380], [1976, 384]];
  P.fill(poly(br), 0.55, 0, { style: 2 }); strokePoly(o, br, 2, DARK);
  for (const [x, y] of [[1990, 322], [2026, 320], [1992, 360], [2028, 358]]) { o.strokeStyle = DARK; o.lineWidth = 2; o.beginPath(); o.ellipse(x, y, 7, 9, 0, 0, TAU); o.stroke(); }
}

function synth(P) {
  const o = P.o, r = rng(91);
  const W1 = "rgba(236,234,228,0.9)", W2 = "rgba(236,234,228,0.6)";
  // the whole chassis: dark (≈ 0.08), a white rim line round its top and left end
  const body = [[1440, 582], [2240, 630], [2240, 990], [1360, 822], [1335, 760]];
  P.fill(poly(body), 0.07, 0.1, { spacing: 0.3 });
  line(o, [[1440, 582], [2240, 628]], 2.4, W1);
  line(o, [[1440, 582], [1335, 760]], 2.6, W1);
  line(o, [[1335, 760], [1360, 824]], 2, W2);
  // left end cap (slightly lit)
  P.fill(poly([[1440, 586], [1420, 626], [1342, 762], [1336, 758]]), 0.2, 1.0, { spacing: 0.2 });
  // top strip: mod wheels on the left, a row of fader caps
  const top = [[1440, 588], [2046, 628], [2046, 668], [1420, 626]];
  for (const [x, y] of [[1468, 604], [1508, 606]]) { o.fillStyle = "#050505"; o.beginPath(); o.ellipse(x, y, 16, 7, 0.06, 0, TAU); o.fill(); o.strokeStyle = W2; o.lineWidth = 1.4; o.beginPath(); o.ellipse(x, y - 1, 16, 7, 0.06, 3.3, 6.1); o.stroke(); }
  for (let i = 0; i < 12; i++) {
    const f = 0.24 + i * 0.062, p = mix(mix(top[0], top[1], f), mix(top[3], top[2], f), 0.55);
    o.fillStyle = "rgba(236,234,228,0.85)"; o.beginPath(); o.roundRect(p[0] - 3, p[1] - 9, 6, 16, 2); o.fill();
    o.fillStyle = "rgba(236,234,228,0.7)"; o.fillRect(p[0] - 6, p[1] - 10, 12, 3);
    seg(o, [p[0] + 9, p[1] - 11], [p[0] + 9, p[1] + 8], 1.2, "rgba(236,234,228,0.3)");
  }
  // two rows of rounded (pill) buttons, dark with a white outline
  const pan = [[1420, 628], [2046, 670], [2050, 722], [1416, 676]];
  for (let row = 0; row < 2; row++) for (let i = 0; i < (row ? 14 : 11); i++) {
    const f = 0.22 + i * 0.054, p = mix(mix(pan[0], pan[1], f), mix(pan[3], pan[2], f), 0.28 + row * 0.44);
    o.fillStyle = "#070707"; o.beginPath(); o.roundRect(p[0] - 13, p[1] - 6, 26, 12, 6); o.fill();
    o.strokeStyle = W1; o.lineWidth = 1.5; o.stroke();
  }
  // the triangle panel graphic
  o.fillStyle = "rgba(236,234,228,0.85)"; o.beginPath(); o.moveTo(2000, 700); o.lineTo(2018, 668); o.lineTo(2030, 702); o.closePath(); o.fill();
  o.fillStyle = "#070707"; o.beginPath(); o.moveTo(2008, 696); o.lineTo(2018, 680); o.lineTo(2024, 697); o.closePath(); o.fill();
  line(o, [[1416, 676], [2050, 722]], 2, W2);
  // keys: back edge (1420,680)->(2046,736), front edge (1355,770)->(2040,905)
  const kb = [[1420, 680], [2046, 736], [2040, 905], [1355, 770]];
  const NW = 24;
  P.fill(poly(kb), linear(0, 680, 0, 905, [[0, 0.84], [1, 0.95]]), 0.9, { spacing: 0.15, style: 2 });
  for (let i = 1; i < NW; i++) { const f = i / NW; seg(o, qpt(kb, f, 0.02), qpt(kb, f, 1), 1.6, "rgba(20,18,18,0.85)"); }
  const pat = [1, 1, 0, 1, 1, 1, 0];
  for (let i = 0; i < NW - 1; i++) {
    if (!pat[(i + 2) % 7]) continue;
    const f = (i + 1) / NW, w = 0.28 / NW;
    const q = [qpt(kb, f - w, 0.0), qpt(kb, f + w, 0.0), qpt(kb, f + w, 0.6), qpt(kb, f - w, 0.6)];
    P.fill(poly(q), 0.03, 0.9, { style: 2 });
    o.fillStyle = "#0a0a0a"; o.beginPath(); poly(q)(o); o.fill();
    seg(o, mix(q[0], q[3], 0.1), mix(q[0], q[3], 0.9), 1.6, "rgba(242,240,234,0.55)");
    seg(o, mix(q[3], q[2], 0.2), mix(q[3], q[2], 0.8), 1.4, "rgba(242,240,234,0.5)");
  }
  // black front rail under the keys (≈ 25 px), a thin bright lip line
  P.fill(poly([[1355, 770], [2040, 905], [2040, 934], [1360, 800]]), 0.02, 0.19, { style: 2 });
  line(o, [[1355, 772], [2040, 906]], 1.6, W2);
  line(o, [[1362, 804], [2040, 936]], 1.4, "rgba(236,234,228,0.35)");
  // right module: part of the chassis, its face a mid-grey panel; fader caps, two rows of buttons, 4 knobs
  P.fill(poly([[2050, 640], [2240, 650], [2240, 990], [2044, 936]]), linear(2050, 0, 2240, 0, [[0, 0.42], [1, 0.34]]), 1.5, { spacing: 0.2, style: 2 });
  grain(o, [[2050, 640], [2240, 650], [2240, 990], [2044, 936]], 16, { color: DARK, w: 1.6, seed: 95, alpha: 0.5 });
  line(o, [[2046, 630], [2040, 936]], 1.6, W2);
  for (let i = 0; i < 4; i++) { const x = 2084 + i * 34, y = 656 + i * 2; o.fillStyle = "rgba(236,234,228,0.8)"; o.beginPath(); o.roundRect(x - 3, y - 8, 6, 15, 2); o.fill(); }
  for (const [x, y] of [[2092, 700], [2160, 705], [2092, 728], [2160, 733]]) { o.fillStyle = "#070707"; o.beginPath(); o.roundRect(x - 18, y - 7, 36, 14, 7); o.fill(); o.strokeStyle = W1; o.lineWidth = 1.5; o.stroke(); }
  for (const [x, y] of [[2105, 785], [2178, 798], [2106, 858], [2180, 872]]) {
    o.fillStyle = "#050505"; o.beginPath(); o.ellipse(x, y, 21, 25, 0, 0, TAU); o.fill();
    o.strokeStyle = "rgba(236,234,228,0.5)"; o.lineWidth = 1.4; o.stroke();
    o.fillStyle = "rgb(150,148,144)"; o.beginPath(); o.ellipse(x - 3, y - 9, 16, 11, 0, 0, TAU); o.fill();
    o.strokeStyle = DARK; o.lineWidth = 1.6; o.stroke();
    seg(o, [x - 11, y - 13], [x - 2, y - 5], 1.8, "rgba(242,240,234,0.9)");
  }
}

function floorCables(P) {
  // a thick coiled cable on the floor under the synth (6–8 px tube, white contour and a highlight)
  const o = P.o;
  const coil = (x, y, rx, ry, rot, w, a0 = 0, a1 = TAU) => {
    const pts = []; for (let i = 0; i <= 28; i++) { const a = a0 + (a1 - a0) * i / 28; pts.push([x + Math.cos(a) * rx * Math.cos(rot) - Math.sin(a) * ry * Math.sin(rot), y + Math.cos(a) * rx * Math.sin(rot) + Math.sin(a) * ry * Math.cos(rot)]); }
    const q = sampleCurve(pts, 3);
    taper(o, q, w + 3.4, "rgba(236,234,228,0.85)"); taper(o, q, w, "#0c0c0c");
    taper(o, q.map(([px, py]) => [px, py - w * 0.25]), Math.max(1, w * 0.2), "rgba(236,234,228,0.7)");
  };
  coil(1440, 896, 70, 22, -0.08, 7); coil(1500, 892, 76, 24, -0.12, 7.5); coil(1470, 900, 60, 18, -0.1, 6);
  line(o, [[1545, 880], [1600, 866], [1660, 860]], 6, "#0c0c0c"); line(o, [[1545, 877], [1600, 863], [1660, 857]], 1.4, "rgba(236,234,228,0.7)");
}

export const SYNTH_CLIP = [[1441, 578], [2240, 628], [2240, 990], [1358, 826], [1331, 760]];
export function paintSynth(P) { synth(P); }

export function paintRoom(P) {
  guitarCase(P);
  speaker(P);
  rack(P);
  plant(P);

  crate(P);
  cables(P);
  sign(P);
  cartons(P);
  stand(P);
  table(P);
  floorCables(P);
}
