// s23 — the owl's white flame aura (92.64–95.56) and the flare (94.88–95.12), drawn as inked vector flames (frame px).
//
// Fix pass 1 rebuild (the earlier aura was a blurred white oval with a flat bottom). Measured on the source:
//  - the aura is ONE drawing held through the power-up, the reach and the two pairs (its envelope barely moves between
//    93.2 and 95.5): bright mass x ≈ 487–903; tongue tips (column tops) x 480: 445, 510: 420, 540: 390, 570: 382,
//    600: 335, 630: 350, 660: 323, 690: 300, 720: 311, 750: 345, 780: 357, 810: 375, 840: 393, 870: 400, 900: 435;
//    the lower edge at y ≈ 610–635 (over the speaker), the lower sides sweeping outward (snapshots/s23-fix1-tools);
//  - white tongues with thin grey inked edges and curled, pointed tips; dark gaps between the tongue groups, cut into
//    the mass from its edge; grey licks inside; the lower flames and the big right-hand flame translucent.
// The drawing boils: 6 variants (tips and sways jittered a few px), one per frame.
import { rng } from "../../lib/rng.js";

const TAU = Math.PI * 2, D = Math.PI / 180;

// one flame tongue from base b toward direction dir (deg, canvas: -90 = up), length L, base width w, curl (signed,
// fraction of L: the tip hooks sideways), phase ph. Returns { left, right, C } (edge polylines and the centre line).
function tongueGeom(b, dir, L, w, curl, ph) {
  const d = [Math.cos(dir * D), Math.sin(dir * D)], n = [-d[1], d[0]], N = 22, left = [], right = [];
  const C = (u) => {
    const s = curl * L * (0.28 * Math.sin(Math.PI * u * 1.25 + ph) * u + 0.62 * Math.pow(u, 2.3));
    return [b[0] + d[0] * L * u + n[0] * s, b[1] + d[1] * L * u + n[1] * s];
  };
  for (let i = 0; i <= N; i++) {
    const u = i / N, c = C(u), c2 = C(Math.min(1, u + 0.02)), t = [c2[0] - c[0], c2[1] - c[1]], tl = Math.hypot(t[0], t[1]) || 1;
    const nn = [-t[1] / tl, t[0] / tl];
    const hw = (w / 2) * Math.pow(Math.max(0, 1 - u), 0.85) * (0.88 + 0.14 * Math.sin(u * 8 + ph));
    // the inner (concave) side of a hooked tip is thinner: flames lick with a sharp outside curve
    const kl = curl > 0 ? 1.08 : 0.86, kr = curl > 0 ? 0.86 : 1.08;
    left.push([c[0] - nn[0] * hw * kl, c[1] - nn[1] * hw * kl]);
    right.push([c[0] + nn[0] * hw * kr, c[1] + nn[1] * hw * kr]);
  }
  return { left, right, C };
}
function tonguePath(g, T) {
  g.moveTo(T.left[0][0], T.left[0][1]);
  for (const p of T.left) g.lineTo(p[0], p[1]);
  for (let i = T.right.length - 1; i >= 0; i--) g.lineTo(T.right[i][0], T.right[i][1]);
  g.closePath();
}
// the edge ink of a tongue: both edges from u0 to the tip, a thin grey line that thins toward the tip
function tongueInk(g, T, u0, col, w) {
  const N = T.left.length - 1, i0 = Math.floor(u0 * N);
  for (const side of [T.left, T.right]) {
    for (let i = i0; i < N; i++) {
      const f = i / N;
      g.lineWidth = w * (0.55 + 0.6 * Math.sin(Math.PI * Math.min(1, (f - u0) / (1 - u0) * 0.9 + 0.1)));
      g.strokeStyle = col;
      g.beginPath(); g.moveTo(side[i][0], side[i][1]); g.lineTo(side[i + 1][0], side[i + 1][1]); g.stroke();
    }
  }
}

