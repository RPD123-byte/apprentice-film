// s24 (97.08–100.48): the flurry. Drawn by code: owl drawings, scissors, speed lines, flashes and the page beats are
// procedural, placed and timed from measurements of the source (silhouette outlines, landmarks, tracks, angles,
// timings) — no source pixels and no traced tone levels. The previous pass (vector traces of the source frames) is
// archived in snapshots/s24-prev/. Ending fix (2026-09-27): the big owls (F, H, J) carry a procedural engraving pass
// (s24/d/engr.js), J's face/hand/foot and F's face are refit, and the glow pass is a local order-independent copy.
// Every beat is keyed to the source's 25 fps frames, k = source frame − 2420 (k7 = 97.08 s):
//   k 7            the framed page (colour banner, shard cut lines, paper confetti) with three motion-smeared owls
//   k 8–18         held slash: the big owl slashes left with scissors, a white arc trails from the blades, two small
//                  owls (top-left in the banner, bottom-right), smoke; small slides, the confetti drifts outward
//   k 19           the page whip-blurred along 45.5°, white washing in from the top-left
//   k 20–22        white (a dark blurred corner at the bottom right on k20)
//   k 23           the speed-line frame at half strength over the white
//   k 24–53        speed lines (32.1°, three drawings boiling A B A C …), the angry owl translating up-left
//                  (measured track), two pairs of scissors spinning at the left (measured per frame)
//   k 54           cut: the owl holding up two pairs of scissors, on black
//   k 55–56        white flash
//   k 57–62        the same drawing held; speed lines from k58
//   k 63–66        the whirl: four spin drawings (measured silhouettes); k67 the dive drawing arriving
//   k 68–90        the dive: settles (k68–69), held with the lines frozen (k70–81), drifts with the glow back (k82–90)
//   k 91           a white band (122 px, −23°) wipes across; above it the next shot
import { drawMeasuredSet, drawMeasuredSetSoft, LINE_OPTS } from "./s24/d/lines.js";
import { LINE_SETS } from "./s24/d/lineData.js";
import { DROP, FILL } from "./s24/d/lineFill.js";
import { drawScissors } from "./s24/d/scissors.js";
import { SC_A, scB } from "./s24/d/scdata.js";
import { owlFLayer, releaseOwlF, F_TRACK } from "./s24/d/owlF.js";
import { owlJLayer, releaseOwlJ, J_ECC, J_SHIFT } from "./s24/d/owlJ.js";
import { owlHLayer, releaseOwlH } from "./s24/d/owlH.js";
import { whirlLayer, releaseWhirl } from "./s24/d/whirl.js";
import { drawPageHold, drawPageSmear, drawPageWhip, ramp, releasePage } from "./s24/d/page.js";
import { gv } from "../lib/owlInk.js";
import { blurCanvas } from "../lib/sokoIll.js";
import { FRAMED } from "../lib/sites.js";
// ending fix: the lib's glow pass, copied with its intermediate canvases cleared (order-independent; see s24/d/glow.js)
import { addScreenGlowS24 as addScreenGlow } from "./s24/d/glow.js";

const W = 2206, H = 946;
// k = source frame − 2420. ceil(t·25 − 0.001) is exact at the render's k/25 times and also pairs tools/compare.sh
// (which renders on a 1/30 s grid, up to 0.033 s early) with the right source frame (as s25 does).
export const frameIndex = (t) => Math.ceil(t * 25 - 0.001) - 2420;

let C = null;
const cv = (w = W, h = H) => { const c = document.createElement("canvas"); c.width = w; c.height = h; c.getContext("2d", { willReadFrequently: true }); return c; };
function caches() { if (!C) C = {}; return C; }

