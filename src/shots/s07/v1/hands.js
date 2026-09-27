// s07 hands on the keyboard, finished pixels. Both hands are lit white with dark contours, knuckle creases, nails
// and grey tendon hatching. His left hand (screen left) is a loose fist: index and middle fingers curled on the
// keys, the ring finger curled over a dark gap, the little finger stretched out. His right hand reaches with the
// index finger; the middle, ring and little fingers curl under the back of the hand (their tips show in the dark
// gap above the thumb, over the keys), the palm is hatched, the thumb rests by the trackpad.
// Outlines traced at 3.4–4x on the source (29.08–29.6 s, snapshots/s07-fix1-ref/lfing|rhand_gap|rh_ud.jpg).
//
// Motion is measured, not invented: per source frame (29.04 + 0.04·i) the shift of each part against frame 0, from
// phase correlation on small boxes (right index / thumb / back of hand; left fingers top and bottom). The right
// hand rocks between a pressed and a lifted state (index tip ~5 px, thumb ~3 px, back ~1 px); the left fingers
// wiggle 1–4 px. Every part is warped by its own offset (knuckle end fixed to the back of the hand).
import { taper } from "../../../lib/ink.js";
import { smoothPath, sampleCurve } from "../../../lib/paths.js";
import { rng } from "../../../lib/rng.js";

const K = "#0a0a0a";
const skin = (v) => `rgb(${Math.round(v * 242)},${Math.round(v * 240)},${Math.round(v * 234)})`;
const blkA = (a) => `rgba(8,8,8,${a})`;
const inkA = (a) => `rgba(242,240,234,${a})`;
const nrm = (x, y) => { const l = Math.hypot(x, y) || 1; return [x / l, y / l]; };
function stroke(o, pts, w, color, bias = 0.4, per = 6) {
  const q = pts.length > 2 ? sampleCurve(pts, per) : pts;
  const warp = (u) => (u < bias ? (0.5 * u) / bias : 0.5 + (0.5 * (u - bias)) / (1 - bias));
  taper(o, q, (u) => w * Math.pow(Math.max(0, Math.sin(Math.PI * warp(u))), 0.7), color);
}
function outline(o, pts, w, color = K, closed = false, ends = 0.5) {
  const q = sampleCurve(pts, 6, closed);
  taper(o, q, (u) => w * (ends + (1 - ends) * Math.pow(Math.sin(Math.PI * u), 0.4)), color);
}
function fillPath(o, pts, style, smooth = true) {
  o.fillStyle = style; o.beginPath();
  if (smooth) smoothPath(o, pts, true); else { o.moveTo(pts[0][0], pts[0][1]); for (const p of pts) o.lineTo(p[0], p[1]); o.closePath(); }
  o.fill();
}
const add = (p, d, k = 1) => [p[0] + d[0] * k, p[1] + d[1] * k];
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
// hatch: n short parallel strokes starting along a line from a to b, each in direction dir, length L
function hatchRow(o, a, b, dir, n, L, w, alpha, seed) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const p = mix(a, b, (i + 0.5 + (r() - 0.5) * 0.5) / n), l = L * (0.6 + r() * 0.6);
    stroke(o, [p, add(p, dir, l * 0.5 + (r() - 0.5)), add(p, dir, l)], w * (0.7 + r() * 0.6), blkA(alpha * (0.6 + r() * 0.5)), 0.35);
  }
}

