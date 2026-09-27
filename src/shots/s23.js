// s23 (84.04–97.08): the sōko page framed on the lit screen, drawn entirely in code.
// Beats (source frame k = floor(t·25); measured on the source, see fidelity/s23.md):
//   84.04–84.08  the owl hugs the peeled strip's end (the strip's blank back, a quad measured on the frame)
//   84.12–85.76  it walks right along the hole's lower lip holding the old B&W strip up over its head (strip: similarity
//                track per source frame; 85.60–85.76 the source dissolves between two copies), then flies off top right
//   86.04–86.52  the empty slot
//   86.52–88.32  it drops in from the top right and walks left carrying the colour banner on its head (banner track),
//                head turned left and winking, a squeeze, head turned right, then facing us
//   88.36        the slap; 88.40–89.56 it presses the banner flat with its wings spread; the banner trembles
//   89.60–90.28  it hops off, rises, drops onto the gear boxes at the left, grabbing its scissors, spreads its wings
//   90.32–91.80  it wipes its brow, the other wing on the planted scissors
//   91.84–92.60  it crouches, fists clenched, eyes blazing
//   92.64–95.56  powered up: white flame aura, rings round it, flying paper, two camera shakes; the scissors fly back
//                to it (93.84–94.84), a flare (94.88–95.12), a pair in each wing
//   95.60–95.92  the aura blows off; it hovers with the two pairs in a thin speed ring
//   95.96–97.04  it zips round the page, leaving shard cut lines
// Everything is drawn: the page is F1's (sites.js), the banner F2's (hippie.js), the owl the F4 kit (owlInk.js) posed in
// s23/bird.js; effects in s23/fx.js. No source pixel is used.
import { drawFramedPage, addScreenGlow, sokoPageCanvas, sokoHeaderCanvas, HEADER, HEADER_FRAMED, FRAMED, releaseSoko, PAGE_W, PAGE_H } from "../lib/sites.js";
import { hippieBannerCanvas, releaseHippie } from "../lib/hippie.js";
import { STRIP_TRK, STRIP_DISS, BAN_TRK, SHAKE } from "./s23/tracks.js";
import { STRIP_WALK, BAN_WALK, WALK_Y, STRIP_EXIT, BAN_ENTRY, HOP, at, lerpTab } from "./s23/owltrack.js";
import { POSES23 as P, birdLayer, drawLayer, releaseBirds, HUG_WING } from "./s23/bird.js";
import { paintWing23 } from "./s23/wings.js";
import { gv } from "../lib/owlInk.js";
import { drawAura3, drawFlare3, releaseFlames } from "./s23/flames.js";
import { drawAura, drawFlare, drawRemnant, ring, bigRing, drawPapers, drawShards, drawConfetti, drawImpact, releaseFx } from "./s23/fx23.js";
import { drawScissors, drawSprout } from "./s23/props.js";
import { SHARDS } from "./s23/tracks.js";
import { PAPERS as PAPER_Q } from "./s23/papers.js";
import { rng } from "../lib/rng.js";

const FR = 25;
const fidx = (t) => Math.floor(t * FR + 1e-3);
const hold = (tab, k) => { let b = tab[0]; for (const r of tab) { if (Math.round(r[0] * FR) <= k) b = r; else break; } return b.slice(1); };
const simT = ([s, rd, tx, ty]) => { const r = (rd * Math.PI) / 180; return [s * Math.cos(r), s * Math.sin(r), -s * Math.sin(r), s * Math.cos(r), tx, ty]; };

// ---------------------------------------------------------------- pages
const holePage = () => sokoPageCanvas({ header: false, gaze: "down" });
let bannerPage = null;
function withBanner() {
  if (bannerPage) return bannerPage;
  const c = document.createElement("canvas"); c.width = PAGE_W; c.height = PAGE_H;
  const g = c.getContext("2d");
  g.drawImage(holePage(), 0, 0);
  // once the banner is pasted in, the torn white lip of the hole is gone along its top and sides (source: max over
  // frame y 176–190 ≈ 35–38, x 186–192 dark); only the lower lip still shows under the banner. Repaint a 12 px frame
  // round HEADER (top and sides, down to 14 px above its bottom) from F1's page with a plain (rimless) hole.
  g.save(); g.beginPath();
  const H = HEADER, m = 12;
  g.rect(H.x - m, H.y - m, H.w + 2 * m, H.h + m - 14); g.rect(H.x, H.y, H.w, H.h); g.clip("evenodd");
  g.drawImage(sokoPageCanvas({ header: false, hole: "plain", gaze: "down" }), 0, 0);
  g.restore();
  g.imageSmoothingQuality = "high";
  g.drawImage(hippieBannerCanvas(), HEADER.x, HEADER.y, HEADER.w, HEADER.h);
  bannerPage = c;
  return c;
}
// the pale paper edge round the colour banner (it fades out once the banner is in: 91.56–91.76, measured on the edge)
function bannerEdge(g, a = 1) { g.save(); g.globalAlpha *= a; g.strokeStyle = "rgba(236,234,228,0.95)"; g.lineWidth = 3.4; g.strokeRect(HEADER.x - 0.5, HEADER.y - 0.5, HEADER.w + 1, HEADER.h + 1); g.restore(); }
const edgeAlpha = (k) => (k <= 2288 ? 1 : k >= 2294 ? 0 : (2294 - k) / 6);

