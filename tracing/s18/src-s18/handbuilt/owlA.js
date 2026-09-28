// s18 shot A owl: the chubby side-on owl that lands on the synth and scurries left along the keys.
// The source draws it as one rigid figure (template-tracked head and body agree within 2 px) carried along a path,
// with a 4-frame wing cycle (level, up, level, down) on the source's own 24-fps drawings and a stepping stride.
// Drawn here in FRAME PX at the frame-1356 placement (PATH_A offsets move it): one pear-shaped bird whose head
// flows into the body (silhouette measured from background-difference masks of the level and down-wing frames,
// registered on PATH_A), soft pencil plumage (no screentone), big eyes with dark irises and catchlights, a small
// open beak, dark metal headphone cups with a silver shell and a brushed plate, a single sticking plaster, a crest
// of spiky feathers behind the cup, a fanned tail, short feathered legs in a stride.
// Layering: far wing tips, far cup, crest, back foot, tail, body+head, front foot, leg tufts, near wing, face,
// plaster, band + near cup. Each state is built once and cached.
import { plumage, ink, flick, softShade, rimHatch, edgeFlicks, fringe, gv, LINE, V, setPPU } from "../../../lib/owlInk.js";
import { smoothPath, sampleCurve } from "../../../lib/paths.js";
import { taper } from "../../../lib/ink.js";
import { rng, clamp } from "../../../lib/rng.js";

export const ROOT_A = [705, 465];   // frame position of the body middle at 54.24 (frame 1356)

// Head/body template offsets vs frame 1356, per source frame (template match on the source, see fidelity).
// [frame, dx, dy]
export const PATH_A = [
  [1331, 1224, -58], [1332, 1097, -43], [1333, 985, -39], [1334, 864, -32], [1335, 755, -21], [1336, 647, -7], [1337, 554, -4],
  [1338, 470, 0], [1339, 400, 4], [1340, 331, 4], [1341, 283, 1], [1342, 241, 4], [1343, 205, 2], [1344, 178, 5], [1345, 155, 2],
  [1346, 137, 4], [1347, 118, 0], [1348, 103, 4], [1349, 87, 1], [1350, 72, 2], [1351, 72, 2], [1352, 56, 1], [1353, 42, 4],
  [1354, 28, 1], [1355, 14, 2], [1356, 0, 0], [1357, -12, 4], [1358, -25, 0], [1359, -37, 3], [1360, -48, 1], [1361, -56, 4],
  [1362, -60, 0], [1363, -58, 4], [1364, -52, 3], [1365, -45, 3], [1366, -35, 1], [1367, -20, 4], [1368, -9, 2], [1369, -1, 2],
  [1370, 10, 0], [1371, 22, 3], [1372, 33, 2], [1373, 40, 2], [1374, 49, 0], [1375, 57, 4], [1376, 57, 4], [1377, 63, 3],
  [1378, 65, 0], [1379, 69, 2], [1380, 72, 4], [1381, 71, 1],
];

const LIGHT = V.nrm([-0.75, -0.66]);

// ---------------------------------------------------------------- measured geometry (frame px, 1356 placement)
// head + body in one outline (clockwise from the crown); the back line behind the cup from the down-wing frames
// (the crown sits 25-35 px under the headphone band, with black showing between them: column profiles of the
// registered mean of the level frames put the crown at y 231-240 for x 540-650, falling to 307 at x 480)
const BODY = [
  [525, 257], [541, 240], [562, 235], [588, 234], [612, 231], [640, 230], [666, 235], [694, 244], [725, 250], [758, 262], [782, 292],
  [796, 324], [844, 347], [880, 380], [906, 400], [914, 422], [910, 446], [902, 466], [889, 482], [866, 502], [844, 521], [810, 537],
  [772, 543], [730, 543], [684, 535], [640, 520], [612, 504], [578, 472], [552, 459], [522, 441], [500, 423], [490, 403], [484, 380],
  [481, 352], [482, 324], [485, 306], [496, 289], [510, 274],
];
// in flight the legs are tucked and the belly is carried ~38 px higher (1331-1337)
const BODY_FLY = BODY.map(([x, y]) => [x, y - 38 * clamp((y - 462) / 80, 0, 1) * clamp((900 - x) / 60, 0, 1) * clamp((x - 560) / 60, 0, 1)]);
const TAIL = [   // [root, tip, width]: a fan of five, the lowest drawn first
  [[898, 462], [962, 461], 13], [[902, 452], [976, 451], 15], [[904, 440], [1000, 440], 17], [[903, 428], [1004, 428], 16], [[900, 417], [982, 413], 14],
];
const CREST = [   // spiky feathers behind the head and the cup: [base, tip, width]
  [[712, 238], [744, 212], 13], [[724, 246], [757, 208], 16], [[742, 264], [795, 250], 16], [[752, 282], [790, 268], 11], [[762, 300], [798, 287], 14],
];
const EYES = [
  // measured on the mean of the registered level frames
  { x: 507, y: 364, rx: 21, ry: 27, ix: 510, iy: 365, ir: 9.8, hx: 512.5, hy: 359, hr: 3.1, far: true },
  // near eye re-measured on the single frame 1356 (the registered mean blurs its rim): a wide oval
  { x: 605, y: 352, rx: 39, ry: 31, ix: 612, iy: 350, ir: 15.5, hx: 607, hy: 342, hr: 4.6, far: false },
];
const BAND = [[484, 308], [491, 284], [504, 255], [528, 227], [566, 207], [612, 198], [652, 203], [676, 216], [688, 236]];
const YOKE = [[676, 222], [683, 244], [690, 268]];
const CUP = { cx: 698, cy: 320, crx: 51, cry: 55, sx: 711, sy: 325, srx: 36, sry: 43, px: 716, py: 326, prx: 25, pry: 34 };
const FARCUP = { x: 476, y: 368, rx: 14, ry: 33 };
const PLASTER = { x: 614, y: 259, L: 68, h: 22, rot: 0.28 };