// A finger seen from above: a centre line knuckle -> joint -> tip and widths along it; returns the outline (upper
// edge, round tip, lower edge) and helpers. `off` moves the tip (the knuckle end stays put), `base` moves it all.
function finger(c, widths, base, off) {
  const cc = c.map((p, i) => add(add(p, base), off, Math.pow(i / (c.length - 1), 1.3)));
  const q = sampleCurve(cc, 8);
  const W = (t) => { const f = t * (widths.length - 1), i = Math.min(widths.length - 2, Math.floor(f)); return widths[i] + (widths[i + 1] - widths[i]) * (f - i); };
  const up = [], lo = [];
  for (let i = 0; i < q.length; i++) {
    const a = q[Math.max(0, i - 1)], b = q[Math.min(q.length - 1, i + 1)], [dx, dy] = nrm(b[0] - a[0], b[1] - a[1]), hw = W(i / (q.length - 1)) / 2;
    up.push([q[i][0] + dy * hw, q[i][1] - dx * hw]); lo.push([q[i][0] - dy * hw, q[i][1] + dx * hw]);
  }
  const e = q[q.length - 1], p = q[q.length - 2], [ux, uy] = nrm(e[0] - p[0], e[1] - p[1]), hw = W(1) / 2, cap = [];
  for (let k = 1; k < 10; k++) { const an = -Math.PI / 2 + (k / 10) * Math.PI, ca = Math.cos(an), sa = Math.sin(an); cap.push([e[0] + (ux * sa + uy * ca) * hw * (k === 5 ? 1.05 : 1), e[1] + (uy * sa - ux * ca) * hw]); }
  // cap runs from the upper edge round the tip to the lower edge
  return { q, up, lo, cap: cap, pts: [...up, ...cap, ...lo.slice().reverse()], at: (t) => q[Math.round(t * (q.length - 1))], W, dir: [ux, uy] };
}

// ---------------------------------------------------------------- left hand (his left: palm down, fingers curled)
// A loose fist seen from behind: from the knuckles the fingers run up-left and bend down onto the keys, so each
// shows its back ending in a rounded middle-joint knuckle (index (723,645), middle (667,662), ring (632,692)); the
// little finger stretches out to (602,740). Fingers lie tight together: the upper one overlaps the one below and
// its lower edge is the dark crease between them; only under the ring finger a dark gap opens over the keys.
const L_BACK = [[790, 660], [800, 674], [816, 691], [837, 709], [855, 720], [866, 738], [867, 763], [869, 784], [876, 799], [882, 832], [800, 866],
  [784, 856], [766, 845], [744, 831], [723, 813], [698, 797], [676, 781], [651, 770], [632, 760], [650, 736], [668, 716], [700, 686], [740, 664]];
