// s23 (84.04–97.08): the page framed on the lit screen. The owl carries the old B&W header strip off the top right
// (84.04–86.0); the header slot stays empty (86.0–86.5); it carries the colour banner in from the top right, walking
// left along the lip of the hole with the banner on its head and raised wings (86.5–88.3), slaps it into the slot
// (88.36) and presses it flat (88.4–89.6), hops off (89.6–90.3) onto the speaker left of the desk, wipes its brow
// (90.4–91.8), crouches (91.9–92.6), powers up in a white flame aura with shockwave rings and flying paper (92.64–95.56,
// two camera shakes), the scissors fly back to it (93.84–94.84), a flare (94.88–95.08), then it zips round the page
// with the scissors, leaving shard cut lines (95.96–97.08).
// Positions and camera are measured on the source (ORB tracks of the strip and banner, owl masks against clean plates,
// camtrack of the room, Hough traces of the cut lines); see fidelity/s23.md.
import { drawFramedPage, addScreenGlow, sokoPageCanvas, sokoHeaderCanvas, HEADER, HEADER_FRAMED, FRAMED, releaseSoko, PAGE_W, PAGE_H } from "../lib/sites.js";
import { hippieBannerCanvas, releaseHippie } from "../lib/hippie.js";
import { lerp, smooth, clamp, rng } from "../lib/rng.js";
import { owlComp, blitOwl, POSE, WINGS, releaseOwl23 } from "./s23/owl.js";
import { drawScissors, drawAura, drawFlare, ring, bigRing, drawPapers, drawShards, drawConfetti } from "./s23/fx.js";
import { STRIP_TRK, STRIP_NEW, STRIP_XF, BAN_TRK, SHAKE, SHARDS } from "./s23/data.js";

// ---------------------------------------------------------------- time helpers
const FR = 25;
const fidx = (t) => Math.floor(t * FR + 1e-3);
const srcT = (t) => fidx(t) / FR;             // the source frame on screen (drawings are held per source frame)
// sample-and-hold on a table [[t, ...v], ...] sampled at source frames
function hold(tab, t) {
  const k = fidx(t);
  let best = tab[0];
  for (const r of tab) { if (Math.round(r[0] * FR) <= k) best = r; else break; }
  return best.slice(1);
}
function interp(keys, t) {
  if (t <= keys[0][0]) return keys[0].slice(1);
  const n = keys.length;
  if (t >= keys[n - 1][0]) return keys[n - 1].slice(1);
  let i = 0;
  while (keys[i + 1][0] < t) i++;
  const a = keys[i], b = keys[i + 1], u = (t - a[0]) / (b[0] - a[0]);
  return a.slice(1).map((v, k) => v + (b[k + 1] - v) * u);
}
const simT = ([s, rd, tx, ty]) => { const r = (rd * Math.PI) / 180; return [s * Math.cos(r), s * Math.sin(r), -s * Math.sin(r), s * Math.cos(r), tx, ty]; };
// keyed state lookup: [[t, value], ...] -> the last entry with t <= ts
function stepv(tab, ts) { let v = tab[0][1]; for (const [t0, x] of tab) { if (ts + 1e-4 >= t0) v = x; else break; } return v; }

// ---------------------------------------------------------------- pages
let bannerPage = null;
function holePage() { return sokoPageCanvas({ header: false, gaze: "down" }); }
function bannerEdge(g) { g.strokeStyle = "rgba(236,234,228,0.95)"; g.lineWidth = 3.4; g.strokeRect(HEADER.x - 0.5, HEADER.y - 0.5, HEADER.w + 1, HEADER.h + 1); }
// the page once the colour banner is in: the hole covered by the banner at HEADER, a thin pale edge round it
function withBanner() {
  if (bannerPage) return bannerPage;
  const c = document.createElement("canvas"); c.width = PAGE_W; c.height = PAGE_H;
  const g = c.getContext("2d");
  g.drawImage(holePage(), 0, 0);
  g.imageSmoothingQuality = "high";
  g.drawImage(hippieBannerCanvas(), HEADER.x, HEADER.y, HEADER.w, HEADER.h);
  bannerEdge(g);
  bannerPage = c;
  return c;
}

