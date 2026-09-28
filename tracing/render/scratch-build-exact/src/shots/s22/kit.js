// s22 helpers. Scissors, legs, headphone overlay and the owl's own margin light are copied from s21.js (owned by
// the s21 agent) so that s22 does not depend on another shot's module; small changes are marked.
import { gv, LINE, V } from "../../lib/owlInk.js";
import { FRAMED } from "../../lib/sites.js";
import { lerp, rng } from "../../lib/rng.js";

// ---------------------------------------------------------------- interpolation
// keys: [[t, a, b, ...], ...] sorted by t; linear interpolation of every column
export function interp(keys, t) {
  if (t <= keys[0][0]) return keys[0].slice(1);
  const n = keys.length;
  if (t >= keys[n - 1][0]) return keys[n - 1].slice(1);
  let i = 0;
  while (keys[i + 1][0] < t) i++;
  const a = keys[i], b = keys[i + 1], u = (t - a[0]) / (b[0] - a[0]);
  return a.slice(1).map((v, k) => v + (b[k + 1] - v) * u);
}
// hold: the last key at or before t (for poses the source animates on twos)
export function hold(keys, t) {
  let r = keys[0];
  for (const k of keys) { if (k[0] <= t + 0.005) r = k; else break; }
  return r.slice(1);
}
// smooth (Catmull-Rom) interpolation for paths
export function spline(keys, t) {
  const n = keys.length;
  if (t <= keys[0][0]) return keys[0].slice(1);
  if (t >= keys[n - 1][0]) return keys[n - 1].slice(1);
  let i = 0;
  while (keys[i + 1][0] < t) i++;
  const p0 = keys[Math.max(0, i - 1)], p1 = keys[i], p2 = keys[i + 1], p3 = keys[Math.min(n - 1, i + 2)];
  const h = p2[0] - p1[0], u = (t - p1[0]) / h;
  const u2 = u * u, u3 = u2 * u;
  return p1.slice(1).map((v, k) => {
    const m1 = ((p2[k + 1] - p0[k + 1]) / Math.max(1e-6, p2[0] - p0[0])) * h;
    const m2 = ((p3[k + 1] - p1[k + 1]) / Math.max(1e-6, p3[0] - p1[0])) * h;
    return (2 * u3 - 3 * u2 + 1) * v + (u3 - 2 * u2 + u) * m1 + (-2 * u3 + 3 * u2) * p2[k + 1] + (u3 - u2) * m2;
  });
}

