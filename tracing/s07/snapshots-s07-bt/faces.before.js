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
export function knitCuff(plate) {
  const X0 = 1644, Y0 = 98, X1 = 1900, Y1 = 300, W = X1 - X0, H = Y1 - Y0, n = W * H;
  const pg = ctx2d(plate);
  const L = lumOf(pg.getImageData(X0, Y0, W, H).data, n), T = blurF(L, W, H, 3);
  const C = canvas(W, H), g = ctx2d(C);
  g.translate(-X0, -Y0);
  const xL = 1652, xR = 1893, phi = 1.0, NU = 40, NV = 17, GAPV = 0.025;
  const xu = (u) => xL + ((xR - xL) * Math.sin(u * phi)) / Math.sin(phi);
  const P = (u, v) => { const x = xu(u), yt = yAt(CUFF_TOP, x), yb = yAt(CUFF_BOT, x); return [x, yt + (yb - yt) * v]; };
  // the patch outline, filled with the dark gap value
  g.beginPath();
  for (let k = 0; k <= 40; k++) { const [x, y] = P(k / 40, 0); if (k) g.lineTo(x, y); else g.moveTo(x, y); }
  for (let k = 40; k >= 0; k--) { const [x, y] = P(k / 40, 1); g.lineTo(x, y); }
  g.closePath();
  g.fillStyle = col(GAPV); g.fill();
  const tAt = (x, y) => { const ix = Math.max(0, Math.min(W - 1, Math.round(x - X0))), iy = Math.max(0, Math.min(H - 1, Math.round(y - Y0))); return T[iy * W + ix]; };
  for (let i = 0; i < NU; i++) for (let j = 0; j < NV; j++) {
    const u0 = i / NU, u1 = (i + 1) / NU, v0 = j / NV, v1 = (j + 1) / NV;
    const Q = [P(u0, v0), P(u1, v0), P(u1, v1), P(u0, v1)];
    const cx = (Q[0][0] + Q[2][0]) / 2, cy = (Q[0][1] + Q[2][1]) / 2;
    // inset toward the centre (the dark rib/row lines; thinner where the ribs crowd), corners jittered a little so the
    // knit is hand-drawn; the value keeps the local blurred tone for this cell's own fill fraction
    const pu = Math.hypot(Q[1][0] - Q[0][0], Q[1][1] - Q[0][1]), pv = Math.hypot(Q[3][0] - Q[0][0], Q[3][1] - Q[0][1]);
    const iu = Math.min(1.2, 0.17 * pu), iv = Math.min(1.25, 0.17 * pv);
    const ux = (Q[1][0] - Q[0][0]) / pu, uy = (Q[1][1] - Q[0][1]) / pu, vx = (Q[3][0] - Q[0][0]) / pv, vy = (Q[3][1] - Q[0][1]) / pv;
    const sgn = [[1, 1], [-1, 1], [-1, -1], [1, -1]];
    const R = Q.map(([x, y], k) => { const ja = (hash01(i * 4 + k, j, 61) - 0.5) * 0.7, jb = (hash01(i * 4 + k, j, 62) - 0.5) * 0.7;
      return [x + ux * sgn[k][0] * iu + vx * sgn[k][1] * iv + ja, y + uy * sgn[k][0] * iu + vy * sgn[k][1] * iv + jb]; });
    const fill = Math.max(0.15, ((pu - 2 * iu) * (pv - 2 * iv)) / (pu * pv));
    const v = Math.max(0, Math.min(0.95, ((tAt(cx, cy) - GAPV * (1 - fill)) / fill) * (0.88 + 0.24 * hash01(i, j, 63))));
    g.beginPath(); R.forEach(([x, y], k) => (k ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath();
    g.fillStyle = col(v); g.fill();
  }
  // soft edges against the band and the silhouette; at the left the grid fades over 28 px into the traced ribs of the
  // cuff's lit front (x < 1652), which stay as traced
  const S = canvas(W, H), sg = ctx2d(S); sg.filter = "blur(0.45px)"; sg.drawImage(C, 0, 0); sg.filter = "none";
  const fade = sg.createLinearGradient(xL - X0, 0, xL - X0 + 28, 0); fade.addColorStop(0, "rgba(0,0,0,0)"); fade.addColorStop(1, "rgba(0,0,0,1)");
  sg.globalCompositeOperation = "destination-in"; sg.fillStyle = fade; sg.fillRect(0, 0, W, H); sg.globalCompositeOperation = "source-over";
  pg.drawImage(S, X0, Y0);
  return plate;
}

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