// ---------------------------------------------------------------- the old strip (frame px at 77.6 s = HEADER_FRAMED)
// The strip the owl carries is the left part of the header: page x 38 … 1267 (frame width 1038), full height,
// with a pale ~3 px paper edge round it (measured at 84.40).
const STRIP_W = 1038, PAD = 6;
let stripC = null;
function stripCanvas() {
  if (stripC) return stripC;
  const H0 = HEADER_FRAMED, w = STRIP_W + PAD * 2, h = Math.round(H0.h) + PAD * 2, S = 1.5;
  const c = document.createElement("canvas"); c.width = Math.round(w * S); c.height = Math.round(h * S);
  const g = c.getContext("2d");
  g.scale(S, S);
  g.translate(PAD - H0.x, PAD - H0.y);
  g.save();
  g.beginPath(); g.rect(H0.x, H0.y, STRIP_W, H0.h); g.clip();
  g.fillStyle = "#050505"; g.fillRect(H0.x, H0.y, STRIP_W, H0.h);
  g.transform(FRAMED.sx, 0, 0, FRAMED.sy, FRAMED.x, FRAMED.y);
  g.imageSmoothingQuality = "high";
  g.drawImage(sokoHeaderCanvas({ gaze: "down" }), HEADER.x, HEADER.y, HEADER.w, HEADER.h);
  g.restore();
  g.strokeStyle = "rgba(232,232,226,0.95)"; g.lineWidth = 3.2; g.lineJoin = "miter";
  g.strokeRect(H0.x - 1.2, H0.y - 1.2, STRIP_W + 2.4, H0.h + 2.4);
  stripC = { c, x: H0.x - PAD, y: H0.y - PAD, w, h };
  return stripC;
}
function drawStrip(g, m, alpha = 1) {
  const S = stripCanvas();
  g.save(); g.globalAlpha *= alpha;
  g.transform(...m);
  g.imageSmoothingQuality = "high";
  g.drawImage(S.c, S.x, S.y, S.w, S.h);
  g.restore();
}
// its pale paper back (84.04–84.11): the source shows a shorter slab, corners measured at 84.04
const BACK = [[1395, 313], [1974, 202], [1991, 358], [1412, 469]];
function drawBack(g) {
  g.save();
  g.beginPath(); BACK.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath();
  const gr = g.createLinearGradient(1400, 300, 1990, 360);
  gr.addColorStop(0, "#dcdfd7"); gr.addColorStop(1, "#d2d5cd");
  g.fillStyle = gr; g.fill();
  g.strokeStyle = "rgba(245,245,240,0.9)"; g.lineWidth = 1.5; g.stroke();
  g.restore();
}

// ---------------------------------------------------------------- the colour banner (frame px at 90.0 s = HEADER_FRAMED)
function drawBannerAt(g, m) {
  g.save();
  g.transform(...m);
  g.transform(FRAMED.sx, 0, 0, FRAMED.sy, FRAMED.x, FRAMED.y);
  g.imageSmoothingQuality = "high";
  g.drawImage(hippieBannerCanvas(), HEADER.x, HEADER.y, HEADER.w, HEADER.h);
  bannerEdge(g);
  g.restore();
}
// impact ticks at the banner's four corners after the slap (88.40–89.32, measured): three short strokes radiating
// out; they burst outward over 88.40–88.56, then sit ~26 px out, jiggling on twos
const TICK_D = [[88.4, 10, 16], [88.44, 16, 24], [88.48, 22, 28], [88.52, 30, 30], [88.56, 38, 30], [88.6, 26, 28]];
function drawTicks(g, ts) {
  if (ts < 88.395 || ts >= 89.335) return;
  const [d, L] = hold(TICK_D, ts);
  const jig = ts >= 88.6 ? ((fidx(ts) >> 1) & 1 ? 3 : 0) : 0;
  const H = HEADER_FRAMED, C = [[H.x, H.y, -1, -1], [H.x + H.w, H.y, 1, -1], [H.x, H.y + H.h, -1, 1], [H.x + H.w, H.y + H.h, 1, 1]];
  g.save(); g.strokeStyle = "rgba(238,238,232,0.95)"; g.lineCap = "round"; g.lineWidth = 6.5;
  for (const [x, y, sx, sy] of C) for (const a of [-0.62, 0, 0.62]) {
    const b = Math.atan2(sy, sx) + a, c = Math.cos(b), sn = Math.sin(b), r0 = d + jig;
    g.beginPath(); g.moveTo(x + c * r0, y + sn * r0); g.lineTo(x + c * (r0 + L), y + sn * (r0 + L)); g.stroke();
  }
  g.restore();
}

