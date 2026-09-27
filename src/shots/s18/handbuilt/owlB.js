// s18 shot B owl (55.28–57.28): the extreme close-up — only the belly, the tail, the tips of the far wing and the
// legs are in frame. The body is one rigid drawing moved along the measured belly track (template match per source
// frame); the feet are re-posed every frame from a hand-read table (the source's stepping is loose, AI-animated
// drawing: a planted foot and a swinging, curled, often motion-blurred one), and on the measured frames the near
// wing sweeps down over the belly.
import { plumage, ink, setPPU, gv, LINE, flick, V, rimHatch, edgeFlicks } from "../../../lib/owlInk.js";
import { smoothPath, sampleCurve } from "../../../lib/paths.js";
import { rng } from "../../../lib/rng.js";

// ---------------------------------------------------------------- body track: [frame, dx, dy] vs frame 1382
export const TRACK_B = [
  [1382, 0, 0], [1383, -39, 1], [1384, -64, -3], [1385, -73, -8], [1386, -74, -1], [1387, -76, 4], [1388, -76, 2], [1389, -84, -4],
  [1390, -103, 2], [1391, -120, 2], [1392, -132, -6], [1393, -140, -12], [1394, -141, -3], [1395, -146, 5], [1396, -156, 3],
  [1397, -164, -3], [1398, -182, 7], [1399, -194, 12], [1400, -199, 8], [1401, -199, 8], [1402, -212, -6], [1403, -206, 12],
  [1404, -212, 26], [1405, -212, 30], [1406, -232, 24], [1407, -248, 28], [1408, -312, 24], [1409, -392, 18], [1410, -453, 3],
  [1411, -496, -8], [1412, -540, -21], [1413, -572, -30], [1414, -593, -40], [1415, -585, -29], [1416, -589, -32],
];
export function bodyOffset(f) {
  if (f <= TRACK_B[0][0]) return [0, 0, 0];
  const last = TRACK_B[TRACK_B.length - 1];
  if (f <= last[0]) { const r = TRACK_B[f - TRACK_B[0][0]]; return [r[1], r[2], 0]; }
  return [last[1], last[2], 0];
}

// ---------------------------------------------------------------- geometry at the 1382 placement (frame px)
const BODY = [
  [360, -120], [430, 20], [500, 93], [550, 155], [600, 214], [650, 248], [700, 270], [750, 302], [800, 330], [850, 354], [900, 373],
  [950, 387], [1000, 394], [1060, 397], [1120, 396], [1180, 388], [1240, 378], [1300, 362], [1360, 342], [1410, 322], [1460, 296],
  [1510, 262], [1560, 222], [1600, 170], [1610, 100], [1590, 20], [1560, -120],
];
const TAIL = [
  // [base, tip, width]
  [[1470, 190], [1700, 196], 34], [[1500, 150], [1812, 168], 44], [[1520, 100], [1942, 92], 52], [[1540, 52], [1850, 44], 44],
];
const FAR_WING = [
  // hanging primaries of the far wing, top left: [root, tip, width]
  [[470, -40], [430, 140], 58], [[380, -50], [288, 204], 62], [[250, -60], [124, 258], 66], [[120, -60], [-20, 250], 60],
];
// the near wing swept down over the belly (drawn on the measured wing-down frames): long pointed feathers hanging
// from above the frame, their rounded tips forming the diagonal trailing edge (tips measured on 1388/1395/1405 and
// moved back by the body track to the 1382 placement)
const NEAR_TIPS = [[726, 345], [880, 300], [976, 234], [1066, 214], [1150, 178], [1232, 122], [1310, 72]];
const NEAR_WING = NEAR_TIPS.map((t, i) => [[t[0] + 250 - i * 6, t[1] - 440], t, 104 - i * 4]).reverse();

