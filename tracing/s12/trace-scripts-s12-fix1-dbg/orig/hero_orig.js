// The s12 hero owl, drawn in FRAME PIXELS from measured control points (./geo.js).
// Three drawings share one geometry:
//   stare  (33.60–35.20)  the held hero frame
//   glare  (35.20–35.28)  head + headphones rolled -2.63° and moved (ECC fit on the source), lids lowered 11–21 px,
//                         chest/body pulled down with it (measured patch shifts, interpolated)
//   closed (35.28–35.36)  head rolled -5.15° and moved further, eyes shut as heavy curved strokes, beak parted
// The ink work is measured, not invented: the feather strokes (./strokes.js), the tail and talon outlines and the
// headphone cushion/shell lines (./parts.js) are centre-lines and contours traced from the source frame at 34.0 s
// (scripts in ./trace/) and redrawn here with the kit's taper engine; the value study, grain, mesh, eyes, beak,
// plaster and headphone shapes are drawn from the control points in ./geo.js.
// Everything is seeded and static (no boiling). Built once per drawing, then blitted.
import { ink, flick, plumage, softShade, walk, area, LINE, gv, setPPU, V } from "../src/lib/owlInk.js";
import { smoothPath, sampleCurve } from "../src/lib/paths.js";
import { taper } from "../src/lib/ink.js";
import { rng, clamp } from "../src/lib/rng.js";
import { GEO } from "../src/shots/s12/geo.js";
import { STROKES } from "../src/shots/s12/strokes.js";
import { TAIL_RINGS, FEET_L_RINGS, FEET_R_RINGS, TAIL_LINES, FEET_LINES, CUSH_LINES, SHELL_DARK, SHELL_BRIGHT } from "../src/shots/s12/parts.js";

// PROC: the older procedural feather strokes (kept for reference / A-B checks). The traced ink strokes
// (./strokes.js, measured centre-lines) replace them.
const PROC = false;

const TAU = Math.PI * 2;
export const BOX = [640, 0, 1960, 946];   // the layer canvas covers this frame rect
const LIGHT = [-0.86, -0.5];              // toward the light (upper left)

// ---------------------------------------------------------------- pose rigs (measured on the source)
// head: rigid rotation about c, then translation d (ECC Euclidean fit of the head + headphones, cc 0.975–0.998).
// warp: body displacement samples [x, y, dx, dy] (template-matched patches), inverse-distance interpolated.
const HEAD_PTS = [[850, 590], [960, 575], [1100, 520], [1250, 460]];
function headMap(h) {
  if (!h) return (p) => p;
  const c = Math.cos(h.rot), s = Math.sin(h.rot);
  return ([x, y]) => { const dx = x - h.c[0], dy = y - h.c[1]; return [h.c[0] + h.d[0] + dx * c - dy * s, h.c[1] + h.d[1] + dx * s + dy * c]; };
}
function makeRig(h, samples) {
  const hm = headMap(h);
  const S = samples ? [...samples, ...HEAD_PTS.map((p) => { const q = hm(p); return [p[0], p[1], q[0] - p[0], q[1] - p[1]]; })] : null;
  const warp = S ? ([x, y]) => {
    let sw = 0, sx = 0, sy = 0;
    for (const [px, py, dx, dy] of S) { const d2 = (x - px) ** 2 + (y - py) ** 2 + 400; const w = 1 / (d2 * d2); sw += w; sx += w * dx; sy += w * dy; }
    return [x + sx / sw, y + sy / sw];
  } : (p) => p;
  return { head: h, hm, warp };
}
export const RIGS = {
  stare: makeRig(null, null),
  glare: makeRig({ c: [1000, 350], rot: -0.0459, d: [-12.9, 27.6] }, [[1100, 750, -7, 14], [1470, 440, -4, 12], [1450, 600, -9, 6], [1650, 700, -4, 3], [1820, 785, -1, 0], [1125, 892, 0, 6], [1360, 925, 2, 1], [1560, 860, -2, 2]]),
  closed: makeRig({ c: [1000, 350], rot: -0.0899, d: [-22.5, 55.6] }, [[1100, 750, -13, 30], [1470, 440, -2, 26], [1450, 600, -16, 13], [1650, 700, -9, 6], [1820, 785, -6, 0], [1125, 892, 3, 10], [1360, 925, 5, 1], [1560, 860, -4, 3]]),
};

// ---------------------------------------------------------------- small helpers
const W = (rig, pts) => pts.map(rig.warp);
const blob = (pts) => (c) => smoothPath(c, pts, true);
function fillPts(g, pts, col) { g.fillStyle = col; g.beginPath(); smoothPath(g, pts, true); g.fill(); }
function polyPath(c, pts) { c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.closePath(); }
// a line through control points whose width follows a profile w(u)
function line(g, pts, wf, col, per = 8) { taper(g, sampleCurve(pts, per), wf, col); }
const swell = (w, a = 0.15, b = 0.5) => (u) => w * (a + (1 - a) * Math.pow(Math.sin(Math.PI * clamp(u)), b));
// offset a polyline sideways by k px (a family of parallel strokes)
function offsetPts(pts, k) {
  return pts.map((p, i) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)]; const n = V.perp(V.nrm(V.sub(b, a))); return [p[0] + n[0] * k, p[1] + n[1] * k]; });
}
// a feathery family of fine strokes along a curve: n strokes, each a partial run of the curve offset sideways
function strokeFamily(g, pts, { n = 8, spread = 6, w = 1.6, col = gv(0.4, 0.8), seed = 1, minL = 0.35, per = 10 } = {}) {
  const r = rng(seed), q = sampleCurve(pts, per);
  for (let i = 0; i < n; i++) {
    const off = (r() - 0.5) * 2 * spread;
    const a = Math.floor(r() * (1 - minL) * q.length), L = Math.max(4, Math.floor((minL + r() * (1 - minL)) * q.length));
    const seg = offsetPts(q.slice(a, Math.min(q.length, a + L)), off);
    if (seg.length < 2) continue;
    taper(g, seg, swell(w * (0.6 + 0.7 * r()), 0.05, 0.7), col);
  }
}
// scattered feather flicks inside a clip: dir(p) -> unit direction
function flicks(g, clipPts, n, box, dirFn, { len = [14, 34], w = [0.8, 1.6], col = gv(0.42, 0.55), seed = 7, keep = null } = {}) {
  const r = rng(seed);
  g.save(); if (clipPts) { g.beginPath(); smoothPath(g, clipPts, true); g.clip(); }
  for (let i = 0; i < n; i++) {
    const p = [box[0] + r() * (box[2] - box[0]), box[1] + r() * (box[3] - box[1])];
    if (keep && !keep(p, r)) continue;
    const d = dirFn(p, r), L = len[0] + r() * (len[1] - len[0]);
    flick(g, p, d, L, w[0] + r() * (w[1] - w[0]), col, (r() - 0.5) * 0.3);
  }
  g.restore();
}


// procedural print halftone: a 45° lattice of dark dots on a light ground whose size follows val(x, y)
// (0 = black .. 1 = white), clipped to a path. Frame px.
function halftoneDots(g, pathFn, box, val, { bg = 0.9, ink: dk = 0.08, pitch = 6 } = {}) {
  g.save(); g.beginPath(); pathFn(g); g.clip();
  g.fillStyle = gv(bg); g.fillRect(box[0], box[1], box[2] - box[0], box[3] - box[1]);
  g.fillStyle = gv(dk);
  const cell = pitch * pitch / 2;
  for (let y = Math.floor(box[1] / pitch) * pitch; y < box[3] + pitch; y += pitch / 2) {
    const odd = Math.round(y / (pitch / 2)) % 2;
    for (let x = Math.floor(box[0] / pitch) * pitch + (odd ? pitch / 2 : 0); x < box[2] + pitch; x += pitch) {
      const v = clamp(val(x, y)), cov = clamp((bg - v) / (bg - dk));
      const rad = Math.min(pitch * 0.62, Math.sqrt(cov * cell / Math.PI));
      if (rad > 0.25) { g.beginPath(); g.arc(x, y, rad, 0, TAU); g.fill(); }
    }
  }
  g.restore();
}