// ---------------------------------------------------------------- owl placement
// Owl unit -> frame px scale per phase (head vertical radius 100 units): carrying 0.44, on the banner / speaker 0.42,
// powered up 0.55, flying at the end 0.6. Positions are the head centre, frame px.
const HEADY = -118;                        // frontStand head centre, owl units above the root
const rootOf = (H, s, hy = HEADY) => [H[0], H[1] - hy * s];

// A: head centre of the owl under the old strip (x from its lower-body mask centroid, y from 2× grids); feet on the
// hole's lower lip (y ≈ 358).
const A_HEAD = [[84.12, 1365, 244], [84.2, 1358, 244], [84.28, 1356, 244], [84.36, 1360, 244], [84.44, 1388, 244], [84.52, 1397, 244], [84.6, 1413, 244],
  [84.72, 1431, 244], [84.8, 1453, 244], [84.88, 1472, 244], [84.96, 1486, 244], [85.04, 1493, 244], [85.12, 1529, 244], [85.2, 1561, 244], [85.28, 1595, 244],
  [85.36, 1633, 244], [85.44, 1672, 244], [85.52, 1702, 244]];
// after the dissolve (the new copy), then up the right edge and off the top right
const A_NEW = [[85.56, 1830, 244], [85.72, 1835, 244], [85.76, 1863, 244], [85.8, 1894, 244], [85.84, 1925, 239], [85.88, 1970, 169], [85.92, 2074, 79], [85.96, 2125, 64], [86.0, 2209, 44], [86.04, 2345, 14]];
// B: under the banner, walking left along the lip; dropping in from the top right at 86.52–86.68
const B_HEAD = [[86.52, 2110, -10], [86.56, 1990, 40], [86.6, 1894, 80], [86.64, 1780, 130], [86.68, 1780, 130], [86.72, 1633, 249], [86.76, 1595, 249], [86.8, 1571, 249],
  [86.84, 1550, 249], [86.88, 1508, 249], [86.92, 1489, 249], [86.96, 1469, 249], [87.0, 1449, 249], [87.04, 1406, 249], [87.08, 1382, 249], [87.12, 1355, 249],
  [87.16, 1326, 249], [87.2, 1263, 249], [87.24, 1233, 249], [87.28, 1203, 249], [87.32, 1175, 249], [87.36, 1119, 249], [87.4, 1094, 249], [87.44, 1070, 249],
  [87.48, 1045, 249], [87.52, 998, 249], [87.56, 976, 249], [87.6, 953, 249], [87.64, 932, 249], [87.68, 932, 249], [87.72, 901, 249], [87.76, 894, 249],
  [87.8, 883, 249], [87.84, 866, 249], [87.88, 828, 249], [87.92, 809, 249], [87.96, 791, 249], [88.0, 774, 249], [88.04, 742, 249], [88.08, 731, 249], [88.12, 728, 249], [88.32, 728, 249]];
// C: on the banner, the hop, the speaker. [t, pose, wings, x, y]
const C_SEQ = [
  [88.36, "press", "press", 725, 236], [88.4, "press", "press", 725, 262], [89.6, "press", "spread", 720, 240], [89.64, "hop", "up", 712, 215],
  [89.72, "hop", "up", 712, 180], [89.76, "hop", "up", 712, 172], [89.88, "hop", "up", 708, 200], [89.92, "hop", "up", 700, 245], [89.96, "hop", "up", 690, 345],
  [90.0, "hop", "up", 690, 425], [90.04, "press", "up", 690, 443], [90.16, "press", "spread", 690, 460], [90.32, "press", "half", 688, 460],
  [90.44, "wipe", null, 695, 465], [91.84, "crouch", null, 692, 478],
];
const S_C = 0.36;
// D: powered up on the speaker (bigger), head centre (688, 440)
const D_HEAD = [688, 442], S_D = 0.52;
// the scissors flying back in from the left edge, spinning: [t, pivot x, y]
const SC_IN = [[93.84, -40, 405], [94.0, 20, 408], [94.2, 137, 412], [94.28, 165, 412], [94.36, 220, 412], [94.44, 247, 453], [94.52, 275, 467], [94.6, 357, 412], [94.68, 385, 412], [94.76, 440, 412], [94.84, 522, 412]];
// E: flying round the page; body centre per source frame and whether that frame is a motion streak ([x0,y0]→[x1,y1])
const E_SEQ = [
  [95.96, 460, 100, 0], [96.08, 476, 114, 0], [96.12, 452, 96, 0], [96.16, 476, 114, 0], [96.2, 452, 96, 0], [96.24, 480, 112, 0], [96.28, 450, 97, 0],
  [96.32, [700, 400], [1480, 811], 1], [96.36, 1600, 845, 0], [96.44, [1600, 860], [1300, 560], 1], [96.48, 972, 112, 0], [96.52, 960, 122, 0], [96.56, 952, 108, 0], [96.6, 962, 120, 0],
  [96.64, [900, 250], [460, 580], 1], [96.68, 360, 592, 0], [96.72, 362, 612, 0], [96.76, [1400, 440], [1900, 360], 1], [96.8, 1928, 362, 0], [96.84, 1935, 384, 0],
  [96.88, 1932, 358, 0], [96.92, 1928, 388, 0], [96.96, [1900, 300], [1560, 600], 1], [97.0, [1500, 300], [1150, 60], 1],
];
const S_E = 0.5;

