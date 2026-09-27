// s26 — the shattered page: one seeded crack tiling of the screen, used both as the crack lines on the framed page
// (110.52–111.56) and as the shards that blow outward (111.60–114.1).
// Frame coordinates (the monitor framing of 110.52 s: the page under sites.js FRAMED). Everything is deterministic.
import { rng } from "../../lib/rng.js";

// the shattered area: the page's white outer outline measured at 110.52 s (x 159 / 2022, y 126 / 909)
export const REGION = { x0: 159, y0: 126, x1: 2022, y1: 909 };
// the two scissor impacts (frame px, measured on 2x grids at 110.6 s)
export const IMPACTS = [
  { x: 650, y: 385 },
  { x: 1520, y: 360 },
];

const area = (P) => { let a = 0; for (let i = 0; i < P.length; i++) { const p = P[i], q = P[(i + 1) % P.length]; a += p[0] * q[1] - q[0] * p[1]; } return a / 2; };
export const centroid = (P) => {
  let a = 0, cx = 0, cy = 0;
  for (let i = 0; i < P.length; i++) { const p = P[i], q = P[(i + 1) % P.length], c = p[0] * q[1] - q[0] * p[1]; a += c; cx += (p[0] + q[0]) * c; cy += (p[1] + q[1]) * c; }
  a /= 2; return [cx / (6 * a), cy / (6 * a)];
};
// split a convex polygon by the line through p with direction d; returns [left, right] (either may be null)
function split(P, p, d) {
  const L = [], R = [];
  const side = (q) => (q[0] - p[0]) * d[1] - (q[1] - p[1]) * d[0];
  for (let i = 0; i < P.length; i++) {
    const a = P[i], b = P[(i + 1) % P.length], sa = side(a), sb = side(b);
    if (sa >= 0) L.push(a); if (sa <= 0) R.push(a);
    if ((sa > 0 && sb < 0) || (sa < 0 && sb > 0)) {
      const u = sa / (sa - sb), q = [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
      L.push(q); R.push(q);
    }
  }
  return [L.length >= 3 && Math.abs(area(L)) > 1 ? L : null, R.length >= 3 && Math.abs(area(R)) > 1 ? R : null];
}
// does the segment a-b cross polygon P (or start inside it)?
function segHits(P, a, b) {
  const inside = (q) => { let s = 0; for (let i = 0; i < P.length; i++) { const p = P[i], r = P[(i + 1) % P.length]; const c = (r[0] - p[0]) * (q[1] - p[1]) - (r[1] - p[1]) * (q[0] - p[0]); if (c !== 0) { if (s === 0) s = Math.sign(c); else if (Math.sign(c) !== s) return false; } } return true; };
  if (inside(a) || inside(b)) return true;
  for (let i = 0; i < P.length; i++) {
    const p = P[i], q = P[(i + 1) % P.length];
    const d1 = (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
    const d2 = (b[0] - a[0]) * (q[1] - a[1]) - (b[1] - a[1]) * (q[0] - a[0]);
    const d3 = (q[0] - p[0]) * (a[1] - p[1]) - (q[1] - p[1]) * (a[0] - p[0]);
    const d4 = (q[0] - p[0]) * (b[1] - p[1]) - (q[1] - p[1]) * (b[0] - p[0]);
    if (d1 * d2 < 0 && d3 * d4 < 0) return true;
  }
  return false;
}

let TILING = null;
// The tiling: [{ P: [[x,y]...] (convex, frame px), c: [cx,cy], a: area, r: dist to nearest impact, seed }]
export function tiling() {
  if (TILING) return TILING;
  const R = REGION, r = rng(2606);
  let polys = [[[R.x0, R.y0], [R.x1, R.y0], [R.x1, R.y1], [R.x0, R.y1]]];
  const splitAll = (p, d, test) => {
    const out = [];
    for (const P of polys) {
      if (test && !test(P)) { out.push(P); continue; }
      const [a, b] = split(P, p, d);
      if (a && b) out.push(a, b); else out.push(P);
    }
    polys = out;
  };
  // 1) radial cracks out of each impact: rays of 260–900 px
  for (const I of IMPACTS) {
    const n = 14, a0 = r() * 6.283;
    for (let k = 0; k < n; k++) {
      const a = a0 + (k + (r() - 0.5) * 0.55) * 6.283 / n, L = 300 + r() * 700;
      const d = [Math.cos(a), Math.sin(a)], b = [I.x + d[0] * L, I.y + d[1] * L];
      splitAll([I.x, I.y], d, (P) => segHits(P, [I.x + d[0] * 2, I.y + d[1] * 2], b));
    }
  }
  // 2) long straight cracks across the page (the source's big polygon network)
  for (let k = 0; k < 16; k++) {
    const p = [R.x0 + r() * (R.x1 - R.x0), R.y0 + r() * (R.y1 - R.y0)], a = r() * Math.PI, L = 300 + r() * 700;
    const d = [Math.cos(a), Math.sin(a)];
    splitAll(p, d, (P) => segHits(P, [p[0] - d[0] * L / 2, p[1] - d[1] * L / 2], [p[0] + d[0] * L / 2, p[1] + d[1] * L / 2]));
  }
  // 3) web rings round the impacts: tangential splits of the pieces close to them
  for (const I of IMPACTS) {
    for (const rad of [70, 140, 230]) {
      const out = [];
      for (const P of polys) {
        const c = centroid(P), dx = c[0] - I.x, dy = c[1] - I.y, dist = Math.hypot(dx, dy);
        if (dist > rad * 1.6 || dist < rad * 0.4 || Math.abs(area(P)) < 900) { out.push(P); continue; }
        const u = [dx / dist, dy / dist], jr = rad * (0.85 + r() * 0.3), q = [I.x + u[0] * jr, I.y + u[1] * jr];
        const tj = (r() - 0.5) * 0.5, d = [-u[1] * Math.cos(tj) - u[0] * Math.sin(tj), u[0] * Math.cos(tj) - u[1] * Math.sin(tj)];
        const [a, b] = split(P, q, d);
        if (a && b) out.push(a, b); else out.push(P);
      }
      polys = out;
    }
  }
  // 4) random splits of the biggest pieces until the page is shattered into ~480 shards
  const score = (P) => {
    const c = centroid(P); let near = 1e9;
    for (const I of IMPACTS) near = Math.min(near, Math.hypot(c[0] - I.x, c[1] - I.y));
    return Math.abs(area(P)) * (1 + 1.2 * Math.exp(-near / 260));
  };
  let guard = 0;
  while (polys.length < 480 && guard++ < 3000) {
    let bi = 0, bs = -1;
    for (let i = 0; i < polys.length; i++) { const s = score(polys[i]); if (s > bs) { bs = s; bi = i; } }
    const P = polys[bi], c = centroid(P);
    // cut roughly across the piece's long axis
    let ax = 0, ay = 0, best = 0;
    for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) { const dx = P[j][0] - P[i][0], dy = P[j][1] - P[i][1], L = dx * dx + dy * dy; if (L > best) { best = L; ax = dx; ay = dy; } }
    const L = Math.sqrt(best) || 1, base = Math.atan2(ay, ax) + Math.PI / 2 + (r() - 0.5) * 1.1;
    const p = [c[0] + (r() - 0.5) * L * 0.3 * ax / L, c[1] + (r() - 0.5) * L * 0.3 * ay / L];
    const [a, b] = split(P, p, [Math.cos(base), Math.sin(base)]);
    if (a && b) polys.splice(bi, 1, a, b);
  }
  TILING = polys.map((P, i) => {
    const c = centroid(P); let near = 1e9;
    for (const I of IMPACTS) near = Math.min(near, Math.hypot(c[0] - I.x, c[1] - I.y));
    return { P, c, a: Math.abs(area(P)), r: near, seed: i };
  });
  return TILING;
}

// Extra short crack strokes of the spider web round each impact (only on the intact, framed page).
let WEB = null;
export function webStrokes() {
  if (WEB) return WEB;
  const r = rng(7331); WEB = [];
  for (const I of IMPACTS) {
    for (let k = 0; k < 40; k++) {
      const a = r() * 6.283, rad = 40 + r() * 220, span = 0.25 + r() * 0.5;
      const a1 = a + span;
      WEB.push([[I.x + Math.cos(a) * rad, I.y + Math.sin(a) * rad], [I.x + Math.cos(a1) * rad * (0.85 + r() * 0.3), I.y + Math.sin(a1) * rad * (0.85 + r() * 0.3)]]);
    }
    // short spikes right out of the impact
    for (let k = 0; k < 22; k++) {
      const a = r() * 6.283, r0 = 20 + r() * 20, r1 = r0 + 40 + r() * 110;
      WEB.push([[I.x + Math.cos(a) * r0, I.y + Math.sin(a) * r0], [I.x + Math.cos(a + (r() - 0.5) * 0.2) * r1, I.y + Math.sin(a + (r() - 0.5) * 0.2) * r1]]);
    }
  }
  return WEB;
}

export function polyPath(ctx, P) {
  ctx.moveTo(P[0][0], P[0][1]);
  for (let i = 1; i < P.length; i++) ctx.lineTo(P[i][0], P[i][1]);
  ctx.closePath();
}

// A white impact starburst (frame px): n spikes, radius R, seeded.
export function impactStar(ctx, x, y, R, seed, alpha = 1) {
  const r = rng(seed), n = 11, pts = [];
  for (let k = 0; k < n * 2; k++) {
    const a = (k / (n * 2)) * 6.283 + (r() - 0.5) * 0.25;
    const rad = k % 2 ? R * (0.28 + r() * 0.12) : R * (0.6 + r() * 0.55);
    pts.push([x + Math.cos(a) * rad, y + Math.sin(a) * rad]);
  }
  ctx.save();
  ctx.globalAlpha = alpha;
  const g = ctx.createRadialGradient(x, y, 0, x, y, R * 1.3);
  g.addColorStop(0, "rgba(255,255,255,0.55)"); g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, R * 1.3, 0, 6.283); ctx.fill();
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) ctx.lineTo(p[0], p[1]); ctx.closePath();
  ctx.lineJoin = "miter"; ctx.lineWidth = 3; ctx.strokeStyle = "#101010"; ctx.stroke();
  ctx.fillStyle = "#f7f6f2"; ctx.fill();
  ctx.restore();
}
