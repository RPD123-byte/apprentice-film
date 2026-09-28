// s15 sets: one corridor layout + camera path per source take (the source joins short takes on held frames).
// Layouts are authored in screen space from source frames (snapshots/s15-study/g_*.jpg, gs_*.jpg): each main box
// face is placed where it sits in a given frame, back-projected through that frame's camera (A.at(view(t))). The
// rest of each wall is seeded filler.
import { floor, panel, boxFaces, kbQuad } from "./build.js";
import { author, view, viewOf, aim, HC } from "./author.js";
import { owlTrack } from "./track.js";

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
// forward travel from speed keys [[t, v], ...] (film time, u/s; linear between keys), integrated over the clock
function travel(t0, keys) {
  const vAt = (t) => {
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) { const a = keys[i - 1], b = keys[i]; return a[1] + (b[1] - a[1]) * (t - a[0]) / (b[0] - a[0]); }
    return keys[keys.length - 1][1];
  };
  return (t) => {
    // midpoint rule on a fixed 2 ms grid (deterministic, cheap); negative before t0 (the first frame's blur)
    const n = Math.max(1, Math.ceil(Math.abs(t - t0) / 0.002)), dt = (t - t0) / n;
    let z = 0, c0 = 0;
    for (let i = 0; i < n; i++) {
      const tm = t0 + (i + 1) * dt, c1 = clock(t0, tm);
      z += vAt(t0 + (i + 0.5) * dt) * (c1 - c0); c0 = c1;
    }
    return z;
  };
}
// camera path: keys [t, vx, vy, x, roll(deg), y]; (vx, vy) = where the corridor's +z vanishing point sits on screen;
// eye z from o.speed (u/s, or speed keys [[t, v], ...]) along the camera clock
function camPath(t0, keys, o = {}) {
  const sp = o.speed ?? V;
  const zf = Array.isArray(sp) ? travel(t0, sp) : typeof sp === "function" ? (t) => sp(clock(t0, t)) : travel(t0, [[t0, sp]]);
  const z0 = o.z0 ?? 0;
  return (t) => {
    let a = keys[0], b = keys[keys.length - 1];
    if (t <= keys[0][0]) b = a;
    for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) { a = keys[i - 1]; b = keys[i]; break; }
    let f = b[0] > a[0] ? Math.min(1, Math.max(0, (t - a[0]) / (b[0] - a[0]))) : 0;
    f = f * f * (3 - 2 * f) * 0.5 + f * 0.5;
    const L = (k, d = 0) => (a[k] ?? d) + ((b[k] ?? d) - (a[k] ?? d)) * f;
    const { yaw, pitch } = aim(L(1), L(2));
    return { eye: [L(3), L(5, o.hc ?? HC), z0 + zf(t)], yaw, pitch, roll: (L(4) * Math.PI) / 180, fov: 60 };
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
  [41.48, 1150, 500, 0, -2.6], [41.52, 1140, 480, 0, -1.2], [41.6, 1090, 462, 0, -0.5], [41.64, 1090, 465, 0, 0]], { speed: 1.8 });