// ---------------------------------------------------------------- wings (measured feather tips, frame px)
const WING = {
  level: {
    lead: [[728, 372], [800, 340], [880, 300], [977, 265]],
    feathers: [[[770, 392], [880, 402], 24], [[790, 377], [917, 381], 26], [[815, 362], [952, 347], 28], [[830, 347], [980, 305], 28], [[842, 332], [977, 265], 26]],
    coverts: { from: 0.12, to: 0.78, n: 7, len: 42, rows: 2 },
  },
  up: {
    lead: [[782, 342], [798, 290], [832, 222], [872, 150], [906, 92]],
    feathers: [[[828, 362], [880, 352], 20], [[834, 346], [906, 306], 24], [[836, 328], [936, 252], 26], [[834, 306], [952, 196], 28], [[828, 282], [946, 134], 28], [[818, 256], [906, 92], 26]],
    coverts: { from: 0.1, to: 0.75, n: 6, len: 46, rows: 2 },
  },
  down: {
    lead: [[745, 362], [700, 392], [660, 420], [608, 450], [520, 494], [398, 531]],
    feathers: [[[700, 404], [640, 560], 26], [[668, 424], [578, 556], 28], [[630, 442], [518, 511], 28], [[590, 460], [458, 521], 26], [[545, 478], [398, 531], 24]],
    coverts: { from: 0.05, to: 0.7, n: 7, len: 40, rows: 2 },
  },
  far: {
    // the far wing's primary tips standing up behind the crown on the upstroke (measured on 1355)
    lead: [[548, 262], [578, 258], [616, 262]],
    feathers: [[[556, 262], [549, 150], 15], [[572, 262], [562, 116], 18], [[592, 262], [585, 144], 17], [[612, 262], [606, 174], 12]],
    coverts: null,
  },
};

const FW = 1.45;
function featherPts(root, tip, w, bend = 0.06, point = 0) {
  const d = V.sub(tip, root), L = V.len(d), u = V.nrm(d), n = V.perp(u);
  const P = (a, b) => V.add(V.add(root, V.mul(u, a * L)), V.mul(n, b * w + bend * L * Math.sin(Math.PI * a)));
  if (point) return [P(0, -0.5), P(0.4, -0.52), P(0.75, -0.34), P(1, 0), P(0.75, 0.34), P(0.4, 0.52), P(0, 0.5)];
  return [P(0, -0.5), P(0.35, -0.56), P(0.72, -0.44), P(0.93, -0.2), P(1, 0.04), P(0.9, 0.3), P(0.62, 0.5), P(0.3, 0.52), P(0, 0.5)];
}
const blob = (q) => (c) => smoothPath(c, q, true);

