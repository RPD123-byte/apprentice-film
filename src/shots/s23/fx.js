// NOT USED since the traced-cel pass (s23.js now draws the owl and effects from cels.js); kept for reference only.
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
// The source's aura is hand-inked white flame: wavy S-curved tongues, filled white (translucent at the outer edges,
// where the room shows through), fine grey licks inside, black gaps between the tongue groups, thin tips curling
// up into the banner. It hugs the owl (x ≈ 460–930) and never reaches the man. Tongue sets are measured per phase on
// the source frames (base, tip, base width, alpha); the drawing holds and boils a little on twos (3 variants).
// flame tongue: base b, tip t (frame px), base width w, sway (px, S-bend), alpha, seed
function flameTongue(g, b, t, w, sway, alpha, seed, { licks = 2, lickA = 0.5, col = "246,246,242", lickCol = "118,118,114", hatch = 0, lobes = 3 } = {}) {
  const r = rng(seed);
  const dx = t[0] - b[0], dy = t[1] - b[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
  const ph = r() * TAU, N = 30;
  // centre line: a gentle S near the base, a stronger curl toward the tip
  const C = (u) => { const s = sway * (Math.sin(Math.PI * u * 1.6 + ph) * 0.55 * u + 1.1 * u * u * u); return [b[0] + dx * u + nx * s, b[1] + dy * u + ny * s]; };
  const HW = (u) => (w / 2) * Math.pow(Math.max(0, 1 - u), 0.72);
  // flame licks along each edge: sawtooth lobes that swell slowly and end in an upward-pointing notch
  const lobe = (u, side) => {
    const f = (u * lobes + (side > 0 ? 0.35 : 0.8) + ph * 0.1) % 1;
    return 0.42 * Math.pow(f, 1.6) * Math.pow(1 - f, 0.35) * Math.min(1, u * 5) * (1 - u * 0.6);
  };
  const Lp = [], Rp = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N, c = C(u), hw = HW(u);
    const el = hw * (1 + lobe(u, -1)), er = hw * (1 + lobe(u, 1));
    Lp.push([c[0] - nx * el, c[1] - ny * el]);
    Rp.push([c[0] + nx * er, c[1] + ny * er]);
  }
  g.beginPath(); g.moveTo(Lp[0][0], Lp[0][1]);
  for (let i = 1; i <= N; i++) g.lineTo(Lp[i][0], Lp[i][1]);
  for (let i = N; i >= 0; i--) g.lineTo(Rp[i][0], Rp[i][1]);
  g.closePath();
  g.fillStyle = `rgba(${col},${alpha})`; g.fill();
  // inner licks: fine grey S-curves following the flame
  g.lineCap = "round";
  for (let k = 0; k < licks; k++) {
    const v = (r() - 0.5) * 1.2, u0 = 0.06 + 0.25 * r(), u1 = u0 + 0.35 + 0.35 * r();
    g.strokeStyle = `rgba(${lickCol},${lickA * Math.min(1, alpha * 1.2)})`; g.lineWidth = 0.9 + r() * 0.7;
    g.beginPath();
    for (let i = 0; i <= 14; i++) { const u = Math.min(0.96, u0 + (u1 - u0) * i / 14), c = C(u), o = v * HW(u) * (0.9 - 0.4 * i / 14) + Math.sin(u * 9 + k) * 2; const x = c[0] + nx * o, y = c[1] + ny * o; i ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.stroke();
  }
  // engraved hatch near the base: short grey strokes along the flow (value 0.4–0.6)
  for (let k = 0; k < hatch; k++) {
    const u = 0.02 + 0.3 * r(), v = (r() - 0.5) * 1.6, c = C(u), o = v * HW(u);
    const x = c[0] + nx * o, y = c[1] + ny * o, l = 6 + 10 * r(), gr = Math.round(100 + 50 * r());
    g.strokeStyle = `rgba(${gr},${gr},${gr - 2},${0.55 * alpha})`; g.lineWidth = 1;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + dx / L * l, y + dy / L * l); g.stroke();
  }
}
// The aura is a height field: the flame top is the lower envelope of pointed peaks (measured column tops of the
// source's flame at 93.2 / 93.8 / 95.4, which is one drawing through all three poses), domain-warped sideways so the
// tongues bend into S-curves that curl more toward their tips. Inside: white; grey licks run along level lines below
// the contour (the source's inner flame lines); the lower sides are translucent (the room shows through).
// peaks: [tip x, tip y, half width, lean (x shift per px of height, + = leans right)]
const AURA_PEAKS = [[478, 456, 24, -0.35], [500, 438, 24, -0.3], [530, 386, 28, -0.18], [560, 392, 24, -0.12], [592, 346, 30, -0.06], [621, 368, 20, -0.03], [648, 332, 30, -0.02],
  [690, 300, 30, 0], [727, 302, 28, 0.02], [758, 356, 18, 0.04], [792, 324, 28, 0.08], [822, 362, 22, 0.12], [850, 380, 24, 0.18], [876, 438, 24, 0.25], [902, 498, 20, 0.32], [916, 560, 14, 0.4],
  // broad low flames filling the lower sides round the speaker (translucent in the source)
  [470, 486, 36, -0.25], [498, 508, 44, -0.12], [540, 470, 44, -0.06], [586, 440, 40, -0.03], [888, 486, 34, 0.25], [860, 470, 40, 0.12], [820, 450, 40, 0.06]];