// the envelope of the tongue tips (measured column tops, see above)
const TOP = [[470, 452], [480, 445], [510, 420], [540, 390], [570, 382], [600, 335], [630, 350], [660, 323], [690, 300], [720, 311], [750, 345], [780, 357], [810, 375], [840, 393], [870, 400], [900, 435], [912, 460]];
const topAt = (x) => { for (let i = 1; i < TOP.length; i++) if (x <= TOP[i][0]) { const a = TOP[i - 1], b = TOP[i], u = (x - a[0]) / (b[0] - a[0]); return a[1] + (b[1] - a[1]) * u; } return TOP[TOP.length - 1][1]; };

// The aura is a flame FIELD: every tongue is a pointed profile hanging from its tip along an axis (tip -> base),
// half-width hw·(along/40)^1.6 (capped), its axis swaying in an S that curls toward the tip; the mass is the union of
// the tongues and a core round the owl, minus the dark gaps. Ink: a grey line on every edge of the union and on the
// seams where two tongues meet inside the mass (the source's inner flame lines).
// tongue: [tip x, tip y, axis dx, axis dy (unit-ish, tip -> base), hw at 40 px, cap (max half-width), sway amp, sway
// wavelength, phase, alpha, length (tip -> blunt end, inside the core)]
function tongues(variant) {
  const R0 = rng(4400), rv = rng(4400 + variant * 97), j = (a) => (rv() - 0.5) * 2 * a, out = [];
  // 1) the top row: tips on the measured envelope, alternate ones lower (the notches between tongue groups)
  let i = 0;
  for (let x = 478; x <= 908; x += 33, i++) {
    const tipX = x + (R0() - 0.5) * 10 + j(2.5), tipY = topAt(x) + (i % 3 === 2 ? 22 + 14 * R0() : 2 + 8 * R0()) + j(3);
    const ax = (690 - x) / 900 + (R0() - 0.5) * 0.25;
    const coreTop = 505 - 100 * Math.sqrt(Math.max(0, 1 - ((x - 695) / 172) ** 2));
    out.push([tipX, tipY, ax, 1, 12 + 3 * R0(), 27 + 6 * R0(), 17 + 7 * R0(), 40 + 14 * R0(), R0() * TAU + j(0.35), 0.97, Math.max(90, coreTop - tipY + 45)]);
  }
  // 1b) an inner row: shorter tongues inside the mass, their seams read as the inner flame lines
  i = 0;
  for (let x = 530; x <= 870; x += 38, i++) {
    const tipY = topAt(x) + 40 + 30 * R0() + j(3), coreTop = 505 - 100 * Math.sqrt(Math.max(0, 1 - ((x - 695) / 172) ** 2));
    out.push([x + (R0() - 0.5) * 14 + j(2.5), tipY, (690 - x) / 800, 1, 11 + 3 * R0(), 20 + 5 * R0(), 10 + 5 * R0(), 32 + 10 * R0(), R0() * TAU + j(0.35), 0.97, Math.max(70, coreTop - tipY + 40)]);
  }
  // 2) the flanks: tips out at x ≈ 482–500 (left) / 895–910 (right), y 455–600, the tongues sweeping out and up
  for (let k = 0; k < 6; k++) {
    const y = 458 + k * 27 + R0() * 10;
    out.push([452 + R0() * 16 + j(3), y + j(3), 1, 0.2 - 0.12 * k + (R0() - 0.5) * 0.3, 12 + 5 * R0(), 17, 8 + 4 * R0(), 26 + 8 * R0(), R0() * TAU + j(0.35), k > 3 ? 0.8 : 0.93, 95]);
    out.push([936 - R0() * 16 + j(3), y + j(3), -1, 0.2 - 0.12 * k + (R0() - 0.5) * 0.3, 12 + 5 * R0(), 17, 8 + 4 * R0(), 26 + 8 * R0(), R0() * TAU + j(0.35), k > 3 ? 0.8 : 0.93, 95]);
  }
  // 3) low flames along the speaker top, tips at y ≈ 612–636, sweeping outward
  for (let k = 0; k < 8; k++) {
    const f = k / 7, x = 520 + f * 350, lft = x < 695;
    out.push([x + (R0() - 0.5) * 20 + j(3), 615 + 20 * R0() + j(3), lft ? 0.8 : -0.8, -0.6, 12 + 4 * R0(), 17, 8, 26, R0() * TAU + j(0.35), 0.78, 80]);
  }
  return out;
}
// dark gaps cut from the edge into the mass: [tip x, tip y (deep end), axis dx, dy (tip -> mouth), hw, cap, sway, wl, ph]
// (the source's black flame shapes: upper left ≈ (530–560, 380–470), right ≈ (820–850, 400–470), smaller ones between)
// (…, length)
const GAPS = [[532, 482, -0.35, -1, 7, 15, 7, 24, 0.3, 110], [562, 452, -0.12, -1, 6, 13, 6, 22, 1.3, 100], [615, 420, 0.05, -1, 5, 11, 5, 20, 2.2, 80], [742, 395, 0.1, -1, 5, 10, 5, 20, 0.9, 80],
  [818, 470, 0.35, -1, 7, 14, 7, 24, 2.8, 100], [848, 488, 0.5, -1, 6, 14, 6, 22, 4.1, 100], [508, 530, -1, -0.25, 5, 11, 5, 20, 1.7, 50], [884, 540, 1, -0.25, 5, 11, 5, 20, 5.1, 50],
  [565, 612, -0.6, 1, 5, 10, 4, 18, 0.6, 45], [828, 612, 0.6, 1, 5, 10, 4, 18, 3.6, 45]];