function paintWing(g, W, seed) {
  const r = rng(seed);
  W.feathers.forEach(([root, tip, w0]) => {
    const w = w0 * FW, q = featherPts(root, tip, w, 0.05);
    plumage(g, blob(q), { base: 0.97, shade: 0.86, light: LIGHT, depth: w * 0.4, blur: w * 0.2 });
    ink(g, [q[3], q[4], q[5], q[6], q[7]], 1.5, gv(0.08, 0.85), { end: 0.15, bias: 0.25 });
    ink(g, [q[1], q[2], q[3]], 0.8, gv(0.35, 0.5), { end: 0.2 });
    const m0 = V.mix(root, tip, 0.2), m1 = V.mix(root, tip, 0.85);
    ink(g, [m0, V.mix(m0, m1, 0.5), m1], 0.6, gv(0.5, 0.35), { end: 0.1 });
    const d = V.nrm(V.sub(tip, root));
    for (let k = 0; k < 4; k++) { const a = 0.3 + r() * 0.55, p = V.mix(root, tip, a); flick(g, V.add(p, V.mul(V.perp(d), (r() - 0.35) * w * 0.4)), V.rot(d, 0.3), w * 0.5, 0.7, gv(0.45, 0.35), 0.1); }
  });
  const lead = sampleCurve(W.lead, 8);
  const tipDir = V.nrm(V.sub(W.feathers[0][1], W.feathers[0][0]));
  if (W.coverts) {
    const band = [...lead];
    for (let i = lead.length - 1; i >= 0; i--) { const f = i / (lead.length - 1); band.push(V.add(lead[i], V.mul(tipDir, 30 * (1 - 0.6 * f)))); }
    plumage(g, blob(band), { base: 0.98, shade: 0.88, light: LIGHT, depth: 12, blur: 6 });
    const { from, to, n, len, rows } = W.coverts;
    for (let row = rows - 1; row >= 0; row--) {
      for (let k = 0; k < n; k++) {
        const f = from + (to - from) * (k + 0.5 * row) / n, j = Math.min(lead.length - 1, Math.floor(f * (lead.length - 1)));
        const base = V.add(lead[j], V.mul(tipDir, 7 + row * 18)), tip = V.add(base, V.mul(V.rot(tipDir, -0.15), len * (0.7 + 0.2 * (1 - f))));
        const q = featherPts(base, tip, 20 - row * 2, 0.02);
        plumage(g, blob(q), { base: 0.98, shade: 0.88, light: LIGHT, depth: 6, blur: 3 });
        ink(g, [q[3], q[4], q[5], q[6]], 1.1, gv(0.25, 0.6), { end: 0.2, bias: 0.3 });
      }
    }
  }
  ink(g, lead, 1.8, gv(0.06, 0.85), { end: 0.3 });
}

// ---------------------------------------------------------------- legs and feet (frame px)
// leg: short feathered "pants" at the top (drawn over the belly edge), a short scaly tarsus, three long front toes and
// a short back toe; claws are dark curved hooks. toes: list of point lists from the ankle.
function toe(g, pts, w0, seed) {
  const q = sampleCurve(pts, 6), n = q.length;
  g.lineCap = "round";
  taper(g, q, (u) => w0 * (1 - 0.45 * u) + 2.4, LINE);
  taper(g, q, (u) => w0 * (1 - 0.45 * u), gv(0.9));
  for (let i = 3; i < n - 2; i += 4) {
    const t = V.nrm(V.sub(q[i + 1], q[i - 1])), nn = V.perp(t), w = w0 * (1 - 0.45 * i / (n - 1)) * 0.5;
    ink(g, [V.add(q[i], V.mul(nn, w)), V.sub(q[i], V.mul(nn, w))], 0.8, gv(0.3, 0.6));
  }
  const e = q[n - 1], t = V.nrm(V.sub(e, q[n - 3])), nn = V.perp(t), down = nn[1] > 0 ? nn : V.mul(nn, -1);
  const tip = V.add(V.add(e, V.mul(t, 5.5)), V.mul(down, 5));
  const claw = [V.add(e, V.mul(nn, w0 * 0.3)), V.add(V.add(e, V.mul(t, 4)), V.mul(down, 1)), tip, V.sub(e, V.mul(nn, w0 * 0.3))];
  g.fillStyle = "#121212"; g.beginPath(); smoothPath(g, claw, true); g.fill();
}
function leg(g, hip, ankle, w = 12) {
  const d = V.nrm(V.sub(ankle, hip)), n = V.perp(d);
  const q = [V.add(hip, V.mul(n, w * 0.55)), V.add(ankle, V.mul(n, w * 0.42)), V.sub(ankle, V.mul(n, w * 0.42)), V.sub(hip, V.mul(n, w * 0.55))];
  g.fillStyle = gv(0.84); g.beginPath(); g.moveTo(...q[0]); for (const p of q) g.lineTo(...p); g.closePath(); g.fill();
  ink(g, [q[0], q[1]], 1.5, LINE, { end: 0.6 }); ink(g, [q[3], q[2]], 1.5, LINE, { end: 0.6 });
  const L = V.len(V.sub(ankle, hip));
  for (let s = 6; s < L - 3; s += 5) { const p = V.add(hip, V.mul(d, s)); ink(g, [V.add(p, V.mul(n, w * 0.4)), V.sub(p, V.mul(n, w * 0.4))], 0.7, gv(0.3, 0.55)); }
}
function foot(g, f, seed) {
  if (f.hip) leg(g, f.hip, f.ankle, f.w || 15);
  const a = f.ankle;
  f.toes.forEach((tp, i) => toe(g, [a, ...tp], i === f.toes.length - 1 && f.back ? 6.5 : 8.5, seed + i));
  g.fillStyle = gv(0.86); g.beginPath(); g.arc(a[0], a[1], 7, 0, 7); g.fill();
}
function pants(g, hip, seed, dir = -1) {
  // a fluffy tuft where the leg leaves the belly, overlapping the belly edge by ~20 px
  const r = rng(seed), [x, y] = hip;
  const q = [[x - 20, y - 30], [x + 20, y - 30], [x + 17, y - 10], [x + 9, y + 4], [x + 1 + dir * 2, y + 8], [x - 9, y + 4], [x - 17, y - 10]];
  plumage(g, blob(q), { base: 0.96, shade: 0.86, light: LIGHT, depth: 8, blur: 6 });
  for (let i = 0; i < 9; i++) {
    const u = i / 8, px = x - 17 + u * 34, py = y - 6 + Math.sin(Math.PI * u) * 13;
    flick(g, [px, py - 14 - r() * 6], V.nrm([(x - px) * 0.04, 1]), 12 + r() * 6, 0.8, gv(0.45, 0.35), 0.1);
  }
  ink(g, [[x - 13, y + 4], [x, y + 11], [x + 12, y + 5]], 1.0, gv(0.3, 0.4), { end: 0.2 });
}
// foot poses per state (read off the registered source frames)
const FEET = {
  level: {
    back: { hip: [834, 528], ankle: [838, 572], toes: [[[826, 588], [818, 598]], [[838, 590], [836, 602]], [[850, 586], [856, 596]]], blur: 3, alpha: 0.55 },
    front: { hip: [778, 530], ankle: [756, 568], toes: [[[726, 572], [694, 579]], [[728, 582], [700, 591]], [[738, 590], [720, 601]], [[775, 580], [790, 588]]], back: true },
  },
  levelB: {
    back: { hip: [852, 516], ankle: [866, 554], toes: [[[892, 552], [921, 548]], [[872, 574], [878, 592]], [[856, 572], [840, 586]], [[850, 552], [836, 546]]], back: true },
    front: { hip: [720, 528], ankle: [705, 566], toes: [[[684, 574], [668, 580]], [[690, 582], [680, 592]], [[704, 584], [700, 596]]], blur: 3.5, alpha: 0.5 },
  },
  up: {
    back: { hip: [858, 510], ankle: [888, 522], w: 11, toes: [[[906, 500], [924, 506], [930, 526], [918, 545]], [[912, 512], [930, 530], [926, 552], [908, 560]], [[905, 528], [918, 548], [908, 566]]] },
    front: { hip: [742, 534], ankle: [706, 573], toes: [[[672, 566], [636, 565]], [[676, 578], [650, 581]], [[690, 586], [680, 594]], [[722, 584], [735, 591]]], back: true },
  },
  down: {
    back: null,
    front: { hip: [822, 532], ankle: [815, 571], toes: [[[786, 576], [760, 582]], [[790, 586], [768, 594]], [[800, 592], [786, 601]], [[832, 584], [846, 591]]], back: true },
  },
  fly: {
    back: { hip: [870, 488], ankle: [896, 505], w: 11, toes: [[[914, 492], [930, 500], [932, 518], [920, 530]], [[916, 506], [928, 522], [918, 540]], [[906, 516], [912, 534], [900, 544]]] },
    front: { hip: [778, 500], ankle: [800, 522], w: 11, toes: [[[818, 512], [834, 520], [834, 538], [822, 548]], [[820, 528], [828, 544], [816, 556]], [[808, 536], [812, 552], [800, 560]]] },
  },
};