// ---------------------------------------------------------------- owl drawing per phase
function carryOwl(H, key, slot = 0) {
  const s = 0.38, [rx, ry] = rootOf(H, s);
  return owlComp(POSE.carry, WINGS.carry(), rx, ry, s, { key, slot });
}
function flyingOwl(H, s, slot = 0) {
  const [rx, ry] = rootOf(H, s);
  return owlComp(POSE.hop, WINGS.up(), rx, ry, s, { slot });
}

// ---------------------------------------------------------------- scene per frame: returns a painter (frame coords)
function sceneA(ts) {
  if (ts < 84.115) {
    const O = owlComp(POSE.carry, WINGS.half(), 1447, 262 + 118 * 0.34, 0.34, { key: "A0", rot: -0.25 });
    return (g) => { drawBack(g); blitOwl(g, O); };
  }
  const old = simT(hold(STRIP_TRK, ts));
  if (ts < 85.555) {
    const O = carryOwl(hold(A_HEAD, ts), "carry");
    const H = hold(A_HEAD, ts);
    return (g) => { drawStrip(g, old); blitOwl(g, O, 1, H[0] - O.anchors.head[0], H[1] - O.anchors.head[1]); };
  }
  const xf = interp(STRIP_XF, ts)[0];
  if (xf < 1) {
    const O = carryOwl([0, 244], "carry");
    const ha = hold(A_HEAD, 85.52), hn = hold(A_NEW, ts);
    const nm = simT(STRIP_NEW);
    return (g) => {
      drawStrip(g, old, 1 - xf); blitOwl(g, O, 1 - xf, ha[0] - O.anchors.head[0], ha[1] - O.anchors.head[1]);
      drawStrip(g, nm, xf); blitOwl(g, O, xf, hn[0] - O.anchors.head[0], hn[1] - O.anchors.head[1]);
    };
  }
  const H = hold(A_NEW, ts);
  const O = ts >= 85.88 ? flyingOwl(H, 0.34) : carryOwl(H);
  return (g) => { if (ts <= 85.97) drawStrip(g, old); blitOwl(g, O); };
}

function sceneB(ts) {
  if (ts < 86.515) return null;
  const m = simT(hold(BAN_TRK, ts));
  const H = hold(B_HEAD, ts);
  if (ts < 86.715) {
    const O = flyingOwl(H, 0.34);
    return (g) => { if (ts >= 86.555) drawBannerAt(g, m); blitOwl(g, O); };
  }
  const O = carryOwl([0, 249], "carryB");
  return (g) => { drawBannerAt(g, m); blitOwl(g, O, 1, H[0] - O.anchors.head[0], H[1] - O.anchors.head[1]); };
}

function sceneC(ts) {
  const [, pose, wings, x, y] = C_SEQ.filter((r) => ts + 1e-4 >= r[0]).pop();
  const hy = pose === "crouch" ? -105 : HEADY;
  const [rx, ry] = rootOf([x, y], S_C, hy);
  const O = owlComp(POSE[pose], wings ? WINGS[wings]() : [], rx, ry, S_C, { key: `C:${pose}:${wings}:${x}:${y}` });
  const slapBanner = ts < 88.575 ? simT(hold(BAN_TRK, ts)) : null;
  // the planted scissors beside it while it wipes its brow (90.04–91.8), rings up, point down
  const planted = ts >= 90.035 && ts < 91.835;
  return (g) => {
    if (slapBanner) drawBannerAt(g, slapBanner);
    drawTicks(g, ts);
    if (planted) drawScissors(g, { x: 768, y: 522, ang: Math.PI / 2 + 0.04, L: 62, open: 0.05 });
    blitOwl(g, O);
  };
}

