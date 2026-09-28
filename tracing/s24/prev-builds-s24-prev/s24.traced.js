// s24 (97.08–100.48): the flurry. Every beat is pinned to the source's own frames: film frame index
// k = round((t − 96.8) / 0.04). Measured beats:
//   k 7   (97.08)          the framed page (colour banner, shard outlines, paper confetti) with three motion-smeared owls
//   k 8–18 (97.12–97.52)   held: a big owl slashes left across the page with scissors, a white arc trails from the
//                          blades, two small owls (top-left in the banner, bottom-right), smoke; the owls slide a few px
//                          and the confetti drifts outward (eased), the extra smoke of k8–9 fades
//   k 19  (97.56)          the k18 frame whip-blurred (45.5°, 100 px) with white washing in from the top-left
//   k 20  (97.60)          white, a dark blurred corner at the bottom right
//   k 21–22 (97.64–97.68)  white (screen 245.8, margins 255 pre-grade)
//   k 23  (97.72)          the speed-line frame at half strength over a white wash
//   k 24–53 (97.76–98.92)  speed lines (≈ 32.2°, a new set every frame), the angry owl (bandage, headphones, blades
//                          behind the head, wings up) translating up-left in 9.4 / 18.7 px steps, two pairs of
//                          scissors spinning at the left (one drawing per frame, some repeated)
//   k 54  (98.96)          cut: the owl holding up two pairs of scissors, on black, glint on the upright blade
//   k 55–56 (99.00–99.04)  white flash
//   k 57–62 (99.08–99.28)  the same drawing held; speed lines from k58; glints k57–59
//   k 63–67 (99.32–99.48)  the whirl: five in-between drawings
//   k 68–90 (99.52–100.40) the dive drawing: settles (k68–69), held with the lines frozen (k70–81), drifts (+12.5, +10)
//                          px with the margin glow back (k82–90)
//   k 91  (100.44)         a white band (122 px, −23°) wipes across; above it the next shot
// Everything drawn is vector data measured from the source (see s24/trace/README.md): drawings as stacked grey
// tone levels, speed lines as bars with widths and grey ramps, per-frame shifts; nothing of the source's pixels.
import { drawFramedPage, sokoPageCanvas, framedTransform, HEADER, FRAMED, addScreenGlow } from "../lib/sites.js";
import { hippieBannerCanvas } from "../lib/hippie.js";
import { gv } from "../lib/owlInk.js";
import { blurCanvas } from "../lib/sokoIll.js";
import { SHARD_SEGS, CONFETTI } from "./s24/shards.js";
import { toneLayer, drawLines, releaseVec } from "./s24/vec.js";
import { OWL_F, F_SHIFT, LINES_F, SC_F } from "./s24/dataF.js";
import { OWL_H, OWL_J, OWL_W, LINES, GLINT_H, OBJ, WIPE91 } from "./s24/dataHJ.js";
import { PAGE_A, PAGE_B1, PAGE_B2, PAGE_B3, HOLD, SMOKE, SMOKE_A } from "./s24/dataPage.js";

const W = 2206, H = 946;
// every beat is keyed to the source's 25 fps frame index
const frameIndex = (t) => Math.round((t - 96.8) / 0.04);