// owlInk's screentone with a keep-out mask (mask alpha > 0 = leave alone)
// grain: a seeded 128² noise tile, softened, unit variance (the source's paper speckle, ~2 px clumps)
let GRAIN = null;
function grainTile() {
  if (GRAIN) return GRAIN;
  const N = 128, r = rng(907), a = new Float32Array(N * N);
  for (let i = 0; i < N * N; i++) a[i] = r() - 0.5;
  // two scales: ~2 px speckle and ~5 px blotches (the source's paper grain / sponge mottle)
  const box = (src, rad) => { const o = new Float32Array(N * N); for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { let s = 0, c = 0; for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) { s += src[((y + dy + N) % N) * N + ((x + dx + N) % N)]; c++; } o[y * N + x] = s / c; } return o; };
  const norm = (b) => { let v = 0; for (let i = 0; i < N * N; i++) v += b[i] * b[i]; v = Math.sqrt(v / (N * N)); for (let i = 0; i < N * N; i++) b[i] /= v; return b; };
  const fine = norm(box(a, 1)), blob = norm(box(box(a, 2), 2));
  const out = new Float32Array(N * N);
  for (let i = 0; i < N * N; i++) out[i] = 0.62 * fine[i] + 0.78 * Math.max(-0.6, blob[i]);   // blotches skew bright
  return (GRAIN = norm(out));
}
function toneMasked(canvas, mask, { pitch = 4.2, amp = 0.2, white = 0.93, range = 0.3, grain = 0, cross = 1 } = {}) {
  const g = canvas.getContext("2d"), w = canvas.width, h = canvas.height;
  const img = g.getImageData(0, 0, w, h), d = img.data, m = mask.getContext("2d").getImageData(0, 0, w, h).data;
  const k = 1 / (pitch * Math.SQRT2), G = grainTile();
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const o = (j * w + i) * 4;
    if (d[o + 3] < 8) continue;
    let L = d[o] / 255;
    if (grain && L > 0.5) { L = clamp(L + grain * G[(j & 127) * 128 + (i & 127)] * Math.min(1, (L - 0.5) / 0.25)); d[o] = d[o + 1] = d[o + 2] = L * 255; }
    if (m[o + 3] > 60) continue;
    if (L > white || L < 0.22) continue;
    const t = Math.min(1, (white - L) / range) * Math.min(1, (L - 0.22) / 0.2);
    const fa = Math.abs(((i + j) * k) % 1 - 0.5) * 2, fb = Math.abs(((i - j + 8192) * k) % 1 - 0.5) * 2;
    const mm = Math.max(cross * (1 - Math.min(1, fa * 2.6)), 1 - Math.min(1, fb * 2.6));
    const v = Math.max(0, Math.min(255, (L - amp * t * (mm - 0.3)) * 255));
    d[o] = d[o + 1] = d[o + 2] = v;
  }
  g.putImageData(img, 0, 0);
}
// measured toe geometry (source 34.0 s, 4× crops)
const TOES_L = [
  { pad: [[1070, 872], [1078, 860], [1094, 856], [1108, 860], [1104, 874], [1094, 882], [1080, 884]], u: [[1071, 884], [1080, 873], [1092, 876], [1097, 886]], claw: [[1071, 884], [1064, 897], [1072, 908], [1082, 895], [1097, 886]] },
  { pad: [[1098, 874], [1106, 862], [1124, 860], [1142, 866], [1140, 884], [1126, 896], [1106, 896]], u: [[1098, 897], [1106, 887], [1118, 889], [1122, 899]], claw: [[1098, 897], [1092, 912], [1099, 926], [1109, 909], [1122, 899]] },
  { pad: [[1134, 884], [1144, 870], [1164, 868], [1186, 876], [1186, 894], [1166, 906], [1140, 906]], u: [[1133, 905], [1141, 896], [1152, 898], [1156, 908]], claw: [[1133, 905], [1128, 921], [1134, 934], [1144, 918], [1156, 908]] },
];
const FOOT_R = [[1283, 950], [1282, 926], [1290, 911], [1305, 904], [1325, 902], [1345, 898], [1370, 895], [1395, 897], [1418, 901], [1434, 907], [1440, 926], [1438, 950]];


// ---------------------------------------------------------------- measured ink strokes (./strokes.js)
function inPoly(p, poly) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]) c = !c;
  }
  return c;
}
const parseStrokes = (list) => list.map((s) => { const pts = [], w = [], v = []; for (let i = 0; i < s.length; i += 4) { pts.push([s[i], s[i + 1]]); w.push(s[i + 2]); v.push(s[i + 3]); } return { pts, w, v }; });
// rings (outer + holes) as one even-odd path
const ringsPath = (rings, map) => (c) => { for (const r of rings) { const q = map ? r.map(map) : r; c.moveTo(q[0][0], q[0][1]); for (let i = 1; i < q.length; i++) c.lineTo(q[i][0], q[i][1]); c.closePath(); } };
let SPLIT = null;
function strokeSets() {
  if (SPLIT) return SPLIT;
  const head = [], body = [], headPolys = [GEO.head, GEO.tuftL, ...GEO.tuftR];
  for (const s of STROKES) {
    const pts = [], w = [], v = [];
    for (let i = 0; i < s.length; i += 4) { pts.push([s[i], s[i + 1]]); w.push(s[i + 2]); v.push(s[i + 3]); }
    const mid = pts[Math.floor(pts.length / 2)];
    (headPolys.some((P) => inPoly(mid, P)) ? head : body).push({ pts, w, v });
  }
  return (SPLIT = { head, body });
}
// Each stroke is drawn in one tone (its darkest measured value); the width at each point is scaled so the ink mass
// (width x darkness) matches the measurement, so the pale ends of a stroke come out as a natural taper.
const INK_CAL = { w: 1.0, wMin: 0.7, dv: -0.02, end: 4 };
function drawStrokes(g, set, map) {
  for (const st of set) {
    const pts = map ? st.pts.map(map) : st.pts, n = pts.length;
    if (n < 2) continue;
    let vm = 1; for (const v of st.v) vm = Math.min(vm, v);
    const vd = clamp(vm + INK_CAL.dv), wm = st.w.map((w, i) => w * (1 - st.v[i]) / Math.max(0.05, 1 - vd));
    const per = 4, q = sampleCurve(pts, per);
    const S = [0]; for (let i = 1; i < q.length; i++) S.push(S[i - 1] + Math.hypot(q[i][0] - q[i - 1][0], q[i][1] - q[i - 1][1]));
    const L = S[S.length - 1];
    const wAt = (i) => { const f = i / per, a = Math.min(n - 1, Math.floor(f)), b = Math.min(n - 1, a + 1), t = f - a; return wm[a] + (wm[b] - wm[a]) * t; };
    taper(g, q, (u) => {
      const i = Math.round(u * (q.length - 1)), s = S[i];
      const e = Math.min(1, s / INK_CAL.end, (L - s) / INK_CAL.end);
      return Math.max(INK_CAL.wMin, wAt(i) * INK_CAL.w) * (0.35 + 0.65 * Math.sqrt(Math.max(0, e)));
    }, gv(vd));
  }
}

// pale strokes on a dark ground (headphone cushion / metal highlights): drawn in their brightest measured value
function drawBright(g, set, gain = 1, minLen = 0) {
  for (const st of set) {
    const n = st.pts.length; if (n < 2) continue;
    let L = 0; for (let i = 1; i < n; i++) L += Math.hypot(st.pts[i][0] - st.pts[i - 1][0], st.pts[i][1] - st.pts[i - 1][1]);
    if (L < minLen) continue;
    let vm = 0; for (const v of st.v) vm = Math.max(vm, v);
    const q = sampleCurve(st.pts, 4);
    taper(g, q, (u) => { const f = u * (n - 1), a = Math.min(n - 1, Math.floor(f)); return Math.max(0.7, st.w[a] * 0.9) * (0.35 + 0.65 * Math.sqrt(Math.min(1, u * 6, (1 - u) * 6))); }, gv(clamp(vm * gain)));
  }
}
// ---------------------------------------------------------------- parts
// far side of the headband (behind the head): two knurled slider blocks leaning ~30°, the band rising above them
function farBand(g, state) {
  const F = GEO.farBand;
  // band continuing up out of frame (seen in the pops, when the head drops)
  const up = [[846, 14], [870, -26], [905, -64], [950, -100], [1000, -124]];
  line(g, up, () => 13, gv(0.1));
  line(g, up.map(([x, y]) => [x - 4, y]), () => 3.2, gv(0.78, 0.9));
  line(g, up.map(([x, y]) => [x + 6, y]), () => 2, LINE);
  // two knurled slider blocks leaning ~30°: rows of short slanted white dashes, a pale end face on the left
  for (const [key, rows, pale] of [["top", [27, 35, 43, 51], [[832, 10], [846, 17], [824, 55], [810, 48]]], ["low", [67, 75, 83, 91], [[812, 61], [821, 63], [811, 87], [803, 84]]]]) {
    const q = F[key];
    g.fillStyle = gv(0.06); g.beginPath(); polyPath(g, q); g.fill();
    g.save(); g.beginPath(); polyPath(g, q); g.clip();
    g.strokeStyle = gv(0.9, 0.95); g.lineCap = "round";
    const r = rng(key === "top" ? 5 : 6);
    for (const y of rows) for (let x = 800 + (y - 10) * -0.25; x < 900; x += 6.8 + r() * 0.8) {
      g.lineWidth = 1.9 + r() * 0.7;
      g.beginPath(); g.moveTo(x, y + 2.6); g.lineTo(x + 2.4, y - 2.6); g.stroke();
    }
    g.restore();
    g.fillStyle = gv(0.84); g.beginPath(); polyPath(g, pale); g.fill();
    g.strokeStyle = LINE; g.lineWidth = 1.6; g.beginPath(); polyPath(g, q); g.stroke();
    g.beginPath(); polyPath(g, pale); g.stroke();
  }
}

function tail(g, rig) {
  if (PROC) return tailOld(g, rig);
  // three long pale feathers (measured outline: the dark gaps between them are notches in the silhouette)
  const path = ringsPath(TAIL_RINGS, rig.warp);
  g.save(); g.beginPath(); path(g); g.clip();
  g.fillStyle = gv(0.76); g.fillRect(1600, 650, 400, 260);
  g.filter = "blur(10px)";
  g.fillStyle = gv(0.9); g.beginPath(); smoothPath(g, W(rig, [[1760, 735], [1840, 772], [1935, 830], [1900, 840], [1800, 800], [1750, 790]]), true); g.fill();
  g.fillStyle = gv(0.88); g.beginPath(); smoothPath(g, W(rig, [[1745, 800], [1850, 838], [1905, 846], [1860, 846], [1750, 812]]), true); g.fill();
  g.filter = "none";
  g.restore();
  drawStrokes(g, parseStrokes(TAIL_LINES), rig.head ? rig.warp : null);
}
function tailOld(g, rig) {
  const T = W(rig, GEO.tail);
  plumage(g, blob(T), { base: 0.74, shade: 0.55, light: LIGHT, depth: 14, blur: 8 });
  if (!PROC) return;
  g.save(); g.beginPath(); smoothPath(g, T, true); g.clip();
  const r = rng(91);
  // many fine feather lines running to the tip
  for (let i = 0; i < 14; i++) {
    const f = r(), a = V.mix([1725, 745], [1712, 800], f), b = V.mix([1930, 834], [1860, 846], f);
    taper(g, sampleCurve([a, V.add(V.mix(a, b, 0.5), [0, 3]), b], 8), swell(0.8 + r() * 1.4, 0.05, 0.6), gv(0.2 + r() * 0.3, 0.6));
  }
  g.restore();
  // feather strips: dark separations running to the tip, a pale inner line on each strip
  for (const L of GEO.tailLines) { const q = W(rig, L); line(g, q, swell(3.4, 0.1, 0.6), gv(0.08, 0.92)); line(g, offsetPts(q, -7), swell(1.6, 0.1), gv(0.95, 0.6)); }
  line(g, W(rig, [[1705, 802], [1790, 826], [1861, 846]]), swell(2.6, 0.2), LINE);
  line(g, W(rig, [[1760, 731], [1850, 780], [1937, 832]]), swell(1.6, 0.2), gv(0.25, 0.7));
}

