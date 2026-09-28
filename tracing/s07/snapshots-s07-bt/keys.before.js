// s07 keyboard: the key caps redrawn crisp over the static plate (fix pass 3). The traced plate draws each cap as its
// traced black core (the tracer's ink shapes, blacks below 45) with wobbly edges, grey legend smears and grey gaps;
// the source shows crisp dark rounded caps with thin bright gaps. Here, inside the key field and away from the hands:
//  - a margin of the bright gap value (0.6, the silver deck seen between the caps) is laid round every cap, so the
//    gaps between neighbouring caps come out clean, 3-4 px wide as measured on profiles across the source's gaps;
//  - every traced cap core is refitted as a quadrilateral (its convex hull reduced to 4 corners); caps whose core fills
//    >= 82 % of that quad are drawn as rounded quads grown 1.25 px (the core sits inside the cap's soft edge), the
//    rest (caps cut by a finger, joined caps) keep their traced outline, grown the same;
//  - each cap gets a small legend tick instead of the traced smear.
// Everything stays outside the hands: a skin mask (the plate's own light mass, blurred 3.5 px above ~0.52, grown 2 px)
// keeps the traced fingers, palms and the deck border as they are. Deterministic; runs once when the plate is built.
import { decode, ctx2d, canvas, TINT } from "./tracekit.js";

// The key field (frame px), generous: the bright deck border inside it counts as "skin" and is left alone.
export const KEY_FIELD = [[446, 680], [968, 524], [1052, 636], [600, 799]];
// swept (blurred error over the keys, frames 12 and 24): grow 1.1-2.1, gap 0.56-0.84, margin 2.5-5.5 px; lowest here
const GAP = 0.6, CAP = 0.055, LEG = 0.36, GROW = 1.25, MARG = 3;

const col = (v) => `rgb(${(v * 255 * TINT[0]).toFixed(1)},${(v * 255 * TINT[1]).toFixed(1)},${(v * 255 * TINT[2]).toFixed(1)})`;
function inPoly(P, x, y) {
  let c = false;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    const [xi, yi] = P[i], [xj, yj] = P[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}
const area = (P) => { let a = 0; for (let i = 0; i < P.length; i++) { const [x0, y0] = P[i], [x1, y1] = P[(i + 1) % P.length]; a += x0 * y1 - x1 * y0; } return a / 2; };
function hull(P) {
  const p = P.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  lo.pop(); up.pop();
  return lo.concat(up);
}
// reduce a convex polygon to 4 corners, each step dropping the vertex whose removal loses the least area
function quadOf(H) {
  const h = H.slice();
  while (h.length > 4) {
    let bi = 0, ba = Infinity;
    for (let i = 0; i < h.length; i++) {
      const a = h[(i + h.length - 1) % h.length], b = h[i], c = h[(i + 1) % h.length];
      const ar = Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1])) / 2;
      if (ar < ba) { ba = ar; bi = i; }
    }
    h.splice(bi, 1);
  }
  return h;
}
function angleOk(Q) {
  for (let i = 0; i < 4; i++) {
    const a = Q[(i + 3) % 4], b = Q[i], c = Q[(i + 1) % 4];
    const u = [a[0] - b[0], a[1] - b[1]], v = [c[0] - b[0], c[1] - b[1]];
    const cs = (u[0] * v[0] + u[1] * v[1]) / (Math.hypot(...u) * Math.hypot(...v) || 1);
    if (Math.abs(cs) > 0.72) return false;   // corners between ~44 and ~136 degrees
  }
  return true;
}
// rounded quad: corners cut by r along each side (quadratic corners)
function roundQuad(g, Q, r) {
  const n = Q.length;
  const pt = (a, b, d) => { const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, k = Math.min(0.45, d / L); return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]; };
  g.beginPath();
  for (let i = 0; i < n; i++) {
    const p = Q[i], a = Q[(i + n - 1) % n], b = Q[(i + 1) % n];
    const s = pt(p, a, r), e = pt(p, b, r);
    if (i) g.lineTo(s[0], s[1]); else g.moveTo(s[0], s[1]);
    g.quadraticCurveTo(p[0], p[1], e[0], e[1]);
  }
  g.closePath();
}

// Light-mass mask of a canvas region (the same test the hands layer uses), grown 2 px and feathered 1.5 px.
export function lightMask(src, x0, y0, w, h, thr = 0.52) {
  const B = canvas(w, h), bg = ctx2d(B);
  // 3.5 px: a cap's small white legend blob (~6 x 4 px) must not count as light mass
  bg.filter = "blur(3.5px)"; bg.drawImage(src, x0, y0, w, h, 0, 0, w, h); bg.filter = "none";
  const im = bg.getImageData(0, 0, w, h), d = im.data;
  for (let i = 0; i < d.length; i += 4) { const L = (d[i] + d[i + 1] + d[i + 2]) / 765; d[i] = d[i + 1] = d[i + 2] = 255; d[i + 3] = L > thr ? 255 : 0; }
  bg.putImageData(im, 0, 0);
  const M = canvas(w, h), mg = ctx2d(M);
  mg.filter = "blur(1.5px)";
  for (const [dx, dy] of [[0, 0], [2, 0], [-2, 0], [0, 2], [0, -2], [1.4, 1.4], [-1.4, 1.4], [1.4, -1.4], [-1.4, -1.4]]) mg.drawImage(B, dx, dy);
  mg.filter = "none";
  return M;
}

