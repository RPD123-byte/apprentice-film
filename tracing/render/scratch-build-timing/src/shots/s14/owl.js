// s14 owl: five states, built on the shared B&W owl kit (src/lib/owlInk.js) with per-shot parts.
//   front  36.92-37.10  standing facing us, both wings still raised and spread from the fright (s13's end)
//   turn   37.12-37.16  swinging round to the right, eyes shut mid-turn (2 frames)
//   side   37.20-38.48  side view, facing the lit gap on the right, dead still but for a breath
//   fly    38.52-39.96  seen from behind, wings out, legs tucked, banking, flying away toward the gap
//   run    40.00-40.68  seen from behind, hopping along the floor, wings half up, a soft shadow under it
// Front / turn / side are specified in FRAME PIXELS measured on the source (tools/grid.py + 3-5x zoom crops of
// 37.00, 37.12, 37.16 and 37.60) and converted to owl units, so every feature lands where the source has it.
// The kit supplies the plumage, wings, tail and feet; the eyes, headphones, beak and bandage are drawn here
// through the kit's `extra` hook, because the source draws them differently from the kit's defaults (grey irises
// with catchlights, dark cups, a thin dark band).
import { owlLayer, owlPose, plumage, softShade, ink, gv, V, LINE, headGeom, tuftShape, bodyOutline, edgeFlicks, regionFlicks, drawBandage, setPPU } from "../../lib/owlInk.js";
import { smoothPath, sampleCurve } from "../../lib/paths.js";
import { rng } from "../../lib/rng.js";
const { add, mul, nrm } = V;
const TAU = Math.PI * 2;
const blobPath = (pts) => (c) => smoothPath(c, pts, true);

// frame px -> owl units about a root
const conv = (root, s) => ({ P: (p) => [(p[0] - root[0]) / s, (p[1] - root[1]) / s], L: (v) => v / s });

// ---------------------------------------------------------------- parts (owl units)
// Front eye as the source draws it: dark outer ring, white ring, a grey iris darker at the top with a lighter
// crescent low down, a slightly darker pupil, one big catchlight upper right and two small ones low down.
function irisEye(g, x, y, R) {
  g.fillStyle = gv(0.97); g.beginPath(); g.arc(x, y, R, 0, TAU); g.fill();
  const ir = R * 0.72, ix = x + R * 0.02, iy = y + R * 0.02;
  const grd = g.createLinearGradient(0, iy - ir, 0, iy + ir);
  grd.addColorStop(0, gv(0.1)); grd.addColorStop(0.55, gv(0.2)); grd.addColorStop(0.85, gv(0.36)); grd.addColorStop(1, gv(0.3));
  g.fillStyle = grd; g.beginPath(); g.arc(ix, iy, ir, 0, TAU); g.fill();
  g.fillStyle = gv(0.06, 0.8); g.beginPath(); g.arc(ix, iy - ir * 0.08, ir * 0.5, 0, TAU); g.fill();
  g.strokeStyle = gv(0.06); g.lineWidth = R * 0.07; g.beginPath(); g.arc(ix, iy, ir, 0, TAU); g.stroke();
  g.fillStyle = gv(0.99); g.beginPath(); g.arc(ix + ir * 0.3, iy - ir * 0.44, ir * 0.2, 0, TAU); g.fill();
  g.fillStyle = gv(0.9, 0.9); g.beginPath(); g.arc(ix - ir * 0.46, iy + ir * 0.42, ir * 0.09, 0, TAU); g.fill();
  g.beginPath(); g.arc(ix + ir * 0.52, iy + ir * 0.36, ir * 0.08, 0, TAU); g.fill();
  // outer ring (heavier along the top: the lid), and a faint socket line outside it
  g.strokeStyle = LINE; g.lineWidth = R * 0.1; g.beginPath(); g.arc(x, y, R, 0, TAU); g.stroke();
  ink(g, sampleCurve([[x - R * 0.98, y - R * 0.1], [x - R * 0.6, y - R * 0.84], [x + R * 0.1, y - R * 1.02], [x + R * 0.8, y - R * 0.66], [x + R * 1.0, y - R * 0.05]], 4), R * 0.17, LINE, { end: 0.15 });
  ink(g, sampleCurve([[x - R * 1.2, y + R * 0.2], [x - R * 0.95, y - R * 0.75], [x, y - R * 1.28], [x + R * 0.95, y - R * 0.8], [x + R * 1.22, y + R * 0.1]], 4), R * 0.05, gv(0.4, 0.55), { end: 0.2 });
}
// A dark headphone cup seen square-on from the side, or edge-on from the front: a dark shell with a lighter
// rim arc on the lit side, a plate ring, a dark keyline.
function darkCup(g, x, y, rx, ry, { plate = 0.72, rimSide = 1, shell = 0.3, plateV = 0.26 } = {}) {
  const sh = (c) => c.ellipse(x, y, rx, ry, 0, 0, TAU);
  g.fillStyle = gv(shell); g.beginPath(); sh(g); g.fill();
  g.save(); g.beginPath(); sh(g); g.clip();
  g.fillStyle = gv(0.12, 0.6); g.beginPath(); g.ellipse(x - rimSide * rx * 0.25, y + ry * 0.2, rx * 0.9, ry * 0.9, 0, 0, TAU); g.fill();
  if (plate > 0) {
    const px = x + rimSide * rx * 0.06, py = y + ry * 0.04;
    g.fillStyle = gv(plateV); g.beginPath(); g.ellipse(px, py, rx * plate, ry * plate, 0, 0, TAU); g.fill();
    g.strokeStyle = gv(0.48, 0.9); g.lineWidth = Math.min(rx, ry) * 0.06; g.beginPath(); g.ellipse(px, py, rx * plate, ry * plate, 0, 0, TAU); g.stroke();
    g.strokeStyle = gv(0.1, 0.9); g.lineWidth = Math.min(rx, ry) * 0.05; g.beginPath(); g.ellipse(px, py, rx * plate * 1.1, ry * plate * 1.1, 0, 0, TAU); g.stroke();
  }
  // a light "C" along the rim on the lit side
  g.strokeStyle = gv(0.62, 0.85); g.lineWidth = Math.min(rx, ry) * 0.09;
  g.beginPath(); g.ellipse(x, y, rx * 0.88, ry * 0.9, 0, rimSide > 0 ? -1.1 : Math.PI - 1.1, rimSide > 0 ? 1.1 : Math.PI + 1.1); g.stroke();
  g.restore();
  g.strokeStyle = LINE; g.lineWidth = Math.min(rx, ry) * 0.09; g.beginPath(); sh(g); g.stroke();
}
// headphone band: a dark strip with a thin highlight, tapered a little at the ends
function darkBand(g, pts, w, hi = 0.5) {
  const q = sampleCurve(pts, 6);
  ink(g, q, w + 2.2, LINE, { end: 0.85, pow: 0.2 });
  ink(g, q, w * 0.7, gv(0.24), { end: 0.8, pow: 0.2 });
  ink(g, q.map(([x, y]) => [x - w * 0.12, y - w * 0.18]), Math.max(1, w * 0.16), gv(hi, 0.8), { end: 0.4 });
}

