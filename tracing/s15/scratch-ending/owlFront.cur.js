// s15 owl facing the camera (44.44–45.12). Fix pass 1: rebuilt on the owlInk flyToward head, wings and plumage, with
// the parts the source draws differently done here, all measured on the source in owl units (root = the preset's
// origin placed per frame from the template-tracked head; grids in snapshots/s15-fix1/ug*.png, feet-front2.jpg,
// owl34grid.jpg):
//   - ONE plump pear-shaped mass (the head runs straight into the body, no neck crease): the body is as wide as the
//     head (half-width ~108 units) and reaches ~130 units below the root; merged with the head by owlInk
//   - short white feathered legs close together under the body and grey three-toed feet with dark claws (drawn
//     here, not owlInk's striped stand legs), placed per frame
//   - solid dark headphone cups with a lit rim (drawn over owlInk's halftone cups)
//   - the wings pulled in to the measured silhouette extents, their tips at the measured heights per frame
//   - 3/4 (44.92–45.12): a tilted egg of a body, the near wing raised back, the far wing folded on the body, a tail
//     tuft low behind, the rear leg kicked back and the front foot lifted forward (measured at 45.00)
//   44.44          a wink: viewer-right eye shut, the other tired-lidded; the rear (left) leg kicked out
//   44.88          mid-turn: the source frame is soft all over, so the owl is only a little soft (0.8 px)
import { drawOwl, owlPose, ink, gv, LINE, V, setPPU, headGeom, headphoneGeom, drawBandSlim } from "../../lib/owlInk.js";
import { smoothPath, sampleCurve } from "../../lib/paths.js";
import { taper } from "../../lib/ink.js";
import { rng } from "../../lib/rng.js";

const TAU = Math.PI * 2;
// [film frame, eyes' midpoint x, y, scale vs 44.80] (matchTemplate on the source head, 0.80–1.25 scale search)
const HEAD = [
  [1111, 1091, 554, 1.03], [1112, 1127, 546, 1.025], [1113, 1154, 541, 1.025], [1114, 1172, 541, 1.0], [1115, 1182, 541, 1.0],
  [1116, 1185, 539, 1.0], [1117, 1185, 539, 1.0], [1118, 1183, 537, 1.0], [1119, 1177, 535, 1.0], [1120, 1168, 532, 1.0],
  [1121, 1168, 532, 1.0],
  // 3/4 (template from 44.96)
  [1122, 1163, 486, 0.95], [1123, 1150, 471, 1.0], [1124, 1149, 462, 1.0], [1125, 1149, 461, 1.0], [1126, 1149, 459, 1.0],
  [1127, 1149, 459, 1.0], [1128, 1149, 458, 1.0],
];
const lerpRow = (T, t) => {
  const f = t * 25;
  let a = T[0], b = T[T.length - 1];
  if (f <= a[0]) return a.slice();
  for (let i = 1; i < T.length; i++) if (f <= T[i][0]) { a = T[i - 1]; b = T[i]; break; }
  if (f >= b[0]) return b.slice();
  const u = (f - a[0]) / (b[0] - a[0]);
  return a.map((v, k) => (v === null || b[k] === null ? v : v + (b[k] - v) * u));
};
// wing-tip heights (owl units, y of T for the viewer-left / viewer-right wing), measured on the source silhouette
const TIPS = [[1111, -118, -140], [1112, -128, -143], [1114, -118, -148], [1116, -115, -146], [1118, -115, -145], [1119, -112, -140],
  [1120, -65, -109], [1121, -65, -109]];
// feet, facing us: [frame, left ankle x, y, right ankle x, y] (owl units; the toes reach ~45 below the ankle). 44.44:
// the left leg is kicked out sideways (ankle far left and high); 44.52–44.56 the right foot comes up a little
const FEET = [[1111, -150, 112, 52, 152], [1112, -66, 150, 72, 146], [1113, -66, 150, 72, 132], [1114, -62, 146, 76, 128],
  [1115, -58, 146, 76, 136], [1116, -58, 146, 76, 136], [1117, -58, 146, 78, 136], [1118, -56, 142, 76, 128],
  [1119, -56, 138, 76, 126], [1120, -64, 130, 70, 120], [1121, -64, 130, 70, 120]];