// talons: plump pale toes with scale ticks, hooked claws (pale horn, dark keyline, dark tips)
function feet(g, rig) {
  if (PROC) return feetOld(g, rig);
  // talons, measured: pale toes and hooked claws (the dark nail beds and gaps are holes in the outline)
  for (const [rings, sh] of [[FEET_L_RINGS, [[1150, 905], [1105, 900], [1075, 900]]], [FEET_R_RINGS, [[1330, 940], [1390, 940], [1430, 930]]]]) {
    const path = ringsPath(rings, rig.warp);
    g.save(); g.beginPath(); path(g); g.clip("evenodd");
    g.fillStyle = gv(0.88); g.fillRect(1040, 840, 440, 110);
    g.filter = "blur(7px)";
    for (const [x, y] of sh) { const q = rig.warp([x, y]); g.fillStyle = gv(0.66, 0.4); g.beginPath(); g.ellipse(q[0], q[1], 18, 12, 0, 0, TAU); g.fill(); }
    g.filter = "none";
    g.restore();
  }
  drawStrokes(g, parseStrokes(FEET_LINES), rig.head ? rig.warp : null);
}
function feetOld(g, rig) {
  const r = rng(71);
  const Wr = (pts) => W(rig, pts);
  // far (left) foot: plump pale toe pads curled over the perch; from under each tip a pale hooked claw with a dark
  // U-shaped nail bed and a dark keyline down its outer edge (measured on the source at 4x)
  for (const t of TOES_L) {
    const pad = Wr(t.pad), claw = Wr(t.claw), u = Wr(t.u);
    fillPts(g, claw, gv(0.82));
    g.save(); g.beginPath(); smoothPath(g, claw, true); g.clip(); line(g, [V.mix(claw[0], claw[4], 0.5), claw[3], claw[2]], swell(2.2, 0.2), gv(0.97, 0.8)); g.restore();
    line(g, [claw[0], claw[1], claw[2]], swell(3, 0.25, 0.5), LINE);
    line(g, [claw[2], claw[3], claw[4]], swell(1.6, 0.2), gv(0.2, 0.8));
    g.strokeStyle = gv(0.1); g.lineWidth = 3; g.beginPath(); smoothPath(g, pad, true); g.stroke();
    fillPts(g, pad, gv(0.9));
    g.save(); g.beginPath(); smoothPath(g, pad, true); g.clip(); g.filter = "blur(4px)"; g.fillStyle = gv(0.62, 0.7); g.beginPath(); smoothPath(g, pad.map(([x, y]) => [x + 6, y + 8]), true); g.fill(); g.filter = "none"; g.restore();
    line(g, u, swell(3.2, 0.3, 0.5), LINE);
    for (let k = 0; k < 2; k++) { const a = V.mix(pad[1], pad[5], 0.3 + 0.3 * k), b = V.mix(pad[2], pad[4], 0.3 + 0.3 * k); line(g, [a, V.add(V.mix(a, b, 0.5), [2, 3]), b], swell(1.3, 0.1), gv(0.35, 0.6)); }
  }
  // near (right) foot: one pale mass of big rounded toes running off the bottom of frame, dark creases between
  const foot = Wr(FOOT_R);
  g.strokeStyle = gv(0.08); g.lineWidth = 4; g.beginPath(); smoothPath(g, foot, true); g.stroke();
  fillPts(g, foot, gv(0.88));
  g.save(); g.beginPath(); smoothPath(g, foot, true); g.clip();
  g.filter = "blur(6px)";
  for (const [x, y] of [[1318, 940], [1378, 945], [1428, 930], [1430, 945]]) { g.fillStyle = gv(0.5, 0.65); g.beginPath(); const q = rig.warp([x, y]); g.ellipse(q[0], q[1], 16, 20, 0, 0, TAU); g.fill(); }
  g.filter = "none";
  line(g, Wr([[1334, 900], [1328, 920], [1318, 950]]), swell(3.4, 0.3, 0.5), LINE);
  line(g, Wr([[1396, 896], [1388, 918], [1384, 950]]), swell(3.4, 0.3, 0.5), LINE);
  for (const s of [[[1287, 930], [1298, 921], [1312, 925]], [[1334, 932], [1346, 922], [1360, 927]], [[1402, 931], [1414, 922], [1428, 927]], [[1295, 944], [1306, 938]], [[1350, 945], [1366, 940]], [[1412, 945], [1428, 940]]]) line(g, Wr(s), swell(2.2, 0.2), gv(0.12, 0.85));
  for (let i = 0; i < 10; i++) { const p = rig.warp([1290 + r() * 150, 905 + r() * 12]); flick(g, p, V.nrm([0.2, 1]), 8 + r() * 8, 1.2, gv(0.4, 0.5), 0.1); }
  g.restore();
}

// value study of the body + head (+ tufts, ruff) as one soft white mass
function plumageMass(g, rig) {
  const cw = (p) => (area(p) > 0 ? p : p.slice().reverse());    // one winding for all, so the union fills
  const body = cw(W(rig, GEO.body)), head = cw(GEO.head.map(rig.hm)), tl = cw(GEO.tuftL.map(rig.hm)), tr = GEO.tuftR.map((t) => cw(t.map(rig.hm)));
  const union = (c) => { smoothPath(c, body, true); smoothPath(c, head, true); smoothPath(c, tl, true); for (const t of tr) smoothPath(c, t, true); };
  plumage(g, union, { base: 0.975, shade: 0.84, light: LIGHT, depth: 46, blur: 22 });
  // belly turning away from the light: a toned band along the underside, strongest toward the tail
  softShade(g, union, (c) => { smoothPath(c, W(rig, [[1030, 850], [1150, 915], [1350, 945], [1560, 910], [1700, 850], [1600, 810], [1380, 870], [1200, 870], [1080, 820]]), true); }, 0.62, 0.45, 22);
  softShade(g, union, (c) => { smoothPath(c, W(rig, [[1450, 760], [1600, 720], [1740, 760], [1640, 840], [1480, 860]]), true); }, 0.5, 0.2, 26);
  // the side of the face next to the headphone cushion, in shadow (the mesh picks this up)
  softShade(g, union, (c) => { smoothPath(c, [[1170, 130], [1250, 150], [1262, 250], [1230, 290], [1180, 250]].map(rig.hm), true); }, 0.7, 0.5, 16);
  softShade(g, union, (c) => { smoothPath(c, [[1200, 150], [1250, 170], [1262, 300], [1250, 430], [1225, 470], [1192, 400], [1188, 240]].map(rig.hm), true); }, 0.7, 0.55, 14);
  // the lower cheek beside the beak and the far side of the face turn grey (the mesh picks it up)
  softShade(g, union, (c) => { const q = rig.hm([952, 516]); c.ellipse(q[0], q[1], 30, 26, 0.4, 0, TAU); }, 0.72, 0.6, 12);
  // soft grey round the eye sockets (the inner facial disc)
  if (PROC) for (const e of [GEO.eyeR, GEO.eyeL]) softShade(g, union, (c) => { const q = rig.hm([e.ring[0], e.ring[1] + 4]); c.ellipse(q[0], q[1], e.ring[2] + 26, e.ring[3] + 24, 0, 0, TAU); }, 0.8, 0.45, 12);
  // the cup's shadow on the shoulder, under its lower right
  softShade(g, union, (c) => { const q = rig.hm([1418, 404]); c.ellipse(q[0], q[1], 44, 22, 0.3, 0, TAU); }, 0.3, 0.55, 12);
  return { body, head, tl, tr, union };
}