function setB() {
  const A = author(viewOf(camB(40.96)), 102);
  // left: the lit box right by the eye line (its bottom is below frame) with a narrower lit box stacked behind it
  A.fz(180, 930, 480, 0.68, 0.45, { alb: 1.0 });
  A.fz(480, 830, -200, 0.95, 0.45, { y0: 0.4, under: true, alb: 1.0 });
  A.front(930, 1010, 800, 510, 0.35, { alb: 0.7, stack: false });
  A.fz(830, 990, 280, 1.25, 0.4, { y0: 0.32, under: true, alb: 0.95, stack: true });
  // right: dark hatched fronts stepping in toward the vanishing point
  A.fz(1570, 2300, 420, 0.55, 0.45, { alb: 0.55, stack: true });
  A.front(1440, 1570, 820, 440, 0.4, { alb: 0.55, stack: true });
  A.front(1270, 1440, 700, 300, 0.4, { alb: 0.6, stack: true });
  // 41.12: the low lit box left of the owl, the lit fronts on the right
  const A2 = A.at(viewOf(camB(41.12)));
  A2.front(770, 960, 1010, 620, 0.35, { alb: 0.9, stack: false });
  A2.front(1550, 1650, 1000, 480, 0.35, { alb: 0.95, stack: true });
  // 41.28: left, a box whose front is hatched and whose corridor side is lit; right, lit fronts then a hatched side
  const A3 = A.at(viewOf(camB(41.28)));
  A3.vb([400, 1150], [800, 1150], 350, 0.5, { alb: 0.75, stack: true, b: { rightK: 1.35 } });
  A3.front(1430, 1600, 800, 420, 0.4, { alb: 1.0, stack: true, tops: [50] });
  A3.front(1280, 1430, 730, 440, 0.35, { alb: 0.85, stack: true });
  // 41.44: both walls are lit faces seen at a grazing angle (the alley narrows); the keyboard leans ahead right
  const A4 = A.at(viewOf(camB(41.44)));
  A4.vb([-400, 1400], [880, 946], 60, 0.4, { alb: 1.0, stack: true });
  A4.front(780, 990, 1010, 510, 0.35, { alb: 0.95, stack: true });
  A4.vb([1480, 660], [2400, 1250], 300, 0.45, { alb: 1.0, stack: true });
  // 41.60: the keyboard leaning on the right wall, a lit box left of the owl
  const A5 = A.at(viewOf(camB(41.60)));
  A5.kb([1250, 830], [1400, 800], [1330, 225]);
  A5.front(740, 940, 1010, 440, 0.35, { alb: 0.95, stack: true });
  A.wall(-1, -0.2, 1.3, 10, { jut: 0.12 });
  A.wall(1, 0.3, 1.2, 10, { jut: 0.12 });
  return A.faces(floorOf([]));
}
// ---------------------------------------------------------------- C: 41.72–41.88 (keyboard close on the right)
const camC = camPath(41.72, [[41.72, 900, 480, 0, 0], [41.88, 930, 490, 0, 0]]);
function setC() {
  const A = author(viewOf(camC(41.72)), 103);
  A.kb([1292, 862], [1485, 948], [1445, 135]);
  A.box(-0.8, -0.07, 0.6, 1.0, 0, 0.4, { stack: true, alb: 0.9 });
  A.front(1130, 1370, 700, 420, 0.4, { tops: [100] });
  A.box(0.5, 1.2, 0.2, 0.62, 0, 0.62, { stack: true, alb: 0.85 });
  A.wall(-1, -0.25, 1.0, 10, { jut: 0.3 });
  A.wall(1, 0.42, 1.2, 10, { jut: 0.3 });
  return A.faces(floorOf([]));
}
// ---------------------------------------------------------------- D: 41.96–42.64 (big right box, then keyboard + shelves on the left)
const camD = camPath(41.96, [[41.96, 880, 450, 0, 0], [42.2, 850, 470, -0.02, 0], [42.44, 1000, 480, 0, 0], [42.64, 1230, 500, 0.02, 0]]);
function setD() {
  const A = author(viewOf(camD(41.96)), 104);
  // right: the big box whose front fills the right at 41.96 and whose long side slides past by 42.28
  A.vb([1197, 1100], [1600, 1100], 397, 0.95, { stack: true, alb: 0.95 });
  A.vb([1655, 1100], [2300, 1100], 364, 0.5, { stack: true });
  // left: lit fronts stepping back toward the gap
  A.vb([200, 1000], [440, 990], 380, 0.4, { stack: true });
  A.vb([440, 810], [575, 800], 440, 0.4, { stack: true, alb: 0.85 });
  // (the third, smallest front at 575–717 is left to the wall filler: placing it hides the keyboard later)
  const A2 = A.at(viewOf(camD(42.28)));
  A2.kb([545, 790], [780, 772], [530, 305]);
  // shelving along the left wall behind the keyboard, facing the corridor
  { const kb = A2.v.floor(545, 790), z0 = kb[2] + 0.05; A.panelW = [kb[0] - 0.05, z0]; }
  A2.vb([1170, 1000], [1300, 1000], 500, 0.45, { stack: true, alb: 0.95 });
  const A3 = A.at(viewOf(camD(42.44)));
  A3.vb([800, 745], [1020, 735], 590, 0.45, { stack: true, alb: 0.8 });
  A3.vb([1500, 1100], [2300, 1100], 330, 0.5, { stack: true });
  const [sx, sz] = A.panelW;
  A.box(sx - 0.45, sx - 0.02, sz, sz + 1.3, 0, 0.02, { alb: 0.6 });
  A.box(sx - 0.5, sx - 0.05, sz, sz + 1.3, 0.95, 1.3, { stack: true, alb: 0.8 });
  A.wall(-1, sx - 0.1, sz + 1.35, 10, { jut: 0.3 });
  A.wall(1, 0.45, 2.2, 10, { jut: 0.3 });
  const out = A.faces(floorOf([]));
  panel([sx - 0.03, 0.47, sz + 0.65], [0, 0, -1], [0, -1, 0], 1.3, 0.94, "shelfA", { alb: 1.05 }, out);
  return out;
}
// ---------------------------------------------------------------- E: 42.72–42.84
const camE = camPath(42.72, [[42.72, 1250, 500, 0, 0], [42.84, 1290, 500, 0, 0]]);
function setE() {
  const A = author(viewOf(camE(42.72)), 105);
  A.front(0, 560, 1000, 400, 0.45, { z: 0.6, y0: 0, tops: [0] });
  A.front(560, 950, 760, 360, 0.42, { tops: [0] });
  A.front(1570, 1800, 660, 430, 0.4, { tops: [230] });
  A.front(1830, 2300, 900, 480, 0.45, { tops: [60] });
  A.wall(-1, -0.25, 1.5, 10, { jut: 0.3 });
  A.wall(1, 0.5, 1.9, 10, { jut: 0.3 });
  return A.faces(floorOf([]));
}
// ---------------------------------------------------------------- F: 42.92–43.64 (boxes both sides; tape-deck shelf ahead right)
const camF = camPath(42.92, [[42.92, 1270, 480, 0, 0], [43.16, 1340, 480, 0.03, 0], [43.4, 1100, 500, 0.0, 0], [43.64, 960, 520, -0.03, 0]]);
function setF() {
  const A = author(viewOf(camF(42.92)), 106);
  A.front(0, 790, 1000, 330, 0.5, { z: 0.62, y0: 0, tops: [-40] });
  A.front(820, 1010, 780, 420, 0.4, { tops: [100] });
  A.front(1470, 1740, 790, 390, 0.42, { tops: [60] });
  A.front(1780, 2300, 900, 330, 0.45, { tops: [0] });
  const A2 = A.at(viewOf(camF(43.48)));
  // the tape-deck shelf ahead on the right (faces the camera)
  const sz = A2.v.floor(1400, 758)[2], sx0 = A2.v.atZ(1400, 758, sz)[0], sx1 = A2.v.atZ(1800, 758, sz)[0], sy1 = A2.v.atZ(1400, 212, sz)[1];
  A2.front(1810, 2300, 1000, 150, 0.4, { z: 0.9, y0: 0 });
  A.box(sx0 - 0.05, sx0 + 0.02, sz, sz + 0.4, 0, sy1, { alb: 0.8 });
  A.box(sx1 - 0.02, sx1 + 0.05, sz, sz + 0.4, 0, sy1, { alb: 0.8 });
  A.box(sx0 - 0.05, sx1 + 0.05, sz, sz + 0.4, sy1, sy1 + 0.35, { stack: true, alb: 0.85 });
  A.wall(-1, -0.2, 1.4, 10, { jut: 0.3 });
  A.wall(1, 0.42, 1.4, sz - 0.75, { jut: 0.3 });
  A.wall(1, sx1 + 0.1, sz + 0.5, 10, { jut: 0.3 });
  const out = A.faces(floorOf([]));
  panel([(sx0 + sx1) / 2, sy1 / 2, sz + 0.01], [1, 0, 0], [0, -1, 0], sx1 - sx0, sy1, "shelfB", { alb: 1.1 }, out);
  return out;
}
// ---------------------------------------------------------------- G: 43.72–43.84
const camG = camPath(43.72, [[43.72, 930, 480, 0, 0], [43.84, 930, 480, 0, 0]]);
function setG() {
  const A = author(viewOf(camG(43.72)), 107);
  A.front(230, 860, 1000, 460, 0.45, { z: 0.62, y0: 0, tops: [80] });
  A.front(1140, 1560, 820, 400, 0.42, { tops: [60] });
  const z = 0.95, x0 = A.v.atZ(1740, 800, z)[0];
  A.clear(x0 - 0.1, x0 + 0.7, z - 0.6, z + 0.3);
  A.box(-1.4, -0.2, 0.0, 0.62, 0, 0.6, { stack: true, alb: 0.9 });
  A.wall(-1, -0.45, 1.1, 10, { jut: 0.3 });
  A.wall(1, 0.5, 1.5, 10, { jut: 0.3 });
  const out = A.faces(floorOf([]));
  panel([x0 + 0.3, 0.38, z], [1, 0, 0], [0, -1, 0], 0.6, 0.76, "shelfB", { alb: 1.1 }, out);
  return out;
}
// ---------------------------------------------------------------- H: 43.92–44.64 (gear on the left, the owl turns round)
const camH = camPath(43.92, [[43.92, 720, 470, 0, 0], [44.12, 650, 490, 0, 0], [44.32, 900, 480, 0, 0], [44.48, 1000, 480, 0, 0], [44.64, 1100, 480, 0, 0]]);
function setH() {
  const A = author(viewOf(camH(43.92)), 108);
  A.front(0, 650, 1000, 0, 0.08, { z: 0.22, y0: 0, stack: false });
  A.front(1010, 1300, 830, 360, 0.42, { tops: [0] });
  A.front(1430, 2300, 1000, 290, 0.45, { z: 0.6, y0: 0 });
  // 44.12: the gear rack on the left (seen along its length), the long box on the right whose inner face fills
  // the right of frame, with a lit box front stacked on its far end
  const A2 = A.at(viewOf(camH(44.12)));
  const v2 = A2.v;
  // the low box left of the owl: its right edge meets the floor at (700, 800), its top edge at y 540
  const rp0 = v2.floor(700, 800), rh = v2.heightAt(rp0, 540);
  const rp = [rp0[0], rh, rp0[2]];
  A.box(rp[0] - 0.5, rp[0], rp[2] - 0.9, rp[2] + 0.3, 0, rh, { alb: 0.95 });
  A.clear(rp[0] - 1.2, rp[0] + 0.02, rp[2] - 1.2, rp[2] + 0.4);
  A2.vp([20, 660], [580, 530], 20, "rackE", { y0: rh, alb: 1.1 });
  // the long box on the right: inner face at the floor point under x 1050, top edge at y 410
  const fr0 = v2.floor(1050, 940), h = v2.heightAt(fr0, 410);
  A.box(fr0[0], fr0[0] + 0.6, fr0[2] - 1.2, fr0[2] + 0.9, 0, h, { alb: 0.8 });
  A.box(fr0[0] - 0.02, fr0[0] + 0.6, fr0[2] + 0.5, fr0[2] + 0.95, h, h + 0.5, { alb: 0.95 });
  const fr = [fr0[0], h, fr0[2] + 0.9];
  // 44.32: the box left of the owl, the narrow box front right of it, the big box front at the right edge
  const A3 = A.at(viewOf(camH(44.32)));
  A3.vb([600, 840], [810, 830], 440, 0.45, { alb: 0.9 });
  A3.vb([1220, 880], [1300, 880], 460, 0.4, { alb: 0.85 });
  A3.vb([1310, 1150], [2500, 1150], -200, 0.6, { alb: 1.0 });
  A.wall(-1, rp[0] - 0.1, rp[2] + 0.4, 10, { jut: 0.3 });
  A.wall(1, 0.35, fr[2] + 0.2, 10, { jut: 0.3 });
  const out = A.faces(floorOf([]));
  return out;
}
// ---------------------------------------------------------------- I+J: 44.72–45.64 (the gear room: speaker, shelves, low boxes)
// Two takes of one set: I (44.72–44.84) and J (44.88–45.64), which restarts a little further left and slower, then
// speeds up as the owl flies off (speeds from the speaker's measured growth: camtrack on x > 1600).
// take I starts on the cut at 44.48 (pairflow: no fit 44.44 -> 44.48, then a steady 1.04x per frame zoom)
const Ispeed = (u) => 0.8 * (u - 0.24);
// take J: camtrack on the left shelving (x < 800) gives 1.038x per frame at 44.92 rising to ~1.1x by 45.3: the
// camera speeds up as the owl takes off
const Jspeed = (u) => 0.8 * u + 1.0 * u * u;   // the keyboard's floor contact and the floor flow give ~0.8-1.0 u/s early on
const camI = camPath(44.48, [[44.48, 1080, 480, 0, 0], [44.72, 1080, 475, 0, 0], [44.84, 1085, 470, 0, 0]], { speed: Ispeed });
const camJ = camPath(44.88, [[44.88, 1100, 520, 0, 0], [45.12, 1090, 520, 0, 0], [45.4, 1100, 530, 0, 0], [45.64, 1110, 540, 0, 0]], { speed: Jspeed });
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
  A.wall(-1, v.floor(760, 690)[0] - 0.1, v.floor(760, 690)[2] + 0.3, 14, { jut: 0.2, top: 2.2 });
  A.wall(1, v.floor(1300, 690)[0] + 0.05, v.floor(1300, 690)[2] + 0.4, 14, { jut: 0.2, top: 2.2 });
  const out = [];
  floorOf(out, { zmax: 14, alb: 0.85 });
  return A.faces(out);
}

