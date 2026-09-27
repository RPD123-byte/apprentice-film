// The s12 hero owl, drawn in FRAME PIXELS from measured control points (./geo.js).
// Three drawings share one geometry:
//   stare  (33.60–35.20)  the held hero frame
//   glare  (35.20–35.28)  head + headphones rolled -2.63° and moved (ECC fit on the source), the lower body sagging
//                         with it (measured patch shifts, interpolated), its own measured eyes and beak
//   closed (35.28–35.36)  head rolled -5.15° and moved further, body sagging ~25 px, eyes shut, beak open
// The ink work is measured, not invented: the feather strokes (./strokes.js), the tail and talon outlines (./parts.js),
// the headphone cup's engraving flow, cushion wedges and dots (./hp.js) and each drawing's eye and beak ink (./eyes.js)
// are centre-lines, streamlines and contours traced from the source frames (scripts in ./trace/) and redrawn here;
// the value study, grain, print screen, plaster and headphone shapes are drawn from control points.
// Fix pass 1 replaced: the procedural cushion bars and shell dashes (-> white scratchboard lines along the measured
// flow), the square pad of the plaster (-> the measured crossing strip), the parametric lids / rings / curled lashes
// (-> the traced ink of each drawing), the hatched gape and tuft, the rigid pops (-> own eyes, beak, body sag).
// Fix pass 2 (review of F4c) replaced: the headphone metal's white streamlines (-> light metal: fitted base tone + the
// measured dark ink, ./hpx.js; measured plate ring, halftone strip in the J, hatch; the pops redrawn: glare hatched,
// shut-eye pop smooth grey metal with a cross-hatch), the traced soft-level beak (-> drawn contour / gape / shading,
// ./beak.js), the right tuft's third lobe, notch and fringe (./tuft.js), the plaster keylines (./plaster.js), the flank
// dashes and wing tip (./flank.js), the tail notches (./tailx.js), the crown ticks (./crown.js), the right foot outline;
// it added the lit-side glow and edge roll-off and a region-varying print screen. Headphone metal and plaster ink are
// drawn crisp (0.45 px) after the plumage's softening.
// Everything is seeded and static (no boiling). Built once per drawing, then blitted.
import { ink, flick, plumage, softShade, walk, area, LINE, gv, setPPU, V } from "../../lib/owlInk.js";
import { smoothPath, sampleCurve } from "../../lib/paths.js";
import { taper } from "../../lib/ink.js";
import { rng, clamp } from "../../lib/rng.js";
import { GEO } from "./geo.js";
import { TONE } from "./tone.js";
import { STROKES } from "./strokes.js";
import { TAIL_RINGS, FEET_L_RINGS, FEET_R_RINGS, TAIL_LINES, FEET_LINES } from "./parts.js";
import { EYES } from "./eyes.js";
import { RINGS } from "./rings.js";
import { BEAKS } from "./beak.js";
import { FRINGE, LOBE3, NOTCH, LOBE3_INK } from "./tuft.js";
import { PLASTER } from "./plaster.js";
import { FLANK, FLANK_POLY, WTIP, WTIP_POLY } from "./flank.js";
import { TAILX } from "./tailx.js";
import { CROWN, CROWN_POLY, CROWN3, CROWN3_POLY } from "./crown.js";
import { HP_CUSH_LINES, HP_WEDGES, HP_DOTS, HP_TONE, HP_E, HP_HA, HP_PLATE, HP_CUSH } from "./hp.js";
import { HPX_MET, HPX_ARM, HPX_CRES, HPX_STRIP, HPX_BASE, HPX_INK } from "./hpx.js";
import { SHELL } from "./shell.js";
import { CUSH } from "./cush.js";
import { UNDER, UNDER_POLY, SHOUL, SHOUL_POLY } from "./under.js";

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
  // body samples re-measured for fix pass 1 (44 px patches, frame 850 -> 880 / 882, cc >= 0.9): the whole lower body
  // sags in the pops, belly and talons included (the left talons drop 5 / 17 px)
  glare: makeRig({ c: [1000, 350], rot: -0.0459, d: [-12.9, 27.6] }, [[1050, 806, -5, 15], [1100, 839, -11, 11], [1150, 862, -5, 12], [1200, 884, -1, 12], [1250, 892, 1, 11], [1360, 896, 1, 9], [1450, 898, 2, 8], [1500, 894, 2, 7], [1550, 764, -2, 6], [1600, 779, -1, 5], [1650, 790, -1, 4], [1700, 800, -1, 3], [1750, 775, -1, 2], [1820, 800, -3, -1], [1880, 830, 1, -1], [1450, 600, -5, 10], [1470, 440, -10, 9], [1650, 700, -3, 4], [1300, 700, -2, 13], [1090, 905, 1, 5], [1120, 915, 1, 5], [1430, 930, 3, 5], [1350, 880, 1, 9]]),
  closed: makeRig({ c: [1000, 350], rot: -0.0899, d: [-22.5, 55.6] }, [[1050, 806, -16, 27], [1100, 839, -19, 27], [1150, 862, -8, 27], [1200, 884, -2, 27], [1250, 892, 1, 24], [1360, 896, 1, 20], [1450, 898, 2, 17], [1500, 894, 2, 15], [1550, 764, -2, 14], [1600, 779, -3, 11], [1650, 790, -2, 9], [1700, 800, -1, 7], [1750, 775, -2, 5], [1820, 800, -3, 2], [1880, 830, -2, 0], [1450, 600, -11, 20], [1470, 440, -18, 18], [1650, 700, -6, 9], [1300, 700, -6, 27], [1090, 905, 1, 18], [1120, 915, 1, 17], [1150, 920, 3, 12], [1350, 880, 2, 21]]),
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
// fix pass 2: hatch(x, y) -> 0..1 joins each dot to its lower-right neighbour with a dark line (the source's "\\" hatch
// over the halftone runs along the lattice diagonal at the lattice pitch: the dots merge into lines where it is dark)
function halftoneDots(g, pathFn, box, val, { bg = 0.9, ink: dk = 0.08, pitch = 6, hatch = null, hw = 0.32 } = {}) {
  g.save(); g.beginPath(); pathFn(g); g.clip();
  g.fillStyle = gv(bg); g.fillRect(box[0], box[1], box[2] - box[0], box[3] - box[1]);
  g.fillStyle = gv(dk); g.strokeStyle = gv(dk); g.lineCap = "round";
  const cell = pitch * pitch / 2;
  for (let y = Math.floor(box[1] / pitch) * pitch; y < box[3] + pitch; y += pitch / 2) {
    const odd = Math.round(y / (pitch / 2)) % 2;
    for (let x = Math.floor(box[0] / pitch) * pitch + (odd ? pitch / 2 : 0); x < box[2] + pitch; x += pitch) {
      const v = clamp(val(x, y)), cov = clamp((bg - v) / (bg - dk));
      // tone-preserving: the hatch line's ink (width x the free diagonal between the dots) comes out of the dot
      const h = hatch ? clamp(hatch(x, y)) : 0, lw = h * hw * pitch;
      const rad0 = Math.sqrt(cov * cell / Math.PI), rad = Math.min(pitch * 0.62, Math.sqrt(Math.max(0, cov * cell - lw * Math.max(0, pitch * 0.707 - 2 * rad0)) / Math.PI));
      if (rad > 0.25) { g.beginPath(); g.arc(x, y, rad, 0, TAU); g.fill(); }
      if (h > 0.05) { g.lineWidth = lw; g.beginPath(); g.moveTo(x, y); g.lineTo(x + pitch / 2, y + pitch / 2); g.stroke(); }
    }
  }
  g.restore();
}

// fix pass 2: smooth grey metal crossed by straight hatch families (the closed pop's redrawn headphone: no halftone,
// grey + a +-45° cross-hatch). Tone-preserving: the base is lifted by the hatch's mean darkening.
function hatchFill(g, pathFn, box, val, { pitch = 6, angles = [Math.PI / 4, -Math.PI / 4], lw = 1.2, dv = 0.3 } = {}) {
  const cov = Math.min(0.9, angles.length * lw / pitch);
  g.save(); g.beginPath(); pathFn(g); g.clip();
  const [x0, y0, x1, y1] = box, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, R = Math.hypot(x1 - x0, y1 - y0) / 2 + pitch;
  const v0 = val(cx, cy);
  // base: sample the tone on a coarse grid (smooth parts only: val is a low-order field)
  for (let y = y0; y < y1; y += 4) for (let x = x0; x < x1; x += 4) { g.fillStyle = gv(val(x + 2, y + 2) + cov * dv * 0.85); g.fillRect(x, y, 4, 4); }
  // hand-drawn hatch: seeded jitter of spacing, angle and extent, each line a taper (not a ruled grid)
  const r = rng(Math.round(x0 * 7 + y0 * 13));
  for (const a of angles) {
    for (let k = -R; k <= R; k += pitch * (0.8 + 0.4 * r())) {
      const aa = a + (r() - 0.5) * 0.08, dx = Math.cos(aa), dy = Math.sin(aa), nx = -Math.sin(a), ny = Math.cos(a);
      const s0 = -R * (0.5 + 0.5 * r()), s1 = R * (0.5 + 0.5 * r()), ox = cx + nx * k, oy = cy + ny * k;
      taper(g, [[ox + dx * s0, oy + dy * s0], [ox + dx * (s0 + s1) / 2, oy + dy * (s0 + s1) / 2], [ox + dx * s1, oy + dy * s1]], (u) => lw * (0.5 + 0.5 * Math.sin(Math.PI * u)), gv(clamp(v0 + cov * dv * 0.85 - dv)));
    }
  }
  g.restore();
}

