// s23 effects, all drawn in frame px: scissors, the white flame aura, shockwave rings, flying paper scraps, the flare,
// the shard cut lines and motion streaks. Deterministic (seeded); animated ones are redrawn on twos.
import { gv, LINE } from "../../lib/owlInk.js";
import { rng, lerp, clamp, smooth, noise1 } from "../../lib/rng.js";

const TAU = Math.PI * 2;

// ---------------------------------------------------------------- scissors (copy of s21's, frame px)
// Pivot at (x, y); blades point along `ang`; L = blade length (pivot → tip); open = angle between the blades.
function scissorsHalf(g, x, y, ang, L, open, k, ringK) {
  const a = ang + (k * open) / 2;
  const c = Math.cos(a), s = Math.sin(a);
  const P = (u, v) => [x + c * u - s * v, y + s * u + c * v];
  const w0 = 0.07 * L, inner = -k;
  const blade = [P(-0.03 * L, -inner * w0 * 0.9), P(0.3 * L, -inner * w0 * 1.0), P(0.62 * L, -inner * w0 * 0.78), P(0.88 * L, -inner * w0 * 0.34), P(L, inner * w0 * 0.05),
    P(0.8 * L, inner * w0 * 0.3), P(0.45 * L, inner * w0 * 0.62), P(0.08 * L, inner * w0 * 0.85), P(-0.03 * L, inner * w0 * 0.85)];
  const hw = 0.034 * L;
  const shank = [P(0.02 * L, -hw), P(-0.36 * L, -hw - k * 0.03 * L), P(-0.38 * L, hw - k * 0.03 * L), P(0.02 * L, hw)];
  const rc = P(-0.53 * L * ringK, -k * 0.075 * L);
  const rx = 0.17 * L * ringK, ry = 0.1 * L * ringK, rw = Math.max(1.6, 0.045 * L);
  g.lineJoin = "round";
  g.save();
  g.translate(rc[0], rc[1]); g.rotate(a + k * 0.1);
  g.lineWidth = rw + 2.2; g.strokeStyle = LINE; g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, TAU); g.stroke();
  g.lineWidth = rw; g.strokeStyle = gv(0.9); g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, TAU); g.stroke();
  g.restore();
  const poly = (pts, fill) => { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) g.lineTo(p[0], p[1]); g.closePath(); g.fillStyle = fill; g.fill(); g.lineWidth = 1.0; g.strokeStyle = gv(0.12, 0.85); g.stroke(); };
  poly(shank, gv(0.82));
  poly(blade, gv(0.92));
  g.lineWidth = Math.max(0.7, 0.012 * L); g.strokeStyle = gv(0.99, 0.9);
  g.beginPath(); const h0 = P(0.05 * L, -inner * w0 * 0.5), h1 = P(0.7 * L, -inner * w0 * 0.42), h2 = P(0.92 * L, -inner * w0 * 0.06); g.moveTo(h0[0], h0[1]); g.quadraticCurveTo(h1[0], h1[1], h2[0], h2[1]); g.stroke();
}
export function drawScissors(g, { x, y, ang, L, open = 0.1, ring = 1, alpha = 1 }) {
  g.save();
  g.globalAlpha *= alpha;
  scissorsHalf(g, x, y, ang, L, open, -1, ring);
  scissorsHalf(g, x, y, ang, L, open, 1, ring);
  const r = Math.max(1.5, 0.028 * L);
  g.fillStyle = gv(0.9); g.strokeStyle = LINE; g.lineWidth = 1;
  g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.stroke();
  g.restore();
}