// ---------------------------------------------------------------- FRONT (s = 0.72, root at the body centre)
const FR = { root: [650, 718], s: 0.72 };
function frontPose() {
  const { P, L } = conv(FR.root, FR.s);
  const hc = P([676, 622]);
  const pose = owlPose("front", {
    head: { x: hc[0], y: hc[1], rx: L(71), ry: L(70), square: 2.3, jowl: 0.06 },
    tufts: [{ at: -0.86, size: L(9), width: 0.22, lean: -0.1, second: 0.4, curl: 0.1 }, { at: 0.74, size: L(22), width: 0.3, lean: 0.2, second: 0.55, curl: 0.25 }],
    body: { x: 0, y: -2, a: L(80), b: L(91), rot: Math.PI / 2, egg: -0.08 },
    eyes: { state: "wide", r: 0.5, spread: 0.49, el: -0.14 },
    beak: { el: -Math.asin(L(28) / (L(70) * 1.25)), lift: 1.25, w: L(21), l: L(26) },
    bandage: null,
    disc: 0,
    headphones: { on: false },
    wings: [],
    feet: [
      { ...pt(P([622, 790])), rot: 0.2, size: L(21), mode: "stand", leg: 3, spread: 0.7, seed: 2 },
      { ...pt(P([690, 788])), rot: -0.25, size: L(17), mode: "stand", leg: 3, spread: 0.6, seed: 5 },
      pin(P([660, 508])), pin(P([494, 806])), pin(P([796, 628])),
    ],
    extra: (g) => {
      // facial disc: faint brows meeting in a V above the beak, cheek lines
      const col = gv(0.45, 0.55);
      ink(g, sampleCurve([P([603, 606]), P([618, 594]), P([642, 590]), P([663, 600]), P([674, 614])], 4), 1.6, col, { end: 0.2 });
      ink(g, sampleCurve([P([680, 612]), P([692, 597]), P([712, 591]), P([732, 596]), P([744, 612])], 4), 1.6, col, { end: 0.2 });
      ink(g, sampleCurve([P([606, 648]), P([622, 666]), P([645, 673]), P([664, 668])], 4), 1.4, gv(0.5, 0.45), { end: 0.2 });
      ink(g, sampleCurve([P([692, 668]), P([714, 671]), P([734, 662]), P([746, 646])], 4), 1.4, gv(0.5, 0.45), { end: 0.2 });
      // wings, both raised and spread from the shoulders (traced from 3x crops of the source at 37.00)
      frontWing(g, P, L, FWING_L);
      frontWing(g, P, L, FWING_R);
      irisEye(g, ...P([642, 632]), L(18));
      irisEye(g, ...P([708, 632]), L(18));
      drawBandage(g, { x: P([641, 571])[0], y: P([641, 571])[1], size: L(44), rot: -0.42, sx: 1, sy: 0.9 });
      // headphones: a thin dark band arching well above the crown, narrow dark cups on the sides of the head
      darkBand(g, [[575, 590], [583, 562], [602, 540], [630, 527], [660, 522], [690, 525], [718, 537], [740, 560], [751, 590]].map(P), L(4.2));
      darkCup(g, ...P([577, 618]), L(14), L(31), { plate: 0.55, rimSide: -1, shell: 0.22, plateV: 0.16 });
      darkCup(g, ...P([752, 620]), L(15), L(31), { plate: 0.55, rimSide: 1, shell: 0.22, plateV: 0.16 });
      unpin(g, pose.feet);
    },
  });
  return pose;
}
function pt(p) { return { x: p[0], y: p[1] }; }
// an invisible "foot" that only widens the kit's layer bbox (props drawn in `extra` beyond the bird's own parts)
function pin(p) { return { x: p[0], y: p[1], size: 0.01, mode: "stand", leg: 0, toes: 1, pin: true }; }
// the kit still draws a hairline speck for a pin: rub it out (called last in `extra`)
function unpin(g, feet) {
  g.save(); g.globalCompositeOperation = "destination-out";
  for (const f of feet) if (f.pin) { g.beginPath(); g.arc(f.x, f.y, 6, 0, TAU); g.fill(); }
  g.restore();
}
// front wings in frame px: outline, primaries (root -> tip), covert scallop rows, an extra lower feather
const FWING_L = {
  out: [[598, 660], [585, 640], [563, 630], [540, 630], [520, 643], [507, 673], [500, 710], [499, 750], [504, 787], [510, 803], [517, 790], [522, 778], [532, 768], [548, 757], [562, 742], [575, 725], [592, 700], [602, 680]],
  prim: [[[552, 648], [510, 798]], [[563, 660], [518, 781]], [[574, 672], [532, 766]], [[585, 684], [548, 756]], [[595, 694], [563, 740]]],
  rows: [[[512, 700], [528, 708], [545, 702], [562, 709], [580, 704], [598, 712]], [[520, 668], [537, 675], [555, 668], [572, 676], [590, 670]]],
  extra: [[586, 764], [560, 774], [536, 789], [523, 803], [546, 800], [572, 792], [596, 781]],
  light: [0.6, -0.8],
};
const FWING_R = {
  out: [[737, 655], [752, 640], [770, 632], [783, 632], [790, 643], [792, 667], [788, 693], [780, 720], [767, 743], [750, 763], [733, 774], [731, 758], [737, 730], [740, 700], [740, 675]],
  prim: [[[765, 660], [735, 770]], [[775, 665], [750, 760]], [[783, 675], [765, 742]], [[789, 686], [779, 717]]],
  rows: [[[744, 690], [754, 699], [764, 689], [774, 698], [786, 686]]],
  light: [-0.6, -0.8],
};
function frontWing(g, P, L, W) {
  const out = W.out.map(P);
  plumage(g, blobPath(out), { base: 0.97, shade: 0.74, depth: L(14), blur: L(5), light: W.light });
  g.save(); g.beginPath(); smoothPath(g, out, true); g.clip();
  for (const [a, b] of W.prim) {
    const A = P(a), B = P(b), m = V.mix(A, B, 0.5), n = nrm([-(B[1] - A[1]), B[0] - A[0]]);
    ink(g, [A, add(m, mul(n, L(2))), B], L(1.3), gv(0.3, 0.75), { end: 0.1, bias: 0.7 });
    ink(g, [add(A, mul(n, L(3))), add(m, mul(n, L(4))), add(B, mul(n, L(2)))], L(0.8), gv(0.55, 0.4), { end: 0.1 });
  }
  for (const row of W.rows) {
    const q = row.map(P);
    for (let i = 0; i < q.length - 1; i++) ink(g, [q[i], add(V.mix(q[i], q[i + 1], 0.5), [0, L(4)]), q[i + 1]], L(1.3), gv(0.3, 0.7), { end: 0.2 });
  }
  g.restore();
  if (W.extra) {
    const e = W.extra.map(P);
    plumage(g, blobPath(e), { base: 0.95, shade: 0.72, depth: L(6), blur: L(3), light: W.light });
    ink(g, e.slice(0, 4), L(1.4), LINE, { end: 0.2 });
  }
  ink(g, sampleCurve(out, 3).concat([out[0]]), L(1.4), gv(0.2, 0.9), { end: 0.6, pow: 0.2 });
}

