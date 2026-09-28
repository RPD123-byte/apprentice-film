// s24 (97.08–100.48): the flurry. Every beat below is pinned to the source's own frames (film frame index
// k = round((t − 96.8) / 0.04); f-numbers in the comments are those k). Measured beats:
//   k 7   (97.08)        the framed page (colour banner, shard outlines, paper confetti) with three motion-smeared owls
//   k 8–18 (97.12–97.52) held: a big owl slashes left across the page with scissors, a white arc trails from the blades,
//                        two small owls with scissors (top-left in the banner, bottom-right), smoky echoes
//   k 19  (97.56)        the page whip-blurred down-right (~38°) with white washing in from the top-left
//   k 20  (97.60)        white, a dark blurred corner left at the bottom right
//   k 21–22 (97.64–97.68) white flash (the screen rectangle faintly visible: the margin glow)
//   k 23  (97.72)        white dissolving into the speed-line shot
//   k 24–53 (97.76–98.92) black, speed lines at 27.5° cycling layers, the angry owl (bandage, headphones, wings up)
//                        drifting up-left in 9.4/18.7 px steps, two pairs of scissors spinning at the left
//   k 54  (98.96)        cut: the owl holding up two pairs of scissors, on black
//   k 55–56 (99.00–99.04) white flash
//   k 57  (99.08)        the same owl on black; k 58–62 speed lines behind it (it holds still)
//   k 63–66 (99.32–99.44) four in-betweens of a spin (the bird whirls through half a turn)
//   k 67–90 (99.48–100.40) the dive: head-first toward us-right, a pair of scissors in each wing, settling by 99.60,
//                        speed lines frozen 99.60–100.04, the margin glow back from 100.08, drifting (+12, +10) px
//   k 91  (100.44)       a diagonal white band wipes up-left to the next shot (the framed page with the owl)
import { drawFramedPage, sokoPageCanvas, framedTransform, HEADER, FRAMED, addScreenGlow } from "../lib/sites.js";
import { hippieBannerCanvas } from "../lib/hippie.js";
import { gv } from "../lib/owlInk.js";
import { SHARD_SEGS, CONFETTI } from "./s24/shards.js";
import { drawSpeedLines, releaseLines } from "./s24/lines.js";
import { drawShears, spinShears, glint } from "./s24/shears.js";
import { birdF, birdJ, birdH, birdB, releaseOwls, releaseKit } from "./s24/owls.js";

const W = 2206, H = 946;
// (DBG_SHIFT is a scratch knob for the 30 fps snapshot tool; it must stay 0)
const DBG_SHIFT = 0;
const frameIndex = (t) => Math.round((t - 96.8) / 0.04) + DBG_SHIFT;

// ---------------------------------------------------------------- measured tables
// F owl: ORB track of the owl region (centre of the box x 1000–1900, y 250–900 at f40) per frame k = 24..53.
const F_TRACK = [[1655.5, 727.2], [1637.2, 713.4], [1628.0, 707.2], [1618.6, 700.2], [1599.8, 686.5], [1581.3, 673.1], [1571.9, 666.2], [1572.0, 666.3],
  [1562.7, 659.0], [1543.7, 645.5], [1525.1, 631.5], [1515.8, 625.0], [1506.5, 617.5], [1487.7, 602.9], [1468.8, 589.4], [1459.5, 582.1], [1450.0, 575.0],
  [1431.3, 561.0], [1412.7, 546.9], [1403.5, 540.2], [1393.9, 533.1], [1375.3, 518.5], [1355.6, 504.2], [1346.5, 496.7], [1337.0, 489.1], [1317.5, 474.0],
  [1298.9, 458.5], [1289.1, 451.3], [1280.0, 443.8], [1261.7, 429.4]];