// ---------------------------------------------------------------- speed lines
// The source's speed lines boil through three drawings (measured by correlating every frame's lines): A on every
// other frame, B and C alternating between (k31 repeats k30, so the phase slips there); the dive holds its own set D
// (k69–82), then the lines change every frame (k83–89 each measured, k90–91 = E; k67 and k68 their own). The sets are
// measured bars (s24/d/lineData.js).
const FILL_GAIN = 0.4;   // the filler bars a little dimmer than the measured ones (they cannot line up with the source's)
const WIDE_CAP = 0.8;    // fix pass 2: value cap for bars wider than 14 px in the dive sets (see linesCanvas)
function lineMix(k) {
  if (k === 23 || k === 31) return [["A", 1]];
  if (k <= 53) { const p = (k - 24 - (k > 31 ? 1 : 0)) % 4; return [[p === 0 || p === 2 ? "A" : p === 1 ? "B" : "C", 1]]; }
  if (k === 66 || k === 67 || k === 68 || (k >= 83 && k <= 89)) return [["K" + k, 1]];   // K66: fix pass 2
  // from k58 the owl no longer covers the region it hid while the sets were measured: use the repaired sets (A*, B*, C*)
  if (k >= 58 && k <= 66) { const p = (k - 58) % 4; return [[(p === 0 || p === 2 ? "A" : p === 1 ? "B" : "C") + "*", 1]]; }
  if (k >= 90) return [["E", 1]];
  return [["D", 1]];
}
function linesCanvas(name) {
  const c = caches();
  c.lines = c.lines || {};
  if (!c.lines[name]) {
    // sets A, B, C carry repairs (lineFill.js): the stub clusters where the owl was masked out dropped, seeded
    // filler bars where the lines thinned out
    const base = name.replace("*", ""), S = LINE_SETS[base], drop = new Set(DROP[base] || []);
    const set0 = name.endsWith("*") && FILL[base] ? { ang: S.ang, bars: S.bars.filter((b, i) => !drop.has(i)).concat(FILL[base].map((b) => [b[0], b[1], b[2], b[3], b[4] * FILL_GAIN, b[5] * FILL_GAIN, b[6] * FILL_GAIN])) } : S;
    // fix pass 2: in the dive's per-frame sets (E, K83–K89) bars wider than 14 px read as fat capsules; their value is
    // capped at 0.8 (σ1-positive there, slightly negative on A/B/C, so only these)
    const set = /^(E|K8)/.test(base) ? { ang: set0.ang, bars: set0.bars.map((b) => b[3] > 14 ? [b[0], b[1], b[2], b[3], b[4] * WIDE_CAP, b[5] * WIDE_CAP, b[6] * WIDE_CAP] : b) } : set0;
    if (LINE_OPTS.soft === false) { const L = cv(), g = L.getContext("2d"); drawMeasuredSet(g, set, LINE_OPTS.measured); c.lines[name] = L; }
    else c.lines[name] = drawMeasuredSetSoft(set, { ...LINE_OPTS.measured, smear: LINE_OPTS.smear, streaks: LINE_OPTS.streaks, seed: base.charCodeAt(0) * 131 + base.length * 7 + (+base.slice(1) || 0) });
  }
  return c.lines[name];
}
function drawLines(ctx, k, alpha = 1) {
  ctx.save();
  ctx.filter = `blur(${LINE_OPTS.blur}px)`;
  for (const [name, w] of lineMix(k)) { ctx.globalAlpha = alpha * w; ctx.drawImage(linesCanvas(name), 0, 0); }
  ctx.restore();
}