// ---------------------------------------------------------------- SIDE / TURN (s = 0.8)
// spec in frame px: head, body, tail, wing, feet, cup, band, eye, beak
const SIDE_SPEC = {
  root: [650, 725], s: 0.8,
  head: { c: [677, 604], rx: 83, ry: 66, roll: 0.02 },
  tuft: { at: -0.74, size: 22 },
  body: { c: [651, 719], a: 72, b: 90, rot: 1.7, egg: 0.0 },
  tail: { base: [604, 772], tip: [561, 818], w: 30 },
  // the folded wing, traced from a 3x crop of 37.60: leading edge from the shoulder under the head down to the tip by
  // the tail, the lower/right edge along the body; scalloped covert rows and primaries inside
  wing: {
    out: [[737, 667], [712, 668], [683, 677], [662, 690], [650, 703], [638, 720], [630, 737], [623, 755], [619, 772], [616, 786], [630, 787], [652, 782], [676, 778], [694, 771], [713, 753], [727, 730], [737, 705], [741, 685]],
    rows: [[[684, 682], [698, 690], [712, 686], [726, 694], [739, 690]], [[652, 716], [668, 722], [684, 716], [700, 724], [716, 718], [733, 726]], [[634, 746], [652, 752], [670, 746], [688, 753], [706, 746], [722, 750]]],
    prim: [[[640, 752], [620, 784]], [[660, 756], [634, 786]], [[682, 758], [656, 783]], [[702, 757], [680, 778]]],
  },
  // feet (traced from the 3x crop): a short thick leg from the belly, two toes forward along the floor, one back
  feet: [
    { leg: [[634, 784], [637, 806]], toes: [[[637, 806], [662, 811]], [[637, 806], [652, 815]], [[636, 806], [620, 811]]] },
    { leg: [[686, 788], [690, 808]], toes: [[[690, 808], [716, 814]], [[690, 808], [706, 818]], [[689, 808], [670, 814]]] },
  ],
  cup: { c: [666, 608], rx: 31, ry: 33 }, yoke: [656, 524, 24, 58],
  band: [[668, 548], [668, 534], [673, 523], [684, 515], [699, 513], [711, 520], [717, 533], [719, 547]],
  eye: { c: [731, 616], rx: 11, ry: 16, iris: [733.5, 616], irx: 6.5, iry: 11, catch: [734.5, 610.5] },
  beak: [[744, 641], [751, 638], [756, 640], [759, 646], [758, 653], [756, 659], [753, 654], [749, 650], [745, 648]],
  smile: [[748, 650], [742, 654], [736, 655]],
  face: [[703, 578], [696, 600], [692, 627], [699, 657]],
};
const TURN_SPEC = [
  { ...SIDE_SPEC, root: [645, 730],
    head: { c: [679, 612], rx: 79, ry: 67, roll: 0.05 },
    tuft: { at: -0.8, size: 22 },
    // mid-turn the body leans well forward: from the tail (530,815) up to the chest (~745,690)
    body: { c: [645, 742], a: 104, b: 76, rot: 2.55, egg: 0.1 },
    tail: { base: [572, 794], tip: [528, 816], w: 24 },
    wing: null,
    feet: SIDE_SPEC.feet.map((f) => ({ leg: f.leg.map(([x, y]) => [x - 16, y + 4]), toes: f.toes.map((t) => t.map(([x, y]) => [x - 16, y + 4])) })),
    cup: { c: [646, 613], rx: 33, ry: 36 }, yoke: [634, 544, 23, 42],
    band: [[645, 552], [646, 536], [654, 523], [668, 516], [686, 515], [700, 522], [708, 535], [711, 549]],
    eye: null, closed: [[706, 627], [714, 632], [724, 634], [735, 628]],
    beak: [[745, 641], [751, 637], [756, 640], [758, 650], [756, 662], [752, 654], [748, 649]],
    smile: [[748, 651], [742, 655]],
    face: [[700, 585], [694, 610], [694, 640], [702, 662]],
  },
];
TURN_SPEC.push({ ...TURN_SPEC[0], root: [648, 729], head: { ...TURN_SPEC[0].head, c: [681, 610] }, cup: { c: [649, 610], rx: 33, ry: 36 }, yoke: [637, 541, 23, 42],
  band: TURN_SPEC[0].band.map(([x, y]) => [x + 3, y - 2]), closed: TURN_SPEC[0].closed.map(([x, y]) => [x + 2, y - 2]),
  beak: TURN_SPEC[0].beak.map(([x, y]) => [x + 2, y - 1]), smile: TURN_SPEC[0].smile.map(([x, y]) => [x + 2, y - 1]),
  body: { ...TURN_SPEC[0].body, c: [648, 738], rot: 2.45 }, tail: { base: [580, 794], tip: [540, 816], w: 24 } });

