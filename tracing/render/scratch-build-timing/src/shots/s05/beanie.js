// s05 beanie: a knit beanie with a folded cuff, seen from behind his right shoulder. Traced on the source at 25.00 s
// (snapshots/s05-fix1-study/t-beanie.jpg, t-knit.jpg; edges from luminance runs):
//  - the cuff's lower edge meets the black hair along CUFF_EDGE (face.js) on the left, runs on behind the headphone
//    band and ends at the right at x ~1885;
//  - the fold (the cuff's top edge) is a dark double line from the top of the frame at x ~1335 through (1450, 80),
//    (1600, 140) to (1750, 149), turning up at the right end;
//  - light falls from the screen at the left: the cuff there is pale (post-grade 140–165) with ribs running across the
//    band; the crown reads ~100 on the left, ~70 in the middle, ~30 at the far right; the cuff under the fold on the
//    right is dark (20–50) with a fine grid knit.
import { rng, taper, poly, curve, along, clearO, sampleCurve, grey } from "./kit.js";

const INKD = "#0b0b0b";

export const FOLD = [[1318, -40], [1343, -8], [1352, 2], [1362, 10], [1372, 18], [1382, 30], [1392, 40], [1400, 50], [1450, 80], [1500, 107], [1550, 128], [1600, 140], [1650, 146], [1700, 150], [1750, 149], [1800, 145], [1840, 138], [1868, 126], [1888, 104]];
export const BOTTOM = [[1291, -16], [1284, 8], [1276, 30], [1272, 46], [1276, 62], [1284, 80], [1293, 95], [1300, 105], [1320, 133], [1340, 152], [1360, 170], [1380, 187], [1400, 201], [1420, 216], [1440, 228], [1460, 238], [1500, 246], [1550, 252], [1600, 262], [1650, 276], [1700, 292], [1740, 287], [1780, 280], [1820, 268], [1850, 249], [1872, 238], [1884, 214], [1888, 160], [1888, 104]];
export const CUFF = [...FOLD, ...BOTTOM.slice().reverse()];
export const CROWN = [[1296, -80], [1930, -80], [1912, -10], [1908, 36], [1901, 72], [1888, 104], ...FOLD.slice().reverse()];
export const BEANIE_MASK = [(c) => poly(CUFF)(c), (c) => poly(CROWN)(c)];

// value (pre-grade) along x, measured as blurred means of the source (vignette ~0.85 there taken into account)
const CROWN_V = [[1300, 0.56], [1400, 0.5], [1500, 0.47], [1560, 0.44], [1620, 0.38], [1700, 0.33], [1760, 0.27], [1800, 0.2], [1850, 0.16], [1910, 0.12]];
const CUFF_V = [[1270, 0.8], [1330, 0.76], [1400, 0.64], [1460, 0.56], [1520, 0.5], [1560, 0.44], [1620, 0.38], [1680, 0.33], [1760, 0.3], [1840, 0.26], [1890, 0.2]];
const gradX = (T, y0 = 0) => (g) => { const gr = g.createLinearGradient(T[0][0], y0, T[T.length - 1][0], y0); const L = T[T.length - 1][0] - T[0][0]; T.forEach(([x, v]) => gr.addColorStop((x - T[0][0]) / L, grey(v))); return gr; };

// point at (u, v) of a band between two polylines sampled alike (u along, v across)
function bandAt(A, B, u, v) {
  const n = A.length - 1, f = Math.max(0, Math.min(n, u * n)), i = Math.min(n - 1, Math.floor(f)), k = f - i;
  const p = [A[i][0] + (A[i + 1][0] - A[i][0]) * k, A[i][1] + (A[i + 1][1] - A[i][1]) * k];
  const q = [B[i][0] + (B[i + 1][0] - B[i][0]) * k, B[i][1] + (B[i + 1][1] - B[i][1]) * k];
  return [p[0] + (q[0] - p[0]) * v, p[1] + (q[1] - p[1]) * v];
}
const lerpT = (T, x) => { if (x <= T[0][0]) return T[0][1]; for (let i = 1; i < T.length; i++) if (x <= T[i][0]) { const [a, va] = T[i - 1], [b, vb] = T[i]; return va + (vb - va) * (x - a) / (b - a); } return T[T.length - 1][1]; };

// A hand-drawn knit grid over a band: columns (ribs) across it and rows along it, jittered. Where the knit is lit
// the lines fade (every other column dropped), where it is dark they thicken until only small pale cells remain.
function knitGrid(o, A, B, NR, NV, lit, r, { skipLit = 0.8, wLit = 1.6 } = {}) {
  for (let i = 1; i < NR; i++) {
    const u = (i + (r() - 0.5) * 0.25) / NR, pts = [];
    for (let k = 0; k <= 10; k++) { const [x, y] = bandAt(A, B, u + Math.sin(k * 0.7 + i) * 0.001, k / 10); pts.push([x + (r() - 0.5) * 0.9, y + (r() - 0.5) * 0.9]); }
    const q = sampleCurve(pts, 3);
    for (let j = 0; j < q.length - 3; j += 3) {
      const seg = q.slice(j, j + 4), L = lit(seg[0][0]), f = Math.max(0, Math.min(1, (0.46 - L) / 0.14));
      if (f < 0.3 && i % 2 && r() < skipLit) continue;
      const w = f > 0.3 ? 1.6 + 1.0 * f : wLit + r() * 0.8, al = 0.45 + 0.45 * Math.max(f, r() * 0.5);
      taper(o, seg, () => w * (0.85 + 0.3 * r()), `rgba(8,8,8,${al.toFixed(2)})`);
    }
  }
  for (let k = 1; k < NV; k++) {
    const v = (k + (r() - 0.5) * 0.2) / NV, pts = [];
    for (let i = 0; i <= 80; i++) { const [x, y] = bandAt(A, B, i / 80, v); pts.push([x + (r() - 0.5) * 0.7, y + (r() - 0.5) * 0.7]); }
    const q = sampleCurve(pts, 2);
    for (let j = 0; j < q.length - 3; j += 3) {
      const seg = q.slice(j, j + 4), L = lit(seg[0][0]), f = Math.max(0, Math.min(1, (0.46 - L) / 0.14));
      if (f < 0.05 && r() < 0.7) continue;
      taper(o, seg, () => (0.7 + 1.8 * f) * (0.8 + 0.4 * r()), `rgba(8,8,8,${(0.15 + 0.75 * f).toFixed(2)})`);
    }
  }
}