// ---------------------------------------------------------------- flashes
const FLASH_FADE = 1.056;
function flashWhite(ctx, vs, vm) {
  // white with the screen rectangle faintly there: screen value, margin value (pre-grade 0..255, measured)
  const S = FRAMED.screen;
  ctx.fillStyle = gv(vm / 255); ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.filter = "blur(4px)"; ctx.fillStyle = gv(vs / 255); ctx.fillRect(S.x0 + 2, S.y0 + 4, S.x1 - S.x0 - 4, H); ctx.restore();
}
// k20 (fix pass 2): the dark corner is drawn inside the screen (going to black at the bottom, darkest along the
// screen's right edge, with faint 45° streaks), and the right margin has its own, lighter vertical ramp (row profiles
// measured on the source at y 450–930)
function flashCorner(ctx) {
  flashWhite(ctx, 219, 255);
  const S = FRAMED.screen;
  ctx.save(); ctx.beginPath(); ctx.rect(S.x0, S.y0, S.x1 - S.x0, H); ctx.clip();
  ramp(ctx, 72.18, 1213.8, 48.1, 40, true); ramp(ctx, 72.18, 1300, 40, 0, true);
  { const g = ctx.createLinearGradient(1925, 0, S.x1, 0); g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(0.65, "rgba(0,0,0,0.8)"); g.addColorStop(1, "rgba(0,0,0,0.9)");
    const m = document.createElement("canvas"); m.width = 110; m.height = H; const q = m.getContext("2d");
    q.translate(-1925, 0); q.fillStyle = g; q.fillRect(1925, 0, 110, H);
    q.globalCompositeOperation = "destination-in"; const v = q.createLinearGradient(0, 480, 0, 640); v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,1)"); q.fillStyle = v; q.fillRect(1925, 0, 110, H);
    ctx.drawImage(m, 1925, 0); }
  ctx.filter = "blur(2px)"; ctx.lineCap = "round";
  for (const [x, y, l] of [[1330, 745, 90], [1400, 770, 110], [1465, 790, 80], [1525, 805, 120], [1585, 822, 90], [1650, 835, 100], [1705, 765, 70], [1785, 782, 90], [1860, 740, 60]]) {
    ctx.strokeStyle = "rgba(170,170,170,0.35)"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + l * 0.71, y + l * 0.71); ctx.stroke();
  }
  ctx.restore();
  ctx.save(); ctx.beginPath(); ctx.rect(S.x1, 0, W - S.x1, H); ctx.clip();
  const g = ctx.createLinearGradient(0, 440, 0, 946);
  for (const [y, v] of [[440, 255], [500, 250], [560, 235], [650, 138], [750, 87], [850, 61], [946, 44]]) g.addColorStop((y - 440) / 506, `rgb(${v},${v},${v})`);
  ctx.fillStyle = g; ctx.fillRect(S.x1, 440, W - S.x1, H - 440);
  ctx.restore();
}
function marginAdd(ctx, v) {
  const S = FRAMED.screen;
  ctx.save(); ctx.globalCompositeOperation = "lighter";
  ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.rect(S.x0, S.y0, S.x1 - S.x0, H - S.y0); ctx.clip("evenodd");
  ctx.fillStyle = `rgb(${v},${v},${v})`; ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

// ---------------------------------------------------------------- beats
// the two spinning pairs (measured per frame; see s24/d/scdata.js)
function drawScissorsF(ctx, k) {
  const a = SC_A[Math.max(23, Math.min(53, k))], b = scB(k);
  if (b) drawScissors(ctx, { ...b, w: 25, ring: 10 });
  if (a) drawScissors(ctx, { ...a, w: 30, ring: 12 });
}
function paintF(ctx, k) {
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
  drawLines(ctx, k);
  drawScissorsF(ctx, k);
  const s = F_TRACK[Math.max(23, Math.min(53, k))];
  ctx.drawImage(owlFLayer(), s[0], s[1]);
}
function beatF(ctx, k) {
  paintF(ctx, k);
  // just after the flash the finish pass still spills the screen light into the margins (measured k24–28)
  if (k <= 28) { addScreenGlow(ctx, 1.0); marginAdd(ctx, 4); }
}
function beatE(ctx) {
  // k23: the flash dissolving into the speed lines: this frame's lines and scissors, the owl at its k24 place, at
  // half strength over a flat wash (measured inside the screen: 0.498·content + 123.6); the margins lift to ≈ 220
  paintF(ctx, 23);
  // fix pass 2: the frame is graded with FLASH_FADE (margins now match), so the wash is a little lower to keep the
  // screen where it was, and the margin lift ramps over ≈ 25 px across the screen edge (blurred mask), as on the source
  ctx.fillStyle = `rgba(${E_WASH},${E_WASH},${E_WASH},0.53)`; ctx.fillRect(0, 0, W, H);
  const c = caches();
  if (!c.edge) {
    // built at ¼ size (blur σ 11 px → 2.75) and scaled up: the ramp is smooth, the build cheap
    const S = FRAMED.screen; c.edge = cv(W / 4, Math.ceil(H / 4)); const g = c.edge.getContext("2d");
    g.scale(0.25, 0.25); g.fillStyle = "rgb(96,96,96)"; g.beginPath(); g.rect(0, 0, W, H); g.rect(S.x0, S.y0, S.x1 - S.x0, H - S.y0); g.fill("evenodd");
    blurCanvas(c.edge, 2.75);
  }
  ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.imageSmoothingQuality = "high"; ctx.drawImage(c.edge, 0, 0, W, Math.ceil(H / 4) * 4); ctx.restore();
}
const E_WASH = 226;
function beatH(ctx, k) {
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
  if (k >= 58) drawLines(ctx, k);
  // k54 is the same drawing 0.33 px left and 0.45 px up of its k57 place (template match)
  ctx.drawImage(owlHLayer(), k === 54 ? -0.33 : 0, k === 54 ? -0.45 : 0);
}
// the whirl (k63–66): four in-between drawings on measured silhouettes (s24/d/whirl.js); k67 is the dive drawing
// 3.9 px right of its place (template match)
function beatSpin(ctx, k) {
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
  drawLines(ctx, k);
  ctx.drawImage(whirlLayer(k), 0, 0);
}
function beatJ(ctx, k) {
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
  drawLines(ctx, k);
  ctx.save();
  if (k === 67) { ctx.translate(887 + 6, 454 - 12); ctx.rotate(4 * Math.PI / 180); ctx.translate(-887, -454); }   // silhouette fit: 4° clockwise about the centre of mass, (+6, −12)
  else if (J_ECC[k]) { const [a, tx, ty] = J_ECC[k], r = a * Math.PI / 180; ctx.setTransform(Math.cos(r), Math.sin(r), -Math.sin(r), Math.cos(r), tx, ty); }
  else if (J_SHIFT[k]) ctx.translate(J_SHIFT[k][0], J_SHIFT[k][1]);
  ctx.drawImage(owlJLayer(), 0, 0);
  ctx.restore();
  // the margin glow comes back from k82 (gain fitted to the margins: left / right / top medians)
  if (k >= 82) addScreenGlow(ctx, k === 82 ? 1.1 : 0.8);
}

// The next shot's first frame (s25 at 100.48), shown above the k91 wipe band. s25 is imported read-only; if it is
// missing or fails, black stands in.
let S25 = null;
try { S25 = (await import("./s25.js")).shot || null; } catch (e) { S25 = null; }
function beatK(ctx) {
  // k91 (100.44): a white band wipes across: half-max edges y = 406.5 − 0.4272 x and y = 539.1 − 0.4272 x (122 px
  // across, −23.1°, value ≈ 248); above it the next shot's first frame, washed (measured 0.907·v + 23); below it the
  // dive continues at its k90 place
  beatJ(ctx, 91);
  const c = caches();
  if (!c.wipe) {
    const up = (x) => 406.5 - 0.4272 * x, lo = (x) => 539.1 - 0.4272 * x;
    c.wipe = cv();
    const g = c.wipe.getContext("2d");
    const nx = cv(), ng = nx.getContext("2d");
    ng.fillStyle = "#000"; ng.fillRect(0, 0, W, H);
    if (S25) { try { ng.save(); S25.draw(ng, 0, 100.48); ng.restore(); } catch (e) { ng.setTransform(1, 0, 0, 1, 0, 0); ng.fillStyle = "#000"; ng.fillRect(0, 0, W, H); } }
    g.save();
    g.beginPath(); g.moveTo(-10, -10); g.lineTo(W + 10, -10); g.lineTo(W + 10, up(W + 10)); g.lineTo(-10, up(-10)); g.closePath(); g.clip();
    g.drawImage(nx, 0, 0);
    g.fillStyle = "rgba(255,255,255,0.093)"; g.fillRect(0, 0, W, H);
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
    if (k <= 7) drawPageSmear(ctx);
    else if (k <= 18) drawPageHold(ctx, k);
    else if (k === 19) drawPageWhip(ctx);
    else if (k === 20) flashCorner(ctx);
    else if (k <= 22) flashWhite(ctx, 219.5, 255);
    else if (k === 23) beatE(ctx);
    else if (k <= 53) beatF(ctx, k);
    else if (k === 54) beatH(ctx, k);
    else if (k <= 56) flashWhite(ctx, 241.8, 232);
    else if (k <= 62) beatH(ctx, k);
    else if (k <= 66) beatSpin(ctx, k);
    else if (k <= 90) beatJ(ctx, k);
    else beatK(ctx);
    ctx.restore();
  },
  // fix pass 2: the white flashes (k20–23) carry a slightly stronger exposure than the grade gives: post.js's final
  // fade (multiplied after the vignette) at 1.056 lifts the margins to the source's (≈ 220 at the top and sides); the
  // screen values are lowered in draw so the screen stays where it was (measured)
  grade(local, t) { const k = frameIndex(t); return k >= 20 && k <= 23 ? { fade: FLASH_FADE } : {}; },
  release() { C = null; releaseOwlF(); releaseOwlJ(); releaseOwlH(); releasePage(); releaseWhirl(); },
};
