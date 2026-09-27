// s07 plate surfaces re-rendered as line and grain (fix pass 3). The trace builds these as flat value-zone polygons
// (posterised grey slabs with hard polygon edges) or, on the dark faces, as a maze of short orthogonal white ridge
// fragments; the source builds them from lines. Each region keeps the plate's own blurred tone (hatch.js lineFill), so
// the value study is unchanged; only the texture becomes ink. Polygons measured on the source (frame px), set 1-2 px
// inside the faces' edges so the traced edge lines stay.
import { lineFill, streakFill, smearFill, blurF, lumOf, hash01 } from "./hatch.js";
import { ctx2d, canvas, TINT } from "./tracekit.js";

const col = (v) => `rgb(${(v * 255 * TINT[0]).toFixed(1)},${(v * 255 * TINT[1]).toFixed(1)},${(v * 255 * TINT[2]).toFixed(1)})`;
const sm = (a, b) => (t) => { const u = Math.max(0, Math.min(1, (t - a) / (b - a))); return u * u * (3 - 2 * u); };

// [poly, lineFill options]
export const FACES = [
  // the lit front face of the upper-left carton: light, softened, with soft dark vertical drips (streakFill; the
  // laptop lid in front is excluded by tone)
  [[[830, 21], [893, 23], [895, 160], [830, 150]], { smear: true, ang: Math.PI / 2, len: 11, grain: 0.06, seed: 21 }],
  // the lit front face of the lower carton (right of the lid)
  [[[861, 171], [977, 182], [977, 372], [861, 372]], { smear: true, ang: Math.PI / 2, len: 11, grain: 0.06, seed: 23 }],
  // the dark face of the upper carton: vertical white dotted lines (the source's are dashed, ~5 px apart)
  [[[899, 18], [1048, 11], [1049, 133], [899, 155]], { smear: true, ang: Math.PI / 2, len: 9, dash: [4, 0.55, 0.45], seed: 25 }],
  // the right shelf's small box, top face: white lines along its depth edge
  [[[2066, 629], [2101, 604], [2172, 623], [2135, 651]], { ang: Math.atan2(21, 76), pitch: 3.6, base: 0.05, ink: 0.5, wob: 0.3, seed: 27, soft: 0.5 }],
];

// Soft grain regions (sweater shoulder, owl side): the zone slabs are softened (blurred ~3 px) before the ink strokes
// go on, and a seeded stipple of the same mean is added, so the light areas read as grainy print, not flat slabs.
export const GRAIN = [
  [[1362, 742], [1488, 742], [1490, 900], [1362, 900]],
  // the owl's body below the head (its side included), inside the silhouette
  [[1500, 446], [1640, 436], [1690, 472], [1724, 556], [1744, 592], [1738, 640], [1700, 676], [1600, 656], [1522, 600], [1474, 522]],
  // fix pass 1 (this run): the owl's head (inside the headphone band and cups) and the wing's lower right, where the
  // zones read as posterised grey patches with hard edges (the source's owl is soft, evenly white, finely textured)
  [[1512, 262], [1560, 246], [1600, 240], [1638, 254], [1652, 290], [1650, 340], [1640, 390], [1620, 425], [1560, 440], [1515, 440], [1511, 400], [1509, 330], [1510, 290]],
  [[1640, 470], [1690, 468], [1730, 540], [1760, 600], [1772, 660], [1745, 700], [1700, 690], [1660, 640], [1630, 560]],
];
// fix pass 1: the head and wing polygons carry half the stipple (0 - 1 measured within 0.05). Owl box (frame 745):
// blurred error s8 1.71 -> 1.67, head 2.56 -> 2.38; at s1 / s2 the head reads 0.4 / 0.2 higher (the smoothing also
// softens real edges). Thinning the right-side contour and dropping parallel duplicates were tried and measured worse
// (the wing box s8 1.75 -> 2.6: the contour's mass is the source's; the doubled look is a zone edge, not a stroke).
const GRAIN_STIP_NEW = 0.5;
export function grainRegions(B) {
  const g = ctx2d(B);
  for (const [poly, stip] of GRAIN.map((p, i) => [p, i < 2 ? 1 : GRAIN_STIP_NEW])) {
    const xs = poly.map((p) => p[0]), ys = poly.map((p) => p[1]);
    const x0 = Math.min(...xs) - 6, y0 = Math.min(...ys) - 6, x1 = Math.max(...xs) + 6, y1 = Math.max(...ys) + 6, W = x1 - x0, H = y1 - y0;
    const im = g.getImageData(x0, y0, W, H), d = im.data, n = W * H;
    const L = lumOf(d, n), S = blurF(Float32Array.from(L), W, H, 2);
    // the polygon, feathered ~4 px
    const Mc = canvas(W, H), mg = ctx2d(Mc);
    mg.translate(-x0, -y0); mg.filter = "blur(3px)"; mg.beginPath(); poly.forEach(([x, y], i) => (i ? mg.lineTo(x, y) : mg.moveTo(x, y))); mg.closePath(); mg.fillStyle = "#fff"; mg.fill();
    const md = mg.getImageData(0, 0, W, H).data;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const k = md[4 * i + 3] / 255; if (k <= 0) continue;
      const q = (hash01(x + x0, y + y0, 41) - 0.5) * 0.11 + (hash01((x + x0) >> 1, (y + y0) >> 1, 43) - 0.5) * 0.07;
      const v = S[i] + stip * q * Math.min(1, 5 * S[i] * (1 - S[i])), o = L[i] + (v - L[i]) * k;
      d[4 * i] = o * 255 * TINT[0]; d[4 * i + 1] = o * 255 * TINT[1]; d[4 * i + 2] = o * 255 * TINT[2];
    }
    g.putImageData(im, x0, y0);
  }
}