const shiftWing = (W, [dx, dy]) => ({ out: W.out.map(([x, y]) => [x + dx, y + dy]), rows: W.rows.map((r) => r.map(([x, y]) => [x + dx, y + dy])), prim: W.prim.map((r) => r.map(([x, y]) => [x + dx, y + dy])) });
function sideFeet(g, P, L, feet) {
  for (const f of feet) {
    const lg = f.leg.map(P);
    ink(g, lg, L(14), LINE, { end: 0.95, pow: 0.15 }); ink(g, lg, L(11), gv(0.9), { end: 0.95, pow: 0.15 });
    for (const [a, b] of f.toes) {
      const A = P(a), B = P(b), d = nrm(V.sub(B, A));
      ink(g, [A, V.mix(A, B, 0.5), B], L(6.5), LINE, { end: 0.5, pow: 0.3 });
      ink(g, [A, V.mix(A, B, 0.5), B], L(4.4), gv(0.88), { end: 0.5, pow: 0.3 });
      const tip = add(B, add(mul(d, L(4)), [0, L(2)]));
      ink(g, [add(B, mul(d, -L(1))), tip], L(2.4), gv(0.12), { end: 0.1 });
    }
  }
}
function sideWing(g, P, L, W) {
  const out = W.out.map(P);
  plumage(g, blobPath(out), { base: 0.97, shade: 0.8, depth: L(12), blur: L(5), light: [-0.6, -0.8] });
  softShade(g, blobPath(out), (c) => { const q = P([700, 775]); c.ellipse(q[0], q[1], L(50), L(16), -0.3, 0, TAU); }, 0.74, 0.45, L(8));
  g.save(); g.beginPath(); smoothPath(g, out, true); g.clip();
  for (const row of W.rows) {
    const q = row.map(P);
    for (let i = 0; i < q.length - 1; i++) ink(g, [q[i], add(V.mix(q[i], q[i + 1], 0.5), [L(-1), L(5)]), q[i + 1]], L(1.3), gv(0.32, 0.75), { end: 0.2 });
  }
  for (const [a, b] of W.prim) ink(g, [P(a), V.mix(P(a), P(b), 0.5), P(b)], L(1.3), gv(0.3, 0.75), { end: 0.1, bias: 0.3 });
  g.restore();
  ink(g, sampleCurve(out.slice(0, 11), 4), L(1.5), gv(0.25, 0.85), { end: 0.2 });
}
function sidePose(sp) {
  const { P, L } = conv(sp.root, sp.s);
  const hc = P(sp.head.c), bc = P(sp.body.c);
  const pose = owlPose("walk", {
    head: { x: hc[0], y: hc[1], rx: L(sp.head.rx), ry: L(sp.head.ry), yaw: 1.2, roll: sp.head.roll, pitch: 0, square: 2.2, jowl: 0.04 },
    tufts: [{ at: sp.tuft.at, size: L(sp.tuft.size), width: 0.3, lean: -0.35, second: 0.5, curl: 0.12 }],
    body: { x: bc[0], y: bc[1], a: L(sp.body.a), b: L(sp.body.b), rot: sp.body.rot, egg: sp.body.egg },
    tail: { base: P(sp.tail.base), tip: P(sp.tail.tip), w: L(sp.tail.w), n: 2 },
    wings: [],
    feet: [pin(P([690, 497])), pin(P([724, 824]))],
    eyes: { state: "wide", r: 0.5, spread: 0.42, el: -0.1, left: null },
    beak: { el: 0, lift: 0.3, w: 0.2, l: 0.2 },
    bandage: null, disc: 0,
    headphones: { on: false },
    extra: (g) => {
      sideFeet(g, P, L, sp.feet);
      sideWing(g, P, L, sp.wing || shiftWing(SIDE_SPEC.wing, sp.wingShift || [-12, 8]));
      ink(g, sampleCurve(sp.face.map(P), 4), 1.6, gv(0.55, 0.5), { end: 0.2 });
      // eye
      if (sp.eye) {
        const e = sp.eye, c = P(e.c), ic = P(e.iris), cc = P(e.catch);
        g.fillStyle = gv(0.98); g.beginPath(); g.ellipse(c[0], c[1], L(e.rx), L(e.ry), 0.05, 0, TAU); g.fill();
        g.fillStyle = gv(0.07); g.beginPath(); g.ellipse(ic[0], ic[1], L(e.irx), L(e.iry), 0.05, 0, TAU); g.fill();
        g.fillStyle = gv(0.28, 0.8); g.beginPath(); g.ellipse(ic[0], ic[1] + L(e.iry) * 0.55, L(e.irx) * 0.6, L(e.iry) * 0.25, 0, 0, TAU); g.fill();
        g.fillStyle = gv(0.99); g.beginPath(); g.arc(cc[0], cc[1], L(2.4), 0, TAU); g.fill();
        g.strokeStyle = LINE; g.lineWidth = L(1.6); g.beginPath(); g.ellipse(c[0], c[1], L(e.rx), L(e.ry), 0.05, 0, TAU); g.stroke();
        ink(g, sampleCurve([P([e.c[0] - e.rx * 0.95, e.c[1] - e.ry * 0.2]), P([e.c[0] - e.rx * 0.3, e.c[1] - e.ry * 0.98]), P([e.c[0] + e.rx * 0.6, e.c[1] - e.ry * 0.85]), P([e.c[0] + e.rx, e.c[1] - e.ry * 0.1])], 4), L(2.4), LINE, { end: 0.2 });
      } else if (sp.closed) {
        ink(g, sampleCurve(sp.closed.map(P), 4), L(2.6), LINE, { end: 0.12, bias: 0.45 });
        const q = sp.closed.map(P), e = q[q.length - 1];
        ink(g, [e, add(e, [L(4), L(-4)])], L(1.4), LINE, { end: 0.1 });
      }
      // beak: hooked upper mandible, darker underside, the smile line back from its base
      const bp = sp.beak.map(P);
      g.fillStyle = gv(0.8); g.beginPath(); smoothPath(g, bp, true); g.fill();
      g.save(); g.beginPath(); smoothPath(g, bp, true); g.clip();
      g.fillStyle = gv(0.5, 0.7); g.beginPath(); g.ellipse(bp[5][0] - L(3), bp[5][1] - L(4), L(6), L(8), 0.3, 0, TAU); g.fill();
      g.restore();
      g.strokeStyle = LINE; g.lineWidth = L(1.5); g.beginPath(); smoothPath(g, bp, true); g.stroke();
      ink(g, sampleCurve(sp.smile.map(P), 4), L(1.6), LINE, { end: 0.15 });
      // headphones: the band over the crown, the yoke, the cup square to us
      darkBand(g, sp.band.map(P), L(11), 0.46);
      const [yx, yy, yw, yh] = sp.yoke, y0 = P([yx, yy]);
      g.fillStyle = gv(0.22); g.strokeStyle = LINE; g.lineWidth = L(1.5);
      g.beginPath(); g.roundRect(y0[0], y0[1], L(yw), L(yh), L(4)); g.fill(); g.stroke();
      darkCup(g, ...P(sp.cup.c), L(sp.cup.rx), L(sp.cup.ry), { plate: 0.74, rimSide: 1, shell: 0.3, plateV: 0.34 });
      unpin(g, pose.feet);
    },
  });
  return pose;
}

