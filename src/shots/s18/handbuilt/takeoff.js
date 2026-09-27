// s18 take-off (56.80–57.20): the owl passes the camera going up and left, heavily motion-blurred.
//   1420       the belly seen from below filling the left of the frame (x 0-840, full height at the left), the tail
//              streaking right to x ~1150, the far wing's tips at the top, the legs hanging dark at x ~380-560
//   1421/1422  a close pass: the headphone cup's dark rings at the top left, the near wing spreading up-right
//              (tips at x ~1030 on 1422), the body sliding to the lower left, blurred tail/feet trailing
//   1423       the cup and the crown feathers at the left edge, the wing spread right (top tip ~(1070,315)),
//              an arc of the body in the lower-left corner
//   1424–1430  only the wing, flapping at the left edge: a fan of long feathers (base, angles and length measured
//              per frame); nothing on 1428 and 1431–1432
// Everything is composed from parts placed on 100 px grids of the source frames, then smeared along the travel
// (an exact average of close copies) and softened.
import { plumage, ink, gv, LINE, V, setPPU, flick } from "../../../lib/owlInk.js";
import { smoothPath } from "../../../lib/paths.js";
import { rng } from "../../../lib/rng.js";

// wing-only frames: [base x, base y, angle from (deg), angle to (deg), length, blur px]
const FAN = {
  1424: [0, 900, -78, -24, 900, 30],
  1425: [-150, 950, -63, -24, 870, 24],
  1426: [-150, 950, -63, -24, 870, 24],
  1427: [-300, 1100, -40, -26, 430, 20],
  1429: [-300, 1100, -52, -33, 560, 24],
  1430: [-300, 1100, -38, -28, 420, 20],
};
// composed frames. body: smooth outline points; cup: [x, y, r]; tufts: [[base, tip, w]]; wing: fan spec; tail:
// [[root, tip, w]]; legs: [[hip, ankle, w]]; blur: travel vector (px) for the smear; soft: extra gaussian (px)
const PASS = {
  1420: {
    body: [[-60, -60], [720, -60], [780, 90], [835, 240], [845, 370], [780, 470], [640, 545], [480, 585], [330, 592], [190, 565], [70, 530], [-60, 520]],
    wing: [420, 90, -26, -8, 440], wingN: 5,
    tail: [[[760, 360], [1150, 420], 70], [[760, 400], [1140, 468], 60], [[740, 330], [1080, 360], 60]],
    legs: [[[400, 600], [430, 880], 58], [[520, 600], [540, 840], 50]],
    tufts: [[[380, 520], [420, 700], 110], [[500, 520], [520, 680], 90]],
    toes: [[[430, 860], [380, 930]], [[430, 860], [470, 940]], [[540, 820], [560, 900]]],
    blur: [-34, -26], soft: 2.5, fw: 0.1, cov: 0.4,
  },
  1421: {
    body: [[-60, 60], [300, 30], [560, 90], [700, 190], [760, 400], [730, 620], [640, 820], [600, 1000], [-60, 1000]],
    cup: [140, 95, 105], wing: [420, 380, -58, -30, 480], wingN: 5,
    tail: [[[640, 600], [1100, 620], 90], [[620, 560], [1060, 540], 80]],
    blur: [-60, -40], soft: 2.5, fw: 0.1, cov: 0.4,
  },
  1422: {
    // the head round the cup and the body below the wing are one pale mass on the left (source: no dark gap there)
    head: [100, 280, 190, 230],
    body: [[-60, 380], [150, 420], [330, 520], [520, 640], [700, 760], [760, 900], [740, 1000], [-60, 1000]],
    cup: [105, 300, 115], tufts: [[[60, 140], [150, 10], 50], [[120, 150], [240, 30], 46], [[20, 160], [40, 20], 44]],
    wing: [250, 560, -27, -4, 860], wingN: 7,
    tail: [[[660, 780], [1050, 800], 80], [[640, 740], [980, 720], 70]],
    blur: [-36, -22], soft: 1.5, fw: 0.12, cov: 0.3, rows: 2, crisp: 1,
  },
  1423: {
    // measured on the source: cup centre ~(60,560), crown feathers up-right at x 10-300, wing tips (850,324),
    // (866,509), (700,698), (633,787) fanned from a base near (200,850), a body arc in the lower-left corner
    head: [40, 520, 150, 190],
    body: [[-60, 700], [100, 720], [230, 800], [280, 1000], [-60, 1000]],
    cup: [60, 560, 112], tufts: [[[60, 420], [150, 262], 58], [[120, 440], [240, 300], 54], [[170, 470], [300, 380], 48], [[0, 420], [40, 256], 50]],
    wing: [200, 850, -40, -8, 850], wingN: 7,
    blur: [-24, -16], soft: 1, fw: 0.13, cov: 0.3, rows: 2, decay: 0.48, crisp: 1,
  },
};