export function lineFaces(plate) {
  for (const [poly, o] of FACES) (o.smear ? smearFill : o.streak ? streakFill : lineFill)(plate, poly, o);
  knitCuff(plate);
  pencilTip(plate);
  owlContrast(plate);
  plasterDots(plate);
  return plate;
}
// The plaster's perforations (fix pass 2): small grey dots on each pad, positions measured on the 727-763 mean
// (isolated local minima 10-25 levels below their surround; the pads' outlines excluded).
const PLASTER_DOTS = [[1504, 299], [1512, 300], [1497, 305], [1506, 310], [1542, 293], [1545, 297], [1552, 316], [1556, 321], [1552, 325], [1559, 325], [1563, 329], [1511, 331], [1517, 332], [1524, 330], [1519, 335], [1515, 340], [1508, 341]];
function plasterDots(plate) {
  const g = ctx2d(plate), r = 0.9, v = 0.62;   // swept r 0.6-0.9, v 0.5-0.62: plaster box s2 5.66 -> 5.59, s8 4.26 -> 4.15
  g.fillStyle = col(v);
  for (const [x, y] of PLASTER_DOTS) { g.beginPath(); g.arc(x + 0.5, y + 0.5, r, 0, 7); g.fill(); }
  return plate;
}

// max filter (square, radius r) on a Float32Array
function maxF(F, W, H, r) {
  const T = new Float32Array(F.length), O = new Float32Array(F.length);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let m = 0; for (let k = Math.max(0, x - r); k <= Math.min(W - 1, x + r); k++) m = Math.max(m, F[y * W + k]); T[y * W + x] = m; }
  for (let x = 0; x < W; x++) for (let y = 0; y < H; y++) { let m = 0; for (let k = Math.max(0, y - r); k <= Math.min(H - 1, y + r); k++) m = Math.max(m, T[k * W + x]); O[y * W + x] = m; }
  return O;
}
// The owl's ink, re-contrasted (fix pass 2, this run). The traced owl reads grey: its contours are lighter and wider
// than the source's black lines, with grey bands beside them (the halo on the head's right edge, the doubled body
// edge), balanced in the blurred value by a greyer interior. Inside the owl's silhouette, on its light areas: the
// local light level E (max filter, blurred) is measured on the finished plate; each pixel's darkness below it is
// stretched about a pivot (darker than the pivot gets darker, the grey bands above it lighter), then a smooth gain
// puts the blurred value (6 px) back to the plate's own, so the value study is unchanged.
function owlContrast(plate) {
  // swept on frames 727 / 745 / 755 (owl polygon, s1 / s2 / s8): G 1.4-1.8, pivot 0.25-0.45, envelope radius 2-7, whole
  // owl vs the three zones. Kept: G 1.4, pivot 0.35, radius 2, zones only: owl 7.80 / 5.32 / 1.71 -> 7.67 / 5.17 / 1.72
  // (tail s2 6.68 -> 6.13, body's right edge 8.18 -> 7.80). A larger radius (to reach the head's 8-10 px grey
  // edge band) measured worse everywhere, the head too (s8 1.67 -> 2.04): that band carries the mass of the
  // source's dark feather ticks there.
  const G = 1.4, PIV = 0.35, R = 2, SB = 6;
  const xs = OWL.map((p) => p[0]), ys = OWL.map((p) => p[1]);
  const X0 = Math.min(...xs) - 12, Y0 = Math.min(...ys) - 12, X1 = Math.max(...xs) + 12, Y1 = Math.max(...ys) + 12, W = X1 - X0, H = Y1 - Y0, n = W * H;
  const pg = ctx2d(plate), im = pg.getImageData(X0, Y0, W, H), d = im.data, L = lumOf(d, n);
  const Mc = canvas(W, H), mg = ctx2d(Mc); mg.translate(-X0, -Y0); mg.filter = "blur(3px)"; mg.beginPath(); OWL.forEach(([x, y], i) => (i ? mg.lineTo(x, y) : mg.moveTo(x, y))); mg.closePath(); mg.fillStyle = "#fff"; mg.fill();
  {   // only in the zones (the wing's interior already matches: its error rose with the stretch, s2 3.40 -> 3.82)
    mg.globalCompositeOperation = "destination-in"; mg.filter = "blur(6px)"; mg.beginPath();
    for (const Z of OWL_CZ) { Z.forEach(([x, y], i) => (i ? mg.lineTo(x, y) : mg.moveTo(x, y))); mg.closePath(); }
    mg.fill(); mg.globalCompositeOperation = "source-over";
  }
  mg.filter = "none";
  const md = mg.getImageData(0, 0, W, H).data;
  const E = blurF(maxF(L, W, H, R), W, H, 2);
  const L1 = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const e = E[i], m = md[4 * i + 3] / 255 * Math.min(1, Math.max(0, (e - 0.45) / 0.15));
    if (m <= 0) { L1[i] = L[i]; continue; }
    const P = e * (1 - PIV), v = Math.max(0.02, Math.min(e, P + (L[i] - P) * G));
    L1[i] = L[i] + (v - L[i]) * m;
  }
  const A = blurF(Float32Array.from(L), W, H, SB), B = blurF(Float32Array.from(L1), W, H, SB);
  for (let i = 0; i < n; i++) {
    const m = md[4 * i + 3] / 255; if (m <= 0) continue;
    const k = Math.max(0.85, Math.min(1.2, (A[i] + 0.01) / (B[i] + 0.01)));
    const v = Math.min(0.97, L1[i] * k);
    const o = L[i] + (v - L[i]) * m;
    d[4 * i] = o * 255 * TINT[0]; d[4 * i + 1] = o * 255 * TINT[1]; d[4 * i + 2] = o * 255 * TINT[2];
  }
  pg.putImageData(im, X0, Y0);
  return plate;
}

