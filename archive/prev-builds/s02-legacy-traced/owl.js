// s02 owl: the small round owl on the cartons (face-on, big round glossy worried eyes, one bent tuft, crossed
// bandage, chunky dark headphones) and the same owl flying (eyes shut, wings spread and flapping, feet dangling).
// Built on the shared owl kit (owlInk.js): head/body/wings/feet/bandage from the kit; the cute eyes, worried brows,
// kite beak, heart-shaped facial disc and the dark headphones are drawn on top through the kit's `extra` hook.
// Proportions measured on the source at 14.6 s (sitting) and 18.6 s (flying): snapshots/s02-study/owl-*.jpg.
import { owlLayer, owlPose, ink, gv, LINE, featherShape, setPPU, V } from "../../lib/owlInk.js";
import { smoothPath } from "../../lib/paths.js";
import { lerp } from "../../lib/rng.js";

const PI = Math.PI;
// sitting (boxes framing): head top y 100, headphone band top 60, eyes (1053,185) (1121,185), body 994–1181,
// claws on the box edge at y 317–347  ->  root (1086, 246), 0.675 px per unit
export const SIT = { x: 1087, y: 247, s: 0.65 };

const HEAD = { x: 0, y: -118, rx: 131, ry: 98, yaw: 0, pitch: 0, roll: 0, square: 2.2, jowl: 0.12 };
const BASE = {
  light: [-0.35, -0.9],
  head: HEAD,
  tufts: [{ at: 0.62, size: 38, width: 0.26, lean: 0.45, second: 0.55, curl: 0.45 }],
  body: { x: 0, y: 12, a: 118, b: 150, rot: PI / 2, egg: -0.16, sag: 0 },
  tail: null,
  feet: [{ x: -40, y: 124, rot: 0, size: 24, mode: "perch", seed: 2 }, { x: 52, y: 122, rot: 0, size: 24, mode: "perch", seed: 5 }],
  eyes: { state: "stare", r: 20, spread: 2.4, el: -0.3 },     // the kit's own eyes are turned behind the head (hidden)
  beak: { el: -0.62, lift: 1.12, w: 0.001, l: 0.001 },
  bandage: { az: -0.62, el: 0.62, size: 70, rot: -0.3 },
  headphones: { on: false },
  flow: [0, 1],
  disc: 0,
};
function foldedWings(k) {
  // k = 0: folded down the sides; k > 0: the wings lift out and up for the take-off
  if (k <= 0.001) return [
    { type: "folded", layer: "front", S: [-132, -30], T: [-114, 112], width: 30, back: 14, dir: -1 },
    { type: "folded", layer: "front", S: [132, -30], T: [114, 112], width: 30, back: 14, dir: 1 },
  ];
  const w = (sd) => ({
    type: "spread", layer: "back", S: [sd * 110, -40],
    Wr: [sd * lerp(160, 220, k), lerp(30, -50, k)], T: [sd * lerp(200, 360, k), lerp(130, -20, k)],
    trail: [sd * lerp(-0.3, 0.1, k), 1], len: lerp(60, 100, k), spread: lerp(0.5, 1, k), n: 6, m: 5,
  });
  return [w(-1), w(1)];
}
// flapping: e = wing elevation -1 (down) .. 0 (level) .. 1 (up). Keys: wrist, tip, trail (the way the feathers
// hang), feather length (owl units, right wing; the left is mirrored)
const WK = {
  UP: { Wr: [150, -205], T: [175, -385], tr: [0.95, 0.3], len: 150 },
  LEV: { Wr: [215, -95], T: [370, -120], tr: [0.1, 1], len: 150 },
  DN: { Wr: [205, 20], T: [320, 150], tr: [-0.4, 0.9], len: 138 },
};
function wingKey(e) {
  const [A, B, u] = e >= 0 ? [WK.LEV, WK.UP, e] : [WK.LEV, WK.DN, -e];
  const mix = (a, b) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u)];
  return { Wr: mix(A.Wr, B.Wr), T: mix(A.T, B.T), tr: V.nrm(mix(A.tr, B.tr)), len: lerp(A.len, B.len, u) };
}
// one feather: soft white with a darker root, dark outline, pale shaft
function feather(g, root, dir, L, w, tone = 0.95) {
  const f = featherShape(root, dir, L, w);
  const path = (c) => smoothPath(c, f, true);
  g.beginPath(); path(g);
  const e = V.add(root, V.mul(dir, L));
  const gr = g.createLinearGradient(root[0], root[1], e[0], e[1]);
  gr.addColorStop(0, gv(tone - 0.14)); gr.addColorStop(0.5, gv(tone)); gr.addColorStop(1, gv(tone - 0.04));
  g.fillStyle = gr; g.fill();
  g.lineWidth = 2.0; g.strokeStyle = gv(0.3, 0.8); g.lineJoin = "round"; g.stroke();
  ink(g, [V.add(root, V.mul(dir, L * 0.12)), V.add(root, V.mul(dir, L * 0.7))], 1.1, gv(0.55, 0.5), { end: 0.1 });
}
// a broad fan wing (the source's: long primaries fanning from the hand, secondaries hanging from the arm, two
// scalloped covert rows and a rounded leading edge), drawn in owl units on a context already set to the owl's frame
export function drawFanWing(g, sd, e) {
  const k = wingKey(e), S = [sd * 104, -44], Wr = [sd * k.Wr[0], k.Wr[1]], T = [sd * k.T[0], k.T[1]], tr = [sd * k.tr[0], k.tr[1]];
  const hand = V.nrm(V.sub(T, Wr)), L = k.len;
  // primaries: from the hand, fanning from the hand direction (outermost) toward the trail
  for (let i = 7; i >= 0; i--) {
    const f = i / 7, root = V.mix(Wr, T, 0.05 + 0.75 * f);
    const dir = V.nrm(V.mix(tr, hand, 0.15 + 0.85 * Math.pow(f, 0.8)));
    feather(g, root, dir, L * (0.95 + 0.3 * f), 44);
  }
  // secondaries along the arm
  for (let i = 6; i >= 0; i--) {
    const f = i / 6, root = V.mix(S, Wr, 0.1 + 0.9 * f);
    feather(g, root, V.nrm(V.add(tr, V.mul(V.nrm(V.sub(Wr, S)), -0.12))), L * (0.78 + 0.1 * f), 46);
  }
  // covert rows: shorter, rounder feathers overlapping the roots
  for (const [n, len, w, off] of [[8, 0.5, 40, 0.3], [7, 0.34, 36, 0.12]]) {
    for (let i = n - 1; i >= 0; i--) {
      const f = i / (n - 1), root = f < 0.7 ? V.mix(S, Wr, f / 0.7) : V.mix(Wr, T, (f - 0.7) / 0.3 * 0.35);
      const dir = f < 0.7 ? tr : V.nrm(V.mix(tr, hand, (f - 0.7) / 0.3 * 0.6));
      feather(g, V.add(root, V.mul(dir, L * off * 0.3)), dir, L * len, w, 0.97);
    }
  }
  // leading edge: a rounded pale band from the shoulder over the wrist to the hand
  const lead = [S, V.mix(S, Wr, 0.5), Wr, V.mix(Wr, T, 0.35)];
  ink(g, lead, 34, gv(0.3, 0.85), { end: 0.5, pow: 0.3 });
  ink(g, lead, 30, gv(0.97), { end: 0.5, pow: 0.3 });
}