function featherPts(root, tip, w) {
  const d = V.sub(tip, root), L = V.len(d), u = V.nrm(d), n = V.perp(u);
  const P = (a, b) => V.add(V.add(root, V.mul(u, a * L)), V.mul(n, b * w + 0.05 * L * Math.sin(Math.PI * a)));
  return [P(0, -0.5), P(0.35, -0.54), P(0.72, -0.44), P(0.93, -0.2), P(1, 0.02), P(0.9, 0.28), P(0.62, 0.48), P(0.3, 0.52), P(0, 0.5)];
}
const LIGHT = [-0.7, -0.7];
function fan(g, [bx, by, a0, a1, L], n = 6, { fw = 0.12, cov = 1, rows = 0, decay = 0.3, crisp = 0 } = {}) {
  const r = rng(Math.round(bx * 7 + by * 3 + L));
  setPPU(1);
  // back to front: the longest (outer, first-angle) primaries first
  for (let i = 0; i < n; i++) {
    const f = i / (n - 1), a = ((a0 + (a1 - a0) * f) * Math.PI) / 180;
    const len = L * (1 - decay * f) * (0.95 + 0.1 * r());
    const root = [bx + Math.cos(a + 1.3) * 60 * f, by + Math.sin(a + 1.3) * 60 * f];
    const tip = [bx + Math.cos(a) * len, by + Math.sin(a) * len];
    const q = featherPts(root, tip, L * fw);
    plumage(g, (c) => smoothPath(c, q, true), { base: 0.96, shade: crisp ? 0.88 : 0.8, light: LIGHT, depth: crisp ? 10 : 20, blur: crisp ? 4 : 12 });
    ink(g, [q[2], q[3], q[4], q[5], q[6]], crisp ? 4 : 3.2, LINE, { end: 0.15, bias: 0.3 });
    ink(g, [V.mix(root, tip, 0.3), V.mix(root, tip, 0.6), V.mix(root, tip, 0.85)], 2, gv(0.35, 0.55), { end: 0.1 });
  }
  // coverts round the base
  const am = (((a0 + a1) / 2) * Math.PI) / 180;
  const cx = bx + Math.cos(am) * L * 0.22 * cov, cy = by + Math.sin(am) * L * 0.22 * cov;
  plumage(g, (c) => c.ellipse(cx, cy, L * 0.3 * cov, L * 0.15 * cov, am, 0, 7), { base: 0.96, shade: 0.84, light: LIGHT, depth: 16, blur: 10 });
  // rows of short rounded coverts fanned along the base (the wing seen from below)
  for (let row = 0; row < rows; row++) {
    for (let k = 0; k < n; k++) {
      const f = k / (n - 1), a = ((a0 + (a1 - a0) * f) * Math.PI) / 180, rr = L * (0.2 + 0.14 * row);
      const root = [bx + Math.cos(a) * rr * 0.35, by + Math.sin(a) * rr * 0.35], tip = [bx + Math.cos(a) * rr, by + Math.sin(a) * rr];
      const q = featherPts(root, tip, L * 0.075);
      plumage(g, (c) => smoothPath(c, q, true), { base: 0.96, shade: 0.84, light: LIGHT, depth: 10, blur: 6 });
      ink(g, [q[3], q[4], q[5], q[6]], 2.4, gv(0.15, 0.8), { end: 0.2 });
    }
  }
  if (cov < 0.5) return;
  for (let k = 0; k < 5; k++) {
    const u = (k + 0.5) / 5 - 0.5, p = [cx + Math.cos(am + 1.57) * L * 0.2 * u, cy + Math.sin(am + 1.57) * L * 0.2 * u];
    ink(g, [p, [p[0] + Math.cos(am) * L * 0.12, p[1] + Math.sin(am) * L * 0.12]], 2.2, gv(0.3, 0.6), { end: 0.2 });
  }
}
// the headphone cup seen end-on, smeared: concentric dark cushion rings round a grey plate
function cupRings(g, x, y, R) {
  g.fillStyle = "#0b0b0b"; g.beginPath(); g.ellipse(x, y, R, R * 1.05, 0.2, 0, 7); g.fill();
  for (const [k, v, w] of [[0.92, 0.55, 5], [0.78, 0.3, 4], [0.66, 0.6, 3]]) { g.strokeStyle = gv(v, 0.9); g.lineWidth = w; g.beginPath(); g.ellipse(x, y, R * k, R * k * 1.05, 0.2, 0, 7); g.stroke(); }
  g.fillStyle = gv(0.62); g.beginPath(); g.ellipse(x + R * 0.06, y, R * 0.52, R * 0.55, 0.2, 0, 7); g.fill();
  g.strokeStyle = LINE; g.lineWidth = 3; g.beginPath(); g.ellipse(x + R * 0.06, y, R * 0.52, R * 0.55, 0.2, 0, 7); g.stroke();
  g.fillStyle = gv(0.9, 0.7); g.beginPath(); g.ellipse(x - R * 0.12, y - R * 0.2, R * 0.14, R * 0.2, 0.3, 0, 7); g.fill();
}
function pass(g, P) {
  setPPU(1);
  const r = rng(77);
  // trailing tail feathers (behind)
  for (const [a, b, w] of P.tail || []) { const q = featherPts(a, b, w); plumage(g, (x) => smoothPath(x, q, true), { base: 0.93, shade: 0.8, light: LIGHT, depth: 20, blur: 14 }); ink(g, q.slice(2, 7), 3, LINE, { end: 0.2 }); }
  // legs: dark scaly, pale toes
  for (const [h, a, w] of P.legs || []) {
    const d = V.nrm(V.sub(a, h)), n = V.perp(d);
    const q = [V.add(h, V.mul(n, w * 0.5)), V.add(a, V.mul(n, w * 0.4)), V.sub(a, V.mul(n, w * 0.4)), V.sub(h, V.mul(n, w * 0.5))];
    g.fillStyle = gv(0.22); g.beginPath(); g.moveTo(...q[0]); for (const p of q) g.lineTo(...p); g.closePath(); g.fill();
    const L = V.len(V.sub(a, h));
    for (let s = 12; s < L; s += 16) { const p = V.add(h, V.mul(d, s)); ink(g, [V.add(p, V.mul(n, w * 0.4)), V.sub(p, V.mul(n, w * 0.4))], 3, gv(0.55, 0.7)); }
  }
  for (const [a, b] of P.toes || []) ink(g, [a, V.mix(a, b, 0.5), b], 22, gv(0.8), { end: 0.3 });
  // wing behind the body on 1420 (the far tips at the top), in front otherwise
  const fopt = { fw: P.fw ?? 0.12, cov: P.cov ?? 1, rows: P.rows ?? 0, decay: P.decay ?? 0.3, crisp: P.crisp ?? 0 };
  if (P.wing && P.body && P.body[0][1] < 0) fan(g, P.wing, P.wingN || 5, fopt);
  if (P.body) {
    const bp = (c) => smoothPath(c, P.body, true);
    plumage(g, bp, { base: 0.96, shade: 0.8, light: LIGHT, depth: 80, blur: 50 });
    g.save(); g.beginPath(); bp(g); g.clip();
    const xs = P.body.map((p) => p[0]), ys = P.body.map((p) => p[1]);
    const x0 = Math.max(0, Math.min(...xs)), x1 = Math.max(...xs), y0 = Math.max(0, Math.min(...ys)), y1 = Math.min(946, Math.max(...ys));
    for (let i = 0; i < 80; i++) { const x = x0 + r() * (x1 - x0), y = y0 + r() * (y1 - y0); flick(g, [x, y], V.nrm([-0.7, 0.6]), 20 + r() * 26, 2, gv(0.5, 0.35), 0.05); }
    g.restore();
  }
  if (P.head) { const [hx, hy, hrx, hry] = P.head; plumage(g, (c) => c.ellipse(hx, hy, hrx, hry, 0.2, 0, 7), { base: 0.95, shade: 0.8, light: LIGHT, depth: 40, blur: 30 }); }
  for (const [a, b, w] of P.tufts || []) { const q = featherPts(a, b, w); plumage(g, (x) => smoothPath(x, q, true), { base: 0.94, shade: 0.8, light: LIGHT, depth: 10, blur: 8 }); ink(g, q.slice(2, 7), 2.2, gv(0.2, 0.7), { end: 0.2 }); }
  if (P.cup) cupRings(g, ...P.cup);
  if (P.wing && !(P.body && P.body[0][1] < 0)) fan(g, P.wing, P.wingN || 5, fopt);
}