// the speed-line layer shown on each frame k = 24..53 (frames two apart correlate 0.7–0.96 at a small up-left shift;
// three layers cycle X . X . with Y and Z alternating in the gaps); k 30 and 31 are the same frame
const F_LAYER = "XYXZXYXXZXYXZXYXZXYXZXYXZXYXZX";
// scissors A (left) and B (upper middle), per frame k = 24..53: [pivot x, pivot y, blade direction°, open°, smear].
// Read off gridded 1:1 tiles of every frame (snapshots/s24-study/scA*.jpg, scB*.jpg): both pairs spin in place
// about fixed pivots (A ≈ (360, 432), blade length ≈ 192 px; B ≈ (888, 205), ≈ 155 px), turning 30–55° clockwise
// per frame; smear = the source's blurred in-between frames. k 51–52: A opened wide.
const SC_A = [[352, 433, 182, 15, 0], [358, 430, -124, 15, 0], [361, 430, -95, 17, 0], [364, 427, -68, 17, 0], [364, 433, -17, 15, 0], [358, 436, 170, 15, 1],
  [364, 436, 59, 20, 0], [364, 436, 59, 20, 0], [358, 436, 111, 15, 0], [352, 436, 182, 15, 0], [358, 430, -125, 15, 0], [361, 430, -98, 15, 0],
  [364, 430, -67, 15, 0], [358, 436, 114, 15, 0], [358, 430, 188, 15, 0], [358, 430, -148, 15, 0], [361, 427, -97, 15, 0], [364, 430, -28, 15, 0],
  [358, 430, 199, 15, 0], [364, 430, -117, 15, 0], [352, 436, -87, 15, 0], [358, 436, -30, 20, 1], [375, 431, 186, 15, 0], [358, 428, 200, 15, 0],
  [358, 431, -114, 15, 0], [364, 430, -65, 15, 0], [358, 435, -18, 15, 0], [364, 435, 90, 160, 0], [358, 435, 104, 150, 1], [341, 435, 102, 15, 0]];
const SC_B = [[842, 202, 5, 15, 1], [887, 205, -65, 18, 0], [876, 202, -32, 28, 0], [898, 208, -1, 25, 0], [898, 202, -67, 18, 0], [870, 202, 0, 20, 1],
  [887, 202, -100, 20, 1], [887, 202, -100, 20, 1], [887, 202, -65, 18, 0], [890, 205, 0, 20, 1], [887, 205, -62, 18, 0], [875, 197, -29, 28, 0],
  [898, 208, -1, 25, 0], [887, 202, -65, 18, 0], [890, 205, 0, 20, 1], [881, 208, -97, 20, 0], [881, 206, -64, 18, 0], [881, 208, -5, 20, 1],
  [887, 206, -63, 18, 0], [887, 208, -36, 28, 0], [881, 202, 0, 25, 0], [887, 202, -65, 18, 0], [892, 214, -7, 30, 0], [892, 202, -105, 18, 1],
  [887, 205, -65, 18, 0], [881, 205, 0, 20, 1], [892, 200, -63, 18, 0], [898, 208, -30, 28, 0], [898, 208, 0, 25, 0], [898, 208, -65, 18, 0]];
// the four-point glints on these frames (measured): [k, x, y, R]
const SC_GLINTS = [[26, 971, 84, 22], [26, 819, 360, 18], [28, 296, 259, 18], [28, 909, 371, 18], [30, 229, 333, 16], [31, 229, 333, 16], [32, 358, 237, 22],
  [35, 977, 84, 22], [35, 825, 366, 18], [37, 319, 267, 18], [37, 909, 371, 18], [40, 971, 84, 20], [42, 561, 236, 16], [42, 909, 371, 16], [43, 966, 84, 22],
  [43, 819, 360, 18], [45, 915, 371, 18], [47, 561, 445, 16], [50, 251, 317, 16], [51, 336, 255, 20], [51, 971, 84, 22], [51, 819, 366, 18], [53, 336, 255, 22],
  [53, 915, 371, 16]];