const L_FINGERS = [
  { c: [[806, 690], [776, 670], [748, 656], [730, 652]], w: [40, 40, 38, 34], top: 1 },   // index
  { c: [[782, 714], [742, 690], [704, 674], [678, 670]], w: [40, 40, 37, 33], top: 1 },   // middle
  { c: [[748, 744], [704, 720], [664, 704], [642, 704]], w: [38, 36, 33, 29], top: 0 },   // ring
  { c: [[716, 776], [672, 760], [632, 748], [610, 743]], w: [30, 28, 24, 20], top: 0 },   // little
];
function paintLeft(o, pose) {
  const r = rng(7001), b = pose.b;
  fillPath(o, L_BACK.map((p) => add(p, b)), skin(0.97));
  const F = L_FINGERS.map((f) => finger(f.c, f.w, b, f.top ? pose.t : pose.f));
  // the dark gap under the ring finger's curled tip, and a thinner one under the little finger
  { const f = F[2], tip = f.at(1), m = f.at(0.6);
    fillPath(o, [add(tip, [-6, 6]), add(tip, [4, 16]), add(m, [14, 20]), add(m, [30, 12]), add(m, [6, 4])], blkA(0.92)); }
  { const f = F[3], tip = f.at(1), m = f.at(0.55);
    fillPath(o, [add(tip, [-2, 5]), add(tip, [6, 10]), add(m, [16, 12]), add(m, [10, 6])], blkA(0.75)); }
  // little -> index: each upper finger overlaps the one below
  for (let i = F.length - 1; i >= 0; i--) {
    const f = F[i], w = L_FINGERS[i].w[2];
    const g = o.createLinearGradient(...f.at(0.2), ...f.at(1).map((v, k) => v + f.dir[k] * w * 0.5));
    g.addColorStop(0, skin(0.97)); g.addColorStop(0.7, skin(0.95)); g.addColorStop(1, skin(0.88));
    fillPath(o, f.pts, g, false);
    o.save(); o.beginPath(); o.moveTo(f.pts[0][0], f.pts[0][1]); for (const p of f.pts) o.lineTo(p[0], p[1]); o.closePath(); o.clip();
    // grey along the lower side (the finger turns away), and a grey rim round the knuckle end
    o.filter = "blur(3px)";
    taper(o, f.lo.slice(3).map(([x, y]) => [x + 1, y - 3]), (u) => 5 + 5 * u, skin(0.72));
    taper(o, f.cap.slice(4).map(([x, y]) => [x + 2, y - 1]), () => 5, skin(0.78));
    o.filter = "none";
    // skin hatching along the finger (tendons), toward the knuckle end
    for (let k = 0; k < 6; k++) { const p = f.at(0.2 + k * 0.11), n = [-f.dir[1], f.dir[0]], q0 = add(p, n, (r() - 0.3) * w * 0.5); stroke(o, [q0, add(q0, f.dir, 8 + r() * 8)], 1 + r() * 0.9, blkA(0.13 + r() * 0.15)); }
    o.restore();
    // outlines: the crease along the lower edge heavy (it is the line between this finger and the next), the
    // knuckle end round, the upper edge only on the index (the hand's top contour)
    outline(o, [...f.cap.slice(3), ...f.lo.slice().reverse().slice(0, Math.floor(f.lo.length * 0.75))], 2.8, K, false, 0.35);
    if (i === 0) outline(o, [...f.up.slice(Math.floor(f.up.length * 0.3)), ...f.cap.slice(0, 4)], 2, K, false, 0.35);
    else outline(o, f.cap.slice(0, 4), 1.4, K, false, 0.3);
    // wrinkles over the middle-joint knuckle: small curved strokes
    const n = [-f.dir[1], f.dir[0]], kj = f.at(0.86);
    for (let k = 0; k < 3; k++) stroke(o, [add(add(kj, n, -w * 0.25), f.dir, -k * 4), add(add(kj, n, -w * 0.02), f.dir, 2 - k * 4), add(add(kj, n, w * 0.2), f.dir, -k * 4)], 1, blkA(0.3 - k * 0.06));
  }
  // tendons over the back of the hand: short grey strokes running from the knuckles toward the wrist
  for (let i = 0; i < 80; i++) {
    const x = 690 + r() * 180, y = 680 + r() * 150;
    if (y < 700 + (x - 700) * 0.2 || x + y > 1660 || y - x * 0.62 < 262) continue;
    const a = 0.7 + (r() - 0.5) * 0.3, L = 8 + r() * 16;
    stroke(o, [[x + b[0], y + b[1]], [x + b[0] + Math.cos(a) * L * 0.5, y + b[1] + Math.sin(a) * L * 0.5 + 1], [x + b[0] + Math.cos(a) * L, y + b[1] + Math.sin(a) * L]], 1.1 + r() * 1.4, blkA(0.12 + r() * 0.22));
  }
  // thumb-side shadow: a band of hatching along the lower edge
  for (let i = 0; i < 28; i++) {
    const x = 640 + i * 5.6 + r() * 3, y = 764 + i * 3.6;
    stroke(o, [[x + 2 + b[0], y - 2 + b[1]], [x - 4 + b[0], y - 14 - r() * 14 + b[1]]], 1.2, blkA(0.4));
  }
  outline(o, [[800, 670], [816, 691], [837, 709], [855, 720], [866, 738], [867, 763], [869, 784], [876, 799]].map((p) => add(p, b)), 3);
  outline(o, [[624, 752], [651, 770], [676, 781], [698, 797], [723, 813], [744, 831], [766, 845], [784, 856], [796, 863]].map((p) => add(p, b)), 3.2);
}