// ---------------------------------------------------------------- the old strip (frame px at 77.6 s = HEADER_FRAMED)
// The strip the owl carries is the left part of the header, frame x 193.8–1227.7 at 77.6 s, with a ~5 px pale paper
// band round it (profiles across its four edges at 84.24–85.44).
const SX0 = 193.8, SX1 = 1227.7, BAND = 5, PAD = 7;
let stripC = null;
function stripCanvas() {
  if (stripC) return stripC;
  const H0 = HEADER_FRAMED, x0 = SX0, y0 = H0.y, w = SX1 - SX0, h = H0.h, cw = w + PAD * 2, ch = h + PAD * 2, S = 1.5;
  const c = document.createElement("canvas"); c.width = Math.round(cw * S); c.height = Math.round(ch * S);
  const g = c.getContext("2d");
  g.scale(S, S); g.translate(PAD - x0, PAD - y0);
  g.fillStyle = "rgb(236,236,232)"; g.fillRect(x0 - BAND, y0 - BAND, w + BAND * 2, h + BAND * 2);
  g.save(); g.beginPath(); g.rect(x0, y0, w, h); g.clip();
  g.fillStyle = "#050505"; g.fillRect(x0, y0, w, h);
  g.transform(FRAMED.sx, 0, 0, FRAMED.sy, FRAMED.x, FRAMED.y);
  g.imageSmoothingQuality = "high";
  g.drawImage(sokoHeaderCanvas({ gaze: "down" }), HEADER.x, HEADER.y, HEADER.w, HEADER.h);
  g.restore();
  stripC = { c, x: x0 - PAD, y: y0 - PAD, w: cw, h: ch };
  return stripC;
}
function drawStrip(g, m, alpha = 1) {
  const S = stripCanvas();
  g.save(); g.globalAlpha *= alpha; g.transform(...m); g.imageSmoothingQuality = "high"; g.drawImage(S.c, S.x, S.y, S.w, S.h); g.restore();
}
// the colour banner under a frame(90.0) -> frame(t) similarity (it sits at HEADER_FRAMED at 90.0 s)
function drawBannerAt(g, m) {
  g.save(); g.transform(...m); g.transform(FRAMED.sx, 0, 0, FRAMED.sy, FRAMED.x, FRAMED.y);
  g.imageSmoothingQuality = "high"; g.drawImage(hippieBannerCanvas(), HEADER.x, HEADER.y, HEADER.w, HEADER.h); bannerEdge(g);
  g.restore();
}
// the peeled strip's blank back at 84.04–84.08 (corners measured on the frame; the top-left one is under the owl)
// (fix pass 1: the top-left corner re-read at 1396, 302 — the card's left edge at x ≈ 1398 under the wing)
const CARD = [[1396, 302], [1956, 204], [1988, 359], [1412, 468]];
let cardGrain = null;
function drawCard(g) {
  g.save(); g.beginPath(); CARD.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath();
  g.fillStyle = "rgb(214,219,212)"; g.fill();
  // the paper's grain: seeded speckle (flat tone ± ~8 levels) plus sparse short ticks, clipped to the card
  if (!cardGrain) {
    const c = document.createElement("canvas"); c.width = 620; c.height = 280;
    const q = c.getContext("2d"), r = rng(2101), id = q.createImageData(620, 280), d = id.data;
    for (let i = 0; i < d.length; i += 4) { const v = (r() - 0.5) * 2; d[i] = d[i + 1] = d[i + 2] = v > 0 ? 255 : 0; d[i + 3] = Math.round(Math.abs(v) * 20); }
    q.putImageData(id, 0, 0);
    q.strokeStyle = "rgba(120,124,118,0.18)"; q.lineWidth = 1;
    for (let i = 0; i < 260; i++) { const x = r() * 620, y = r() * 280, a = (r() - 0.5) * 0.6; q.beginPath(); q.moveTo(x, y); q.lineTo(x + Math.cos(a) * 5, y + Math.sin(a) * 5); q.stroke(); }
    cardGrain = c;
  }
  g.clip(); g.drawImage(cardGrain, 1385, 195);
  g.restore();
}