// The beanie's cuff as a knit grid (fix pass 3): the trace drew it as rows of tiny white rings (788 traced bright
// cells); the source shows a crisp grid of light rectangular cells between dark rib and row lines, wrapping round the
// cuff. Measured on the source (frame px): the cuff's top edge (under the crown's dark band) and bottom edge, ~40 ribs
// whose spacing shrinks from ~7.3 px at the left (x 1652) to ~4 px at the right silhouette (x 1893) as the cuff turns
// away (a cylinder: x = xL + (xR - xL) sin(u phi) / sin(phi), phi 1.0), and 17 rows. Each cell is a rounded quad
// inset ~1.2 px; its value is set so the grid keeps the plate's own blurred tone for the cell's fill fraction.
const CUFF_TOP = [[1652, 161], [1700, 162], [1750, 164], [1800, 159], [1830, 150], [1850, 140], [1872, 126], [1893, 106]];
const CUFF_BOT = [[1652, 291], [1700, 293], [1750, 287], [1800, 277], [1830, 264], [1850, 250], [1872, 229], [1893, 174]];
const yAt = (P, x) => { if (x <= P[0][0]) return P[0][1]; for (let i = 1; i < P.length; i++) if (x <= P[i][0]) { const [a, va] = P[i - 1], [b, vb] = P[i]; return va + (vb - va) * ((x - a) / (b - a)); } return P[P.length - 1][1]; };
// Build pass (this run): the knit is organic, as in the source (4x crops of the 727-763 mean): each cell is a soft
// rounded blob, brighter at its middle, inset ~0.6 px from wobbling near-black rib and row lines (grid nodes displaced by smooth
// seeded noise plus a per-node jitter, ~1 px), cells vary in size and value, and about one in twenty merges with the cell below into a
// taller blob. The grid starts at x 1640 (the source's mesh runs a little further into the lit part) and fades over
// 32 px. Tone as before: each cell keeps the plate's own blurred tone for its fill fraction.
const nz = (x, y, s) => { const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = hash01(xi, yi, s), b = hash01(xi + 1, yi, s), c = hash01(xi, yi + 1, s), d = hash01(xi + 1, yi + 1, s);
  return (a + (b - a) * u) * (1 - v) + (c + (d - c) * u) * v - 0.5; };