const X0 = 380, Y0 = 250, WW = 640, HH = 420;
const CACHE = new Map();
function profile(T, x, y) {
  // signed horizontal-ish distance inside one tongue (px); T = [tx, ty, dx, dy, hw, cap, A, wl, ph]
  const l = Math.hypot(T[2], T[3]), dx = T[2] / l, dy = T[3] / l;
  const px = x - T[0], py = y - T[1], along = px * dx + py * dy;
  if (along < -2) return -1e9;
  // the axis sways in an S (wavelength T[7]) and hooks near the tip (the tip sits off the tongue's body)
  const hook = Math.sin(T[8] * 3) > 0 ? 1 : -1;
  const sway = T[6] * Math.sin(along / T[7] + T[8]) * Math.min(1, along / 30) + hook * T[6] * 1.2 * Math.exp(-along / 26) * Math.min(1, along / 6 + 0.3);
  const perp = Math.abs(px * -dy + py * dx - sway);
  // a full body and a fine point: half-width rises like 1 − e^(−along/λ), with slow lobes along the edges
  const half = T[5] * Math.min(1, Math.pow(Math.max(0, along) / (T[4] * 5.5), 1.15)) * (1 + 0.14 * Math.sin(along / 11 + T[8] * 2));
  return Math.min(half - perp, (T[10] - along) * 0.6);
}
export function auraCanvas(variant = 0) {
  if (CACHE.has(variant)) return CACHE.get(variant);
  const c = document.createElement("canvas"); c.width = WW; c.height = HH;
  const g = c.getContext("2d");
  const img = g.createImageData(WW, HH), d = img.data;
  const T = tongues(variant), rv = rng(900 + variant);
  const gaps = GAPS.map((q) => [q[0] + (rv() - 0.5) * 4, q[1] + (rv() - 0.5) * 4, ...q.slice(2)]);
  const cx = 695, cy = 505, rx = 172, ry = 100;
  for (let jy = 0; jy < HH; jy++) {
    const y = Y0 + jy + 0.5;
    for (let ix = 0; ix < WW; ix++) {
      const x = X0 + ix + 0.5;
      // core: an ellipse, its edge pushed about by a slow wobble (hidden under the tongues anyway)
      const q = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
      let F1 = (1 - q) * 55, F2 = -1e9, a1 = 0.95, lowA = 1;
      if (q > 3.2) { F1 = -1e9; }
      // the mass rises under the tongue tips: everything more than ~72 px below the envelope, between the flanks
      {
        const qe = ((x - 695) / 212) ** 2 + ((y - 470) / 134) ** 2;
        const fm = Math.min(y - topAt(x) - 80, (1 - qe) * 60);
        if (fm > F1) F1 = fm;
      }
      for (let t = 0; t < T.length; t++) {
        const f = profile(T[t], x, y);
        if (f > F1) { F2 = F1; F1 = f; a1 = T[t][9]; } else if (f > F2) F2 = f;
      }
      if (F1 < -1.5) continue;
      let F = F1;
      for (const G of gaps) { const fg = profile(G, x, y); if (-fg < F) F = -fg; }
      if (F < -1.5) continue;
      const alpha = Math.max(0, Math.min(1, (F + 1) / 2)) * a1 * lowA;
      // ink: the outer edge (and the gaps' rims), and the seams between two tongues inside the mass
      let v = 247;
      if (F < 1.6) v = 247 - 120 * Math.max(0, 1 - Math.abs(F - 0.3) / 1.3);
      else if (F2 > 1.5 && F1 - F2 < 1.0 && F1 < 14) v = 247 - 60 * (1 - (F1 - F2) / 1.0);
      const o = (jy * WW + ix) * 4;
      d[o] = v; d[o + 1] = v; d[o + 2] = v - 3; d[o + 3] = Math.round(255 * Math.max(alpha, F < 1.6 ? Math.min(1, (F + 1.5) / 2) * 0.85 * a1 : 0));
    }
  }
  g.putImageData(img, 0, 0);
  const out = { c, x: X0, y: Y0 };
  CACHE.set(variant, out);
  return out;
}
export function drawAura2(g, variant, alpha = 1) {
  const A = auraCanvas(variant % 6);
  g.save(); g.globalAlpha *= alpha; g.drawImage(A.c, A.x, A.y); g.restore();
}