// 3/4 frames: [frame, near (left) tip x, y, far (right) tip x, y or null = folded]
// (fix 2: 44.96-45.12 the near wing's tip pulled in from ~-410 to ~-300 units: the silhouette reached 117 px further
// left than the source's (x 858 vs 975); owlm.py)
const TIPS34 = [[1122, -410, -45, null], [1123, -400, -110, null], [1124, -305, -140, null], [1125, -300, -150, null],
  [1126, -300, -152, null], [1127, -300, -152, null], [1128, -300, -145, [222, -170]]];
// (fix 2) the 3/4 owl's size and place per frame: [frame, scale about y 530, dx, dy]. It was ~20% too big (height 307
// vs 254-258 px, 341 vs 233 wide at 45.04) with its crown ~28 px high and its body ~25 px low, i.e. centred right but
// too big; 44.88 was right-sized but ~33 px left and ~20 px high
const SIZE34 = [[1122, 0.93, 33, 16], [1123, 0.87, 10, 6], [1124, 0.82, 0, 0], [1128, 0.82, 0, 0]];

// ---------------------------------------------------------------- legs and feet (owl units, behind the body)
// a short white feathered leg from the hip to the ankle, then three grey scaled toes fanning round `dir` with dark claws
function legFoot(g, hip, ankle, dir, { toe = 42, spread = 0.42, seed = 1, curl = 0 } = {}) {
  const r = rng(seed);
  const d = V.nrm ? V.nrm(dir) : dir;
  // the leg: a soft white tapered shape, a grey keyline on its shadow (right) side, a few feather flicks
  const L = [hip, [hip[0] * 0.55 + ankle[0] * 0.45, hip[1] * 0.55 + ankle[1] * 0.45], ankle];
  const q = sampleCurve(L, 6);
  taper(g, q, (u) => 32 - 10 * u, gv(0.45, 0.9));
  taper(g, q, (u) => 29 - 9 * u, gv(0.95));
  for (let k = 0; k < 4; k++) {
    const u = 0.25 + 0.18 * k, p = [hip[0] + (ankle[0] - hip[0]) * u, hip[1] + (ankle[1] - hip[1]) * u], sd = k % 2 ? 1 : -1;
    ink(g, [[p[0] + sd * 9, p[1] - 3], [p[0] + sd * 13, p[1] + 5]], 1.1, gv(0.55, 0.6), { end: 0.1 });
  }
  // toes: grey, fanned round the foot direction, a crease or two, a dark hooked claw
  const base = Math.atan2(d[1], d[0]);
  for (let i = 0; i < 3; i++) {
    const f = i - 1, a = base + f * spread + curl * f, len = toe * (i === 1 ? 1.08 : 0.9) * (0.95 + 0.1 * r());
    const m = [ankle[0] + Math.cos(a) * len * 0.5, ankle[1] + Math.sin(a) * len * 0.5];
    const e = [ankle[0] + Math.cos(a + curl) * len, ankle[1] + Math.sin(a + curl) * len];
    const tq = sampleCurve([ankle, m, e], 6);
    taper(g, tq, (u) => 15 - 5 * u, gv(0.12, 0.95));
    taper(g, tq, (u) => 11.5 - 4.5 * u, gv(0.8 - 0.06 * r()));
    for (const fu of [0.35, 0.62]) {
      const p = [ankle[0] + (e[0] - ankle[0]) * fu, ankle[1] + (e[1] - ankle[1]) * fu], n = [-Math.sin(a), Math.cos(a)];
      ink(g, [[p[0] - n[0] * 4, p[1] - n[1] * 4], [p[0] + n[0] * 4, p[1] + n[1] * 4]], 0.9, gv(0.3, 0.7), { end: 0.3 });
    }
    const t = [Math.cos(a + curl), Math.sin(a + curl)], n = [-t[1], t[0]];
    const tip = [e[0] + t[0] * 11 + n[0] * 3, e[1] + t[1] * 11 + n[1] * 3];
    g.fillStyle = gv(0.1); g.beginPath();
    g.moveTo(e[0] - n[0] * 3.5, e[1] - n[1] * 3.5); g.quadraticCurveTo(e[0] + t[0] * 8 - n[0] * 2, e[1] + t[1] * 8 - n[1] * 2, tip[0], tip[1]);
    g.quadraticCurveTo(e[0] + t[0] * 5 + n[0] * 3, e[1] + t[1] * 5 + n[1] * 3, e[0] + n[0] * 3.5, e[1] + n[1] * 3.5); g.closePath(); g.fill();
  }
}