// ---------------------------------------------------------------- scissors (frame px) — from s21
// Pivot at (x, y); blades point along `ang`; L = blade length (pivot → tip); open = angle between the blades.
function scissorsHalf(g, x, y, ang, L, open, k, ringK) {
  const a = ang + k * open / 2;
  const c = Math.cos(a), s = Math.sin(a);
  const P = (u, v) => [x + c * u - s * v, y + s * u + c * v];
  const w0 = 0.07 * L, inner = -k;
  const blade = [P(-0.03 * L, -inner * w0 * 0.9), P(0.3 * L, -inner * w0 * 1.0), P(0.62 * L, -inner * w0 * 0.78), P(0.88 * L, -inner * w0 * 0.34), P(L, inner * w0 * 0.05),
    P(0.8 * L, inner * w0 * 0.3), P(0.45 * L, inner * w0 * 0.62), P(0.08 * L, inner * w0 * 0.85), P(-0.03 * L, inner * w0 * 0.85)];
  const hw = 0.034 * L;
  const shank = [P(0.02 * L, -hw), P(-0.36 * L, -hw - k * 0.03 * L), P(-0.38 * L, hw - k * 0.03 * L), P(0.02 * L, hw)];
  const rc = P(-0.53 * L * ringK, -k * 0.075 * L);
  const rx = 0.17 * L * ringK, ry = 0.1 * L * ringK, rw = Math.max(1.6, 0.04 * L);
  g.lineJoin = "round";
  g.save();
  g.translate(rc[0], rc[1]); g.rotate(a + k * 0.1);
  g.lineWidth = rw + 2.2; g.strokeStyle = LINE; g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); g.stroke();
  g.lineWidth = rw; g.strokeStyle = gv(0.8); g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); g.stroke();
  g.lineWidth = Math.max(0.6, rw * 0.3); g.strokeStyle = gv(0.96, 0.9); g.beginPath(); g.ellipse(0, 0, rx, ry, 0, Math.PI * 1.05, Math.PI * 1.75); g.stroke();
  g.restore();
  const poly = (pts, fill) => { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) g.lineTo(p[0], p[1]); g.closePath(); g.fillStyle = fill; g.fill(); g.lineWidth = 1.0; g.strokeStyle = gv(0.12, 0.85); g.stroke(); };
  poly(shank, gv(0.78));
  poly(blade, gv(0.88));
  g.lineWidth = Math.max(0.7, 0.012 * L); g.strokeStyle = gv(0.97, 0.9);
  g.beginPath(); const h0 = P(0.05 * L, -inner * w0 * 0.5), h1 = P(0.7 * L, -inner * w0 * 0.42), h2 = P(0.92 * L, -inner * w0 * 0.06); g.moveTo(h0[0], h0[1]); g.quadraticCurveTo(h1[0], h1[1], h2[0], h2[1]); g.stroke();
  g.lineWidth = Math.max(0.6, 0.008 * L); g.strokeStyle = gv(0.42, 0.8);
  g.beginPath(); const e0 = P(0.12 * L, inner * w0 * 0.42), e1 = P(0.85 * L, inner * w0 * 0.1); g.moveTo(e0[0], e0[1]); g.lineTo(e1[0], e1[1]); g.stroke();
}
export function drawScissors(g, { x, y, ang, L, open = 0.1, top = 1, ring = 1 }) {
  g.save();
  scissorsHalf(g, x, y, ang, L, open, -top, ring);
  scissorsHalf(g, x, y, ang, L, open, top, ring);
  const r = Math.max(1.5, 0.028 * L);
  g.fillStyle = gv(0.88); g.strokeStyle = LINE; g.lineWidth = 1;
  g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); g.stroke();
  g.fillStyle = gv(0.3); g.beginPath(); g.arc(x, y, r * 0.4, 0, Math.PI * 2); g.fill();
  g.restore();
}
// where the handles are held (between the rings), frame px
export function gripPoint(sc) { return [sc.x - Math.cos(sc.ang) * sc.L * 0.5 * (sc.ring ?? 1), sc.y - Math.sin(sc.ang) * sc.L * 0.5 * (sc.ring ?? 1)]; }

// the wing tip closed round the handles (frame px): short feathers pointing along dir
export function drawHand(g, p, dir, size) {
  const d = V.nrm(dir);
  g.save();
  g.lineJoin = "round";
  for (let k = -1; k <= 1; k++) {
    const dd = V.rot(d, k * 0.38), nn = V.perp(dd);
    const b = V.add(p, V.mul(V.perp(d), k * size * 0.2));
    const L = size * (1 - Math.abs(k) * 0.2);
    const tip = V.add(b, V.mul(dd, L));
    const m1 = V.add(V.add(b, V.mul(dd, L * 0.55)), V.mul(nn, -size * 0.2)), m2 = V.add(V.add(b, V.mul(dd, L * 0.55)), V.mul(nn, size * 0.2));
    const b1 = V.add(b, V.mul(nn, -size * 0.18)), b2 = V.add(b, V.mul(nn, size * 0.18));
    g.beginPath(); g.moveTo(b1[0], b1[1]); g.quadraticCurveTo(m1[0], m1[1], tip[0], tip[1]); g.quadraticCurveTo(m2[0], m2[1], b2[0], b2[1]); g.closePath();
    g.fillStyle = gv(0.9); g.fill(); g.lineWidth = 0.9; g.strokeStyle = LINE; g.stroke();
  }
  g.restore();
}