// fix pass 3: the shut-eye pop's metal (source frames 882-883) — the review found hatchFill's even ~8 px mesh read as
// graph paper; the source has soft hand hatching of varying density and angle over a lighter-to-darker gradient.
// Lines are broken into seeded segments (18-50 px), each kept with probability dens(x, y); per line: angle +-6 deg,
// spacing 5-11 px, width 0.8-2 px, darkening 0.08-0.2. Tone-preserving on average (base lifted by the mean darkening).
function softHatch(g, pathFn, box, val, { angles = [0.72, -0.85], sp = [5, 11], lw = [0.8, 2], dv = [0.08, 0.2], dens = () => 1, seed = 1, segs = [18, 50], base = true } = {}) {
  g.save(); g.beginPath(); pathFn(g); g.clip();
  const [x0, y0, x1, y1] = box, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, R = Math.hypot(x1 - x0, y1 - y0) / 2 + 12;
  const lift = (x, y) => clamp(dens(x, y)) * angles.length * 1.4 / 8 * 0.14;
  // (cells overlap by 1 px: in the rotated pop rig abutting cells leave antialiased seams that read as a grid)
  if (base) for (let y = y0; y < y1; y += 3) for (let x = x0; x < x1; x += 3) { g.fillStyle = gv(val(x + 1.5, y + 1.5) + lift(x + 1.5, y + 1.5)); g.fillRect(x - 0.5, y - 0.5, 4, 4); }
  const r = rng(seed);
  for (const a of angles) {
    for (let k = -R; k <= R; k += sp[0] + (sp[1] - sp[0]) * r()) {
      const aa = a + (r() - 0.5) * 0.21, dx = Math.cos(aa), dy = Math.sin(aa), nx = -Math.sin(a), ny = Math.cos(a);
      const w = lw[0] + (lw[1] - lw[0]) * r(), d = dv[0] + (dv[1] - dv[0]) * r(), ox = cx + nx * k, oy = cy + ny * k, bow = (r() - 0.5) * 3;
      for (let s0 = -R; s0 < R;) {
        const L = segs[0] + (segs[1] - segs[0]) * r(), s1 = s0 + L, sm = (s0 + s1) / 2, mx = ox + dx * sm, my = oy + dy * sm;
        if (r() < dens(mx, my)) taper(g, [[ox + dx * s0, oy + dy * s0], [mx - ny * bow, my + nx * bow], [ox + dx * s1, oy + dy * s1]], (u) => w * (0.35 + 0.65 * Math.sin(Math.PI * u)), gv(clamp(val(mx, my) + lift(mx, my) - d)));
        s0 = s1 + 2 + 10 * r();
      }
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
  for (let i = 0; i < N * N; i++) out[i] = 0.62 * fine[i] + 0.6 * Math.max(-0.6, blob[i]);    // blotches skew bright (fix 1: 0.78 -> 0.6)
  return (GRAIN = norm(out));
}
function toneMasked(canvas, mask, { pitch = 4.2, amp = 0.2, white = 0.93, range = 0.3, grain = 0, cross = 1, field = null } = {}) {
  const g = canvas.getContext("2d"), w = canvas.width, h = canvas.height;
  const img = g.getImageData(0, 0, w, h), d = img.data, m = mask.getContext("2d").getImageData(0, 0, w, h).data;
  const G = grainTile();
  // fix pass 2: the screen is no longer one 135° mesh over the whole bird. field = {meshes: [[waveAngle, pitch]...],
  // cell, gw, gh, W: Float32Array(gw*gh*K) mesh weights, A: amplitude multipliers} on a coarse grid, bilinear.
  const MS = field ? field.meshes : [[-Math.PI / 4, pitch]], K = MS.length;
  const MC = MS.map(([a, p]) => [Math.cos(a) / p, Math.sin(a) / p, Math.cos(a + Math.PI / 2) / p, Math.sin(a + Math.PI / 2) / p]);
  const line = (ph) => { const f = Math.abs((ph % 1 + 1) % 1 - 0.5) * 2; return 1 - Math.min(1, f * 2.6); };
  const wk = new Float32Array(K);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const o = (j * w + i) * 4;
    if (d[o + 3] < 8) continue;
    let L = d[o] / 255;
    if (grain && L > 0.5) { L = clamp(L + grain * G[(j & 127) * 128 + (i & 127)] * Math.min(1, (L - 0.5) / 0.25)); d[o] = d[o + 1] = d[o + 2] = L * 255; }
    if (m[o + 3] > 60) continue;
    if (L > white || L < 0.22) continue;
    const t = Math.min(1, (white - L) / range) * Math.min(1, (L - 0.22) / 0.2);
    let A = 1;
    if (field) {
      const { cell, gw, gh, W: FW, A: FA } = field, gx = Math.min(gw - 1.001, i / cell), gy = Math.min(gh - 1.001, j / cell), x0 = Math.floor(gx), y0 = Math.floor(gy), fx = gx - x0, fy = gy - y0;
      const c00 = y0 * gw + x0, c10 = c00 + 1, c01 = c00 + gw, c11 = c01 + 1, b00 = (1 - fx) * (1 - fy), b10 = fx * (1 - fy), b01 = (1 - fx) * fy, b11 = fx * fy;
      for (let k = 0; k < K; k++) wk[k] = FW[c00 * K + k] * b00 + FW[c10 * K + k] * b10 + FW[c01 * K + k] * b01 + FW[c11 * K + k] * b11;
      A = FA[c00] * b00 + FA[c10] * b10 + FA[c01] * b01 + FA[c11] * b11;
    } else wk[0] = 1;
    let mm = 0;
    const cr = field && field.C ? cross * (field.C[Math.min(field.gh - 1, Math.round(j / field.cell)) * field.gw + Math.min(field.gw - 1, Math.round(i / field.cell))]) : cross;
    for (let k = 0; k < K; k++) { if (wk[k] < 0.02) continue; const c = MC[k]; mm += wk[k] * Math.max(line(i * c[0] + j * c[1]), cr * line(i * c[2] + j * c[3])); }
    const v = Math.max(0, Math.min(255, (L - amp * A * t * (mm - 0.3)) * 255));
    d[o] = d[o + 1] = d[o + 2] = v;
  }
  g.putImageData(img, 0, 0);
}
// fix pass 2: the print screen's direction / pitch / strength by region, measured on the source (FFT of the high-passed
// plumage paper in 64 px windows, strokes and shade masked): a clean 135° screen at 3.8 px on the wing (and the head's
// right side by the cushion), elsewhere a weaker, coarser (~5 px) texture of mixed direction — ~160° on the belly and
// lower chest, ~30° on the forehead / crown; the render's 135° mesh was too strong on the lower-left wing (FFT band
// energy 8.5-11.4 against 5.3-8.4) and the shaded crown right. Frame px anchors; layer x = frame x - 640.
function screenField(rig, w, h, x0) {
  const cell = 8, gw = Math.ceil(w / cell) + 1, gh = Math.ceil(h / cell) + 1;
  const meshes = [[-Math.PI / 4, 3.8], [158 * Math.PI / 180, 5.0], [30 * Math.PI / 180, 5.2]], K = meshes.length;
  const anchors = [[1120, 730, 150, 1], [940, 650, 110, 1], [830, 470, 130, 0], [1000, 150, 150, 2], [880, 250, 90, 2], [1205, 300, 100, 0]];
  const ampA = [[1410, 625, 75, 0.5], [1560, 830, 90, 0.35], [1100, 700, 160, 0.2]];
  const wing = W(rig, GEO.wing), Wt = new Float32Array(gw * gh * K), A = new Float32Array(gw * gh), C = new Float32Array(gw * gh);
  let wm = new Float32Array(gw * gh);
  for (let cy = 0; cy < gh; cy++) for (let cx = 0; cx < gw; cx++) wm[cy * gw + cx] = inPoly([x0 + cx * cell, cy * cell], wing) ? 1 : 0;
  for (let it = 0; it < 3; it++) { const o = new Float32Array(gw * gh); for (let cy = 0; cy < gh; cy++) for (let cx = 0; cx < gw; cx++) { let s = 0, n = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const X = cx + dx, Y = cy + dy; if (X >= 0 && Y >= 0 && X < gw && Y < gh) { s += wm[Y * gw + X]; n++; } } o[cy * gw + cx] = s / n; } wm = o; }
  for (let cy = 0; cy < gh; cy++) for (let cx = 0; cx < gw; cx++) {
    const x = x0 + cx * cell, y = cy * cell, c = cy * gw + cx, ws = new Float32Array(K);
    ws[0] += 3 * wm[c];
    for (const [ax, ay, sg, k] of anchors) ws[k] += Math.exp(-((x - ax) ** 2 + (y - ay) ** 2) / (2 * sg * sg));
    let tot = 0; for (let k = 0; k < K; k++) tot += ws[k];
    if (tot < 0.15) { ws[0] += 0.15 - tot; tot = 0.15; }
    for (let k = 0; k < K; k++) Wt[c * K + k] = ws[k] / tot;
    let a = 1 - 0.3 * (1 - wm[c]) * (1 - ws[0] / tot);          // off the wing / 135° zone the texture is weaker
    for (const [ax, ay, sg, dA] of ampA) a -= dA * Math.exp(-((x - ax) ** 2 + (y - ay) ** 2) / (2 * sg * sg));
    // fix pass 3: the review's FFT band energy (3.2-5.2 px) was 25-35% under the source on the forehead, cheeks, wing
    // and tail (19.8/30.1, 22.7/34.5, 59.7/78.9, 70.3/100): 1.4x there; on the crown the screen read as a square grid,
    // the source has one diagonal family: no cross family on the crown (x 980-1230, above y 300)
    const up = Math.max(wm[c], Math.exp(-((x - 920) ** 2 + (y - 225) ** 2) / (2 * 85 * 85)), Math.exp(-((x - 780) ** 2 + (y - 505) ** 2) / (2 * 70 * 70)),
      Math.exp(-((x - 1080) ** 2 + (y - 520) ** 2) / (2 * 80 * 80)), Math.exp(-((x - 1845) ** 2 + (y - 790) ** 2) / (2 * 85 * 85)));
    A[c] = Math.max(0.25, a) * (1 + 0.4 * up);
    C[c] = 1 - clamp((x - 960) / 20) * clamp((1250 - x) / 20) * clamp((310 - y) / 20);
  }
  return { cell, gw, gh, meshes, W: Wt, A, C };
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
// fix pass 2: draw a measured centre-line {pts, w, v} (w = FWHM px, v = core value, pre-finish) as one taper in its
// median tone; wq removes the measuring blur (sigma 0.8 -> 1.9 px FWHM in quadrature), dv darkens (thin lines lose
// their core to the softening), ends taper over ~7% of the length
function measuredLine(g, st, { w0 = 1, w1 = 8, dv = 0, map = null, col = null, grow = 0, ends = 0.07 } = {}) {
  const n = st.pts.length; if (n < 2) return;
  const pts = map ? st.pts.map(map) : st.pts, q = sampleCurve(pts, 3), per = 3;
  const at = (arr, i) => { const f = i / per, a = Math.min(n - 1, Math.floor(f)), b = Math.min(n - 1, a + 1), t = f - a; return arr[a] + (arr[b] - arr[a]) * t; };
  const vs = st.v.slice().sort((a, b) => a - b)[n >> 1];
  taper(g, q, (u) => { const i = Math.round(u * (q.length - 1)), e = Math.min(1, u / ends, (1 - u) / ends); return clamp(Math.sqrt(Math.max(0, at(st.w, i) ** 2 - 3.6)), w0, w1) * (0.35 + 0.65 * Math.sqrt(Math.max(0, e))) + grow; }, col || gv(clamp(vs + dv)));
}
// inside an eye's ring ellipse grown by k (head coords)
function inEyeZone(p, k) { for (const e of [GEO.eyeR, GEO.eyeL]) { const [cx, cy, rx, ry] = e.ring; if (((p[0] - cx) / (rx + k)) ** 2 + ((p[1] - cy) / (ry + k)) ** 2 < 1) return true; } return false; }
// rings (outer + holes) as one even-odd path
const ringsPath = (rings, map) => (c) => { for (const r of rings) { const q = map ? r.map(map) : r; c.moveTo(q[0][0], q[0][1]); for (let i = 1; i < q.length; i++) c.lineTo(q[i][0], q[i][1]); c.closePath(); } };
let SPLIT = null;
function strokeSets() {
  if (SPLIT) return SPLIT;
  const head = [], body = [], wingS = [], headPolys = [GEO.head, GEO.tuftL, ...GEO.tuftR];
  for (const s of STROKES) {
    const pts = [], w = [], v = [];
    for (let i = 0; i < s.length; i += 4) { pts.push([s[i], s[i + 1]]); w.push(s[i + 2]); v.push(s[i + 3]); }
    const mid = pts[Math.floor(pts.length / 2)];
    // fix pass 2: the traced strokes under the right tuft (looping squiggles) give way to the measured fringe (tuft.js)
    if (mid[0] > 1180 && mid[0] < 1262 && mid[1] > 145 && mid[1] < 236) continue;
    // ... and the ladder-like dashes on the flank give way to the measured long flank strokes (flank.js)
    if (inPoly(mid, FLANK_POLY) || inPoly(mid, WTIP_POLY)) continue;
    // ... and the heavy black ticks on the crown top give way to the measured fine hairlines (crown.js)
    if (inPoly(mid, CROWN_POLY) || inPoly(mid, CROWN3_POLY)) continue;
    // fix pass 3: ... and the sparse branching strokes under the cushion give way to the measured fan (under.js)
    if (inPoly(mid, UNDER_POLY) || inPoly(mid, SHOUL_POLY)) continue;
    if (headPolys.some((P) => inPoly(mid, P))) head.push({ pts, w, v });
    // fix pass 3: the wing's strokes are drawn crisp and 0.7x wide after the softening (the review measured their core
    // width 2.8 against the source's 2.0 px, and softer edges); the short crossing pieces at the upper wing edge
    // (x 1490-1540, y 440-470: X knots) are dropped
    else if (inPoly(mid, GEO.wing)) { if (!(mid[0] > 1490 && mid[0] < 1540 && mid[1] > 440 && mid[1] < 470 && pts.length < 6)) wingS.push({ pts, w, v }); }
    else body.push({ pts, w, v });
  }
  return (SPLIT = { head, body, wing: wingS });
}
// Each stroke is drawn in one tone (its darkest measured value); the width at each point is scaled so the ink mass
// (width x darkness) matches the measurement, so the pale ends of a stroke come out as a natural taper.
// F4c: dk darkens the ink tone at the same widths. The strokes were traced on the FINISHED frame (before degrade.py
// existed), so the finish's lift of thin dark lines was baked in: measured stroke contrast (9 px local max minus 3 px
// local min on the traced centre-lines) was 54.5 in the render against 75 in the source. The lift is largest for pale
// thin strokes, so dk ramps from 1 (strokes darker than 0.2: tail keylines, wing edge) to dk (0.7 and paler).
const INK_CAL = { w: 1.0, wMin: 0.7, dv: -0.02, end: 4, dk: 1.6 };
const WING_WK = 1.0;   // fix pass 3: wing strokes drawn crisp at this width (0.7 lost too much ink: wing sigma 12 error 3.3 -> 5.2)
function drawStrokes(g, set, map, maskCol = null, grow = 0, wk = 1) {
  for (const st of set) {
    const pts = map ? st.pts.map(map) : st.pts, n = pts.length;
    if (n < 2) continue;
    let vm = 1; for (const v of st.v) vm = Math.min(vm, v);
    const vd0 = clamp(vm + INK_CAL.dv), wm = st.w.map((w, i) => w * (1 - st.v[i]) / Math.max(0.05, 1 - vd0));
    const vd = clamp(1 - (1 - vd0) * (1 + (INK_CAL.dk - 1) * clamp((vd0 - 0.2) / 0.5)));   // pale strokes darken most
    const per = 4, q = sampleCurve(pts, per);
    const S = [0]; for (let i = 1; i < q.length; i++) S.push(S[i - 1] + Math.hypot(q[i][0] - q[i - 1][0], q[i][1] - q[i - 1][1]));
    const L = S[S.length - 1];
    const wAt = (i) => { const f = i / per, a = Math.min(n - 1, Math.floor(f)), b = Math.min(n - 1, a + 1), t = f - a; return wm[a] + (wm[b] - wm[a]) * t; };
    taper(g, q, (u) => {
      const i = Math.round(u * (q.length - 1)), s = S[i];
      const e = Math.min(1, s / INK_CAL.end, (L - s) / INK_CAL.end);
      return Math.max(INK_CAL.wMin, wAt(i) * INK_CAL.w * wk) * (0.35 + 0.65 * Math.sqrt(Math.max(0, e))) + grow;
    }, maskCol || gv(vd));
  }
}

// fix pass 3: the fan of fine dark strokes under the cushion (./under.js; the traced strokes there branched like twigs
// and were too sparse: box 1240-1300 x 380-430 read 130 against the source's 114)
let UNDER_P = null;
function underStrokes(g, rig, col = null, grow = 0) {
  if (!UNDER_P) UNDER_P = parseStrokes([...UNDER, ...SHOUL]);
  for (const st of UNDER_P) toneRuns(g, st, { wq: 0.8, dv: -0.14, q: 0.15, map: rig.head ? rig.warp : null, col, grow });
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
  // fix pass 3: the lower block re-measured (column maxima of the pre-finish source over x 815-850): four rows of
  // dashes centred ~64 / 75 / 91 / 102 with crisp dark dividers at ~69, 82-86, 97, 108 (was six even rows that read
  // as soft vertical ribs); its pale end face is a slanted slab from (811, 66) down to (798, 97), and left of it the
  // source is black (the old pale strip at x 796-801 is gone)
  for (const [key, rows, pale, dh] of [["top", [27, 35, 43, 51], [[832, 10], [846, 17], [824, 55], [810, 48]], 2.6], ["low", [64, 75, 91, 102], [[809, 63], [815, 64], [803, 98], [796, 98]], 3.4]]) {
    const q = F[key];
    g.fillStyle = gv(0.06); g.beginPath(); polyPath(g, q); g.fill();
    g.save(); g.beginPath(); polyPath(g, q); g.clip();
    g.strokeStyle = gv(0.9, 0.95); g.lineCap = "round";
    const r = rng(key === "top" ? 5 : 6);
    for (const y of rows) for (let x = 800 + (y - 10) * -0.25; x < 900; x += 6.8 + r() * 0.8) {
      g.lineWidth = 1.9 + r() * 0.7;
      g.beginPath(); g.moveTo(x, y + dh); g.lineTo(x + 2.4 * dh / 2.6, y - dh); g.stroke();
    }
    if (key === "low") { g.strokeStyle = gv(0.05); g.lineWidth = 1.8; for (const y of [69.5, 83, 85.5, 97, 108.5]) { g.beginPath(); g.moveTo(796, y - 1); g.lineTo(870, y + 1.5); g.stroke(); } }
    g.restore();
    g.fillStyle = gv(0.84); g.beginPath(); polyPath(g, pale); g.fill();
    g.strokeStyle = LINE; g.lineWidth = 1.6; g.beginPath(); polyPath(g, q); g.stroke();
    g.beginPath(); polyPath(g, pale); g.stroke();
  }
}

// fix pass 2: the flank under the folded wing — the measured long parallel feather strokes (flank.js), and a ragged
// fur fringe on the lower contour (the render's edge was a smooth cut; the source's breaks into short grey feather
// tips hanging down-left): short tapered strokes crossing the contour, a few pale tips past it
let FLANK_P = null, WTIP_P = null;
const FLANK_EDGE = [[1392, 896], [1440, 892], [1480, 882], [1520, 869], [1560, 856], [1600, 846], [1640, 834], [1680, 819], [1703, 806]];
function flank(g, rig, maskCol = null) {
  if (!FLANK_P) FLANK_P = parseStrokes(FLANK);
  const map = rig.head ? rig.warp : null;
  for (const st of FLANK_P) measuredLine(g, st, { w0: 1.1, w1: 2.3, dv: -0.35, map, col: maskCol, grow: maskCol ? 1.2 : 0 });
  if (!WTIP_P) WTIP_P = parseStrokes(WTIP);
  for (const st of WTIP_P) measuredLine(g, st, { w0: 1.2, w1: 4.5, dv: -0.2, map, col: maskCol, grow: maskCol ? 1.2 : 0 });
  const e = sampleCurve(W(rig, FLANK_EDGE), 6), r = rng(733 + 1);
  for (let k = 0; k < 22; k++) {
    const i = Math.min(e.length - 2, Math.floor((k + r() * 0.8) / 22 * (e.length - 1))), a = e[i], b = e[i + 1];
    const t = V.nrm(V.sub(a, b)), n = [t[1], -t[0]];            // t points back toward the chest (left), n outward (down)
    const p0 = V.add(a, V.mul(n, -(4 + r() * 6))), d = V.nrm(V.add(V.mul(t, 0.8), V.mul(n, 0.45 + r() * 0.3))), L = 10 + r() * 14;
    const tip = V.add(p0, V.mul(d, L)), pale = r() < 0.4;
    if (maskCol) { taper(g, [p0, V.mix(p0, tip, 0.5), tip], () => 3, maskCol); continue; }
    taper(g, sampleCurve([p0, V.add(V.mix(p0, tip, 0.5), V.mul(n, 1)), tip], 4), (u) => (pale ? 2.4 : 1.6) * (1 - 0.85 * u), pale ? gv(0.86) : gv(0.45 + r() * 0.15));
  }
}
function tail(g, rig) {
  if (PROC) return tailOld(g, rig);
  // three long pale feathers (measured outline: the dark gaps between them are notches in the silhouette)
  // fix pass 2: the two notches between the feathers are closed in the outline (the source's separations are a thin
  // dark line and a tapering dark gap, drawn below as measured lines: the traced notch read as a heavy black wedge);
  // the feather fill is ~15/255 lighter (source)
  const R0 = TAIL_RINGS[0].filter((p, i) => !((i >= 37 && i <= 40) || (i >= 53 && i <= 58)));
  const path = ringsPath([R0], rig.warp);
  g.save(); g.beginPath(); path(g); g.clip();
  g.fillStyle = gv(0.82); g.fillRect(1600, 650, 400, 260);
  g.filter = "blur(10px)";
  g.fillStyle = gv(0.9); g.beginPath(); smoothPath(g, W(rig, [[1760, 735], [1840, 772], [1935, 830], [1900, 840], [1800, 800], [1750, 790]]), true); g.fill();
  g.fillStyle = gv(0.88); g.beginPath(); smoothPath(g, W(rig, [[1745, 800], [1850, 838], [1905, 846], [1860, 846], [1750, 812]]), true); g.fill();
  g.filter = "none";
  g.restore();
  drawStrokes(g, parseStrokes(TAIL_LINES), rig.head ? rig.warp : null);
  const map = rig.head ? rig.warp : null;
  measuredLine(g, parseStrokes([TAILX.gapLow])[0], { w0: 2, w1: 4.5, map });
  // fix pass 3: the middle separation redrawn as one smooth straight dark band (the traced gap read as a ragged, wavy
  // crack, sat 4-5 px high at x 1805-1820 and stopped at x ~1855). Column minima of the pre-finish source: centre
  // (1760, 782) ... (1880, 825) ... (1925, 842), dark width ~9 px at x 1790-1820 narrowing to ~6 at 1880 and 2 at the tip
  const GAP = [[1760, 782, 3], [1790, 793, 8.5], [1805, 799.5, 9], [1820, 806, 8.5], [1835, 811, 7], [1850, 816, 7], [1865, 821, 6.5], [1880, 825.5, 5.5], [1895, 831, 4], [1910, 836, 2.8], [1925, 841.5, 1.6]];
  const gq = GAP.map(([x, y]) => (map ? map([x, y]) : [x, y]));
  taper(g, sampleCurve(gq, 4), (u) => { const f = u * (GAP.length - 1), i = Math.min(GAP.length - 2, Math.floor(f)), t = f - i; return GAP[i][2] + (GAP[i + 1][2] - GAP[i][2]) * t; }, gv(0.05));
  // fur ticks along the under-tail contour (the source's lower edge is ragged)
  const e = sampleCurve(W(rig, [[1727, 802], [1765, 816], [1810, 831], [1849, 844], [1895, 846]]), 5), r = rng(912);
  for (let k = 0; k < 9; k++) {
    const i = Math.min(e.length - 2, Math.floor((k + 0.2 + r() * 0.6) / 9 * (e.length - 1))), a = e[i], b = e[i + 1], t = V.nrm(V.sub(a, b)), n = [t[1], -t[0]];
    const p0 = V.add(a, V.mul(n, -3)), tip = V.add(p0, V.mul(V.nrm(V.add(t, V.mul(n, 0.35))), 8 + r() * 8));
    taper(g, [p0, V.mix(p0, tip, 0.5), tip], (u) => 1.8 * (1 - 0.85 * u), gv(0.55 + r() * 0.2));
  }
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
    // fix pass 2: the near (right) foot's toes are lit in the source (box mean 14-18 levels over the render at
    // sigma 12): lighter fill, much weaker shading there
    const right = rings === FEET_R_RINGS;
    // fix pass 3: the far (left) foot was 12 levels too dark at sigma 12 (toes 8 levels darker, 11% fewer lit pixels):
    // lighter fill and shading; the right foot came out 7 levels too bright: a touch darker
    g.fillStyle = gv(right ? 0.86 : 0.95); g.fillRect(1040, 840, 440, 110);
    g.filter = "blur(7px)";
    for (const [x, y] of sh) { const q = rig.warp([x, y]); g.fillStyle = gv(0.66, right ? 0.12 : 0.22); g.beginPath(); g.ellipse(q[0], q[1], 18, 12, 0, 0, TAU); g.fill(); }
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
  // (fix 1: the grey patch beside the beak is gone — the source is white there, crossed by the dark cheek strokes)
  // soft grey round the eye sockets (the inner facial disc)
  if (PROC) for (const e of [GEO.eyeR, GEO.eyeL]) softShade(g, union, (c) => { const q = rig.hm([e.ring[0], e.ring[1] + 4]); c.ellipse(q[0], q[1], e.ring[2] + 26, e.ring[3] + 24, 0, 0, TAU); }, 0.8, 0.45, 12);
  // the cup's shadow on the shoulder, under its lower right
  softShade(g, union, (c) => { const q = rig.hm([1418, 404]); c.ellipse(q[0], q[1], 44, 22, 0.3, 0, TAU); }, 0.3, 0.55, 12);
  return { body, head, tl, tr, union };
}

// the folded wing: mid-grey plumage, scalloped covert rows, primaries running to the tip, feathered back edge
function wing(g, rig) {
  const Wp = W(rig, GEO.wing), path = blob(Wp);
  plumage(g, path, { base: 0.9, shade: 0.77, light: LIGHT, depth: 70, blur: 34 });
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
    // fix pass 2: the bold black hook closing the primaries at the wing tip (measured, tailx.js)
    measuredLine(g, parseStrokes([TAILX.tipV])[0], { w0: 3, w1: 6, map: rig.head ? rig.warp : null });
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

// F4c: the measured value correction (./tone.js): soft Gaussian light / shade blobs, added ("lighter") or subtracted
// ("difference": |dst - src| = dst - src on the bright plumage) inside the plumage + wing silhouette, before the ink.
// Head blobs ride the head rig, body blobs the body warp (pops).
function toneCorrect(g, rig, M) {
  const wingP = W(rig, GEO.wing);
  g.save(); g.beginPath(); M.union(g); smoothPath(g, wingP, true); g.clip("nonzero");
  for (const [x, y, sg, A] of TONE) {
    const p = inPoly([x, y], GEO.head) ? rig.hm([x, y]) : rig.warp([x, y]), R = sg * 3, a = Math.abs(A);
    const gr = g.createRadialGradient(p[0], p[1], 0, p[0], p[1], R);
    for (let i = 0; i <= 12; i++) { const t = i / 12, v = Math.round(a * Math.exp(-4.5 * t * t)); gr.addColorStop(t, `rgb(${v},${v},${v})`); }
    g.globalCompositeOperation = A > 0 ? "lighter" : "difference";
    g.fillStyle = gr; g.beginPath(); g.arc(p[0], p[1], R, 0, TAU); g.fill();
  }
  g.globalCompositeOperation = "source-over";
  g.restore();
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
  // (F4c: the source's belly contour is smooth; only a few tips remain)
  walk(sampleCurve(bel, 10), 95, 414, (p, t, u, r) => {
    const out = [-t[1], t[0]], d = V.nrm(V.add(V.mul(out, 0.45), V.mul(t, 0.9)));
    const L = 8 + r() * 14, w0 = 5 + r() * 5, b0 = V.sub(p, V.mul(t, w0)), tip = V.add(p, V.mul(d, L));
    g.fillStyle = gv(0.9); g.beginPath(); g.moveTo(b0[0], b0[1]); g.quadraticCurveTo(p[0] + d[0] * L * 0.4, p[1] + d[1] * L * 0.4, tip[0], tip[1]); g.lineTo(p[0] + t[0] * 2, p[1] + t[1] * 2); g.closePath(); g.fill();
    ink(g, [V.add(b0, V.mul(out, -3)), V.mix(b0, tip, 0.6), tip], 0.9, gv(0.4, 0.6), { end: 0.1 });
  });
  edgeHair(g, rig);
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

// fur breaking out of the lit silhouette (the source's lit edge is feathered over 8–29 px, not a vector cut): pale
// tapered strands pushed out along the outward normal turned ~20° down, a few grey ones among them; and fur hanging
// over the tops of the toes between the feet.
function edgeHair(g, rig) {
  const r = rng(4242);
  const head = GEO.head, i1 = head.findIndex((p) => p[0] === 810 && p[1] === 581);   // (fix pass 2: the chin point moved 2 px in)
  // F4c: the source's lit edge is a clean, softly rolled-off contour (4x crops at 34.0 s) with only an occasional
  // feather tip breaking it; the dense serrated comb (step 8) read as a hairy fringe, so the tips are now ~6x rarer
  const runs = [
    { pts: head.slice(i1).map(rig.hm), step: 52, gap: 20, len: [3, 13], out: 1 },          // chin -> up the lit left side
    { pts: W(rig, [[810, 581], [860, 596], [899, 623], [915, 642], [949, 695], [990, 746], [1038, 790], [1071, 821], [1125, 851], [1186, 878]]).slice(1), step: 52, gap: 30, len: [3, 13], out: -1 },
  ];
  for (const R of runs) {
    const q = sampleCurve(R.pts, 12);
    let acc = 0;
    for (let i = 1; i < q.length; i++) {
      const a = q[i - 1], b = q[i], seg = Math.hypot(b[0] - a[0], b[1] - a[1]); acc += seg;
      while (acc > R.gap) {
        acc -= R.gap; R.gap = R.step * (0.35 + 1.3 * r());
        const t = V.nrm(V.sub(b, a)), n = [R.out * t[1], -R.out * t[0]];   // outward normal
        const d = V.nrm(V.add(V.add(n, [0.05, 0.38]), V.mul(t, (r() - 0.5) * 0.6)));
        // mostly feather tips (the silhouette itself serrated: a wide base on the edge, a short point out and down),
        // now and then a single fine hair
        const hair = r() < 0.35, L = hair ? 3 + r() * 7 : 2 + Math.pow(r(), 1.5) * 5, w0 = hair ? 1 + r() * 0.5 : 2 + r() * 2.2;
        const p0 = V.add(b, V.mul(n, -(hair ? 2 : 3.5)));
        const tip = V.add(V.add(p0, V.mul(d, L + (hair ? 2 : 3.5))), V.mul(t, (r() - 0.5) * 2.5));
        const mid = V.add(V.mix(p0, tip, 0.5), V.mul(n, (r() - 0.5) * 1.2));
        const dark = r() < 0.08;
        taper(g, sampleCurve([p0, mid, tip], 4), (u) => w0 * Math.pow(1 - u, hair ? 1 : 0.8) + 0.25, dark ? gv(0.4 + r() * 0.15) : hair ? gv(0.72 + r() * 0.2) : gv(0.9 + r() * 0.06));
      }
    }
  }
  // fur hanging over the toes between the feet — fix pass 3: removed (the 36 short pale strands read as an evenly
  // spaced comb and put the belly edge 4-8 px below the source's clean edge); the random stream is still advanced so
  // the strands after it keep their seeded shapes
  for (let k = 0; k < 36; k++) { r(); r(); r(); r(); r(); r(); r(); }
  // fix pass 2: lit fluffy belly feathers hanging over the top of the near (right) foot, a few dark ink hairs among them
  const bellyR = sampleCurve(W(rig, [[1290, 896], [1330, 897], [1370, 896], [1410, 896], [1450, 897]]), 10);
  for (let k = 0; k < 18; k++) {
    const j = Math.min(bellyR.length - 1, Math.floor((k + r() * 0.9) / 18 * bellyR.length)), p = V.add(bellyR[j], [(r() - 0.5) * 3, -(2 + r() * 5)]);
    const d = V.nrm([0.3 + (r() - 0.5) * 0.5, 1]), L = 9 + r() * 10, dark = k % 5 === 2;
    taper(g, sampleCurve([p, V.add(p, V.mul(d, L * 0.5)), V.add(p, V.mul(d, L))], 4), (u) => (dark ? 1.4 : 2.6) * (1 - 0.85 * u), dark ? gv(0.3) : gv(0.86 + r() * 0.1));
  }
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
const LOBE3_BASE = 0.68;
// crown hairlines (fix pass 3): fine pale lines lose ~0.25 of their core to the softening; the dark curve keeps its weight
const crownOpts = (st) => { const vm = st.v.slice().sort((a, b) => a - b)[st.v.length >> 1]; return vm < 0.3 ? { w0: 1.2, w1: 3.4, dv: -0.03, ends: 0.18 } : { w0: 0.9, w1: 1.6, dv: -0.34, ends: 0.16 }; };
function tuftStrokes(g) {
  const T = GEO.tuftR;
  const dark = [
    [[1240, 56], [1222, 72], [1198, 88], [1170, 100]], [[1236, 70], [1212, 90], [1186, 106]], [[1150, 86], [1128, 98], [1112, 112]],
    [[1243, 106], [1222, 118], [1196, 128], [1166, 138]], [[1236, 116], [1206, 132], [1180, 140]],
  ];
  dark.forEach((s) => line(g, s, swell(2.6, 0.05, 0.6), gv(0.1, 0.9)));
  for (const st of parseStrokes(CROWN3)) measuredLine(g, st, crownOpts(st));
  // fix pass 2 (./tuft.js): the black notch between the first and second lobes; the third, rounded lobe is grey —
  // dense dark strokes running along it (~29°, 4.5 px apart; source pre-finish mean 127, the render had 200) under a
  // dark line where it meets the second lobe; and under it the fan of short parallel grey strokes (measured) out to
  // the cushion edge (the traced strokes there were looping squiggles)
  g.fillStyle = gv(0.03); g.beginPath(); smoothPath(g, NOTCH, true, 0.3); g.fill();
  g.save(); g.beginPath(); smoothPath(g, LOBE3, true, 0.3); g.clip();
  // fix pass 3: the lobe's own measured strokes (irregular spacing and curvature, lit gaps between them) over a lit
  // base, instead of the evenly ruled parallel fill
  g.fillStyle = gv(LOBE3_BASE); g.fillRect(1215, 115, 70, 55);
  for (const st of parseStrokes(LOBE3_INK)) toneRuns(g, st, { wq: 0.6, dv: -0.12, q: 0.2 });
  g.restore();
  line(g, [[1229, 128], [1236, 124], [1246, 125], [1256, 131]], swell(2, 0.3, 0.6), gv(0.12));
  // fix pass 3: the second lobe's lower edge runs on down-left as a dark line to (1190, 150) (column minima of the
  // pre-finish source: 1192 y149 / 1204 y147 / 1216 y142 / 1228 y132, core ~0.1, darkest mid-way); it was missing
  taper(g, sampleCurve([[1188, 150], [1198, 148.3], [1210, 145.3], [1222, 137.5], [1231, 130]], 4), (u) => 0.6 + 2.4 * Math.pow(Math.sin(Math.PI * clamp(0.15 + u * 0.7)), 0.7), gv(0.08));
  for (const k of Object.keys(FRINGE)) { const F = FRINGE[k]; if (F.pts.length >= 2) taper(g, sampleCurve(F.pts, 3), (u) => 2.0 * Math.pow(Math.sin(Math.PI * clamp(u)), 0.5) + 0.3, gv(F.v - 0.22)); }   // thin grey lines lose ~0.2 of their core to the softening
  if (PROC) for (const t of T) strokeFamily(g, t.slice(0, 4), { n: 4, spread: 4, w: 1.1, col: gv(0.45, 0.5), seed: 560 });
  // left tuft: grey right half, dark edge along the right side
  // left tuft: near-white; the black wedge between it and the far band's lower slider, its heavy right outline
  // (fix pass 2: re-measured on the pre-finish row map — the black runs x 802-808 down to y ~104, then along the
  // slider's foot to (812, 114); x 796-801 is a pale grey strip, not black)
  // fix pass 3: x 794-802, y 62-84 is black in the source (5-15); the lit bits at y 86-98 are the slider's slanted end face
  g.fillStyle = gv(0.04); g.beginPath(); polyPath(g, [[792, 60], [808, 60], [808, 64], [800, 84], [796, 98], [792, 98]]); g.fill();
  if (!PROC) return;
  line(g, [[781, 70], [790, 95], [796, 112]], swell(2.2, 0.1), gv(0.12, 0.85));
  line(g, [[776, 72], [760, 96], [746, 124]], swell(1.2, 0.1), gv(0.35, 0.6));
}

// (fix 1: the parametric lids, rings, lashes and shut-eye strokes were replaced by the traced eye ink below)
// the fan of fine dark feather strokes off the beak's upper right edge (measured on a contrast-stretched 4x crop of
// the 34.0 s frame: base, tip)
const CHEEK_FAN = [[[909, 447], [920, 462]], [[917, 452], [930, 472]], [[926, 457], [939, 482]], [[934, 467], [947, 492]], [[941, 477], [955, 497]], [[951, 486], [970, 510]], [[960, 490], [980, 515]], [[975, 497], [992, 515]], [[987, 500], [1012, 520]], [[1002, 506], [1025, 520]], [[1020, 512], [1039, 522]]];
function cheekFan(g, maskCol = null, grow = 0) {
  const r = rng(733);
  for (const [a, b] of CHEEK_FAN) {
    const m = V.add(V.mix(a, b, 0.5), V.mul(V.perp(V.nrm(V.sub(b, a))), 1.2));
    const w = 1.9 + 0.6 * r(), v = 0.36 + 0.08 * r();
    taper(g, sampleCurve([a, m, b], 5), (u) => w * Math.pow(Math.sin(Math.PI * Math.min(1, 0.12 + u * 0.88)), 0.6) + grow, maskCol || gv(v));
  }
}

// Measured eye ink (./eyes.js): each drawing's own eyes, traced on its source frame (stare 850, glare 880, shut 882)
// as outline rings of the black and of two or three soft-ink levels; drawn in that frame's pixels (after the head
// transform), over white openings. Replaces the parametric lids, rings and the curled lash strokes.
function eyeWhites(g, state) {
  if (state === "closed") return;
  for (const e of [GEO.eyeR, GEO.eyeL]) { const [cx, cy, rx, ry] = e.ring; g.fillStyle = gv(0.975); g.beginPath(); g.ellipse(cx, cy, rx - 3, ry - 3, 0, 0, TAU); g.fill(); }
}
// fix pass 2: the beak of each drawing (./beak.js): measured shading planes, the gape's lens and lower mandible, and one
// continuous contour line from the cere down the left side to the hook tip and back along the cutting edge, the gape's
// two dark edges and the lower mandible's inner line (snapped centre-lines with measured width and core value)
const BEAK_BOX = { stare: [850, 440, 965, 570], glare: [845, 475, 960, 600], closed: [845, 500, 965, 630] };
let BEAK_P = null;
function beakInk(g, state) {
  if (!BEAK_P) { BEAK_P = {}; for (const k of Object.keys(BEAKS)) { const B = BEAKS[k], o = { ...B }; for (const n of ["contour", "upper", "lower", "mid"]) o[n] = parseStrokes([B[n]])[0]; BEAK_P[k] = o; } }
  const B = BEAK_P[state]; if (!B) return;
  const plane = (P) => (x, y) => clamp(P[0] + P[1] * x + P[2] * y, 0.04, 0.97);
  const grad = (P, pts) => {
    let cx = 0, cy = 0; for (const [x, y] of pts) { cx += x; cy += y; } cx /= pts.length; cy /= pts.length;
    const n = Math.hypot(P[1], P[2]) || 1, dx = P[1] / n, dy = P[2] / n, f = plane(P), gr = g.createLinearGradient(cx - dx * 60, cy - dy * 60, cx + dx * 60, cy + dy * 60);
    for (let i = 0; i <= 8; i++) { const u = i / 8, x = cx + dx * (-60 + 120 * u), y = cy + dy * (-60 + 120 * u); gr.addColorStop(u, gv(f(x, y))); }
    return gr;
  };
  const body = [...B.contour.pts, ...B.upper.pts], lens = [...B.upper.pts, ...B.lower.pts.slice().reverse()], low = [...B.mid.pts, ...B.lower.pts.slice().reverse()];
  // the upper mandible's shading fades out (blurred 4 px) under the plumage above the gape
  const f1 = g.filter;
  g.filter = "blur(4px)"; g.fillStyle = grad(B.shade, body); g.beginPath(); smoothPath(g, body, true, 0.2); g.fill(); g.filter = f1;
  g.fillStyle = grad(B.lens, lens); g.beginPath(); smoothPath(g, lens, true, 0.2); g.fill();
  g.fillStyle = gv(B.low); g.beginPath(); smoothPath(g, low, true, 0.2); g.fill();
  // widths: the snapped FWHM less the measuring blur (sigma 0.8 -> 1.9 px in quadrature); tapered only at free ends
  const stroke = (st, w0, w1, e0 = true, e1 = true) => {
    const n = st.pts.length, q = sampleCurve(st.pts, 3), per = 3;
    const at = (arr, i) => { const f = i / per, a = Math.min(n - 1, Math.floor(f)), b = Math.min(n - 1, a + 1), t = f - a; return arr[a] + (arr[b] - arr[a]) * t; };
    let vs = 0; for (const v of st.v) vs += v; vs /= n;
    taper(g, q, (u) => { const i = Math.round(u * (q.length - 1)), w = Math.sqrt(Math.max(0, at(st.w, i) ** 2 - 3.6)), e = Math.min(1, e0 ? u * 10 : 1, e1 ? (1 - u) * 10 : 1); return clamp(w, w0, w1) * (0.4 + 0.6 * e); }, gv(clamp(vs)));
  };
  // the contour runs on into the gape's upper edge (the cutting edge rises from the hook tip into the mouth line)
  const C = B.contour, U = B.upper, cont = { pts: [...C.pts, U.pts[0], U.pts[1]], w: [...C.w, U.w[0], U.w[1]], v: [...C.v, C.v[C.v.length - 1], C.v[C.v.length - 1]] };
  stroke(B.mid, 1.2, 3.5); stroke(B.lower, 2, 6, false, true); stroke(U, 2, state === "closed" ? 10 : 5, false, true); stroke(cont, 2, 4.5, true, false);
  const [nx, ny, rx, ry, na] = B.nostril;
  g.fillStyle = gv(0.12); g.beginPath(); g.ellipse(nx, ny, rx, ry, na * Math.PI / 180, 0, TAU); g.fill();
  if (state === "stare") {
    // fix pass 3 (stare): the upper mandible's right half carries fine pale hatch strokes running down-left to the gape
    // (source 5x crop, x 912-950, y 476-532); the soft shadow under the lower mandible's right (~(970, 550))
    for (const [x, y, L] of [[927, 478, 34], [931, 476, 44], [936, 478, 44], [941, 482, 38], [945, 487, 30], [949, 493, 20]]) line(g, [[x, y], [x - L * 0.17, y + L * 0.5], [x - L * 0.36, y + L]], swell(1.3, 0.2, 0.6), gv(0.6));
    g.save(); g.filter = "blur(6px)"; g.fillStyle = "rgba(0,0,0,0.06)"; g.beginPath(); g.ellipse(970, 550, 16, 10, 0.3, 0, TAU); g.fill(); g.restore();
  }
}
function tracedEyes(g, state) {
  const E = EYES[state]; if (!E) return;
  // F4c: the beak's soft-ink levels (the last three) are flat posterized rings that read as blotches next to the
  // source's smooth beak shading, so they are softened (2 px) into a gradient; the eye levels keep the 0.45 px finish
  // (F4c also tried re-tracing the eye rings as ridge strokes: the thin rings split into dashes at skeleton junctions
  // and read broken at 1x, so the level outlines stay)
  const f0 = g.filter, nEye = E.grey.length - 3;
  // fix pass 2: the beak's traced levels (the last three) and black rings are replaced by the drawn beak (beakInk)
  E.grey.forEach(([v, rings], i) => { if (i >= nEye) return; g.fillStyle = gv(v); g.beginPath(); for (const r of rings) ringPath(g, r); g.fill("evenodd"); });
  g.filter = f0;
  // F4c: each eye's black ring inked as one clean line along its measured centre-line (./rings.js), over the soft
  // levels, so the ring does not read as grey patches and breaks at close zoom
  const RG = RINGS[state];
  // fix pass 3: the rings read 15-35 levels darker than the source (radial minima 47-68 against 65-112) and 1-2 px
  // wide on the lower arcs: ink 0.05 -> 0.13, 1 px off the width below the eye's centre
  if (RG) for (const runs of Object.values(RG)) {
    let cy = 0, cn = 0; for (const run of runs) for (const p of run) { cy += p[1]; cn++; } cy /= Math.max(1, cn);
    for (const run of runs) {
      const q = sampleCurve(run.map(([x, y]) => [x, y]), 4), n = run.length;
      taper(g, q, (u) => { const f = u * (n - 1), i = Math.min(n - 2, Math.floor(f)), t = f - i, w = run[i][2] + (run[i + 1][2] - run[i][2]) * t, y = run[i][1] + (run[i + 1][1] - run[i][1]) * t;
        return clamp(w - clamp((y - cy) / 6), 1.4, 6) * Math.min(1, 0.35 + Math.min(u, 1 - u) * 8); }, gv(0.13));
    }
  }
  const bx = BEAK_BOX[state];
  g.fillStyle = gv(0.03); g.beginPath(); for (const r of E.dark) { const b = bboxOf(r, 0), cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2; if (!(cx > bx[0] && cx < bx[2] && cy > bx[1] && cy < bx[3])) ringPath(g, r); } g.fill("evenodd");
  beakInk(g, state);
  if (state === "closed") {
    // the shut eyeballs' soft round lid contours (measured radial minima on frame 882: 8–17 levels under the plumage)
    g.save(); g.filter = "blur(1.6px)";
    for (const [pts, v] of [[[[724, 486], [720, 475], [718, 465], [720, 454], [724, 441], [731, 431]], 0.875], [[[800, 427], [810, 435], [818, 443], [825, 451], [830, 461], [834, 471]], 0.885],
      [[[921, 441], [922, 424], [929, 411], [938, 399]], 0.91], [[[1058, 372], [1065, 383], [1069, 395], [1068, 410]], 0.88]]) line(g, pts, swell(4.5, 0.2, 0.6), gv(v));
    g.restore();
  }
}

// beak base (head coords): the pale shield under the measured beak ink (./eyes.js, drawn with the eyes); in the pops the
// beak opens, so the base also covers a little round it
function beakBase(g, state) {
  const B = GEO.beak;
  if (state !== "stare") { g.strokeStyle = gv(0.95); g.lineWidth = state === "closed" ? 20 : 14; g.beginPath(); smoothPath(g, B.out, true); g.stroke(); }
  fillPts(g, B.out, gv(0.945));
}
// bandage (measured on the 34.0 s frame, 5x crops): a long perforated strip curving over the brow from lower left to
// upper right (its right end tucked under the far headband), and the short padded strip crossing ON TOP of it,
// upper-left to lower-right, with a V crease. Near-white fill, thin grey outlines, and the heavy black line of the long
// strip's upper edge (it also carries the shadow of the far band and tuft).
const BANDAGE = {
  longTop: [[727, 191], [730, 189], [742, 173.5], [754, 161], [766, 147.5], [778, 136], [790, 126.5], [800, 120], [812, 114], [830, 107], [848, 100], [866, 94], [884, 90], [900, 89]],
  longBot: [[906, 95], [905, 103], [896, 108], [880, 117], [864, 126], [848, 135], [830, 146], [808, 160], [786, 176], [772, 184.5], [760, 195], [748, 205], [736, 212], [727, 211], [723, 202]],
  pad: [[767, 153], [790, 134], [810, 119], [820, 116], [831, 119], [841, 128], [850, 138], [862, 146], [869, 159], [871, 177], [867, 193], [856, 203], [837, 208], [818, 206], [808, 198], [788, 176]],
  heavy: [[722, 197], [730, 189], [742, 173.5], [754, 161], [766, 147.5], [778, 136], [790, 126.5], [800, 120], [812, 114]],
  crease: [[[776, 147], [783, 154], [790, 162]], [[797, 165], [812, 152], [830, 141]]],
  fold: [[815, 120], [824, 126], [833, 134]],
  dots: [[762, 166], [753, 177], [767, 176], [744, 188], [757, 188], [748, 194], [840, 110], [855, 105], [845, 116], [864, 113], [851, 121], [880, 105], [870, 99], [841, 154], [827, 164], [851, 165], [812, 175], [836, 175], [822, 186]],
};
// fix pass 2 (./plaster.js): the plaster's outlines as measured continuous lines (source: 2-3 px at pre-finish ~90-110;
// the smooth-path keylines at 0.3-0.34, softened with the plumage, came out ~135 and broke up), drawn crisp with
// the headphone metal (head rig applied)
function bandageInk(g) {
  // the long strip's upper edge and rounded right end (under the far band's shadow in the stare; it shows when the
  // head drops in the pops): the measured keyline position, at the lines' measured weight
  const B = BANDAGE, top = [...B.longTop.slice(8), ...B.longBot.slice(0, 4)];
  g.strokeStyle = gv(0.3); g.lineWidth = 2.4; g.beginPath(); smoothPath(g, top, false, 0.35); g.stroke();
  for (const k of ["pad", "lowL", "lowR", "endL"]) {
    const st = parseStrokes([PLASTER[k]])[0], n = st.pts.length, q = sampleCurve(st.pts, 3), per = 3;
    const at = (arr, i) => { const f = i / per, a = Math.min(n - 1, Math.floor(f)), b = Math.min(n - 1, a + 1), t = f - a; return arr[a] + (arr[b] - arr[a]) * t; };
    const vs = st.v.slice().sort((a, b) => a - b)[n >> 1];
    taper(g, q, (u) => { const i = Math.round(u * (q.length - 1)), e = Math.min(1, u * 14, (1 - u) * 14); return clamp(Math.sqrt(Math.max(0, at(st.w, i) ** 2 - 3.6)), 1.8, 3.2) * (0.5 + 0.5 * e); }, gv(clamp(vs - 0.04)));
  }
}
function bandage(g) {
  const B = BANDAGE;
  const longPath = (c) => { const q = [...B.longTop, ...B.longBot]; smoothPath(c, q, true, 0.35); };
  const padPath = (c) => smoothPath(c, B.pad, true, 0.4);
  // long strip: flat near-white (shaded toward the tucked right end), thin grey keyline
  g.fillStyle = gv(0.9); g.beginPath(); longPath(g); g.fill();
  g.save(); g.beginPath(); longPath(g); g.clip(); g.filter = "blur(8px)"; g.fillStyle = gv(0.72, 0.6); g.beginPath(); g.ellipse(884, 102, 30, 14, -0.3, 0, TAU); g.fill(); g.filter = "none"; g.restore();
  // (fix pass 2: the outlines are the measured lines of bandageInk, drawn crisp after the softening)
  // pad strip on top
  g.fillStyle = gv(0.915); g.beginPath(); padPath(g); g.fill();
  line(g, B.fold, swell(1.6, 0.2), gv(0.4, 0.9));
  line(g, B.crease[0], swell(1.8, 0.15), gv(0.42, 0.9));
  line(g, B.crease[1], swell(2.0, 0.1, 0.7), gv(0.4, 0.9));
  // perforations
  g.fillStyle = gv(0.2);
  for (const [x, y] of B.dots) { g.beginPath(); g.arc(x, y, 1.9, 0, TAU); g.fill(); }
  // the heavy upper edge of the long strip, over both (5–7 px, tapering to the ends)
  line(g, B.heavy, (u) => 1.8 + 5 * Math.pow(Math.sin(Math.PI * clamp(u * 0.92 + 0.06)), 0.45), gv(0.14), 6);
}

// near headphone: slider blocks, collar, arm, cup. The cup is measured (./hp.js, source 34.0 s): the leather cushion is
// black with lit fold wedges (dot-screened) and rows of pale dots; the metal shell, yoke and plate rim are white
// scratchboard lines cut along the measured engraving flow (long curves that follow the cup); arm, crescent and plate
// are print halftone.
const ringPath = (c, pts) => { c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.closePath(); };
const bboxOf = (pts, m = 4) => { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } return [x0 - m, y0 - m, x1 + m, y1 + m]; };
// white scratchboard lines [x,y,w,...] (measured): width per point, short taper at the ends
function engraveLines(g, set, value, gain = 1) {
  const col = gv(value);
  for (const L of set) {
    const pts = [], w = [];
    for (let i = 0; i < L.length; i += 3) { pts.push([L[i], L[i + 1]]); w.push(L[i + 2]); }
    const n = pts.length; if (n < 2) continue;
    taper(g, pts, (u) => { const f = u * (n - 1), i = Math.min(n - 2, Math.floor(f)), t = f - i; const e = Math.min(1, (f * 3 + 1) / 4, ((n - 1 - f) * 3 + 1) / 4); return (w[i] + (w[i + 1] - w[i]) * t) * gain * (0.55 + 0.45 * e); }, col);
  }
}
// fix pass 2: the cup's metal (./hpx.js, trace/trace_cup2.py): base tone c0 + round Gaussians, clipped to the metal
// polygon, then the measured dark ink centre-lines (width = ink mass, tone = darkest value), short tapers at the ends
let METAL = null;
function metalBase() {
  if (METAL) return METAL;
  const bb = bboxOf(HPX_MET, 2), w = Math.ceil(bb[2] - bb[0]), h = Math.ceil(bb[3] - bb[1]);
  const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
  const c = cv.getContext("2d", { willReadFrequently: true }), img = c.createImageData(w, h), d = img.data, [c0, B] = HPX_BASE;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const x = bb[0] + i + 0.5, y = bb[1] + j + 0.5; let v = c0;
    for (const [bx, by, s, a] of B) { const q = ((x - bx) ** 2 + (y - by) ** 2) / (2 * s * s); if (q < 12) v += a * Math.exp(-q); }
    const o = (j * w + i) * 4; d[o] = d[o + 1] = d[o + 2] = Math.round(clamp(v) * 255); d[o + 3] = 255;
  }
  c.putImageData(img, 0, 0);
  return (METAL = { cv, x: bb[0], y: bb[1] });
}
const HPX_SETS = { ink: null };
// fix pass 3: the LOWER shell (below the J-hook, round the plate's bottom; ./shell.js, trace/trace_shell.py). The review
// found the fitted base blobs (amp +-0.6, sigma 10) and short traced ink pieces there read as camouflage daubs; the
// source has long fine streaks following the rim. Below SHELL.y0 the metal is now a smooth measured base with the
// measured lit and dark streaks followed along the streak flow (long taper lines); the old ink is dropped there.
const inShellZone = (x, y) => y > SHELL.y0 + 1 && x < 1398 && ((x - 1380) / 44) ** 2 + ((y - 278) / 80) ** 2 > 1;
let SHB = null;
function shellBase() {
  if (SHB) return SHB;
  const bx = 1250, by = SHELL.y0 - 2, w = 150, h = 108;
  const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
  const c = cv.getContext("2d", { willReadFrequently: true }), img = c.createImageData(w, h), d = img.data, [c0, B] = SHELL.base;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const x = bx + i + 0.5, y = by + j + 0.5; let v = c0;
    for (const [px, py, s, a] of B) { const q = ((x - px) ** 2 + (y - py) ** 2) / (2 * s * s); if (q < 12) v += a * Math.exp(-q); }
    const o = (j * w + i) * 4; d[o] = d[o + 1] = d[o + 2] = Math.round(clamp(v) * 255); d[o + 3] = Math.round(255 * clamp((y - SHELL.y0 + 1) / 8));
  }
  c.putImageData(img, 0, 0);
  return (SHB = { cv, x: bx, y: by });
}
let SHL = null;
const shellSets = () => SHL || (SHL = { dark: parseStrokes(SHELL.dark), lit: parseStrokes(SHELL.lit) });
// a measured centre-line split into runs of similar tone, drawn at its measured width less the measuring blur (in
// quadrature), 2 px tapers at the ends
function toneRuns(g, st, { wq = 1.2, wk = 1, dv = 0, q = 0.1, map = null, col = null, grow = 0 } = {}) {
  const n = st.pts.length; if (n < 2) return;
  const per = 3, pts = sampleCurve(map ? st.pts.map(map) : st.pts, per), S = [0];
  for (let i = 1; i < pts.length; i++) S.push(S[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const L = S[S.length - 1];
  const at = (arr, i) => { const f = i / per, a = Math.min(n - 1, Math.floor(f)), b = Math.min(n - 1, a + 1), t = f - a; return arr[a] + (arr[b] - arr[a]) * t; };
  const lv = (v) => Math.round(v / q);
  let i0 = 0;
  for (let i = 1; i <= pts.length; i++) {
    if (i < pts.length && lv(at(st.v, i)) === lv(at(st.v, i0))) continue;
    const base = Math.max(0, i0 - 1), seg = pts.slice(base, Math.min(pts.length, i + 1));
    let vs = 0; for (let k = i0; k < i; k++) vs += at(st.v, k); vs /= (i - i0);
    if (seg.length >= 2) taper(g, seg, (u) => { const k = Math.min(pts.length - 1, base + Math.round(u * (seg.length - 1))), s = S[k], e = Math.min(1, s / 2, (L - s) / 2), wm = at(st.w, k);
      return Math.sqrt(Math.max(0.5, wm * wm - wq * wq)) * wk * (0.35 + 0.65 * Math.sqrt(Math.max(0, e))) + grow; }, col || gv(clamp(vs + dv)));
    i0 = i;
  }
}
const edgeDist = (x, y) => { let m = 1e9; for (let i = 0; i < HPX_MET.length; i++) { const [ax, ay] = HPX_MET[i], [bx, by] = HPX_MET[(i + 1) % HPX_MET.length], dx = bx - ax, dy = by - ay, t = clamp(((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)); m = Math.min(m, Math.hypot(x - ax - t * dx, y - ay - t * dy)); } return m; };
// the old ink outside the lower shell only (each line split where it enters the zone)
function hpxInkOutside() {
  const out = [];
  for (const st of parseStrokes(HPX_INK)) {
    let cur = null;
    for (let i = 0; i < st.pts.length; i++) {
      const [x, y] = st.pts[i];
      // in the zone only the rim's black outline stays (black, within 6 px of the metal's edge), capped at 6 px
      const zone = inShellZone(x, y);
      if (zone && (st.v[i] > 0.1 || edgeDist(x, y) > 6)) { if (cur && cur.pts.length >= 2) out.push(cur); cur = null; continue; }
      if (!cur) cur = { pts: [], w: [], v: [] };
      cur.pts.push(st.pts[i]); cur.w.push(zone ? Math.min(6, st.w[i]) : st.w[i]); cur.v.push(st.v[i]);
    }
    if (cur && cur.pts.length >= 2) out.push(cur);
  }
  return out;
}
function metalCup(g, state, phase, wk = 1) {
  const MB = metalBase();
  g.save(); g.beginPath(); ringPath(g, HPX_MET); g.clip();
  if (phase === "base") {
    g.drawImage(MB.cv, MB.x, MB.y);
    const SB = shellBase(); g.drawImage(SB.cv, SB.x, SB.y);
    // right of the plate ring the cup is black in the source (pre-finish < 20 beyond x ~1400 at y 350, ~1424 at y 270)
    g.save(); g.beginPath(); ringPath(g, [[1400, 196], [1445, 196], [1445, 400], [1398, 400], [1398, 350]]); g.clip();
    g.fillStyle = gv(0.03); g.beginPath(); g.rect(1300, 150, 200, 300); g.ellipse(1379.5, 277.5, 44, 79.5, 0, 0, TAU); g.fill("evenodd"); g.restore();
    g.restore(); return;
  }
  if (!HPX_SETS.ink) HPX_SETS.ink = hpxInkOutside();
  // each centre-line is split into runs of similar tone (a streak crossing a black outline keeps its grey), drawn
  // with the measured width; the ends of the whole line taper over 3 px
  for (const st of HPX_SETS.ink) {
    const n = st.pts.length; if (n < 2) continue;
    const q = sampleCurve(st.pts, 3), S = [0], per = 3;
    for (let i = 1; i < q.length; i++) S.push(S[i - 1] + Math.hypot(q[i][0] - q[i - 1][0], q[i][1] - q[i - 1][1]));
    const L = S[S.length - 1];
    const at = (arr, i) => { const f = i / per, a = Math.min(n - 1, Math.floor(f)), b = Math.min(n - 1, a + 1), t = f - a; return arr[a] + (arr[b] - arr[a]) * t; };
    const lv = (v) => Math.round(v / 0.14);
    let i0 = 0;
    for (let i = 1; i <= q.length; i++) {
      if (i < q.length && lv(at(st.v, i)) === lv(at(st.v, i0))) continue;
      const seg = q.slice(Math.max(0, i0 - 1), Math.min(q.length, i + 1)), base = Math.max(0, i0 - 1);
      let vs = 0; for (let k = i0; k < i; k++) vs += at(st.v, k); vs /= (i - i0);
      if (seg.length >= 2) taper(g, seg, (u) => { const k = base + Math.round(u * (seg.length - 1)), s = S[k], e = Math.min(1, s / 3, (L - s) / 3); return at(st.w, k) * wk * (0.4 + 0.6 * Math.sqrt(Math.max(0, e))); }, gv(vs));
      i0 = i;
    }
  }
  // fix pass 3: the lower shell's measured streaks, lit then dark
  const SL = shellSets();
  for (const st of SL.lit) toneRuns(g, st, { wk, wq: 0.3, dv: 0.04 });
  for (const st of SL.dark) toneRuns(g, st, { wk, wq: 1.2 });
  g.restore();
}
// fix pass 3: the cushion's lit fold wedges (./cush.js): the review found the soft streamlines read as swirly low-contrast
// curls (fine detail 14.8 against the source's 21); the measured outlines of the lit wedges (two levels, each region
// filled with its measured tone) are drawn crisp, clipped to the cup
function cushionFolds(g, { dv = 0 } = {}) {
  g.save(); g.beginPath(); smoothPath(g, GEO.hp.cup, true); g.clip();
  for (const level of CUSH) for (const R of level) {
    g.fillStyle = gv(clamp(R.v + dv)); g.beginPath();
    for (const r of R.rings) { g.moveTo(r[0], r[1]); for (let i = 2; i < r.length; i += 2) g.lineTo(r[i], r[i + 1]); g.closePath(); }
    g.fill("evenodd");
  }
  g.restore();
}
// the plate's black outline ring: ellipse (1379.5, 277.5, 41.5 x 77); dark-run width per angle measured on the source
// (pre-finish < 60, sigma 1; angle from +x, y down): thick at the top where it meets the arm (~8 px), ~4 px upper right,
// a thin 2 px line down the left side and round the bottom
const RING_W = [[0, 3.5], [40, 4], [75, 2.5], [90, 2.2], [210, 2.2], [240, 2], [252, 4], [262, 8], [292, 7.5], [306, 5], [320, 4.2], [360, 3.5]];
const RING_O = [[0, 1.5], [40, 3], [75, 1], [100, 0.5], [200, -0.4], [245, -1.8], [260, 0], [300, -0.8], [340, 0.6], [360, 1.5]];
function plateRing(g) {
  const lerpT = (T, a) => { for (let i = 1; i < T.length; i++) if (a <= T[i][0]) { const f = (a - T[i - 1][0]) / (T[i][0] - T[i - 1][0]); return T[i - 1][1] + (T[i][1] - T[i - 1][1]) * f; } return T[T.length - 1][1]; };
  const out = [], inn = [];
  for (let a = 0; a < 360; a += 2) {
    const t = a * Math.PI / 180, ex = 1379.5 + 41.5 * Math.cos(t), ey = 277.5 + 77 * Math.sin(t);
    let nx = Math.cos(t) / 41.5, ny = Math.sin(t) / 77; const nn = Math.hypot(nx, ny); nx /= nn; ny /= nn;
    const o = lerpT(RING_O, a), w = lerpT(RING_W, a) + 0.5;
    out.push([ex + nx * (o + w / 2), ey + ny * (o + w / 2)]); inn.push([ex + nx * (o - w / 2), ey + ny * (o - w / 2)]);
  }
  g.fillStyle = gv(0.03); g.beginPath(); ringPath(g, out); ringPath(g, inn.reverse()); g.fill("evenodd");
}
function headphone(g, state, phase = "both") {
  const H = GEO.hp;
  if (phase !== "crisp") {
  // band rising out of frame above the block (seen in the pops)
  const up = [[1284, 12], [1262, -30], [1230, -62], [1190, -94], [1140, -120]];
  line(g, up.map(([x, y]) => [x - 6, y]), () => 22, gv(0.1));
  halftoneDots(g, (c) => { const q = sampleCurve(up, 6); c.moveTo(q[0][0] - 8, q[0][1]); for (const p of q) c.lineTo(p[0] - 8, p[1]); for (let i = q.length - 1; i >= 0; i--) c.lineTo(q[i][0] + 3, q[i][1]); c.closePath(); }, [1140, -150, 1330, 10], () => 0.5);
  line(g, up.map(([x, y]) => [x - 13, y]), () => 4, gv(0.85));
  // cup silhouette: black leather and shadow
  fillPts(g, H.cup, gv(0.035));
  // cushion: lit fold wedges (measured outlines, apex pointing in toward the shell) filled with the 45° dot screen,
  // then the pale stitching / fold dots on the dark leather above and below them
  g.save(); g.beginPath(); smoothPath(g, H.cup, true); g.clip();
  g.fillStyle = gv(0.075); g.beginPath(); ringPath(g, HP_CUSH); g.fill();
  // fix pass 3: the lit fold wedges between y 172 and 352 are redrawn crisp (cushionFolds, after the softening); the
  // older soft streamlines stay only for the wedges below (under the cup)
  engraveLines(g, HP_CUSH_LINES.filter((L) => { let m = 0, n = 0; for (let i = 1; i < L.length; i += 3) { m += L[i]; n++; } m /= n; return m > 352 || m < 172; }), 0.9, 1.0);
  for (const [x, y, r, v] of HP_DOTS) { g.fillStyle = gv(clamp(0.2 + v * 0.95)); g.beginPath(); g.arc(x, y, r * 0.85, 0, TAU); g.fill(); }
  g.restore();
  }
  if (phase === "soft") return;
  cushionFolds(g);
  // fix pass 2: the metal shell, yoke and plate bevel are LIGHT metal with the measured dark ink over it (./hpx.js):
  // a smooth base tone (fitted Gaussians) and the traced black outlines and grey streaks (the fix-pass-1 white
  // streamlines on black read as wood grain / rope)
  metalCup(g, state, "base");
  // the arm: print halftone (measured polygon), running down inside the J-hook as a narrow strip; the thin bevel
  // crescent round the plate's upper right (halftone, fading into a thin pale arc down the right side, black beyond)
  // fix pass 2: the pops are redrawn in the source, not the stare's print rotated: the glare (frames 880–881) keeps a
  // softer halftone with a "\\" hatch over the plate and arm (plate p10/p90 90/202 against the stare's 78/216); the
  // shut-eye pop (882–883) has no halftone at all — smooth grey metal (plate 146, p10/p90 115/175; arm 137) crossed by
  // a +-45° hatch
  const armT = (x, y) => 0.55 - 0.06 * clamp((y - 140) / 60);
  const HT = state === "glare" ? { bg: 0.86, ink: 0.2 } : { bg: 0.93, ink: 0.1 };
  // (fix pass 3: in the shut-eye pop the arm, strip, crescent and sliders are smooth grey metal with only a few loose
  // diagonals on the arm; the soft hand hatch sits on the plate's shaded upper right)
  const screen = (pathFn, box, val, o = {}) => state === "closed" ? softHatch(g, pathFn, box, (x, y) => val(x, y) + 0.04, { dens: () => (o.hatch ? 0.35 : 0), sp: [4, 9], lw: [0.6, 1.4], dv: [0.06, 0.14], segs: [10, 30], seed: Math.round(box[0] + box[1] * 3) })
    : halftoneDots(g, pathFn, box, val, { ...HT, pitch: 5.9, ...o, ...(state === "glare" ? { hatch: () => 0.8, hw: 0.22 } : {}) });
  screen((c) => ringPath(c, HPX_ARM), bboxOf(HPX_ARM), armT, { hatch: (x, y) => Math.exp(-0.5 * ((y - 152) / 22) ** 2), hw: 0.2 });
  screen((c) => ringPath(c, HPX_STRIP), bboxOf(HPX_STRIP), armT);
  screen((c) => ringPath(c, HPX_CRES), bboxOf(HPX_CRES), (x, y) => 0.38 - 0.12 * clamp((y - 215) / 50), { bg: 0.62, pitch: 5.9 });
  // plate: print halftone oval, measured tone (quadratic fit) + the darker diagonal band across its lower left
  // (fix pass 2: fitted on the blurred source-minus-render residual: axis through (1373, 284) at 52.7°, across-profile
  // Gaussian sigma ~12 px, -20/255 at the centre, ~±35 px long)
  const [px, py, prx, pry] = HP_PLATE, T = HP_TONE;
  const bdx = Math.cos(0.92), bdy = Math.sin(0.92);
  const band = (x, y) => { const a = (x - 1373) * bdx + (y - 284) * bdy, c = -(x - 1373) * bdy + (y - 284) * bdx; return Math.exp(-0.5 * (c / 12) ** 2) * Math.exp(-0.5 * (a / 30) ** 2); };
  // the plate's black outline ring (fitted on the 4x overlay: edges at x 1335–1341 / 1418–1424, y 198–203 / 352–357)
  const plateT = (x, y) => { const u = (x - px) / prx, v = (y - py) / pry; return T[0] + T[1] * u + T[2] * v + T[3] * u * u + T[4] * u * v + T[5] * v * v - 0.08 * band(x, y); };
  if (state === "closed") softHatch(g, (c) => c.ellipse(1379.5, 277.5, 39.5, 75, 0, 0, TAU), [px - prx - 8, py - pry - 8, px + prx + 8, py + pry + 8],
    (x, y) => plateT(x, y) + 0.1 * clamp(0.5 + 0.5 * ((y - py) / pry - (x - px) / prx)) - 0.05,
    { dens: (x, y) => clamp(0.6 + 0.6 * ((x - px) / prx - (y - py) / pry)), sp: [3.5, 7], lw: [1.2, 2.6], dv: [0.06, 0.15], segs: [18, 60], seed: 882 });
  // ... and paler lines between them (the source's hatch is woven: light and dark soft lines)
  if (state === "closed") softHatch(g, (c) => c.ellipse(1379.5, 277.5, 39.5, 75, 0, 0, TAU), [px - prx - 8, py - pry - 8, px + prx + 8, py + pry + 8],
    (x, y) => plateT(x, y) + 0.1 * clamp(0.5 + 0.5 * ((y - py) / pry - (x - px) / prx)) - 0.05,
    { dens: () => 0.45, sp: [5, 9], lw: [1, 2], dv: [-0.12, -0.06], segs: [14, 40], seed: 883, base: false });
  else halftoneDots(g, (c) => c.ellipse(1379.5, 277.5, 39.5, 75, 0, 0, TAU), [px - prx - 8, py - pry - 8, px + prx + 8, py + pry + 8], plateT, { ...HT, hatch: state === "glare" ? () => 0.8 : (x, y) => band(x, y), hw: state === "glare" ? 0.22 : 0.2 });
  // the measured dark ink over the metal (outlines of the yoke / J-hook, the bevel, grey streaks), then the ring
  metalCup(g, state, "ink");
  plateRing(g);
  // collar and the knurled slider blocks (halftone, measured ~0.6)
  g.fillStyle = gv(0.3); g.beginPath(); polyPath(g, H.collar); g.fill();
  line(g, [[1302, 60], [1362, 58]], () => 1.6, gv(0.85, 0.8));
  g.strokeStyle = LINE; g.lineWidth = 2; g.beginPath(); polyPath(g, H.collar); g.stroke();
  screen((c) => polyPath(c, H.block), [1278, 0, 1366, 64], () => 0.68);   // fix pass 3: 0.6 read 13 levels under the source
  g.save(); g.beginPath(); polyPath(g, H.block); g.clip();
  g.strokeStyle = gv(0.1, 0.55);
  for (let y = 12; y < 62; y += 12) { g.lineWidth = 1.2; g.beginPath(); g.moveTo(1290, y); g.lineTo(1370, y - 4); g.stroke(); }
  g.restore();
  g.fillStyle = gv(0.96); g.beginPath(); polyPath(g, H.blockFace); g.fill();
  // fix pass 3: the bevel face's knurl ticks (a column of short dark marks down its middle) and, under the halftone,
  // the ribbed lip (source: the halftone ends on a line sloping from (1300, 52) to (1368, 60); below it a grey band
  // with lit diagonal ribs at its left end); the review found the face a flat slab and the lip dark
  for (let k = 0; k < 7; k++) { const f = (k + 0.5) / 7, x = 1284 + 15 * f, y = 18 + 36 * f; line(g, [[x - 1.6, y - 0.8], [x + 1.4, y + 1]], () => 1.1, gv(0.5)); }
  const LIP = [[1298, 52], [1318, 50], [1350, 55], [1368, 60], [1362, 64], [1302, 63]];
  g.fillStyle = gv(0.28); g.beginPath(); polyPath(g, LIP); g.fill();
  g.save(); g.beginPath(); polyPath(g, LIP); g.clip();
  for (let k = 0; k < 5; k++) { const x = 1303 + k * 4; line(g, [[x, 51], [x + 5, 63]], () => 1.5, gv(0.82)); }
  line(g, [[1326, 57], [1362, 61]], () => 1.4, gv(0.62));
  g.restore();
  g.strokeStyle = LINE; g.lineWidth = 1.5; g.beginPath(); polyPath(g, LIP); g.stroke();
  g.strokeStyle = LINE; g.lineWidth = 2.2; g.beginPath(); polyPath(g, H.block); g.stroke();
  g.lineWidth = 1.6; g.beginPath(); polyPath(g, H.blockFace); g.stroke();
  if (H.block2) {
    // the lower slider block under the collar, with the yoke's pale end beside it
    screen((c) => polyPath(c, H.block2), [1310, 60, 1366, 96], () => 0.7);
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
  toneCorrect(g, rig, M);
  const SS = strokeSets();
  drawStrokes(g, SS.body, rig.head ? rig.warp : null);
  underStrokes(g, rig);
  flank(g, rig);
  g.save(); applyHead();
  headTexture(g, M, state);
  tuftStrokes(g);
  drawStrokes(g, state === "closed" ? SS.head.filter((st) => !inEyeZone(st.pts[st.pts.length >> 1], 16)) : SS.head, null);
  eyeWhites(g, state);
  beakBase(g, state);
  cheekFan(g);                     // fix pass 2: the fan crosses over the beak's upper right, as in the source
  bandage(g);
  headphone(g, state, "soft");     // band, black cup and the leather cushion stay with the soft plumage
  g.restore();
  g.setTransform(1, 0, 0, 1, 0, 0);
  // the source's ink is soft (edges roll off over ~3 px): soften everything, then cut the print mesh
  const tmp = document.createElement("canvas"); tmp.width = cv.width; tmp.height = cv.height;
  const tg = tmp.getContext("2d"); tg.filter = "blur(0.9px)"; tg.drawImage(cv, 0, 0);
  g.clearRect(0, 0, cv.width, cv.height); g.drawImage(tmp, 0, 0);
  // the measured face ink goes on after the softening (it was traced on the soft source: blurring again would grey it)
  g.save(); g.translate(-x0, -y0); g.filter = "blur(0.45px)"; tracedEyes(g, state); g.restore();
  // fix pass 2: the near headphone is drawn after the softening too, on its own layer blurred 0.45 px (the source's
  // halftone and black outlines are crisper than the plumage: halftone p5/p95 62/227 against the render's 100/197)
  {
    const hc = document.createElement("canvas"); hc.width = cv.width; hc.height = cv.height;
    const hg = hc.getContext("2d", { willReadFrequently: true }); hg.lineCap = "round"; hg.lineJoin = "round"; hg.translate(-x0, -y0);
    if (H) { hg.translate(H.c[0] + H.d[0], H.c[1] + H.d[1]); hg.rotate(H.rot); hg.translate(-H.c[0], -H.c[1]); }
    bandageInk(hg);
    headphone(hg, state, "crisp");
    g.save(); g.filter = "blur(0.45px)"; g.drawImage(hc, 0, 0); g.restore();
  }
  // fix pass 3: the toes and claws below the belly edge are redrawn crisp (0.45 px) over their softened version: the
  // review found them soft and out of focus next to the source's crisp toes (and the thin claw tips lost to the blur)
  {
    const fc = document.createElement("canvas"); fc.width = cv.width; fc.height = cv.height;
    const fg = fc.getContext("2d", { willReadFrequently: true }); fg.lineCap = "round"; fg.lineJoin = "round"; fg.translate(-x0, -y0);
    fg.beginPath(); polyPath(fg, W(rig, [[1040, 888], [1192, 888], [1200, 902], [1290, 903], [1470, 903], [1470, 960], [1040, 960]])); fg.clip();
    feet(fg, rig);
    g.save(); g.filter = "blur(0.45px)"; g.drawImage(fc, 0, 0); g.restore();
  }
  {
    const wc = document.createElement("canvas"); wc.width = cv.width; wc.height = cv.height;
    const wg = wc.getContext("2d"); wg.lineCap = "round"; wg.lineJoin = "round"; wg.translate(-x0, -y0);
    drawStrokes(wg, SS.wing, rig.head ? rig.warp : null, null, 0, WING_WK);
    g.save(); g.filter = "blur(0.45px)"; g.drawImage(wc, 0, 0); g.restore();
  }
  // print mesh on the plumage only: feet, beak, plaster, eyes and the headphone keep their own flat tone
  const mk = document.createElement("canvas"); mk.width = cv.width; mk.height = cv.height;
  const mg = mk.getContext("2d"); mg.translate(-x0, -y0); mg.fillStyle = "#fff";
  const fillM = (pts) => { mg.beginPath(); smoothPath(mg, pts, true); mg.fill(); };
  if (PROC) { for (const t of TOES_L) { fillM(W(rig, t.pad)); fillM(W(rig, t.claw)); } fillM(W(rig, FOOT_R)); }
  else for (const R of [FEET_L_RINGS, FEET_R_RINGS]) { mg.beginPath(); ringsPath(R.slice(0, 1).concat(R.slice(1)), rig.warp)(mg); mg.fill("evenodd"); }
  mg.save(); if (H) { mg.translate(H.c[0] + H.d[0], H.c[1] + H.d[1]); mg.rotate(H.rot); mg.translate(-H.c[0], -H.c[1]); }
  fillM(GEO.beak.out); mg.strokeStyle = "#fff"; mg.lineWidth = state === "stare" ? 12 : 24; mg.beginPath(); smoothPath(mg, GEO.beak.out, true); mg.stroke(); mg.beginPath(); smoothPath(mg, [...BANDAGE.longTop, ...BANDAGE.longBot], true, 0.35); mg.fill(); mg.beginPath(); smoothPath(mg, BANDAGE.pad, true, 0.4); mg.fill();
  for (const e of [GEO.eyeR, GEO.eyeL]) { mg.beginPath(); mg.ellipse(e.ring[0], e.ring[1], e.ring[2] + 4, e.ring[3] + 4, 0, 0, TAU); mg.fill(); }
  fillM(GEO.hp.cup); fillM(GEO.hp.arm); mg.beginPath(); polyPath(mg, HP_E); mg.fill(); mg.beginPath(); polyPath(mg, HP_HA); mg.fill(); for (const q of [GEO.hp.block, GEO.hp.collar, GEO.hp.block2, GEO.hp.block2Face, GEO.farBand.top, GEO.farBand.low]) { mg.beginPath(); polyPath(mg, q); mg.fill(); }
  mg.fillRect(1130, -160, 200, 170); mg.fillRect(800, -160, 220, 175);
  mg.globalCompositeOperation = "destination-out"; mg.lineWidth = 3; for (const w of HP_WEDGES) { mg.beginPath(); ringPath(mg, w); mg.fill(); mg.stroke(); } mg.globalCompositeOperation = "source-over";
  // F4c: the measured ink strokes stay solid (the source's grey strokes are smooth lines drawn over the screen; the
  // mesh cut them into dashes). Masked 1 px wider than drawn, so their soft edges stay clean too.
  drawStrokes(mg, state === "closed" ? SS.head.filter((st) => !inEyeZone(st.pts[st.pts.length >> 1], 16)) : SS.head, null, "#fff", 1.2);
  cheekFan(mg, "#fff", 1.2);
  for (const st of parseStrokes(CROWN3)) measuredLine(mg, st, { ...crownOpts(st), col: "#fff", grow: 1.2 });
  mg.beginPath(); smoothPath(mg, LOBE3, true, 0.3); mg.fill(); mg.beginPath(); smoothPath(mg, NOTCH, true, 0.3); mg.fill();
  for (const k of Object.keys(FRINGE)) { const F = FRINGE[k]; if (F.pts.length >= 2) taper(mg, sampleCurve(F.pts, 3), () => 4, "#fff"); }
  mg.restore();
  drawStrokes(mg, SS.body, rig.head ? rig.warp : null, "#fff", 1.2);
  drawStrokes(mg, SS.wing, rig.head ? rig.warp : null, "#fff", 1.2, WING_WK);
  underStrokes(mg, rig, "#fff", 1.2);
  flank(mg, rig, "#fff");
  drawStrokes(mg, parseStrokes(TAIL_LINES), rig.head ? rig.warp : null, "#fff", 1.2);
  // print screen: measured on the source's plumage (FFT at 45°): one dominant line family (wave vector 135°, pitch
  // 3.8–4.2 px), the other ~1/3 as strong; it reaches up into the near-white plumage (wing 236: strong, cheek 245: weak).
  // Paper grain: the source's fine noise floor is ~1/3 of what the render had (fix 1: grain 10 -> 5.5).
  toneMasked(cv, mk, { pitch: 3.8, white: 0.972, range: 0.1, amp: 0.16, grain: 5.5 / 255, cross: 0.3, field: screenField(rig, cv.width, cv.height, x0) });
  // fix pass 2: the lit (left) side's halo. Outside the lit contour the source reads 5-9 levels over the render at
  // dx -2..-14 px (rows 300-650; the shared grade's halation 0.38 matches the dim right side): a soft glow off the
  // silhouette (sigma 6 and 20 px, +22 / +13 pre-finish), outside it only, fading out to the right of x ~1000
  {
    const sc = document.createElement("canvas"); sc.width = cv.width; sc.height = cv.height;
    const sg = sc.getContext("2d", { willReadFrequently: true }); sg.translate(-x0, -y0);
    sg.fillStyle = "#fff"; sg.beginPath(); M.union(sg); sg.fill("nonzero");
    const gc = document.createElement("canvas"); gc.width = cv.width; gc.height = cv.height;
    const gg = gc.getContext("2d", { willReadFrequently: true });
    gg.globalCompositeOperation = "lighter";
    gg.filter = "blur(6px)"; gg.globalAlpha = 22 / 255; gg.drawImage(sc, 0, 0);
    gg.filter = "blur(20px)"; gg.globalAlpha = 13 / 255; gg.drawImage(sc, 0, 0);
    gg.filter = "none"; gg.globalAlpha = 1;
    gg.globalCompositeOperation = "destination-out"; gg.drawImage(sc, 0, 0);
    const fade = gg.createLinearGradient(1000 - x0, 0, 1180 - x0, 0); fade.addColorStop(0, "rgba(0,0,0,0)"); fade.addColorStop(1, "rgba(0,0,0,1)");
    gg.fillStyle = fade; gg.fillRect(1000 - x0, 0, cv.width, cv.height);
    g.save(); g.globalCompositeOperation = "lighter"; g.drawImage(gc, 0, 0); g.restore();
    // ... and just inside the lit contour the source rolls off (dx +2..+8: 197-241 against the render's 215-244): a
    // soft darkening band (silhouette x (1 - blur 5 px)), -26 pre-finish at its peak, same left-side fade
    const bc = document.createElement("canvas"); bc.width = cv.width; bc.height = cv.height;
    const bg = bc.getContext("2d", { willReadFrequently: true });
    bg.drawImage(sc, 0, 0); bg.globalCompositeOperation = "destination-out"; bg.filter = "blur(5px)"; bg.drawImage(sc, 0, 0); bg.filter = "none";
    bg.fillStyle = fade; bg.fillRect(1000 - x0, 0, cv.width, cv.height);
    bg.globalCompositeOperation = "source-in"; bg.fillStyle = "rgb(52,52,52)"; bg.fillRect(0, 0, cv.width, cv.height);
    g.save(); g.globalCompositeOperation = "difference"; g.drawImage(bc, 0, 0); g.restore();
  }
  return { canvas: cv, x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}