// Redraw the caps over the plate canvas (frame size), in place. SHAPES: the plate's ink-shape data.
export function crispKeys(plate, SHAPES) {
  const S = decode(SHAPES);
  const xs = KEY_FIELD.map((p) => p[0]), ys = KEY_FIELD.map((p) => p[1]);
  const X0 = Math.floor(Math.min(...xs)) - 2, Y0 = Math.floor(Math.min(...ys)) - 2, X1 = Math.ceil(Math.max(...xs)) + 2, Y1 = Math.ceil(Math.max(...ys)) + 2;
  const w = X1 - X0, h = Y1 - Y0;
  const K = canvas(w, h), g = ctx2d(K);
  g.translate(-X0, -Y0);
  g.lineJoin = "round";
  const caps = [];
  let i = 0;
  while (i < S.length) {
    const nr = S[i++], v = S[i++] / 1000;
    let outer = null;
    for (let r = 0; r < nr; r++) {
      const n = S[i++], pts = [];
      for (let k = 0; k < n; k++) pts.push([S[i + 2 * k] / 2, S[i + 2 * k + 1] / 2]);
      i += 2 * n;
      if (r === 0) outer = pts;
    }
    if (v > 0.25 || !outer || outer.length < 3) continue;
    let cx = 0, cy = 0; for (const [x, y] of outer) { cx += x; cy += y; } cx /= outer.length; cy /= outer.length;
    if (!inPoly(KEY_FIELD, cx, cy)) continue;
    const a = Math.abs(area(outer));
    if (a < 25) continue;
    const Q = quadOf(hull(outer)), qa = Math.abs(area(Q));
    caps.push({ outer, Q, good: a / qa >= 0.82 && a > 60 && a < 1600 && angleOk(Q), cx, cy, a });
  }
  const capPath = (c) => {
    if (c.good) {
      // grow the quad about its centre by GROW px
      const qx = c.Q.reduce((s, p) => s + p[0], 0) / 4, qy = c.Q.reduce((s, p) => s + p[1], 0) / 4;
      const Q = c.Q.map(([x, y]) => { const dx = x - qx, dy = y - qy, l = Math.hypot(dx, dy) || 1; return [x + (dx / l) * GROW * 1.41, y + (dy / l) * GROW * 1.41]; });
      roundQuad(g, Q, 3.2);
    } else { g.beginPath(); c.outer.forEach(([x, y], k) => (k ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); }
  };
  // the bright gaps: a margin of the gap value round every cap (so dark areas no cap explains - finger shadows - keep
  // the plate), then the caps over them
  g.fillStyle = col(GAP); g.strokeStyle = col(GAP); g.lineWidth = 2 * GROW + MARG;
  for (const c of caps) { capPath(c); g.fill(); g.stroke(); }
  g.fillStyle = col(CAP); g.strokeStyle = col(CAP); g.lineWidth = 2 * GROW;
  for (const c of caps) { capPath(c); g.fill(); if (!c.good) g.stroke(); }
  // legend ticks: a short light mark left of each cap's middle, following the row direction
  g.lineCap = "round"; g.strokeStyle = col(LEG); g.lineWidth = 0.9;
  for (const c of caps) {
    if (!c.good || c.a < 90) continue;
    const Q = c.Q;
    // the cap's longer side pair gives the row direction
    const e0 = [Q[1][0] - Q[0][0], Q[1][1] - Q[0][1]], e1 = [Q[2][0] - Q[1][0], Q[2][1] - Q[1][1]];
    const d = Math.hypot(...e0) > Math.hypot(...e1) ? e0 : e1, L = Math.hypot(...d) || 1, ux = d[0] / L, uy = d[1] / L;
    const len = Math.min(3, 0.12 * L);
    g.beginPath(); g.moveTo(c.cx - ux * len, c.cy - uy * len); g.lineTo(c.cx + ux * len * 0.3, c.cy + uy * len * 0.3); g.stroke();
  }
  // keep the hands (and the deck border) of the plate as they are
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = "destination-out"; g.drawImage(lightMask(plate, X0, Y0, w, h), 0, 0);
  g.globalCompositeOperation = "source-over";
  ctx2d(plate).drawImage(K, X0, Y0);
  return plate;
}