// ---------------------------------------------------------------- the owl from behind (custom painter)
// From behind the source owl is one soft round mass: the head as wide as the body, the headphone cups dark and
// textured on the sides of the head (the one turned toward us wider, the far one half hidden), a thin dark band
// over the crown, broad wings of pointed primaries from the shoulders, short tucked legs with long pale toes
// hanging down, a tail tuft at the lower right. Owl units, root = middle of the body.
const BH = { x: 0, y: -116, rx: 118, ry: 101, square: 2.1, jowl: 0.0, yaw: 0, pitch: 0, roll: 0 };
const BODY = { x: 0, y: 28, a: 124, b: 138, rot: Math.PI / 2, egg: -0.12 };
const HEAD_TOP = BH.y - BH.ry;            // white top of the head, units (for placement from the source bbox top)
function pointedFeather(root, dir, L, w) {
  const n = [-dir[1], dir[0]];
  const P = (a, b) => add(add(root, mul(dir, a)), mul(n, b));
  return [P(0, -w * 0.36), P(L * 0.5, -w * 0.5), P(L * 0.86, -w * 0.26), P(L, 0), P(L * 0.86, w * 0.26), P(L * 0.5, w * 0.5), P(0, w * 0.36)];
}
function backWing(g, sd, raise, light, seed, k = 1) {
  const r = rng(seed);
  const S = [sd * 96, -42];
  const u = [sd * Math.cos(raise), -Math.sin(raise)];
  const T = add(S, mul(u, 124 * k));
  const n = [-u[1] * sd, u[0] * sd];
  const down = nrm([sd * 0.35, 1]);
  const N = 12, fs = [];
  for (let i = 0; i < N; i++) {
    const f = 0.06 + (0.94 * i) / (N - 1);
    const root = add(V.mix(S, T, f), mul(n, -4));
    const out = nrm([sd, 0.05 - 0.3 * raise]);
    const dir = nrm(V.mix(down, out, Math.pow(f, 1.1) * 0.95));
    const L = (44 + 58 * Math.pow(f, 0.8) + r() * 10) * (0.6 + 0.4 * k);
    fs.push({ root, dir, L, w: 24 + 8 * f });
  }
  for (let i = N - 1; i >= 0; i--) {
    const f = fs[i], sh = pointedFeather(f.root, f.dir, f.L, f.w);
    plumage(g, blobPath(sh), { base: 0.95, shade: 0.72, depth: f.w * 0.3, blur: f.w * 0.2, light });
    ink(g, sh.slice(1, 6), 1.3, gv(0.36, 0.8), { end: 0.2 });
    ink(g, [add(f.root, mul(f.dir, f.L * 0.15)), add(f.root, mul(f.dir, f.L * 0.85))], 0.8, gv(0.5, 0.55), { end: 0.1 });
  }
  // the covert band along the leading edge, rows of small feathers
  const lead = sampleCurve([S, add(V.mix(S, T, 0.5), mul(n, -10)), T], 8);
  const band = [...lead];
  for (let i = lead.length - 1; i >= 0; i--) { const q = i / (lead.length - 1); band.push(add(lead[i], mul(nrm(V.mix(down, u, q * 0.5)), 48 * (1 - 0.65 * q)))); }
  plumage(g, blobPath(band), { base: 0.98, shade: 0.8, depth: 14, blur: 6, light });
  for (let row = 0; row < 2; row++) for (let i = 1; i < 7; i++) {
    const q = i / 7, p = lead[Math.round(q * (lead.length - 1))];
    const d = nrm(V.mix(down, u, q * 0.5)), base = add(p, mul(d, 14 + row * 16));
    ink(g, [add(base, mul(u, -10)), add(base, mul(d, 9)), add(base, mul(u, 11))], 0.9, gv(0.5, 0.5), { end: 0.2 });
  }
  ink(g, lead, 1.6, gv(0.32, 0.8), { end: 0.3 });
}
// a short tucked leg: a feathered stub and a foot of three long pale toes hanging down (seen from behind)
function backLeg(g, sd, ph, seed, light, reach = 1) {
  const a = Math.sin(ph * 2 * Math.PI) * sd;           // + reaches down, - tucks up
  const hip = [sd * 52, 122], L = (44 + 14 * a) * reach;
  const ankle = [hip[0] + sd * (6 + 4 * a), hip[1] + L + 22];
  plumage(g, (c) => c.ellipse(hip[0] + sd * 3, hip[1] + L * 0.4 + 8, 32, L * 0.5 + 24, -sd * 0.15, 0, 2 * Math.PI), { base: 0.95, shade: 0.74, depth: 8, blur: 5, light });
  const r = rng(seed);
  for (let i = 0; i < 3; i++) {
    const ang = Math.PI / 2 + (i - 1) * 0.42 + sd * 0.12 + (r() - 0.5) * 0.1, Lt = (38 + (i === 1 ? 10 : 0)) * (0.7 + 0.3 * reach);
    const d = [Math.cos(ang), Math.sin(ang)], e = add(ankle, mul(d, Lt));
    const pts = [ankle, add(add(ankle, mul(d, Lt * 0.55)), mul([-d[1], d[0]], 3)), e];
    ink(g, pts, 12, LINE, { end: 0.7, pow: 0.3 });
    ink(g, pts, 8.5, gv(0.88), { end: 0.7, pow: 0.3 });
    ink(g, [add(ankle, mul(d, Lt * 0.5)), add(add(ankle, mul(d, Lt * 0.5)), mul([-d[1], d[0]], 4))], 1.2, gv(0.3, 0.8));
    const tip = add(e, mul(d, 11));
    ink(g, [add(e, mul(d, -2)), add(add(e, mul(d, 6)), mul([-d[1], d[0]], 2)), tip], 5, gv(0.15), { end: 0.1 });
  }
  plumage(g, (c) => c.ellipse(ankle[0], ankle[1] - 4, 14, 11, 0, 0, 2 * Math.PI), { base: 0.9, shade: 0.7, depth: 3, blur: 2, light });
}
function backTail(g, light) {
  for (const [bx, by, dx, dy, L] of [[62, 112, 0.55, 0.84, 58], [80, 100, 0.85, 0.55, 50], [44, 124, 0.25, 1, 48]]) {
    const sh = pointedFeather([bx, by], nrm([dx, dy]), L, 24);
    plumage(g, blobPath(sh), { base: 0.93, shade: 0.72, depth: 5, blur: 3, light });
    ink(g, sh.slice(1, 6), 1.2, gv(0.38, 0.8), { end: 0.2 });
  }
}
// a cup seen from behind the head; z > 0 = turned toward us (wider, drawn over the head)
function backCup(g, x, y, sd, face) {
  const w = 20 + 18 * face, h = 54;
  const shape = (c) => c.ellipse(x, y, w, h, 0, 0, TAU);
  g.fillStyle = gv(0.2); g.beginPath(); shape(g); g.fill();
  g.save(); g.beginPath(); shape(g); g.clip();
  // textured shell: vertical rim streaks, a grey sheen on the outer side
  const r = rng(sd > 0 ? 71 : 73);
  for (let i = 0; i < 16; i++) {
    const xx = x + (r() - 0.5) * 2 * w * 0.9, a = 0.25 + r() * 0.3;
    ink(g, [[xx, y - h * 0.8], [xx + (r() - 0.5) * 4, y], [xx, y + h * 0.8]], 1.2 + r() * 1.6, gv(r() < 0.5 ? 0.42 : 0.08, a), { end: 0.3 });
  }
  g.fillStyle = gv(0.5, 0.5); g.beginPath(); g.ellipse(x + sd * w * 0.55, y - h * 0.1, w * 0.3, h * 0.8, 0, 0, TAU); g.fill();
  if (face > 0.2) { g.strokeStyle = gv(0.45, 0.8); g.lineWidth = 2.4; g.beginPath(); g.ellipse(x + sd * w * 0.1, y, w * 0.68, h * 0.74, 0, 0, TAU); g.stroke(); }
  g.restore();
  g.strokeStyle = LINE; g.lineWidth = 2.6; g.beginPath(); shape(g); g.stroke();
}
function paintBack(g, { wL, wR, legPh, light = [-0.55, -0.83], span = 1, phi = 0, reach = 1, wide = 1 }) {
  const H = headGeom(BH);
  const body = bodyOutline({ ...BODY, b: BODY.b * wide });
  const sil = (c) => { smoothPath(c, H.out, true); smoothPath(c, body, true); };
  // headphone geometry: the ear axis turned by phi (+ = the owl's right ear, frame right, toward us)
  const R = BH.rx * 1.02, cy = -100;
  const cups = [-1, 1].map((sd) => ({ sd, x: sd * R * 1.1 * Math.cos(phi), z: sd * Math.sin(phi) }));
  const band = [];
  for (let i = 0; i <= 32; i++) {
    const al = Math.PI * (i / 32);          // 0 = right cup, pi = left cup
    const c = Math.cos(al);
    band.push({ p: [R * 0.98 * c * Math.cos(phi), cy - 44 - 92 * Math.sin(al)], z: c * Math.sin(phi) });
  }
  const run = (front) => { const q = band.filter((b) => (b.z >= -0.05) === front).map((b) => b.p); return q; };
  // far cup and the far run of the band, behind the head
  for (const c of cups) if (c.z < 0) backCup(g, c.x, cy, c.sd, 0);
  const bb = run(false); if (bb.length > 1) darkBand(g, bb, 6, 0.4);
  backLeg(g, -1, legPh, 2, light, reach); backLeg(g, 1, legPh + 0.5, 5, light, reach);
  plumage(g, sil, { base: 0.97, shade: 0.76, depth: 44, blur: 16, light });
  softShade(g, sil, (c) => c.ellipse(110, 50, 60, 120, -0.2, 0, 7), 0.72, 0.4, 26);
  softShade(g, sil, (c) => c.ellipse(0, 150, 120, 24, 0, 0, 7), 0.72, 0.35, 16);
  const tuft = tuftShape(H, { at: -0.62, size: 22, width: 0.3, lean: -0.3, second: 0.45, curl: 0.12 });
  plumage(g, blobPath(tuft.pts), { base: 0.97, shade: 0.8, depth: 6, blur: 3, light });
  ink(g, [tuft.inner, V.mix(tuft.inner, tuft.tip, 0.6), tuft.tip], 1.3, gv(0.42, 0.65));
  // fluffy texture: feather flicks round the rim and scattered over the back
  edgeFlicks(g, body, { step: 12, len: 11, w: 1.0, color: gv(0.55, 0.45), ang: 1.0, seed: 3 });
  edgeFlicks(g, H.out, { step: 16, len: 9, w: 0.9, color: gv(0.6, 0.35), ang: 1.1, seed: 4 });
  regionFlicks(g, 20, 60, 100, 70, 1.7, 26, 12, 7, { color: gv(0.55, 0.3) });
  regionFlicks(g, -10, -116, 90, 60, 1.5, 14, 10, 9, { color: gv(0.6, 0.25) });
  backTail(g, light);
  backWing(g, -1, wL, light, 17, span); backWing(g, 1, wR, light, 23, span);
  const fb = run(true); if (fb.length > 1) darkBand(g, fb, 6, 0.45);
  for (const c of cups) if (c.z >= 0) backCup(g, c.x, cy, c.sd, Math.min(1, c.z * 1.6));
}
export function backLayer(o) {
  const { s, res = 1 } = o;
  const x0 = -340, y0 = -262, x1 = 340, y1 = 262;
  const cw = Math.ceil((x1 - x0) * s * res), ch = Math.ceil((y1 - y0) * s * res);
  const c = document.createElement("canvas"); c.width = cw; c.height = ch;
  const g = c.getContext("2d");
  g.setTransform(s * res, 0, 0, s * res, -x0 * s * res, -y0 * s * res);
  setPPU(s * res);
  paintBack(g, o);
  setPPU(1);
  return { canvas: c, x: x0 * s, y: y0 * s, w: (x1 - x0) * s, h: (y1 - y0) * s };
}