// studio headphones (measured at 14.6 s): a pale metal band arching well above the crown, big dark-grey cups hung
// just outside the head, centred a little below the eyes' line, with ribbing and bright rim highlights
function headphones(g, H) {
  const top = H.toFrame(0, -H.ry * 1.62), L = H.toFrame(-H.rx * 1.12, H.ry * 0.25), R = H.toFrame(H.rx * 1.12, H.ry * 0.25);
  const band = [[L[0] - 4, L[1] - 70], [L[0] + 2, top[1] + 62], [top[0], top[1]], [R[0] - 2, top[1] + 62], [R[0] + 4, R[1] - 70]];
  ink(g, band, 11, LINE, { end: 0.8, pow: 0.3 });
  ink(g, band.map(([x, y]) => [x, y + 2]), 2.4, gv(0.7, 0.9), { end: 0.2 });
  for (const [c, sd] of [[L, -1], [R, 1]]) {
    const rx = 25, ry = 72;
    g.save(); g.translate(c[0], c[1]); g.rotate(H.roll + sd * 0.04);
    // yoke up to the band
    ink(g, [[sd * 4, -ry * 0.9], [sd * 2, -ry * 1.1]], 9, gv(0.2), { end: 0.8 });
    // cushion (toward the head) and shell (outside)
    g.beginPath(); g.ellipse(-sd * 10, 0, rx * 0.8, ry * 0.94, 0, 0, 2 * PI); g.fillStyle = gv(0.14); g.fill();
    g.beginPath(); g.ellipse(sd * 6, 0, rx, ry, 0, 0, 2 * PI); g.fillStyle = gv(0.16); g.fill();
    for (let k = -5; k <= 5; k++) { const y = k * ry * 0.16; ink(g, [[sd * -2, y], [sd * 16, y + 1]], 1.8, gv(0.05, 0.8), { end: 0.4 }); }
    g.beginPath(); g.ellipse(sd * 6, 0, rx * 0.78, ry * 0.86, 0, sd > 0 ? -PI * 0.45 : -PI * 0.55, sd > 0 ? PI * 0.35 : PI * 1.4, sd < 0); g.lineWidth = 3.0; g.strokeStyle = gv(0.75, 0.75); g.stroke();
    g.beginPath(); g.ellipse(sd * 6, 0, rx, ry, 0, 0, 2 * PI); g.lineWidth = 2.6; g.strokeStyle = LINE; g.stroke();
    g.restore();
  }
}