// ---------------------------------------------------------------- the flare (94.88–95.12)
// Measured on 2372–2378: a white bonfire round the owl, widest at y ≈ 420–540 (x ≈ 440–910 at its peak), a rounded
// bottom at y ≈ 620 over the speaker, its sides curving in toward the top, long tongues past the frame top at the
// peak (x 600–850) and thin rays up to the left. Stages: a 2372–2373 (tips to y ≈ 80–150), b 2374–2376 (the peak),
// c 2377–2378 (dying down, tips to y ≈ 180–260).
const FLARE = {
  a: { rx: 225, ry: 140, cy: 480, tips: 150, rays: [[520, 330, 330, 80, 16]] },
  b: { rx: 235, ry: 160, cy: 455, tips: -60, rays: [[520, 300, 380, 90, 18], [860, 310, 1010, 110, 14]] },
  c: { rx: 195, ry: 120, cy: 490, tips: 250, rays: [] },
};
const FC = new Map();
export function flareCanvas(stage) {
  if (FC.has(stage)) return FC.get(stage);
  const S = FLARE[stage], cx = 690, x0 = 300, y0 = -100, w = 820, h = 760;
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const g = c.getContext("2d"); g.translate(-x0, -y0); g.lineCap = "round"; g.lineJoin = "round";
  const r = rng(7300 + stage.charCodeAt(0));
  // the bonfire body: an egg widest a little below its centre, rounded at the bottom, narrowing toward the top
  g.beginPath();
  for (let i = 0; i <= 64; i++) {
    const t = (i / 64) * TAU, st = Math.sin(t), ct = Math.cos(t);
    const wy = st > 0 ? 1 - 0.22 * st * st : 1 - 0.28 * (-st);     // narrower upper half, rounded narrower bottom
    const x = cx + ct * S.rx * wy, y = S.cy + st * S.ry * (st > 0 ? 1.0 : 1.25);
    i ? g.lineTo(x, y) : g.moveTo(x, y);
  }
  g.closePath(); g.fillStyle = "rgb(248,248,245)"; g.fill();
  // tongues from the upper half: the centre ones to `tips` (past the frame top at the peak), the flanks shorter,
  // curving outward; side tongues sweeping up off the widest part
  const n = 15;
  for (let i = 0; i < n; i++) {
    const f = i / (n - 1), a = Math.PI * (1.05 + 0.9 * f), bx = cx + Math.cos(a) * S.rx * 0.62, by = S.cy + Math.sin(a) * S.ry * 0.7;
    const centre = 1 - Math.pow(Math.abs(f - 0.5) * 2, 1.6);
    const tipY = S.tips + (1 - centre) * (S.cy - S.tips) * 0.62 + (i % 2 ? 40 : 0) * (1 - centre * 0.5) + (r() - 0.5) * 30;
    const tipX = bx + (f - 0.5) * 160 + (r() - 0.5) * 30;
    const dx = tipX - bx, dy = tipY - by, L = Math.hypot(dx, dy);
    const T = tongueGeom([bx, by], Math.atan2(dy, dx) / D, L, 58 + 30 * centre, (i % 2 ? 1 : -1) * (0.08 + 0.05 * r()), r() * TAU);
    g.beginPath(); tonguePath(g, T); g.fillStyle = "rgb(248,248,245)"; g.fill();
  }
  for (const sd of [-1, 1]) for (let i = 0; i < 3; i++) {
    const by = S.cy - 10 + i * 45, bx = cx + sd * S.rx * 0.8;
    const T = tongueGeom([bx, by], sd < 0 ? 205 - i * 8 : -25 + i * 8, 70 + 20 * r(), 40, sd * -0.14, r() * TAU);
    g.beginPath(); tonguePath(g, T); g.fillStyle = "rgb(246,246,242)"; g.fill();
  }
  // thin rays up to the left / right (the long straight streaks at 94.88–95.04)
  for (const [ax, ay, bx2, by2, w0] of S.rays) {
    const T = tongueGeom([ax, ay], Math.atan2(by2 - ay, bx2 - ax) / D, Math.hypot(bx2 - ax, by2 - ay), w0, 0.03, 0.5);
    g.beginPath(); tonguePath(g, T); g.fillStyle = "rgba(246,246,242,0.95)"; g.fill();
  }
  // a soft grey rim inside the edge (the source's flare is shaded toward its flanks) and grey licks
  g.save(); g.globalCompositeOperation = "source-atop";
  const rim = g.createRadialGradient(cx, S.cy - 30, S.rx * 0.45, cx, S.cy, S.rx * 1.25);
  rim.addColorStop(0, "rgba(160,160,156,0)"); rim.addColorStop(0.75, "rgba(160,160,156,0.06)"); rim.addColorStop(1, "rgba(140,140,136,0.28)");
  g.fillStyle = rim; g.fillRect(x0, y0, w, h); g.restore();
  g.strokeStyle = "rgba(150,150,146,0.35)"; g.lineWidth = 1.2;
  for (let i = 0; i < 18; i++) {
    const a = Math.PI * (0.95 + 1.1 * r()), rr = 0.75 + 0.2 * r(), x = cx + Math.cos(a) * S.rx * rr, y = S.cy + Math.sin(a) * S.ry * rr;
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + (r() - 0.5) * 20, y - 20, x + (r() - 0.5) * 16, y - 40 - 30 * r()); g.stroke();
  }
  const out = { c, x: x0, y: y0 };
  FC.set(stage, out);
  return out;
}
export function drawFlare2(g, stage) {
  const F = flareCanvas(stage);
  g.drawImage(F.c, F.x, F.y);
}
export function releaseAura() { CACHE.clear(); FC.clear(); }
