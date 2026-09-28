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
];
export function grainRegions(B) {
  const g = ctx2d(B);
  for (const poly of GRAIN) {
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
      const v = S[i] + q * Math.min(1, 5 * S[i] * (1 - S[i])), o = L[i] + (v - L[i]) * k;
      d[4 * i] = o * 255 * TINT[0]; d[4 * i + 1] = o * 255 * TINT[1]; d[4 * i + 2] = o * 255 * TINT[2];
    }
    g.putImageData(im, x0, y0);
  }
}

export function lineFaces(plate) {
  for (const [poly, o] of FACES) (o.smear ? smearFill : o.streak ? streakFill : lineFill)(plate, poly, o);
  knitCuff(plate);
  pencilTip(plate);
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
  const { X0, Y0, X1, Y1, TOP, BOT, xL, xR, phi, NU, NV, GAPV, INS, fadeW, seed, RIB = 0 } = K, W = X1 - X0, H = Y1 - Y0, n = W * H;
  const pg = ctx2d(plate);
  const L = lumOf(pg.getImageData(X0, Y0, W, H).data, n), T = blurF(L, W, H, 3);
  const C = canvas(W, H), g = ctx2d(C);
  g.translate(-X0, -Y0);
  const xu = (u) => xL + ((xR - xL) * Math.sin(u * phi)) / Math.sin(phi);
  const P0 = (u, v) => { const x = xu(u), yt = yAt(TOP, x), yb = yAt(BOT, x); return [x, yt + (yb - yt) * v]; };
  // grid nodes, displaced by smooth noise (rib lines wobble along their length, row lines along theirs)
  const N = [];
  for (let i = 0; i <= NU; i++) { N.push([]); for (let j = 0; j <= NV; j++) {
    const [x, y] = P0(i / NU, j / NV), edge = j === 0 || j === NV ? 0.3 : 1;
    N[i].push([x + edge * (1.5 * nz(i * 0.9, j * 0.45, 71 + seed) + 0.9 * (hash01(i, j, 73 + seed) - 0.5)), y + edge * (1.4 * nz(i * 0.45, j * 0.9, 72 + seed) + 0.9 * (hash01(i, j, 74 + seed) - 0.5))]); } }
  g.beginPath();
  for (let k = 0; k <= NU; k++) { const [x, y] = N[k][0]; if (k) g.lineTo(x, y); else g.moveTo(x, y); }
  for (let k = NU; k >= 0; k--) { const [x, y] = N[k][NV]; g.lineTo(x, y); }
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
    const rr = Math.max(1.5, Math.hypot(R[2][0] - R[0][0], R[2][1] - R[0][1]) * 0.55);
    const gr = g.createRadialGradient(c[0] - 0.3, c[1] - 0.4, 0, c[0], c[1], rr);
    gr.addColorStop(0, col(Math.min(0.97, v * 1.48))); gr.addColorStop(0.55, col(v * 1.02)); gr.addColorStop(1, col(v * 0.52));
    g.fillStyle = gr; g.fill();
  };
  for (let i = 0; i < NU; i++) for (let j = 0; j < NV; j++) {
    const merge = j < NV - 1 && hash01(i, j, 64 + seed) < 0.05 && !(j > 0 && hash01(i, j - 1, 64 + seed) < 0.05);
    if (j > 0 && hash01(i, j - 1, 64 + seed) < 0.05 && !(j > 1 && hash01(i, j - 2, 64 + seed) < 0.05)) continue;   // merged into the cell above
    const j1 = merge ? j + 2 : j + 1;
    const Q = [N[i][j], N[i + 1][j], N[i + 1][j1], N[i][j1]];
    const cx = (Q[0][0] + Q[2][0]) / 2, cy = (Q[0][1] + Q[2][1]) / 2;
    const pu = Math.hypot(Q[1][0] - Q[0][0], Q[1][1] - Q[0][1]), pv = Math.hypot(Q[3][0] - Q[0][0], Q[3][1] - Q[0][1]);
    const jit = 0.6 + 0.9 * hash01(i, j, 65 + seed);
    const iu = Math.min(INS[0], INS[1] * pu) * jit, iv = Math.min(INS[2], INS[3] * pv / (merge ? 2 : 1)) * jit;
    // the blob covers ~0.93 of its inset quad (rounded corners); its mean value is ~0.98 of the nominal one
    const fill = Math.max(0.15, ((pu - 2 * iu) * (pv - 2 * iv)) / (pu * pv)) * 0.93 * 0.97;
    // ribs alternate a little in value (knit ribs catch the light unevenly), plus per-cell variation
    const rib = 1 + RIB * (i % 2 ? 1 : -1);
    const v = Math.max(0, Math.min(0.9, ((tAt(cx, cy) - GAPV * (1 - fill)) / fill) * rib * (0.84 + 0.32 * hash01(i, j, 63 + seed))));
    blob(Q, iu, iv, v);
  }
  // keep the plate's own blurred tone exactly: a smooth gain field (blurred target / blurred knit, radius 6 px) on the
  // knit, so the cells' rounded corners and bright middles do not shift the value study (measured +2 / -4 levels
  // without it, varying with the cell shape across the cuff)
  { const cg = ctx2d(C), im = cg.getImageData(0, 0, W, H), d = im.data, Lk = lumOf(d, n);
    const A = blurF(Float32Array.from(Lk), W, H, 6), B = blurF(Float32Array.from(L), W, H, 6);
    for (let q = 0; q < n; q++) { if (d[4 * q + 3] === 0) continue; const k = Math.max(0.7, Math.min(1.45, (B[q] + 0.004) / (A[q] + 0.004)));
      d[4 * q] = Math.min(255, d[4 * q] * k); d[4 * q + 1] = Math.min(255, d[4 * q + 1] * k); d[4 * q + 2] = Math.min(255, d[4 * q + 2] * k); }
    cg.putImageData(im, 0, 0); }
  const S = canvas(W, H), sg = ctx2d(S); sg.filter = "blur(0.4px)"; sg.drawImage(C, 0, 0); sg.filter = "none";
  const fade = sg.createLinearGradient(xL - X0, 0, xL - X0 + fadeW, 0); fade.addColorStop(0, "rgba(0,0,0,0)"); fade.addColorStop(1, "rgba(0,0,0,1)");
  sg.globalCompositeOperation = "destination-in"; sg.fillStyle = fade; sg.fillRect(0, 0, W, H); sg.globalCompositeOperation = "source-over";
  pg.drawImage(S, X0, Y0);
  return plate;
}

export function knitCuff(plate) {
  return knitPatch(plate, { X0: 1630, Y0: 98, X1: 1900, Y1: 300, TOP: CUFF_TOP, BOT: CUFF_BOT, xL: 1640, xR: 1893, phi: 1.0, NU: 42, NV: 17, GAPV: 0.035, INS: [0.8, 0.13, 0.5, 0.075], fadeW: 32, seed: 0, RIB: 0.1 });
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
  return true;
}
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
