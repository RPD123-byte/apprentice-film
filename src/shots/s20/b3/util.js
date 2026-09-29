// s20 (build 3) drawing helpers: paths, inked lines, homography warps. Everything is seeded (no Math.random).
import { rng, noise1 } from "../../../lib/rng.js";
import { taper } from "../../../lib/ink.js";
import { sampleCurve, smoothPath } from "../../../lib/paths.js";

export const TAU = Math.PI * 2;
export const poly = (pts) => (g) => { g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.closePath(); };
export const blob = (pts) => (g) => smoothPath(g, pts, true);
export const circ = (x, y, r) => (g) => { g.moveTo(x + r, y); g.arc(x, y, r, 0, TAU); };
export const ell = (x, y, rx, ry, rot = 0) => (g) => { g.moveTo(x + rx * Math.cos(rot), y + rx * Math.sin(rot)); g.ellipse(x, y, rx, ry, rot, 0, TAU); };
export const ring = (x, y, r0, r1, rx = 1) => (g) => { g.ellipse(x, y, r1 * rx, r1, 0, 0, TAU); g.moveTo(x + r0 * rx, y); g.ellipse(x, y, r0 * rx, r0, 0, 0, TAU, true); };
export const quad = (a, b, c, d) => poly([a, b, c, d]);
export const lerp2 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
// bilinear point in a quad a(tl) b(tr) c(br) d(bl)
export const bil = (a, b, c, d, u, v) => lerp2(lerp2(a, b, u), lerp2(d, c, u), v);

// a tapered ink line through control points (Catmull-Rom), width w (px), optional wobble
export function line(g, pts, w, color, { per = 8, end = 0.25, wob = 0, seed = 1, bias = 0.5 } = {}) {
  let q = pts.length > 2 ? sampleCurve(pts, per) : sampleCurve([pts[0], lerp2(pts[0], pts[1], 0.5), pts[1]], per);
  if (wob) q = q.map((p, i) => [p[0] + noise1(i * 0.3, seed) * wob, p[1] + noise1(i * 0.31, seed + 7) * wob]);
  taper(g, q, (u) => {
    const k = Math.pow(Math.sin(Math.PI * Math.min(1, Math.max(0, u < bias ? (u / bias) * 0.5 : 0.5 + ((u - bias) / (1 - bias)) * 0.5))), 0.5);
    return w * (end + (1 - end) * k);
  }, color);
}
// straight stroke with round caps
export function seg(g, a, b, w, color) {
  g.save(); g.strokeStyle = color; g.lineWidth = w; g.lineCap = "round";
  g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); g.restore();
}
export function strokePath(g, path, w, color, closed = true) {
  g.save(); g.strokeStyle = color; g.lineWidth = w; g.lineJoin = "round"; g.lineCap = "round";
  g.beginPath(); path(g); g.stroke(); g.restore();
}
export const wc = (v, a = 1) => { const c = Math.round(Math.max(0, Math.min(1, v)) * 255); return `rgba(${c},${Math.round(c * 0.992)},${Math.round(c * 0.975)},${a})`; };

// hatch lines inside a clip, direction angle, spacing sp, width w; broken, seeded
export function hatchIn(g, path, box, ang, sp, w, color, { seed = 3, broken = 0.25, jit = 0.3, lenMin = 0.3 } = {}) {
  const r = rng(seed);
  const [x0, y0, x1, y1] = box;
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, R = Math.hypot(x1 - x0, y1 - y0) / 2 + sp;
  const ca = Math.cos(ang), sa = Math.sin(ang);
  g.save(); g.beginPath(); path(g); g.clip();
  g.strokeStyle = color; g.lineCap = "round";
  for (let s = -R; s <= R; s += sp) {
    const off = s + (r() - 0.5) * sp * jit;
    const px = cx - sa * off, py = cy + ca * off;
    let t = -R;
    while (t < R) {
      const L = R * (lenMin + r() * 1.4), t2 = Math.min(R, t + L);
      if (r() > broken) { g.lineWidth = w * (0.6 + r() * 0.8); g.beginPath(); g.moveTo(px + ca * t, py + sa * t); g.lineTo(px + ca * t2, py + sa * t2); g.stroke(); }
      t = t2 + sp * (0.4 + r() * 1.5);
    }
  }
  g.restore();
}

// ---------------------------------------------------------------- homography
export function homography(src, dst) {
  const A = [], b = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = src[i], [u, v] = dst[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v);
  }
  for (let c = 0; c < 8; c++) {
    let p = c; for (let r = c + 1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]]; [b[c], b[p]] = [b[p], b[c]];
    for (let r = 0; r < 8; r++) if (r !== c) { const f = A[r][c] / A[c][c]; for (let k = c; k < 8; k++) A[r][k] -= f * A[c][k]; b[r] -= f * b[c]; }
  }
  const h = b.map((v, i) => v / A[i][i]);
  return [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1];
}
export const hmap = (H, [x, y]) => { const w = H[6] * x + H[7] * y + H[8]; return [(H[0] * x + H[1] * y + H[2]) / w, (H[3] * x + H[4] * y + H[5]) / w]; };

