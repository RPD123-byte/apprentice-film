// s15 sets: one corridor layout + camera path per source take (the source joins short takes on held frames).
// Fix pass 2: the source's corridor is not a rigid set (the drawn boxes slide and breathe while the camera runs), so
// the near boxes of takes B, B2, C, D, E and H are keyed objects rebuilt in every source frame from corners tracked
// on the source (tracks*.js corner tracks -> defs*.js constructions -> keyed.js), and every visible face carries its
// measured brightness (lights*.js: four corner values per face, per frame for keyed boxes). Cameras are straight runs
// at owl height; far stacks are seeded filler. Takes IJ/J/J2 keep the fix-pass-1 layout authored in screen space
// (A.at(view(t))), with measured face values.
import { floor, floorC, panel, boxFaces, kbQuad } from "./build.js";
import { ROTO_B } from "./rotoB.js";
import { ROTO_A } from "./rotoA.js";
import { ROTO_C } from "./rotoC.js";
import { ROTO_D } from "./rotoD.js";
import { ROTO_E } from "./rotoE.js";
import { ROTO_H } from "./rotoH.js";
import { ROTO_I } from "./rotoI.js";
import { ROTO_J } from "./rotoJ.js";
import { author, view, viewOf, aim, HC, W, H, K } from "./author.js";
import { owlTrack } from "./track.js";
import { TRACKS_E } from "./tracksE.js";
import { DEFS_E } from "./defsE.js";
import { LIGHTS_E, STATIC_E } from "./lightsE.js";
import { LIGHTS_B, STATIC_B } from "./lightsB.js";
import { LIGHTS_H, STATIC_H } from "./lightsH.js";
import { TRACKS_H } from "./tracksH.js";
import { DEFS_H } from "./defsH.js";
import { STATIC_IJ } from "./lightsIJ.js";
import { STATIC_J } from "./lightsJ.js";
import { STATIC_J2 } from "./lightsJ2.js";
import { TRACKS_B } from "./tracksB.js";
import { DEFS_B, DEFS_B2 } from "./defsB.js";
import { LIGHTS_B2, STATIC_B2 } from "./lightsB2.js";
import { TRACKS_C } from "./tracksC.js";
import { DEFS_C } from "./defsC.js";
import { LIGHTS_C, STATIC_C } from "./lightsC.js";
import { TRACKS_D } from "./tracksD.js";
import { DEFS_D } from "./defsD.js";
import { LIGHTS_D, STATIC_D } from "./lightsD.js";
import { addKeyedTracks } from "./keyed.js";
import { DECALS } from "./decals.js";

const V = 2.5;   // default forward speed, units/s (per-frame ORB zoom of the source's near walls, 1.10-1.20x; fix pass 1)

// Held frames: the source repeats the previous frame here and its motion pauses for that frame (the pair fits across
// every hold continue the move at one frame's worth, e.g. 40.92 -> 40.96 zooms 1.149x like its neighbours).
export const DUPS = [40.92, 41.68, 41.92, 42.68, 42.88, 43.68, 43.88, 44.68, 44.84, 45.68];
export const resolveT = (t) => { for (const d of DUPS) if (Math.abs(t - d) < 0.005) return Math.round((t - 0.04) * 1e4) / 1e4; return t; };
// camera clock: seconds of motion since t0, with the held frames taken out
export function clock(t0, t) {
  let c = t - t0;
  for (const d of DUPS) if (d > t0 + 1e-6) c -= Math.max(0, Math.min(0.04, t - (d - 0.04)));
  return c;
}
// camera path: keys [t, vx, vy, x, roll(deg), y, hd]; (vx, vy) = where the corridor's +z vanishing point sits on screen;
// hd = the screen x of the direction of travel (the focus of expansion; default vx, i.e. straight down the corridor).
// Forward speed o.speed (u/s, or speed keys [[t, v], ...] in film time) integrated along the camera clock.
function camPath(t0, keys, o = {}) {
  const sp = o.speed ?? V;
  const vk = Array.isArray(sp) ? sp : [[t0, sp]];
  const vAt = (t) => {
    if (t <= vk[0][0]) return vk[0][1];
    for (let i = 1; i < vk.length; i++) if (t <= vk[i][0]) { const a = vk[i - 1], b = vk[i]; return a[1] + (b[1] - a[1]) * (t - a[0]) / (b[0] - a[0]); }
    return vk[vk.length - 1][1];
  };
  const key = (t) => {
    let a = keys[0], b = keys[keys.length - 1];
    if (t <= keys[0][0]) b = a;
    for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) { a = keys[i - 1]; b = keys[i]; break; }
    let f = b[0] > a[0] ? Math.min(1, Math.max(0, (t - a[0]) / (b[0] - a[0]))) : 0;
    f = f * f * (3 - 2 * f) * 0.5 + f * 0.5;
    return (k, d = 0) => (a[k] ?? d) + ((b[k] ?? d) - (a[k] ?? d)) * f;
  };
  // heading of travel relative to world +z from the two screen points (small-angle exact for the pitch in use)
  const ang = (x, vy) => Math.atan(((x - W / 2) * Math.cos(Math.atan((vy - H / 2) / K))) / K);
  const head = (t) => { const L = key(t); const vx = L(1), vy = L(2), hd = L(6, vx); return ang(hd, vy) - ang(vx, vy); };
  const pos = (t) => {
    // midpoint rule on a fixed 2 ms grid (deterministic); negative before t0 (the first frame's blur)
    const n = Math.max(1, Math.ceil(Math.abs(t - t0) / 0.002)), dt = (t - t0) / n;
    let x = 0, z = 0, c0 = 0;
    for (let i = 0; i < n; i++) {
      const tm = t0 + (i + 0.5) * dt, c1 = clock(t0, t0 + (i + 1) * dt), ds = vAt(tm) * (c1 - c0), psi = head(tm);
      x += Math.sin(psi) * ds; z += Math.cos(psi) * ds; c0 = c1;
    }
    return [x, z];
  };
  return (t) => {
    const L = key(t);
    const { yaw, pitch } = aim(L(1), L(2));
    const [px, pz] = pos(t);
    return { eye: [L(3) + px, L(5, o.hc ?? HC), (o.z0 ?? 0) + pz], yaw, pitch, roll: (L(4) * Math.PI) / 180, fov: 60 };
  };
}
const floorOf = (out, o = {}) => { floor(-3, 3, -1, o.zmax ?? 10, out, { tile: 1.0, alb: o.alb ?? 0.85 }); return out; };