function knitPatch(plate, K) {
  const { X0, Y0, X1, Y1, TOP, BOT, xL, xR, phi, NU, NV, GAPV, INS, fadeW, seed, RIB = 0, TILT = 0, LEAN = 0, LEAN0 = 0, WOB = 1, LIT = 0, SPECK = 0, TEX = 0, NL = 0, JR = 0.9, VAR = 0.32, fadeX = xL, CLIP = null, CON = null, SOFT = 0.4, LMAX = 0.9 } = K, W = X1 - X0, H = Y1 - Y0, n = W * H;
  const pg = ctx2d(plate);
  const L = lumOf(pg.getImageData(X0, Y0, W, H).data, n), T = blurF(L, W, H, 3);
  const C = canvas(W, H), g = ctx2d(C);
  g.translate(-X0, -Y0);
  const xu = (u) => xL + ((xR - xL) * Math.sin(u * phi)) / Math.sin(phi);
  // (fix pass 1, this run) the ribs run across the rows, not straight down: each rib leans by the local slope of the
  // cuff's mid-line (perpendicular to the rows, which follow the top and bottom edges), so the columns fan round the
  // cylinder as in the source; plus a small seeded lean per rib
  const mid = (x) => (yAt(TOP, x) + yAt(BOT, x)) / 2, slope = (x) => (mid(x + 4) - mid(x - 4)) / 8;
  const P0 = (u, v) => { const x0 = xu(u), h = yAt(BOT, x0) - yAt(TOP, x0), lean = Math.max(-LMAX, Math.min(LMAX, -slope(x0) * TILT + LEAN0)) + LEAN * (hash01(Math.round(u * NU), 0, 81 + seed) - 0.5);
    const x = x0 + lean * (v - 0.5) * h, yt = yAt(TOP, x), yb = yAt(BOT, x); return [x, yt + (yb - yt) * v]; };
  // grid nodes, displaced by smooth noise (rib lines wobble along their length, row lines along theirs)
  const N = [];
  for (let i = -NL; i <= NU; i++) { N.push([]); for (let j = 0; j <= NV; j++) {
    const [x, y] = P0(i / NU, j / NV), edge = j === 0 || j === NV ? 0.3 : 1;
    N[N.length - 1].push([x + edge * WOB * (1.5 * nz(i * 0.9, j * 0.45, 71 + seed) + 0.9 * (hash01(i, j, 73 + seed) - 0.5)), y + edge * WOB * (1.4 * nz(i * 0.45, j * 0.9, 72 + seed) + 0.9 * (hash01(i, j, 74 + seed) - 0.5))]); } }
  const NI = NU + NL;   // N[k] is rib k - NL
  g.beginPath();
  for (let k = 0; k <= NI; k++) { const [x, y] = N[k][0]; if (k) g.lineTo(x, y); else g.moveTo(x, y); }
  for (let k = NI; k >= 0; k--) { const [x, y] = N[k][NV]; g.lineTo(x, y); }
  g.closePath(); g.fillStyle = col(GAPV); g.fill();
  const tAt = (x, y) => { const ix = Math.max(0, Math.min(W - 1, Math.round(x - X0))), iy = Math.max(0, Math.min(H - 1, Math.round(y - Y0))); return T[iy * W + ix]; };
  const blob = (Q, iu, iv, v) => {
    // a rounded quad inside cell Q (TL, TR, BR, BL): corners inset iu along the ribs' direction and iv along the
    // rows', corners rounded over ~30 % of each side; brighter in the middle
    const pu = Math.hypot(Q[1][0] - Q[0][0], Q[1][1] - Q[0][1]), pv = Math.hypot(Q[3][0] - Q[0][0], Q[3][1] - Q[0][1]);
    const ux = (Q[1][0] - Q[0][0]) / pu, uy = (Q[1][1] - Q[0][1]) / pu, vx = (Q[3][0] - Q[0][0]) / pv, vy = (Q[3][1] - Q[0][1]) / pv;
    const sg = [[1, 1], [-1, 1], [-1, -1], [1, -1]];
    const R = Q.map(([x, y], k) => [x + ux * sg[k][0] * iu + vx * sg[k][1] * iv, y + uy * sg[k][0] * iu + vy * sg[k][1] * iv]);
    const at = (p, q, t) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
    const c = [(R[0][0] + R[2][0]) / 2, (R[0][1] + R[2][1]) / 2];
    g.beginPath();
    for (let k = 0; k < 4; k++) {
      const A = R[k], B = R[(k + 1) % 4], Cn = R[(k + 2) % 4];
      const p0 = at(A, B, 0.3), p1 = at(A, B, 0.7), q0 = at(B, Cn, 0.3);
      if (k === 0) g.moveTo(p0[0], p0[1]);
      g.lineTo(p1[0], p1[1]); g.quadraticCurveTo(B[0], B[1], q0[0], q0[1]);
    }
    g.closePath();
    if (LIT > 0) {
      // (fix pass 1) no bright core: the cell is lit from its upper left (a linear ramp across it), with a small
      // bright fleck inside the lit corner on some cells (the source's cells carry such flecks)
      const gr = g.createLinearGradient(R[0][0], R[0][1], R[2][0], R[2][1]);
      gr.addColorStop(0, col(Math.min(0.95, v * (1 + LIT)))); gr.addColorStop(1, col(v * (1 - LIT)));
      g.fillStyle = gr; g.fill();
      if (SPECK > 0 && hash01(Math.round(c[0] * 7), Math.round(c[1] * 7), 91) < SPECK) {
        const fx = c[0] + (R[0][0] - c[0]) * 0.35, fy = c[1] + (R[0][1] - c[1]) * 0.35;
        g.beginPath(); g.ellipse(fx, fy, 1.1, 0.7, Math.atan2(R[1][1] - R[0][1], R[1][0] - R[0][0]), 0, 7); g.fillStyle = col(Math.min(0.95, v * 1.7)); g.fill();
      }
    } else {
    const rr = Math.max(1.5, Math.hypot(R[2][0] - R[0][0], R[2][1] - R[0][1]) * 0.55);
    const gr = g.createRadialGradient(c[0] - 0.3, c[1] - 0.4, 0, c[0], c[1], rr);
    gr.addColorStop(0, col(Math.min(0.97, v * 1.48))); gr.addColorStop(0.55, col(v * 1.02)); gr.addColorStop(1, col(v * 0.52));
    g.fillStyle = gr; g.fill();
    }
  };
  for (let i = 0; i < NI; i++) for (let j = 0; j < NV; j++) {
    const ih = i - NL, merge = j < NV - 1 && hash01(ih, j, 64 + seed) < 0.05 && !(j > 0 && hash01(ih, j - 1, 64 + seed) < 0.05);
    if (j > 0 && hash01(ih, j - 1, 64 + seed) < 0.05 && !(j > 1 && hash01(ih, j - 2, 64 + seed) < 0.05)) continue;   // merged into the cell above
    const j1 = merge ? j + 2 : j + 1;
    const Q = [N[i][j], N[i + 1][j], N[i + 1][j1], N[i][j1]];
    const cx = (Q[0][0] + Q[2][0]) / 2, cy = (Q[0][1] + Q[2][1]) / 2;
    const pu = Math.hypot(Q[1][0] - Q[0][0], Q[1][1] - Q[0][1]), pv = Math.hypot(Q[3][0] - Q[0][0], Q[3][1] - Q[0][1]);
    const jit = 1.05 - JR / 2 + JR * hash01(i - NL, j, 65 + seed);
    const iu = Math.min(INS[0], INS[1] * pu) * jit, iv = Math.min(INS[2], INS[3] * pv / (merge ? 2 : 1)) * jit;
    // the blob covers ~0.93 of its inset quad (rounded corners); its mean value is ~0.98 of the nominal one
    const fill = Math.max(0.15, ((pu - 2 * iu) * (pv - 2 * iv)) / (pu * pv)) * 0.93 * 0.97;
    // ribs alternate a little in value (knit ribs catch the light unevenly), plus per-cell variation
    const rib = 1 + RIB * ((i - NL) % 2 ? 1 : -1);
    const v = Math.max(0, Math.min(0.9, ((tAt(cx, cy) - GAPV * (1 - fill)) / fill) * rib * (1 - VAR / 2 + VAR * hash01(ih, j, 63 + seed))));
    blob(Q, iu, iv, v);
  }
  // keep the plate's own blurred tone exactly: a smooth gain field (blurred target / blurred knit, radius 6 px) on the
  // knit, so the cells' rounded corners and bright middles do not shift the value study (measured +2 / -4 levels
  // without it, varying with the cell shape across the cuff)
  { const cg = ctx2d(C), im = cg.getImageData(0, 0, W, H), d = im.data, Lk = lumOf(d, n);
    const A = blurF(Float32Array.from(Lk), W, H, 6), B = blurF(Float32Array.from(L), W, H, 6);
    for (let q = 0; q < n; q++) { if (d[4 * q + 3] === 0) continue; let k = Math.max(0.7, Math.min(1.45, (B[q] + 0.004) / (A[q] + 0.004)));
      if (TEX > 0) { const qx = q % W, qy = (q - qx) / W; k *= 1 + TEX * (hash01(qx + X0, qy + Y0, 97) + hash01((qx + X0) >> 1, (qy + Y0) >> 1, 98) - 1); }
      d[4 * q] = Math.min(255, d[4 * q] * k); d[4 * q + 1] = Math.min(255, d[4 * q + 1] * k); d[4 * q + 2] = Math.min(255, d[4 * q + 2] * k);
      if (CON) { const c = yAt(CON, (q % W) + X0), bv = B[q] * 255; d[4 * q] = bv * TINT[0] + c * (d[4 * q] - bv * TINT[0]); d[4 * q + 1] = bv * TINT[1] + c * (d[4 * q + 1] - bv * TINT[1]); d[4 * q + 2] = bv * TINT[2] + c * (d[4 * q + 2] - bv * TINT[2]); } }
    cg.putImageData(im, 0, 0); }
  const S = canvas(W, H), sg = ctx2d(S); sg.filter = `blur(${SOFT}px)`; sg.drawImage(C, 0, 0); sg.filter = "none";
  if (CLIP) {   // keep the knit above / right of the CLIP polyline (the headphone band's rim), feathered 1 px
    const Mc = canvas(W, H), mg = ctx2d(Mc); mg.translate(-X0, -Y0); mg.filter = "blur(1px)"; mg.beginPath();
    mg.moveTo(X0, Y0); mg.lineTo(X1, Y0); mg.lineTo(X1, Y1); for (let k = CLIP.length - 1; k >= 0; k--) mg.lineTo(CLIP[k][0], CLIP[k][1]); mg.lineTo(X0, CLIP[0][1]);
    mg.closePath(); mg.fillStyle = "#fff"; mg.fill();
    sg.globalCompositeOperation = "destination-in"; sg.drawImage(Mc, 0, 0); sg.globalCompositeOperation = "source-over";
  }
  const fade = sg.createLinearGradient(fadeX - X0, 0, fadeX - X0 + fadeW, 0); fade.addColorStop(0, "rgba(0,0,0,0)"); fade.addColorStop(1, "rgba(0,0,0,1)");
  sg.globalCompositeOperation = "destination-in"; sg.fillStyle = fade; sg.fillRect(0, 0, W, H); sg.globalCompositeOperation = "source-over";
  pg.drawImage(S, X0, Y0);
  return plate;
}