// take J (44.88–45.64), authored from its own frame 44.92: long low boxes left, the synth shelving, a lit box on the
// low stack; right: the leaning keyboard, the tape-deck shelving with a monitor on top, the speaker on a low box
function setJ() {
  const A = author(viewOf(camJ(44.92)), 110);
  const v = A.v;
  A.vb([765, 1150], [1034, 1150], 717, 1.3, { alb: 1.0 });
  A.vb([-300, 1150], [760, 1150], 690, 1.4, { alb: 0.95 });
  const hb = 0.27;
  const rb = A.vb([1593, 1150], [2400, 1150], 660, 0.7, { alb: 1.0 });
  A.vp([400, 700], [690, 650], 0, "shelfC", { back: 0.06, alb: 1.1 });
  A.vb([83, 610], [400, 600], 165, 0.4, { y0: 0.22, alb: 1.05 });
  A.kb([1345, 800], [1425, 830], [1455, 390]);
  // (shallow casings: seen from the corridor, deep ones would hide the keyboard and the shelf behind their sides)
  A.vp([1500, 870], [1790, 885], 20, "shelfD", { back: 0.06, alb: 1.1 });
  A.vp([1780, 662], [2192, 662], 207, "speaker", { y0: rb.y + rb.h, back: 0.08, alb: 1.15 });
  A.wall(-1, v.floor(690, 650)[0] - 0.05, v.floor(690, 650)[2] + 0.1, 14, { jut: 0.2, top: 2.2 });
  A.wall(1, v.floor(1500, 870)[0] + 0.02, v.floor(1790, 885)[2] + 0.2, 14, { jut: 0.2, top: 2.2 });
  const out = [];
  floorOf(out, { zmax: 14, alb: 0.85 });
  return A.faces(out);
}