// ---------------------------------------------------------------- A: 40.72–40.88 (keyboard leaning on the left)
const camA = camPath(40.72, [[40.72, 1080, 520, 0, 0], [40.88, 1110, 550, 0, 0]]);
function setA() {
  const A = author(viewOf(camA(40.72)), 101);
  A.kb([503, 910], [752, 876], [310, 83]);
  A.front(660, 993, 827, 510, 0.45, { tops: [193], alb: 1.0 });
  A.front(950, 1030, 720, 400, 0.4, { alb: 0.7 });
  A.front(1460, 1790, 813, 496, 0.42, { tops: [28], alb: 1.0 });
  A.front(1323, 1460, 700, 420, 0.4, { alb: 0.6 });
  A.box(0.75, 1.4, 0.2, 0.85, 0, 0.42, { stack: true, alb: 0.85 });
  A.box(-1.3, -0.62, 0.2, 0.75, 0, 0.4, { stack: true, alb: 0.8 });
  A.wall(-1, -0.45, 1.3, 10, { jut: 0.3 });
  A.wall(1, 0.45, 1.5, 10, { jut: 0.3 });
  return A.faces(floorOf([]));
}
// ---------------------------------------------------------------- B: 40.96–41.64 (the narrow alley: left boxes pass close, keyboard ahead right)
// The source corridor here is only about the owl's wingspan wide (walls ~0.2 left, ~0.3 right of the eye line), so the
// near boxes sweep past fast: time-to-contact of the near fronts ~0.35 s (pair fits 1.11-1.18x per frame, fix pass 1).
const camB = camPath(40.96, [[40.96, 1115, 505, 0, 0], [41.12, 1120, 500, 0, 0], [41.28, 1115, 500, 0, 0], [41.44, 1150, 505, 0, 0],
  [41.48, 1150, 500, 0, -2.6], [41.52, 1140, 480, 0, -1.2], [41.6, 1090, 462, 0, -0.5], [41.64, 1090, 465, 0, 0],
  [41.72, 1060, 540, 0, 0], [41.88, 1080, 540, 0, 0],
  // D: 41.96-42.08 the forward move all but stops and the view slides left (the near right box drifts right, the far
  // left stacks hold: pair fits ~1.00x); then the run picks up again, heading right of the corridor (fits' fixed point
  // x ~1250-1450) so the big right box looms
  [41.96, 950, 510, 0, 0, undefined, 1250], [42.08, 950, 510, -0.08, 0, undefined, 1250], [42.24, 1000, 505, -0.08, 0, undefined, 1150],
  [42.36, 1000, 505, -0.08, 0, undefined, 1350], [42.48, 1100, 510, -0.08, 0, undefined, 1320], [42.64, 1300, 520, -0.08, 0, undefined, 1270]],
  { speed: [[40.96, 1.6], [41.44, 1.6], [41.6, 1.8], [41.88, 2.2], [41.94, 2.2], [41.97, 0.3], [42.07, 0.3], [42.11, 2.8], [42.26, 2.8], [42.4, 3.1], [42.64, 3.1]] });