// ---------------------------------------------------------------- caches
let C = null;
// cached layers are CPU canvases (willReadFrequently): blitting a GPU-backed canvas into the frame measured ~400 ms
// per full-frame copy in headless Chrome, a CPU one ~1 ms
const cv = (w = W, h = H) => { const c = document.createElement("canvas"); c.width = w; c.height = h; c.getContext("2d", { willReadFrequently: true }); return c; };
function caches() { if (!C) C = {}; return C; }

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
// confetti at hold frame index fi (0 = k7, 1..11 = k8..18): piece i sits at its median position + D[i]·f[fi]
function drawConfetti(g, fi) {
  const f = HOLD.f[fi];
  g.save();
  CONFETTI.forEach(([x, y, w, h, a], i) => {
    const D = HOLD.D[i] || [0, 0];
    g.save(); g.translate(x + D[0] * f, y + D[1] * f); g.rotate(a * Math.PI / 180);
    g.fillStyle = "rgb(236,236,232)"; g.fillRect(-w / 2, -h / 2, w, h);
    g.strokeStyle = "rgba(20,20,20,0.9)"; g.lineWidth = 1.4; g.strokeRect(-w / 2, -h / 2, w, h);
    g.restore();
  });
  g.restore();
}
// the white slash arc left behind the blades: centre line [x, y, FWHM width] measured on the k8–18 median frame
// (ridge of its difference from the clean page, 95.92 s; neighbour outlier rejection + smoothing spline; value 246)
const ARC = [[380.6, 687.5, 6.0], [349.2, 644.2, 10.1], [348.6, 592.1, 14.8], [369.6, 543.3, 17.0], [400.8, 502.1, 17.0], [439.4, 467.0, 16.2], [483.0, 436.8, 15.7], [528.9, 409.9, 15.3], [575.9, 385.6, 14.8], [623.7, 363.6, 14.3], [672.2, 343.7, 13.9], [721.5, 325.6, 13.5], [771.3, 309.1, 13.2], [821.5, 293.8, 12.9], [872.2, 279.7, 12.6], [923.3, 266.8, 12.3], [974.7, 255.1, 11.8], [1026.4, 244.4, 11.2], [1078.3, 235.0, 10.8], [1130.5, 226.6, 10.4], [1182.8, 219.4, 10.0], [1235.3, 213.2, 9.6], [1287.9, 208.2, 9.1], [1340.5, 204.3, 8.6], [1393.2, 201.5, 8.1], [1445.8, 199.8, 7.5], [1498.4, 199.2, 7.5], [1551.0, 199.8, 6.7], [1603.6, 201.8, 5.8], [1656.2, 205.5, 4.9], [1709.1, 210.6, 3.9], [1762.8, 214.2, 3.3], [1786, 223, 3.1], [1833, 233, 2.5]];
function drawArc(g) {
  const n = ARC.length, Lft = [], Rt = [];
  for (let i = 0; i < n; i++) {
    const a = ARC[Math.max(0, i - 1)], b = ARC[Math.min(n - 1, i + 1)], p = ARC[i];
    const d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, nx = -(b[1] - a[1]) / d, ny = (b[0] - a[0]) / d, w = p[2] / 2;
    Lft.push([p[0] + nx * w, p[1] + ny * w]); Rt.push([p[0] - nx * w, p[1] - ny * w]);
  }
  g.save();
  g.fillStyle = gv(246 / 255);
  g.beginPath(); g.moveTo(Lft[0][0], Lft[0][1]);
  for (const p of Lft) g.lineTo(p[0], p[1]);
  for (let i = n - 1; i >= 0; i--) g.lineTo(Rt[i][0], Rt[i][1]);
  g.closePath(); g.fill();
  g.restore();
}
function pageOver(g, extra) {
  // banner in the header slot, then the shard outlines and the slash arc (frame px)
  g.save(); framedTransform(g); g.drawImage(hippieBannerCanvas(), HEADER.x, HEADER.y, HEADER.w, HEADER.h); g.restore();
  drawShards(g);
  if (extra) extra(g);
}
// The page frames: the framed sōko page (colour banner in the header), the traced shard outlines and slash arc, then
// the traced owls/smoke of that frame over it (inside the screen before the margin glow is taken, and again outside
// the screen, where the smears run over the margins), then the confetti.
function framedWith(extra, glow = 1) {
  const c = cv(), g = c.getContext("2d");
  drawFramedPage(g, sokoPageCanvas({ gaze: "down" }), { glow, over: (q) => pageOver(q, extra) });
  return c;
}
function pageA() {
  const c = caches();
  if (!c.pageA) {
    const T = toneLayer(PAGE_A, null, { soft: 0.8 });
    const P = c.pageA = framedWith((h) => h.drawImage(T.canvas, T.x, T.y)), g = P.getContext("2d");
    // the source's room is lit a little more than the finish-pass glow gives (measured pre-grade, k7/k12: margins
    // +7…+19, corners +11): a flat additive lift of the margins
    marginAdd(g, 12);
    const S = FRAMED.screen;
    g.save(); g.beginPath(); g.rect(0, 0, W, H); g.rect(S.x0, S.y0, S.x1 - S.x0, H - S.y0); g.clip("evenodd");
    g.drawImage(T.canvas, T.x, T.y); g.restore();
    drawConfetti(g, 0);
  }
  return c.pageA;
}
// k8–18: one base (page, banner, shards, arc; the margins lit by the full frame's glow), then the three traced owl
// layers at that frame's measured shift and the confetti at that frame's drift
function pageBBase() {
  const c = caches();
  if (!c.pageBBase) {
    c.bl = [PAGE_B1, PAGE_B2, PAGE_B3].map((d) => toneLayer(d, null, { soft: 0.8 }));
    const full = framedWith((h) => { drawArc(h); for (const L of c.bl) h.drawImage(L.canvas, L.x, L.y); });
    const bare = framedWith((h) => drawArc(h), 0);
    const g = full.getContext("2d"), S = FRAMED.screen;
    g.save(); g.beginPath(); g.rect(S.x0, S.y0, S.x1 - S.x0, H - S.y0); g.clip(); g.drawImage(bare, 0, 0); g.restore();
    marginAdd(g, 12);
    c.pageBBase = full;
  }
  return c.pageBBase;
}
function drawPageB(ctx, k) {
  const c = caches(), base = pageBBase(), i = Math.max(0, Math.min(10, k - 8));
  ctx.drawImage(base, 0, 0);
  const S = FRAMED.screen;
  ctx.save(); ctx.beginPath(); ctx.rect(S.x0, S.y0, S.x1 - S.x0, H - S.y0); ctx.clip();
  ["B1", "B2", "B3"].forEach((gname, j) => { const L = c.bl[j], d = HOLD.owl[gname][i]; ctx.drawImage(L.canvas, L.x + d[0], L.y + d[1]); });
  // the extra smoke of the first hold frames (additive, fading: measured strengths)
  const a = SMOKE_A[i];
  if (a > 0.01) {
    if (!c.smoke) c.smoke = toneLayer(SMOKE, null, { soft: 5, margin: 20 });
    ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = Math.min(1, a);
    ctx.drawImage(c.smoke.canvas, c.smoke.x, c.smoke.y);
    ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
  }
  ctx.restore();
  drawConfetti(ctx, i + 1);
}
function pageB() {
  // the k18 frame as a canvas (the whip-blur frame k19 is built from it)
  const c = caches();
  if (!c.pageB) { c.pageB = cv(); drawPageB(c.pageB.getContext("2d"), 18); }
  return c.pageB;
}