// ---------------------------------------------------------------- solid cups (the source's, not a halftone mesh)
// a dark shell (value ~0.2) seen from the side, a lit rim round its outer edge, a darker inner plate with a faint ring,
// the cushion a dark band on the head side
function solidCup(g, c, r) {
  const s = c.side;
  g.save(); g.translate(c.x, c.y);
  g.fillStyle = gv(0.1); g.beginPath(); g.ellipse(-s * r * 0.32, 0, r * 0.3, r * 0.95, 0, 0, TAU); g.fill();
  const shell = (q) => q.ellipse(s * r * 0.06, 0, r * 0.52, r * 0.97, 0, 0, TAU);
  g.fillStyle = gv(0.34); g.beginPath(); shell(g); g.fill();
  // lit rim: a light band round the outer edge, strongest on the upper outer side
  g.save(); g.beginPath(); shell(g); g.clip();
  g.strokeStyle = gv(0.8); g.lineWidth = r * 0.18;
  g.beginPath(); g.ellipse(s * r * 0.06, 0, r * 0.5, r * 0.95, 0, s > 0 ? -1.9 : Math.PI - 1.2, s > 0 ? 1.2 : Math.PI + 1.9); g.stroke();
  g.strokeStyle = gv(0.5); g.lineWidth = r * 0.07;
  g.beginPath(); g.ellipse(s * r * 0.06, 0, r * 0.5, r * 0.95, 0, 0, TAU); g.stroke();
  g.restore();
  g.fillStyle = gv(0.16); g.beginPath(); g.ellipse(s * r * 0.12, r * 0.02, r * 0.3, r * 0.6, 0, 0, TAU); g.fill();
  g.strokeStyle = gv(0.55); g.lineWidth = r * 0.045; g.beginPath(); g.ellipse(s * r * 0.12, r * 0.02, r * 0.22, r * 0.46, 0, 0, TAU); g.stroke();
  g.fillStyle = gv(0.6, 0.8); g.beginPath(); g.ellipse(s * r * 0.2, -r * 0.3, r * 0.05, r * 0.12, 0, 0, TAU); g.fill();
  g.strokeStyle = LINE; g.lineWidth = r * 0.05; g.beginPath(); shell(g); g.stroke();
  g.restore();
}

// a tuft of soft feathers (the far wing's tips hanging below it, the 3/4 view's tail): n rounded paddles from `root`
// fanning round `dir`
function tuft(g, root, dir, { n = 4, len = 60, w = 18, fan = 0.5 } = {}) {
  const a0 = Math.atan2(dir[1], dir[0]);
  for (let i = n - 1; i >= 0; i--) {
    const a = a0 + (i / Math.max(1, n - 1) - 0.5) * fan, L = len * (0.8 + 0.2 * Math.sin((i + 1) * 1.7)), t = [Math.cos(a), Math.sin(a)], nn = [-t[1], t[0]];
    const pts = [[root[0] + nn[0] * w * 0.5, root[1] + nn[1] * w * 0.5], [root[0] + t[0] * L * 0.6 + nn[0] * w * 0.45, root[1] + t[1] * L * 0.6 + nn[1] * w * 0.45],
      [root[0] + t[0] * L, root[1] + t[1] * L], [root[0] + t[0] * L * 0.6 - nn[0] * w * 0.4, root[1] + t[1] * L * 0.6 - nn[1] * w * 0.4], [root[0] - nn[0] * w * 0.5, root[1] - nn[1] * w * 0.5]];
    g.fillStyle = gv(0.95); g.beginPath(); smoothPath(g, pts, true); g.fill();
    ink(g, pts.slice(1, 4), 1.1, gv(0.5, 0.8), { end: 0.2 });
  }
}