function setB() {
  const A = author(viewOf(camB(40.96)), 102);
  // B-1 (40.96–41.24): keyed boxes on corners tracked on the source
  addKeyedTracks(A, camB, TRACKS_B, DEFS_B, SRCF(1024, 1031), LIGHTS_B);
  // walls: the narrow B/C alley, then D, where the left side opens out to the keyboard and the gear shelves
  A.wall(-1, -0.2, 1.3, 2.35, { jut: 0.12 });
  A.wall(-1, -0.62, 2.35, 10, { jut: 0.1 });
  A.clear(-0.6, 0.0, 2.3, 3.7);
  A.wall(1, 0.3, 1.2, 10, { jut: 0.12 });
  const f = withStatic(A.faces(floorOf([], { zmax: 14 })), STATIC_B);
  f.dyn = (t) => A.dynFaces(t, []);
  return f;
}
// ---------------------------------------------------------------- B2: 41.28–41.64 (fix pass 2: its own set) the alley bends past
// the big lit boxes on the left; the stack on the right; the keyboard leaning in the gap ahead (defsB.js DEFS_B2)
const camB2 = camPath(41.28, [[41.28, 1103, 500, 0, 0, undefined, 1150], [41.64, 1103, 500, 0, 0, undefined, 1150]], { speed: 2.0 });
function setB2() {
  const A = author(viewOf(camB2(41.60)), 112);
  addKeyedTracks(A, camB2, TRACKS_B, DEFS_B2, SRCF(1032, 1041), LIGHTS_B2);
  A.kb([1250, 800], [1450, 850], [1350, 190]);
  A.wall(-1, -0.5, 0.8, 14, { jut: 0.12, top: 3.0 });
  A.wall(1, 0.7, 0.8, 14, { jut: 0.12, top: 3.0 });
  const f = withStatic(A.faces(floorOf([], { zmax: 14 })), STATIC_B2);
  f.dyn = (t) => A.dynFaces(t, []);
  return f;
}
// ---------------------------------------------------------------- C: 41.72–41.88 (fix pass 2: its own set) the lit stack right of the
// owl with the keyboard leaning on the boxes beyond it, the big lit box on the left; keyed on tracked corners (defsC.js)
const camC = camPath(41.72, [[41.72, 1103, 500, 0, 0, undefined, 1060], [41.88, 1103, 500, 0, 0, undefined, 1060]], { speed: 2.0 });
function setC() {
  const A = author(viewOf(camC(41.80)), 103);
  addKeyedTracks(A, camC, TRACKS_C, DEFS_C, SRCF(1043, 1047), LIGHTS_C);
  A.kb([1420, 935], [1640, 946], [1590, 30]);
  A.wall(-1, -0.4, 0.8, 14, { jut: 0.12, top: 3.0 });
  A.wall(1, 0.75, 0.8, 14, { jut: 0.12, top: 3.0 });
  const f = withStatic(A.faces(floorOf([], { zmax: 14 })), STATIC_C);
  f.dyn = (t) => A.dynFaces(t, []);
  return f;
}
// ---------------------------------------------------------------- D: 41.96–42.64 (fix pass 2: its own set; the near boxes are
// keyed on corners tracked on the source (defsD.js), the keyboard and the gear shelves on the left are static pictures
// placed where they stand at 42.36; the camera runs straight at the measured speed, heading left of centre (pair fits'
// focus of expansion x ~800-1300)
const camD = camPath(41.96, [[41.96, 1103, 500, 0, 0, undefined, 950], [42.64, 1103, 500, 0, 0, undefined, 950]], { speed: 2.0 });
function setD() {
  const A = author(viewOf(camD(42.36)), 104);
  addKeyedTracks(A, camD, TRACKS_D, DEFS_D, SRCF(1049, 1066), LIGHTS_D);
  A.kb([440, 835], [645, 830], [340, 250]);
  A.vp([600, 770], [830, 715], 60, "shelfA", { back: 0.35, alb: 1.1 });
  A.wall(-1, -0.75, 0.2, 14, { jut: 0.15, top: 3.0 });
  A.wall(1, 0.9, 0.2, 14, { jut: 0.15, top: 3.0 });
  const f = withStatic(A.faces(floorOf([], { zmax: 14 })), STATIC_D);
  f.dyn = (t) => A.dynFaces(t, []);
  return f;
}
// ---------------------------------------------------------------- E: 42.72–43.84 (one continuous run of the source: the box alley,
// the gap past the big left box, the tape-deck shelf ahead right, the left turn onto the lit box)
// Camera (fix pass 2): pairwise SIFT/E-matrix fits and a 13-frame bundle adjustment over 42.72–43.20 give almost no
// rotation and a focus of expansion at ~(1310, 545): the camera runs straight, heading ~14 deg right of where it looks
// (toward the owl); the left turn at 43.64–43.84 (+3..+7 deg per frame) comes from the same fits. The big near boxes are
// keyed objects rebuilt from corners tracked on the source (tracksE.js + defsE.js), so they land on their measured places
// in every frame; the far stacks are static filler.
const camE = camPath(42.72, [[42.72, 1103, 500, 0, 0, undefined, 1310], [43.28, 1103, 500, 0, 0, undefined, 1310],
  [43.40, 1103, 500, 0, 0, undefined, 1160], [43.64, 1103, 500, 0, 0, undefined, 1160], [43.72, 1160, 500, 0, 0, undefined, 1320],
  [43.76, 1220, 500, 0, 0, undefined, 1380], [43.80, 1300, 500, 0, 0, undefined, 1450], [43.84, 1400, 500, 0, 0, undefined, 1550]],
  { speed: 2.0 });