// ---------------------------------------------------------------- speed-line beats
// the F frames: traced speed lines, the frame's traced scissors, the traced owl translated by its measured track
function scLayer(k, gname) {
  const c = caches();
  c.sc = c.sc || {};
  const key = k + gname;
  if (!c.sc[key]) {
    c.sc[key] = toneLayer(SC_F[k][gname], null, { soft: 0.6 });
  }
  return c.sc[key];
}
function drawScissorsF(ctx, k) {
  const e = SC_F[k];
  if (!e) return;
  for (const gname of ["A", "B"]) {
    let r = e[gname];
    if (!r) continue;
    let kk = k, dx = 0, dy = 0;
    if (Array.isArray(r)) { kk = r[0]; dx = r[1]; dy = r[2]; }
    const L = scLayer(kk, gname);
    ctx.drawImage(L.canvas, L.x + dx, L.y + dy);
  }
}
function owlF() {
  const c = caches();
  if (!c.fTone) c.fTone = toneLayer(OWL_F, [600, -80, 1980, 946], { soft: 0.45 });
  return c.fTone;
}
function beatF(ctx, k) {
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
  const kk = Math.max(24, Math.min(53, k));
  drawLines(ctx, LINES_F[kk]);
  drawScissorsF(ctx, kk);
  const L = owlF(), s = F_SHIFT[kk];
  ctx.drawImage(L.canvas, L.x + s[0], L.y + s[1]);
  // for the first frames after the flash the source's finish pass still spills the screen light into the margins
  // (measured medians, top/left margin: k24 44/48, k25 50/33, k26 44/48, k27 28/30, k28 47/50; right margin ≈ 215
  // where the wing is; black from k29): the whole speed-line frame is treated as the lit screen
  if (k <= 28) { addScreenGlow(ctx, 1.0); marginAdd(ctx, 12); }
}