function featherPts(root, tip, w, bend = 0.06) {
  const d = V.sub(tip, root), L = V.len(d), u = V.nrm(d), n = V.perp(u);
  const P = (a, b) => V.add(V.add(root, V.mul(u, a * L)), V.mul(n, b * w + bend * L * Math.sin(Math.PI * a)));
  return [P(0, -0.5), P(0.35, -0.54), P(0.72, -0.44), P(0.93, -0.2), P(1, 0.02), P(0.9, 0.28), P(0.62, 0.48), P(0.3, 0.52), P(0, 0.5)];
}
function feather(g, root, tip, w, light, seed, { vane = true, outline = 3.2, base = 0.95 } = {}) {
  const r = rng(seed);
  const q = featherPts(root, tip, w);
  plumage(g, (c) => smoothPath(c, q, true), { base, shade: 0.78, light, depth: w * 0.3, blur: w * 0.2 });
  ink(g, [q[2], q[3], q[4], q[5], q[6], q[7]], outline, LINE, { end: 0.15, bias: 0.3 });
  ink(g, [q[0], q[1], q[2]], outline * 0.45, gv(0.3, 0.7), { end: 0.2 });
  if (vane) {
    const d = V.nrm(V.sub(tip, root));
    for (let k = 0; k < 4; k++) {
      const a = 0.25 + r() * 0.55, p = V.add(V.mix(root, tip, a), V.mul(V.perp(d), (r() - 0.5) * w * 0.5));
      ink(g, [p, V.add(p, V.mul(d, w * (0.6 + r())))], 1.6, gv(0.35, 0.55), { end: 0.1 });
    }
  }
}

// ---------------------------------------------------------------- the body layer (cached)
const PAD = 320;   // the layer extends past the frame so the track never shows an edge
let bodyL = null, wingL = null, tailL = null;
function buildBody() {
  const c = document.createElement("canvas"); c.width = 2206 + 2 * PAD; c.height = 946 + PAD;
  const g = c.getContext("2d");
  g.translate(PAD, PAD * 0.5);
  setPPU(1);
  const light = V.nrm([-0.7, -0.7]), r = rng(1801);
  // tail (behind the body)
  // tail: its own layer (it bobs about its base independently of the belly, see TAILTIP)
  const ct = document.createElement("canvas"); ct.width = c.width; ct.height = c.height;
  const gt = ct.getContext("2d"); gt.translate(PAD, PAD * 0.5);
  TAIL.forEach(([a, b, w], i) => {
    const q = featherPts(a, b, w * 1.45);
    plumage(gt, (c) => smoothPath(c, q, true), { base: 0.95, shade: 0.84, light, depth: w * 0.3, blur: w * 0.25 });
  });
  {
    const rt = rng(1815), B0 = [1500, 130];
    for (let i = 0; i < 46; i++) {
      const k = r() * 3.2, j = Math.min(3, Math.floor(k)), f = k - j;
      const tA = TAIL[j][1], tB = TAIL[Math.min(3, j + 1)][1];
      const tip = V.mix(tA, tB, f), L = 0.45 + 0.45 * rt();
      const p0 = V.mix(B0, tip, 0.2 + 0.3 * rt()), p1 = V.mix(B0, tip, Math.min(0.97, 0.2 + L));
      ink(gt, [p0, V.mix(p0, p1, 0.5), p1], 1 + rt() * 0.8, gv(0.45, 0.4), { end: 0.1 });
    }
    // feather separations at the tips (short grey notches), the lower edge darker
    TAIL.forEach(([a, b], i) => { const d = V.nrm(V.sub(b, a)); ink(gt, [V.sub(b, V.mul(d, 70)), V.sub(b, V.mul(d, 8))], 1.6, gv(0.3, 0.55), { end: 0.1 }); });
    const lowEdge = [[1470, 206], [1560, 214], [1640, 214], [1700, 206]];
    ink(gt, lowEdge, 2.4, gv(0.15, 0.6), { end: 0.2 });
  }
  tailL = { canvas: ct, ox: -PAD, oy: -PAD * 0.5 };
  // body: soft white, greying toward the underside
  const body = (x) => smoothPath(x, BODY, true);
  plumage(g, body, { base: 0.95, shade: 0.8, light, depth: 70, blur: 40 });
  const low = sampleCurve(BODY.slice(2, 24), 6);
  g.save(); g.beginPath(); body(g); g.clip();
  // loose rows of short straight dashes following the belly curve, sloping down-left (~30% density)
  for (let row = 0; row < 7; row++) {
    const inset = 18 + row * 34;
    for (let i = 1; i < low.length - 1; i += 1) {
      if (r() > 0.3 - row * 0.02) continue;
      const p = low[i], t = V.nrm(V.sub(low[i + 1], low[i - 1])), n = [t[1], -t[0]];          // n: inward (up)
      const q = V.add(V.add(p, V.mul(n, inset + (r() - 0.5) * 22)), V.mul(t, (r() - 0.5) * 30));
      const d = V.nrm(V.add(V.mul(n, -0.35), V.mul(t, -0.94)));
      flick(g, q, d, 18 + r() * 24, 1.8 + r() * 0.8, gv(0.45 + 0.1 * r(), 0.42), 0.04);
    }
  }
  // longer sweeping strokes just inside the lower edge
  for (let i = 2; i < low.length - 2; i += 2) {
    if (r() < 0.35) continue;
    const p = low[i], t = V.nrm(V.sub(low[i + 1], low[i - 1])), n = [t[1], -t[0]];
    const q = V.add(p, V.mul(n, 8 + r() * 30)), d = V.nrm(V.add(V.mul(n, -0.25), V.mul(t, -0.97)));
    flick(g, q, d, 40 + r() * 40, 1.6 + r() * 0.8, gv(0.4, 0.45), 0.06);
  }
  g.restore();
  // soft grey keyline and a hairy fringe: thin pale hairs crossing the edge, pointing down-left
  ink(g, low, 1.6, gv(0.35, 0.45), { end: 0.1 });
  for (let i = 1; i < low.length - 1; i++) {
    if (r() < 0.45) continue;
    const p = low[i], t = V.nrm(V.sub(low[i + 1], low[i - 1])), n = [-t[1], t[0]];          // n: outward (down)
    const d = V.nrm(V.add(V.mul(n, 0.55), V.mul(t, -0.85))), L = 8 + r() * 10;
    flick(g, V.sub(p, V.mul(d, L * 0.6)), d, L * 1.6, 1.4 + r(), gv(0.88, 0.9), 0.08);
  }
  // far wing primaries hanging at the top left (in front of the body)
  FAR_WING.forEach(([a, b, w], i) => feather(g, a, b, w, light, 1830 + i, { outline: 3.4 }));
  bodyL = { canvas: c, ox: -PAD, oy: -PAD * 0.5 };
  // near wing sweeping down (separate layer)
  const cw = document.createElement("canvas"); cw.width = c.width; cw.height = c.height;
  const gw = cw.getContext("2d"); gw.translate(PAD, PAD * 0.5);
  NEAR_WING.forEach(([a, b, w], i) => feather(gw, a, b, w, light, 1840 + i, { outline: 4.2, base: 0.97 }));
  wingL = { canvas: cw, ox: -PAD, oy: -PAD * 0.5 };
}
// frames where the near wing is down over the belly (measured: dark feather outlines inside the belly)
const WING_DOWN = new Set([1384, 1388, 1389, 1394, 1395, 1396, 1400, 1401, 1404, 1405, 1406, 1415, 1416]);