// the folded wing: mid-grey plumage, scalloped covert rows, primaries running to the tip, feathered back edge
function wing(g, rig) {
  const Wp = W(rig, GEO.wing), path = blob(Wp);
  plumage(g, path, { base: 0.915, shade: 0.78, light: LIGHT, depth: 70, blur: 34 });
  // tone falls off toward the lower half and the tip
  softShade(g, path, (c) => smoothPath(c, W(rig, [[1330, 680], [1450, 720], [1600, 740], [1760, 770], [1600, 800], [1420, 770], [1320, 710]]), true), 0.7, 0.35, 26);
  softShade(g, path, (c) => smoothPath(c, W(rig, [[1560, 600], [1700, 680], [1760, 760], [1650, 760], [1540, 680]]), true), 0.7, 0.45, 24);
  softShade(g, path, (c) => smoothPath(c, W(rig, [[1420, 735], [1500, 748], [1600, 772], [1700, 780], [1600, 800], [1480, 775]]), true), 0.55, 0.5, 12);
  if (!PROC) {
    // the heavy lower edge of the folded wing (too wide for the stroke tracer): centre line and width measured per
    // 20 px column on the source (darkest run below the coverts)
    const HX = [1318, 1330, 1350, 1370, 1390, 1410, 1430, 1450, 1470, 1490, 1510, 1530, 1550, 1570, 1590, 1610, 1630, 1650, 1670, 1690, 1710, 1730];
    const HY = [668, 679, 695, 709, 721, 729, 736, 740, 744, 745, 750, 759, 766, 772, 777, 781, 784, 786, 785, 785, 780, 779];
    const HW = [1.2, 2.6, 3.2, 3.6, 4.2, 4.6, 5, 5.2, 5.6, 6.6, 7.2, 8.6, 9, 9, 7.4, 6.6, 6, 5.8, 5.4, 5, 4.2, 2];
    const q = W(rig, HX.map((x, i) => [x, HY[i]]));
    taper(g, q, (u) => { const f = u * (HW.length - 1), i = Math.min(HW.length - 2, Math.floor(f)); return HW[i] + (HW[i + 1] - HW[i]) * (f - i); }, gv(0.1));
    return;
  }
  g.save(); g.beginPath(); path(g); g.clip();
  const r = rng(301);
  // feather coordinates: u along the wing (shoulder -> tip), v across (lower edge 0 -> back edge 1)
  const rs = (pts, n) => { const q = sampleCurve(pts, 12), L = [0]; for (let i = 1; i < q.length; i++) L.push(L[i - 1] + V.len(V.sub(q[i], q[i - 1]))); const out = []; let j = 1; for (let i = 0; i <= n; i++) { const d = (i / n) * L[L.length - 1]; while (j < L.length - 1 && L[j] < d) j++; const f = (d - L[j - 1]) / (L[j] - L[j - 1] || 1); out.push(V.mix(q[j - 1], q[j], f)); } return out; };
  const N = 120, LO = rs(W(rig, [[1253, 490], [1262, 560], [1285, 618], [1312, 662], [1350, 700], [1392, 726], [1440, 742], [1492, 748], [1540, 768], [1600, 786], [1660, 792], [1720, 786], [1760, 770]]), N);
  const BK = rs(W(rig, [[1250, 440], [1300, 421], [1360, 404], [1406, 396], [1460, 414], [1507, 437], [1568, 485], [1617, 541], [1658, 608], [1696, 647], [1729, 694], [1752, 735], [1760, 770]]), N);
  const P = (u, v) => { const i = Math.max(0, Math.min(N, u * N)), i0 = Math.floor(Math.min(N - 1, i)), f = i - i0; return V.mix(V.mix(LO[i0], BK[i0], v), V.mix(LO[i0 + 1], BK[i0 + 1], v), f); };
  const run = (u0, u1, v0, v1, n = 14, hook = 0) => { const q = []; for (let i = 0; i <= n; i++) { const t = i / n; q.push(P(u0 + (u1 - u0) * t, v0 + (v1 - v0) * t)); } if (hook) { q.push(P(u1 + 0.004, v1 - hook)); q.push(P(u1 - 0.012, v1 - hook * 1.3)); } return q; };
  // back edge: long thin strokes parallel to the contour
  for (let i = 0; i < 16; i++) {
    const v = 0.9 + r() * 0.095, u0 = 0.3 + r() * 0.35, u1 = Math.min(1, u0 + 0.25 + r() * 0.4);
    taper(g, run(u0, u1, v, v - 0.015, 20), swell(0.8 + r() * 1.2, 0.05, 0.6), gv(0.2 + r() * 0.25, 0.5 + r() * 0.3));
  }
  // covert rows: overlapping long feathers whose lower edges end in a hook (scallops), fading toward the shoulder
  for (const [v, us, seed] of [[0.36, [0.42, 0.56, 0.7], 1], [0.5, [0.38, 0.52, 0.66, 0.8], 2], [0.63, [0.46, 0.6, 0.74], 3], [0.74, [0.55, 0.7, 0.84], 4]]) {
    for (const u0 of us) {
      const du = 0.13 + r() * 0.07, uu = u0 + (r() - 0.5) * 0.04;
      const q = run(uu, Math.min(0.97, uu + du), v + 0.05, v - 0.02, 12, 0.04);
      taper(g, sampleCurve(q, 3), swell(1.6 + r() * 0.9, 0.06, 0.55), gv(0.16 + r() * 0.16, 0.75));
      taper(g, run(uu + 0.01, Math.min(0.97, uu + du * 0.8), v + 0.08, v + 0.03, 10), swell(0.9, 0.05), gv(0.45, 0.4));
    }
  }
  // primaries: long dark strokes converging on the wing tip
  for (let i = 0; i < 6; i++) {
    const v = 0.04 + i * 0.045 + r() * 0.02, u0 = 0.52 + r() * 0.2;
    taper(g, run(u0, 0.995, v, v * 0.5, 22), swell(1.1 + r() * 1.3, 0.06, 0.5), gv(0.16 + r() * 0.2, 0.7));
  }
  // measured strokes (source 34.0 s): upper coverts, the long covert row with its hooks, the primaries
  const up = [[[1388, 552], [1418, 580], [1462, 589]], [[1470, 554], [1500, 571], [1522, 575]], [[1540, 530], [1566, 552], [1592, 560]]];
  for (const s of up) line(g, W(rig, s), swell(2.2, 0.1, 0.6), gv(0.22, 0.85));
  const mid = [
    [[1300, 602], [1370, 642], [1440, 675], [1520, 690], [1566, 697], [1570, 688]],
    [[1400, 620], [1462, 619], [1516, 646], [1571, 669], [1634, 674], [1639, 664]],
    [[1398, 674], [1448, 696], [1498, 710], [1516, 711], [1514, 702]],
  ];
  for (const s of mid) line(g, W(rig, s), swell(2.6, 0.08, 0.55), gv(0.12, 0.9));
  const prim = [
    [[1380, 719], [1471, 742], [1562, 760], [1653, 774], [1744, 776], [1776, 779]],
    [[1516, 728], [1607, 746], [1698, 760], [1753, 766]],
    [[1525, 696], [1607, 719], [1698, 742], [1753, 755]],
    [[1585, 651], [1653, 678], [1721, 710], [1757, 742]],
    [[1634, 605], [1675, 637], [1725, 678], [1757, 733]],
  ];
  prim.forEach((s, i) => line(g, W(rig, s), swell(i === 0 ? 3.4 : 2.4, 0.08, 0.5), gv(i === 0 ? 0.06 : 0.12, 0.9)));
  // fine barbs, following the feather direction (sparse; the mesh carries most of the tone)
  for (let i = 0; i < 60; i++) {
    const u = 0.25 + r() * 0.7, v = r(), p = P(u, v), d = V.nrm(V.sub(P(u + 0.02, v - 0.01), p));
    flick(g, p, d, 16 + r() * 24, 0.8 + r() * 0.5, gv(0.42, 0.35), 0.04);
  }
  g.restore();
  // lower edge: heavy ink with the notch where the secondaries end; soft grey front edge up to the shoulder
  line(g, W(rig, GEO.wingLow), (u) => 1.2 + 4.2 * Math.pow(clamp(u * 1.4), 1.2), LINE);
  line(g, W(rig, GEO.wingLow2), swell(4.4, 0.25, 0.6), LINE);
  line(g, W(rig, [[1470, 736], [1488, 744], [1500, 752], [1492, 745]]), () => 2.4, LINE);
  strokeFamily(g, W(rig, [[1250, 470], [1255, 520], [1266, 575], [1290, 632], [1318, 670]]), { n: 5, spread: 4, w: 1.6, col: gv(0.3, 0.7), seed: 311 });
  strokeFamily(g, W(rig, [[1300, 660], [1350, 704], [1420, 738], [1500, 752]]), { n: 6, spread: 7, w: 1.8, col: gv(0.25, 0.7), seed: 312 });
  // the shoulder and back contour: dense dark feather strokes running along the edge, fanning out under the cup
  const edge = W(rig, [[1250, 412], [1320, 408], [1400, 404], [1450, 418], [1500, 438], [1550, 466], [1600, 508], [1640, 560], [1680, 620]]);
  const rr = rng(321);
  walk(sampleCurve(edge, 10), 7, 322, (p, t, u, r2) => {
    const inn = [-t[1], t[0]];
    const d = V.nrm(V.add(t, V.mul(inn, 0.06 + r2() * 0.1)));
    flick(g, V.add(p, V.mul(inn, 3 + r2() * 10)), d, 45 + r2() * 60, 0.8 + r2() * 0.9, gv(0.2 + r2() * 0.25, 0.5 + r2() * 0.35), 0.04);
  });
  for (let i = 0; i < 16; i++) {
    const x = 1250 + rr() * 150, p = rig.warp([x, 408 + rr() * 8]), a = 1.25 + (x - 1320) * 0.004 + (rr() - 0.5) * 0.4;
    flick(g, p, [Math.cos(a), Math.sin(a)], 20 + rr() * 30, 1 + rr(), gv(0.2, 0.7), (rr() - 0.5) * 0.3);
  }
  // the wing tip notch over the tail
  line(g, W(rig, [[1748, 728], [1757, 745], [1760, 770], [1752, 778]]), swell(3, 0.2), LINE);
}