// cached tone layer per data object
const SOFT = new Map([[OWL_H, 0.45], [OWL_J, 0.45]]);   // the 18-level drawings keep a finer edge
function layerOf(data, soft = SOFT.get(data) ?? 0.6) {
  const c = caches();
  c.tone = c.tone || new Map();
  let L = c.tone.get(data);
  if (!L) { L = toneLayer(data, null, { soft }); c.tone.set(data, L); }
  return L;
}
function blit(ctx, data, dx = 0, dy = 0) { const L = layerOf(data); ctx.drawImage(L.canvas, L.x + dx, L.y + dy); }
// H (k54, 57–62): the held drawing, its frame's glint, speed lines from k58
function beatH(ctx, k) {
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
  if (LINES[k]) drawLines(ctx, LINES[k]);
  // k54 is the same drawing 0.33 px left and 0.45 px up of its k57 place (template match)
  if (k === 54) blit(ctx, OWL_H, -0.33, -0.45); else blit(ctx, OWL_H);
  if (GLINT_H[k]) blit(ctx, GLINT_H[k]);
}
// the whirl (k63–66) and the first settle frame (k67): one traced drawing each
function beatSpin(ctx, k) {
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
  drawLines(ctx, LINES[k]);
  blit(ctx, OWL_W[k]);
  if (OBJ[k]) blit(ctx, OBJ[k]);
}
// J (k68–91): the held dive drawing. k68–69 settle (ECC: rotation about the frame origin + shift), k70–81 one
// frozen frame, k83–91 drifting (+12.5, +10.0) px; speed lines per frame
const J_ECC = { 68: [-0.661, -4.758, 12.382], 69: [-0.685, -5.025, 12.709] };
const J_SHIFT = { 82: [0.25, 0.11], 83: [1.78, 1.38], 84: [3.76, 2.91], 85: [4.72, 3.74], 86: [5.85, 4.67], 87: [7.94, 6.41], 88: [10.15, 8.23],
  89: [11.29, 9.13], 90: [12.46, 9.97], 91: [12.47, 9.96] };
function beatJ(ctx, k) {
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
  const lk = k >= 70 && k <= 81 ? 75 : k;
  drawLines(ctx, LINES[lk]);
  if (OBJ[lk]) blit(ctx, OBJ[lk]);
  const L = layerOf(OWL_J);
  ctx.save();
  if (J_ECC[k]) { const [a, tx, ty] = J_ECC[k], r = a * Math.PI / 180; ctx.setTransform(Math.cos(r), Math.sin(r), -Math.sin(r), Math.cos(r), tx, ty); }
  else if (J_SHIFT[k]) ctx.translate(J_SHIFT[k][0], J_SHIFT[k][1]);
  ctx.drawImage(L.canvas, L.x, L.y);
  ctx.restore();
  if (k >= 82) addScreenGlow(ctx, 1.3);
}