// ---------------------------------------------------------------- headphones over the head (owl units) — from s21
// dark cushion ring round a grey plate, the band a thin dark arc from the cup over the crown.
// o.side = +1 puts the cup on the viewer-left of the head (s21: -π/2 = the head's left limb in its projector)
export function myPhones(g, geo, o = {}) {
  const H = geo.H;
  const base = o.az0 ?? -Math.PI / 2;
  const c = H.P(base + (o.cupAz ?? 0.08), o.cupEl ?? -0.08, 1.0);
  const r = (o.r ?? 0.36) * H.ry;
  const pts = [];
  for (let i = 0; i <= 24; i++) {
    const u = i / 24, az = base + u * Math.PI, el = 0.25 + Math.sin(Math.PI * u) * (o.bandEl ?? 1.05);
    const q = H.P(az, el, o.bandLift ?? 1.07);
    if (q.nz > -0.35 || u < 0.3) pts.push([q.x, q.y]);
  }
  g.save(); g.lineCap = "round"; g.lineJoin = "round";
  g.strokeStyle = LINE; g.lineWidth = r * 0.3; g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.stroke();
  g.strokeStyle = gv(0.45); g.lineWidth = r * 0.14; g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.stroke();
  const sx = o.cupSx ?? 1;
  g.fillStyle = LINE; g.beginPath(); g.ellipse(c.x, c.y, r * 1.02 * sx, r * 1.08, H.roll, 0, Math.PI * 2); g.fill();
  g.fillStyle = gv(0.46); g.beginPath(); g.ellipse(c.x + r * 0.08, c.y, r * 0.78 * sx, r * 0.86, H.roll, 0, Math.PI * 2); g.fill();
  g.fillStyle = gv(0.6); g.beginPath(); g.ellipse(c.x + r * 0.12, c.y + r * 0.05, r * 0.5 * sx, r * 0.56, H.roll, 0, Math.PI * 2); g.fill();
  g.strokeStyle = gv(0.8, 0.9); g.lineWidth = r * 0.1; g.beginPath(); g.ellipse(c.x + r * 0.08, c.y, r * 0.86 * sx, r * 0.93, H.roll, Math.PI * 1.1, Math.PI * 1.75); g.stroke();
  g.restore();
}

// ---------------------------------------------------------------- legs (frame px), drawn under the body — from s21
export function drawLeg(g, hip, foot, w, toe, facing = 1, curl = 0) {
  g.save();
  g.lineCap = "round"; g.lineJoin = "round";
  const knee = [lerp(hip[0], foot[0], 0.5) + facing * w * 0.25, lerp(hip[1], foot[1], 0.5)];
  const stroke = (pts, lw, col) => { g.strokeStyle = col; g.lineWidth = lw; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); g.quadraticCurveTo(pts[1][0], pts[1][1], pts[2][0], pts[2][1]); g.stroke(); };
  stroke([hip, knee, foot], w + 2, LINE);
  stroke([hip, knee, foot], w, gv(0.86));
  const toes = [[-0.35, 1], [0, 1.1], [0.35, 0.9], [Math.PI - 0.5, 0.55]];
  for (const [a0, k] of toes) {
    const a = (facing > 0 ? a0 : Math.PI - a0) + curl * facing;
    const e = [foot[0] + Math.cos(a) * toe * k, foot[1] + Math.sin(a) * toe * k * 0.45 + curl * toe * 0.5];
    const m = [lerp(foot[0], e[0], 0.5), lerp(foot[1], e[1], 0.5) - toe * 0.1];
    stroke([foot, m, e], w * 0.7 + 1.6, LINE);
    stroke([foot, m, e], w * 0.7, gv(0.88));
  }
  g.restore();
}

// ---------------------------------------------------------------- torn edge
// A jagged closed polyline round a rectangle (frame px): straight runs of 26–52 px with ±amp kinks, as the source's
// torn rim (measured at 83.9 s: ±2–3 px about the HEADER rectangle).
export function tornRect(x0, y0, x1, y1, seed = 22, amp = 2.6) {
  const r = rng(seed), pts = [];
  const edge = (ax, ay, bx, by) => {
    const L = Math.hypot(bx - ax, by - ay), nx = -(by - ay) / L, ny = (bx - ax) / L;
    let d = 0;
    while (d < L - 8) {
      const j = d === 0 ? 0 : (r() - 0.5) * 2 * amp;
      pts.push([ax + (bx - ax) * d / L + nx * j, ay + (by - ay) * d / L + ny * j]);
      d += 26 + r() * 26;
    }
  };
  edge(x0, y0, x1, y0); edge(x1, y0, x1, y1); edge(x1, y1, x0, y1); edge(x0, y1, x0, y0);
  return pts;
}