// D: the power-up. Aura flames are re-seeded on twos (the source's flames change every other frame).
function sceneD(ts) {
  const k = fidx(ts), seed = 1000 + (k >> 1);
  const [rx, ry] = rootOf(D_HEAD, S_D);
  let pose = "power", wings = "power";
  if (ts >= 93.835) { pose = "reach"; wings = "reach"; }
  if (ts >= 94.875) { pose = "two"; wings = null; }
  const small = ts >= 95.635, mix = ts >= 95.595 && !small;     // 95.60: a dissolve between the two
  const s = small ? S_C : S_D;
  const H = small ? [680, 447] : D_HEAD;
  const [ox, oy] = small ? rootOf(H, s) : [rx, ry];
  const O = owlComp(POSE[pose], wings ? WINGS[wings]() : [], ox, oy, s, { key: `D:${pose}:${small}`, props: pose === "two" ? twoScissors : null });
  const Osm = mix ? owlComp(POSE.two, [], ...rootOf([680, 447], S_C), S_C, { key: "D:two:true", props: twoScissors }) : null;
  const flare = ts >= 94.875 && ts < 95.115 ? [0.75, 1, 1.05, 0.95, 0.6, 0.45][Math.min(5, k - fidx(94.88))] : 0;
  const auraOn = !small, aA = mix ? 0.5 : 1;
  const sc = ts >= 93.835 && ts < 94.875 ? interp(SC_IN, ts) : null;
  return (g) => {
    // rings: the big faint shockwave in the room (92.64–93.6) and the thin ring(s) round the speaker
    // the big shockwave: a soft grey band round the lower half of the frame, seen in the source only at 93.52–93.72
    // (its lower-left arc, in the room margin and over the dark bottom of the page)
    const bigA = stepv([[93.515, 0.18], [93.555, 0.32], [93.595, 0.36], [93.635, 0.3], [93.675, 0.2], [93.715, 0.1], [93.755, 0]], ts);
    if (ts >= 93.515 && bigA > 0) {
      g.save(); g.beginPath(); g.rect(0, 560, 2206, 400); g.clip();
      bigRing(g, 1103, 560, 1140, 395, bigA);
      g.restore();
    }
    ring(g, 692, 575, 329, 55, 3, 0.9);
    if (small) ring(g, 690, 628, 400, 70, 3, 0.8);
    if (auraOn) drawAura(g, 690, 495, 190, 100, seed, { h: 90, n: 30, alpha: aA, skew: ts >= 93.835 && ts < 94.875 ? 190 : 140 });
    if (flare > 0) drawFlare(g, 715, 430, flare, seed + 7);
    blitOwl(g, O, aA);
    if (Osm) { ring(g, 690, 628, 400, 70, 3, 0.4); blitOwl(g, Osm, 0.5); }
    if (sc) drawScissors(g, { x: sc[0], y: sc[1], ang: ts * 15.7, L: 105, open: 0.55 });
    drawPapers(g, ts, PAPERS);
  };
}
// the two raised pairs of scissors, drawn in owl units at the wing tips (two pose: tips at (-190,-70), (190,-90))
function twoScissors(g) {
  const L = 140;
  drawScissors(g, { x: -228, y: -150, ang: -Math.PI / 2 - 0.25, L, open: 0.45 });
  drawScissors(g, { x: 228, y: -170, ang: -Math.PI / 2 + 0.25, L, open: 0.45 });
}
// paper scraps kicked up by the power-up: launch time, position, velocity (px/s), gravity, spin
const PAPERS = (() => {
  const r = rng(77), out = [];
  const spots = [[1150, 300, 120, -700], [1230, 380, 380, -420], [360, 300, -520, -300], [180, 640, -900, 380], [620, 360, -150, -900], [900, 330, 500, -760],
    [300, 520, -1100, -60], [1000, 520, 900, -200], [760, 300, 260, -1100], [460, 600, -800, 250]];
  spots.forEach(([x, y, vx, vy], i) => out.push({ t0: 92.64 + (i % 4) * 0.06, x, y, vx, vy, gy: 280, a: r() * 6, spin: (r() - 0.5) * 9, flip: 6 + r() * 6, w: 60 + r() * 50, h: 34 + r() * 30, life: 1.3 }));
  return out;
})();

