// s18 take-off (56.84–57.20): the owl passes the camera going up and left, heavily motion-blurred.
//   1421/1422  a close pass seen from below/behind: a big blurred white body, the headphone cup at the top left,
//              the near wing spreading up-right, blurred tail feathers / feet (composed from parts, placed by eye on
//              a 100 px grid of the source frames)
//   1423–1430  only the wing, flapping at the left edge: a fan of long feathers (base, angles and length measured
//              per frame); nothing on 1428 and 1431–1432
import { plumage, ink, gv, LINE, V, setPPU, drawCup } from "../../lib/owlInk.js";
import { smoothPath } from "../../lib/paths.js";
import { rng } from "../../lib/rng.js";

// wing-only frames: [base x, base y, angle from (deg), angle to (deg), length, blur px]
const FAN = {
  1423: [60, 760, -31, -5, 860, 40],
  1424: [0, 900, -78, -24, 900, 30],
  1425: [-150, 950, -63, -24, 870, 24],
  1426: [-150, 950, -63, -24, 870, 24],
  1427: [-300, 1100, -40, -26, 430, 20],
  1429: [-300, 1100, -52, -33, 560, 24],
  1430: [-300, 1100, -38, -28, 420, 20],
};
// close pass frames: body ellipse, head, cup, wing fan, trailing feathers, blur vector
const PASS = {
  1421: { body: [330, 520, 480, 430, -0.4], head: null, cup: [70, 70, 120, 0.3], wing: [260, 330, -62, -26, 640], tail: [[640, 610], [1110, 600], [1060, 520]], blur: [-110, -70] },
  1422: { body: [220, 760, 470, 420, -0.3], head: [110, 250, 230], cup: [120, 300, 115, 0.2], tuft: [60, 40], wing: [240, 520, -32, -8, 960], tail: [[620, 790], [900, 800], [880, 720]], blur: [-90, -60] },
};