// the cute face, drawn in owl units on top of the kit's head (geo.H = head geometry)
function face(g, geo, st) {
  const H = geo.H, P = H.P;
  const eyes = [-1, 1].map((sd) => P(sd * 0.4, -0.29));
  const R = 27;
  // heart-shaped facial disc: two arcs from the top centre round the eyes down to the beak, faint
  const top = P(0, 0.3), bk = P(0, -0.62);
  for (const sd of [-1, 1]) {
    const e = eyes[sd < 0 ? 0 : 1];
    const pts = [[top.x, top.y], [top.x + sd * 24, top.y - 14], [e.x + sd * 12, e.y - R * 1.9], [e.x + sd * R * 1.6, e.y - 10], [e.x + sd * R * 1.35, e.y + R * 1.3], [bk.x + sd * 24, bk.y + 26]];
    ink(g, pts, 2.0, gv(0.4, 0.6), { end: 0.2 });
  }
  for (const [i, e] of eyes.entries()) {
    const sd = i ? 1 : -1;
    if (st.eyes === "closed") {
      // shut: a lid line sagging in the middle
      ink(g, [[e.x - R * 1.0, e.y - 4], [e.x - R * 0.35, e.y + 6], [e.x + R * 0.35, e.y + 6], [e.x + R * 1.0, e.y - 4]], 3.6, LINE, { end: 0.2 });
      continue;
    }
    const half = st.eyes === "half";
    g.save();
    g.beginPath(); g.arc(e.x, e.y, R, 0, 2 * PI); g.fillStyle = gv(0.97); g.fill();
    g.clip();
    const lx = (st.look || [0, 0])[0] * 5, ly = (st.look || [0, 0])[1] * 5;
    const ir = R * 0.74;
    g.beginPath(); g.arc(e.x + lx, e.y + 1 + ly, ir, 0, 2 * PI); g.fillStyle = gv(0.2); g.fill();
    g.lineWidth = 2; g.strokeStyle = LINE; g.stroke();
    g.beginPath(); g.arc(e.x + lx, e.y + 2 + ly, ir * 0.55, 0, 2 * PI); g.fillStyle = gv(0.04); g.fill();
    g.beginPath(); g.ellipse(e.x + lx + ir * 0.34, e.y + ly - ir * 0.3, ir * 0.3, ir * 0.26, -0.4, 0, 2 * PI); g.fillStyle = gv(0.98); g.fill();
    g.beginPath(); g.arc(e.x + lx - ir * 0.32, e.y + ly + ir * 0.38, ir * 0.12, 0, 2 * PI); g.fill();
    if (half) { g.fillStyle = gv(0.94); g.fillRect(e.x - R * 1.2, e.y - R * 1.2, R * 2.4, R * 1.2); }
    g.restore();
    g.beginPath(); g.arc(e.x, e.y, R, 0, 2 * PI); g.lineWidth = 3.4; g.strokeStyle = LINE; g.stroke();
    if (half) ink(g, [[e.x - R * 1.05, e.y - 2], [e.x, e.y - 4], [e.x + R * 1.05, e.y - 2]], 5, LINE, { end: 0.5 });
    // worried brow: a small arc above the eye, raised at the inner end
    const inner = -sd;
    ink(g, [[e.x - inner * R * 0.95, e.y - R * 1.28], [e.x - inner * R * 0.1, e.y - R * 1.5], [e.x + inner * R * 0.7, e.y - R * 1.8]], 2.6, LINE, { end: 0.25 });
  }
  // kite beak: outlined, pale, pointing down
  const b = P(0, -0.55, 1.06);
  const kite = [[b.x, b.y - 10], [b.x + 14, b.y + 6], [b.x, b.y + 34], [b.x - 14, b.y + 6]];
  g.beginPath(); g.moveTo(kite[0][0], kite[0][1]); for (const p of kite.slice(1)) g.lineTo(p[0], p[1]); g.closePath();
  g.fillStyle = gv(0.86); g.fill(); g.lineWidth = 2.4; g.lineJoin = "round"; g.strokeStyle = LINE; g.stroke();
  ink(g, [[b.x - 12, b.y + 6], [b.x, b.y + 9], [b.x + 12, b.y + 6]], 1.2, gv(0.3, 0.6));
  headphones(g, H);
}