// J owl: settle after the spin (ORB, relative to f75): [dx, dy, rot°] for k = 67..91
const J_TRACK = [[4.2, -2.2, 2.17], [0.4, 0.7, -0.59], [0.3, 0.7, -0.6], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0],
  [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], [1.8, 1.5, 0], [3.6, 2.9, 0], [4.6, 3.6, 0], [5.8, 4.7, 0], [8.2, 6.5, 0], [10.3, 8.4, 0],
  [11.4, 9.2, 0], [12.5, 10.1, 0], [12.4, 10.1, 0]];

// ---------------------------------------------------------------- caches
let C = null;
const cv = (w = W, h = H) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
function caches() { if (!C) C = {}; return C; }

// A black, blurred copy of an owl layer (the dark halo the source keeps between the bird and the speed lines).
function haloOf(L, blur = 26) {
  const m = Math.ceil(blur * 2.5);
  const c = cv(Math.ceil(L.w) + 2 * m, Math.ceil(L.h) + 2 * m);
  const g = c.getContext("2d");
  g.filter = `brightness(0) blur(${blur}px)`;
  g.drawImage(L.canvas, m, m, L.w, L.h);
  g.filter = `brightness(0) blur(${Math.round(blur / 3)}px)`;
  g.drawImage(L.canvas, m, m, L.w, L.h);
  g.filter = "none";
  return { canvas: c, x: L.x - m, y: L.y - m, w: c.width, h: c.height };
}
function blitOwl(ctx, L, dx = 0, dy = 0, halo = null, rot = 0, pivot = null) {
  ctx.save();
  if (rot) { const p = pivot || [L.x + L.w / 2, L.y + L.h / 2]; ctx.translate(p[0] + dx, p[1] + dy); ctx.rotate(rot); ctx.translate(-p[0] - dx, -p[1] - dy); }
  if (halo) ctx.drawImage(halo.canvas, halo.x + dx, halo.y + dy, halo.w, halo.h);
  ctx.drawImage(L.canvas, L.x + dx, L.y + dy, L.w, L.h);
  ctx.restore();
}