// ---------------------------------------------------------------- face, headphones, plaster
function eye(g, e) {
  const { x, y, rx, ry } = e;
  const path = (c) => c.ellipse(x, y, rx, ry, 0, 0, 7);
  g.fillStyle = gv(0.97); g.beginPath(); path(g); g.fill();
  g.save(); g.beginPath(); path(g); g.clip();
  // a soft grey shade under the upper lid
  g.filter = "blur(3px)"; g.fillStyle = gv(0.7, 0.5); g.beginPath(); g.ellipse(x, y - ry * 0.95, rx * 1.1, ry * 0.35, 0, 0, 7); g.fill(); g.filter = "none";
  // iris: near black, a hair lighter at the rim
  g.fillStyle = "#1c1c1c"; g.beginPath(); g.arc(e.ix, e.iy, e.ir, 0, 7); g.fill();
  g.fillStyle = "#050505"; g.beginPath(); g.arc(e.ix + 0.3, e.iy + 0.3, e.ir * 0.82, 0, 7); g.fill();
  g.fillStyle = gv(0.99); g.beginPath(); g.arc(e.hx, e.hy, e.hr, 0, 7); g.fill();
  g.fillStyle = gv(0.9, 0.7); g.beginPath(); g.arc(e.ix - e.ir * 0.35, e.iy + e.ir * 0.45, e.hr * 0.45, 0, 7); g.fill();
  g.restore();
  // rim: full dark outline, heavier across the top (the upper lid) and round the lower outer side
  const pts = []; for (let i = 0; i <= 48; i++) { const a = Math.PI * 0.95 + (i / 48) * Math.PI * 2; pts.push([x + Math.cos(a) * rx, y + Math.sin(a) * ry]); }
  taper(g, pts, (u) => { const a = Math.PI * 0.95 + u * Math.PI * 2, top = Math.max(0, -Math.sin(a)); return (e.far ? 2.0 : 2.4) + top * (e.far ? 1.6 : 2.2); }, LINE);
  // lower-lid crease below the eye
  const cr = []; for (let i = 0; i <= 16; i++) { const a = Math.PI * (0.18 + 0.64 * i / 16); cr.push([x + Math.cos(a) * rx * 1.02, y + Math.sin(a) * (ry + 6)]); }
  ink(g, cr, e.far ? 1.2 : 1.6, gv(0.25, 0.55), { end: 0.1 });
}
function beak(g) {
  // upper mandible hooks down on the left to the tip; the open mouth (dark) and a pale lower mandible on the right
  const up = [[528, 387], [538, 381], [551, 384], [559, 395], [561, 406], [552, 404], [544, 405], [540, 412], [541, 429], [533, 423], [525, 410], [523, 398]];
  g.fillStyle = "#1a1a1a"; g.beginPath(); smoothPath(g, [[542, 406], [559, 407], [556, 418], [547, 422], [542, 416]], true); g.fill();
  g.fillStyle = gv(0.8); g.beginPath(); smoothPath(g, [[545, 424], [558, 419], [556, 428], [547, 430]], true); g.fill();
  ink(g, [[545, 424], [558, 419]], 1.2, LINE);
  ink(g, [[546, 430], [556, 428], [558, 419]], 1.4, LINE);
  g.save(); g.beginPath(); smoothPath(g, up, true); g.clip();
  g.fillStyle = gv(0.84); g.fill();
  g.filter = "blur(2.5px)";
  g.fillStyle = gv(0.97, 0.9); g.beginPath(); g.ellipse(533, 393, 8, 7, 0, 0, 7); g.fill();
  g.fillStyle = gv(0.55, 0.7); g.beginPath(); g.ellipse(537, 420, 5, 9, 0, 0, 7); g.fill();
  g.filter = "none";
  g.restore();
  ink(g, [[528, 387], [523, 399], [526, 412], [533, 423], [541, 429]], 1.7, LINE, { end: 0.3 });
  ink(g, [[541, 429], [540, 414], [544, 405], [561, 406]], 1.5, LINE, { end: 0.3 });
  ink(g, [[538, 381], [551, 384], [559, 395], [561, 406]], 1.5, LINE, { end: 0.3 });
  g.fillStyle = LINE; g.beginPath(); g.ellipse(537, 392, 1.8, 1.4, 0, 0, 7); g.fill();
}
function faceLines(g) {
  // brow crease between the eyes and the soft rims of the facial disc
  ink(g, [[510, 320], [522, 332], [536, 346]], 2.2, gv(0.2, 0.8), { end: 0.2 });
  ink(g, [[536, 346], [548, 338], [562, 333]], 1.6, gv(0.25, 0.7), { end: 0.2 });
  ink(g, [[556, 312], [584, 300], [614, 298], [646, 310]], 1.5, gv(0.35, 0.55), { end: 0.1 });
  ink(g, [[488, 322], [500, 310], [516, 306]], 1.1, gv(0.4, 0.4), { end: 0.1 });
  // cheek feathering under the eyes and down to the beak
  const r = rng(77);
  for (let i = 0; i < 26; i++) {
    const a = Math.PI * (0.1 + 0.8 * r()), cx = i < 16 ? 598 : 507, cy = i < 16 ? 354 : 364, R = i < 16 ? 44 : 32;
    const p = [cx + Math.cos(a) * R * (1 + 0.25 * r()), cy + Math.sin(a) * R * (0.95 + 0.3 * r())];
    flick(g, p, V.nrm([Math.cos(a) * 0.4, 1]), 8 + r() * 8, 0.9, gv(0.45, 0.35), 0.15);
  }
}
function plaster(g) {
  const { x, y, L, h, rot } = PLASTER;
  g.save(); g.translate(x, y); g.rotate(rot);
  g.fillStyle = gv(0.92); g.beginPath(); g.roundRect(-L / 2, -h / 2, L, h, h / 2); g.fill();
  g.save(); g.clip(); g.fillStyle = gv(0.6, 0.35); g.fillRect(-L / 2, h * 0.18, L, h * 0.4); g.restore();
  g.fillStyle = gv(0.97); g.beginPath(); g.roundRect(-14, -8, 28, 16, 3); g.fill();
  g.strokeStyle = gv(0.25, 0.85); g.lineWidth = 1.2; g.beginPath(); g.roundRect(-14, -8, 28, 16, 3); g.stroke();
  g.strokeStyle = gv(0.45, 0.5); g.lineWidth = 0.9; g.beginPath(); g.roundRect(-9, -4.5, 18, 9, 2); g.stroke();
  g.fillStyle = LINE;
  for (const dx of [-26, -21, 21, 26]) for (const dy of [-3.5, 3.5]) { g.beginPath(); g.arc(dx, dy, 0.9, 0, 7); g.fill(); }
  g.strokeStyle = LINE; g.lineWidth = 1.7; g.beginPath(); g.roundRect(-L / 2, -h / 2, L, h, h / 2); g.stroke();
  g.restore();
}
function metalStrip(g, pts, w, v = 0.66) {
  const q = sampleCurve(pts, 6);
  taper(g, q, () => w + 3, LINE);
  taper(g, q, () => w, gv(v));
  taper(g, q.map((p, i) => { const a = q[Math.max(0, i - 1)], b = q[Math.min(q.length - 1, i + 1)], n = V.perp(V.nrm(V.sub(b, a))); return V.add(p, V.mul(n, -w * 0.22)); }), () => w * 0.35, gv(0.93, 0.9));
  taper(g, q.map((p, i) => { const a = q[Math.max(0, i - 1)], b = q[Math.min(q.length - 1, i + 1)], n = V.perp(V.nrm(V.sub(b, a))); return V.add(p, V.mul(n, w * 0.3)); }), () => w * 0.18, gv(0.3, 0.8));
}
function farCup(g) {
  const { x, y, rx, ry } = FARCUP;
  g.fillStyle = "#0b0b0b"; g.beginPath(); g.ellipse(x, y, rx, ry, 0.05, 0, 7); g.fill();
  ink(g, [[x - rx * 0.55, y - ry * 0.85], [x - rx * 0.95, y - ry * 0.2], [x - rx * 0.9, y + ry * 0.4], [x - rx * 0.45, y + ry * 0.9]], 1.6, gv(0.55, 0.9), { end: 0.2 });
  ink(g, [[x - rx * 0.25, y - ry * 0.6], [x - rx * 0.55, y], [x - rx * 0.3, y + ry * 0.6]], 1.0, gv(0.35, 0.8), { end: 0.2 });
}
function nearCup(g) {
  const c = CUP, r = rng(91);
  // cushion: near-black, fine ribs
  g.fillStyle = "#0a0a0a"; g.beginPath(); g.ellipse(c.cx, c.cy, c.crx, c.cry, 0.08, 0, 7); g.fill();
  g.save(); g.beginPath(); g.ellipse(c.cx, c.cy, c.crx, c.cry, 0.08, 0, 7); g.clip();
  for (let i = 0; i < 26; i++) {
    const a = Math.PI * (0.55 + 0.9 * i / 25);
    const p0 = [c.cx + Math.cos(a) * c.crx * 0.95, c.cy + Math.sin(a) * c.cry * 0.95], p1 = [c.cx + Math.cos(a) * c.crx * 0.72, c.cy + Math.sin(a) * c.cry * 0.8];
    ink(g, [p0, p1], 0.9 + r() * 0.6, gv(0.3 + 0.2 * r(), 0.7), { end: 0.3 });
  }
  g.restore();
  // a thin silver ring round the outside of the cushion, brightest on the upper left
  const ring = []; for (let i = 0; i <= 40; i++) { const a = Math.PI * (0.62 + 1.1 * i / 40); ring.push([c.cx + Math.cos(a) * (c.crx - 2), c.cy + Math.sin(a) * (c.cry - 2)]); }
  ink(g, ring, 2.2, gv(0.62, 0.85), { end: 0.15 });
  // shell: dark metal ring with a light edge
  g.fillStyle = gv(0.2); g.beginPath(); g.ellipse(c.sx, c.sy, c.srx, c.sry, 0.08, 0, 7); g.fill();
  const sh = []; for (let i = 0; i <= 40; i++) { const a = Math.PI * (0.9 + 1.2 * i / 40); sh.push([c.sx + Math.cos(a) * (c.srx - 1.5), c.sy + Math.sin(a) * (c.sry - 1.5)]); }
  ink(g, sh, 2.6, gv(0.7, 0.9), { end: 0.2 });
  // plate: brushed metal, bright upper left, darker lower right, a dark slot mark, one specular glint
  g.save(); g.beginPath(); g.ellipse(c.px, c.py, c.prx, c.pry, 0.08, 0, 7); g.clip();
  const gr = g.createLinearGradient(c.px - c.prx, c.py - c.pry, c.px + c.prx, c.py + c.pry);
  gr.addColorStop(0, gv(0.86)); gr.addColorStop(0.55, gv(0.66)); gr.addColorStop(1, gv(0.38));
  g.fillStyle = gr; g.fillRect(c.px - c.prx - 2, c.py - c.pry - 2, 2 * c.prx + 4, 2 * c.pry + 4);
  for (let i = 0; i < 30; i++) {
    const xx = c.px - c.prx + r() * 2 * c.prx;
    g.strokeStyle = gv(r() < 0.5 ? 0.35 : 0.95, 0.35); g.lineWidth = 0.8;
    g.beginPath(); g.moveTo(xx, c.py - c.pry); g.lineTo(xx + (r() - 0.5) * 3, c.py + c.pry); g.stroke();
  }
  g.filter = "blur(2px)"; g.fillStyle = gv(1, 0.8); g.beginPath(); g.ellipse(c.px - c.prx * 0.45, c.py - c.pry * 0.45, 5, 11, 0.3, 0, 7); g.fill(); g.filter = "none";
  g.restore();
  g.strokeStyle = LINE; g.lineWidth = 1.6; g.beginPath(); g.ellipse(c.px, c.py, c.prx, c.pry, 0.08, 0, 7); g.stroke();
  ink(g, [[c.px - 3, c.py + 2], [c.px + 5, c.py - 1]], 2.6, LINE, { end: 0.4 });
  // yoke arm with its hinge block, then the band end
  metalStrip(g, YOKE, 14, 0.42);
  g.fillStyle = gv(0.5); g.strokeStyle = LINE; g.lineWidth = 1.6;
  g.save(); g.translate(683, 244); g.rotate(-0.35); g.beginPath(); g.roundRect(-9, -11, 18, 22, 2); g.fill(); g.stroke();
  g.strokeStyle = gv(0.3, 0.8); g.lineWidth = 1; g.beginPath(); g.moveTo(-6, 0); g.lineTo(6, 0); g.stroke(); g.restore();
}

