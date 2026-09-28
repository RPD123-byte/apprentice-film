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
import { bkRow, backLayer2 } from "./back.js";
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
  // one dark outline, a little heavier along the top (the lid) (fix pass 1: the socket line outside it read as a
  // second ring, a goggle look the source does not have)
  g.strokeStyle = LINE; g.lineWidth = R * 0.08; g.beginPath(); g.arc(x, y, R, 0, TAU); g.stroke();
  ink(g, sampleCurve([[x - R * 0.9, y - R * 0.35], [x - R * 0.5, y - R * 0.88], [x + R * 0.1, y - R * 1.0], [x + R * 0.65, y - R * 0.78], [x + R * 0.92, y - R * 0.3]], 4), R * 0.12, LINE, { end: 0.2 });
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
    // (fix pass 1: the pointed right ear tuft stands up over the headphone band, 37.00: base ~(716,584), tip ~(739,553))
    tufts: [{ at: -0.86, size: L(3), width: 0.15, lean: -0.1, second: 0.3, curl: 0.1 }, { at: 0.7, size: L(6), width: 0.2, lean: 0.4, second: 0.5, curl: 0.05 }],
    // (the belly runs down to y ~800 at x 615-630; the toes grip right under it)
    body: { x: 0, y: 1, a: L(84), b: L(91), rot: Math.PI / 2, egg: -0.08 },
    eyes: { state: "wide", r: 0.5, spread: 0.49, el: -0.14 },
    beak: { el: -Math.asin(L(28) / (L(70) * 1.25)), lift: 1.25, w: 0.01, l: 0.01 },
    bandage: null,
    disc: 0,
    headphones: { on: false },
    wings: [],
    feet: [pin(P([660, 508])), pin(P([494, 830])), pin(P([796, 628])), pin(P([720, 830]))],
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
      frontBeak(g, P, L);
      drawBandage(g, { x: P([641, 571])[0], y: P([641, 571])[1], size: L(44), rot: -0.42, sx: 1, sy: 0.9 });
      // headphones: a thin dark band arching well above the crown, the cups edge-on on the sides of the head as short
      // cylinders (the cushion toward the head, the ribbed shell, its rim facing out)
      darkBand(g, [[575, 590], [583, 562], [602, 540], [630, 527], [660, 522], [690, 525], [718, 537], [740, 560], [751, 590]].map(P), L(3.2));
      frontTuft(g, P, L);
      edgeCup(g, P, L, [579, 621], -1);
      edgeCup(g, P, L, [751, 622], 1);
      frontFeet(g, P, L);
      unpin(g, pose.feet);
    },
  });
  return pose;
}
function pt(p) { return { x: p[0], y: p[1] }; }
// fix pass 1: the front beak as the source draws it at 37.00 (x 665-687, y 650-676): small, pale grey, a thin keyline
function frontBeak(g, P, L) {
  const pts = [[666, 652], [676, 649], [686, 652], [684, 661], [679, 670], [676, 676], [672, 669], [668, 661]].map(P);
  g.fillStyle = gv(0.8); g.beginPath(); smoothPath(g, pts, true); g.fill();
  g.save(); g.beginPath(); smoothPath(g, pts, true); g.clip();
  g.fillStyle = gv(0.62, 0.7); g.beginPath(); g.ellipse(...P([681, 664]), L(5), L(8), 0.3, 0, TAU); g.fill();
  g.restore();
  g.strokeStyle = gv(0.2, 0.9); g.lineWidth = L(1.3); g.beginPath(); smoothPath(g, pts, true); g.stroke();
}
// the pointed ear tuft on the owl's left (viewer's right), two feathers rising over the band (37.00: base ~(716,588),
// tips (733,553) and (742,562))
function frontTuft(g, P, L) {
  for (const [b, t, w] of [[[712, 590], [733, 553], 9], [[724, 594], [742, 562], 8]]) {
    const B = P(b), T = P(t), d = nrm(V.sub(T, B)), n = [-d[1], d[0]], len = Math.hypot(T[0] - B[0], T[1] - B[1]);
    const Q = (u, v) => add(add(B, mul(d, u * len)), mul(n, v * L(w)));
    const sh = [Q(0, -0.5), Q(0.45, -0.5), Q(0.8, -0.28), Q(1, 0), Q(0.78, 0.25), Q(0.4, 0.5), Q(0, 0.5)];
    g.fillStyle = gv(0.96); g.beginPath(); smoothPath(g, sh, true); g.fill();
    ink(g, [Q(0.35, -0.52), Q(0.8, -0.3), Q(1, 0)], L(1.3), gv(0.3, 0.85), { end: 0.1 });
    ink(g, [Q(0.25, 0.1), Q(0.75, 0.05)], L(0.8), gv(0.5, 0.5), { end: 0.1 });
  }
}
// a headphone cup edge-on: the dark cushion against the head, the shell (ribbed, lighter on its outer rim), side = -1
// viewer-left / +1 right. Frame px: centre, ~17 x 38 (37.00: x 560-599, y 584-659 on the left)
function edgeCup(g, P, L, c, side) {
  const [cx, cy] = P(c), rx = L(15.5), ry = L(37);
  g.fillStyle = gv(0.16); g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, TAU); g.fill();
  g.save(); g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, TAU); g.clip();
  // the shell: the outer half, a lit band along its rim, fine ribs
  g.fillStyle = gv(0.36); g.beginPath(); g.ellipse(cx + side * rx * 0.45, cy, rx * 0.62, ry * 0.98, 0, 0, TAU); g.fill();
  g.fillStyle = gv(0.52, 0.9); g.beginPath(); g.ellipse(cx + side * rx * 0.78, cy, rx * 0.2, ry * 0.86, 0, 0, TAU); g.fill();
  for (let i = -3; i <= 3; i++) ink(g, [[cx + side * rx * 0.1, cy + i * ry * 0.22], [cx + side * rx * 0.62, cy + i * ry * 0.23]], L(0.9), gv(0.08, 0.6), { end: 0.3 });
  // the cushion's soft fold toward the head
  ink(g, [[cx - side * rx * 0.3, cy - ry * 0.8], [cx - side * rx * 0.45, cy], [cx - side * rx * 0.3, cy + ry * 0.8]], L(1.2), gv(0.34, 0.6), { end: 0.2 });
  g.restore();
  g.strokeStyle = LINE; g.lineWidth = L(1.4); g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, TAU); g.stroke();
}
// the front feet: pale padded toes gripping right under the belly, dark claws (37.00: left toes x 594-639, y 802-822;
// right x 664-705, y 793-815), the feathered tarsi a white tuft over them
function frontFeet(g, P, L) {
  const toe = (a, b, w) => {
    const A = P(a), B = P(b), q = [A, V.mix(A, B, 0.55), B];
    ink(g, q, L(w + 2.2), LINE, { end: 0.55, pow: 0.3 });
    ink(g, q, L(w), gv(0.88), { end: 0.5, pow: 0.3 });
    const d = nrm(V.sub(B, A));
    ink(g, [add(B, mul(d, -L(1))), add(B, add(mul(d, L(5)), [0, L(1.5)]))], L(2.4), gv(0.1), { end: 0.1 });
  };
  const FEET = [
    [616, 798, [[[607, 803], [599, 815]], [[616, 804], [615, 818]], [[625, 803], [632, 815]]]],
    [684, 792, [[[676, 797], [669, 808]], [[685, 798], [686, 811]], [[694, 796], [700, 807]]]],
  ];
  for (const [cx, cy, toes] of FEET) {
    for (const [a, b] of toes) toe(a, b, 8.5);
    g.fillStyle = gv(0.95); g.beginPath(); g.ellipse(...P([cx, cy]), L(15), L(7), 0, 0, TAU); g.fill();
    ink(g, [P([cx - 14, cy + 2]), P([cx, cy + 6]), P([cx + 14, cy + 2])], L(1.1), gv(0.4, 0.6), { end: 0.3 });
  }
}
// an invisible "foot" that only widens the kit's layer bbox (props drawn in `extra` beyond the bird's own parts)
function pin(p) { return { x: p[0], y: p[1], size: 0.01, mode: "stand", leg: 0, toes: 1, pin: true }; }
// the kit still draws a hairline speck for a pin: rub it out (called last in `extra`)
function unpin(g, feet) {
  g.save(); g.globalCompositeOperation = "destination-out";
  for (const f of feet) if (f.pin) { g.beginPath(); g.arc(f.x, f.y, 6, 0, TAU); g.fill(); }
  g.restore();
}
// front wings in frame px: outline, primaries (root -> tip), covert scallop rows, an extra lower feather
// (fix pass 1, 4x grids of 37.00) each wing is one smooth white fan: the leading edge arcs over the top, the lower
// edge runs along the primaries' tips with a dark notch between each, the primaries are split by dark lines running up
// from the notches, and two scalloped covert rows cross the upper wing
const FWING_L = {
  sil: [[598, 660], [585, 640], [563, 630], [540, 628], [520, 640], [505, 670], [500, 700], [499, 740], [503, 790], [508, 803],
    [513, 786], [517, 782], [522, 769], [528, 768], [534, 758], [540, 758], [546, 747], [552, 746], [558, 736], [564, 734], [575, 720], [592, 700], [602, 680]],
  seps: [[[513, 786], [527, 700], [537, 660]], [[522, 769], [535, 704], [546, 668]], [[534, 758], [545, 708], [554, 676]], [[546, 747], [555, 710], [562, 684]], [[558, 736], [565, 712], [570, 694]]],
  rows: [[[510, 702], [528, 710], [545, 704], [562, 711], [580, 706], [598, 714]], [[518, 668], [537, 676], [555, 669], [572, 677], [590, 671]]],
  extra: [[586, 764], [560, 774], [536, 789], [523, 803], [546, 800], [572, 792], [596, 781]],
  light: [0.6, -0.8],
};
const FWING_R = {
  sil: [[737, 655], [752, 640], [770, 632], [783, 634], [790, 650], [792, 680], [789, 700], [785, 716], [779, 723], [774, 739], [767, 745], [762, 756], [755, 760],
    [748, 767], [742, 769], [735, 775], [731, 750], [732, 720], [735, 690], [737, 670]],
  seps: [[[779, 723], [776, 690], [775, 655]], [[767, 745], [768, 700], [769, 660]], [[755, 760], [758, 710], [762, 668]], [[742, 769], [748, 720], [754, 678]]],
  rows: [[[744, 690], [754, 699], [764, 689], [774, 698], [786, 686]]],
  light: [-0.6, -0.8],
};
function frontWing(g, P, L, W) {
  const sil = W.sil.map(P), path = (c) => { c.moveTo(sil[0][0], sil[0][1]); for (const q of sil) c.lineTo(q[0], q[1]); c.closePath(); };
  const spath = (c) => smoothPath(c, sil, true);
  plumage(g, spath, { base: 0.965, shade: 0.8, depth: L(8), blur: L(5), light: W.light });
  g.save(); g.beginPath(); smoothPath(g, sil, true); g.clip();
  // the primaries: dark split lines up from each notch, the feather below each a hair in shadow
  for (const sp of W.seps) {
    const q = sp.map(P);
    ink(g, sampleCurve(q, 4), L(1.5), gv(0.2, 0.85), { end: 0.1, bias: 0.25 });
    softShade(g, spath, (c) => { const m = V.mix(q[0], q[1], 0.4); c.ellipse(m[0] + L(3), m[1], L(4), L(20), 0.2, 0, TAU); }, 0.86, 0.35, L(3));
  }
  for (const row of W.rows) {
    const q = row.map(P), pts = [];
    for (let i = 0; i < q.length - 1; i++) { const m = add(V.mix(q[i], q[i + 1], 0.5), [0, L(4.5)]); pts.push(q[i], V.mix(q[i], m, 0.6), m, V.mix(m, q[i + 1], 0.5)); }
    pts.push(q[q.length - 1]);
    ink(g, sampleCurve(pts, 3), L(1.4), gv(0.25, 0.8), { end: 0.2 });
  }
  g.restore();
  if (W.extra) {
    const e = W.extra.map(P);
    plumage(g, blobPath(e), { base: 0.96, shade: 0.84, depth: L(4), blur: L(3), light: W.light });
    ink(g, e.slice(0, 4), L(1.4), LINE, { end: 0.2 });
    ink(g, e.slice(3), L(1.1), gv(0.3, 0.8), { end: 0.2 });
  }
  g.strokeStyle = gv(0.14, 0.95); g.lineWidth = L(1.6); g.beginPath(); smoothPath(g, sil, true); g.stroke();
  void path;
}