// ---------------------------------------------------------------- the framed page (A, B, C, K)
function drawShards(g, alpha = 1) {
  g.save();
  g.lineCap = "round"; g.lineJoin = "round";
  g.strokeStyle = `rgba(10,10,10,${0.55 * alpha})`; g.lineWidth = 4.6;
  g.beginPath(); for (const s of SHARD_SEGS) { g.moveTo(s[0], s[1]); g.lineTo(s[2], s[3]); } g.stroke();
  g.strokeStyle = `rgba(246,246,242,${alpha})`; g.lineWidth = 2.4;
  g.beginPath(); for (const s of SHARD_SEGS) { g.moveTo(s[0], s[1]); g.lineTo(s[2], s[3]); } g.stroke();
  g.restore();
}
function drawConfetti(g, dx = 0, dy = 0) {
  g.save();
  for (const [x, y, w, h, a] of CONFETTI) {
    g.save(); g.translate(x + dx, y + dy); g.rotate(a * Math.PI / 180);
    g.fillStyle = "rgb(236,236,232)"; g.fillRect(-w / 2, -h / 2, w, h);
    g.strokeStyle = "rgba(20,20,20,0.9)"; g.lineWidth = 1.4; g.strokeRect(-w / 2, -h / 2, w, h);
    g.restore();
  }
  g.restore();
}
// the white slash arc left behind the blades (frame px, measured on f13)
const ARC = [[353, 690], [346, 612], [362, 532], [405, 468], [470, 418], [550, 375], [640, 338], [740, 306], [850, 279], [960, 257], [1090, 232], [1250, 214], [1450, 204], [1640, 208], [1840, 232]];
function drawArc(g) {
  const n = ARC.length;
  g.save();
  g.fillStyle = "rgb(244,244,240)";
  const Lft = [], Rt = [];
  for (let i = 0; i < n; i++) {
    const a = ARC[Math.max(0, i - 1)], b = ARC[Math.min(n - 1, i + 1)], p = ARC[i];
    const d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, nx = -(b[1] - a[1]) / d, ny = (b[0] - a[0]) / d;
    const u = i / (n - 1);
    const w = u < 0.25 ? 16 * Math.sin(Math.PI / 2 * u / 0.25) : 16 * Math.pow(1 - (u - 0.25) / 0.75, 1.3) + 1.2;
    Lft.push([p[0] + nx * w * 0.5, p[1] + ny * w * 0.5]); Rt.push([p[0] - nx * w * 0.5, p[1] - ny * w * 0.5]);
  }
  g.beginPath(); g.moveTo(Lft[0][0], Lft[0][1]);
  for (const p of Lft) g.lineTo(p[0], p[1]);
  for (let i = n - 1; i >= 0; i--) g.lineTo(Rt[i][0], Rt[i][1]);
  g.closePath(); g.fill();
  g.restore();
}
function pageOver(g, extra) {
  // banner in the header slot, then the shard outlines (frame px)
  g.save(); framedTransform(g); g.drawImage(hippieBannerCanvas(), HEADER.x, HEADER.y, HEADER.w, HEADER.h); g.restore();
  drawShards(g);
  if (extra) extra(g);
}
function bOwls() {
  const c = caches();
  if (!c.bOwl) c.bOwl = birdB();
  return c;
}
// a scaled/rotated copy of the big bird, placed so that its head (1072, 418) lands at (hx, hy)
function smallB(g, hx, hy, k, rot, alpha) {
  const L = bOwls().bOwl;
  g.save(); g.globalAlpha = alpha;
  g.translate(hx, hy); g.rotate(rot); g.scale(k, k); g.translate(-1072, -418);
  g.drawImage(L.canvas, L.x, L.y, L.w, L.h);
  g.restore();
}
function drawBOwls(g) {
  const c = bOwls();
  // smoky echo trailing to the right of the big bird
  g.save(); g.globalAlpha = 0.25; g.filter = "blur(7px) brightness(0.55)";
  g.drawImage(c.bOwl.canvas, c.bOwl.x + 230, c.bOwl.y - 15, c.bOwl.w, c.bOwl.h);
  g.filter = "none"; g.restore();
  // the two small birds: top-left in the banner (head (430, 290)), bottom-right (head (1875, 650))
  smallB(g, 430, 290, 0.64, 0.28, 0.85);
  smallB(g, 1878, 650, 0.42, -0.1, 0.7);
  drawArc(g);
  blitOwl(g, c.bOwl);
}
function pageB() {
  const c = caches();
  if (!c.pageB) {
    c.pageB = cv();
    const g = c.pageB.getContext("2d");
    drawFramedPage(g, sokoPageCanvas({ gaze: "down" }), { over: (q) => pageOver(q, drawBOwls) });
    drawConfetti(g);
  }
  return c.pageB;
}
// A bird smeared along its flight: n copies of the big page bird (head (1072, 418)) scaled by k, the head end at
// (hx, hy), trailing `len` px along `ang` (the direction it came from), blurred.
function smearBird(g, hx, hy, k, rot, len, ang, n, alpha, blur) {
  const L = bOwls().bOwl;
  g.save();
  for (let i = n - 1; i >= 0; i--) {
    const f = i / (n - 1);
    g.save();
    g.filter = `blur(${(blur * (0.5 + f)).toFixed(1)}px)`;
    g.globalAlpha = alpha * (1 - 0.6 * f) * (i === 0 ? 1 : 0.55);
    g.translate(hx + Math.cos(ang) * len * f, hy + Math.sin(ang) * len * f); g.rotate(rot); g.scale(k * (1 + 0.1 * f), k); g.translate(-1072, -418);
    g.drawImage(L.canvas, L.x, L.y, L.w, L.h);
    g.restore();
  }
  g.restore();
}
function pageA() {
  // f7 (97.08): the page (the designer still visible) with the shards and confetti, and three birds smeared across
  // it (measured on f7): top — head ≈ (650, 150), trailing right to x ≈ 1320; right — the big bird with scissors,
  // head ≈ (1420, 420), trailing right off frame; bottom right — head ≈ (1780, 720), trailing down to y ≈ 930
  const c = caches();
  if (!c.pageA) {
    c.pageA = cv();
    const g = c.pageA.getContext("2d");
    drawFramedPage(g, sokoPageCanvas({ gaze: "down" }), {
      over: (q) => pageOver(q, (h) => {
        smearBird(h, 1420, 440, 1.45, 0, 820, 0, 16, 1.0, 6);
        smearBird(h, 1790, 720, 0.9, 0.3, 230, 1.35, 10, 0.9, 5);
      }),
    });
    smearBird(g, 650, 150, 1.0, -0.1, 650, -0.13, 16, 0.95, 6);
    drawConfetti(g, 3, 6);
  }
  return c.pageA;
}