function tipWings(P, ly, ry, lx, rx) {
  return P.wings.map((w, i) => {
    const dy = (i === 0 ? ly : ry) - w.T[1], tx = i === 0 ? lx : rx;
    return { ...w, S: i === 0 ? [-92, -78] : [84, -84], Wr: [i === 0 ? -190 : 180, w.Wr[1] + dy * 0.6 - 4], T: [tx, w.T[1] + dy], len: 72, spread: 0.62 };
  });
}
function wings34(t) {
  const f = Math.max(1122, Math.min(1128, Math.round(t * 25)));
  const r = TIPS34.find((x) => x[0] === f) || TIPS34[0];
  const [, tx, ty, far] = r;
  // near wing (viewer-left) raised up and back from a shoulder high on the body's left
  const near = { type: "spread", style: "layered", layer: "back", S: [-150, -95], Wr: [(tx - 150) * 0.58, (ty - 95) * 0.62 - 18], T: [tx, ty], trail: [0.35, 1], len: 80, spread: 0.72, n: 7, m: 5, seed: 41 };
  // far wing: folded against the body's right side (scalloped coverts), or spread again (45.12)
  const farW = far
    ? { type: "spread", style: "layered", layer: "back", S: [30, -95], Wr: [(far[0] + 30) * 0.55, (far[1] - 95) * 0.6 - 20], T: far, trail: [-0.2, 1], len: 74, spread: 0.7, n: 7, m: 5, seed: 43 }
    : { type: "folded", style: "scallop", layer: "front", S: [-20, -95], T: [40, 85], width: 70, back: 30, dir: 1, rows: 3 };
  return [near, farW];
}

// shift the pose's head so that its eyes' midpoint lands on (tx, ty) owl units (the tracked source eyes relative to
// the placed root): the head, tufts, headphones and face move together
function alignHead(pose, tx, ty) {
  const H = headGeom(pose.head), E = pose.eyes || {};
  const e = [-1, 1].map((sd) => H.P(sd * (E.spread ?? 0.44), E.el ?? -0.15));
  const mx = (e[0].x + e[1].x) / 2, my = (e[0].y + e[1].y) / 2;
  pose.head = { ...pose.head, x: (pose.head.x ?? 0) + tx - mx, y: (pose.head.y ?? 0) + ty - my };
}