// ---------------------------------------------------------------- SIDE / TURN (s = 0.8)
// spec in frame px: head, body, tail, wing, feet, cup, band, eye, beak
const SIDE_SPEC = {
  root: [650, 725], s: 0.8,
  // build 2: the whole silhouette (head, body, tail, toes), traced as the outer contour of the owl at luma > 110 on
  // the 37.60 source frame (the band's arc over the crown removed); painted first, the features go on top
  sil: [[656, 537], [672, 534], [690, 534], [706, 537], [720, 545], [734, 556], [752, 575], [758, 594], [759, 624], [757, 633], [761, 641], [761, 648], [757, 657], [752, 659], [748, 655], [744, 656], [741, 663], [734, 670], [739, 682], [739, 705], [723, 750], [713, 765], [693, 782], [682, 795], [686, 802], [698, 800], [707, 803], [714, 808], [715, 813], [704, 815], [680, 813], [660, 818], [659, 812], [663, 807], [671, 804], [670, 800], [658, 794], [640, 794], [639, 796], [645, 800], [646, 804], [634, 807], [620, 815], [617, 813], [617, 806], [620, 802], [618, 798], [599, 812], [563, 820], [560, 815], [563, 797], [581, 773], [581, 770], [578, 769], [571, 778], [566, 776], [561, 752], [563, 711], [568, 691], [580, 667], [591, 654], [604, 645], [595, 619], [595, 599], [602, 579], [611, 565], [607, 559], [607, 555], [611, 553], [608, 535], [612, 534], [623, 541], [628, 534], [640, 540], [652, 539]],
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
  cup: { c: [666, 608], rx: 31, ry: 33 }, yoke: [657, 538, 24, 42],
  // (fix pass 1: the strap arcs back over the crown and passes behind the head's outline at ~(713,525); it no longer
  // comes down in front of the head as a handle)
  band: [[664, 550], [665, 534], [671, 522], [683, 514], [698, 511], [709, 516], [714, 525]],
  eye: { c: [731, 616], rx: 11, ry: 16, iris: [733.5, 616], irx: 6.5, iry: 11, catch: [734.5, 610.5] },
  beak: [[744, 641], [751, 638], [756, 640], [759, 646], [758, 653], [756, 659], [753, 654], [749, 650], [745, 648]],
  smile: [[748, 650], [742, 654], [736, 655]],
  face: [[703, 578], [696, 600], [692, 627], [699, 657]],
};
const TURN_SPEC = [
  { ...SIDE_SPEC, root: [645, 730], sil: [[726, 562], [708, 553], [690, 548], [661, 546], [656, 563], [652, 569], [654, 579], [662, 584], [672, 595], [675, 616], [679, 627], [672, 639], [664, 647], [652, 653], [629, 646], [614, 627], [613, 608], [619, 593], [629, 581], [631, 569], [621, 558], [601, 553], [605, 562], [613, 568], [605, 569], [607, 575], [614, 578], [607, 590], [599, 601], [599, 624], [605, 644], [611, 655], [587, 671], [560, 704], [549, 727], [547, 739], [538, 756], [531, 777], [532, 782], [538, 779], [547, 781], [536, 794], [533, 804], [527, 813], [531, 816], [561, 809], [575, 802], [588, 791], [607, 797], [628, 798], [626, 803], [616, 799], [599, 800], [603, 803], [612, 802], [615, 811], [635, 810], [639, 818], [644, 815], [643, 806], [636, 799], [645, 795], [660, 802], [684, 803], [694, 804], [695, 799], [688, 793], [675, 788], [694, 779], [709, 767], [723, 751], [733, 729], [740, 720], [747, 699], [747, 679], [741, 669], [741, 665], [753, 664], [758, 656], [755, 640], [756, 602], [749, 583]],
    head: { c: [679, 612], rx: 79, ry: 67, roll: 0.05 },
    tuft: { at: -0.8, size: 22 },
    // mid-turn the body leans well forward: from the tail (530,815) up to the chest (~745,690)
    body: { c: [645, 742], a: 104, b: 76, rot: 2.55, egg: 0.1 },
    tail: { base: [572, 794], tip: [528, 816], w: 24 },
    wing: null, wingFit: [[737, 680], [534, 797]],   // build 2: the folded wing runs diagonally to the tail (2.4x grid of 37.12)
    feet: SIDE_SPEC.feet.map((f) => ({ leg: f.leg.map(([x, y]) => [x - 16, y + 4]), toes: f.toes.map((t) => t.map(([x, y]) => [x - 16, y + 4])) })),
    cup: { c: [646, 613], rx: 33, ry: 36 }, yoke: [634, 544, 23, 42],
    band: [[645, 552], [646, 536], [654, 523], [668, 516], [686, 515], [700, 522], [705, 530]],
    eye: null, closed: [[706, 627], [714, 632], [724, 634], [735, 628]],
    beak: [[745, 641], [751, 637], [756, 640], [758, 650], [756, 662], [752, 654], [748, 649]],
    smile: [[748, 651], [742, 655]],
    face: [[700, 585], [694, 610], [694, 640], [702, 662]],
  },
];
TURN_SPEC.push({ ...TURN_SPEC[0], wingFit: [[735, 672], [548, 802]], sil: [[726, 560], [698, 546], [678, 542], [665, 543], [658, 562], [658, 574], [666, 579], [675, 590], [679, 600], [680, 606], [678, 612], [679, 621], [674, 631], [665, 641], [650, 646], [638, 644], [620, 631], [614, 608], [619, 591], [633, 577], [635, 565], [625, 547], [614, 551], [602, 545], [599, 546], [603, 555], [609, 561], [600, 561], [599, 564], [611, 574], [602, 583], [597, 595], [594, 608], [595, 622], [601, 641], [609, 651], [600, 654], [585, 670], [572, 697], [566, 717], [564, 749], [559, 768], [560, 772], [564, 761], [565, 773], [553, 783], [542, 802], [539, 812], [540, 817], [578, 811], [601, 793], [611, 793], [627, 799], [616, 810], [616, 817], [631, 816], [638, 819], [644, 812], [658, 811], [656, 806], [644, 802], [632, 799], [647, 794], [659, 796], [670, 806], [692, 807], [687, 796], [672, 793], [678, 787], [698, 775], [718, 752], [726, 736], [734, 706], [734, 691], [729, 674], [735, 669], [740, 659], [749, 659], [753, 651], [753, 641], [750, 634], [752, 597], [743, 575]], root: [648, 729], head: { ...TURN_SPEC[0].head, c: [681, 610] }, cup: { c: [649, 610], rx: 33, ry: 36 }, yoke: [637, 541, 23, 42],
  band: TURN_SPEC[0].band.map(([x, y]) => [x + 3, y - 2]), closed: TURN_SPEC[0].closed.map(([x, y]) => [x + 2, y - 2]),
  beak: TURN_SPEC[0].beak.map(([x, y]) => [x + 2, y - 1]), smile: TURN_SPEC[0].smile.map(([x, y]) => [x + 2, y - 1]),
  body: { ...TURN_SPEC[0].body, c: [648, 738], rot: 2.45 }, tail: { base: [580, 794], tip: [540, 816], w: 24 } });