// feather texture on the body and the chest ruff
function bodyTexture(g, rig, M) {
  const body = M.body;
  // mottling: large soft blotches a few levels lighter/darker (the source's plumage is never a flat white)
  {
    const r = rng(411);
    g.save(); g.beginPath(); M.union(g); g.clip();
    g.filter = "blur(9px)";
    for (let i = 0; i < 170; i++) {
      const p = [700 + r() * 1100, 60 + r() * 850], dark = r() < 0.55;
      g.fillStyle = dark ? gv(0.74, 0.16 + r() * 0.16) : gv(1, 0.14 + r() * 0.14);
      g.beginPath(); g.ellipse(p[0], p[1], 10 + r() * 26, 6 + r() * 16, r() * 3, 0, TAU); g.fill();
    }
    g.filter = "none";
    g.restore();
  }
  // feather strokes running parallel to the belly's lower-left contour, 4–35 px inside it (the fluffy edge)
  const bel = W(rig, [[882, 612], [915, 642], [949, 695], [990, 746], [1038, 790], [1071, 821], [1125, 851], [1186, 878], [1250, 890]]);
  if (PROC) walk(sampleCurve(bel, 10), 8, 412, (p, t, u, r) => {
    const inn = [-t[1], t[0]];
    const q = V.add(p, V.mul(inn, -(2 + r() * 26)));
    flick(g, q, V.nrm(V.add(t, V.mul(inn, (r() - 0.6) * 0.2))), 36 + r() * 60, 0.9 + r() * 0.8, gv(0.34 + r() * 0.15, 0.5 + r() * 0.3), 0.05);
  });
  // feather tips breaking the silhouette: pale spikes pushed out past the edge, each with a grey keyline
  walk(sampleCurve(bel, 10), 19, 414, (p, t, u, r) => {
    const out = [-t[1], t[0]], d = V.nrm(V.add(V.mul(out, 0.45), V.mul(t, 0.9)));
    const L = 8 + r() * 14, w0 = 5 + r() * 5, b0 = V.sub(p, V.mul(t, w0)), tip = V.add(p, V.mul(d, L));
    g.fillStyle = gv(0.9); g.beginPath(); g.moveTo(b0[0], b0[1]); g.quadraticCurveTo(p[0] + d[0] * L * 0.4, p[1] + d[1] * L * 0.4, tip[0], tip[1]); g.lineTo(p[0] + t[0] * 2, p[1] + t[1] * 2); g.closePath(); g.fill();
    ink(g, [V.add(b0, V.mul(out, -3)), V.mix(b0, tip, 0.6), tip], 0.9, gv(0.4, 0.6), { end: 0.1 });
  });
  if (!PROC) return;
  // the chest just under the face: a band of short strokes hanging down
  for (let i = 0; i < 44; i++) { const r = rng(413 + i); const p = rig.warp([880 + r() * 300, 560 + r() * 55 - (r() * 300) * 0.08]); flick(g, p, V.nrm([0.35 + r() * 0.3, 1]), 14 + r() * 22, 0.9 + r() * 0.6, gv(0.45, 0.4 + r() * 0.2), 0.12); }
  // chest ruff: short feather strokes breaking the lower-left edge outward
  const ruff = W(rig, [[770, 558], [808, 582], [850, 600], [882, 612], [905, 632], [925, 660], [950, 700], [985, 745], [1030, 788], [1075, 822]]);
  walk(sampleCurve(ruff, 8), 8, 401, (p, t, u, r) => {
    const out = [t[1], -t[0]];      // outward (left/down of the walk)
    const d = V.nrm(V.add(V.mul(out, 0.3), V.mul(t, 0.95)));
    flick(g, V.add(p, V.mul(out, -(5 + r() * 6))), d, 14 + r() * 22, 1 + r() * 0.7, gv(0.45, 0.5), 0.1);
  });
  // lower belly contour breaks into feather tips (dark strokes pointing down-right)
  const low = W(rig, [[1040, 800], [1100, 840], [1170, 870], [1250, 886], [1330, 892], [1420, 893], [1500, 885], [1570, 862], [1640, 830]]);
  walk(sampleCurve(low, 8), 9, 402, (p, t, u, r) => {
    const d = V.nrm(V.add(t, [0.05, 0.3]));
    flick(g, V.add(p, [-(4 + r() * 12), -(8 + r() * 18)]), d, 26 + r() * 46, 1.1 + r() * 0.9, gv(0.22 + r() * 0.2, 0.7), 0.06);
  });
  // belly: small clusters of 2–3 short soft strokes, steep, following the curve of the body
  g.save(); g.beginPath(); smoothPath(g, body, true); g.clip();
  const r = rng(403);
  for (let i = 0; i < 70; i++) {
    const x = 930 + r() * 620, y = 600 + r() * 290;
    const p = rig.warp([x, y]);
    const depth = clamp((y - 600) / 290);
    if (r() > 0.25 + 0.75 * depth) continue;            // sparser high on the chest
    const a = 1.05 + (x - 1100) * -0.0006 + (r() - 0.5) * 0.35, d = [Math.cos(a), Math.sin(a)], n = V.perp(d);
    const k = 2 + Math.floor(r() * 2), L = 16 + r() * 26;
    for (let j = 0; j < k; j++) flick(g, V.add(V.add(p, V.mul(n, j * (4 + r() * 3))), V.mul(d, r() * 6)), d, L * (0.7 + 0.5 * r()), 0.9 + r() * 0.7, gv(0.42 + r() * 0.12, 0.5), 0.1);
  }
  g.restore();
}

// head texture: crown hatching, the shadow side by the cushion, rim flicks, the facial-disc M, cheek rows
function headTexture(g, M, state) {
  if (!PROC) return;
  const head = GEO.head;
  g.save(); g.beginPath(); smoothPath(g, head, true); smoothPath(g, GEO.tuftL, true); g.clip();
  const r = rng(501);
  // crown: dark feather strokes combing down-right toward the tuft
  for (let i = 0; i < 30; i++) {
    const x = 930 + r() * 240, y = 68 + (x - 940) * 0.08 + r() * 55;
    flick(g, [x, y], V.nrm([1, 0.35 + r() * 0.3]), 22 + r() * 40, 0.9 + r() * 0.9, gv(0.28, 0.45 + r() * 0.3), 0.08);
  }
  // shadow side by the cushion: dense vertical grey strokes
  for (let i = 0; i < 60; i++) {
    const y = 150 + r() * 320, x = 1196 + r() * 55 + (y - 300) * 0.05;
    flick(g, [x, y], V.nrm([0.35 + r() * 0.3, 1]), 14 + r() * 28, 0.8 + r() * 0.6, gv(0.34, 0.4), 0.1);
  }
  // crown fringe: dense fine dark strokes just inside the top contour, running along it (a feathered edge)
  walk(sampleCurve(head.slice(6, 13), 10), 5, 503, (p, t, u, rr) => {
    const inn = [-t[1], t[0]], d = V.nrm(V.add(t, V.mul(inn, 0.25 + rr() * 0.2)));
    flick(g, V.add(p, V.mul(inn, 2 + rr() * 9)), d, 14 + rr() * 22, 0.9 + rr() * 0.8, gv(0.25 + rr() * 0.2, 0.5 + rr() * 0.35), 0.06);
  });
  // left rim: short strokes combing along the contour
  walk(sampleCurve(head.slice(24).concat([head[0]]), 8), 11, 502, (p, t, u, rr) => {
    const inn = [-t[1], t[0]];
    flick(g, V.add(p, V.mul(inn, 2 + rr() * 8)), V.nrm(V.add(inn, V.mul(t, 0.9))), 14 + rr() * 22, 0.9 + rr() * 0.6, gv(0.4, 0.42), 0.1);
  });
  // soft grey feathering round each eye (the disc's inner rim), concentric with the eye ring
  if (state !== "closed") for (const [e, a0, a1, seed] of [[GEO.eyeR, 1.2, 3.55, 531], [GEO.eyeL, -0.2, 3.3, 532]]) {
    const [cx, cy, rx, ry] = e.ring;
    for (const k of (e === GEO.eyeL ? [8] : [9, 16])) {
      const q = []; for (let i = 0; i <= 16; i++) { const a = a0 + (a1 - a0) * i / 16; q.push([cx + (rx + k) * Math.cos(a), cy + (ry + k) * Math.sin(a)]); }
      strokeFamily(g, q, { n: 7, spread: 3, w: 1.6, col: gv(0.4, 0.55 - k * 0.01), seed: seed + k, minL: 0.2 });
    }
  }
  g.restore();
  // facial disc: the M of long fine grey strokes (brow arcs) meeting in a V above the beak, and the right rim
  GEO.disc.forEach((d, i) => strokeFamily(g, d, { n: 11, spread: 6.5, w: 1.7, col: gv(0.5, 0.55), seed: 520 + i, minL: 0.3 }));
  // cheek/lower disc rows
  // lower rim of the disc (the chin): soft hanging fur strokes along the arc, not a line
  walk(sampleCurve([[930, 470], [980, 498], [1040, 514], [1100, 516], [1160, 503], [1205, 478]], 10), 7, 541, (p, t, u, rr) => {
    const d = V.nrm(V.add(V.mul(t, 0.55), [0.1, 0.85]));
    flick(g, V.add(p, [0, (rr() - 0.5) * 8]), d, 12 + rr() * 20, 0.9 + rr() * 0.7, gv(0.42, 0.45 + rr() * 0.25), 0.15);
  });
  // left cheek fur along the contour, the brow V between the eyes
  const rows = [
    [[700, 440], [712, 490], [740, 530], [780, 560]],
    [[842, 268], [856, 294], [868, 318]], [[893, 262], [881, 292], [872, 318]],
  ];
  rows.forEach((d, i) => strokeFamily(g, d, { n: 7, spread: 5, w: 1.5, col: gv(0.42, 0.55), seed: 540 + i, minL: 0.3 }));
  // feathers over the top of the beak
  flicks(g, null, 16, [872, 440, 950, 470], (p, rr) => V.nrm([0.25 + rr() * 0.3, 1]), { len: [12, 26], w: [0.8, 1.3], col: gv(0.4, 0.6), seed: 551 });
}