// ---------------------------------------------------------------- speed-line beats
function speedLayer(ctx, key, k) {
  // X/Y/Z: seeded layers, each drifting up-left ~150 px/s along the lines
  const seed = { X: 11, Y: 23, Z: 37 }[key] || 11;
  drawSpeedLines(ctx, { seed, drift: -k * 6.2, density: 1 });
}
function scissorsF(ctx, k) {
  const i = k - 24;
  const a = SC_A[i], b = SC_B[i];
  const put = (s, L, flip) => {
    const o = { x: s[0], y: s[1], ang: s[2] * Math.PI / 180, open: s[3] * Math.PI / 180, L, lw: 1.8, flip };
    if (s[4]) spinShears(ctx, o, { spread: 0.8, n: 5, squash: 0.6 }); else drawShears(ctx, o);
  };
  put(a, 192, false);
  put(b, 155, false);
  for (const [kk, x, y, R] of SC_GLINTS) if (kk === k) glint(ctx, x, y, R, 0);
}
function beatF(ctx, k) {
  const c = caches();
  if (!c.fOwl) { c.fOwl = birdF(); c.fHalo = haloOf(c.fOwl, 22); }
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
  const i = Math.max(0, Math.min(29, k - 24));
  speedLayer(ctx, F_LAYER[i], k);
  scissorsF(ctx, k);
  const tr = F_TRACK[i];
  blitOwl(ctx, c.fOwl, tr[0] - 1450, tr[1] - 575, c.fHalo);
  // for the first frames after the flash the source's finish pass still spills the screen light into the margins
  // (measured medians, top/left margin: k24 44/48, k25 50/33, k26 44/48, k27 28/30, k28 47/50; right margin ≈ 215
  // where the wing is; black from k29): the whole speed-line frame is treated as the lit screen
  if (k <= 28) addScreenGlow(ctx, 1.0);
}