// the side wing re-fitted to a new shoulder -> tip axis: stretched along the axis, rotated, width kept
function fitWing(W, S0, T0, S1, T1) {
  const a0 = V.sub(T0, S0), a1 = V.sub(T1, S1), l0 = Math.hypot(a0[0], a0[1]), l1 = Math.hypot(a1[0], a1[1]);
  const u0 = [a0[0] / l0, a0[1] / l0], n0 = [-u0[1], u0[0]], u1 = [a1[0] / l1, a1[1] / l1], n1 = [-u1[1], u1[0]], k = l1 / l0;
  const f = ([x, y]) => { const d = [x - S0[0], y - S0[1]], u = d[0] * u0[0] + d[1] * u0[1], v = d[0] * n0[0] + d[1] * n0[1]; return [S1[0] + u1[0] * u * k + n1[0] * v, S1[1] + u1[1] * u * k + n1[1] * v]; };
  return { out: W.out.map(f), rows: W.rows.map((r) => r.map(f)), prim: W.prim.map((r) => r.map(f)) };
}
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
  // (fix pass 1) a soft grey under the wing's lower edge and along its trailing side
  softShade(g, blobPath(out), (c) => { const q = P([690, 772]); c.ellipse(q[0], q[1], L(48), L(12), -0.35, 0, TAU); }, 0.8, 0.5, L(8));
  g.save(); g.beginPath(); smoothPath(g, out, true); g.clip();
  // covert rows: each one continuous scalloped edge of overlapping feathers, tapered at both ends (fix pass 1: the
  // separate dashes read as mechanical marks)
  for (const row of W.rows) {
    const q = row.map(P), pts = [];
    for (let i = 0; i < q.length - 1; i++) {
      const m = add(V.mix(q[i], q[i + 1], 0.5), [L(-1), L(4.5)]);
      pts.push(q[i], V.mix(q[i], m, 0.6), m, V.mix(m, q[i + 1], 0.5));
    }
    pts.push(q[q.length - 1]);
    ink(g, sampleCurve(pts, 3), L(1.3), gv(0.36, 0.7), { end: 0.25 });
    // the feathers below each edge sit a hair in shadow
    for (let i = 0; i < q.length - 1; i++) softShade(g, blobPath(out), (c) => { const m = V.mix(q[i], q[i + 1], 0.5); c.ellipse(m[0], m[1] + L(8), L(8), L(4), 0, 0, TAU); }, 0.88, 0.5, L(3));
  }
  for (const [a, b] of W.prim) ink(g, [P(a), V.mix(P(a), P(b), 0.5), P(b)], L(1.3), gv(0.3, 0.75), { end: 0.1, bias: 0.3 });
  g.restore();
  ink(g, sampleCurve(out.slice(0, 11), 4), L(1.5), gv(0.25, 0.85), { end: 0.2 });
}
// the traced silhouette as one soft white mass, lit from the upper right (the gap): grey falls along the back and under
// the belly, fine strokes run along the shadow-side edge, the tail's feather split and two tuft feathers on the crown
function sideSil(g, P, L, sil, tail) {
  const pts = sil.map(P), path = (c) => { c.moveTo(pts[0][0], pts[0][1]); for (const q of pts) c.lineTo(q[0], q[1]); c.closePath(); };
  const light = [0.55, -0.83];
  plumage(g, path, { base: 0.97, shade: 0.8, depth: L(26), blur: L(10), light });
  softShade(g, path, (c) => { const q = P([575, 735]); c.ellipse(q[0], q[1], L(26), L(70), 0.15, 0, TAU); }, 0.72, 0.55, L(12));
  softShade(g, path, (c) => { const q = P([650, 812]); c.ellipse(q[0], q[1], L(80), L(14), 0, 0, TAU); }, 0.74, 0.5, L(8));
  softShade(g, path, (c) => { const q = P([612, 610]); c.ellipse(q[0], q[1], L(16), L(44), 0, 0, TAU); }, 0.82, 0.45, L(10));
  // (fix pass 1: the source's belly carries a soft grey low down, ~-25 luma, and the chest under the head a little)
  softShade(g, path, (c) => { const q = P([640, 775]); c.ellipse(q[0], q[1], L(62), L(26), 0.2, 0, TAU); }, 0.84, 0.55, L(14));
  softShade(g, path, (c) => { const q = P([705, 675]); c.ellipse(q[0], q[1], L(30), L(12), -0.2, 0, TAU); }, 0.86, 0.4, L(8));
  // tail: the split between its feathers
  ink(g, [P([583, 770]), P([572, 792]), P([565, 812])], L(1.2), gv(0.45, 0.7), { end: 0.2 });
  ink(g, [P([596, 780]), P([585, 800]), P([578, 815])], L(1.0), gv(0.5, 0.6), { end: 0.2 });
  // the crown tufts' feather lines
  ink(g, [P([622, 560]), P([614, 546]), P([610, 537])], L(1.1), gv(0.45, 0.6), { end: 0.1 });
  ink(g, [P([634, 556]), P([629, 545]), P([627, 537])], L(1.0), gv(0.5, 0.55), { end: 0.1 });
}
function sidePose(sp) {
  const { P, L } = conv(sp.root, sp.s);
  const hc = P(sp.head.c), bc = P(sp.body.c);
  const pose = owlPose("walk", {
    head: { x: hc[0], y: hc[1], rx: L(sp.head.rx), ry: L(sp.head.ry), yaw: 1.2, roll: sp.head.roll, pitch: 0, square: 2.2, jowl: 0.04 },
    tufts: [{ at: sp.tuft.at, size: L(sp.tuft.size), width: 0.3, lean: -0.35, second: 0.5, curl: 0.12 }],
    body: sp.sil ? null : { x: bc[0], y: bc[1], a: L(sp.body.a), b: L(sp.body.b), rot: sp.body.rot, egg: sp.body.egg },
    tail: sp.sil ? { base: P(sp.tail.base), tip: P(sp.tail.tip), w: 1, n: 0 } : { base: P(sp.tail.base), tip: P(sp.tail.tip), w: L(sp.tail.w), n: 2 },
    wings: [],
    feet: [pin(P([690, 497])), pin(P([724, 824])), ...(sp.sil ? [pin(P([Math.min(...sp.sil.map((q) => q[0])) - 6, 600])), pin(P([Math.max(...sp.sil.map((q) => q[0])) + 6, 830]))] : [])],
    eyes: { state: "wide", r: 0.5, spread: 0.42, el: -0.1, left: null },
    beak: { el: 0, lift: 0.3, w: 0.2, l: 0.2 },
    bandage: null, disc: 0,
    headphones: { on: false },
    extra: (g) => {
      if (sp.sil) sideSil(g, P, L, sp.sil, sp.tail);
      sideFeet(g, P, L, sp.feet);
      sideWing(g, P, L, sp.wing || (sp.wingFit ? fitWing(SIDE_SPEC.wing, [737, 667], [616, 786], ...sp.wingFit) : shiftWing(SIDE_SPEC.wing, sp.wingShift || [-12, 8])));
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
      // (fix pass 1: a strap ~7-8 px wide arcing back over the crown, not a thick handle)
      darkBand(g, sp.band.map(P), L(11.5), 0.5);
      const [yx, yy, yw, yh] = sp.yoke, y0 = P([yx, yy]);
      g.fillStyle = gv(0.22); g.strokeStyle = LINE; g.lineWidth = L(1.5);
      g.beginPath(); g.roundRect(y0[0], y0[1], L(yw), L(yh), L(4)); g.fill(); g.stroke();
      darkCup(g, ...P(sp.cup.c), L(sp.cup.rx), L(sp.cup.ry), { plate: 0.74, rimSide: 1, shell: 0.3, plateV: 0.34 });
      unpin(g, pose.feet);
    },
  });
  return pose;
}