// measured values for static faces (lights*.js STATIC_*: face index -> value)
function withStatic(faces, ST) { if (ST) for (const [i, v] of Object.entries(ST)) if (faces[i]) faces[i].tv = v; return faces; }
// the source's own frames (film frame index) in [a, b], held duplicates left out
const SRCF = (a, b) => { const o = []; for (let f = a; f <= b; f++) if (!DUPS.some((d) => Math.abs(d * 25 - f) < 0.1)) o.push(f); return o; };
function setE() {
  const A = author(viewOf(camE(42.72)), 105);
  addKeyedTracks(A, camE, TRACKS_E, DEFS_E, SRCF(1068, 1096), LIGHTS_E);
  // far stacks (filler) on both sides of the alley, beyond the keyed boxes
  A.wall(-1, -0.45, 0.3, 14, { jut: 0.2, top: 3.2 });
  A.wall(1, 0.75, 0.3, 14, { jut: 0.2, top: 3.2 });
  const out = floorOf([], { zmax: 14 });
  const f = withStatic(A.faces(out), STATIC_E);
  f.dyn = (t) => A.dynFaces(t, []);
  return f;
}
// ---------------------------------------------------------------- H: 43.92–44.44 (the gear rack on the left, a cable coil on the floor,
// the big box on the right; the run veers left (fits' fixed point x ~250-900) with a shaky roll)
const camH = camPath(43.92, [[43.92, 680, 480, 0, 0], [44.0, 640, 480, 0, 2.1], [44.04, 620, 480, 0, 3.9],
  [44.08, 600, 480, 0, 3.1], [44.12, 600, 480, 0, 3.0], [44.16, 620, 480, 0, 5.0], [44.2, 720, 485, 0, 2.1],
  [44.24, 830, 490, 0, 2.3], [44.28, 880, 490, 0, 0.8], [44.32, 920, 490, 0, -0.8],
  [44.36, 1000, 495, 0, 0.2], [44.4, 1050, 500, 0, 0.7], [44.44, 1000, 500, 0, -0.4]],
  { speed: [[43.92, 2.8], [44.0, 2.0], [44.12, 2.0], [44.2, 1.6], [44.26, 2.6], [44.44, 3.2]] });
