// s18 shot B owl (55.28–57.28): the extreme close-up — only the belly, the tail, the tips of the far wing and the
// legs are in frame. The body is one rigid drawing moved along the measured belly track (template match per source
// frame); the feet are re-posed every frame from a hand-read table (the source's stepping is loose, AI-animated
// drawing: a planted foot and a swinging, curled, often motion-blurred one), and on the measured frames the near
// wing sweeps down over the belly.
import { plumage, ink, setPPU, gv, LINE, flick, V, rimHatch, edgeFlicks } from "../../lib/owlInk.js";
import { smoothPath, sampleCurve } from "../../lib/paths.js";
import { rng } from "../../lib/rng.js";

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
  TAIL.forEach(([a, b, w], i) => feather(gt, a, b, w, light, 1810 + i, { outline: 2.6 }));
  tailL = { canvas: ct, ox: -PAD, oy: -PAD * 0.5 };
  // body: soft white, greying toward the underside
  const body = (x) => smoothPath(x, BODY, true);
  plumage(g, body, { base: 0.9, shade: 0.72, light, depth: 70, blur: 40 });
  // ragged underside: small feather tips pushed out past the outline, pointing down-left
  const low = sampleCurve(BODY.slice(2, 24), 6);
  for (let i = 2; i < low.length - 2; i += 2 + Math.floor(r() * 3)) {
    if (r() < 0.35) continue;
    const p = low[i], t = V.nrm(V.sub(low[i + 1], low[i - 1])), n = [-t[1], t[0]];          // n: outward (down)
    const out = V.nrm(V.add(n, [-0.7, 0.1])), L = 6 + r() * r() * 26, w = 8 + r() * 10;
    const q = [V.sub(V.sub(p, V.mul(t, w * 0.6)), V.mul(n, 3)), V.add(p, V.mul(out, L)), V.sub(V.add(p, V.mul(t, w * 0.6)), V.mul(n, 3))];
    g.fillStyle = gv(0.8); g.beginPath(); g.moveTo(...q[0]); g.quadraticCurveTo(p[0] + out[0] * L * 0.4, p[1] + out[1] * L * 0.4, ...q[1]); g.lineTo(...q[2]); g.closePath(); g.fill();
    if (r() < 0.6) ink(g, [V.sub(p, V.mul(n, 10)), V.add(p, V.mul(out, L * 0.8))], 1.4, gv(0.35, 0.55), { end: 0.1 });
  }
  // rows of feather marks following the belly curve, denser and darker toward the rim (the source's long hooked
  // strokes combing down-left)
  g.save(); g.beginPath(); body(g); g.clip();
  for (let row = 0; row < 5; row++) {
    const inset = 12 + row * 26;
    for (let i = 1; i < low.length - 1; i += 1) {
      if (r() > 0.42 - row * 0.06) continue;
      const p = low[i], t = V.nrm(V.sub(low[i + 1], low[i - 1])), n = [t[1], -t[0]];          // n: inward (up)
      const q = V.add(V.add(p, V.mul(n, inset + (r() - 0.5) * 16)), V.mul(t, (r() - 0.5) * 20));
      const d = V.nrm(V.add(V.mul(n, -0.55), V.mul(t, -0.8)));
      flick(g, q, d, 22 + r() * 30 - row * 1.5, 2.0 + r() * 1.2 - row * 0.1, gv(0.3 + 0.03 * row + 0.1 * r(), 0.55 - row * 0.03), 0.3);
    }
  }
  for (let i = 0; i < 70; i++) {
    const x = 380 + r() * 1250, y = -100 + r() * 460;
    const d = V.nrm([-0.75 + (r() - 0.5) * 0.5, 0.35 + (r() - 0.5) * 0.4]);
    flick(g, [x, y], d, 18 + r() * 26, 1.5 + r() * 1.2, gv(0.42 + 0.15 * r(), 0.4), 0.25);
  }
  g.restore();
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
const LEGW = 40;
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
function pants(g, h, seed) {
  // the feathered top of the leg: the belly's plumage bulges down round the leg in a soft tuft, its lower edge
  // broken into short grey feather tips (no hard outline)
  const r = rng(seed);
  const tuft = [[h[0] - 72, h[1] - 90], [h[0] + 70, h[1] - 90], [h[0] + 58, h[1] - 30], [h[0] + 30, h[1] + 4], [h[0] + 4, h[1] + 14], [h[0] - 26, h[1] + 4], [h[0] - 56, h[1] - 30]];
  plumage(g, (c) => smoothPath(c, tuft, true), { base: 0.86, shade: 0.72, light: [-0.7, -0.7], depth: 16, blur: 12 });
  // the tuft's lower rim: a ragged dark outline of feather tips converging on the leg
  ink(g, [tuft[6], [h[0] - 40, h[1] - 12], [h[0] - 14, h[1] + 12], [h[0] + 4, h[1] + 16]], 2.2, gv(0.22, 0.7), { end: 0.2 });
  ink(g, [tuft[2], [h[0] + 46, h[1] - 12], [h[0] + 26, h[1] + 8], [h[0] + 6, h[1] + 16]], 2.2, gv(0.22, 0.7), { end: 0.2 });
  for (let i = 0; i < 12; i++) {
    const u = i / 11, x = h[0] - 50 + u * 96, y = h[1] - 24 + Math.sin(Math.PI * u) * 34;
    ink(g, [[x + (r() - 0.5) * 6, y - 30 - r() * 14], [x * 0.7 + h[0] * 0.3, y]], 1.5 + r(), gv(0.3, 0.6), { end: 0.1 });
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
let scratch = null;
const SCR = 760;   // motion-blurred feet are drawn into a small scratch square round the ankle, then smeared
function drawFoot(ctx, f, seed) {
  if (!f.b) { footShape(ctx, f, seed); return; }
  if (!scratch) { scratch = document.createElement("canvas"); scratch.width = SCR; scratch.height = SCR; }
  const sg = scratch.getContext("2d");
  const ox = f.a[0] - SCR / 2, oy = f.a[1] - SCR / 2;
  sg.setTransform(1, 0, 0, 1, 0, 0); sg.clearRect(0, 0, SCR, SCR);
  sg.translate(-ox, -oy); footShape(sg, f, seed); sg.setTransform(1, 0, 0, 1, 0, 0);
  const N = 7;
  ctx.save();
  for (let i = 0; i < N; i++) {
    const u = i / (N - 1) - 0.5;
    ctx.globalAlpha = 0.22 + 0.2 * (1 - Math.abs(u) * 2);
    ctx.drawImage(scratch, ox + f.b[0] * u, oy + f.b[1] * u);
  }
  ctx.restore();
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
  1417: [G([420, 560], [470, 420], { b: [-40, 20] }), C([220, 500], [300, 440], 180, { b: [-80, 30], front: 1 })],
  1418: [G([380, 600], [470, 470], { b: [-40, 40] }), Hh([250, 560], [330, 480], 180, { b: [-60, 60], front: 1 })],
  1419: [Hh([420, 760], [560, 560], 220, { b: [-40, 80], front: 1 })],
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
const LEAP = { 1417: [1300, 240, 0.08, 1.0, 0], 1418: [1291, 278, 0.12, 1.0, 0], 1419: [1257, 355, 0.14, 1.15, 30], 1420: [1144, 464, -0.1, 1.55, 90] };
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
let bscr = null;
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
    ctx.save();
    for (let i = 0; i < 5; i++) { const u = i / 4 - 0.5; ctx.globalAlpha = i === 2 ? 1 : 0.35; ctx.drawImage(bscr, -blur * 0.8 * u, blur * 0.6 * u); }
    ctx.restore();
  }
  // leg tops (fluffy) over the belly edge, then the raised/front feet
  feet.forEach((ft, i) => { if (ft.h && !ft.b) pants(ctx, ft.h, 1950 + i); });
  feet.forEach((ft, i) => { if (ft.front) drawFoot(ctx, ft, 1900 + i * 10 + f); });
}
export function releaseOwlB() { bodyL = null; wingL = null; tailL = null; scratch = null; bscr = null; }