// draw image `img` (source rect sx0,sy0,sw,sh in image px) through a map f(u,v) -> frame, u,v in 0..1, with an
// n x m triangle mesh (affine per triangle, slightly grown to hide seams). mip (optional): a half-size copy of img;
// each triangle whose scale asks Chrome's decode cache for mip level >= 1 is then drawn from it (see card.js)
export function warpImage(g, img, f, { sx = 0, sy = 0, sw = img.width, sh = img.height, n = 8, m = 10, alpha = 1, mip = null } = {}) {
  g.save(); g.globalAlpha *= alpha;
  for (let j = 0; j < m; j++) for (let i = 0; i < n; i++) {
    const u0 = i / n, u1 = (i + 1) / n, v0 = j / m, v1 = (j + 1) / m;
    const P00 = f(u0, v0), P10 = f(u1, v0), P01 = f(u0, v1), P11 = f(u1, v1);
    tri(g, img, [sx + u0 * sw, sy + v0 * sh], [sx + u1 * sw, sy + v0 * sh], [sx + u0 * sw, sy + v1 * sh], P00, P10, P01, mip);
    tri(g, img, [sx + u1 * sw, sy + v0 * sh], [sx + u1 * sw, sy + v1 * sh], [sx + u0 * sw, sy + v1 * sh], P10, P11, P01, mip);
  }
  g.restore();
}
// the mip level Chrome's GPU image decode cache picks for drawing an image of w x h px under the 2x2 part (a b c d)
// of the current transform (cc: DrawImage ExtractScale -> scale = column lengths, ceiled target size,
// MipMapUtil::GetLevelForSize with mip axes ceil(size / 2^level))
const mipAxis = (s, L) => (L === 0 ? s : Math.max(1, (s + (1 << L) - 1) >> L));
export function mipLevel(w, h, a, b, c, d) {
  const tw = Math.ceil(w * Math.hypot(a, b)), th = Math.ceil(h * Math.hypot(c, d));
  for (let L = 0; ; L++) {
    if (mipAxis(h, L + 1) < th || mipAxis(w, L + 1) < tw) return L;
    if (mipAxis(w, L) === 1 && mipAxis(h, L) === 1) return L;
  }
}
function tri(g, img, s0, s1, s2, d0, d1, d2, mip = null) {
  // grow the destination triangle ~0.6 px about its centroid to hide the seams
  const cx = (d0[0] + d1[0] + d2[0]) / 3, cy = (d0[1] + d1[1] + d2[1]) / 3;
  const gr = (p) => { const dx = p[0] - cx, dy = p[1] - cy, l = Math.hypot(dx, dy) || 1; return [p[0] + (dx / l) * 0.6, p[1] + (dy / l) * 0.6]; };
  const e0 = gr(d0), e1 = gr(d1), e2 = gr(d2);
  g.save();
  g.beginPath(); g.moveTo(e0[0], e0[1]); g.lineTo(e1[0], e1[1]); g.lineTo(e2[0], e2[1]); g.closePath(); g.clip();
  // affine: source s -> dest d
  const [x0, y0] = s0, [x1, y1] = s1, [x2, y2] = s2;
  const [u0, v0] = d0, [u1, v1] = d1, [u2, v2] = d2;
  const den = x0 * (y1 - y2) + x1 * (y2 - y0) + x2 * (y0 - y1);
  const a = (u0 * (y1 - y2) + u1 * (y2 - y0) + u2 * (y0 - y1)) / den;
  const b = (v0 * (y1 - y2) + v1 * (y2 - y0) + v2 * (y0 - y1)) / den;
  const c = (u0 * (x2 - x1) + u1 * (x0 - x2) + u2 * (x1 - x0)) / den;
  const d = (v0 * (x2 - x1) + v1 * (x0 - x2) + v2 * (x1 - x0)) / den;
  const e = (u0 * (x1 * y2 - x2 * y1) + u1 * (x2 * y0 - x0 * y2) + u2 * (x0 * y1 - x1 * y0)) / den;
  const f = (v0 * (x1 * y2 - x2 * y1) + v1 * (x2 * y0 - x0 * y2) + v2 * (x0 * y1 - x1 * y0)) / den;
  g.transform(a, b, c, d, e, f);
  if (mip) {
    const M = g.getTransform();
    if (mipLevel(img.width, img.height, M.a, M.b, M.c, M.d) >= 1) { g.scale(img.width / mip.width, img.height / mip.height); g.drawImage(mip, 0, 0); g.restore(); return; }
  }
  g.drawImage(img, 0, 0);
  g.restore();
}