// ---------------------------------------------------------------- placement tables (frame px)
// fly: per source frame [t, cx, cy, area, top] of the owl blob at luma > 150 (centroid, area, bbox top). Scale from the
// (3-frame smoothed) area, height from the bbox top: the whole bird bobs with the flap and the table follows it.
export const FLY = [
  [38.52, 741, 648, 44266, 517], [38.56, 767, 655, 42373, 527], [38.60, 797, 661, 40527, 535], [38.64, 821, 670, 39289, 546],
  [38.68, 843, 657, 39038, 534], [38.72, 862, 661, 38926, 538], [38.76, 894, 669, 36743, 550], [38.80, 911, 681, 35915, 562],
  [38.84, 931, 669, 36195, 551], [38.88, 948, 675, 36160, 557], [38.92, 965, 682, 34824, 568], [38.96, 981, 685, 34932, 567],
  [39.00, 981, 685, 34917, 567], [39.04, 1015, 687, 34020, 573], [39.08, 1015, 687, 34033, 573], [39.12, 1034, 693, 33176, 582],
  [39.16, 1048, 703, 32364, 591], [39.20, 1064, 691, 32845, 579], [39.24, 1079, 695, 32660, 584], [39.28, 1096, 698, 31242, 590],
  [39.32, 1114, 711, 30870, 602], [39.36, 1129, 698, 31393, 587], [39.40, 1141, 701, 31126, 592], [39.44, 1158, 703, 30205, 595],
  [39.48, 1167, 714, 30047, 605], [39.52, 1178, 701, 30152, 594], [39.56, 1182, 705, 30120, 597], [39.60, 1190, 711, 29493, 605],
  [39.64, 1190, 715, 29294, 609], [39.68, 1188, 712, 29163, 607], [39.72, 1174, 717, 29065, 613], [39.76, 1156, 720, 29368, 614],
  [39.80, 1136, 717, 29581, 613], [39.84, 1120, 726, 30504, 619], [39.88, 1084, 728, 30232, 621], [39.92, 1084, 728, 30281, 621],
  [39.96, 1067, 727, 30637, 620],
];
// run: the same at luma > 215 (the floor is lit): [t, cx, cy, area, top]
export const RUN = [
  [40.00, 1052, 725, 26894, 623], [40.04, 1039, 723, 27204, 621], [40.08, 1027, 722, 27616, 619], [40.12, 1018, 725, 27498, 622],
  [40.16, 1013, 722, 28072, 618], [40.20, 1008, 719, 29157, 614], [40.24, 1008, 710, 29670, 605], [40.28, 1013, 703, 30672, 594],
  [40.32, 1018, 705, 30960, 594], [40.36, 1026, 699, 31564, 587], [40.40, 1037, 691, 32543, 577], [40.44, 1049, 685, 33435, 569],
  [40.48, 1061, 686, 34010, 568], [40.52, 1076, 676, 34066, 558], [40.56, 1091, 669, 35120, 551], [40.60, 1108, 662, 35996, 542],
  [40.64, 1126, 665, 36133, 543], [40.68, 1126, 665, 36133, 543],
];
// a duplicated source frame (same centroid and top as the frame before it) repeats that frame exactly
const heldRow = (T, t) => { let i = T.indexOf(rowAt(T, t)); while (i > 0 && T[i - 1][1] === T[i][1] && T[i - 1][2] === T[i][2] && T[i - 1][4] === T[i][4]) i--; return T[i]; };
const smoothArea = (T, row) => { const i = T.indexOf(row); const a = T[Math.max(0, i - 1)][3], b = T[i][3], c = T[Math.min(T.length - 1, i + 1)][3]; return (a + 2 * b + c) / 4; };
// the floor shadow's centre row under the running owl (darkest row below the feet, 40.08-40.68; 40.00-40.04 extrapolated)
const SHADOW_Y = [[40.0, 877], [40.08, 873], [40.2, 869], [40.32, 864], [40.4, 857], [40.48, 852], [40.56, 844], [40.64, 834], [40.68, 834]];
// attitude keyframes read off every source frame (snapshots/s14-fix1-src/owlstrip.jpg): [t, body roll (+ = clockwise),
// wing asymmetry wL - wR (+ = frame-left wing higher), head turn phi (+ = the frame-right cup toward us)]
const ATT = [
  [38.52, 0.06, 0.28, -0.2], [39.0, 0.03, 0.18, -0.25], [39.28, -0.04, 0.0, -0.4], [39.52, -0.17, -0.3, -0.55], [39.72, -0.2, -0.32, -0.6], [39.96, -0.2, -0.3, -0.6],
  [40.0, -0.2, -0.3, 0.55], [40.16, -0.15, -0.22, 0.55], [40.28, -0.02, 0.05, 0.55], [40.44, 0.12, 0.34, 0.55], [40.68, 0.18, 0.4, 0.55],
];
export const rowAt = (T, t) => { let best = T[0]; for (const r of T) if (r[0] <= t + 1e-4) best = r; return best; };
const lerpRow = (T, t) => {
  if (t <= T[0][0]) return T[0].slice(1);
  for (let i = 1; i < T.length; i++) if (t <= T[i][0]) { const a = T[i - 1], b = T[i], f = (t - a[0]) / (b[0] - a[0]); return a.slice(1).map((v, k) => v + (b[k + 1] - v) * f); }
  return T[T.length - 1].slice(1);
};