// ---------------------------------------------------------------- whole owl for one state
function paintOwl(g, st, seed = 1) {
  setPPU(1);
  const outline = st.feet === "fly" ? BODY_FLY : BODY;
  const bp = blob(outline);
  const F = FEET[st.feet];
  if (st.wing === "up") paintWing(g, WING.far, 31);
  farCup(g);
  CREST.forEach(([b, t, w], i) => {
    const q = featherPts(b, t, w, 0.03, 1);
    plumage(g, blob(q), { base: 0.95, shade: 0.78, light: LIGHT, depth: 5, blur: 3 });
    ink(g, [q[2], q[3], q[4], q[5]], 1.4, gv(0.1, 0.8), { end: 0.1 });
    ink(g, [V.mix(b, t, 0.1), V.mix(b, t, 0.8)], 0.7, gv(0.4, 0.5), { end: 0.1 });
  });
  // back foot (behind the belly); a moving one is softened
  if (F.back) {
    if (F.back.blur) { g.save(); g.filter = `blur(${F.back.blur}px)`; g.globalAlpha = F.back.alpha ?? 1; foot(g, F.back, seed + 10); g.restore(); }
    else foot(g, F.back, seed + 10);
  }
  if (st.feet === "fly") foot(g, F.front, seed + 20);
  // tail
  TAIL.forEach(([root, tip, w], i) => {
    const q = featherPts(root, tip, w, 0.02);
    plumage(g, blob(q), { base: 0.95, shade: 0.8, light: LIGHT, depth: 5, blur: 3 });
    ink(g, [q[3], q[4], q[5], q[6], q[7]], 1.3, gv(0.08, 0.8), { end: 0.15 });
    ink(g, [V.mix(root, tip, 0.15), V.mix(root, tip, 0.85)], 0.6, gv(0.45, 0.45), { end: 0.1 });
  });
  // front foot under the belly (the leg top is hidden by the belly, then a tuft goes over it)
  if (st.feet !== "fly") {
    if (F.front.blur) { g.save(); g.filter = `blur(${F.front.blur}px)`; g.globalAlpha = F.front.alpha ?? 1; foot(g, F.front, seed + 20); g.restore(); }
    else foot(g, F.front, seed + 20);
  }
  // body + head: soft white, greying on the lower right and under the belly
  plumage(g, bp, { base: 0.97, shade: 0.8, light: LIGHT, depth: 70, blur: 30, keep: [-20, 40] });
  softShade(g, bp, (c) => c.ellipse(720, 580, 250, 55, -0.08, 0, 7), 0.62, 0.45, 20);
  softShade(g, bp, (c) => c.ellipse(750, 390, 60, 38, 0, 0, 7), 0.72, 0.3, 16);
  softShade(g, bp, (c) => c.ellipse(488, 420, 40, 40, 0, 0, 7), 0.72, 0.4, 14);
  softShade(g, bp, (c) => c.ellipse(900, 470, 60, 50, 0, 0, 7), 0.7, 0.45, 18);
  softShade(g, bp, (c) => c.ellipse(560, 300, 70, 50, 0, 0, 7), 1.0, 0.5, 18);
  softShade(g, bp, (c) => c.ellipse(515, 262, 40, 26, -0.6, 0, 7), 0.74, 0.5, 10);
  softShade(g, bp, (c) => c.ellipse(515, 420, 36, 26, 0.5, 0, 7), 0.78, 0.4, 10);
  // pencil texture: shadow-side hatching, sparse short flicks combing down and back, feathery edge
  rimHatch(g, outline, { light: LIGHT, flow: [0.6, 1], len: 16, step: 3, w: 1.0, color: gv(0.4, 0.42), seed: seed + 3, density: 0.85, bend: 0.5, thr: 0.1 });
  g.save(); g.beginPath(); bp(g); g.clip();
  const r = rng(seed + 5);
  for (let i = 0; i < 90; i++) {
    const x = 500 + r() * 420, y = 390 + r() * 150;
    const d = V.nrm([0.55 + (r() - 0.5) * 0.4, 0.75 + (r() - 0.5) * 0.3]);
    flick(g, [x, y], d, 7 + r() * 11, 0.8 + r() * 0.5, gv(0.5 + 0.1 * r(), 0.28), 0.18);
  }
  for (let i = 0; i < 70; i++) {
    const x = 590 + r() * 290, y = 470 + r() * 70;
    flick(g, [x, y], V.nrm([0.35 + (r() - 0.5) * 0.3, 1]), 10 + r() * 12, 0.9, gv(0.45, 0.3), 0.12);
  }
  for (let i = 0; i < 30; i++) {
    const x = 500 + r() * 260, y = 240 + r() * 80;
    const d = V.nrm([(r() - 0.5) * 0.6, 1]);
    flick(g, [x, y], d, 6 + r() * 8, 0.8, gv(0.5, 0.25), 0.1);
  }
  g.restore();
  edgeFlicks(g, outline, { step: 9, len: 10, w: 0.9, color: gv(0.45, 0.4), ang: 0.9, seed: seed + 7 });
  fringe(g, outline.slice(18, 30), { step: 11, len: 5, w: 5, color: gv(0.86), closed: false, seed: seed + 8 });
  // soft keyline: fuller along the belly and the face side, broken, dropping away on the lit crown
  const low = outline.slice(15, 32);
  ink(g, low, 1.6, gv(0.1, 0.6), { end: 0.1 });
  ink(g, [...outline.slice(31), outline[0], outline[1], outline[2]], 1.8, gv(0.1, 0.7), { end: 0.2 });
  // leg tufts over the belly edge
  if (F.front && F.front.hip && !F.front.blur && st.feet !== "fly") pants(g, F.front.hip, seed + 30);
  if (F.back && F.back.hip && !F.back.blur && st.feet !== "fly") pants(g, F.back.hip, seed + 31, 1);
  // near wing
  paintWing(g, WING[st.wing], 37);
  // face
  faceLines(g);
  EYES.forEach((e) => eye(g, e));
  beak(g);
  plaster(g);
  // headphones: band over the crown, near cup
  metalStrip(g, BAND, 14, 0.36);
  nearCup(g);
}