// the headphone band's rim (measured on the 727-763 mean): the knit stays above / right of it
const CUFF_CLIP = [[1560, 208], [1580, 210], [1592, 212], [1600, 215], [1612, 220], [1625, 226], [1638, 232], [1648, 242], [1656, 252], [1663, 263], [1670, 276], [1676, 290], [1680, 300]];
export function knitCuff(plate) {
  // fix pass 1 (this run): 17 rows (period ~7.6 px; source 8; 16 measured worse), ribs lean across the rows (TILT, LEAN), wobblier
  // lines (WOB), cells lit from the upper left with no bright core (LIT) and an occasional fleck (SPECK), a fine grain
  // inside the cells (TEX), and wider dark lines (INS), so the mesh's contrast matches the source's (pixel std in
  // the cuff 33.6 vs 34.2; it was 29.4 - the tiles read pale on black). The blurred tone is kept by the gain field.
  // fix pass 2 (this run), measured at frames 727 / 745 / 755 against the source (cuff polygon extended to the band):
  //  - the knit runs left to x ~1598 (6 more ribs), feathered over 22 px and clipped under the headphone band's rim
  //    (CUFF_CLIP): no hard seam at x ~1645 any more;
  //  - the ribs lean the other way ("/", top to the right; the source's edge energy peaks 30-60 deg that way): the
  //    local mid-line term reversed (TILT -0.5) plus a constant lean (LEAN0 -0.3), clamped to 0.5 so the cells at the
  //    turning right end stay dots, not slivers. Edge-orientation histogram L1 vs the source (three boxes) 0.26 / 0.53
  //    / 0.53 -> 0.20 / 0.24 / 0.19; swept TILT -1..0.4, LEAN0 -0.45..0, LMAX 0.35-0.9;
  //  - the mesh's contrast follows the source's fine-detail energy across the cuff (CON: the knit blended toward its
  //    own blurred tone, 0.4 at the lit left end up to 1.3 at the dark right end; |I - blur 2| per band now within
  //    ~1-2 levels of the source's; it was 27 vs 20 at x 1670-1720);
  //  - no flecks (SPECK 0); more even cells (jitter 0.6, value spread 0.25).
  // Cuff error s2 8.84 -> 8.66, s8 1.50 -> 1.37. Wider gaps with a softer blur (INS 1.3-1.5, 0.8-1 px) measured worse.
  return knitPatch(plate, { X0: 1585, Y0: 98, X1: 1900, Y1: 300, TOP: CUFF_TOP, BOT: CUFF_BOT, xL: 1640, xR: 1893, phi: 1.0, NU: 42, NV: 17, GAPV: 0.035, INS: [1.1, 0.18, 0.8, 0.11], fadeW: 22, seed: 0, RIB: 0.1,
    TILT: -0.5, LEAN: 0.12, LEAN0: -0.3, LMAX: 0.5, WOB: 1.6, LIT: 0.3, SPECK: 0, TEX: 0.25, NL: 6, JR: 0.6, VAR: 0.25, fadeX: 1598, SOFT: 0.4, CLIP: CUFF_CLIP,
    CON: [[1600, 0.4], [1650, 0.5], [1700, 0.7], [1760, 0.9], [1830, 1.1], [1885, 1.3]] });
}
// (A coarser knit patch on the crown's right part was tried in the build pass and dropped: its cells read as bright
// tiles, the source's crown there is long curved ink lines, and the blurred error rose 1.82 -> 1.85.)