// tuft feather strokes: dark undersides
function tuftStrokes(g) {
  const T = GEO.tuftR;
  const dark = [
    [[1240, 56], [1222, 72], [1198, 88], [1170, 100]], [[1236, 70], [1212, 90], [1186, 106]], [[1150, 86], [1128, 98], [1112, 112]],
    [[1243, 106], [1222, 118], [1196, 128], [1166, 138]], [[1236, 116], [1206, 132], [1180, 140]],
    [[1266, 148], [1240, 150], [1206, 152], [1180, 156]], [[1262, 158], [1232, 166], [1200, 170]],
  ];
  dark.forEach((s) => line(g, s, swell(2.6, 0.05, 0.6), gv(0.1, 0.9)));
  if (PROC) for (const t of T) strokeFamily(g, t.slice(0, 4), { n: 4, spread: 4, w: 1.1, col: gv(0.45, 0.5), seed: 560 });
  // left tuft: grey right half, dark edge along the right side
  g.save(); g.beginPath(); smoothPath(g, GEO.tuftL, true); g.clip();
  g.fillStyle = gv(0.62, 0.5); g.beginPath(); smoothPath(g, [[779, 66], [800, 90], [800, 130], [775, 135], [778, 90]], true); g.fill();
  g.restore();
  if (!PROC) return;
  line(g, [[781, 70], [790, 95], [796, 112]], swell(2.2, 0.1), gv(0.12, 0.85));
  line(g, [[776, 72], [760, 96], [746, 124]], swell(1.2, 0.1), gv(0.35, 0.6));
}

// eyes: the opening is the ring ellipse under the lid curve; the pupil fills it up to the lid
function lidFn(pts) {
  const q = sampleCurve(pts, 10).slice().sort((a, b) => a[0] - b[0]);
  return (x) => { if (x <= q[0][0]) return q[0][1]; for (let i = 1; i < q.length; i++) if (x <= q[i][0]) { const f = (x - q[i - 1][0]) / (q[i][0] - q[i - 1][0] || 1); return q[i - 1][1] + (q[i][1] - q[i - 1][1]) * f; } return q[q.length - 1][1]; };
}
function eye(g, e, o) {
  const [cx, cy, rx, ry] = e.ring, lid = o.lid || e.lid, ly = lidFn(lid);
  const pu = o.pupil || e.pupil, prx = pu[2], pry = pu[3] ?? pu[2];
  // opening
  const open = (c) => { c.ellipse(cx, cy, rx - 3, ry - 3, 0, 0, TAU); };
  g.save(); g.beginPath(); open(g); g.clip();
  g.beginPath(); const q = sampleCurve(lid, 10); g.moveTo(q[0][0] - 60, q[0][1]); for (const p of q) g.lineTo(p[0], p[1] + 1); g.lineTo(q[q.length - 1][0] + 60, q[q.length - 1][1]); g.lineTo(cx + rx + 80, cy + ry + 80); g.lineTo(cx - rx - 80, cy + ry + 80); g.closePath(); g.clip();
  g.fillStyle = gv(0.97); g.fillRect(cx - rx - 10, cy - ry - 10, 2 * rx + 20, 2 * ry + 20);
  // pupil: round below, squarer and taller above so it fills the opening right up under the lid (hooded look)
  const top = o.pupTop || [2.9, 1.25], rot = o.prot || 0, cr = Math.cos(rot), sr = Math.sin(rot);
  g.fillStyle = gv(0.035);
  if (o.black) {
    // measured: the black of the eye (pupil + the hooded lid shadow) as one outline, up under the lid stroke
    // (not clipped by the ring ellipse: the opening reaches the lid)
    g.restore();
    g.save(); g.beginPath(); g.moveTo(q[0][0] - 60, q[0][1]); for (const p of q) g.lineTo(p[0], p[1] - 2); g.lineTo(q[q.length - 1][0] + 60, q[q.length - 1][1]); g.lineTo(cx + rx + 80, cy + ry + 80); g.lineTo(cx - rx - 80, cy + ry + 80); g.closePath(); g.clip();
    g.fillStyle = gv(0.035); g.beginPath(); smoothPath(g, o.black, true); g.fill();
    g.restore();
    return eyeLines(g, e, o, lid, ly, cx, cy, rx, ry);
  }
  g.beginPath();
  for (let i = 0; i <= 96; i++) {
    const a = (i / 96) * TAU, c = Math.cos(a), s = Math.sin(a), up = s < 0, n = up ? top[0] : 2;
    const x = Math.sign(c) * Math.pow(Math.abs(c), 2 / n) * prx, y = Math.sign(s) * Math.pow(Math.abs(s), 2 / n) * pry * (up ? top[1] : 1);
    const X = pu[0] + x * cr - y * sr, Y = pu[1] + x * sr + y * cr;
    if (i) g.lineTo(X, Y); else g.moveTo(X, Y);
  }
  g.closePath(); g.fill();
  // the lid's inner half comes down onto the pupil: fill between that part of the lid and the pupil (hooded look)
  if (o.wedge) {
    const lq = sampleCurve(lid.slice(o.wedge[0], o.wedge[1] + 1), 8);
    g.beginPath(); g.moveTo(pu[0], pu[1]); for (const p of [...(o.wedgeStart || []), ...lq]) g.lineTo(p[0], p[1] + 2); for (const p of o.wedgeEnd || []) g.lineTo(p[0], p[1]); g.closePath(); g.fill();
  }
  g.restore();
  eyeLines(g, e, o, lid, ly, cx, cy, rx, ry);
}
function eyeLines(g, e, o, lid, ly, cx, cy, rx, ry) {
  // ring: the part of the ellipse below the lid, heavier round the bottom
  const pts = [];
  for (let i = 0; i <= 240; i++) { const a = -Math.PI / 2 + (i / 240) * TAU; const p = [cx + rx * Math.cos(a), cy + ry * Math.sin(a)]; pts.push({ p, a, below: p[1] > ly(p[0]) + (o.ringGap ?? 1) }); }
  // the longest run of the ring below the lid (cyclic)
  let run = [];
  const n0 = pts.findIndex((t) => !t.below);
  if (n0 < 0) run = pts.slice();
  else {
    let cur = [];
    for (let j = 0; j <= pts.length; j++) { const t = pts[(n0 + j) % pts.length]; if (t.below) cur.push(t); else { if (cur.length > run.length) run = cur; cur = []; } }
  }
  if (run.length > 3) {
    const wr = o.ringW || [2.4, 6.4];
    taper(g, run.map((t) => t.p), (u) => { const a = run[Math.round(u * (run.length - 1))].a; return wr[0] + (wr[1] - wr[0]) * Math.pow(Math.max(0, Math.sin(a)), 2.2); }, gv(0.16));
  }
  // a second, fainter outer line round the lower side (the double rim)
  if (o.outer) { const q2 = []; for (let i = 0; i <= 24; i++) { const a = o.outer[0] + (o.outer[1] - o.outer[0]) * i / 24; q2.push([cx + (rx + 7) * Math.cos(a), cy + (ry + 7) * Math.sin(a)]); } taper(g, q2, swell(2.2, 0.05, 0.7), gv(0.3, 0.65)); }
  // lid: one heavy stroke, hairline at the inner corner
  taper(g, sampleCurve(lid, 10), o.lidW, gv(0.06));
  if (e.lash && !o.noLash) { line(g, e.lash, swell(2.6, 0.1, 0.5), "#0a0a0a"); for (const s of o.lashes || []) line(g, s, swell(1.5, 0.05, 0.6), gv(0.18, 0.8)); }
}
function eyes(g, state, rig) {
  const R = GEO.eyeR, L = GEO.eyeL;
  if (state === "closed") return;   // drawn after the head transform (frame coords of the pop)
  const glare = state === "glare";
  const shiftLid = (pts, f) => pts.map(([x, y], i) => [x, y + f(i / (pts.length - 1))]);
  eye(g, R, {
    lid: glare ? [[944, 358], [949, 353], [960, 337], [994, 316], [1029, 297], [1049, 296], [1064, 306], [1083, 316], [1100, 327]] : R.lid,   // glare: measured at 35.20, mapped back into head space
    pupil: [1017, 355, 56, 54],
    pupTop: [2, 1], wedge: [1, 6], wedgeEnd: [[1050, 283], [1045, 294], [1037, 302]].map(([x, y]) => [x, y + (glare ? 16 : 0)]),
    black: [[961, 324], [983, 304], [1005, 290], [1025, 282], [1045, 280], [1051, 294], [1052, 305], [1059, 312], [1065, 320], [1071, 336], [1072, 359], [1067, 376], [1060, 387], [1051, 396], [1031, 405], [1005, 405], [984, 396], [975, 388], [967, 377], [962, 361], [962, 339]],
    lidW: (u) => (u < 0.15 ? 2 + 50 * u : u < 0.85 ? 9.5 + 2.5 * Math.sin(Math.PI * (u - 0.15) / 0.7) : 9.5 - 45 * (u - 0.85)) + (glare ? 1.2 : 0),
    ringW: [4, 6], outer: [1.95, 2.95],
    lashes: [[[1085, 318], [1094, 340], [1095, 362]], [[932, 342], [920, 356], [914, 378]], [[1030, 276], [1060, 272], [1092, 278]], [[1066, 284], [1090, 292], [1104, 306]]],
  });
  eye(g, L, {
    lid: glare ? [[737, 342], [739, 334], [758, 337], [782, 339], [807, 346], [832, 359], [843, 371], [851, 386]] : L.lid,
    pupil: [804, 372, 47, 62],
    pupTop: [2, 1],
    black: [[775, 331], [792, 332], [806, 336], [821, 344], [836, 354], [845, 362], [849, 376], [850, 392], [847, 407], [839, 420], [826, 428], [815, 431], [794, 431], [777, 423], [765, 408], [757, 387], [755, 368], [759, 350], [765, 338]],
    lidW: (u) => (9 - 3 * u) * Math.min(1, 0.6 + u * 8) * (u > 0.9 ? 1 - (u - 0.9) * 5 : 1) + (glare ? 3 : 0),
    ringW: [3.2, 4.8], outer: [1.75, 2.75], ringGap: 6,
    lashes: [[[750, 330], [735, 327], [722, 328]], [[746, 336], [733, 338], [724, 344]], [[744, 342], [736, 352], [733, 362]], [[742, 348], [739, 372], [741, 396]]],
  });
}
// shut eyes of the closed pop, in the pop's frame coordinates (measured at 35.30)
function closedEyes(g) {
  line(g, [[924, 463], [960, 469], [1000, 463], [1040, 446], [1082, 419]], (u) => 8.4 * (1 - 0.8 * Math.pow(u, 1.6)) * Math.min(1, 0.55 + u * 6), "#0a0a0a");
  line(g, [[1082, 419], [1094, 412]], () => 1.6, gv(0.2, 0.8));
  line(g, [[721, 500], [760, 506], [800, 500], [822, 491], [842, 481]], (u) => 7.6 * (0.2 + 0.8 * Math.pow(u, 0.7)) * Math.min(1, (1 - u) * 20 + 0.5), "#0a0a0a");
  strokeFamily(g, [[935, 440], [990, 425], [1050, 410], [1085, 398]], { n: 5, spread: 4, w: 1.3, col: gv(0.45, 0.55), seed: 601 });
  strokeFamily(g, [[730, 478], [780, 472], [830, 462]], { n: 4, spread: 4, w: 1.2, col: gv(0.45, 0.55), seed: 602 });
}

