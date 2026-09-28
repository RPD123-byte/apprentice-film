// s04 (b1 pass): small features of his face on the hold key (20.56) as authored shapes, where the tracer smeared them
// (eyebrows) or dropped them (the sweat drops on his forehead). Positions measured on the 20.56 frame at 3-5x
// (snapshots/s04-b1/g-browL.jpg, g-browR.jpg, g-forehead.jpg, g-cheeks.jpg). Drawn into the key canvas, so the key's
// measured flow carries them through the landing and the hold (19.56-20.84).
import { hash } from "../../lib/rng.js";

const grey = (v) => { const c = Math.max(0, Math.min(255, Math.round(v))); return `rgb(${c},${c},${c})`; };
// brows: centre line [x, y, width] from the outer (under the hair) to the inner end
const BROWS = [
  [[835, 197, 9], [855, 197, 13], [875, 201, 15], [895, 206, 15], [915, 214, 12], [930, 224, 8], [940, 232, 3]],
  [[1245, 195, 8], [1230, 193, 12], [1205, 195, 15], [1180, 199, 16], [1155, 206, 14], [1135, 215, 10], [1120, 226, 4]],
];
// sweat drops: tail top, bulb centre + radius, where the right side of the outline ends
const DROPS = [
  { top: [912, 146], c: [915, 160], r: 4.5, end: [919.5, 155] },
  { top: [1139, 132], c: [1143, 164], r: 5, end: [1148, 154] },
  { top: [1163, 104], c: [1169, 118], r: 5, end: [1174, 112] },
  { top: [1272, 522], c: [1275, 537], r: 5, end: [1280, 531] },
];
function sampleLine(P, step) {
  const out = [];
  for (let i = 0; i < P.length - 1; i++) {
    const a = P[i], b = P[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.round(L / step));
    for (let k = 0; k < n; k++) { const t = k / n; out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, Math.atan2(b[1] - a[1], b[0] - a[0])]); }
  }
  const z = P[P.length - 1], y = P[P.length - 2]; out.push([z[0], z[1], z[2], Math.atan2(z[1] - y[1], z[0] - y[0])]);
  return out;
}
function hairStroke(g, x, y, a, L, w, v) {
  const dx = Math.cos(a), dy = Math.sin(a), nx = -dy, ny = dx;
  g.beginPath();
  g.moveTo(x + nx * w * 0.5, y + ny * w * 0.5);
  g.quadraticCurveTo(x + dx * L * 0.5 + nx * w * 0.6, y + dy * L * 0.5 + ny * w * 0.6, x + dx * L, y + dy * L);
  g.quadraticCurveTo(x + dx * L * 0.5 - nx * w * 0.6, y + dy * L * 0.5 - ny * w * 0.6, x - nx * w * 0.5, y - ny * w * 0.5);
  g.closePath(); g.fillStyle = grey(v); g.fill();
}
// track: as paintHisEyes (the brows follow their eye's measured affine); drops: draw the sweat drops (the 20.56 key)
export function paintHisFace(g, M, tshift = 0, track = null, drops = true) {
  const T = 0;
  g.save();
  // brows: a dark core, then dense hair strokes laid along the brow (leaning to its lower edge), spilling past its edges
  BROWS.forEach((B, bi) => {
    const A = track ? track[bi ? "R" : "L"].A : [1, 0, 0, 0, 1, 0];
    g.setTransform(A[0], A[3], A[1], A[4], A[2] + M + 0.5, A[5] + M + 0.5);
    const S = sampleLine(B, 1.4);
    g.beginPath();
    S.forEach(([x, y, w, a], i) => { const nx = -Math.sin(a), ny = Math.cos(a); const X = x - nx * w * 0.3, Y = y - ny * w * 0.3; if (i) g.lineTo(X, Y); else g.moveTo(X, Y); });
    for (let i = S.length - 1; i >= 0; i--) { const [x, y, w, a] = S[i]; const nx = -Math.sin(a), ny = Math.cos(a); g.lineTo(x + nx * w * 0.3, y + ny * w * 0.3); }
    g.closePath(); g.fillStyle = grey(48 + T * 0.3); g.fill();
    S.forEach(([x, y, w, a], i) => {
      for (let k = 0; k < 4; k++) {
        const h = (q) => hash(i, k, bi, q);
        const off = (h(1) - 0.5) * w * 1.05, nx = -Math.sin(a), ny = Math.cos(a);
        const x0 = x + nx * off - Math.cos(a) * 5, y0 = y + ny * off - Math.sin(a) * 5;
        const lean = (bi ? -1 : 1) * (0.12 + 0.22 * h(2));
        const L = (0.55 + 0.45 * Math.min(1, w / 12)) * (9 + 9 * h(3));
        hairStroke(g, x0, y0, a + lean, L, 1.0 + 1.1 * h(4), 14 + 46 * h(5) + T * 0.3);
      }
    });
  });
  // sweat drops: a thin dark outline down the tail, round the bulb and a little way up its other side; a lit inside
  g.setTransform(1, 0, 0, 1, M + 0.5, M + 0.5);
  if (drops) for (const D of DROPS) {
    const [tx, ty] = D.top, [cx, cy] = D.c, r = D.r, [ex, ey] = D.end;
    g.beginPath(); g.moveTo(tx, ty); g.quadraticCurveTo(cx - r * 1.1, cy - r * 1.2, cx - r, cy);
    g.arc(cx, cy, r, Math.PI, 0.35, true);
    g.strokeStyle = grey(38 + T * 0.4); g.lineWidth = 1.7; g.lineCap = "round"; g.stroke();
    g.beginPath(); g.arc(cx + r * 0.1, cy + r * 0.1, r * 0.55, 0, Math.PI * 2); g.fillStyle = grey(250); g.globalAlpha = 0.8; g.fill(); g.globalAlpha = 1;
  }
  g.restore();
}