// ---------------------------------------------------------------- the owl per source frame
// returns [{ L (layer), alpha, m? }] to paint, in frame px
const WALK_PH = (k, k0) => ["carry0", "carry1", "carry2", "carry3"][Math.floor((k - k0) / 2) % 4];
function owlAt(k) {
  const out = [];
  // each drawing is built once at the origin (cached per pose, size and flip) and moved to (x, y) when drawn
  const lay = (name, x, y, s, o = {}) => out.push({ L: birdLayer(P[name], { x: 0, y: 0, s, flip: !!o.flip, rot: o.rot || 0 }, { key: `${name}:${s}:${!!o.flip}:${o.rot || 0}` }), alpha: o.alpha ?? 1, dx: x, dy: y });
  if (k <= 2102) return out;
  if (k <= 2139) { const [, a, b] = at(STRIP_WALK, k); lay(k <= 2104 ? "carryOpen" : WALK_PH(k, 2103), (a + b) / 2 - 5, WALK_Y, 0.42); return out; }
  if (k <= 2144) {
    // 85.60–85.76: two copies dissolve (the held one at the 85.56 pose, the new one moving on)
    const w = STRIP_DISS[k] ? STRIP_DISS[k][1][1] : 1, [, a, b] = at(STRIP_WALK, 2139);
    lay("carry1", (a + b) / 2 - 5, WALK_Y, 0.42, { alpha: 1 - w });
    const x2 = (a + b) / 2 - 5 + (STRIP_DISS[k] ? STRIP_DISS[k][1][0][2] - 1142.6 : 0), y2 = WALK_Y + (STRIP_DISS[k] ? (STRIP_DISS[k][1][0][3] + 234.4) * 0.3 : 0);
    lay("lift", x2, y2, 0.42, { alpha: w });
    return out;
  }
  if (k <= 2150) { const [x, y] = lerpTab(STRIP_EXIT, k); lay("lift", x, y, 0.42); return out; }
  if (k <= 2162) return out;
  if (k <= 2167) { const [x, y] = lerpTab(BAN_ENTRY, k); lay(k >= 2166 ? "carry1" : "lift", x, y, 0.42); return out; }
  if (k <= 2203) {
    const [, a, b] = at(BAN_WALK, k), x = (a + b) / 2 - 5;
    if (k <= 2191) lay(WALK_PH(k, 2168), x, WALK_Y, 0.42);
    else if (k <= 2193) lay("carrySq", x, WALK_Y, 0.42);
    else if (k <= 2201) lay(WALK_PH(k, 2194), x, WALK_Y, 0.42, { flip: true });
    else lay("carryF", x, WALK_Y, 0.42);
    return out;
  }
  // held at the end of the walk, facing us (re-measured at 88.24: head centre (727, 250), feet on the lip at ≈ 355)
  if (k <= 2208) { lay("carryF", 727, WALK_Y + 2, 0.42); return out; }
  if (k <= 2239) { lay("press", 721, 320, 0.425); return out; }
  if (k <= 2253) { const [, x, y] = at(HOP, k); lay(k <= 2242 ? "press" : k <= 2249 ? "hopUp" : "land", x, y, 0.41); return out; }
  if (k <= 2257) { lay("spread", 692, 522, 0.42); return out; }
  if (k <= 2261) { lay("wipeUp", 692, 520, 0.41); return out; }
  // the wing stays on the brow, eyes shut, through 2295 (2290–2295 is a redraw, not a lowering); crouch from 2296
  if (k <= 2295) { lay("wipe", 693, 520 + (Math.floor(k / 2) % 2), 0.41); return out; }
  if (k <= 2314) { lay("crouch", 692, 530, 0.43); return out; }
  if (k === 2315) { lay("antic", 695, 520, 0.47); return out; }
  if (k <= 2345) { lay("power", 690, 528, 0.475); return out; }
  if (k <= 2371) { lay("reach", 688, 528, 0.475); return out; }
  if (k <= 2398) { lay("two", 693, 528, 0.475); return out; }
  // zipping round the page: held drawings between one-frame streaks (drawn by fxZip)
  const Z = ZIP[k];
  if (Z) lay(Z[0], Z[1], Z[2], 0.475, { flip: !!Z[3] });
  return out;
}

// ---------------------------------------------------------------- the power-up effects
// paper scraps blown out of the aura: measured quads per source frame (s23/papers.js), pale grey, a faint darker edge
function drawPaperQuads(g, k) {
  const Q = PAPER_Q[k];
  if (!Q) return;
  g.save(); g.lineJoin = "round";
  for (const q of Q) {
    g.beginPath(); g.moveTo(q[0], q[1]); g.lineTo(q[2], q[3]); g.lineTo(q[4], q[5]); g.lineTo(q[6], q[7]); g.closePath();
    const v = Math.round(q[8] * 0.93);
    g.fillStyle = `rgb(${v},${v},${v - 3})`; g.fill();
    g.strokeStyle = "rgba(90,90,88,0.5)"; g.lineWidth = 1; g.stroke();
  }
  g.restore();
}
// the big shockwave band on the floor in front of the screen (92.64–93.72): one soft grey band per frame, the lower
// (front) half of an ellipse fitted per source frame to the band's column peaks (snapshots/s23-fix1-tools/ringfit.py;
// the bottom is below the frame on most frames): [cx, cy, rx, ry, alpha, back]. "R" = the right end only (the ring
// has grown past the frame: its right end, both halves, x > 2040 at y 780–946, and a sliver in the bottom-left corner);
// "L" = only its left end (2342). 2335–2336 and 2343+ show none. (fix 1b: 2337 / 2341 re-fitted with the back arc on
// the right, a0 = the arc's start angle)
const RING_A = { 2316: [941, 814, 1000, 155, 0.55], 2318: [1063, 800, 1027, 152, 0.6], 2319: [1063, 800, 1027, 152, 0.6], 2322: [1084, 746, 1080, 220, 0.6],
  2323: [1084, 746, 1080, 220, 0.6], 2327: [1073, 797, 1043, 152, 0.58], 2328: [1073, 797, 1043, 152, 0.58], 2331: [1069, 808, 1025, 140, 0.6],
  2332: [1069, 808, 1025, 140, 0.6], 2337: [1221, 851, 1062, 89, 0.58, -0.6], 2338: [1221, 851, 1062, 89, 0.58, -0.6], 2339: [943, 825, 997, 138, 0.55],
  2340: [943, 825, 997, 138, 0.55], 2341: [1322, 840, 1088, 96, 0.55, -0.5] };