// ---------------------------------------------------------------- right hand
// One outline (traced at 4x): the top of the hand from the wrist to the index knuckle, the index finger down to its
// tip on a key, back along its underside (the top of the dark gap), the gap's palm end, the thumb's top edge to its
// tip by the trackpad, its underside and the bottom of the hand back to the wrist. The gap is left open: the keys
// show through it, darkened by the hand's shadow, with the curled fingertips along its top and the palm hatched.
const R_TOP = [[1214, 642], [1180, 632], [1140, 612], [1100, 588], [1060, 572], [1012, 558], [980, 556], [966, 559], [952, 568], [932, 582], [918, 596],
  [902, 612], [890, 625], [882, 636], [878, 643]];
const R_ITIP = [[879, 648], [886, 651]];
const R_IUNDER = [[896, 647], [906, 641], [922, 631], [940, 621], [957, 615], [975, 614], [998, 619], [1014, 628], [1025, 640], [1031, 654]];
const R_TTOP = [[1026, 664], [1012, 662], [994, 660], [975, 662], [952, 665], [939, 667]];
const R_TTIP = [[934, 672], [932, 684], [936, 694], [944, 699]];
const R_BOT = [[962, 702], [1000, 705], [1030, 705], [1052, 702], [1080, 712], [1120, 712], [1180, 705], [1196, 708], [1192, 690], [1194, 664], [1214, 642]];
// part weights for the warp: the index tip moves most, the thumb tip with the thumb, the rest with the back
const wI = ([x, y]) => (y < 657 ? Math.max(0, Math.min(1, (1010 - x) / 85)) : 0);
const wT = ([x, y]) => (y >= 657 ? Math.max(0, Math.min(1, (1060 - x) / 120)) : 0);
function paintRight(o, pose) {
  const r = rng(7002), b = pose.b;
  const W = (p) => [p[0] + b[0] + pose.i[0] * wI(p) + pose.t[0] * wT(p), p[1] + b[1] + pose.i[1] * wI(p) + pose.t[1] * wT(p)];
  const top = R_TOP.map(W), itip = R_ITIP.map(W), iunder = R_IUNDER.map(W), ttop = R_TTOP.map(W), ttip = R_TTIP.map(W), bot = R_BOT.map(W);
  const hand = [...top, ...itip, ...iunder, ...ttop, ...ttip, ...bot];
  // the gap: its dark shade over the keys (behind the hand), then the curled fingers inside it
  const gap = [...iunder, ...ttop, [ttop[ttop.length - 1][0] - 30, ttop[ttop.length - 1][1] - 6], [iunder[0][0] - 8, iunder[0][1] + 8]];
  o.save(); o.filter = "blur(1.5px)"; fillPath(o, gap, blkA(0.8), false); o.restore();
  const ft = pose.i.map((v) => v * 0.5);
  const CURL = [
    { c: [[972, 630], [946, 632], [920, 636]], w: [15, 14, 13], v: 0.72 },   // middle: its back and tip (917–932, 627–640)
    { c: [[984, 626], [966, 626], [950, 628]], w: [12, 11, 10], v: 0.66 },    // ring tip (945–960, 622–632)
    { c: [[1004, 632], [992, 632], [978, 634]], w: [9, 8, 7], v: 0.52 },     // little finger tip (975–987, 630–636)
  ];
  CURL.forEach((f, k) => {
    const F = finger(f.c, f.w, b, ft);
    const g = o.createLinearGradient(...F.at(0), ...F.at(1)); g.addColorStop(0, skin(0.3)); g.addColorStop(0.55, skin(f.v * 0.9)); g.addColorStop(1, skin(f.v));
    fillPath(o, F.pts, g, false);
    outline(o, [...F.cap.slice(2), ...F.lo.slice().reverse().slice(0, 12)], 1.5, K, false, 0.3);
    const t = F.at(0.8), n = [-F.dir[1], F.dir[0]];
    stroke(o, [add(t, n, -f.w[2] * 0.4), add(t, F.dir, 3), add(t, n, f.w[2] * 0.35)], 1, blkA(0.5));
  });
  // palm: fine parallel hatching at the right end of the gap (light lines on the shadow)
  o.save(); o.beginPath(); o.moveTo(gap[0][0], gap[0][1]); for (const p of gap) o.lineTo(p[0], p[1]); o.closePath(); o.clip();
  for (let k = 0; k < 16; k++) { const x = 980 + k * 3.4 + b[0], y = 668 + b[1]; stroke(o, [[x - 6, y + 2], [x + 10, y - 14], [x + 22, y - 34]], 1.1, inkA(0.5), 0.5); }
  o.restore();
  // the hand
  fillPath(o, hand, skin(0.98), false);
  o.save(); o.beginPath(); o.moveTo(hand[0][0], hand[0][1]); for (const p of hand) o.lineTo(p[0], p[1]); o.closePath(); o.clip();
  o.filter = "blur(4px)";
  // the index finger's underside and the thumb's underside turn away from the light; the thumb web
  taper(o, iunder.slice(0, 6).map(([x, y]) => [x, y - 5]), (u) => 9 - 4 * u, skin(0.8));
  taper(o, [...ttip.slice(2), ...bot.slice(0, 4)].map(([x, y]) => [x, y - 5]), () => 9, skin(0.8));
  o.filter = "none";
  o.restore();
  // fringe: short strokes fanning out from the gap's palm end over the hand
  for (let k = 0; k < 18; k++) {
    const u = k / 17, p = mix(iunder[6], ttop[0], u), d = nrm(0.7 + u * 0.3, -0.7 + u * 1.1);
    stroke(o, [add(p, d, -2), add(p, d, 6 + r() * 9)], 0.9 + r() * 0.6, blkA(0.45 + r() * 0.3), 0.3);
  }
  // outlines
  outline(o, [...top, ...itip], 2.6, K, false, 0.35);
  outline(o, [...itip, ...iunder.slice(0, 7)], 2.6, K, false, 0.4);
  outline(o, [...ttop.slice(1), ...ttip, ...bot.slice(0, 4)], 2.6, K, false, 0.4);
  outline(o, bot.slice(3, 8), 2.3, K, false, 0.4);
  // knuckle ridge across the back of the hand, the index's joint creases and nail edge
  stroke(o, [[930, 592], [960, 585], [995, 583], [1025, 586], [1068, 598]].map(W), 1.7, blkA(0.7), 0.5);
  { const j = W([918, 612]);
    for (let k = -1; k <= 1; k++) stroke(o, [add(j, [k * 3 - 6, -12]), add(j, [k * 3 + 1, 0]), add(j, [k * 3 + 6, 10])], 1.1, blkA(0.35));
    const t = W([888, 640]); stroke(o, [add(t, [-2, -7]), add(t, [3, -1]), add(t, [6, 5])], 1.2, blkA(0.45)); }
  // thumb nail (935–957, 667–692) and the joint's creases (980–992, 667–695)
  { const n0 = W([946, 680]);
    const pts = [add(n0, [-11, -12]), add(n0, [10, -12]), add(n0, [11, 11]), add(n0, [-10, 12])];
    o.fillStyle = skin(0.99); o.strokeStyle = blkA(0.85); o.lineWidth = 1.8; o.beginPath(); smoothPath(o, pts, true); o.fill(); o.stroke();
    for (let k = 0; k < 3; k++) { const p = W([982 + k * 5, 668]); stroke(o, [p, add(p, [1, 12 + (k % 2) * 6]), add(p, [0, 24])], 1.1, blkA(0.35)); }
    hatchRow(o, W([958, 700]), W([1040, 704]), nrm(0.35, -1), 16, 7, 1, 0.3, 7010);
  }
  // tendon hatching: small groups of short parallel strokes running from the knuckles toward the wrist
  for (const [x, y, n] of [[1036, 596, 5], [1062, 610, 4], [1098, 628, 5], [1128, 646, 4], [1080, 660, 4], [1140, 676, 3], [1010, 604, 3], [1160, 612, 3]]) {
    hatchRow(o, W([x, y]), W([x + 12, y + 3]), nrm(1, 0.28), n, 12, 1.1, 0.3, 7020 + x);
  }
  for (let i = 0; i < 26; i++) {
    const p = W([1000 + r() * 180, 590 + r() * 100]);
    stroke(o, [p, add(p, [14 + r() * 12, 4 + r() * 6])], 1 + r() * 1, blkA(0.1 + r() * 0.14));
  }
}