// ---------------------------------------------------------------- feet (frame px, big scale)
// f: { t: "P" plant | "C" curled/raised | "H" hanging | "G" gripping the edge, a: ankle, h: hip, L: reach, b: blur [dx,dy], front }
const LEGW = 58;
function toe(g, pts, w0, w1, seed) {
  const q = sampleCurve(pts, 8);
  const r = rng(seed);
  g.lineCap = "round"; g.lineJoin = "round";
  // keyline, then the pale toe
  const n = q.length;
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < n - 1; i++) {
      const u = i / (n - 1), w = w0 + (w1 - w0) * u;
      g.strokeStyle = pass ? gv(0.88 - 0.06 * u) : LINE; g.lineWidth = pass ? w : w + 6;
      g.beginPath(); g.moveTo(q[i][0], q[i][1]); g.lineTo(q[i + 1][0], q[i + 1][1]); g.stroke();
    }
  }
  // scale rings across the toe
  for (let i = 4; i < n - 3; i += 5) {
    const t = V.nrm(V.sub(q[i + 1], q[i - 1])), nn = V.perp(t), w = (w0 + (w1 - w0) * i / (n - 1)) * 0.46;
    ink(g, [V.add(q[i], V.mul(nn, w)), V.add(V.add(q[i], V.mul(t, 3)), V.mul(nn, 0)), V.sub(q[i], V.mul(nn, w))], 2.4, gv(0.18, 0.85), { end: 0.3 });
  }
  // claw: dark hook continuing the toe, curling toward the side `hook`
  const e = q[n - 1], t = V.nrm(V.sub(e, q[n - 3])), nn = V.perp(t);
  const side = t[0] <= 0 ? -1 : 1;           // curl downward whichever way the toe points
  const hk = V.mul(nn, side * -1);
  const tip = V.add(V.add(e, V.mul(t, 40)), V.mul(hk, -26 * (t[1] > 0.8 ? 0 : 1)));
  const tip2 = V.add(V.add(e, V.mul(t, 34)), V.mul([0, 1], 30));
  const T = V.len(V.sub(tip2, e)) > 0 ? tip2 : tip;
  const claw = [V.add(e, V.mul(nn, w1 * 0.45)), V.add(V.mix(e, T, 0.5), V.mul(nn, w1 * 0.25)), T, V.add(V.mix(e, T, 0.45), V.mul(nn, -w1 * 0.25)), V.add(e, V.mul(nn, -w1 * 0.45))];
  g.fillStyle = "#101010"; g.beginPath(); smoothPath(g, claw, true); g.fill();
  ink(g, [V.mix(e, T, 0.15), V.mix(e, T, 0.6)], 1.8, gv(0.7, 0.6), { end: 0.2 });
}
function leg(g, h, a) {
  const d = V.nrm(V.sub(a, h)), n = V.perp(d);
  const q = [V.add(h, V.mul(n, LEGW * 0.55)), V.add(a, V.mul(n, LEGW * 0.45)), V.sub(a, V.mul(n, LEGW * 0.45)), V.sub(h, V.mul(n, LEGW * 0.55))];
  g.fillStyle = gv(0.86); g.beginPath(); g.moveTo(...q[0]); for (const p of q) g.lineTo(...p); g.closePath(); g.fill();
  ink(g, [q[0], q[1]], 3.4, LINE, { end: 0.6 }); ink(g, [q[3], q[2]], 3.4, LINE, { end: 0.6 });
  const L = V.len(V.sub(a, h));
  for (let s = 14; s < L - 8; s += 13) { const p = V.add(h, V.mul(d, s)); ink(g, [V.add(p, V.mul(n, LEGW * 0.42)), V.add(V.add(p, V.mul(d, 4)), V.mul(n, -LEGW * 0.05))], 2.6, gv(0.15, 0.85), { end: 0.3 }); }
}
// the belly's lower edge (frame y) at frame x for source frame f (the BODY outline moved by the belly track)
function bellyY(x, f) {
  const [dx, dy] = bodyOffset(f), L = BODY.slice(2, 24);
  for (let i = 0; i < L.length - 1; i++) {
    const [x0, y0] = L[i], [x1, y1] = L[i + 1];
    if (x - dx >= x0 && x - dx <= x1) return y0 + (y1 - y0) * ((x - dx - x0) / (x1 - x0)) + dy;
  }
  return null;
}
function pants(g, h, seed, a = null, top = null) {
  // the thigh tuft: a big fluffy mass hanging from the belly and merging into it (no boundary where they meet),
  // long soft strokes combing down to a ragged U-shaped lower rim that covers the top quarter of the tarsus
  const r = rng(seed), [x, y0] = h;
  // it overlaps the belly edge by only ~15-20 px (below that the scaly leg shows)
  const y = a ? y0 + Math.min(16, (a[1] - y0) * 0.12) : y0;
  const cx = a ? h[0] + (a[0] - h[0]) * 0.12 : x;
  // the tuft reaches up into the belly: its top 40 px inside the belly edge above the hip
  const T = Math.max(y0 - 100, Math.min(y0 - 60, (top ?? y0 - 20) - 40));
  const q = [[x - 95, T + 15], [x - 20, T], [x + 60, T + 10], [x + 95, (T + y0) / 2], [cx + 58, y - 12], [cx + 30, y + 12], [cx - 2, y + 18], [cx - 34, y + 10], [cx - 62, y - 14], [x - 90, (T + y0) / 2 + 20]];
  // filled with a vertical fade so its top dissolves into the belly (no visible rim where they meet)
  g.save(); g.filter = "blur(5px)";
  const grd = g.createLinearGradient(0, T, 0, T + 55);
  grd.addColorStop(0, gv(0.88, 0)); grd.addColorStop(1, gv(0.86, 1));
  g.fillStyle = grd; g.beginPath(); smoothPath(g, q, true); g.fill();
  g.restore();
  // soft shading low in the tuft
  g.save(); g.beginPath(); smoothPath(g, q, true); g.clip();
  g.filter = "blur(12px)"; g.fillStyle = gv(0.62, 0.6); g.beginPath(); g.ellipse(cx + 10, y + 2, 70, 30, 0, 0, 7); g.fill(); g.filter = "none";
  g.restore();
  for (let i = 0; i < 22; i++) {
    const u = r(), sx = x - 70 + u * 140, sy = Math.max(T + 30, y0 - 45) - r() * 25;
    const ex = cx - 55 + u * 110 + (r() - 0.5) * 12, ey = y + Math.sin(Math.PI * u) * 14 - 4 - r() * 10;
    ink(g, [[sx, sy], [(sx + ex) / 2 + (u - 0.5) * 20, (sy + ey) / 2], [ex, ey]], 1.2 + r() * 1.2, gv(0.3 + 0.15 * r(), 0.42), { end: 0.1 });
  }
  // hairy lower rim: pale hairs hanging over the leg, a few darker ones
  for (let i = 0; i < 18; i++) {
    const u = i / 17, px = cx - 60 + u * 120, py = y - 16 + Math.sin(Math.PI * u) * 30;
    flick(g, [px, py - 12], V.nrm([(cx - px) * 0.02, 1]), 10 + r() * 8, 1.3, i % 3 ? gv(0.8, 0.85) : gv(0.35, 0.5), 0.1);
  }
}
function footShape(g, f, seed) {
  const { t, a, h } = f, L = f.L ?? 190;
  if (h) leg(g, h, a);
  const toes = [];
  if (t === "P") {
    // three long front toes fanned out to the left and down onto the key, the back toe pointing right
    toes.push([a, [a[0] - L * 0.5, a[1] + 8], [a[0] - L * 1.05, a[1] + 34]]);
    toes.push([a, [a[0] - L * 0.42, a[1] + 34], [a[0] - L * 0.82, a[1] + 78]]);
    toes.push([a, [a[0] - L * 0.2, a[1] + 44], [a[0] - L * 0.42, a[1] + 96]]);
    toes.push([a, [a[0] + L * 0.22, a[1] + 22], [a[0] + L * 0.42, a[1] + 46]]);
  } else if (t === "C") {
    // curled: the toes reach forward-down and curl back under like a fist
    for (let k = 0; k < 3; k++) {
      const o = k * 22;
      toes.push([a, [a[0] - L * 0.45 + o * 0.3, a[1] + 10 + o], [a[0] - L * 0.62 + o * 0.5, a[1] + L * 0.42 + o * 0.6], [a[0] - L * 0.42 + o * 0.6, a[1] + L * 0.66 + o * 0.4]]);
    }
    toes.push([a, [a[0] + L * 0.18, a[1] + 20], [a[0] + L * 0.28, a[1] + L * 0.3]]);
  } else if (t === "H") {
    // hanging: toes point down, loosely curled
    for (let k = 0; k < 3; k++) { const o = (k - 1) * 30; toes.push([a, [a[0] + o * 0.6, a[1] + L * 0.5], [a[0] + o - 20, a[1] + L * 0.85]]); }
    toes.push([a, [a[0] + 36, a[1] + 16], [a[0] + 60, a[1] + 50]]);
  } else if (t === "G") {
    // gripping the corner of the key bed: toes go over the edge and down
    for (let k = 0; k < 3; k++) { const o = k * 26; toes.push([a, [a[0] - 60 + o * 0.4, a[1] + 34 + o * 0.3], [a[0] - 84 + o * 0.5, a[1] + 110 + o * 0.5], [a[0] - 70 + o * 0.6, a[1] + 150 + o * 0.4]]); }
    toes.push([a, [a[0] + 70, a[1] - 18], [a[0] + 132, a[1] - 26]]);
  }
  // back toe first, then the far front toes, the nearest last
  const order = toes.length === 4 ? [3, 0, 1, 2] : toes.map((_, i) => i);
  order.forEach((i, k) => toe(g, toes[i], i === 3 ? 34 : 40, i === 3 ? 24 : 26, seed + k));
  // ankle knob
  g.fillStyle = gv(0.88); g.beginPath(); g.arc(a[0], a[1], 24, 0, 7); g.fill();
  ink(g, [[a[0] - 24, a[1] - 4], [a[0], a[1] + 22], [a[0] + 24, a[1] - 4]], 3, LINE, { end: 0.4 });
}
let scratch = null, scratch2 = null;
const SCR = 760;   // motion-blurred feet are drawn into a small scratch square round the ankle, then smeared
function drawFoot(ctx, f, seed) {
  if (!f.b) { footShape(ctx, f, seed); return; }
  if (!scratch) { scratch = document.createElement("canvas"); scratch.width = SCR; scratch.height = SCR; scratch2 = document.createElement("canvas"); scratch2.width = SCR; scratch2.height = SCR; }
  const sg = scratch.getContext("2d"), s2 = scratch2.getContext("2d");
  const ox = f.a[0] - SCR / 2, oy = f.a[1] - SCR / 2;
  sg.setTransform(1, 0, 0, 1, 0, 0); sg.clearRect(0, 0, SCR, SCR);
  sg.translate(-ox, -oy); footShape(sg, f, seed); sg.setTransform(1, 0, 0, 1, 0, 0);
  // average N copies no more than ~2.5 px apart along the swing ("lighter" at 1/N = an exact mean)
  const L = Math.hypot(f.b[0], f.b[1]), N = Math.max(8, Math.min(32, Math.ceil(L / 2.5)));
  s2.setTransform(1, 0, 0, 1, 0, 0); s2.globalCompositeOperation = "source-over"; s2.globalAlpha = 1; s2.clearRect(0, 0, SCR, SCR);
  s2.globalCompositeOperation = "lighter"; s2.globalAlpha = 1 / N;
  for (let i = 0; i < N; i++) { const u = i / (N - 1) - 0.5; s2.drawImage(scratch, f.b[0] * u, f.b[1] * u); }
  s2.globalCompositeOperation = "source-over"; s2.globalAlpha = 1;
  ctx.save(); ctx.filter = `blur(${(2 + L * 0.03).toFixed(1)}px)`; ctx.drawImage(scratch2, ox, oy); ctx.restore();
}