const RING_R = new Set([2317, 2320, 2321, 2324, 2325, 2326, 2329, 2330, 2333, 2334]);
function drawBigRing(g, k) {
  if (RING_A[k]) { const [cx, cy, rx, ry, a, a0] = RING_A[k]; bigRing(g, cx, cy, rx, ry, a, a0); }
  else if (RING_R.has(k)) {
    // the right end (x 2068–2193, y 780–946), both halves, and its lower arc through the bottom-left corner
    bigRing(g, 1034, 846, 1158, 210, 0.42, -0.33, 0.7);
    bigRing(g, 1034, 846, 1158, 210, 0.3, 2.5, 2.75);
  } else if (k === 2342) bigRing(g, 1150, 850, 1165, 200, 0.45, 2.55, 3.3);
}
// the scissors flying back to its reaching wing (93.84–94.84): pivot, blade direction (deg, canvas: 0 = right,
// 90 = down) and blade opening per source frame, read off 1x gridded crops (snapshots/s23-fix1-tools/sc_*.jpg).
// On the frames marked `blur` the source draws the spin as 2–3 overlapping exposures (extra blades radiating).
// [k, x, y, dir, open, blur]
const SCIS = [[2346, -70, 445, 12, 40, 1], [2347, -40, 430, 5, 35, 1], [2348, -20, 410, 21, 90, 1], [2349, -5, 400, 0, 50, 1], [2350, 20, 400, -17, 78, 1],
  [2351, 40, 405, 23, 90, 1], [2352, 45, 410, -1, 28, 0], [2353, 70, 415, 10, 70, 1], [2354, 100, 420, -32, 67, 0], [2355, 135, 425, 3, 65, 0],
  [2356, 155, 430, 30, 55, 1], [2357, 175, 435, 33, 92, 1], [2358, 200, 445, 60, 70, 1], [2359, 220, 450, 5, 30, 1], [2360, 240, 450, 5, 26, 0],
  [2361, 270, 450, 10, 60, 1], [2362, 290, 455, -9, 36, 0], [2363, 315, 465, 25, 43, 0], [2364, 345, 470, -40, 35, 1], [2365, 360, 475, -33, 56, 0],
  [2366, 390, 480, 13, 100, 1], [2367, 410, 485, 0, 60, 1], [2368, 440, 485, -45, 100, 1], [2369, 470, 490, 130, 95, 1], [2370, 495, 490, -13, 50, 0],
  [2371, 525, 500, 5, 45, 0]];
const SCIS_L = 132;
function drawFlyingScissors(g, k) {
  const r = SCIS.find((q) => q[0] === k);
  if (!r) return;
  const [, x, y, dir, open, blur] = r, D = Math.PI / 180;
  if (blur) for (const [da, a] of [[-38, 0.4], [38, 0.4]]) drawScissors(g, { x, y, ang: (dir + da) * D, L: SCIS_L, open: open * D, alpha: a });
  drawScissors(g, { x, y, ang: dir * D, L: SCIS_L, open: open * D });
}
function fxLayer(k, t) {
  const L = [];
  if (k >= 2391) L.push((g) => drawSprout(g));
  // the aura: one drawing that boils every frame (6 variants); the flare replaces it for 2372–2378
  if (k >= 2316 && k <= 2389 && !(k >= 2372 && k <= 2378)) L.push((g) => drawAura3(g, k % 6));
  if (k >= 2372 && k <= 2378) L.push((g) => drawFlare3(g, k <= 2373 ? "a" : k <= 2376 ? "b" : k === 2377 ? "c" : "d"));
  if (k === 2390) L.push((g) => drawRemnant(g, 2390));
  return L;
}
function fxFront(k, t) {
  const L = [];
  if (k >= 2316 && k <= 2342) L.push((g) => drawBigRing(g, k));
  // the thin speed ring round it, 92.64–95.92 (fix pass 2: an ellipse fitted to its column crossings on 2360 / 2395,
  // max residual 0.4 px; it is the same ring before and after the flare, and it shakes with the frame)
  if (k >= 2316 && k <= 2398) L.push((g) => ring(g, 695, 571.5, 329, 60.5, 3, 0.9));
  if (PAPER_Q[k]) L.push((g) => drawPaperQuads(g, k));
  if (k >= 2346 && k <= 2371) L.push((g) => drawFlyingScissors(g, k));
  if (k >= 2211 && k <= 2233) L.push((g) => drawImpact(g, k));
  if (k >= 2402) L.push((g) => drawShards(g, k / 25, SHARDS));
  if (k >= 2425) L.push((g) => drawConf(g));
  for (const S of STREAK.filter((q) => q[0] === k)) L.push((g) => drawSmear2(g, k, S));
  if (k >= 2399 && k <= 2401) L.push((g) => drawBurst(g, k));
  return L;
}