// E: flying round the page with the scissors; streak frames are the owl smeared along its path
// (x, y) = the owl's body centre (mask centroid); it faces left except on the right-hand pass (96.76–96.96)
function flyE(slot, x, y, right = false) {
  return owlComp(POSE.fly, WINGS.half(), x, y + 25, S_E, { slot, props: flyScissors, flip: right, rot: right ? 0.18 : -0.18 });
}
function flyScissors(g) { drawScissors(g, { x: -230, y: -40, ang: Math.PI + 0.35, L: 190, open: 0.28 }); }
function sceneE(ts) {
  const row = E_SEQ.filter((r) => ts + 1e-4 >= r[0]).pop() || E_SEQ[0];
  const shards = (g) => { drawShards(g, ts, SHARDS); drawConfetti(g, ts, 5, 96.76, 26); };
  const right = ts >= 96.755 && ts < 96.995;
  if (!row[3]) {
    const O = flyE(0, row[1], row[2], right);
    return (g) => { shards(g); blitOwl(g, O); };
  }
  const [p0, p1] = [row[1], row[2]];
  const O = flyE(0, p1[0], p1[1], p1[0] > p0[0]);
  const smear = (g, O, a0, a1, alpha = 1) => {
    // motion smear: blurred copies along the path, faint at the tail, the head end nearly solid
    g.save(); g.filter = "blur(3px)";
    for (let i = 0; i <= 11; i++) {
      const u = i / 11;
      blitOwl(g, O, alpha * (0.08 + 0.4 * u * u), (a0[0] - a1[0]) * (1 - u), (a0[1] - a1[1]) * (1 - u));
    }
    g.filter = "none"; g.restore();
    blitOwl(g, O, alpha * 0.55);
  };
  // 97.00–97.04: a second streak low on the right (x 1766–2206, y 491–682) and a faint vertical smear at x ≈ 1570
  const O2 = ts >= 96.995 ? flyE(1, 2150, 586, true) : null;
  return (g) => {
    shards(g);
    smear(g, O, p0, p1);
    if (O2) {
      smear(g, O2, [1800, 586], [2150, 586], 0.8);
      g.save(); g.filter = "blur(6px)"; g.fillStyle = "rgba(230,230,226,0.35)"; g.fillRect(1540, 600, 60, 250); g.restore();
    }
  };
}

function scene(ts) {
  if (ts < 86.1) return sceneA(ts);
  if (ts < 88.355) return sceneB(ts);
  if (ts < 92.635) return sceneC(ts);
  if (ts < 95.935) return sceneD(ts);
  return sceneE(ts);
}

// ---------------------------------------------------------------- frame
let buf = null;
function shakeAt(ts) { for (const [t0, dx, dy] of SHAKE) if (Math.abs(t0 - ts) < 0.02) return [dx, dy]; return [0, 0]; }
function render(g, ts) {
  const page = ts < 88.575 ? holePage() : withBanner();
  const paint = scene(ts);
  drawFramedPage(g, page, { glow: 0, over: paint || null });
  // the parts outside the screen (strip, banner, owl, flames above its top edge) — drawn before the room light
  if (paint) {
    const S = FRAMED.screen;
    g.save();
    g.beginPath(); g.rect(0, 0, g.canvas.width, g.canvas.height); g.rect(S.x0, S.y0, S.x1 - S.x0, S.y1 - S.y0); g.clip("evenodd");
    paint(g);
    g.restore();
  }
  addScreenGlow(g, 1);
}
export const shot = {
  draw(ctx, local, t) {
    const ts = srcT(t);
    const [dx, dy] = shakeAt(ts);
    if (!dx && !dy) return render(ctx, ts);
    if (!buf) { buf = document.createElement("canvas"); buf.width = ctx.canvas.width; buf.height = ctx.canvas.height; }
    const b = buf.getContext("2d");
    b.setTransform(1, 0, 0, 1, 0, 0);
    render(b, ts);
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.drawImage(buf, dx, dy);
    ctx.restore();
  },
  release() { stripC = null; bannerPage = null; buf = null; releaseOwl23(); releaseSoko(); releaseHippie(); },
};