function litMargins(ctx, v) {
  const S = FRAMED.screen;
  ctx.save();
  ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.rect(S.x0, S.y0, S.x1 - S.x0, H); ctx.clip("evenodd");
  ctx.filter = "blur(8px)"; ctx.fillStyle = gv(v);
  ctx.beginPath(); ctx.rect(-40, -40, W + 80, H + 80); ctx.rect(S.x0 - 6, S.y0 - 6, S.x1 - S.x0 + 12, H + 40); ctx.fill("evenodd");
  ctx.restore();
}
function beatH(ctx, k) {
  const c = caches();
  if (!c.hOwl) {
    c.hOwl = birdH();
    c.hHalo = haloOf(c.hOwl, 22);
  }
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
  if (k >= 58) drawSpeedLines(ctx, { seed: 50 + (k % 3), drift: -k * 6, density: 1 });
  // scissors in the lower fist: upright, blades up (pivot (560, 370), tips (575, 90) / (600, 120)); upper fist: pointing
  // down-left (pivot (872, 200), tips (660, 300) / (690, 350)) — measured at 99.08
  blitOwl(ctx, c.hOwl, 0, 0, c.hHalo);
  // glints at the upright blade tips (measured (635, 145) R 70 at 99.08; 98.96 has them a little lower)
  if (k === 54) { glint(ctx, 612, 170, 55, 0.05); glint(ctx, 590, 205, 32, 0); } else { glint(ctx, 635, 145, 70, 0.08); glint(ctx, 612, 150, 28, 0); }
}
function beatSpin(ctx, k) {
  const c = caches();
  if (!c.hOwl) beatH(ctx, 57);
  if (!c.jOwl) c.jOwl = birdJ();
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
  drawSpeedLines(ctx, { seed: 60 + (k % 3), drift: -k * 6, density: 1 });
  // four in-betweens: the bird whirls (rotation measured on f66 vs f75: +23° with the final pose) — here the H and J
  // drawings are turned and smeared round the head
  const u = (k - 62) / 5;
  const L = u < 0.5 ? c.hOwl : c.jOwl;
  const ang = u < 0.5 ? -Math.PI * 0.9 * (u / 0.5) : Math.PI * 0.6 * (1 - (u - 0.5) / 0.5);
  const piv = u < 0.5 ? [1183, 432] : [1070, 515];
  ctx.save();
  for (let j = 0; j < 4; j++) {
    ctx.globalAlpha = j === 3 ? 1 : 0.25;
    ctx.save(); ctx.translate(piv[0], piv[1]); ctx.rotate(ang - (3 - j) * 0.12); ctx.scale(0.85, 0.85); ctx.translate(-piv[0], -piv[1]);
    ctx.drawImage(L.canvas, L.x, L.y, L.w, L.h);
    ctx.restore();
  }
  ctx.restore();
}
function beatJ(ctx, k) {
  const c = caches();
  if (!c.jOwl) c.jOwl = birdJ();
  if (!c.jHalo) c.jHalo = haloOf(c.jOwl, 22);
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
  // speed lines: moving until 99.56, frozen 99.60–100.04, moving again from 100.08
  const kk = k < 70 ? k : k <= 81 ? 70 : k - 11;
  drawSpeedLines(ctx, { seed: 70 + (kk % 3), drift: -kk * 6, density: 1 });
  const tr = J_TRACK[Math.max(0, Math.min(J_TRACK.length - 1, k - 67))];
  blitOwl(ctx, c.jOwl, tr[0], tr[1], c.jHalo, tr[2] * Math.PI / 180, [1070, 515]);
  ctx.save(); ctx.translate(tr[0], tr[1]);
  glint(ctx, 1560, 630, 46, 0); glint(ctx, 1330, 735, 40, 0);
  ctx.restore();
  if (k >= 82) addScreenGlow(ctx, 1);
}