// the zip (95.96–97.04): at every stop the source alternates two drawings on ones (fix pass 2): A = flying with both
// pairs raised, B = lunging left with both pairs thrust forward (s23/bird.js zipA / zipB). k -> [pose, root x, root y,
// flip] (root = body centre; fitted on 2403 / 2404, the other stops placed from their difference-mask centroids and
// the heads, then registered on the source frame)
const ZIP = {
  2399: ["zipA", 465, 168], 2400: ["zipA", 456, 166], 2401: ["zipA", 456, 166], 2402: ["zipB", 449, 165], 2403: ["zipA", 451, 166],
  2404: ["zipB", 450, 165], 2405: ["zipA", 450, 166], 2406: ["zipB", 450, 168], 2407: ["zipA", 454, 161],
  2409: ["zipA", 1627, 908], 2410: ["zipB", 1638, 925],
  2412: ["zipA", 950, 189], 2413: ["zipB", 948, 182], 2414: ["zipA", 950, 189], 2415: ["zipB", 948, 182],
  2417: ["zipA", 398, 630], 2418: ["zipB", 435, 639],
  2420: ["zipA", 1883, 419, 1], 2421: ["zipB", 1878, 433, 1], 2422: ["zipA", 1883, 419, 1], 2423: ["zipB", 1878, 433, 1],
};
// the one-frame smears between the held stops (fix pass 2, re-read on 2x-labelled source crops): each is a broad soft
// band of the owl's motion blur from its tail to its head, streaked along the motion, brightest toward the head, with
// the owl itself at the head on some frames (the smears at 2408 / 2411 show none).
// [k, tail, head, band width, band alpha, head pose | null, root at the head, flip, rot, head alpha]
//   2408  down-right (1100, 650) -> (1710, 900)         2411  up (1500, 905) -> (1400, 600)
//   2416  owl lunging left at (380, 620), its blur up-right to (860, 370)   2419  owl flying right, face ≈ (1905, 330),
//         blur back to x ≈ 1300      2424  up, (1660, 640) -> (1740, 300), the owl faint at the top
//   2425–26 top owl flying LEFT (scissors leading at x ≈ 1045, face ≈ (1250, 100)), its trail right to x ≈ 1560;
//         right owl flying right at the frame edge (face ≈ (2150, 560)), trail from x ≈ 1700; a vertical streak x ≈ 1605
const STREAK = [[2408, [1100, 650], [1710, 900], 150, 0.62, null],
  [2411, [1500, 905], [1400, 600], 170, 0.62, null],
  [2416, [860, 370], [420, 590], 130, 0.55, "zipB", [385, 625], false, 0, 0.85],
  [2419, [1300, 400], [1860, 400], 150, 0.55, "zipB", [1888, 401], true, 0, 0.8],
  [2424, [1660, 640], [1740, 320], 150, 0.55, "zipA", [1772, 371], false, 0, 0.35],
  [2425, [1480, 250], [1160, 125], 150, 0.62, "zipB", [1262, 168], false, -0.2, 0.6], [2426, [1480, 250], [1160, 125], 150, 0.62, "zipB", [1262, 168], false, -0.2, 0.6],
  [2425, [1700, 540], [2060, 590], 160, 0.6, "zipB", [2133, 625], true, 0, 0.6], [2426, [1700, 540], [2060, 590], 160, 0.6, "zipB", [2133, 625], true, 0, 0.6],
  [2425, [1612, 946], [1624, 530], 120, 0.62, null], [2426, [1612, 946], [1624, 530], 120, 0.62, null]];
// one smear: 1) the band (a tapered quad, alpha 0 at the tail -> a0 at the head, blurred), 2) streaks along it,
// 3) the owl dragged along the last 40 % of the path as 40 faint copies, 4) the owl at the head
const smearCache = new Map();
function drawSmear2(g, k, [ , a, b, w, a0, pose, root, flip, rot, headA]) {
  const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len, nx = -uy, ny = ux;
  const r = rng(9000 + k * 7 + Math.round(a[0]));
  g.save();
  // 1) the band
  const gr = g.createLinearGradient(a[0], a[1], b[0], b[1]);
  gr.addColorStop(0, "rgba(226,226,222,0)"); gr.addColorStop(0.55, `rgba(226,226,222,${a0 * 0.55})`); gr.addColorStop(1, `rgba(232,232,228,${a0})`);
  g.filter = "blur(7px)"; g.fillStyle = gr;
  g.beginPath();
  g.moveTo(a[0] + nx * w * 0.22, a[1] + ny * w * 0.22); g.lineTo(b[0] + nx * w * 0.5, b[1] + ny * w * 0.5);
  g.quadraticCurveTo(b[0] + ux * w * 0.35, b[1] + uy * w * 0.35, b[0] - nx * w * 0.5, b[1] - ny * w * 0.5);
  g.lineTo(a[0] - nx * w * 0.22, a[1] - ny * w * 0.22); g.closePath(); g.fill();
  g.filter = "none";
  // 2) streaks: thin light lines along the motion, denser and brighter toward the head
  g.lineCap = "round";
  for (let i = 0; i < 26; i++) {
    const v = (r() - 0.5) * 0.9, u0 = r() * 0.6, u1 = Math.min(1, u0 + 0.25 + 0.5 * r()), wv = w * (0.22 + 0.28 * u1);
    const x0 = a[0] + dx * u0 + nx * v * wv, y0 = a[1] + dy * u0 + ny * v * wv, x1 = a[0] + dx * u1 + nx * v * wv, y1 = a[1] + dy * u1 + ny * v * wv;
    const sg = g.createLinearGradient(x0, y0, x1, y1); sg.addColorStop(0, "rgba(246,246,242,0)"); sg.addColorStop(1, `rgba(246,246,242,${(0.25 + 0.35 * r()) * a0})`);
    g.strokeStyle = sg; g.lineWidth = 1 + 1.6 * r(); g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
  }
  // 3) + 4) the owl
  if (pose) {
    const L = birdLayer(P[pose], { x: 0, y: 0, s: 0.475, flip, rot }, { key: `${pose}:0.475:${flip}:${rot}` });
    const hx = root[0], hy = root[1];
    for (let i = 40; i >= 1; i--) {
      const u = i / 40 * 0.4;
      g.globalAlpha = 0.045 * headA;
      g.drawImage(L.canvas, hx - dx * u + L.x, hy - dy * u + L.y, L.w, L.h);
    }
    // the owl at the head is itself motion-soft in the source
    g.globalAlpha = headA; g.filter = "blur(1.6px)"; g.drawImage(L.canvas, hx + L.x, hy + L.y, L.w, L.h); g.filter = "none";
  }
  g.restore();
}
// the paper confetti that appears at 97.00 (held 2425–2426; s24 drifts it outward from 97.08): white rectangles
// measured on 2425 (top-hat blobs not present on 2424, rect fill ≥ 0.6; bits of the smears dropped): [cx, cy, w, h, deg]
const CONF = [[950, 2, 5, 14, 90], [1077, 17, 12, 10, 0], [1442, 31, 17, 13, 84], [638, 63, 16, 29, 49], [874, 75, 18, 9, 76], [1187, 82, 18, 31, 16],
  [1743, 111, 35, 19, 32], [1343, 124, 29, 9, 34], [1468, 192, 11, 9, 45], [2176, 240, 6, 9, 72], [1788, 259, 38, 18, 19], [1409, 268, 28, 16, 45],
  [1760, 283, 7, 13, 34], [1587, 285, 15, 10, 4], [828, 317, 20, 16, 37], [839, 327, 7, 17, 63], [1393, 380, 15, 21, 39], [340, 384, 15, 8, 58],
  [1883, 390, 22, 14, 15], [188, 479, 21, 11, 18], [291, 560, 9, 21, 49], [2025, 627, 21, 10, 60], [1330, 661, 13, 23, 79], [727, 670, 10, 18, 90],
  [1318, 665, 10, 7, 31], [355, 688, 15, 29, 59], [1363, 720, 27, 15, 51], [1816, 736, 29, 17, 90], [2171, 756, 8, 12, 45], [1431, 778, 17, 33, 75],
  [1096, 789, 6, 12, 90], [378, 823, 16, 12, 27], [1561, 928, 16, 10, 4]];