function setH() {
  const A = author(viewOf(camH(43.92)), 108);
  // the near boxes: keyed on corners tracked on the source (defsH.js)
  addKeyedTracks(A, camH, TRACKS_H, DEFS_H, SRCF(1098, 1111), LIGHTS_H);
  // 44.08: the gear rack along the left, its low box, the cable coil on the floor
  const A2 = A.at(viewOf(camH(44.08)));
  A2.vp([-250, 700], [560, 640], 0, "rackE", { y0: 0.14, back: 0.3, alb: 1.1 });
  A2.front(350, 650, 780, 520, 0.35, { alb: 0.7, stack: false });
  A2.decal([300, 840], [760, 840], [760, 930], [300, 930], "coil");
  // the gear rack is the left wall here; the stacks behind it and the right wall are filler
  A.wall(-1, -1.1, 0.4, 12, { jut: 0.1 });
  A.wall(1, 0.6, 0.4, 12, { jut: 0.1, top: 3.0 });
  const f = withStatic(A.faces(floorOf([], { zmax: 14 })), STATIC_H);
  f.dyn = (t) => A.dynFaces(t, []);
  return f;
}
// ---------------------------------------------------------------- I+J: 44.72–45.64 (the gear room: speaker, shelves, low boxes)
// Two takes of one set: I (44.72–44.84) and J (44.88–45.64), which restarts a little further left and slower, then
// speeds up as the owl flies off (speeds from the speaker's measured growth: camtrack on x > 1600).
// take I starts on the cut at 44.48 (pairflow: no fit 44.44 -> 44.48, then a steady 1.04x per frame zoom)
const Ispeed = (u) => 0.8 * (u - 0.24);
// take J: camtrack on the left shelving (x < 800) gives 1.038x per frame at 44.92 rising to ~1.1x by 45.3: the
// camera speeds up as the owl takes off
const Jspeed = (u) => 0.8 * u + 1.0 * u * u;   // the keyboard's floor contact and the floor flow give ~0.8-1.0 u/s early on
const camI = camPath(44.48, [[44.48, 1080, 480, 0, 0], [44.72, 1080, 475, 0, 0], [44.84, 1085, 470, 0, 0]], { speed: 0.8, z0: -0.192 });
const camJ = camPath(44.88, [[44.88, 1100, 520, 0, 0], [45.12, 1090, 520, 0, 0], [45.4, 1100, 530, 0, 0], [45.64, 1110, 540, 0, 0]], { speed: [[44.88, 0.8], [45.12, 1.0], [45.2, 1.5], [45.3, 2.2], [45.4, 3.0], [45.5, 4.0], [45.64, 5.0]] });
function setIJ() {
  const A = author(viewOf(camI(44.72)), 109);
  const v = A.v;
  // the two long low boxes in the left foreground (tops lit, fronts facing us) and the low box on the right
  const depthTo = (b, sx, sy) => { const q = v.atY(sx, sy, b.y + b.h); return q[2] - (b.z - b.d / 2); };
  let b = A.vb([300, 1040], [590, 1040], 762, 0.8, { alb: 1.0 });
  b.d = Math.max(0.3, depthTo(b, 860, 634)); b.z = v.atY(300, 1040, 0)[2] + b.d / 2;
  b = A.vb([610, 1060], [945, 1060], 786, 0.8, { alb: 1.0 });
  b.d = Math.max(0.3, depthTo(b, 1045, 642)); b.z = v.atY(610, 1060, 0)[2] + b.d / 2;
  A.vb([1465, 1080], [1745, 1080], 620, 0.7, { alb: 1.0 });
  A.vb([1745, 1200], [2350, 1200], 700, 0.6, { alb: 0.7 });
  // left: a lit box with another on top, the shelving unit with the synth, cables and gear
  const lb = A.vb([300, 780], [640, 775], 598, 0.2, { alb: 0.9 });
  A.vb([310, 600], [545, 604], 240, 0.4, { y0: lb.y + lb.h, alb: 1.0, b: { yaw: lb.yaw + 0.12 } });
  A.vp([505, 705], [765, 692], -40, "shelfC", { back: 0.4, alb: 1.1 });
  // right: boxes, the leaning keyboard, the tape-deck shelving, the speaker
  A.vb([1290, 690], [1460, 690], 30, 0.4, { alb: 0.85 });
  A.kb([1300, 952], [1446, 905], [1336, 515], { dz: 0.06 });
  A.vp([1460, 778], [1690, 782], 140, "shelfD", { back: 0.4, alb: 1.1 });
  A.vp([1478, 215], [1612, 215], -40, "monitor", { y0: v.heightAt(v.floor(1478, 778), 215), back: 0.3, alb: 1.1 });
  A.vp([1690, 800], [1990, 806], 190, "speaker", { back: 0.45, alb: 1.15 });
  A.vb([1990, 806], [2300, 806], 40, 0.5, { stack: true, alb: 0.6 });
  // take I opens between two near boxes that slide out of frame by 44.64-44.72 (measured at 44.52: left, a box whose
  // lit corridor side runs from its near top corner (450, 200) to its far one (820, 395), its hatched front x 0-450; right,
  // a tall dark stack whose lit side strip is x 1600-1720, its hatched front x 1720-2206 (the far corner tracks
  // 820 -> 730 -> 660 -> 510 -> 60 at 44.52-44.72, i.e. ~0.08 u beside the lens)
  const A0 = A.at(viewOf(camI(44.52)));
  A0.sb(-1, [450, 200], [820, 395], -0.068, 0.5, { alb: 1.0, b: { sideK: 1.1 } });
  A0.sb(1, null, null, 0.075, 0.5, { nearX: 1720, farX: 1600, h: 0.62, alb: 0.5, stack: true, b: { sideK: 1.5 } });
  A.wall(-1, v.floor(760, 690)[0] - 0.1, v.floor(760, 690)[2] + 0.3, 14, { jut: 0.2, top: 2.2 });
  A.wall(1, v.floor(1300, 690)[0] + 0.05, v.floor(1300, 690)[2] + 0.4, 14, { jut: 0.2, top: 2.2 });
  const out = [];
  floorOf(out, { zmax: 14, alb: 0.85 });
  return withStatic(A.faces(out), STATIC_IJ);
}