// beak: narrow pale hooked shield, nostril top-left, grey gape wedge with a dark keyline at the mouth corner
function beak(g, state) {
  const B = GEO.beak;
  const open = state === "closed";
  // the closed pop parts the beak: a deeper gape lens
  const gape = open ? [[910, 552], [920, 536], [936, 518], [954, 500], [952, 524], [940, 544], [924, 558], [912, 560]] : B.gape;
  fillPts(g, B.out, gv(0.94));
  g.save(); g.beginPath(); smoothPath(g, B.out, true); g.clip();
  g.filter = "blur(6px)";
  g.fillStyle = gv(0.8, 0.8); g.beginPath(); g.ellipse(934, 516, 20, 30, -0.5, 0, TAU); g.fill();
  g.fillStyle = gv(0.99, 0.9); g.beginPath(); g.ellipse(890, 494, 10, 24, 0.1, 0, TAU); g.fill();
  g.filter = "none";
  g.restore();
  // gape lens at the mouth corner: grey, a pale streak, dark keyline below, finer line above
  fillPts(g, gape, gv(0.46));
  g.save(); g.beginPath(); smoothPath(g, gape, true); g.clip();
  line(g, [[922, 540], [936, 526], [948, 510]], swell(2.6, 0.2), gv(0.7, 0.6));
  g.restore();
  line(g, [gape[7], gape[6], gape[5], gape[4], gape[3]], swell(3, 0.3, 0.6), LINE);
  line(g, [gape[0], gape[1], gape[2], gape[3]], swell(1.6, 0.2, 0.6), gv(0.15, 0.85));
  // outline: heavy down the left edge, round the hooked tip; faint on the lit top/right
  line(g, [[884, 454], [874, 468], [870, 490], [873, 514], [880, 535], [893, 549], [906, 558], [912, 557], [914, 549], [912, 544]], (u) => 0.8 + 3.4 * Math.min(1, u * 4) * (u > 0.88 ? 0.75 : 1), gv(0.2));
  line(g, [[912, 458], [930, 470], [944, 488]], swell(1.1, 0.1), gv(0.5, 0.45));
  g.fillStyle = LINE; g.beginPath(); g.ellipse(B.nostril[0], B.nostril[1], B.nostril[2], B.nostril[3], 0.25, 0, TAU); g.fill();
}

// bandage: a long perforated strip lower-left → upper-right, the short padded strip crossing it (no inner pad box)
function bandage(g) {
  const Bd = GEO.bandage;
  // long perforated strip, lower-left to upper-right
  const [a, b, w] = Bd.long;
  const d = V.nrm(V.sub(b, a)), L = V.len(V.sub(b, a)), ang = Math.atan2(d[1], d[0]);
  g.save(); g.translate(a[0], a[1]); g.rotate(ang);
  g.fillStyle = gv(0.9); g.beginPath(); g.roundRect(0, -w / 2, L, w, w / 2); g.fill();
  g.save(); g.clip(); g.fillStyle = gv(0.62, 0.25); g.fillRect(0, w * 0.15, L, w * 0.45); g.restore();
  g.fillStyle = gv(0.14);
  for (let i = 0; i < 4; i++) for (const [u0, s] of [[0.1, 1], [0.72, -1]]) { g.beginPath(); g.arc((u0 + i * 0.045) * L, s * (-0.32 + (i % 2) * 0.55) * w / 2, 1.9, 0, TAU); g.fill(); }
  g.strokeStyle = gv(0.16, 0.95); g.lineWidth = 2; g.beginPath(); g.roundRect(0, -w / 2, L, w, w / 2); g.stroke();
  g.restore();
  // the short pad strip on top: a rounded quad (foreshortened on the curved brow), no inner pad box
  const Q = Bd.pad, rq = (c) => {
    const n = Q.length, R = 11;
    for (let i = 0; i < n; i++) {
      const p = Q[i], pr = Q[(i + n - 1) % n], nx = Q[(i + 1) % n];
      const a1 = V.add(p, V.mul(V.nrm(V.sub(pr, p)), R)), b1 = V.add(p, V.mul(V.nrm(V.sub(nx, p)), R));
      if (i === 0) c.moveTo(a1[0], a1[1]); else c.lineTo(a1[0], a1[1]);
      c.quadraticCurveTo(p[0], p[1], b1[0], b1[1]);
    }
    c.closePath();
  };
  g.fillStyle = gv(0.92); g.beginPath(); rq(g); g.fill();
  g.save(); g.beginPath(); rq(g); g.clip(); g.fillStyle = gv(0.66, 0.22); g.beginPath(); g.ellipse(845, 190, 40, 14, -0.1, 0, TAU); g.fill(); g.restore();
  g.fillStyle = gv(0.16);
  for (const [x, y] of [[845, 158], [832, 167], [855, 169], [817, 179], [842, 179], [828, 191]]) { g.beginPath(); g.arc(x, y, 1.9, 0, TAU); g.fill(); }
  g.strokeStyle = gv(0.16, 0.95); g.lineWidth = 2; g.beginPath(); rq(g); g.stroke();
  line(g, [[796, 174], [814, 180], [832, 198]], swell(1.1, 0.1), gv(0.45, 0.4));
}