function drawConf(g) {
  g.save(); g.fillStyle = "rgba(240,240,236,0.95)"; g.strokeStyle = "rgba(120,120,116,0.5)"; g.lineWidth = 0.8;
  for (const [x, y, w, h, a] of CONF) { g.save(); g.translate(x, y); g.rotate((a * Math.PI) / 180); g.fillRect(-w / 2, -h / 2, w, h); g.strokeRect(-w / 2, -h / 2, w, h); g.restore(); }
  g.restore();
}
// 95.96–96.04: where the owl stood as it zips off. 2399: the thin speed ring and a burst of short strokes radiating
// from ≈ (735, 540). 2400–2401 (one drawing, held on twos): the ring is gone but for a faint top-left arc, and the
// burst has turned into ~55 small white flecks scattered over x 440–925, y 360–510 (fix pass 2: every fleck measured
// on 2400 against the clean frame 2405 — [cx, cy, length, width, angle deg, peak grey])
const FLECKS = [[598, 360, 3.0, 1.0, 180, 232], [616, 360, 3.0, 1.0, 180, 213], [652, 364, 3.0, 2.0, 90, 243], [691, 376, 2.7, 1.3, 63, 235], [751, 378, 3.1, 1.8, 117, 229], [554, 380, 1.0, 1.0, 90, 179], [629, 380, 4.0, 1.8, 63, 245], [818, 380, 3.0, 1.0, 90, 244], [662, 382, 3.0, 2.0, 90, 251], [712, 380, 1.0, 1.0, 90, 192], [584, 382, 1.0, 1.0, 90, 210], [613, 385, 3.6, 1.3, 63, 232], [754, 392, 6.0, 2.0, 90, 255], [805, 391, 4.2, 1.9, 124, 248], [839, 393, 5.7, 2.1, 135, 255], [625, 396, 6.3, 2.7, 63, 255], [781, 394, 4.0, 2.0, 90, 231], [699, 396, 2.0, 1.0, 180, 248], [825, 398, 5.7, 2.1, 135, 252], [571, 400, 2.8, 1.4, 45, 254], [659, 402, 5.8, 2.2, 63, 253], [540, 400, 1.4, 0.7, 45, 129], [594, 404, 3.0, 2.0, 0, 231], [857, 406, 4.2, 1.4, 135, 255], [793, 409, 6.4, 2.8, 135, 255], [879, 407, 2.1, 1.4, 135, 246], [631, 412, 3.5, 1.4, 45, 241], [599, 414, 3.6, 1.3, 63, 211], [817, 416, 4.2, 2.1, 135, 251], [539, 420, 6.4, 2.2, 37, 247], [709, 420, 3.0, 2.0, 90, 255], [786, 424, 4.9, 2.1, 135, 255], [862, 422, 7.1, 2.1, 135, 251], [892, 427, 4.7, 2.5, 162, 252], [516, 426, 3.0, 1.0, 180, 215], [664, 432, 2.0, 1.0, 90, 227], [880, 432, 4.0, 2.0, 180, 252], [673, 438, 1.4, 0.7, 45, 160], [515, 444, 4.9, 2.1, 45, 239], [541, 445, 4.9, 1.3, 27, 211], [816, 450, 2.8, 1.4, 135, 250], [856, 450, 4.9, 1.4, 135, 255], [632, 456, 4.9, 1.4, 45, 235], [920, 456, 5.0, 2.0, 180, 248], [518, 465, 3.6, 1.3, 27, 238], [748, 468, 2.8, 1.4, 135, 239], [801, 468, 4.2, 2.1, 135, 255], [490, 474, 5.0, 1.0, 180, 227], [511, 477, 5.0, 2.5, 34, 182], [589, 478, 2.1, 0.7, 45, 213], [922, 486, 3.0, 1.0, 180, 246], [446, 494, 3.0, 2.0, 90, 244], [490, 494, 3.0, 1.0, 180, 232], [890, 506, 3.0, 2.0, 180, 244], [920, 505, 1.4, 1.4, 45, 226], [494, 518, 5.0, 3.0, 180, 241]];
function drawBurst(g, k) {
  if (k === 2399) {
    const r = rng(2399), n = 16, c = [735, 545];
    ring(g, 695, 571.5, 329, 60.5, 3, 0.9);
    g.save(); g.lineCap = "round";
    for (let i = 0; i < n; i++) {
      const th = Math.PI * (-0.95 + 0.9 * (i + r()) / n), r0 = 45 + 45 * r(), l = 26 + 22 * r();
      const x0 = c[0] + Math.cos(th) * r0 * 1.25, y0 = c[1] + Math.sin(th) * r0 * 0.8, x1 = x0 + Math.cos(th) * l * 1.2, y1 = y0 + Math.sin(th) * l * 0.8;
      const gr = g.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, "rgba(244,244,240,0.25)"); gr.addColorStop(1, "rgba(246,246,242,0.95)");
      g.strokeStyle = gr; g.lineWidth = 2.6; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
    }
    g.restore();
    return;
  }
  // the ring's last top-left arc (x ≈ 420–590, y 515–540)
  g.save(); g.strokeStyle = "rgba(240,240,236,0.7)"; g.lineWidth = 2.6; g.beginPath(); g.ellipse(695, 571.5, 329, 60.5, 0, 3.72, 4.39); g.stroke();
  g.lineCap = "round";
  for (const [x, y, l, w, a, v] of FLECKS) {
    const t = (a * Math.PI) / 180, h = Math.max(0, (l - w) / 2), c = Math.round(Math.min(250, v + 8));
    g.strokeStyle = `rgba(${c},${c},${c - 3},0.95)`; g.lineWidth = Math.max(1.2, w + 0.4);
    g.beginPath(); g.moveTo(x - Math.cos(t) * h - 0.01, y - Math.sin(t) * h); g.lineTo(x + Math.cos(t) * h + 0.01, y + Math.sin(t) * h); g.stroke();
  }
  g.restore();
}