export function paintBeanie(P) {
  const o = P.o, r = rng(451);
  clearO(P, poly(CUFF)); clearO(P, poly(CROWN));
  const sp = (s) => (s / 4.2 - 0.55) / 1.35;      // plate spacing factor for a line pitch of s px
  // ---- base tone: fine engraved hatching (the knit's stitch texture) whose weight follows the light
  P.fill(poly(CROWN), gradX(CROWN_V), 1.25, { style: 2 });
  P.light(poly([[1590, 10], [1660, 30], [1700, 68], [1640, 64], [1575, 52]]), 0.3, "source-over", 0.4);
  P.fill(poly(CUFF), gradX(CUFF_V), 0.75, { style: 2 });
  // the stitch texture: fine, low-contrast broken ticks (dark and pale) over the flat tone
  for (const [shape, ang, n, sd] of [[CROWN, -0.35, 5200, 471], [CUFF, 0.35, 4200, 472]]) {
    const rr = rng(sd);
    o.save(); o.beginPath(); poly(shape)(o); o.clip();
    for (let i = 0; i < n; i++) {
      const x = 1270 + rr() * 640, y = -10 + rr() * 310, a = ang + (rr() - 0.5) * 0.3, L = 5 + rr() * 7;
      const pale = rr() < 0.45;
      o.strokeStyle = pale ? `rgba(236,234,228,${(0.06 + 0.1 * rr()).toFixed(2)})` : `rgba(8,8,8,${(0.1 + 0.14 * rr()).toFixed(2)})`;
      o.lineWidth = 0.7 + rr() * 0.6;
      o.beginPath(); o.moveTo(x, y); o.lineTo(x + Math.cos(a) * L, y + Math.sin(a) * L); o.stroke();
    }
    o.restore();
  }
  // the cuff's lit lip along its lower edge on the left (a pale band ~10 px wide)
  o.save(); o.beginPath(); poly(CUFF)(o); o.clip();
  taper(o, sampleCurve(BOTTOM.slice(4, 16).map(([x, y]) => [x + 7, y - 7]), 6), (u) => 11 * Math.sin(Math.PI * Math.min(1, u * 1.1)), "rgba(230,228,222,0.35)");
  o.restore();
  // ---- cuff: ribs across the band (~14 px apart along it), knit rows along it (~7.5 px apart); in the lit left
  // the ribs dominate and the rows are faint, in the dark right the rows close up into a grid of small pale cells
  const N = 80, A = along(FOLD, N), B = along(BOTTOM, N);
  o.save(); o.beginPath(); poly(CUFF)(o); o.clip();
  knitGrid(o, A, B, 96, 22, (x) => lerpT(CUFF_V, x), r, { skipLit: 0.8 });
  o.restore();
  // ---- crown: the same knit seen on the turning crown: ribs rise from the fold, leaning and converging upward;
  // rows run parallel to the fold. The grid reads where the crown is dark (right), fades out in the light (left)
  o.save(); o.beginPath(); poly(CROWN)(o); o.clip();
  const CA = along(FOLD, N), CB = CA.map(([x, y]) => [1640 + (x - 1640) * 0.82, y - 230]);
  knitGrid(o, CA, CB, 70, 26, (x) => lerpT(CROWN_V, x) + 0.1, r, { skipLit: 0.55, wLit: 1.2 });
  // the crease across the crown (t-knit.jpg: from (1572, 11) curving down to (1700, 67))
  curve(o, [[1596, 6], [1628, 22], [1660, 44], [1692, 67]], 2.2, "rgba(6,6,6,0.8)", 461);
  curve(o, [[1566, 46], [1610, 53], [1652, 60], [1692, 70]], 1.8, "rgba(6,6,6,0.7)", 462);
  curve(o, [[1697, 10], [1699, 40], [1700, 70]], 1.4, "rgba(6,6,6,0.55)", 463);
  o.restore();
  // ---- the fold: a deep crease (dark double line) with the cuff's lit lip just under it on the left
  taper(o, sampleCurve(FOLD, 8), (u) => 5.5 * (0.55 + 0.45 * Math.sin(Math.PI * u)), INKD);
  taper(o, sampleCurve(FOLD.map(([x, y]) => [x + 2, y + 9]), 8), (u) => 2.2 * Math.sin(Math.PI * u), "rgba(8,8,8,0.7)");
  taper(o, sampleCurve(FOLD.slice(0, 7).map(([x, y]) => [x + 1, y + 5]), 8), (u) => 1.6 * Math.sin(Math.PI * u), "rgba(238,236,230,0.45)");
  // the lower edge against the hair, the lit rim on the left end
  taper(o, sampleCurve(BOTTOM.slice(3, 21), 6), (u) => 2.6 * (0.6 + 0.4 * Math.sin(Math.PI * u)), INKD);
  taper(o, sampleCurve([[1283, 4], [1276, 28], [1273, 46], [1277, 62], [1285, 80], [1296, 98]], 6), (u) => 2.2 * Math.sin(Math.PI * u), "rgba(242,240,234,0.7)");
}