const owlRun = (t) => t >= 45.15
  ? { flap: 0.9 * Math.sin((t - 45.15) * 30), bank: 0.1 * Math.sin(t * 9), run: 0, fly: 1 }
  : { flap: 0.3 * Math.sin(t * 16), bank: 0.25 * Math.sin(t * 6.5), run: (t * 3.4) % 1 };

export const SETS = [
  { key: "A", t0: 40.72, faces: setA, cam: camA },
  { key: "B", t0: 40.96, faces: setB, cam: camB, exp: 1.3 },
  { key: "C", t0: 41.72, faces: setC, cam: camC, exp: 0.92 },
  { key: "D", t0: 41.96, faces: setD, cam: camD, exp: 0.95 },
  { key: "E", t0: 42.72, faces: setE, cam: camE, exp: 1.2 },
  { key: "F", t0: 42.92, faces: setF, cam: camF, exp: 0.9 },
  { key: "G", t0: 43.72, faces: setG, cam: camG },
  { key: "H", t0: 43.92, faces: setH, cam: camH, exp: 1.2 },
  { key: "IJ", t0: 44.48, faces: setIJ, cam: camI, exp: 1.15, light: [1.5, 0.3, 2.4, 0.35], face: [0.7, 1.25, 0.5, 0.8] },
  { key: "J", t0: 44.88, faces: setJ, cam: camJ, exp: 1.1, light: [1.5, 0.3, 2.4, 0.35], face: [0.75, 1.25, 0.5, 0.8] },
];
for (const s of SETS) s.owl = (t) => { const o = owlTrack(t); return { x: o[1] + 4, y: o[2], s: o[4] / 241, pose: owlRun(t) }; };