// take J (44.88–45.64), authored from its own frame 44.92: long low boxes left, the synth shelving, a lit box on the
// low stack; right: the leaning keyboard, the tape-deck shelving with a monitor on top, the speaker on a low box
// late (J2, from 45.16): the source drops the three low boxes between 45.12 and 45.16 (the keyboard, the shelving and
// the speaker hold their places, the low boxes are simply gone: a join in the source), then the camera speeds down the
// dark alley after the owl (pair fits 1.06x per frame at 45.14 rising to 1.17x by 45.42)
function setJ(late = false) {
  const A = author(viewOf(camJ(44.92)), 110);
  const v = A.v;
  const rbA = { alb: 1.0 };
  let rb;
  if (!late) {
    A.vb([765, 1150], [1034, 1150], 717, 1.3, { alb: 1.0 });
    A.vb([-300, 1150], [760, 1150], 690, 1.4, { alb: 0.95 });
    rb = A.vb([1593, 1150], [2400, 1150], 660, 0.7, rbA);
  } else {
    // (the author's random stream must stay in step so everything else lands where it did)
    A.r(); A.r();
    rb = A.vb([1593, 1150], [2400, 1150], 660, 0.7, { alb: 0.4 });
  }
  A.vp([400, 700], [690, 650], 0, "shelfC", { back: 0.06, alb: 1.1 });
  A.vb([83, 610], [400, 600], 165, 0.4, { y0: 0.22, alb: 1.05 });
  A.kb([1345, 800], [1425, 830], [1455, 390]);
  // (shallow casings: seen from the corridor, deep ones would hide the keyboard and the shelf behind their sides)
  A.vp([1500, 870], [1790, 885], 20, "shelfD", { back: 0.06, alb: 1.1 });
  A.vp([1780, 662], [2192, 662], 207, "speaker", { y0: rb.y + rb.h, back: 0.08, alb: 1.15 });
  if (late) {
    // the alley beyond the gear: lit box fronts both sides (measured at 45.40), black straight ahead
    const L = A.at(viewOf(camJ(45.40)));
    // (beyond the shelving: they sit ~1.5 u ahead of the 45.40 eye)
    L.fz(-100, 250, -100, 1.4, 0.4, { alb: 1.0, stack: true });
    L.fz(250, 640, -100, 1.5, 0.4, { alb: 0.95, stack: true });
    L.fz(1500, 1730, -100, 1.5, 0.4, { alb: 1.0, stack: true });
    L.fz(1730, 2100, -100, 1.4, 0.4, { alb: 0.95, stack: true });
  }
  A.wall(-1, v.floor(690, 650)[0] - 0.05, v.floor(690, 650)[2] + 0.1, 14, { jut: 0.2, top: 2.2 });
  A.wall(1, v.floor(1500, 870)[0] + 0.02, v.floor(1790, 885)[2] + 0.2, 14, { jut: 0.2, top: 2.2 });
  const out = [];
  floorOf(out, { zmax: 14, alb: 0.85 });
  return withStatic(A.faces(out), late ? STATIC_J2 : STATIC_J);
}

// pass 4: the flight flaps of J (45.16–45.64), measured per source frame from the wing tips of the owl's white
// silhouette (tip height vs the track centre -> raise angle, rad): up at 45.24, 45.40, 45.56, a 4-frame (0.16 s) beat
const FLAP = [[1129, 0.0], [1130, -0.12], [1131, 0.52], [1132, 0.21], [1133, 0.0], [1134, -0.01], [1135, 0.52], [1136, 0.21],
  [1137, 0.0], [1138, -0.01], [1139, 0.5], [1140, 0.2], [1141, 0.03], [1142, 0.0]];