function featherPts(root, tip, w) {
  const d = V.sub(tip, root), L = V.len(d), u = V.nrm(d), n = V.perp(u);
  const P = (a, b) => V.add(V.add(root, V.mul(u, a * L)), V.mul(n, b * w + 0.05 * L * Math.sin(Math.PI * a)));
  return [P(0, -0.5), P(0.35, -0.54), P(0.72, -0.44), P(0.93, -0.2), P(1, 0.02), P(0.9, 0.28), P(0.62, 0.48), P(0.3, 0.52), P(0, 0.5)];
}
const LIGHT = [-0.7, -0.7];
function fan(g, [bx, by, a0, a1, L], n = 6) {
  const r = rng(Math.round(bx * 7 + by * 3 + L));
  setPPU(1);
  // back to front: the longest (outer, first-angle) primaries first
  for (let i = 0; i < n; i++) {
    const f = i / (n - 1), a = ((a0 + (a1 - a0) * f) * Math.PI) / 180;
    const len = L * (1 - 0.3 * f) * (0.95 + 0.1 * r());
    const root = [bx + Math.cos(a + 1.3) * 60 * f, by + Math.sin(a + 1.3) * 60 * f];
    const tip = [bx + Math.cos(a) * len, by + Math.sin(a) * len];
    const q = featherPts(root, tip, L * 0.12);
    plumage(g, (c) => smoothPath(c, q, true), { base: 0.95, shade: 0.8, light: LIGHT, depth: 20, blur: 12 });
    ink(g, [q[2], q[3], q[4], q[5], q[6]], 3.2, LINE, { end: 0.15, bias: 0.3 });
    ink(g, [V.mix(root, tip, 0.3), V.mix(root, tip, 0.6), V.mix(root, tip, 0.85)], 2, gv(0.35, 0.55), { end: 0.1 });
  }
  // coverts round the base
  const am = (((a0 + a1) / 2) * Math.PI) / 180;
  const cx = bx + Math.cos(am) * L * 0.22, cy = by + Math.sin(am) * L * 0.22;
  plumage(g, (c) => c.ellipse(cx, cy, L * 0.3, L * 0.15, am, 0, 7), { base: 0.96, shade: 0.84, light: LIGHT, depth: 16, blur: 10 });
  for (let k = 0; k < 5; k++) {
    const u = (k + 0.5) / 5 - 0.5, p = [cx + Math.cos(am + 1.57) * L * 0.2 * u, cy + Math.sin(am + 1.57) * L * 0.2 * u];
    ink(g, [p, [p[0] + Math.cos(am) * L * 0.12, p[1] + Math.sin(am) * L * 0.12]], 2.2, gv(0.3, 0.6), { end: 0.2 });
  }
}
function pass(g, P) {
  setPPU(1);
  const [bx, by, rx, ry, rot] = P.body;
  // trailing tail feathers / legs (behind)
  if (P.tail) { const [a, b, c] = P.tail; for (const t of [b, c]) { const q = featherPts(a, t, 90); plumage(g, (x) => smoothPath(x, q, true), { base: 0.93, shade: 0.78, light: LIGHT, depth: 20, blur: 14 }); ink(g, q.slice(2, 7), 3, LINE, { end: 0.2 }); } }
  plumage(g, (c) => c.ellipse(bx, by, rx, ry, rot, 0, 7), { base: 0.96, shade: 0.8, light: LIGHT, depth: 80, blur: 50 });
  const r = rng(77);
  g.save(); g.beginPath(); g.ellipse(bx, by, rx, ry, rot, 0, 7); g.clip();
  for (let i = 0; i < 70; i++) { const x = bx + (r() - 0.5) * rx * 1.8, y = by + (r() - 0.5) * ry * 1.8; ink(g, [[x, y], [x - 22, y + 16]], 2, gv(0.5, 0.4), { end: 0.1 }); }
  g.restore();
  if (P.head) {
    const [hx, hy, hr] = P.head;
    plumage(g, (c) => c.ellipse(hx, hy, hr, hr * 1.05, 0, 0, 7), { base: 0.95, shade: 0.78, light: LIGHT, depth: 40, blur: 30 });
    if (P.tuft) { const [tx, ty] = P.tuft; for (let k = 0; k < 3; k++) { const q = featherPts([tx + k * 50, ty + 90], [tx + k * 70 - 20, ty - 40 + k * 30], 50); plumage(g, (x) => smoothPath(x, q, true), { base: 0.93, shade: 0.8, light: LIGHT, depth: 10, blur: 8 }); } }
  }
  if (P.cup) { const [cx, cy, cr, crot] = P.cup; drawCup(g, { x: cx, y: cy, r: cr, rot: crot, open: 0.72, side: -1 }); }
  fan(g, P.wing, 5);
}

let cache = null;
function smear(ctx, draw, bx, by) {
  if (!cache.scr) { cache.scr = document.createElement("canvas"); cache.scr.width = 2206; cache.scr.height = 946; }
  const c = cache.scr, g = c.getContext("2d");
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, 2206, 946);
  draw(g);
  g.filter = `blur(${(Math.hypot(bx, by) * 0.08).toFixed(1)}px)`; g.drawImage(c, 0, 0); g.filter = "none";
  const N = 6;
  ctx.save();
  for (let i = 0; i < N; i++) { const u = i / (N - 1) - 0.5; ctx.globalAlpha = 0.3 + 0.35 * (1 - Math.abs(u) * 2); ctx.drawImage(c, bx * u, by * u); }
  ctx.restore();
}
export function drawTakeoff(ctx, f) {
  if (!PASS[f] && !FAN[f]) return;
  if (!cache) cache = {};
  if (PASS[f]) { const P = PASS[f]; smear(ctx, (g) => pass(g, P), P.blur[0], P.blur[1]); return; }
  const p = FAN[f];
  smear(ctx, (g) => fan(g, p), p[5], -p[5] * 0.6);
}
export function releaseTakeoff() { cache = null; }