// ---------------------------------------------------------------- the owl's own light in the margins — from s21
// Same recipe as sites.js addScreenGlow (8× shrink, 0.6·σ7 + 0.4·σ26 at 1/8 scale, ×4.5, capped at 120, added outside
// the screen through a σ10 mask), fed with only what `paint` draws outside the screen.
let OG = null;
function blurGrey(src, w, h, sigma) {
  const n = 3, wIdeal = Math.sqrt((12 * sigma * sigma) / n + 1);
  let wl = Math.floor(wIdeal); if (wl % 2 === 0) wl--;
  const wu = wl + 2, m = Math.round((12 * sigma * sigma - n * wl * wl - 4 * n * wl - 3 * n) / (-4 * wl - 4));
  let cur = Float32Array.from(src), tmp = new Float32Array(w * h);
  const box = (inp, out, r, horiz) => {
    const len = horiz ? w : h, lines = horiz ? h : w, stride = horiz ? 1 : w, k = 1 / (2 * r + 1);
    for (let l = 0; l < lines; l++) {
      const base = horiz ? l * w : l;
      let acc = 0;
      for (let i = -r; i <= r; i++) acc += inp[base + Math.min(len - 1, Math.max(0, i)) * stride];
      for (let i = 0; i < len; i++) {
        out[base + i * stride] = acc * k;
        acc += inp[base + Math.min(len - 1, i + r + 1) * stride] - inp[base + Math.max(0, i - r) * stride];
      }
    }
  };
  for (let i = 0; i < n; i++) { const r = ((i < m ? wl : wu) - 1) / 2; box(cur, tmp, r, true); box(tmp, cur, r, false); }
  return cur;
}
export function owlGlow(ctx, paint, gain, wNear = 0.6, wFar = 0.4) {
  const W = ctx.canvas.width, H = ctx.canvas.height, sw = Math.round(W / 8), sh = Math.round(H / 8);
  const S = FRAMED.screen, G = FRAMED.glowRect;
  if (!OG) {
    const mk = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
    OG = { full: mk(W, H), h2: mk(Math.round(W / 2), Math.round(H / 2)), h4: mk(Math.round(W / 4), Math.round(H / 4)), small: mk(sw, sh), up: mk(W, H), mask: mk(W, H) };
    const erf = (x) => { const t = 1 / (1 + 0.3275911 * Math.abs(x)); const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return x >= 0 ? y : -y; };
    const Phi = (x) => 0.5 * (1 + erf(x / Math.SQRT2));
    const fx = new Float32Array(W), fy = new Float32Array(H);
    for (let x = 0; x < W; x++) fx[x] = Phi((x + 0.5 - G.x0) / 10) - Phi((x + 0.5 - G.x1) / 10);
    for (let y = 0; y < H; y++) fy[y] = Phi((y + 0.5 - G.y0) / 10) - Phi((y + 0.5 - (G.y1 + 60)) / 10);
    const m = OG.mask.getContext("2d"), id = m.createImageData(W, H), d = id.data;
    for (let y = 0, i = 3; y < H; y++) for (let x = 0; x < W; x++, i += 4) d[i] = Math.round(255 * (1 - fx[x] * fy[y]));
    m.putImageData(id, 0, 0);
  }
  const f = OG.full.getContext("2d");
  f.setTransform(1, 0, 0, 1, 0, 0); f.clearRect(0, 0, W, H);
  f.save(); f.beginPath(); f.rect(0, 0, W, H); f.rect(S.x0, S.y0, S.x1 - S.x0, S.y1 - S.y0); f.clip("evenodd"); paint(f); f.restore();
  const half = (dst, src) => { const g = dst.getContext("2d"); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, dst.width, dst.height); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = "low"; g.drawImage(src, 0, 0, dst.width, dst.height); };
  half(OG.h2, OG.full); half(OG.h4, OG.h2);
  const sg = OG.small.getContext("2d", { willReadFrequently: true });
  sg.setTransform(1, 0, 0, 1, 0, 0); sg.clearRect(0, 0, sw, sh); sg.imageSmoothingEnabled = true; sg.imageSmoothingQuality = "low"; sg.drawImage(OG.h4, 0, 0, sw, sh);
  const img = sg.getImageData(0, 0, sw, sh), d = img.data, grey = new Float32Array(sw * sh);
  let any = 0;
  for (let i = 0, j = 0; j < grey.length; i += 4, j++) { grey[j] = (d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11) * (d[i + 3] / 255); any += grey[j]; }
  if (any < 1) return;
  const a = blurGrey(grey, sw, sh, 7), b = blurGrey(grey, sw, sh, 26);
  for (let i = 0, j = 0; j < grey.length; i += 4, j++) { const v = Math.min(120, (wNear * a[j] + wFar * b[j]) * 4.5 * gain); d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
  sg.putImageData(img, 0, 0);
  const u = OG.up.getContext("2d");
  u.setTransform(1, 0, 0, 1, 0, 0); u.globalCompositeOperation = "copy"; u.imageSmoothingEnabled = true; u.imageSmoothingQuality = "low";
  u.drawImage(OG.small, 0, 0, W, H);
  u.globalCompositeOperation = "destination-in"; u.drawImage(OG.mask, 0, 0); u.globalCompositeOperation = "source-over";
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = "lighter"; ctx.drawImage(OG.up, 0, 0); ctx.restore();
}
export function releaseKit() { OG = null; }