// calibration of the painted owl against those blobs: blob centroid offset from the root (owl units) and the blob
// area in px at s = 1 (measured on renders with the same thresholds, see fidelity/s14.md)
export const CAL = { fly: { dx: 0, area1: 106000 }, run: { dx: 0, area1: 79000 } };

// The source draws a thin dark contour round the bird with a pale halo outside it: stamp a pale copy at `halo`
// px and a dark copy at `px` px behind the layer (16 directions), on a slightly larger canvas.
function outlined(L, px = 1.6, col = "rgb(58,58,55)", halo = 0, haloCol = "rgb(196,196,192)") {
  const m = Math.ceil(Math.max(px, halo)) + 2, sx = L.canvas.width / L.w;
  const c = document.createElement("canvas"); c.width = L.canvas.width + 2 * m; c.height = L.canvas.height + 2 * m;
  const g = c.getContext("2d");
  const tint = (colr) => {
    const t = document.createElement("canvas"); t.width = L.canvas.width; t.height = L.canvas.height;
    const tg = t.getContext("2d"); tg.drawImage(L.canvas, 0, 0); tg.globalCompositeOperation = "source-in"; tg.fillStyle = colr; tg.fillRect(0, 0, t.width, t.height);
    return t;
  };
  const stamp = (t, d) => { for (let k = 0; k < 16; k++) { const a = (k / 16) * 2 * Math.PI; g.drawImage(t, m + Math.cos(a) * d, m + Math.sin(a) * d); } };
  if (halo > 0) stamp(tint(haloCol), halo * sx);
  stamp(tint(col), px * sx);
  g.drawImage(L.canvas, m, m);
  return { canvas: c, x: L.x - m / sx, y: L.y - m / sx, w: L.w + (2 * m) / sx, h: L.h + (2 * m) / sx, anchors: L.anchors };
}
let cache = null;
function layerFor(key, make) {
  if (!cache) cache = new Map();
  if (!cache.has(key)) { if (cache.size > 40) cache.clear(); cache.set(key, make()); }
  return cache.get(key);
}
export function releaseOwl() { cache = null; }