// ---------------------------------------------------------------- flashes and transitions
function white(ctx, v = 0.97) { ctx.fillStyle = gv(v); ctx.fillRect(0, 0, W, H); }
function beatC(ctx) {
  // the page whip-blurred down-right, white washing in from the top-left
  const c = caches();
  if (!c.pageC) {
    c.pageC = cv();
    const g = c.pageC.getContext("2d");
    g.fillStyle = "#000"; g.fillRect(0, 0, W, H);
    const src = pageB(), n = 14, ang = 0.66, len = 170;
    g.filter = "blur(4px)";
    for (let i = 0; i < n; i++) { const f = i / (n - 1) - 0.5; g.globalAlpha = 1 / (i + 1); g.drawImage(src, Math.cos(ang) * len * f, Math.sin(ang) * len * f); }
    g.filter = "none"; g.globalAlpha = 1;
    // measured on f19: top margin ≈ 212, left margin ≈ 213, screen top ≈ 133 — white flooding in from the top edge
    const gr = g.createLinearGradient(0, 0, 0, 420);
    gr.addColorStop(0, "rgba(236,238,236,0.97)"); gr.addColorStop(0.3, "rgba(236,238,236,0.6)"); gr.addColorStop(1, "rgba(236,238,236,0)");
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    const gl = g.createLinearGradient(0, 0, 220, 0);
    gl.addColorStop(0, "rgba(236,238,236,0.9)"); gl.addColorStop(0.6, "rgba(236,238,236,0.55)"); gl.addColorStop(1, "rgba(236,238,236,0)");
    g.fillStyle = gl; g.fillRect(0, 0, 220, 760);
  }
  ctx.drawImage(c.pageC, 0, 0);
}
function beatD1(ctx) {
  white(ctx, 0.95);
  const gr = ctx.createRadialGradient(2150, 960, 50, 2150, 960, 700);
  gr.addColorStop(0, "rgba(10,12,10,0.95)"); gr.addColorStop(0.5, "rgba(20,24,20,0.6)"); gr.addColorStop(1, "rgba(20,24,20,0)");
  ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
}
function beatD2(ctx) {
  // k 21–22: white, the screen rectangle still faintly there (measured: screen ≈ 244, margins ≈ 222–228 before grade)
  white(ctx, 0.89);
  ctx.fillStyle = gv(0.965); ctx.fillRect(FRAMED.screen.x0, FRAMED.screen.y0, FRAMED.screen.x1 - FRAMED.screen.x0, H);
  ctx.save(); ctx.filter = "blur(10px)"; ctx.fillStyle = gv(0.965); ctx.fillRect(FRAMED.screen.x0 + 6, FRAMED.screen.y0 + 6, FRAMED.screen.x1 - FRAMED.screen.x0 - 12, H); ctx.restore();
}
function beatE(ctx) {
  beatF(ctx, 24);
  ctx.fillStyle = "rgba(236,238,236,0.55)"; ctx.fillRect(0, 0, W, H);
}
function beatK(ctx) {
  // f91 (100.44): a white band wipes up-left: its upper edge runs from (0, 400) to (1254, 0) (measured), ~48 px
  // thick; above it the next shot shows through (the framed page, washed pale); below it the dive continues.
  beatJ(ctx, 91);
  const top = (x) => 400 - 0.319 * x;
  ctx.save();
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(1254, 0); ctx.lineTo(0, 400); ctx.closePath(); ctx.clip();
  ctx.drawImage(pageB(), 0, 0);
  ctx.fillStyle = "rgba(200,200,198,0.45)"; ctx.fillRect(0, 0, W, H);
  ctx.restore();
  ctx.save(); ctx.fillStyle = "rgb(222,224,222)";
  ctx.beginPath(); ctx.moveTo(0, top(0)); ctx.lineTo(1254 + 150, top(1254 + 150)); ctx.lineTo(1254 + 150, top(1254 + 150) + 48); ctx.lineTo(0, top(0) + 48); ctx.closePath(); ctx.fill();
  ctx.restore();
}

export const shot = {
  draw(ctx, local, t) {
    const k = frameIndex(t);
    ctx.save();
    if (k <= 7) ctx.drawImage(pageA(), 0, 0);
    else if (k <= 18) ctx.drawImage(pageB(), 0, 0);
    else if (k === 19) beatC(ctx);
    else if (k === 20) beatD1(ctx);
    else if (k <= 22) beatD2(ctx);
    else if (k === 23) beatE(ctx);
    else if (k <= 53) beatF(ctx, k);
    else if (k === 54 || k === 57) beatH(ctx, k);
    else if (k <= 56) white(ctx, 0.97);
    else if (k <= 62) beatH(ctx, k);
    else if (k <= 66) beatSpin(ctx, k);
    else if (k <= 90) beatJ(ctx, k);
    else beatK(ctx);
    ctx.restore();
  },
  release() { C = null; releaseOwls(); releaseKit(); releaseLines(); },
};