// near headphone: slider block, collar, arm, cup (cushion, engraved shell, yoke, dark-rimmed halftone plate)
function headphone(g) {
  const H = GEO.hp;
  const r = rng(701);
  // band rising out of frame above the block (seen in the pops)
  const up = [[1284, 12], [1262, -30], [1230, -62], [1190, -94], [1140, -120]];
  line(g, up.map(([x, y]) => [x - 6, y]), () => 22, gv(0.1));
  halftoneDots(g, (c) => { const q = sampleCurve(up, 6); c.moveTo(q[0][0] - 8, q[0][1]); for (const p of q) c.lineTo(p[0] - 8, p[1]); for (let i = q.length - 1; i >= 0; i--) c.lineTo(q[i][0] + 3, q[i][1]); c.closePath(); }, [1140, -150, 1330, 10], () => 0.5);
  line(g, up.map(([x, y]) => [x - 13, y]), () => 4, gv(0.85));
  // cup silhouette (black: outer cushion rim, the gaps, the shadow under the cup)
  fillPts(g, H.cup, gv(0.035));
  // cushion: pleated dark leather — bright jagged fold wedges pointing out to the rim, dotted stitching top and bottom
  g.save(); g.beginPath(); smoothPath(g, H.cushion, true); g.clip();
  // the cushion's lit face: a mottled grey band down its middle (under the folds)
  if (!PROC) { g.filter = "blur(9px)"; g.fillStyle = gv(0.3, 0.7); g.beginPath(); g.ellipse(1250, 262, 13, 94, 0.04, 0, TAU); g.fill(); g.filter = "none"; }
  for (let y = 168; y < 404; y += (Math.abs((y - 285) / 118) < 0.5 ? 4 : 6) + r() * 4) {
    const t = (y - 285) / 118, xl = 1234 + 26 * t * t, xr = 1268 + 16 * t * t;
    if (Math.abs(t) > 0.72) {
      if (t > 0 && r() < 0.5) continue;
      for (let x = xl + r() * 4; x < xr + 12; x += 4.5 + r() * 3) { g.fillStyle = gv(0.72 + r() * 0.28, 0.7 + r() * 0.3); g.beginPath(); g.arc(x, y + (x - xl) * 0.12 * Math.sign(t), 1.3 + r() * 1.3, 0, TAU); g.fill(); }
      continue;
    }
    if (r() < 0.12) continue;
    const tip = [xl + r() * 12 - 2, y + (r() - 0.5) * 6 + t * 6], hw = (1.8 + r() * 4.5) * (1.5 - Math.abs(t)), base = xr - r() * 12;
    const k = t > 0 ? 1 - 1.25 * t : 1 + 0.8 * t;
    g.fillStyle = gv(0.62 + 0.36 * k * (0.5 + 0.5 * r()), (0.55 + 0.45 * k) * (PROC ? 1 : 0.7));
    g.beginPath(); g.moveTo(tip[0], tip[1]); g.quadraticCurveTo((tip[0] + base) / 2, y - hw * 1.2, base, y - hw + t * 5); g.lineTo(base, y + hw + t * 5); g.quadraticCurveTo((tip[0] + base) / 2, y + hw * 0.8, tip[0], tip[1]); g.fill();
  }
  if (!PROC) {
    // the cushion's lit face: a mottled grey band down its middle, then the pale fold strokes
    drawBright(g, parseStrokes(CUSH_LINES), 0.92, 9);
  }
  g.restore();
  // shell: metal ring between cushion and plate — long curved white and grey streaks, a darker band round the bottom
  const SH = [[1300, 168], [1340, 176], [1372, 205], [1344, 232], [1332, 290], [1344, 352], [1380, 386], [1340, 404], [1300, 398], [1278, 350], [1271, 286], [1276, 224]];
  const shell = (c) => smoothPath(c, SH, true);
  g.fillStyle = gv(0.6); g.beginPath(); shell(g); g.fill();
  g.save(); g.beginPath(); shell(g); g.clip();
  g.filter = "blur(8px)";
  g.fillStyle = gv(0.88); g.beginPath(); g.ellipse(1290, 262, 16, 78, 0.05, 0, TAU); g.fill();
  g.fillStyle = gv(0.12, PROC ? 0.85 : 0.35); g.beginPath(); g.ellipse(1330, 388, 62, 34, -0.15, 0, TAU); g.fill();
  g.fillStyle = gv(0.14, 0.8); g.beginPath(); g.ellipse(1320, 172, 46, 24, 0.2, 0, TAU); g.fill();
  g.filter = "none";
  if (!PROC) { drawBright(g, parseStrokes(SHELL_BRIGHT), 1.0); drawStrokes(g, parseStrokes(SHELL_DARK), null); }
  else for (let i = 0; i < 70; i++) {
    const k = r(), a0 = -1.35 + r() * 0.6, a1 = 0.8 + r() * 0.8;
    const q = []; for (let j = 0; j <= 12; j++) { const a = a0 + (a1 - a0) * j / 12; q.push([1362 - (92 - 60 * k) * Math.cos(a), 287 + 122 * Math.sin(a)]); }
    taper(g, q, swell(0.8 + r() * 2.4, 0.05, 0.6), r() < (k < 0.5 ? 0.7 : 0.45) ? gv(0.97, 0.85) : gv(0.14, 0.6));
  }
  // the shell turns away at top and bottom: glaze the streaks down there
  g.filter = "blur(7px)";
  g.fillStyle = gv(0.1, PROC ? 0.6 : 0.25); g.beginPath(); g.ellipse(1326, 386, 60, 26, -0.15, 0, TAU); g.fill();
  g.fillStyle = gv(0.1, 0.5); g.beginPath(); g.ellipse(1318, 176, 42, 18, 0.2, 0, TAU); g.fill();
  g.filter = "none";
  g.restore();
  g.strokeStyle = LINE; g.lineWidth = 2.6; g.beginPath(); shell(g); g.stroke();
  // plate: black rim, then a narrow halftone oval, dots growing toward the bottom (flat print tone, no airbrush)
  const [px, py, prx, pry] = H.plate;
  // the halftone crescent of the cup's outer band round the plate's upper right, fed by the arm
  halftoneDots(g, (c) => { c.ellipse(px + 4, py - 6, prx + 16, pry + 14, 0, -1.7, 0.3); c.ellipse(px, py, prx + 6, pry + 6, 0, 0.3, -1.7, true); c.closePath(); }, [px - 20, py - pry - 24, px + prx + 24, py + 40], (x, y) => 0.42 - 0.2 * clamp((x - px - 20) / 30), { bg: 0.8 });
  g.fillStyle = gv(0.03); g.beginPath(); g.ellipse(px - 2, py + 2, prx + 9, pry + 10, 0, 0, TAU); g.fill();
  halftoneDots(g, (c) => c.ellipse(px, py, prx, pry, 0, 0, TAU), [px - prx - 4, py - pry - 4, px + prx + 4, py + pry + 4], (x, y) => 0.6 - 0.35 * clamp((y - (py + 30)) / 60) - 0.06 * clamp((x - (px + 20)) / 20), { bg: 0.92 });
  // arm down from the collar: halftone face, black keyline; its pale metal edge runs on down as the yoke that
  // wraps the plate's left side and hooks under it
  halftoneDots(g, blob(H.arm), [1300, 60, 1410, 212], (x, y) => 0.5 - 0.1 * clamp((y - 150) / 50));
  g.strokeStyle = LINE; g.lineWidth = 2.4; g.beginPath(); smoothPath(g, H.arm, true); g.stroke();
  line(g, H.yoke, () => 20, LINE);
  line(g, H.yoke, () => 13, gv(0.9));
  line(g, offsetPts(H.yoke, 3), () => 2.2, gv(0.55, 0.7));
  // collar and the knurled slider block
  g.fillStyle = gv(0.3); g.beginPath(); polyPath(g, H.collar); g.fill();
  line(g, [[1302, 60], [1362, 58]], () => 1.6, gv(0.85, 0.8));
  g.strokeStyle = LINE; g.lineWidth = 2; g.beginPath(); polyPath(g, H.collar); g.stroke();
  halftoneDots(g, (c) => polyPath(c, H.block), [1278, 0, 1366, 64], () => 0.52);
  g.save(); g.beginPath(); polyPath(g, H.block); g.clip();
  g.strokeStyle = gv(0.1, 0.7);
  for (let y = 12; y < 62; y += 12) { g.lineWidth = 1.4; g.beginPath(); g.moveTo(1290, y); g.lineTo(1370, y - 4); g.stroke(); }
  g.restore();
  g.fillStyle = gv(0.88); g.beginPath(); polyPath(g, H.blockFace); g.fill();
  g.strokeStyle = LINE; g.lineWidth = 2.2; g.beginPath(); polyPath(g, H.block); g.stroke();
  g.beginPath(); polyPath(g, H.blockFace); g.stroke();
  if (H.block2) {
    // the lower slider block under the collar, with the yoke's pale end beside it
    halftoneDots(g, (c) => polyPath(c, H.block2), [1310, 60, 1366, 96], () => 0.5);
    g.fillStyle = gv(0.86); g.beginPath(); polyPath(g, H.block2Face); g.fill();
    g.strokeStyle = LINE; g.lineWidth = 2.2; g.beginPath(); polyPath(g, H.block2); g.stroke();
  }
}

// ---------------------------------------------------------------- the whole owl
export function heroLayer(state = "stare") {
  const rig = RIGS[state] || RIGS.stare;
  const [x0, y0, x1, y1] = BOX;
  const cv = document.createElement("canvas");
  cv.width = x1 - x0; cv.height = y1 - y0;
  const g = cv.getContext("2d", { willReadFrequently: true });
  g.translate(-x0, -y0);
  g.lineCap = "round"; g.lineJoin = "round";
  setPPU(1);
  const H = rig.head, applyHead = () => { if (H) { g.translate(H.c[0] + H.d[0], H.c[1] + H.d[1]); g.rotate(H.rot); g.translate(-H.c[0], -H.c[1]); } };

  g.save(); applyHead(); farBand(g, state); g.restore();
  tail(g, rig);
  feet(g, rig);
  const M = plumageMass(g, rig);
  bodyTexture(g, rig, M);
  wing(g, rig);
  const SS = strokeSets();
  drawStrokes(g, SS.body, rig.head ? rig.warp : null);
  g.save(); applyHead();
  headTexture(g, M, state);
  tuftStrokes(g);
  drawStrokes(g, SS.head, null);
  eyes(g, state, rig);
  beak(g, state);
  bandage(g);
  headphone(g);
  g.restore();
  if (state === "closed") closedEyes(g);
  g.setTransform(1, 0, 0, 1, 0, 0);
  // the source's ink is soft (edges roll off over ~3 px): soften everything, then cut the print mesh
  const tmp = document.createElement("canvas"); tmp.width = cv.width; tmp.height = cv.height;
  const tg = tmp.getContext("2d"); tg.filter = "blur(0.9px)"; tg.drawImage(cv, 0, 0);
  g.clearRect(0, 0, cv.width, cv.height); g.drawImage(tmp, 0, 0);
  // print mesh on the plumage only: feet, beak, plaster, eyes and the headphone keep their own flat tone
  const mk = document.createElement("canvas"); mk.width = cv.width; mk.height = cv.height;
  const mg = mk.getContext("2d"); mg.translate(-x0, -y0); mg.fillStyle = "#fff";
  const fillM = (pts) => { mg.beginPath(); smoothPath(mg, pts, true); mg.fill(); };
  if (PROC) { for (const t of TOES_L) { fillM(W(rig, t.pad)); fillM(W(rig, t.claw)); } fillM(W(rig, FOOT_R)); }
  else for (const R of [FEET_L_RINGS, FEET_R_RINGS]) { mg.beginPath(); ringsPath(R.slice(0, 1).concat(R.slice(1)), rig.warp)(mg); mg.fill("evenodd"); }
  mg.save(); if (H) { mg.translate(H.c[0] + H.d[0], H.c[1] + H.d[1]); mg.rotate(H.rot); mg.translate(-H.c[0], -H.c[1]); }
  fillM(GEO.beak.out); fillM(GEO.bandage.pad);
  for (const e of [GEO.eyeR, GEO.eyeL]) { mg.beginPath(); mg.ellipse(e.ring[0], e.ring[1], e.ring[2] + 4, e.ring[3] + 4, 0, 0, TAU); mg.fill(); }
  { const [a, b, w] = GEO.bandage.long, d = V.nrm(V.sub(b, a)); mg.save(); mg.translate(a[0], a[1]); mg.rotate(Math.atan2(d[1], d[0])); mg.beginPath(); mg.roundRect(-2, -w / 2 - 2, V.len(V.sub(b, a)) + 4, w + 4, w / 2); mg.fill(); mg.restore(); }
  fillM(GEO.hp.cup); fillM(GEO.hp.arm); for (const q of [GEO.hp.block, GEO.hp.collar, GEO.hp.block2, GEO.hp.block2Face, GEO.farBand.top, GEO.farBand.low]) { mg.beginPath(); polyPath(mg, q); mg.fill(); }
  mg.fillRect(1130, -160, 200, 170); mg.fillRect(800, -160, 220, 175);
  mg.restore();
  toneMasked(cv, mk, { pitch: 3.7, white: 0.962, range: 0.25, amp: 0.2, grain: 10 / 255, cross: 0.8 });
  return { canvas: cv, x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}