// Measured per-frame offsets (px, vs the first frame) for frames 29.04 + 0.04·i, i = 0..37 (phase correlation on
// small boxes of the source; see the header).
const RI = [[0, 0], [0.9, -4.6], [0.7, -4.9], [0.1, -0.7], [0.4, -2.8], [1.3, -5.6], [0, 0.6], [0, 0.7], [1.2, -4.7], [0.9, -4.6], [-0.2, 0.9], [-0.2, 0.9], [1.1, -4.7],
  [0.7, -3.4], [0.7, -3.6], [-0.1, 0], [1.2, -4.6], [1.1, -5.3], [-0.4, 0.6], [-0.4, 0.6], [1.1, -5.2], [0.6, -2.9], [-0.2, 0.9], [-0.2, 0.8], [-0.3, 0.9], [1.2, -4.8],
  [0.5, -2.7], [0.5, -2.7], [-0.1, -0.7], [0.9, -4.1], [-0.2, 0.3], [-0.3, 0.5], [-0.4, 0.4], [1.1, -4.3], [-0.1, 0.6], [-0.3, 0.6], [-0.5, -0.3], [1, -3.8]];
const RT = [[0.5, 0], [0.5, -2.8], [0.5, -2.8], [0.2, -0.9], [0.4, -1.6], [0.6, -2.9], [0.3, 0], [0.3, 0], [0.5, -2.6], [0.6, -2.1], [0.1, 0.5], [-0.1, 0.5], [0.8, -2.2],
  [0.5, -1.9], [0.5, -1.9], [0.2, -0.5], [0.8, -2.2], [0.5, -2.8], [0.2, 0], [0.1, -0.1], [0.5, -3], [0.5, -1.8], [0.1, 0.3], [0, 0.2], [0, 0.2], [0.6, -2.8], [0.7, -1.4],
  [0.6, -1.4], [0.3, -0.9], [0.6, -2.2], [0.1, -0.4], [0.3, -0.4], [0.1, -0.3], [0.7, -2.3], [0.1, -0.3], [0.2, -0.3], [-0.2, -0.6], [0.7, -2.3]];