// ---------------------------------------------------------------- what is on the page in source frame k
function scene(k) {
  const layers = [];
  if (k >= 2210 && edgeAlpha(k) > 0) layers.push((g) => { g.save(); g.transform(FRAMED.sx, 0, 0, FRAMED.sy, FRAMED.x, FRAMED.y); bannerEdge(g, edgeAlpha(k)); g.restore(); });
  if (k <= 2102) {
    // (fix pass 1: head ≈ 1415–1500 × 245–300 on the card's end, 1.1x bigger; the wing wraps down over the card's left
    // end from the shoulder (1425, 296) to feather tips at y ≈ 370; fix 1b: the face re-read at ≈ (1425, 278), lying on
    // the card's top edge — the head moved 28 px left, 22 px down)
    const hug = birdLayer(P.hug, { x: 1427, y: 340, s: 0.4 }, { key: "hug" });
    layers.push((g) => { drawLayer(g, hug); drawCard(g); g.save(); g.setTransform(g.getTransform().multiply(new DOMMatrix([0.42, 0, 0, 0.42, 1425, 296]))); paintWing23(g, HUG_WING, 1 / 0.42); g.restore(); });
  }
  if (k >= 2103 && k <= 2147) {
    if (STRIP_DISS[k]) { const cp = STRIP_DISS[k].map(([p, w]) => [simT(p), w]); layers.push((g) => { for (const [m, w] of cp) drawStrip(g, m, w); }); }
    else { const m = simT(hold(STRIP_TRK, k)); layers.push((g) => drawStrip(g, m)); }
  }
  if (k >= 2164 && k <= 2209) { const m = simT(hold(BAN_TRK, k)); layers.push((g) => drawBannerAt(g, m)); }
  for (const f of fxLayer(k)) layers.push(f);
  const owl = owlAt(k);
  layers.push((g) => { for (const o of owl) drawLayer(g, o.L, { alpha: o.alpha, dx: o.dx, dy: o.dy }); });
  for (const f of fxFront(k, k / 25)) layers.push(f);
  return (g) => { for (const L of layers) L(g); };
}