// ---------------------------------------------------------------- flashes and transitions
// A logistic ramp along the unit direction (cos φ, sin φ): alpha(d) = 1 / (1 + exp((d − d0) / w)), d = x cos φ + y sin φ,
// painted as a linear gradient in colour v (0..255).
function ramp(ctx, phiDeg, d0, w, v, invert = false) {
  const p = phiDeg * Math.PI / 180, c = Math.cos(p), sn = Math.sin(p);
  const g = ctx.createLinearGradient(c * (d0 - 6 * w), sn * (d0 - 6 * w), c * (d0 + 6 * w), sn * (d0 + 6 * w));
  for (let i = 0; i <= 24; i++) {
    const u = i / 24, d = (u - 0.5) * 12, a0 = 1 / (1 + Math.exp(d)), a = invert ? 1 - a0 : a0;
    g.addColorStop(u, `rgba(${v},${v},${v},${a.toFixed(4)})`);
  }
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
function beatC(ctx) {
  // k19 (97.56): the page frame whip-blurred — measured as the k18 frame averaged along 45.5° over 100 px (fit
  // error 4.4/255 on the right half) — and a white wipe arriving from the top-left: a logistic edge across
  // d = x cos φ + y sin φ (pre-grade white)
  const c = caches();
  if (!c.pageC) {
    c.pageC = cv();
    const g = c.pageC.getContext("2d");
    g.fillStyle = "#000"; g.fillRect(0, 0, W, H);
    const src = pageB(), n = 24, ang = 45.5 * Math.PI / 180, len = 100;
    for (let i = 0; i < n; i++) {
      const f = i / (n - 1) - 0.5;
      g.globalAlpha = 1 / (i + 1);
      g.drawImage(src, Math.cos(ang) * len * f, Math.sin(ang) * len * f);
    }
    g.globalAlpha = 1;
    // fitted separately: inside the screen φ 66.6°, d0 574, w 55 to 247; the margins φ 65.9°, d0 652, w 33 to 255
    const S = FRAMED.screen;
    g.save(); g.beginPath(); g.rect(S.x0, S.y0, S.x1 - S.x0, H - S.y0); g.clip(); ramp(g, 66.6, 574.1, 54.9, 247); g.restore();
    g.save(); g.beginPath(); g.rect(0, 0, W, H); g.rect(S.x0, S.y0, S.x1 - S.x0, H - S.y0); g.clip("evenodd"); ramp(g, 65.9, 652.2, 33.2, 255); g.restore();
  }
  ctx.drawImage(c.pageC, 0, 0);
}
function beatD1(ctx) {
  // k20 (97.60): white — the screen 245.5, the margins 255 (pre-grade) — with a dark blurred corner at the bottom
  // right: a logistic edge across d = x cos φ + y sin φ
  flashWhite(ctx, 245.5, 255);
  // fit over the whole frame: φ 72.2°, d0 1214, w 48, dark value 40 (a screen-only fit measured worse)
  ramp(ctx, 72.18, 1213.8, 48.1, 40, true);
}
// white flash with the screen rectangle faintly there: screen value, margin value (pre-grade 0..255)
function flashWhite(ctx, vs, vm) {
  const S = FRAMED.screen;
  ctx.fillStyle = gv(vm / 255); ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.filter = "blur(4px)"; ctx.fillStyle = gv(vs / 255); ctx.fillRect(S.x0 + 2, S.y0 + 4, S.x1 - S.x0 - 4, H); ctx.restore();
}
function beatD2(ctx) {
  // k21–22 (97.64–97.68): white; measured pre-grade: screen 245.8, margins 255 (clipped)
  flashWhite(ctx, 245.8, 255);
}
// a soft frame round the screen rectangle (1 outside the screen, 0 inside, gaussian edge σ px), cached at ¼ size
function marginMask(sigma = 7) {
  const c = caches(), key = "mm" + sigma;
  if (!c[key]) {
    const S = FRAMED.screen, q = 4, m = cv(Math.ceil(W / q), Math.ceil(H / q)), g = m.getContext("2d");
    g.fillStyle = "#fff"; g.fillRect(0, 0, m.width, m.height);
    g.globalCompositeOperation = "destination-out"; g.fillRect(S.x0 / q, S.y0 / q, (S.x1 - S.x0) / q, H);
    blurCanvas(m, sigma / q);
    c[key] = m;
  }
  return c[key];
}
function marginWash(ctx, v, alpha, sigma = 7) {
  const c = caches(), key = "mw" + v + ":" + sigma;
  if (!c[key]) {
    const m = marginMask(sigma), t = cv(m.width, m.height), g = t.getContext("2d");
    g.drawImage(m, 0, 0); g.globalCompositeOperation = "source-in"; g.fillStyle = gv(v / 255); g.fillRect(0, 0, t.width, t.height);
    c[key] = t;
  }
  ctx.save(); ctx.globalAlpha = alpha; ctx.imageSmoothingEnabled = true; ctx.drawImage(c[key], 0, 0, W, H); ctx.restore();
}
function marginAdd(ctx, v, sigma = 7) {
  ctx.save(); ctx.globalCompositeOperation = "lighter"; marginWash(ctx, v, 1, sigma); ctx.restore();
}
function beatE(ctx) {
  // k23 (97.72): the flash dissolving into the speed lines — this frame's own lines and scissors, the owl at its
  // k24 place, all at half strength over a flat wash (measured inside the screen: 0.498·content + 123.6)
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
  drawLines(ctx, LINES_F[23]);
  drawScissorsF(ctx, 23);
  const L = owlF(), s = F_SHIFT[24];
  ctx.drawImage(L.canvas, L.x + s[0], L.y + s[1]);
  ctx.fillStyle = "rgba(248,248,248,0.502)"; ctx.fillRect(0, 0, W, H);
  // the margins: the same half-strength content (the lines run on through them) lifted to ≈ 220 (measured)
  marginAdd(ctx, 92);
}
// The next shot's first frame (s25 at 100.48), shown above the k91 wipe band. s25 is imported read-only; if it is
// missing or fails, our own page frame stands in.
let S25 = null;
try { S25 = (await import("./s25.js")).shot || null; } catch (e) { S25 = null; }
function nextFrame() {
  const c = caches();
  if (!c.next) {
    c.next = cv();
    const g = c.next.getContext("2d");
    g.fillStyle = "#000"; g.fillRect(0, 0, W, H);
    let ok = false;
    if (S25) { try { g.save(); S25.draw(g, 0, 100.48); g.restore(); ok = true; } catch (e) { ok = false; } }
    if (!ok) { g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(pageB(), 0, 0); }
  }
  return c.next;
}
function beatK(ctx) {
  // k91 (100.44): a white band wipes across: half-max edges y = 406.5 − 0.4272 x and y = 539.1 − 0.4272 x (122 px
  // across, at −23.1°; pre-grade value ≈ 248); above it the next shot's first frame, washed (measured
  // 0.907·v + 23); below it the dive continues (k90's drawing, measured diff 3.3/255)
  beatJ(ctx, 91);
  const c = caches();
  if (!c.wipe) {
    // everything above and in the band is static: one cached overlay (transparent below the band)
    const up = (x) => 406.5 - 0.4272 * x, lo = (x) => 539.1 - 0.4272 * x;
    c.wipe = cv();
    const g = c.wipe.getContext("2d");
    g.save();
    g.beginPath(); g.moveTo(-10, -10); g.lineTo(W + 10, -10); g.lineTo(W + 10, up(W + 10)); g.lineTo(-10, up(-10)); g.closePath(); g.clip();
    g.drawImage(nextFrame(), 0, 0);
    g.fillStyle = "rgba(255,255,255,0.093)"; g.fillRect(0, 0, W, H);
    // over it, the source's own drawing of that region (grey tone trace of k91 above the band, all but the colour
    // banner corner, which stays the next shot's)
    blit(g, WIPE91);
    g.restore();
    g.save(); g.fillStyle = gv(248 / 255); g.filter = "blur(1.5px)";
    g.beginPath(); g.moveTo(-10, up(-10)); g.lineTo(W + 10, up(W + 10)); g.lineTo(W + 10, lo(W + 10)); g.lineTo(-10, lo(-10)); g.closePath(); g.fill();
    g.restore();
  }
  ctx.drawImage(c.wipe, 0, 0);
}

export const shot = {
  draw(ctx, local, t) {
    const k = frameIndex(t);
    ctx.save();
    if (k <= 7) ctx.drawImage(pageA(), 0, 0);
    else if (k <= 18) drawPageB(ctx, k);
    else if (k === 19) beatC(ctx);
    else if (k === 20) beatD1(ctx);
    else if (k <= 22) beatD2(ctx);
    else if (k === 23) beatE(ctx);
    else if (k <= 53) beatF(ctx, k);
    else if (k === 54 || k === 57) beatH(ctx, k);
    else if (k <= 56) flashWhite(ctx, 241.8, 232);
    else if (k <= 62) beatH(ctx, k);
    else if (k <= 67) beatSpin(ctx, k);
    else if (k <= 90) beatJ(ctx, k);
    else beatK(ctx);
    ctx.restore();
  },
  release() { C = null; releaseVec(); },
};