// ---------------------------------------------------------------- the owl from behind: see s14/back.js
export const rowAt = (T, t) => { let best = T[0]; for (const r of T) if (r[0] <= t + 1e-4) best = r; return best; };
const lerpRow = (T, t) => {
  if (t <= T[0][0]) return T[0].slice(1);
  for (let i = 1; i < T.length; i++) if (t <= T[i][0]) { const a = T[i - 1], b = T[i], f = (t - a[0]) / (b[0] - a[0]); return a.slice(1).map((v, k) => v + (b[k + 1] - v) * f); }
  return T[T.length - 1].slice(1);
};

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

// Draw the owl for film time t (already held to the 25 fps frame). Returns its anchors.
export function drawOwlAt(ctx, t) {
  if (t < 37.10) {
    const dy = t >= 37.02 ? 4 : 0;
    const L = layerFor("front", () => outlined(owlLayer({ ...frontPose(), x: FR.root[0], y: FR.root[1], s: FR.s, tone: false }), 1.8, "rgb(30,30,29)", 0));
    ctx.drawImage(L.canvas, L.x, L.y + dy, L.w, L.h);
    return L.anchors;
  }
  if (t < 37.18) {
    const k = t < 37.14 ? 0 : 1, sp = TURN_SPEC[k];
    const L = layerFor("turn" + k, () => outlined(owlLayer({ ...sidePose(sp), x: sp.root[0], y: sp.root[1], s: sp.s, tone: false }), 2.0, "rgb(28,28,27)", 0));
    ctx.drawImage(L.canvas, L.x, L.y, L.w, L.h);
    return L.anchors;
  }
  if (t < 38.50) {
    const up = t >= 37.26 && t < 37.42 ? -4 : 0;
    const sp = SIDE_SPEC;
    const L = layerFor("side", () => outlined(owlLayer({ ...sidePose(sp), x: sp.root[0], y: sp.root[1], s: sp.s, tone: false }), 2.0, "rgb(28,28,27)", 0));
    ctx.drawImage(L.canvas, L.x, L.y + up, L.w, L.h);
    return L.anchors;
  }
  // from behind (flight and run): the rebuilt painter in s14/back.js, placed by the per-frame source table
  const row = bkRow(t), [rt, hx, top, s] = row;
  if (rt >= 39.98) {
    // the soft shadow on the floor under the hopping owl (units from the head centre / blob top; unit grids of
    // 40.04, 40.20, 40.36, 40.52)
    const [sx, sy, srx, sry] = lerpRow(SHADOW_U, rt);
    ctx.save();
    // (fix pass 1: the source's shadow is darker, core ~0.7 of the floor round it, and sits further left late in the run)
    ctx.filter = `blur(${(2.2 * s + 1.5).toFixed(1)}px)`;
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.beginPath(); ctx.ellipse(hx + sx * s, top + sy * s, srx * s, sry * s, 0, 0, 7); ctx.fill();
    ctx.restore();
  }
  const L = layerFor(`bk${rt.toFixed(2)}`, () => outlined(backLayer2(row), 1.2, "rgb(70,70,66)"));
  ctx.drawImage(L.canvas, hx + L.x, top + L.y, L.w, L.h);
  return { root: [hx, top] };
}
// (fix pass 1: re-measured on every run frame as the dark blob of frame / local floor < 0.88 under the feet)
const SHADOW_U = [[40.00, 22, 291, 62, 14], [40.04, 19, 290, 62, 14], [40.12, 10, 289, 63, 14], [40.20, -26, 289, 63, 14], [40.28, -48, 295, 62, 15],
  [40.36, -57, 300, 62, 15], [40.44, -62, 305, 63, 14], [40.52, -63, 306, 67, 14], [40.60, -63, 309, 66, 14], [40.64, -69, 302, 72, 15], [40.68, -69, 302, 72, 15]];