// Plate ink strokes dropped (fix pass 3), by region (frame px):
//  - the beanie crown: strokes under 10 px (the scribble between the knit's rib and row lines);
//  - the hair's white lock lines are tapered to points (its grey strokes stay: dropping them measured worse);
//  - the pencil tip: the short crossing strokes of the small "x" at (1157-1167, 540-550);
//  - the right shelf boxes: fragments under 8 px (the maze).
const inPoly = (P, x, y) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, yi] = P[i], [xj, yj] = P[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; };
const CROWN = [[1480, 0], [1905, 0], [1893, 104], [1850, 136], [1800, 155], [1700, 158], [1650, 155], [1560, 118], [1480, 90]];
export function plateKeep(x, y, len, v) {
  if (len < 10 && inPoly(CROWN, x, y)) return false;
  // (dropping the grey strokes inside the hair boxes measured worse - hair e8 2.05 -> 3.47: they carry the source's
  // grey strands - so they stay)
  // the hair's white lock lines taper to sharp points over their last 10 px (the trace's ends were blunt)
  if (v >= 0.7 && x > 1270 && x < 1460 && y > 140 && y < 360) return { w: 1, tl: 10 };
  if (x > 1154 && x < 1170 && y > 537 && y < 553 && len < 14) return false;
  if (len < 8 && x > 2040 && x < 2180 && y > 540 && y < 680) return false;
  // the owl's plaster: its dark outline drawn at 0.7 of the traced width (the source's is ~1.3 px, the trace ~1.9)
  if (v < 0.45 && x > 1483 && x < 1577 && y > 278 && y < 358) return 0.7;
  // (fix pass 2 tried, inside the owl: its dark strokes darker (x0.4-0.6) and / or thinner; the head edge's grey
  // strokes dropped; the light strokes dropped. Every variant measured worse - owl s8 1.71 -> 1.9-5.2: the traced
  // strokes' mass is the source's, balanced by the correction field - so the contrast is raised on the finished plate
  // instead, mass-preserving: owlContrast below.)
  return true;
}
// the owl's silhouette (frame px, measured on the 727-763 mean; a little inside the outline on the dark side)
export const OWL = [[1500, 275], [1540, 255], [1590, 232], [1620, 238], [1650, 262], [1672, 320], [1676, 380], [1672, 415], [1706, 425], [1732, 470], [1745, 540], [1746, 610], [1740, 640], [1768, 655], [1785, 690], [1775, 712], [1735, 712], [1700, 730], [1668, 728], [1640, 700], [1610, 672], [1575, 652], [1530, 622], [1490, 592], [1460, 555], [1452, 510], [1462, 470], [1490, 445], [1512, 440], [1515, 400], [1512, 330]];
// the owl's re-contrasted zones: the head's right edge, the body's right edge, the tail
const OWL_CZ = [[[1600, 240], [1690, 240], [1690, 430], [1630, 430], [1640, 330]], [[1690, 420], [1770, 420], [1770, 650], [1700, 650], [1705, 520]], [[1590, 600], [1700, 600], [1720, 640], [1795, 640], [1795, 740], [1590, 740]]];

// The pencil's graphite tip: a small dark cone at the point (1158, 546), as in the source; the traced tip had only
// the outline and a stray cross.
export function pencilTip(plate) {
  const g = ctx2d(plate);
  g.beginPath(); g.moveTo(1157.5, 546.2); g.lineTo(1171.5, 541.6); g.quadraticCurveTo(1173, 546, 1172, 550.4); g.closePath();
  g.fillStyle = col(0.16); g.fill();
  return plate;
}
// Hook on the plate's blurred tone before its ink strokes (paintTraced beforeFine). (Crushing the hair boxes' greys to
// black was tried and measured worse - hair box e8 3.5 -> 7.4 - so it is not done.)
export function plateBeforeFine(B) { grainRegions(B); }