const FLARE_PEAKS = {
  // 94.88–94.92: tips to y ≈ 110–330
  a: [[455, 340, 22, -0.25], [500, 270, 26, -0.15], [545, 225, 26, -0.1], [600, 245, 26, -0.04], [650, 205, 28, 0], [690, 240, 24, 0.02], [722, 120, 30, 0.04], [770, 215, 26, 0.08],
    [820, 250, 24, 0.14], [860, 300, 22, 0.2], [895, 370, 20, 0.28], [410, 420, 16, -0.7], [950, 430, 16, 0.7]],
  // 94.96–95.04: the peak, spikes up past the top of the frame
  b: [[430, 200, 24, -0.2], [470, 120, 28, -0.14], [520, 20, 30, -0.1], [570, -10, 30, -0.05], [625, 70, 26, -0.02], [670, 40, 28, 0], [725, -20, 34, 0.04], [770, 0, 30, 0.07],
    [815, 50, 28, 0.1], [860, 110, 26, 0.14], [900, 190, 24, 0.2], [385, 300, 18, -0.7], [380, 400, 16, -0.9], [395, 480, 14, -1.1], [955, 290, 18, 0.7], [960, 380, 16, 0.9], [945, 470, 14, 1.1]],
  // 95.08–95.12: dying down, tips to y ≈ 200–410
  c: [[470, 370, 22, -0.2], [515, 310, 24, -0.12], [560, 255, 26, -0.06], [610, 285, 24, -0.02], [655, 240, 26, 0], [705, 265, 28, 0.03], [750, 240, 26, 0.07], [795, 280, 24, 0.1],
    [840, 315, 24, 0.15], [880, 370, 20, 0.22], [905, 440, 18, 0.3]],
};
const FIELD = new Map();
function flameField(key, peaks, { x0, x1, y0, y1, D = 70, warp = 10, bottom = 605, variant = 0, dark = false, solid = false, edgeL = 470, edgeR = 925, slope = 2.6, base = 600 }) {
  const ck = `${key}:${variant}:${dark}`;
  if (FIELD.has(ck)) return FIELD.get(ck);
  const r = rng(9100 + variant * 31 + key.length);
  // each peak leans: its axis passes the tip and moves by `lean` px per px down toward the base
  const pk = peaks.map(([x, y, w, lean]) => [x + (r() - 0.5) * 6, y + (r() - 0.5) * 10, w, lean || 0]);
  const W = x1 - x0, H = y1 - y0;
  const f1 = r() * 6, f2 = r() * 6;
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const g = c.getContext("2d"), img = g.createImageData(W, H), d = img.data;
  const [wr, wg, wb] = dark ? [58, 58, 56] : [247, 247, 243];
  const inv = 1 / 0.62;
  for (let j = 0; j < H; j++) {
    const y = y0 + j + 0.5;
    const up = Math.max(0, Math.min(1, (bottom - 30 - y) / 260));
    const sway = warp * up * (Math.sin(y / 27 + f1) + 0.45 * Math.sin(y / 9.5 + f2) * up);
    const botA = Math.max(0, Math.min(1, (bottom - y) / (solid ? 16 : 40))) * (solid ? 1 : 1 - 0.15 * Math.max(0, Math.min(1, (y - 530) / 50)));
    // per peak: the half-width of the flame at this height (profile inverted), and its axis x
    const spans = [];
    for (const [px, py, hw, lean] of pk) {
      if (y < py) continue;
      const half = hw * Math.min(solid ? 4.2 : 3.2, Math.pow((y - py) / D, inv));
      spans.push([px - lean * (y - py), half]);          // the base sits toward the centre: tips fan outward
    }
    for (let i = 0; i < W; i++) {
      const x = x0 + i + 0.5;
      if (x < edgeL - 140 || x > edgeR + 140) continue;
      const xw = x + sway;
      // signed distance (px, horizontal) inside the union of the peaks
      let F = -1e9;
      for (const [ax, half] of spans) { const e = half - Math.abs(xw - ax); if (e > F) F = e; }
      const sideDrop = slope * (Math.max(0, edgeL - x) + Math.max(0, x - edgeR));
      F -= sideDrop * 0.4;
      if (F <= -1) continue;
      let a = Math.min(1, F + 1) * botA;
      if (!solid) {
        const side = x < 560 ? (560 - x) / 90 : x > 870 ? (x - 870) / 50 : 0;
        const low = Math.max(0, Math.min(1, (y - 440) / 80));
        a *= 1 - Math.min(0.5, side * low * 0.5);
      }
      if (a <= 0) continue;
      let v = 1;
      if (!solid) {
        // licks: grey lines running up inside the tongues, parallel to their edges, broken along their length
        for (const lv of [7, 17, 30]) {
          const e = Math.abs(F - lv - 2.5 * Math.sin(y / 13 + lv));
          if (e < 0.9 && Math.sin(y / 21 + x / 37 + lv + variant) > -0.1) v = Math.min(v, 0.55 + 0.3 * (e / 0.9));
        }
      }
      const o = (j * W + i) * 4;
      d[o] = wr * v; d[o + 1] = wg * v; d[o + 2] = wb * v; d[o + 3] = Math.round(255 * a * (dark ? 0.85 : 0.97));
    }
  }
  g.putImageData(img, 0, 0);
  const out = { c, x: x0, y: y0 };
  FIELD.set(ck, out);
  return out;
}
export function releaseFx() { FIELD.clear(); }
// draw the aura (set is informational: the source keeps one flame drawing through all three poses); variant 0..2 boils
export function drawAura(g, set, variant, o = {}) {
  const F = flameField("aura", AURA_PEAKS, { x0: 420, x1: 980, y0: 270, y1: 630, D: 95, warp: 9, variant, dark: !!o.dark });
  g.save();
  g.globalAlpha *= o.alpha ?? 1;
  if (!o.dark) {
    g.filter = "blur(22px)";
    g.fillStyle = "rgba(235,235,230,0.1)"; g.beginPath(); g.ellipse(700, 470, 170, 140, 0, 0, TAU); g.fill();
    g.filter = "none";
  }
  g.drawImage(F.c, F.x, F.y);
  g.restore();
}
// the 95.60 remnant: the flames turned to dark smoke with white specks (one frame of the dissolve)
export function drawRemnant(g, seed) {
  drawAura(g, "two", 0, { dark: true });
  const r = rng(seed);
  g.save(); g.fillStyle = "rgba(245,245,240,1)";
  for (let i = 0; i < 32; i++) {
    const x = 520 + r() * 420, y = 300 + r() * 280, s = 1.4 + r() * 2.4;
    g.beginPath(); g.ellipse(x, y, s, s * (0.6 + 0.8 * r()), r() * 3, 0, TAU); g.fill();
  }
  g.restore();
}
// the flare (94.88–95.12): one solid, jagged white flame mass (no outlines), up past the top of the frame at its peak
// (94.96–95.04: x ≈ 418–932, spikes to y 0, long rays to the upper corners), drawn behind the owl.
export function drawFlare(g, stage) {
  const pk = FLARE_PEAKS[stage];
  const F = flameField("flare" + stage, pk, { x0: 340, x1: 1040, y0: 0, y1: 630, D: stage === "b" ? 190 : 140, warp: 12, solid: true, edgeL: 440, edgeR: 915, slope: 0.35 });
  g.save();
  g.drawImage(F.c, F.x, F.y);
  // long thin rays to the upper corners
  const rays = stage === "b" ? [[520, 300, 390, 110, 7], [880, 300, 1105, 88, 6]] : stage === "a" ? [[560, 300, 272, 20, 6]] : [];
  for (const [ax, ay, bx2, by2, w] of rays) flameTongue(g, [ax, ay], [bx2, by2], w * 2.2, 6, 0.92, 800 + ax, { licks: 0, col: "247,247,244", lobes: 1 });
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