function flapAt(t) {
  const f = t * 25;
  if (f <= FLAP[0][0]) return FLAP[0][1];
  for (let i = 1; i < FLAP.length; i++) if (f <= FLAP[i][0]) { const a = FLAP[i - 1], b = FLAP[i], u = (f - a[0]) / (b[0] - a[0]); return a[1] + (b[1] - a[1]) * u; }
  return FLAP[FLAP.length - 1][1];
}
// pass 4: the running wings (40.72–44.40), measured per source frame: the extreme left / right points of the owl's
// white silhouette (threshold 235, connected to the track centre) as turns of each wing about its shoulder relative to
// owl.js's level pose (rad, clockwise on screen: + raises the left wing, lowers the right); frames where the extreme
// point was not a wing tip are interpolated. The source rocks slowly: left up 40.72–41.00 and 42.12–42.64, right up
// 41.20–41.72 and 43.12–44.00.
const WROT = [[1018,0.21,0.25],[1019,0.21,0.25],[1020,0.16,0.25],[1021,0.12,0.25],[1022,0.10,0.25],[1023,0.14,0.25],[1024,0.01,0.16],[1025,0.05,0.07],[1026,-0.05,-0.01],[1027,-0.05,-0.05],[1028,-0.27,-0.09],[1029,-0.28,-0.13],[1030,-0.33,-0.17],[1031,-0.46,-0.26],[1032,-0.49,-0.26],[1033,-0.46,-0.32],[1034,-0.52,-0.37],[1035,-0.57,-0.33],[1036,-0.52,-0.36],[1037,-0.50,-0.34],[1038,-0.57,-0.32],[1039,-0.56,-0.23],[1040,-0.50,-0.13],[1041,-0.45,-0.23],[1042,-0.44,-0.24],[1043,-0.40,-0.16],[1044,-0.32,-0.07],[1045,-0.24,-0.01],[1046,-0.17,0.05],[1047,-0.10,0.09],[1048,-0.03,0.14],[1049,0.04,0.18],[1050,0.11,0.23],[1051,0.18,0.28],[1052,0.25,0.32],[1053,0.32,0.37],[1054,0.28,0.41],[1055,0.22,0.46],[1056,0.22,0.50],[1057,0.26,0.49],[1058,0.24,0.53],[1059,0.21,0.53],[1060,0.27,0.51],[1061,0.27,0.49],[1062,0.22,0.46],[1063,0.17,0.44],[1064,0.18,0.43],[1065,0.16,0.30],[1066,0.12,0.20],[1067,0.10,0.17],[1068,0.10,0.13],[1069,-0.01,0.10],[1070,0.02,0.07],[1071,0.06,0.04],[1072,0.01,0.01],[1073,-0.05,-0.03],[1074,-0.10,-0.06],[1075,-0.10,-0.09],[1076,-0.17,-0.12],[1077,-0.42,-0.15],[1078,-0.34,-0.19],[1079,-0.32,-0.22],[1080,-0.39,-0.36],[1081,-0.46,-0.35],[1082,-0.43,-0.35],[1083,-0.55,-0.34],[1084,-0.62,-0.19],[1085,-0.59,-0.31],[1086,-0.51,-0.36],[1087,-0.54,-0.38],[1088,-0.63,-0.33],[1089,-0.56,-0.32],[1090,-0.54,-0.35],[1091,-0.56,-0.36],[1092,-0.57,-0.35],[1093,-0.61,-0.29],[1094,-0.57,-0.30],[1095,-0.41,-0.29],[1096,-0.43,-0.23],[1097,-0.43,-0.24],[1098,-0.48,-0.29],[1099,-0.30,-0.27],[1100,-0.27,-0.15],[1101,-0.23,-0.15],[1102,-0.19,-0.09],[1103,-0.15,-0.03],[1104,-0.12,0.02],[1105,-0.08,0.08],[1106,-0.04,0.14],[1107,-0.01,0.20],[1108,0.03,0.17],[1109,-0.03,0.15],[1110,0.0,0.13]];
function wrotAt(t) {
  const f = t * 25, T = WROT;
  if (f <= T[0][0]) return [T[0][1], T[0][2]];
  for (let i = 1; i < T.length; i++) if (f <= T[i][0]) { const a = T[i - 1], b = T[i], u = (f - a[0]) / (b[0] - a[0]); return [a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u]; }
  return [T[T.length - 1][1], T[T.length - 1][2]];
}
// fix 1b: 42.36–42.52 the source's right wing is folded, its tip only ~140–180 px right of the body centre
// (x 1147–1189) where the level wing reaches ~230: the hand pulled in to ~0.62 of its length
const FOLDR = [[1056, 1], [1058, 0.8], [1059, 0.66], [1060, 0.62], [1062, 0.62], [1063, 0.7], [1065, 1]];
function foldRAt(t) {
  const f = t * 25;
  if (f <= FOLDR[0][0] || f >= FOLDR[FOLDR.length - 1][0]) return 1;
  for (let i = 1; i < FOLDR.length; i++) if (f <= FOLDR[i][0]) { const a = FOLDR[i - 1], b = FOLDR[i], u = (f - a[0]) / (b[0] - a[0]); return a[1] + (b[1] - a[1]) * u; }
  return 1;
}
// (owl.js: the wings turn by -flap * 0.3 (left) / +flap * 0.3 (right), so a raise angle a is flap = -a / 0.3)
const owlRun = (t) => t >= 45.15
  ? { flap: -flapAt(t) / 0.3, bank: 0, run: 0, fly: 1, shadow: 0.15, side: t < 45.18 ? 1 : 0 }
  : (() => { const [rotL, rotR] = wrotAt(t); return { rotL, rotR, run: (t * 4.2 + 0.05) % 1, foldR: foldRAt(t) }; })();