// blit a back-view layer with its root at (x, y), rolled by rot about the root
function blitRolled(ctx, L, x, y, rot) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  ctx.drawImage(L.canvas, L.x, L.y, L.w, L.h);
  ctx.restore();
}

// Draw the owl for film time t (already held to the 25 fps frame). Returns its anchors.
export function drawOwlAt(ctx, t) {
  if (t < 37.10) {
    const dy = t >= 37.02 ? 4 : 0;
    const L = layerFor("front", () => outlined(owlLayer({ ...frontPose(), x: FR.root[0], y: FR.root[1], s: FR.s, tone: false }), 1.2, "rgb(60,60,57)", 2.4));
    ctx.drawImage(L.canvas, L.x, L.y + dy, L.w, L.h);
    return L.anchors;
  }
  if (t < 37.18) {
    const k = t < 37.14 ? 0 : 1, sp = TURN_SPEC[k];
    const L = layerFor("turn" + k, () => outlined(owlLayer({ ...sidePose(sp), x: sp.root[0], y: sp.root[1], s: sp.s, tone: false }), 1.2, "rgb(60,60,57)", 2.4));
    ctx.drawImage(L.canvas, L.x, L.y, L.w, L.h);
    return L.anchors;
  }
  if (t < 38.50) {
    const up = t >= 37.26 && t < 37.42 ? -4 : 0;
    const sp = SIDE_SPEC;
    const L = layerFor("side", () => outlined(owlLayer({ ...sidePose(sp), x: sp.root[0], y: sp.root[1], s: sp.s, tone: false }), 1.2, "rgb(60,60,57)", 2.4));
    ctx.drawImage(L.canvas, L.x, L.y + up, L.w, L.h);
    return L.anchors;
  }
  if (t < 39.98) {
    // pose index from the held source row, so duplicated source frames repeat exactly
    const row = heldRow(FLY, t), [, cx, , , top] = row;
    const i = Math.round((row[0] - 38.52) / 0.04);
    const [roll, asym, phi] = lerpRow(ATT, row[0]);
    const s = Math.sqrt(smoothArea(FLY, row) / CAL.fly.area1);
    const k = i % 2 ? 1 : -1;
    const w0 = 0.46 + 0.08 * k;
    const L = layerFor(`fly${i}_${s.toFixed(3)}`, () => outlined(backLayer({ s, wL: w0 + asym / 2, wR: w0 - asym / 2, legPh: (i % 4) / 4, phi }), 1.3));
    const y = top + s * (-BH.y * Math.cos(roll) + BH.ry);
    blitRolled(ctx, L, cx - CAL.fly.dx * s, y, roll);
    return { root: [cx, y] };
  }
  const row = heldRow(RUN, t), [, cx, , , top] = row;
  const i = Math.round((row[0] - 40.0) / 0.04);
  const [roll, asym, phi] = lerpRow(ATT, row[0]);
  const s = Math.sqrt(smoothArea(RUN, row) / CAL.run.area1);
  const x = cx - CAL.run.dx * s, y = top + s * (-BH.y * Math.cos(roll) + BH.ry);
  // the soft shadow on the floor, well below the hopping feet
  const sy = lerpRow(SHADOW_Y, row[0])[0];
  ctx.save();
  ctx.filter = `blur(${(5 * s + 3).toFixed(1)}px)`;
  ctx.fillStyle = "rgba(0,0,0,0.34)";
  ctx.beginPath(); ctx.ellipse(x - 18 * s, sy, 110 * s, 16 * s, 0, 0, 7); ctx.fill();
  ctx.restore();
  const ph = ((row[0] - 40.0) / 0.32) * 2 * Math.PI;
  const w0 = 0.34 + 0.08 * Math.sin(ph);
  const L = layerFor(`run${i}_${s.toFixed(3)}`, () => outlined(backLayer({ s, span: 0.96, wL: w0 + asym / 2, wR: w0 - asym / 2, legPh: (i % 4) / 4, phi, reach: 0.3, wide: 1.0 }), 1.4));
  blitRolled(ctx, L, x, y, roll);
  return { root: [x, y] };
}