// ---------------------------------------------------------------- the flame aura
// One flame tongue: a wide base narrowing to a wavy point, rising along (dx, dy) from (bx, by); h = height, w = base
// width, sway = sideways S-bend (fraction of h).
function tongue(g, bx, by, dx, dy, h, w, sway, lick) {
  const nx = -dy, ny = dx;
  const P = (u, v) => {
    const s = sway * h * Math.sin(u * Math.PI * 1.2) * u;
    return [bx + dx * h * u + nx * (v * w * 0.5 * Math.pow(1 - u, 0.9) + s), by + dy * h * u + ny * (v * w * 0.5 * Math.pow(1 - u, 0.9) + s)];
  };
  const L = [], R = [];
  for (let i = 0; i <= 10; i++) { const u = i / 10; L.push(P(u, -1)); R.push(P(u, 1)); }
  g.beginPath(); g.moveTo(L[0][0], L[0][1]);
  for (let i = 1; i <= 10; i++) g.lineTo(L[i][0], L[i][1]);
  for (let i = 10; i >= 0; i--) g.lineTo(R[i][0], R[i][1]);
  g.closePath();
  g.fill(); g.stroke();
  if (lick) {
    const a = P(0.1, 0.2), b = P(0.5, -0.25), c = P(0.82, 0.05);
    g.save(); g.strokeStyle = "rgba(135,135,130,0.55)"; g.beginPath(); g.moveTo(a[0], a[1]); g.quadraticCurveTo(b[0], b[1], c[0], c[1]); g.stroke(); g.restore();
  }
}
// A roaring mass of white inked flame round (cx, cy): a bright base (ellipse rx, ry) with wavy tongues rising from
// its upper rim and sides, grey inner licks, a soft halo. `seed` changes the flames (the shot re-seeds on twos).
// o.h: tongue height (px), o.n: tongues, o.skew: extra width on the right (px), o.alpha.
export function drawAura(g, cx, cy, rx, ry, seed, o = {}) {
  const r = rng(seed);
  const n = o.n ?? 30, H = o.h ?? 80, alpha = o.alpha ?? 1, sk = o.skew ?? 0;
  g.save();
  g.globalAlpha *= alpha;
  // halo and base
  g.filter = "blur(22px)";
  g.fillStyle = "rgba(235,235,230,0.3)"; g.beginPath(); g.ellipse(cx + sk / 2, cy, rx + sk / 2 + 20, ry + 30, 0, 0, TAU); g.fill();
  g.filter = "blur(6px)";
  g.fillStyle = "rgba(240,240,236,0.72)"; g.beginPath(); g.ellipse(cx + sk / 2, cy + ry * 0.2, (rx + sk / 2) * 0.8, ry * 0.8, 0, 0, TAU); g.fill();
  g.filter = "none";
  g.fillStyle = "rgba(247,247,244,0.96)"; g.strokeStyle = "rgba(120,120,116,0.5)"; g.lineWidth = 1.3; g.lineJoin = "round";
  // tongues along the rim from the lower left, over the top, to the lower right; back row first (taller, dimmer)
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < n; i++) {
      const f = (i + r()) / n;
      const th = Math.PI * (0.9 + 1.2 * f);          // 162° … 378°: round the upper rim
      const ex = Math.cos(th), ey = Math.sin(th);
      const bx = cx + ex * (rx + (ex > 0 ? sk : 0)) * (0.82 + 0.1 * r()), by = cy + ey * ry * (0.82 + 0.1 * r());
      let dx = ex * 0.45, dy = -1 + Math.max(0, ey) * 0.6; const dl = Math.hypot(dx, dy); dx /= dl; dy /= dl;
      const top = Math.max(0, -ey);
      const h = H * (pass ? 0.6 + 0.6 * r() : 0.9 + 0.7 * r()) * (0.55 + 0.6 * top);
      const w = (0.26 + 0.2 * r()) * h + 10;
      if (pass === 0) g.globalAlpha = alpha * 0.9;
      else g.globalAlpha = alpha;
      tongue(g, bx, by, dx, dy, h, w, (r() - 0.5) * 0.5, pass === 1 && r() < 0.7);
    }
  }
  // flames licking out of the base low down on both sides
  g.globalAlpha = alpha * 0.9;
  for (const sd of [-1, 1]) for (let i = 0; i < 4; i++) {
    const bx = cx + sd * (rx + (sd > 0 ? sk : 0)) * (0.7 + 0.08 * i), by = cy + ry * (0.1 + 0.18 * i);
    tongue(g, bx, by, sd * 0.85, -0.53, H * (0.5 + 0.3 * r()), H * 0.45, (r() - 0.5) * 0.4, true);
  }
  g.restore();
}