// the kit sizes its layer from the head, body, wings and feet; the headphone band arcs above all of them, so an
// invisible "foot" (size ~0, under the band) makes the layer tall enough
const PIN = (x, y) => ({ x, y, rot: 0, size: 0.01, mode: "stand", leg: 0, toes: 3, seed: 1 });
const BBOX_PIN = PIN(0, -281), SIDE_PINS = [PIN(-190, -120), PIN(190, -120)];
export function sitOwl(st) {
  const pose = owlPose("front", BASE);
  pose.wings = foldedWings(st.wing || 0);
  pose.feet = [...BASE.feet, BBOX_PIN, ...SIDE_PINS];
  pose.tufts = BASE.tufts;
  pose.extra = (g, geo) => face(g, geo, st);
  return pose;
}
export function flyOwl(st) {
  const pose = owlPose("front", BASE);
  pose.wings = [];                                   // the wings are drawn separately, behind (drawFanWing)
  pose.tufts = BASE.tufts;
  // in flight the body hangs longer (measured: its lower edge ~65 units below the sitting pose's), feet dangling
  pose.body = st.perch ? BASE.body : { x: 0, y: 36, a: 142, b: 128, rot: PI / 2, egg: -0.12, sag: 0 };
  pose.feet = [...(st.perch ? BASE.feet : [{ x: -40, y: 176, rot: 0.15, size: 22, mode: "dangle", seed: 2 }, { x: 44, y: 172, rot: -0.1, size: 22, mode: "dangle", seed: 5 }]), BBOX_PIN, ...SIDE_PINS];
  pose.head = { ...HEAD, roll: st.roll || 0, yaw: st.yaw || 0 };
  pose.extra = (g, geo) => face(g, geo, { eyes: "closed" });
  return pose;
}
export { owlLayer };