// t: source time. Returns true if drawn.
export function drawOwlFront(ctx, t) {
  if (t < 44.42 || t > 45.14) return false;
  const h = lerpRow(HEAD, t);
  let s = 0.65 * h[3];
  const P = owlPose("flyToward");
  let pose, x, y, rot = 0, blur = 0, legs;
  // one pear-shaped mass: the body as wide as the head, reaching ~130 units below the root (measured 44.60)
  const body = { x: -10, y: -6, a: 124, b: 108, rot: Math.PI / 2, egg: -0.07 };
  const cupsOver = (g, geo) => { setPPU(s); for (const c of geo.hp ? geo.hp.cups : []) if (c.z >= -0.02) solidCup(g, c, 54); };
  if (t < 44.86) {
    const wink = t < 44.46;
    const [ly, ry] = lerpRow(TIPS, t).slice(1);
    const ft = lerpRow(FEET, t);
    pose = owlPose("flyToward", {
      ...(wink ? { eyes: { right: { state: "shut" }, left: { state: "tired", lid: 0.5, droop: 0.1 } }, beak: { open: 0.05 }, head: { roll: -0.05 } } : {}),
      body, headphones: { bandH: 1.35 }, wings: tipWings(P, ly, ry, -282, 275), feet: [],
      extra: (g, geo) => {
        cupsOver(g, geo);
        // the far wing's tips hanging below the right wing, beside the belly (a soft tuft at +100..+170, 0..+60)
        tuft(g, [96, -8], [0.55, 1], { n: 4, len: 62, w: 20, fan: 0.7 });
      },
    });
    legs = (g) => {
      legFoot(g, [-52, 88], [ft[1], ft[2]], ft[1] < -100 ? [-0.8, 0.6] : [-0.08, 1], { toe: 48, seed: 2 });
      legFoot(g, [50, 88], [ft[3], ft[4]], [0.1, 1], { toe: 48, seed: 5 });
    };
    // (fix 2: 6 px lower, the wing tips ~10 units in: the front silhouette was ~12 px high and ~20 px wide)
    x = h[1] + 22 * h[3]; y = h[2] + 118 * h[3] + 6; rot = wink ? -0.04 : 0;
    alignHead(pose, -22 / 0.65, -118 / 0.65);
  } else {
    // 3/4 (44.88–45.12): the head turned to the viewer's right, the body a tilted egg swung the same way
    // (fix 1b: turned further, as the source: the near cup side-on at the head's left edge, the far cup hidden, the
    // eyes and beak right of the head's middle)
    const k = Math.min(1, (t - 44.86) / 0.06), YAW34 = t < 44.94 ? 0.75 : 0.6;
    pose = owlPose("flyToward", {
      // (fix 1b: the 3/4 head is taller than the front one below the eyes; its chin reaches ~-95 units, over the body)
      head: { x: -60, y: -200, ry: 115, yaw: YAW34 * k, roll: 0.04 },
      headphones: { yaw: YAW34 * k, far: false, bandH: 1.35 },
      // (measured at 45.00: the body spans x -230..+75, y -110..+100 units, longest from lower left to upper right)
      // (fix 1b: raised to run up behind the head, no gap between them)
      body: { x: -85, y: -18, a: 150, b: 116, rot: -0.28 * k, egg: 0.1 },
      eyes: { state: "glossy", spread: 0.44, look: [0.1, 0.05] },
      beak: { open: 0.45 },
      sweat: null,
      wings: wings34(t),
      feet: [],
      extra: (g, geo) => {
        cupsOver(g, geo);
        // the tail: a tuft of soft feathers low behind (measured x -290..-190, y +60..+100)
        tuft(g, [-175, 55], [-0.9, 0.45], { n: 4, len: 105, w: 26, fan: 0.45 });
      },
    });
    legs = (g) => {
      // rear leg kicked back and down (foot at x -222..-172, y +130..+190), front foot lifted forward, toes up-right
      legFoot(g, [-165, 88], [-192, 146], [-0.25, 1], { toe: 42, seed: 2 });
      legFoot(g, [-8, 88], [18, 112], [0.95, -0.35], { toe: 40, seed: 5, spread: 0.45 });
    };
    x = h[1] + 22 * h[3] - 12; y = h[2] + 118 * h[3] + 12; rot = 0.02;
    alignHead(pose, -10 / 0.65, -125 / 0.65);
    const z = lerpRow(SIZE34, t);
    y = 530 + (y - 530) * z[1] + z[3]; x += z[2]; s *= z[1];
    // (44.88: the source is soft over the whole frame, only a little: Laplacian variance 271 vs ~700 either side)
    if (t < 44.9) blur = 0.8;
  }
  if (blur) { ctx.save(); ctx.filter = `blur(${blur}px)`; }
  // legs and feet first, behind the body, and the far cup behind the head (owl units: the preset's origin at (x, y),
  // scale s); owlInk then draws only the near cups (replaced by solid ones in `extra`)
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s); ctx.lineCap = "round"; ctx.lineJoin = "round";
  setPPU(s); legs(ctx);
  const hg = headphoneGeom(headGeom(pose.head), pose.headphones);
  for (const sg of hg.segs) if (!sg.front) drawBandSlim(ctx, sg.pts, { w: pose.headphones.w ?? 16, ends: sg.ends });
  // (fix 1b: in the 3/4 frames the far cup is hidden behind the turned head, as in the source)
  if (t < 44.86) for (const c of hg.cups) if (c.z < -0.02) solidCup(ctx, c, 54);
  ctx.restore();
  pose.headphones = { ...pose.headphones, far: false };
  drawOwl(ctx, { ...pose, x, y, s, rot, tone: false });
  if (blur) ctx.restore();
  return true;
}