const RB = [[0, 0], [1, -0.8], [1, -0.8], [0, -0.2], [0.8, -0.4], [1.7, -0.7], [-0.2, 0], [-0.2, 0], [1.3, -0.5], [0.9, -0.6], [-0.7, 0], [-0.6, 0], [1.1, -0.8], [0.8, -0.4],
  [0.8, -0.4], [-0.2, 0], [1, -0.7], [1.4, -0.5], [-0.7, 0], [-0.7, 0], [1, -1.3], [0.7, -0.4], [-0.7, 0.2], [-0.7, 0.1], [-0.7, 0.1], [1.5, -0.6], [0.7, -0.5], [0.7, -0.5],
  [-0.2, -0.2], [0.9, -0.6], [-0.2, 0], [-0.1, 0], [-0.1, 0], [1, -0.8], [-0.1, 0], [-0.1, 0], [0, 0], [0.9, -0.7]];
const LT = [[0, 0], [-0.1, -0.1], [-0.1, -0.1], [-0.1, -0.1], [-1.3, 1.6], [0.4, -3.3], [3.1, -2.7], [3.2, -2.5], [1.6, -2.4], [-0.8, 1.4], [-0.8, 0.7], [-0.5, 0.5],
  [0.8, -2.5], [0.1, -1], [0.1, -1.1], [-0.9, 1.1], [-0.6, 0.7], [0.1, -0.9], [0, -0.8], [0, -0.9], [-1.1, 0.7], [2.3, -1.8], [2.9, -2.5], [2.9, -2.5], [2.8, -2.5],
  [0.5, -1.2], [-0.7, 1.3], [-0.8, 1.3], [-0.2, 0.2], [0.5, -3.1], [-0.4, -0.8], [-1.6, 1.7], [-1.6, 1.7], [-0.6, -0.3], [0.3, -1.5], [0.1, -1.5], [0, -1.4], [-1.1, 1.4]];