// ---------------------------------------------------------------- per-frame feet (read off the source, frame px)
const P = (a, h, L, x = {}) => ({ t: "P", a, h, L: Math.min(170, Math.max(130, L * 0.75)), ...x });
const C = (a, h, L, x = {}) => ({ t: "C", a, h, L, ...x });
const Hh = (a, h, L, x = {}) => ({ t: "H", a, h, L, ...x });
const G = (a, h, x = {}) => ({ t: "G", a, h, L: 150, ...x });
export const FEET_B = {
  1382: [C([930, 440], [960, 380], 200, { front: 1 }), P([1335, 540], [1335, 390], 190)],
  1383: [P([1088, 525], [1150, 400], 190), C([1480, 380], [1460, 330], 120)],
  1384: [P([1020, 492], [1060, 405], 190), C([1310, 430], [1300, 380], 150, { b: [70, 0], front: 1 })],
  1385: [C([1100, 450], [1140, 395], 160, { b: [-90, 0], front: 1 }), P([1335, 510], [1350, 410], 170)],
  1386: [P([965, 505], [1015, 400], 240), Hh([1370, 430], [1330, 380], 160)],
  1387: [P([1110, 530], [1130, 405], 150, { b: [-40, 0] })],
  1388: [C([820, 430], [900, 385], 200, { b: [-70, 0], front: 1 }), P([1265, 540], [1270, 405], 200)],
  1389: [P([990, 480], [1040, 395], 400), P([1460, 540], [1480, 405], 100)],
  1390: [P([900, 510], [930, 400], 190), Hh([1370, 430], [1340, 385], 170)],
  1391: [P([1080, 510], [1130, 415], 220), C([1230, 460], [1230, 400], 150, { b: [60, 0], front: 1 })],
  1392: [C([900, 460], [960, 405], 150, { b: [-70, 0], front: 1 }), P([1200, 540], [1220, 405], 200)],
  1393: [C([970, 440], [1010, 395], 290, { front: 1 }), P([1310, 540], [1330, 415], 120)],
  1394: [P([910, 520], [950, 405], 220), C([1260, 430], [1250, 385], 140, { b: [70, 0], front: 1 })],
  1395: [P([1050, 540], [1060, 395], 210), C([970, 460], [1000, 400], 110, { b: [-60, 0], front: 1 })],
  1396: [C([780, 460], [850, 405], 260, { front: 1 }), P([1240, 540], [1245, 390], 230)],
  1397: [C([720, 470], [800, 405], 260, { front: 1 }), P([1230, 530], [1240, 390], 200)],
  1398: [P([810, 540], [830, 405], 220), C([1330, 410], [1300, 360], 200, { front: 1 })],
  1399: [P([960, 540], [1010, 415], 200), C([1330, 410], [1300, 365], 190, { front: 1 })],
  1400: [P([1120, 540], [1150, 415], 220), C([1300, 430], [1300, 385], 130, { b: [50, 0], front: 1 })],
  1402: [C([820, 460], [880, 405], 240, { b: [-70, 0], front: 1 }), P([1185, 540], [1190, 405], 190)],
  1403: [P([800, 520], [870, 395], 270), Hh([1320, 450], [1310, 395], 180)],
  1404: [P([880, 540], [900, 405], 220), C([1100, 450], [1120, 405], 120, { b: [-70, 0], front: 1 })],
  1405: [C([770, 450], [820, 405], 100, { b: [-70, 0], front: 1 }), P([1080, 540], [1100, 405], 270)],
  1406: [C([560, 450], [640, 395], 230, { front: 1 }), P([1170, 560], [1180, 415], 220)],
  1407: [C([520, 470], [600, 395], 240, { front: 1 }), P([1230, 560], [1250, 415], 190)],
  1408: [P([627, 541], [700, 435], 240), C([1200, 360], [1150, 330], 170, { front: 1 })],
  1409: [P([610, 540], [660, 425], 230), C([1120, 470], [1100, 390], 180, { b: [-80, 0], front: 1 })],
  1410: [P([600, 540], [650, 425], 230), Hh([900, 490], [900, 405], 200, { b: [-70, 0], front: 1 })],
  1411: [P([480, 540], [500, 390], 140), Hh([730, 490], [740, 395], 200, { b: [-50, 0], front: 1 })],
  1412: [G([470, 545], [560, 405], { b: [-30, 0] }), Hh([580, 470], [620, 390], 180, { b: [-60, 0], front: 1 })],
  1413: [G([450, 560], [520, 405]), C([400, 380], [470, 360], 220, { front: 1 })],
  1414: [G([430, 565], [460, 405]), C([340, 350], [420, 340], 220, { front: 1 })],
  1415: [G([430, 565], [460, 405]), C([340, 350], [420, 340], 220, { front: 1 })],
  1416: [G([430, 565], [460, 405]), C([340, 350], [420, 340], 220, { front: 1 })],
  1417: [G([430, 565], [460, 405]), C([340, 350], [420, 340], 220, { front: 1 })],
  1418: [G([430, 565], [465, 410]), C([330, 360], [415, 345], 220, { front: 1 })],
  1419: [G([400, 650], [455, 470], { b: [-14, 28], front: 1 })],
  1420: [Hh([420, 800], [420, 700], 180, { b: [-20, 90], front: 1 })],
};
FEET_B[1401] = FEET_B[1400];