// the flare (94.88–95.08): the aura bursts into a bonfire of tall flames, up past the top of the screen (source:
// x ≈ 410–1030, y 0–600 at 95.00), drawn behind the owl
export function drawFlare(g, cx, cy, k, seed) {
  if (k <= 0) return;
  const r = rng(seed);
  g.save();
  g.filter = "blur(10px)";
  g.fillStyle = "rgba(248,248,245,0.97)"; g.beginPath(); g.ellipse(cx, cy - 20 * k, 250 * k, 190 * k, 0, 0, TAU); g.fill();
  g.filter = "none";
  g.fillStyle = "rgba(248,248,245,0.97)"; g.strokeStyle = "rgba(150,150,146,0.4)"; g.lineWidth = 1.3;
  // tall wavy tongues of irregular height (the middle ones reach past the top of the frame), then thin spikes
  // shooting out diagonally at the sides
  const n = 15;
  for (let i = 0; i < n; i++) {
    const f = (i + 0.2 + 0.6 * r()) / n, x = cx + (f - 0.5) * 470 * k, dx = (f - 0.5) * 0.55 + (r() - 0.5) * 0.2, dy = -1;
    const dl = Math.hypot(dx, dy);
    const h = (180 + 420 * r() * r() + 120 * (1 - Math.abs(f - 0.5) * 2)) * k;
    tongue(g, x, cy - 50 * k - (1 - Math.abs(f - 0.5) * 2) * 70 * k, dx / dl, dy / dl, h, (40 + 60 * r()) * k, (r() - 0.5) * 0.7, r() < 0.5);
  }
  for (const sd of [-1, 1]) for (let i = 0; i < 3; i++) {
    const a = -Math.PI / 2 + sd * (0.75 + 0.22 * i + 0.1 * r());
    tongue(g, cx + sd * 150 * k, cy - 20 * k + i * 40 * k, Math.cos(a), Math.sin(a), (170 + 110 * r()) * k, 26 * k, (r() - 0.5) * 0.3, false);
  }
  // two long thin rays out to the top corners (the source's streaks at 94.92–95.04)
  g.strokeStyle = "rgba(245,245,240,0.8)"; g.lineCap = "round";
  for (const [ex, ey, w] of [[cx - 520, cy - 520, 3], [cx + 330, cy - 460, 2.5]]) {
    g.lineWidth = w; g.beginPath(); g.moveTo(cx, cy - 150 * k); g.lineTo(ex, ey); g.stroke();
  }
  g.restore();
}

// ---------------------------------------------------------------- rings
export function ring(g, cx, cy, rx, ry, w, a, rot = 0) {
  if (a <= 0) return;
  g.save();
  g.strokeStyle = `rgba(240,240,236,${a})`; g.lineWidth = w;
  g.beginPath(); g.ellipse(cx, cy, rx, ry, rot, 0, TAU); g.stroke();
  g.restore();
}
// the big faint shockwave arc in the room (92.64–93.6), a soft grey band
export function bigRing(g, cx, cy, rx, ry, a) {
  if (a <= 0) return;
  g.save();
  g.filter = "blur(6px)";
  g.strokeStyle = `rgba(200,200,196,${a})`; g.lineWidth = 26;
  g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, TAU); g.stroke();
  g.filter = "none";
  g.restore();
}

// ---------------------------------------------------------------- paper scraps
// Deterministic flights: each scrap launches at t0 from p0 with velocity v (px/s), gravity, spin. Pale grey slabs.
export function drawPapers(g, t, list) {
  g.save();
  for (const p of list) {
    const u = t - p.t0;
    if (u < 0 || u > p.life) continue;
    const x = p.x + p.vx * u, y = p.y + p.vy * u + 0.5 * (p.gy ?? 300) * u * u;
    const a = p.a + p.spin * u;
    const flip = Math.cos(p.flip * u + p.a);
    g.save(); g.translate(x, y); g.rotate(a); g.scale(1, 0.25 + 0.75 * Math.abs(flip));
    g.fillStyle = flip > 0 ? "rgba(236,236,232,0.95)" : "rgba(205,205,200,0.95)";
    g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
    g.restore();
  }
  g.restore();
}

// ---------------------------------------------------------------- shard cut lines (96.32–97.08)
export function drawShards(g, t, segs) {
  g.save();
  g.strokeStyle = "rgba(238,238,234,0.95)"; g.lineWidth = 3.2; g.lineCap = "round";
  g.beginPath();
  for (const s of segs) {
    if (t + 1e-3 < s[4]) continue;
    g.moveTo(s[0], s[1]); g.lineTo(s[2], s[3]);
  }
  g.stroke();
  g.restore();
}

// white confetti (small cut pieces) in the last frames
export function drawConfetti(g, t, seed, t0, n) {
  if (t < t0) return;
  const r = rng(seed);
  g.save();
  for (let i = 0; i < n; i++) {
    const x = 100 + r() * 2000, y = r() * 900, ts = t0 + r() * 0.3, vx = (r() - 0.5) * 300, vy = (r() - 0.3) * 250, a = r() * TAU, sp = (r() - 0.5) * 12;
    const w = 12 + r() * 22, h = 6 + r() * 10;
    if (t < ts) continue;
    const u = t - ts;
    g.save(); g.translate(x + vx * u, y + vy * u); g.rotate(a + sp * u);
    g.fillStyle = "rgba(238,238,234,0.92)"; g.fillRect(-w / 2, -h / 2, w, h);
    g.restore();
  }
  g.restore();
}
export { noise1, smooth, clamp };