const LF = [[0, 0], [0.1, 0], [0, 0], [0, 0.1], [-1, 2.1], [0.6, -1.9], [1.2, -3.6], [1.2, -3.6], [1.2, -2.2], [-1.3, 2], [-1, 0.9], [-0.8, 0.6], [1, -1.8], [0.3, -0.8],
  [0.4, -0.7], [-1, 1.5], [-0.5, 1], [0.6, -0.7], [0.5, -0.6], [0.4, -0.6], [-0.8, 1.4], [1, -2.1], [1.5, -3.7], [1.4, -3.7], [1.4, -3.8], [0.4, -1.1], [-1.1, 1.7],
  [-1.2, 1.6], [-0.7, 0.3], [0.6, -2.1], [0.1, -0.5], [-1.7, 2.5], [-1.7, 2.5], [0.1, -0.4], [0.5, -1.6], [0.4, -1.5], [0.4, -1.3], [-1, 1.8]];
// The box averages include static keys, so the parts themselves move more than measured. Gains tuned until the
// render's Farneback flow per frame matched the source's (right hand box 0.97 vs 1.09 px, index 1.9 vs 1.8, thumb
// 1.1 vs 1.4, back 0.5 vs 0.65, left ring 1.3 vs 1.35): left fingers 1.5–1.6x, right index 1.35x, thumb 1.7x, the
// right back 1.2x, the left back 0.15x of its fingers (it barely moves).
const q2 = (v) => Math.round(v * 2) / 2;
function poseAt(i) {
  const c = Math.max(0, Math.min(RI.length - 1, i));
  const sc = (p, k) => [q2(p[0] * k), q2(p[1] * k)];
  const b = sc(RB[c], 1.2);
  return {
    R: { b, i: sc([RI[c][0] - RB[c][0] * 1.2, RI[c][1] - RB[c][1] * 1.2], 1.35), t: sc([RT[c][0] - RB[c][0] * 1.2, RT[c][1] - RB[c][1] * 1.2], 1.7) },
    L: { b: sc(LF[c], 0.15), f: sc(LF[c], 1.5), t: sc(LT[c], 1.6) },
  };
}
export const HAND_POSES = RI.length;

const X0 = 560, Y0 = 520, HW = 680, HH = 380;
// the left sleeve's outline (same as figure.js SLEEVE_L)
const SLEEVE_L = [[790, 952], [797, 886], [806, 846], [832, 819], [871, 802], [899, 805], [943, 847], [971, 869], [1010, 897], [1038, 919], [1072, 952]];
const cache = new Map();
export function handsLayer(frameIdx) {
  const pose = poseAt(frameIdx);
  const key = JSON.stringify(pose);
  let c = cache.get(key);
  if (!c) {
    c = document.createElement("canvas"); c.width = HW; c.height = HH;
    const o = c.getContext("2d");
    o.translate(-X0, -Y0);
    paintLeft(o, pose.L);
    paintRight(o, pose.R);
    // the wrists go into the sleeves (drawn on the static plate underneath): cut the hands there
    o.globalCompositeOperation = "destination-out";
    fillPath(o, SLEEVE_L, "#000");
    o.beginPath(); o.moveTo(1198, 640); o.lineTo(1189, 670); o.lineTo(1190, 700); o.lineTo(1205, 741); o.lineTo(1300, 760); o.lineTo(1300, 600); o.lineTo(1215, 600); o.closePath(); o.fill();
    o.globalCompositeOperation = "source-over";
    cache.set(key, c);
  }
  return { canvas: c, x: X0, y: Y0 };
}
export function releaseHands() { cache.clear(); }