// ---------------------------------------------------------------- pressed keys per frame (measured: the dark line a
// pressed key shows across its top, y ~745)
export const PRESSED_B = {
  1382: [6], 1383: [3], 1384: [4], 1385: [6], 1386: [3, 7], 1387: [4], 1388: [6], 1389: [6], 1390: [2], 1391: [4], 1392: [5],
  1393: [2, 6], 1394: [3], 1395: [2, 4], 1396: [5], 1397: [6], 1398: [2, 3], 1399: [], 1400: [4], 1401: [4], 1402: [5],
  1403: [2, 5], 1404: [], 1405: [], 1406: [2, 4], 1407: [4], 1408: [0], 1409: [0], 1410: [0], 1411: [0], 1412: [0], 1413: [0],
  1414: [0], 1415: [0], 1416: [0], 1417: [0], 1418: [0], 1419: [0],
};

// ---------------------------------------------------------------- draw the owl for frame f (before the take-off)
// take-off (56.72–56.80): the body leaps up toward the camera — fitted on the tail tip, rotation/scale by eye
// [frame, tail tip x, y, rot (rad), scale, blur px]
const LEAP = { 1417: [1300, 185, 0.08, 1.0, 0], 1418: [1291, 245, 0.12, 1.0, 0], 1419: [1257, 305, 0.14, 1.15, 30], 1420: [1144, 464, -0.1, 1.55, 90] };
// tail tip per frame (rotation-aware template match of the 1382 tail; 1383-85 and 1413-16 read by eye). The tail is
// rotated/stretched about its base (TAIL_BASE, moved with the belly) so its tip lands here.
const TAILTIP = {
  1382: [1942, 92], 1383: [1906, 50], 1384: [1875, 48], 1385: [1867, 50], 1386: [1864, 79], 1387: [1855, 131], 1388: [1845, 156],
  1389: [1836, 161], 1390: [1831, 159], 1391: [1825, 131], 1392: [1817, 122], 1393: [1809, 121], 1394: [1795, 127], 1395: [1783, 130],
  1396: [1771, 134], 1397: [1764, 138], 1398: [1760, 160], 1399: [1758, 185], 1400: [1757, 162], 1401: [1757, 162], 1402: [1742, 124],
  1403: [1728, 124], 1404: [1713, 166], 1405: [1700, 195], 1406: [1694, 189], 1407: [1678, 191], 1408: [1630, 199], 1409: [1561, 175],
  1410: [1499, 143], 1411: [1444, 139], 1412: [1398, 161], 1413: [1370, 175], 1414: [1340, 188], 1415: [1310, 200], 1416: [1312, 212],
};
const TAIL_BASE = [1500, 150], TIP0 = [1942, 92];
function tailXf(ctx, f) {
  const tt = TAILTIP[f];
  if (!tt) { bodyXf(ctx, f); return; }
  const [dx, dy] = bodyOffset(f);
  const b = [TAIL_BASE[0] + dx, TAIL_BASE[1] + dy];
  const a0 = Math.atan2(TIP0[1] - TAIL_BASE[1], TIP0[0] - TAIL_BASE[0]), a1 = Math.atan2(tt[1] - b[1], tt[0] - b[0]);
  const k = Math.hypot(tt[0] - b[0], tt[1] - b[1]) / Math.hypot(TIP0[0] - TAIL_BASE[0], TIP0[1] - TAIL_BASE[1]);
  ctx.translate(b[0], b[1]); ctx.rotate(a1 - a0); ctx.scale(k, 1); ctx.translate(-TAIL_BASE[0], -TAIL_BASE[1]);
}
const T0 = [1942, 92];
function bodyXf(ctx, f) {
  const lp = LEAP[f];
  if (lp) {
    const [tx, ty, a, s] = lp;
    ctx.translate(tx, ty); ctx.rotate(a); ctx.scale(s, s); ctx.translate(-T0[0], -T0[1]);
    return;
  }
  const [dx, dy, rot] = bodyOffset(f);
  ctx.translate(dx, dy);
  if (rot) { ctx.translate(900, 300); ctx.rotate(rot); ctx.translate(-900, -300); }
}
let bscr = null, bscr2 = null;
export function drawOwlB(ctx, f) {
  if (!bodyL) buildBody();
  const feet = FEET_B[f] || [];
  setPPU(1);
  // feet behind the belly: legs and back feet
  feet.forEach((ft, i) => { if (!ft.front) drawFoot(ctx, ft, 1900 + i * 10 + f); });
  const blur = LEAP[f] ? LEAP[f][4] : 0;
  if (!blur) {
    ctx.save(); tailXf(ctx, f); ctx.drawImage(tailL.canvas, tailL.ox, tailL.oy); ctx.restore();
    ctx.save(); bodyXf(ctx, f);
    ctx.drawImage(bodyL.canvas, bodyL.ox, bodyL.oy);
    if (WING_DOWN.has(f)) ctx.drawImage(wingL.canvas, wingL.ox, wingL.oy);
    ctx.restore();
  } else {
    // leaping: smeared along its path (the source frames are heavily motion-blurred)
    if (!bscr) { bscr = document.createElement("canvas"); bscr.width = 2206; bscr.height = 946; }
    const g = bscr.getContext("2d");
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, 2206, 946);
    g.save(); bodyXf(g, f); g.drawImage(tailL.canvas, tailL.ox, tailL.oy); g.drawImage(bodyL.canvas, bodyL.ox, bodyL.oy); g.restore();
    g.filter = `blur(${(blur * 0.12).toFixed(1)}px)`; g.drawImage(bscr, 0, 0); g.filter = "none";
    // one smooth smear: the mean of close copies along the travel ("lighter" at 1/N)
    if (!bscr2) { bscr2 = document.createElement("canvas"); bscr2.width = 2206; bscr2.height = 946; }
    const g2 = bscr2.getContext("2d"), N = 12;
    g2.setTransform(1, 0, 0, 1, 0, 0); g2.globalCompositeOperation = "source-over"; g2.globalAlpha = 1; g2.clearRect(0, 0, 2206, 946);
    g2.globalCompositeOperation = "lighter"; g2.globalAlpha = 1 / N;
    for (let i = 0; i < N; i++) { const u = i / (N - 1) - 0.5; g2.drawImage(bscr, -blur * 0.8 * u, blur * 0.6 * u); }
    g2.globalCompositeOperation = "source-over"; g2.globalAlpha = 1;
    ctx.drawImage(bscr2, 0, 0);
  }
  // leg tops (fluffy) over the belly edge, then the raised/front feet
  feet.forEach((ft, i) => { if (ft.h && !ft.b) pants(ctx, ft.h, 1950 + i, ft.a, LEAP[f] ? null : bellyY(ft.h[0], f)); });
  feet.forEach((ft, i) => { if (ft.front) drawFoot(ctx, ft, 1900 + i * 10 + f); });
}
export function releaseOwlB() { bodyL = null; wingL = null; tailL = null; scratch = null; scratch2 = null; bscr = null; bscr2 = null; }
