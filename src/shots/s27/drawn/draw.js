// s27 (drawn) — small drawing helpers shared by the room, props and figure: warm ink strokes, leaves, pots, boxes.
import { smoothPath, sampleCurve } from "../../../lib/paths.js";
import { rng } from "../../../lib/rng.js";

export const INK = "#4a3a33";        // room ink: warm dark brown
export const INK_SOFT = "rgba(74,58,51,0.55)";

export function canvas(w, h) { const c = document.createElement("canvas"); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; }

export function poly(g, pts, close = true) {
  g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
  if (close) g.closePath();
}
export function spoly(g, pts, close = true) { g.beginPath(); smoothPath(g, pts, close); }
export function fillPoly(g, pts, col, close = true) { poly(g, pts, close); g.fillStyle = col; g.fill(); }
export function strokePoly(g, pts, w = 2, col = INK, close = true) { poly(g, pts, close); g.lineWidth = w; g.strokeStyle = col; g.lineJoin = "round"; g.lineCap = "round"; g.stroke(); }
export function line(g, a, b, w = 2, col = INK) { g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineWidth = w; g.strokeStyle = col; g.lineCap = "round"; g.stroke(); }

// variable-width ink along a smooth curve through pts; w0..w1 with a swell in the middle
export function inkLine(g, pts, w = 2, col = INK, { taper = 0.35, per = 10 } = {}) {
  const P = pts.length > 2 ? sampleCurve(pts, per) : pts;
  const n = P.length; if (n < 2) return;
  const L = [], R = [];
  for (let i = 0; i < n; i++) {
    const a = P[Math.max(0, i - 1)], b = P[Math.min(n - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1]; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    const u = i / (n - 1), hw = w * 0.5 * (taper + (1 - taper) * Math.pow(Math.sin(Math.PI * u), 0.5));
    L.push([P[i][0] - dy * hw, P[i][1] + dx * hw]); R.push([P[i][0] + dy * hw, P[i][1] - dx * hw]);
  }
  g.beginPath(); g.moveTo(L[0][0], L[0][1]);
  for (let i = 1; i < n; i++) g.lineTo(L[i][0], L[i][1]);
  for (let i = n - 1; i >= 0; i--) g.lineTo(R[i][0], R[i][1]);
  g.closePath(); g.fillStyle = col; g.fill();
}

// a leaf from base to tip, half-width w (fraction along for the widest point `at`), bent by `bend` (px sideways)
export function leafPts(base, tip, w, { at = 0.4, bend = 0, n = 10 } = {}) {
  const dx = tip[0] - base[0], dy = tip[1] - base[1], L = Math.hypot(dx, dy) || 1;
  const ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
  const side = (s) => {
    const out = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      const prof = u < at ? Math.sin((u / at) * Math.PI / 2) : Math.cos(((u - at) / (1 - at)) * Math.PI / 2);
      const off = s * w * Math.pow(Math.max(0, prof), 0.8) + bend * Math.sin(Math.PI * u);
      out.push([base[0] + ux * L * u + nx * off, base[1] + uy * L * u + ny * off]);
    }
    return out;
  };
  const a = side(1), b = side(-1).reverse();
  return a.concat(b.slice(1));
}
export function leaf(g, base, tip, w, fill, { at = 0.4, bend = 0, ink = INK, lw = 1.6, rib = true, shade = null } = {}) {
  const P = leafPts(base, tip, w, { at, bend });
  spoly(g, P, true); g.fillStyle = fill; g.fill();
  if (shade) {   // darker half along the midrib
    const half = P.slice(0, Math.ceil(P.length / 2));
    const dx = tip[0] - base[0], dy = tip[1] - base[1];
    g.save(); spoly(g, P, true); g.clip();
    g.beginPath(); g.moveTo(base[0], base[1]);
    for (const p of half) g.lineTo(p[0], p[1]);
    g.lineTo(tip[0], tip[1]);
    const mid = [base[0] + dx * 0.5 - dy * 0.0001, base[1] + dy * 0.5];
    g.quadraticCurveTo(mid[0] + bend * 0.5, mid[1], base[0], base[1]); g.closePath();
    g.fillStyle = shade; g.fill(); g.restore();
  }
  if (lw > 0) { spoly(g, P, true); g.lineWidth = lw; g.strokeStyle = ink; g.lineJoin = "round"; g.stroke(); }
  if (rib) {
    const dx = tip[0] - base[0], dy = tip[1] - base[1], L = Math.hypot(dx, dy) || 1;
    const nx = -dy / L, ny = dx / L;
    const m = [base[0] + dx * 0.5 + nx * bend * 0.9, base[1] + dy * 0.5 + ny * bend * 0.9];
    g.beginPath(); g.moveTo(base[0], base[1]); g.quadraticCurveTo(m[0], m[1], base[0] + dx * 0.85, base[1] + dy * 0.85);
    g.lineWidth = lw * 0.6; g.strokeStyle = ink; g.globalAlpha = 0.6; g.stroke(); g.globalAlpha = 1;
  }
}
export function stem(g, pts, w = 2, col = "#6f7a55") { inkLine(g, pts, w, col, { taper: 0.6 }); }

// soft shadow blob (for cast shadows on the wall/desk): blurred in a small scratch canvas sized to the shape
export function softShadow(g, pts, col = "rgba(90,70,60,0.18)", blur = 12) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of pts) { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; }
  const m = blur * 3, T = g.getTransform(), sc = Math.hypot(T.a, T.b) || 1;
  const w = Math.ceil((x1 - x0 + 2 * m) * sc), h = Math.ceil((y1 - y0 + 2 * m) * sc);
  if (w <= 0 || h <= 0) return;
  const c = canvas(w, h), q = c.getContext("2d");
  q.scale(sc, sc); q.translate(m - x0, m - y0);
  q.filter = `blur(${blur}px)`;
  fillPoly(q, pts, col);
  g.drawImage(c, x0 - m, y0 - m, w / sc, h / sc);
}

export { rng };