// pass 4: every take is a roto take (roto.js): the 3D set is only the continuous floor (its value comes from the
// measured floor grid of each frame); the boxes and gear are the measured screen quads of each source frame. The
// keyed-box sets above (setA ... setJ, fix pass 2) are kept for reference but no take uses them any more.
const floorOnly = () => floorC(-3, 3, -1, 14, []);
// a roto take: the continuous 3D floor under the measured faces; a short shutter whose sub-frame count follows the
// measured face motion (s15.js); dashed-stroke hatching at ~10 px (tex)
const RS = (key, t0, cam, roto, o = {}) => ({ key, t0, faces: floorOnly, cam, roto, floor: [0.55, 0.45, 0.22, 3.2], floor2: [0, 0, 0.7, 0], blurN: 6, shutter: 0.006, tex: [0.8, 0.95, 0.12, 12.0], ...o });
// (the source's detail energy (high-pass std) is ~15-17 at 45.16-45.28, sharp, then falls: 10.5 at 45.32, 8.7 at 45.36,
// 8.3 at 45.40: a radial smear that grows as the camera speeds off; the amounts below match it)
const JZB = [[45.30, 0], [45.32, 0.008], [45.36, 0.013], [45.40, 0.018], [45.44, 0.018], [45.56, 0.012]];
const jShut = (tf) => {
  if (tf < 45.1 || tf > 45.58) return null;
  const z = tab1(JZB, tf);
  return z > 0.001 ? { shutter: 0, n: 1, zoom: [1100, 420, z] } : { shutter: 0, n: 1 };
};
function tab1(T, t) { if (t <= T[0][0]) return T[0][1]; for (let i = 1; i < T.length; i++) if (t <= T[i][0] + 1e-6) { const a = T[i - 1], b = T[i]; return a[1] + (b[1] - a[1]) * (t - a[0]) / (b[0] - a[0]); } return T[T.length - 1][1]; }
const JFL = [[45.32, 1], [45.36, 0.93], [45.40, 0.89], [45.44, 0.62], [45.48, 0.75], [45.6, 0.75]];
const jFloor = (tf) => { if (tf <= JFL[0][0]) return 1; for (let i = 1; i < JFL.length; i++) if (tf <= JFL[i][0] + 1e-6) { const a = JFL[i - 1], b = JFL[i]; return a[1] + (b[1] - a[1]) * (tf - a[0]) / (b[0] - a[0]); } return JFL[JFL.length - 1][1]; };
export const SETS = [
  // (fix 2: the floor ~8-18 levels too bright at 40.72-40.88 against the source (and s14's last frame): x0.9)
  RS("A", 40.72, camA, ROTO_A, { decals: DECALS.A, floorMul: () => 0.9 }),
  RS("B", 40.94, camB, ROTO_B, { decals: DECALS.B, over: { RD: { stack: 1 } } }),   // (fix 1: the cut lands on frame 1024 = 40.96; 40.92 is a held repeat of A)
  RS("C", 41.72, camC, ROTO_C, { decals: DECALS.C }),
  // (fix 2: the source screens its lit floor with a ~5 px dot pattern round the owl at 42.16-42.44 and 44.60-44.80)
  RS("D", 41.96, camD, ROTO_D, { decals: DECALS.D, dots: (tf) => (tf > 42.14 && tf < 42.46 ? 0.35 : 0) }),
  RS("E", 42.72, camE, ROTO_E, { decals: DECALS.E }),
  RS("H", 43.92, camH, ROTO_H, { decals: DECALS.H }),
  // (fix 1: the end of the corridor behind the owl is black in the source (median 0-4 levels at 44.72-44.80): the far
  // face keeps only a trace of its measured tone and no hatching; fix 1b: only left of x 1400, the gear shelves to the
  // right of the black keep their measured tone, which the whole-face override had blacked out (-20 levels there))
  RS("IJ", 44.48, camI, ROTO_I, { decals: DECALS.I, over: { FAR: { vmul: 0.12, hk: 0.05, splitX: 1400 }, FARL: { stack: 1 }, FARR: { stack: 1 } },
    // (fix 1b: the camera is nearly still here (~8 px per frame) and the source frames are sharp; the re-picked quads
    // jump between frames, so the 0.3-frame shutter showed ghosts of the shelf through the lit box at 44.56)
    shutter: 0.005, dots: (tf) => (tf > 44.58 && tf < 44.82 ? 0.3 : 0) }),
  // (fix 2: the source draws 45.12-45.36 sharp although its camera zooms ~11% per frame there (the motion-driven
  // shutter smeared shelves and keyboard into streaks); 45.40-45.44 it smears both walls radially toward the vanishing
  // point (~40 px at the frame edges), and its floor goes dark (floor band 99 -> 81 -> 53 levels at 45.36-45.44))
  RS("J", 44.88, camJ, ROTO_J, { decals: DECALS.J, shut: jShut, floorMul: jFloor }),
];
// (fix 2) the head's roll and turn, measured on the source crops: 41.32-41.56 the head tilts, its left side ~30 px
// lower (roll ~ -0.18, turned a little left); 44.16-44.40 it turns to the viewer's right, the left cup swinging in and
// the right one going behind the head
const HEADP = [[1031, 0, 0], [1032, -0.1, -0.05], [1033, -0.18, -0.12], [1038, -0.2, -0.12], [1039, -0.14, -0.08], [1041, 0, 0],
  [1103, 0, 0], [1104, 0.03, 0.25], [1105, 0.05, 0.55], [1106, 0.05, 0.6], [1110, 0.04, 0.6]];
function headAt(t) {
  const f = t * 25, T = HEADP;
  if (f <= T[0][0] || f >= T[T.length - 1][0] + 0.5) return [0, 0];
  for (let i = 1; i < T.length; i++) if (f <= T[i][0]) { const a = T[i - 1], b = T[i], u = (f - a[0]) / (b[0] - a[0]); return [a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u]; }
  return [0, 0];
}
// (fix 2: the running owl was ~6% too tall (its crown 10-17 px above the source's) and its wings 40-145 px too wide in
// total (silhouette widths measured with snapshots/s15-fix2/h/owlm.py): 0.94 of the track scale about the bottom of
// the body, wings 0.9 about the shoulders; in flight the scale holds and the bird sits ~14 px lower)
for (const s of SETS) s.owl = (t) => {
  const o = owlTrack(t), s0 = o[4] / 241, pose = owlRun(t);
  // (in flight the raised wings reach further out than the drawn ones: 45.24 / 45.40 / 45.56 the source's span is ~40 px
  // wider, while the level wings of 45.44 match; the wings lengthen with the raise)
  if (pose.fly) return { x: o[1] + 4, y: o[2] + 14 * s0, s: s0, pose: { ...pose, wingK: 1 + 0.6 * Math.max(0, flapAt(t) - 0.2) } };
  const [hr, hy] = headAt(t);
  const k = 0.94;
  return { x: o[1] + 4, y: o[2] + 158 * s0 * (1 - k), s: s0 * k, pose: { ...pose, wingK: 0.9, headRoll: hr, headYaw: hy } };
};