// ---------------------------------------------------------------- composite per state
// content frame (the source is 24-fps animation with one repeated frame every 25)
export const contentFrame = (f) => f - Math.floor((f - 1) / 25);
export function wingPhase(f) { return ["level", "up", "level", "down"][contentFrame(f) % 4]; }
export const FLY_END = 1337;   // first frame standing on the keys
export function owlAState(f) {
  const ph = wingPhase(f);
  const cf = contentFrame(f) % 4;
  const feet = f < FLY_END ? "fly" : cf === 0 ? "levelB" : ph;
  return { wing: ph, feet, key: `${ph}-${feet}` };
}
const BX0 = 360, BY0 = 60, BX1 = 1080, BY1 = 650;   // layer bounds (frame px, 1356 placement)
let cache = null;
function build(st) {
  const w = BX1 - BX0, h = BY1 - BY0;
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const g = c.getContext("2d");
  g.translate(-BX0, -BY0);
  paintOwl(g, st);
  // softer than the room: a faint glow under a very slightly blurred drawing
  const o = document.createElement("canvas"); o.width = w; o.height = h;
  const og = o.getContext("2d");
  og.filter = "blur(10px)"; og.globalAlpha = 0.16; og.drawImage(c, 0, 0);
  og.filter = "blur(0.6px)"; og.globalAlpha = 1; og.drawImage(c, 0, 0);
  og.filter = "none";
  return { canvas: o, x: BX0, y: BY0, w, h };
}
export function owlALayer(st) {
  if (!cache) cache = new Map();
  if (!cache.has(st.key)) cache.set(st.key, build(st));
  return cache.get(st.key);
}
export function owlAOffset(f) {
  const i = Math.max(0, Math.min(PATH_A.length - 1, f - PATH_A[0][0]));
  return [PATH_A[i][1], PATH_A[i][2]];
}
// per-frame travel (px/frame) for the fly-in motion blur
export function owlAStep(f) {
  const i = Math.max(1, Math.min(PATH_A.length - 1, f - PATH_A[0][0]));
  const a = PATH_A[i - 1], b = PATH_A[i];
  return f - PATH_A[0][0] < 1 ? [PATH_A[1][1] - PATH_A[0][1], PATH_A[1][2] - PATH_A[0][2]] : [b[1] - a[1], b[2] - a[2]];
}
export function releaseOwlA() { cache = null; }