// ---------------------------------------------------------------- frame
let buf = null;
function render(g, k) {
  const page = k <= 2209 ? holePage() : withBanner();
  const paint = scene(k);
  // the page on the screen; the screen's thin border (F1's stroke, copied) goes UNDER the carried strip / banner / owl.
  // They are painted once over the whole frame before the room light is added (the source's carried strip is lit by
  // the screen's glow: painting it after the glow leaves the top band 20–75 levels too dark).
  drawFramedPage(g, page, { glow: 0, border: false, over: screenDot });
  screenBorder(g);
  paint(g);
  addScreenGlow(g, glowGain(k));
  roomSides(g, roomGain(k));
  afterSlap(g, k);
  // the source's last three rows are nearly black through the whole film (an edge of its encode: row 943 is ≈ 0.2x
  // row 942); matched here so the ring and floor do not light them (fix pass 2)
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = "multiply"; g.fillStyle = "rgb(46,46,46)"; g.fillRect(0, 943, g.canvas.width, 4); g.restore();
}
// F1's screen border (sites.js drawFramedPage, border: true), drawn by hand so it can sit under the carried layers
function screenDot(ctx) { ctx.fillStyle = "rgba(200,202,200,0.8)"; ctx.beginPath(); ctx.arc(147.5, 154.5, 3.3, 0, Math.PI * 2); ctx.fill(); }
function screenBorder(g) {
  const S = FRAMED.screen;
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
  g.strokeStyle = "rgba(62,64,62,0.62)"; g.lineWidth = 1.4;
  g.beginPath(); g.moveTo(S.x0, S.y1 + 2); g.lineTo(S.x0, S.y0); g.lineTo(S.x1, S.y0); g.lineTo(S.x1, S.y1 + 2); g.stroke();
  g.restore();
}
// After the slap the source's frame lifts: from 88.40 to 91.56 (k 2210–2289) the banner, the top margin and the side
// margins run ~3–6 graded levels brighter than before / after, dropping back over 2289–2295 (region means, graded,
// render / source: banner 110/115, top 51/54, left 26/28 over 2213–2289; banner 100/103, top 47/44 after 2293).
const liftW = (k) => (k < 2210 ? 0 : k <= 2289 ? 1 : k >= 2295 ? 0 : (2295 - k) / 6);
// (the carries run a stronger top glow, so the side margins take a lower gain: 0.66 / 0.75)
const roomGain = (k) => (k >= 2164 && k <= 2209 ? 0.66 : k >= 2103 && k <= 2147 ? 0.75 : k <= 2209 ? 0.79 : 0.88 + 0.04 * liftW(k));
function afterSlap(g, k) {
  const w = liftW(k);
  if (w <= 0) return;
  // a faint screen-blend lift on the banner (HEADER in frame px); the room round the screen follows glowGain / roomGain
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = "screen";
  const v = Math.round(10 * w);
  g.fillStyle = `rgb(${v},${v},${v})`;
  g.fillRect(HEADER_FRAMED.x, HEADER_FRAMED.y, HEADER_FRAMED.w, HEADER_FRAMED.h);
  g.restore();
}
// The source's room beside the screen is darker than F1's glow model gives for this page (pre-grade, left / right
// margins, ours / source: 1.2–1.3 with the hole, 1.1–1.2 with the banner in; the top band matches): a multiplicative
// room gain on the side margins, ramped over 8 px at the screen's edge.
const sideGrads = new Map();
function roomSides(g, f0) {
  const S = FRAMED.screen, W = g.canvas.width, H = g.canvas.height;
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = "multiply";
  let sideGrad = sideGrads.get(f0);
  if (!sideGrad) {
    sideGrad = g.createLinearGradient(0, 0, W, 0); sideGrads.set(f0, sideGrad);
    const v = (f) => `rgb(${Math.round(255 * f)},${Math.round(255 * f)},${Math.round(255 * f)})`;
    const fl = f0, fr = f0 - 0.02;
    sideGrad.addColorStop(0, v(fl)); sideGrad.addColorStop((S.x0 - 10) / W, v(fl)); sideGrad.addColorStop((S.x0 - 2) / W, v(1));
    sideGrad.addColorStop((S.x1 + 2) / W, v(1)); sideGrad.addColorStop((S.x1 + 10) / W, v(fr)); sideGrad.addColorStop(1, v(fr));
  }
  g.fillStyle = sideGrad; g.fillRect(0, S.y0 - 20, W, H - S.y0 + 20);
  g.restore();
}
// glow gain: the source's top margin runs brighter than F1's model while the strip / banner is carried above the
// screen (graded top band, ours / source 0.92 at 87.04–88.24)
// after the slap: brighter while the frame is lifted (2210–2289), then a touch darker than F1's model (top band
// 48 / 45 graded after 2293 at gain 1)
const glowGain = (k) => (k >= 2164 && k <= 2208 ? 1.3 : k === 2209 ? 1.0 : k >= 2103 && k <= 2147 ? 1.08 : k >= 2210 ? 0.96 + 0.07 * liftW(k) : 1);
function shakeAt(k) { for (const [t0, dx, dy] of SHAKE) if (Math.round(t0 * FR) === k) return [dx, dy]; return [0, 0]; }
export const shot = {
  draw(ctx, local, t) {
    const k = fidx(t);
    const [dx, dy] = shakeAt(k);
    if (!dx && !dy) return render(ctx, k);
    if (!buf) { buf = document.createElement("canvas"); buf.width = ctx.canvas.width; buf.height = ctx.canvas.height; }
    const b = buf.getContext("2d");
    b.setTransform(1, 0, 0, 1, 0, 0);
    render(b, k);
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    // the source has no black bars at the frame edges while it shakes: fill the uncovered edge with the frame itself,
    // enlarged 1.2 % about the centre, then lay the shaken frame over it at its measured offset
    const W = ctx.canvas.width, H = ctx.canvas.height, z = 1.012;
    ctx.drawImage(buf, dx + (W - W * z) / 2, dy + (H - H * z) / 2, W * z, H * z);
    ctx.drawImage(buf, dx, dy);
    ctx.restore();
  },
  release() { sideGrads.clear(); stripC = null; bannerPage = null; buf = null; releaseBirds(); releaseFx(); releaseFlames(); releaseSoko(); releaseHippie(); },
};