let cache = null;
// draw() into a full-frame scratch, then average N close copies along the travel vector ("lighter" at 1/N) and
// soften: one smooth smear, not a comb of copies
function smear(ctx, draw, bx, by, soft = 3) {
  if (!cache.scr) {
    for (const k of ["scr", "acc"]) { cache[k] = document.createElement("canvas"); cache[k].width = 2206; cache[k].height = 946; }
  }
  const c = cache.scr, g = c.getContext("2d"), A = cache.acc, ga = A.getContext("2d");
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, 2206, 946);
  draw(g);
  const L = Math.hypot(bx, by), N = Math.max(8, Math.min(24, Math.ceil(L / 4)));
  ga.setTransform(1, 0, 0, 1, 0, 0); ga.globalCompositeOperation = "source-over"; ga.globalAlpha = 1; ga.clearRect(0, 0, 2206, 946);
  ga.globalCompositeOperation = "lighter"; ga.globalAlpha = 1 / N;
  for (let i = 0; i < N; i++) { const u = i / (N - 1) - 0.5; ga.drawImage(c, bx * u, by * u); }
  ga.globalCompositeOperation = "source-over"; ga.globalAlpha = 1;
  ctx.save(); ctx.filter = `blur(${soft.toFixed(1)}px)`; ctx.drawImage(A, 0, 0); ctx.restore();
}
export function drawTakeoff(ctx, f) {
  if (!PASS[f] && !FAN[f]) return;
  if (!cache) cache = {};
  if (PASS[f]) { const P = PASS[f]; smear(ctx, (g) => pass(g, P), P.blur[0], P.blur[1], P.soft ?? 3); return; }
  const p = FAN[f];
  smear(ctx, (g) => fan(g, p), p[5], -p[5] * 0.6, 3);
}
export function releaseTakeoff() { cache = null; }
