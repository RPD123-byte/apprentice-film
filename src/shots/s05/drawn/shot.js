// s05 (23.12–26.72), fix pass 1d: the shot drawn in code. Over his shoulder: he types with the pencil between his
// teeth, the owl (headphones, a plaster on the back of its head) on his right shoulder; speakers, cartons and cables
// round the desk; the laptop goes from his own site (sōko) to a file window (23.72) and on to Pure Imagination (24.16);
// the red selection and the note card pop up on the page (25.16, 25.44).
//
// The drawing is authored: each object is painted from measured geometry (control points read off labelled grids of
// the source's rest frames) with scratchboard carving, cloth / wood painting and inked contours (./kit.js, copied from
// F1's sōko illustration engine), in depth layers (./layers.js). No source pixel, trace or tone map is stored.
// The motion is the previous passes' measurements, kept as they were: the camera settle as per-layer grids of
// displacement vectors (../data/settle.js, camera motion only), the hand tracks (HAND_*), the owl's head dip (DIP),
// the pencil's settle track, the room light (LIGHT, LIGHT2) and the ink tint (TINT_T); the screen is ../screen.js.
import { W, H } from "../../../config.js";
import { layer, releaseLayers } from "./layers.js";
import { drawScreen, drawScreenRim, releaseScreen } from "../screen.js";
import { decode } from "../ink.js";
import { KS as SKS, FIELDS as SFIELDS } from "../data/settle.js";
import { rightShift, RIGHT_X, paintPaleCartons, releaseRight } from "../right.js";

let SITES = null, PURE = null;
try { SITES = await import("../../../lib/sites.js"); } catch (e) { console.warn("[s05] sites.js unavailable:", e); }
try { PURE = await import("../../../lib/pureimg.js"); } catch (e) { console.warn("[s05] pureimg.js unavailable:", e); }
try {
  await Promise.all(["900 79px Archivo", "800 40px Archivo", "600 20px Geist", "500 20px Geist", "400 20px 'Geist Mono'", "400 20px Shrikhand", "900 20px 'Fraunces Soft'", "500 20px Poppins", "600 20px Poppins", "700 20px Poppins"].map((f) => document.fonts.load(f)));
} catch (e) { /* pages fall back to system faces */ }

function tab(T, t) {
  if (t <= T[0][0]) return T[0].slice(1);
  for (let i = 1; i < T.length; i++) if (t <= T[i][0] + 1e-9) {
    const a = T[i - 1], b = T[i], f = (t - a[0]) / (b[0] - a[0]);
    return a.slice(1).map((v, k) => v + (b[k + 1] - v) * f);
  }
  return T[T.length - 1].slice(1);
}

// ---------- hands. HAND_R / HAND_A: [t, dx, dy] of the pose-A right hand / forearm vs the settled frame (ECC on the
// source, trace/track.py). The left hand (LH_SET: [t, dx, dy, scale, rot (deg)] about C_L) is still after 23.52.
const HAND_R = [[23.52, 36.6, -15.4], [23.56, 36.9, -15.2], [23.60, 35.4, -11.9], [23.64, 34.0, -10.6], [23.68, 35.9, -11.9], [23.72, 46.8, -16.6], [23.76, 53.0, -18.9], [23.80, 59.6, -21.1], [23.84, 64.1, -22.7], [23.88, 66.9, -23.1], [23.92, 68.0, -23.1], [24.24, 68.1, -23.0], [24.28, 67.0, -22.4], [24.32, 64.1, -21.9], [24.36, 60.3, -20.5], [24.40, 56.2, -19.4], [24.44, 51.4, -18.1], [24.48, 44.9, -16.2], [24.52, 37.1, -13.4], [24.56, 29.9, -11.3], [24.60, 23.0, -8.9], [24.64, 15.3, -5.9], [24.68, 9.9, -3.7], [24.72, 5.9, -2.1], [24.76, 3.2, -1.0], [24.80, 1.3, -0.3], [24.84, 0.3, -0.1], [24.88, 0.0, 0.1], [25.00, -0.0, -0.1], [25.04, 1.1, -1.1], [25.08, 1.1, -1.1], [25.12, 4.3, -3.9], [25.16, 11.8, -8.3], [25.20, 18.3, -11.3], [25.24, 24.2, -13.3], [25.28, 27.4, -14.1], [25.32, 32.1, -15.1], [25.36, 36.0, -16.1], [25.40, 38.9, -16.4], [25.44, 40.4, -16.4], [25.48, 42.4, -16.9], [25.52, 42.9, -17.0], [26.68, 42.9, -17.0]];
const HAND_A = [[23.52, 34.2, -3.9], [23.56, 34.3, -4.2], [23.60, 33.0, -4.1], [23.64, 31.1, -4.2], [23.68, 33.2, -4.8], [23.72, 43.1, -6.0], [23.76, 49.2, -6.2], [23.80, 55.4, -7.0], [23.84, 59.9, -7.1], [23.88, 62.8, -7.1], [23.92, 64.0, -7.0], [24.24, 64.3, -7.0], [24.28, 63.4, -6.9], [24.36, 57.6, -6.1], [24.40, 53.4, -5.8], [24.44, 48.6, -5.1], [24.48, 42.6, -4.7], [24.52, 36.0, -4.0], [24.56, 28.9, -3.3], [24.60, 22.5, -2.7], [24.64, 15.3, -1.9], [24.68, 10.0, -1.2], [24.72, 6.0, -0.8], [24.76, 3.5, -0.3], [24.80, 1.5, -0.2], [24.84, 0.5, -0.1], [24.88, 0.0, -0.0], [25.00, -0.1, 0.0], [25.04, 1.0, -0.1], [25.08, 1.0, -0.1], [25.12, 4.3, -0.7], [25.16, 11.0, -2.1], [25.20, 17.1, -3.0], [25.24, 22.6, -3.7], [25.28, 25.9, -4.1], [25.32, 29.9, -4.3], [25.40, 36.0, -4.6], [25.44, 38.0, -4.7], [25.48, 39.7, -4.7], [26.68, 39.8, -4.7]];
// The right hand and forearm are two drawings: pose B (held 25.48-26.68 and seen for most of the shot, also through the
// settle) and pose A (the settled frame: 23.64-23.68 and 24.64-25.12); the frames between are a mix (NCC against each).
// HAND_RB / HAND_AB: [t, dx, dy] of the pose-B drawings vs where they were traced (ECC per frame).
const HAND_RB = [[23.12, -83.8, 59.6], [23.16, -69.5, 48.4], [23.20, -56.9, 38.8], [23.24, -46.1, 30.5], [23.28, -37.5, 24.1], [23.32, -27.6, 16.2], [23.36, -20.0, 10.4], [23.40, -14.5, 6.4], [23.44, -10.8, 4.1], [23.48, -7.7, 1.8], [23.52, -6.4, 0.8], [23.56, -5.8, 1.1], [23.60, -6.4, 4.0], [23.64, -7.8, 5.5], [23.68, -5.9, 4.2], [23.72, 4.1, 0.0], [23.76, 10.0, -1.8], [23.80, 16.4, -4.0], [23.84, 21.0, -5.2], [23.88, 23.7, -5.7], [23.92, 24.9, -5.7], [24.24, 25.1, -5.6], [24.28, 24.3, -5.4], [24.36, 18.0, -3.7], [24.40, 13.8, -2.6], [24.44, 9.1, -1.2], [24.48, 2.6, 0.4], [24.52, -4.6, 2.4], [24.56, -12.1, 4.5], [24.60, -19.1, 7.0], [24.64, -26.9, 10.3], [24.68, -32.5, 12.6], [24.72, -36.6, 14.3], [24.76, -39.3, 15.5], [24.80, -41.1, 16.2], [24.84, -42.1, 16.4], [24.88, -42.5, 16.5], [25.00, -42.5, 16.4], [25.04, -41.5, 15.3], [25.08, -41.5, 15.3], [25.12, -37.9, 12.4], [25.16, -30.4, 7.6], [25.20, -23.8, 4.7], [25.24, -18.0, 2.9], [25.28, -14.4, 2.1], [25.32, -10.0, 1.1], [25.36, -6.6, 0.5], [25.40, -3.7, 0.2], [25.48, -0.2, 0.0], [26.68, 0.0, 0.0]];
const HAND_AB = [[23.12, -61.8, 46.7], [23.16, -51.0, 38.0], [23.20, -42.1, 31.0], [23.24, -34.3, 24.9], [23.28, -27.9, 20.0], [23.32, -20.7, 13.9], [23.36, -15.2, 9.4], [23.40, -11.1, 6.2], [23.44, -8.3, 4.2], [23.48, -6.2, 2.1], [23.52, -5.4, 0.9], [23.56, -5.3, 0.7], [23.60, -6.7, 0.7], [23.64, -8.4, 0.7], [23.68, -6.5, -0.0], [23.72, 3.2, -1.3], [23.76, 9.3, -1.5], [23.80, 15.8, -1.7], [23.84, 20.3, -1.9], [23.88, 23.1, -1.9], [23.92, 24.4, -1.9], [23.96, 24.6, -1.4], [24.24, 24.7, -1.4], [24.28, 23.8, -1.4], [24.32, 21.0, -1.2], [24.36, 17.9, -1.0], [24.40, 13.8, -0.7], [24.44, 8.8, -0.3], [24.48, 2.7, -0.1], [24.52, -3.7, 0.9], [24.56, -10.8, 1.3], [24.60, -17.1, 2.0], [24.64, -24.3, 2.9], [24.68, -29.6, 3.6], [24.72, -33.7, 3.9], [24.76, -36.1, 4.5], [24.80, -38.1, 4.7], [24.84, -39.1, 4.8], [24.88, -39.6, 4.7], [25.00, -39.8, 4.8], [25.04, -38.7, 4.7], [25.08, -38.7, 4.7], [25.12, -35.4, 4.0], [25.16, -28.6, 2.6], [25.20, -22.5, 1.8], [25.24, -17.1, 1.1], [25.28, -13.7, 0.7], [25.32, -9.7, 0.3], [25.40, -3.6, 0.1], [25.44, -1.6, 0.1], [25.48, -0.1, 0.0], [26.68, 0.0, 0.0]];
// which of the right hand's two drawings is up (1 = pose B). Fix pass 1d: hard switches on the frame where the source's
// NCC against the two poses flips (the old 0.5 / 0.65 / 0.7 mixes showed double contours): 23.60 A, 24.60 A, 25.16 B.
const POSE_B = [[23.12, 1], [23.56, 1], [23.58, 0], [23.68, 0], [23.70, 1], [24.56, 1], [24.58, 0], [25.12, 0], [25.14, 1], [26.68, 1]];
// while the camera settles the hands also grow a little toward the lens (scale about each drawing's centre, fix pass 1
// template matches); the left hand turns too (affine track)
const SCALE_R = [[23.12, 1.06], [23.16, 1.04], [23.20, 1.03], [23.24, 1.02], [23.28, 1.01], [23.32, 1.01], [23.36, 1.0]];
const SCALE_A = [[23.12, 1.05], [23.16, 1.05], [23.20, 1.03], [23.24, 1.02], [23.28, 1.02], [23.32, 1.01], [23.40, 1.0]];
const LH_SET = [[23.12, -68.0, 84.0, 1.095, -2.8], [23.16, -55.3, 68.3, 1.080, -2.18], [23.20, -45.6, 55.2, 1.067, -1.59], [23.24, -36.7, 43.3, 1.047, -1.21], [23.28, -29.5, 33.8, 1.037, -0.91], [23.32, -20.8, 23.3, 1.024, -0.55], [23.36, -13.8, 15.4, 1.016, -0.38], [23.40, -8.6, 9.8, 1.009, -0.19], [23.44, -5.0, 6.2, 1.005, -0.13], [23.48, -2.0, 2.4, 1.0, -0.16], [23.52, -0.4, 0.5, 1.0, 0], [23.56, 0, 0, 1, 0]];
const C_RB = [1062, 660], C_AB = [1297, 700], C_L = [740, 755];

// ---------- the owl's head dip: [t, rot (rad), dx, dy] of the head about HEAD_C (ECC Euclidean fit of the head +
// headphones, 25.00 vs each frame); the body stays. The warp is full above y 440 and fades out to y 520.
const HEAD_C = [1540, 330];
const DIP = [[25.76, 0, 0, 0], [25.80, -0.00227, -0.7, 0.4], [25.84, -0.01222, -2.1, 1.3], [25.88, -0.02932, -4.6, 2.5], [25.92, -0.04712, -7.2, 4.0], [25.96, -0.05952, -9.0, 5.1], [26.00, -0.0644, -9.7, 5.5], [26.08, -0.06335, -9.7, 5.5], [26.12, -0.05777, -8.9, 5.1], [26.16, -0.04486, -7.1, 4.2], [26.20, -0.03176, -5.2, 3.2], [26.24, -0.02182, -3.6, 2.2], [26.28, -0.01169, -2.2, 1.5], [26.32, -0.00122, -0.4, 0.2], [26.36, 0, 0, 0]];
const NECK = [440, 520];

// ---------- the screen lights the room: while his dark sōko page and then the white window are up (to 24.0) the
// room reads brighter than once Pure Imagination is on screen, more on the desk side. LIGHT: [t, G0, A] per source
// frame, the pre-grade gain G0 + A·w(x) (w = 1 left of x 1250, falling to 0.2 beyond 1700) that brings the drawing
// (traced on the settled frame, 24.16-25.12) to each source frame outside the screen (least squares, grade undone).
const LIGHT = [[23.12, 0.999, 0.251], [23.16, 0.994, 0.260], [23.20, 0.993, 0.262], [23.24, 0.995, 0.259], [23.28, 0.998, 0.255], [23.32, 1.006, 0.244], [23.36, 1.004, 0.244], [23.40, 1.007, 0.241], [23.44, 1.005, 0.240], [23.48, 1.003, 0.244], [23.52, 0.999, 0.241], [23.56, 0.997, 0.241], [23.60, 1.000, 0.237], [23.64, 0.996, 0.236], [23.68, 0.995, 0.237], [23.72, 0.994, 0.235], [23.76, 0.994, 0.234], [23.80, 0.992, 0.232], [23.84, 0.991, 0.232], [23.88, 0.989, 0.230], [23.92, 0.987, 0.231], [23.96, 0.984, 0.231], [24.00, 0.992, 0.184], [24.04, 1.003, 0.123], [24.08, 1.005, 0.114], [24.12, 1.019, 0.048], [24.16, 1.021, -0.013], [24.20, 1.019, -0.010], [24.24, 1.018, -0.013], [24.28, 1.016, -0.011], [24.32, 1.007, -0.002], [24.36, 1.007, -0.003], [24.40, 1.006, -0.002], [24.44, 1.005, -0.002], [24.48, 1.003, 0.001], [24.52, 1.003, 0.001], [24.56, 1.002, 0.002], [24.60, 1.001, 0.001], [24.64, 1.002, 0.004], [24.68, 0.996, 0.007], [24.72, 0.997, 0.008], [24.76, 0.998, 0.002], [24.80, 0.996, 0.005], [24.84, 0.995, 0.006], [24.88, 0.994, 0.009], [24.92, 0.998, 0.004], [24.96, 0.996, 0.008], [25.00, 0.995, 0.009], [25.04, 0.997, 0.007], [25.08, 0.995, 0.006], [25.12, 0.997, 0.006], [25.16, 0.996, 0.005], [25.20, 0.996, 0.008], [25.24, 0.993, 0.008], [25.28, 0.995, 0.006], [25.32, 0.994, 0.008], [25.36, 0.994, 0.010], [25.40, 0.994, 0.008], [25.44, 0.996, 0.007], [25.48, 0.995, 0.008], [25.52, 0.993, 0.009], [25.56, 0.992, 0.006], [25.60, 0.993, 0.007], [25.64, 0.992, 0.008], [25.68, 0.994, 0.006], [25.72, 0.994, 0.008], [25.76, 0.993, 0.006], [25.80, 0.993, 0.008], [25.84, 0.994, 0.006], [25.88, 0.993, 0.007], [25.92, 0.996, 0.008], [25.96, 0.995, 0.009], [26.00, 0.994, 0.010], [26.04, 0.994, 0.010], [26.08, 0.993, 0.005], [26.12, 0.992, 0.010], [26.16, 0.993, 0.009], [26.20, 0.993, 0.008], [26.24, 0.995, 0.008], [26.28, 0.995, 0.007], [26.32, 0.993, 0.010], [26.36, 0.991, 0.010], [26.40, 0.992, 0.012], [26.44, 0.993, 0.008], [26.48, 0.993, 0.010], [26.52, 0.990, 0.007], [26.56, 0.990, 0.007], [26.60, 0.990, 0.007], [26.64, 0.991, 0.009], [26.68, 0.989, 0.009]];
const SCREEN_Q = [[315, 246], [834, 168], [898, 519], [409, 648]];
let GAIN = null, GMASK = null;
function applyLight(ctx, t) {
  const [G0, A] = tab(LIGHT, t);
  if (Math.abs(A) < 0.002 && Math.abs(G0 - 1) < 0.002) return;
  const c = ctx.canvas;
  const f = settleField("desk", Math.round(t * 25)) || ((x, y) => [x, y]);
  const Q = SCREEN_Q.map(([x, y]) => f(x, y));
  const quad = (g) => Q.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  if (!GMASK) {
    GMASK = document.createElement("canvas"); GMASK.width = W; GMASK.height = 1;
    const m = GMASK.getContext("2d"), gr = m.createLinearGradient(0, 0, W, 0);
    gr.addColorStop(0, "rgba(0,0,0,1)"); gr.addColorStop(1250 / W, "rgba(0,0,0,1)"); gr.addColorStop(1700 / W, "rgba(0,0,0,0.2)"); gr.addColorStop(1, "rgba(0,0,0,0.2)");
    m.fillStyle = gr; m.fillRect(0, 0, W, 1);
  }
  if (!GAIN) { GAIN = document.createElement("canvas"); GAIN.width = W; GAIN.height = H; }
  const g = GAIN.getContext("2d");
  // the added light, frame * (A·w + max(0, G0 - 1)), taken from the frame as it is (the screen cut out)
  const add = Math.max(0, A), addG = Math.max(0, G0 - 1);
  if (add > 0.001 || addG > 0.001) {
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = "copy"; g.globalAlpha = 1; g.drawImage(c, 0, 0);
    g.globalCompositeOperation = "destination-in"; g.globalAlpha = 1;
    // alpha = add·w + addG: the gradient mask at `add`, plus a flat `addG`
    const m = document.createElement("canvas"); m.width = W; m.height = 1;
    const mq = m.getContext("2d"); mq.globalAlpha = Math.min(1, add); mq.drawImage(GMASK, 0, 0); mq.globalAlpha = Math.min(1, addG); mq.globalCompositeOperation = "lighter"; mq.fillStyle = "#000"; mq.fillRect(0, 0, W, 1);
    g.drawImage(m, 0, 0, W, H);
    g.globalCompositeOperation = "destination-out"; g.beginPath(); quad(g); g.closePath(); g.fillStyle = "#000"; g.fill();
    g.globalCompositeOperation = "source-over";
  }
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  // the taken light, frame * (1 - (-min(0, A))·w - max(0, 1 - G0)): black laid over, the screen left out
  const sub = Math.max(0, -A), subG = Math.max(0, 1 - G0);
  if (sub > 0.001 || subG > 0.001) {
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H); quad(ctx); ctx.closePath(); ctx.clip("evenodd");
    if (sub > 0.001) { ctx.globalAlpha = Math.min(1, sub); ctx.drawImage(GMASK, 0, 0, W, H); }
    if (subG > 0.001) { ctx.globalAlpha = Math.min(1, subG); ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H); }
    ctx.restore();
  }
  if (add > 0.001 || addG > 0.001) { ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 1; ctx.drawImage(GAIN, 0, 0); }
  ctx.restore();
}

// ... and (pass 3) the desk side a little brighter still through the first clip: the frame's mean left of x 600 read
// 2-6.6 % below the source's (x 600-1250 about half that) at 23.12-24.12 with LIGHT alone (blurred means, the screen
// left out). LIGHT2: [frame k, extra gain at the left edge]; the gain falls to half by x 1250 and to 0 by x 1700.
const LIGHT2 = { 578: 0.037, 579: 0.058, 580: 0.04, 581: 0.043, 582: 0.04, 583: 0.036, 584: 0.034, 585: 0.03, 586: 0.026, 587: 0.018, 588: 0.019,
  589: 0.016, 590: 0.017, 591: 0.017, 592: 0.017, 593: 0.017, 594: 0.017, 595: 0.017, 596: 0.018, 597: 0.017, 598: 0.016, 599: 0.016, 600: 0.017,
  601: 0.011, 602: 0.012, 603: 0.011, 604: 0.006 };
let GMASK2 = null, GAIN2 = null;
function applyLight2(ctx, t) {
  const k = Math.round(t * 25), a = LIGHT2[k];
  if (!a) return;
  if (!GMASK2) {
    GMASK2 = document.createElement("canvas"); GMASK2.width = W; GMASK2.height = 1;
    const m = GMASK2.getContext("2d"), gr = m.createLinearGradient(0, 0, W, 0);
    gr.addColorStop(0, "rgba(0,0,0,1)"); gr.addColorStop(600 / W, "rgba(0,0,0,1)"); gr.addColorStop(1250 / W, "rgba(0,0,0,0.5)"); gr.addColorStop(1700 / W, "rgba(0,0,0,0)"); gr.addColorStop(1, "rgba(0,0,0,0)");
    m.fillStyle = gr; m.fillRect(0, 0, W, 1);
  }
  if (!GAIN2) { GAIN2 = document.createElement("canvas"); GAIN2.width = W; GAIN2.height = H; }
  const f = settleField("desk", k) || ((x, y) => [x, y]);
  const Q = SCREEN_Q.map(([x, y]) => f(x, y));
  const g = GAIN2.getContext("2d");
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = "copy"; g.globalAlpha = 1; g.drawImage(ctx.canvas, 0, 0);
  g.globalCompositeOperation = "destination-in"; g.globalAlpha = Math.min(1, a); g.drawImage(GMASK2, 0, 0, W, H);
  g.globalAlpha = 1; g.globalCompositeOperation = "destination-out"; g.beginPath(); Q.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fillStyle = "#000"; g.fill();
  g.globalCompositeOperation = "source-over";
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = "lighter"; ctx.drawImage(GAIN2, 0, 0); ctx.restore();
}

// ---------- the ink tint. The layers are neutral grey; the source's ink is not, and its tint changes with the screen:
// nearly neutral while sōko and the white window are up, green-grey once Pure Imagination is on (24.04-24.16).
// TINT_T: [t, r, g, b] per source frame, each channel's pre-grade offset from the channel mean in 1/1000 (measured on
// the un-graded source outside the screen, pixels of value 0.05-0.9). The offset is full from value 0.03 up and
// fades toward black ((v/0.03)^0.4, as measured in the source's darks), so blacks stay black. The screen keeps its own
// colour (screen.js fits it on its own).
const TINT_T = [[23.12, -0.7, 4.8, -4.1], [23.16, -0.7, 4.9, -4.2], [23.20, -0.1, 4.2, -4.1], [23.24, -0.0, 4.3, -4.2], [23.28, 0.2, 4.1, -4.2], [23.32, 0.0, 4.5, -4.5], [23.36, 0.5, 3.7, -4.2], [23.40, 0.5, 3.6, -4.1], [23.44, 0.5, 3.7, -4.1], [23.48, 0.1, 4.5, -4.6], [23.52, -0.4, 5.0, -4.6], [23.56, -0.5, 5.1, -4.7], [23.60, -0.5, 5.2, -4.7], [23.64, -0.6, 5.4, -4.8], [23.68, -0.6, 5.3, -4.7], [23.72, -0.6, 5.4, -4.7], [23.76, -0.7, 5.4, -4.7], [23.80, -1.0, 5.8, -4.8], [23.84, -0.6, 5.2, -4.7], [23.88, -0.5, 5.2, -4.7], [23.92, -0.5, 5.1, -4.7], [23.96, -0.5, 5.4, -4.8], [24.00, 0.1, 6.0, -6.1], [24.04, -5.2, 11.7, -6.5], [24.08, -5.3, 11.8, -6.5], [24.12, -6.4, 14.4, -8.1], [24.16, -6.4, 14.6, -8.2], [24.20, -6.5, 14.7, -8.2], [24.24, -6.4, 14.6, -8.2], [24.28, -6.6, 15.0, -8.3], [24.32, -6.4, 14.6, -8.2], [24.36, -6.4, 14.6, -8.2], [24.40, -6.4, 14.5, -8.1], [24.44, -6.6, 15.0, -8.4], [24.48, -6.4, 14.7, -8.3], [24.52, -6.5, 14.8, -8.3], [24.56, -6.5, 14.8, -8.3], [24.60, -6.6, 15.1, -8.5], [24.64, -6.5, 14.8, -8.3], [24.68, -6.5, 14.8, -8.3], [24.72, -6.4, 14.6, -8.2], [24.76, -6.5, 14.8, -8.4], [24.80, -6.3, 14.6, -8.2], [24.84, -6.4, 14.6, -8.2], [24.88, -6.4, 14.7, -8.3], [24.92, -6.6, 15.1, -8.5], [24.96, -6.6, 15.0, -8.4], [25.00, -6.7, 15.2, -8.5], [25.04, -6.7, 15.3, -8.6], [25.08, -6.8, 15.5, -8.7], [25.12, -6.6, 15.2, -8.6], [25.16, -6.6, 15.2, -8.6], [25.20, -6.5, 15.1, -8.5], [25.24, -6.6, 15.3, -8.6], [25.28, -6.5, 15.1, -8.5], [25.32, -6.6, 15.2, -8.6], [25.36, -6.6, 15.2, -8.6], [25.40, -6.8, 15.6, -8.8], [25.44, -6.7, 15.4, -8.7], [25.48, -6.8, 15.5, -8.8], [25.52, -6.7, 15.4, -8.7], [25.56, -6.7, 15.4, -8.7], [25.60, -6.6, 15.2, -8.6], [25.64, -6.6, 15.1, -8.5], [25.68, -6.5, 15.0, -8.5], [25.72, -6.6, 15.2, -8.6], [25.76, -6.5, 15.1, -8.5], [25.80, -6.6, 15.2, -8.6], [25.84, -6.6, 15.2, -8.6], [25.88, -6.8, 15.5, -8.7], [25.92, -6.7, 15.4, -8.7], [25.96, -6.7, 15.4, -8.7], [26.00, -6.7, 15.3, -8.7], [26.04, -6.7, 15.4, -8.7], [26.08, -6.6, 15.3, -8.6], [26.12, -6.7, 15.3, -8.6], [26.16, -6.7, 15.3, -8.7], [26.20, -6.8, 15.7, -8.8], [26.24, -6.8, 15.6, -8.8], [26.28, -6.9, 15.8, -8.9], [26.32, -6.9, 15.9, -9.0], [26.36, -7.0, 16.0, -9.0], [26.40, -6.9, 15.9, -9.0], [26.44, -6.9, 15.8, -8.9], [26.48, -6.8, 15.7, -8.8], [26.52, -6.9, 15.7, -8.8], [26.56, -6.8, 15.6, -8.8], [26.60, -6.8, 15.5, -8.8], [26.64, -6.8, 15.5, -8.8], [26.68, -6.8, 15.6, -8.8]];
const TINT_RAMP = [0.03, 0.4];
// ... and the drawing's darkest values (its value study bottoms out at about 3/255) are taken down to the source's
// black: a toe below 12/255 (quantile match of the darks outside the screen, 23.60 and 25.00)
const TOE = [3, 12, 1.5];
const toe = (v) => (v >= TOE[1] ? v : v <= TOE[0] ? 0 : TOE[1] * Math.pow((v - TOE[0]) / (TOE[1] - TOE[0]), TOE[2]));
// 4x4 ordered dither, so offsets of a level or two keep their mean (the grade's grain hides the pattern)
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((b) => (b + 0.5) / 16);
function tintLUT(off) {
  const L = new Uint8ClampedArray(256 * 16), o = (off / 1000) * 255;
  for (let v = 0; v < 256; v++) {
    const b = toe(v), y = b + o * Math.min(1, Math.pow(b / 255 / TINT_RAMP[0], TINT_RAMP[1]));
    for (let d = 0; d < 16; d++) L[d * 256 + v] = Math.floor(y + BAYER[d]);
  }
  return L;
}
function applyTint(ctx, t) {
  const [dr, dg, db] = tab(TINT_T, t);
  const LR = tintLUT(dr), LG = tintLUT(dg), LB = tintLUT(db);
  const f = settleField("desk", Math.round(t * 25)) || ((x, y) => [x, y]);
  const Q = SCREEN_Q.map(([x, y]) => f(x, y));
  const id = ctx.getImageData(0, 0, W, H), p = id.data;
  for (let y = 0; y < H; y++) {
    // the screen quad's span on this row (convex): left out
    let xa = Infinity, xb = -Infinity;
    const yc = y + 0.5;
    for (let i = 0; i < 4; i++) {
      const [x0, y0] = Q[i], [x1, y1] = Q[(i + 1) % 4];
      if ((yc - y0) * (yc - y1) <= 0 && y0 !== y1) { const x = x0 + ((yc - y0) / (y1 - y0)) * (x1 - x0); xa = Math.min(xa, x); xb = Math.max(xb, x); }
    }
    const sa = xa === Infinity ? W : Math.max(0, Math.ceil(xa - 0.5)), sb = xa === Infinity ? W : Math.min(W, Math.floor(xb + 0.5));
    let i = y * W * 4;
    const row = (y & 3) * 4;
    for (let x = 0; x < W; x++, i += 4) {
      if (x === sa && sb > sa) { x = sb - 1; i = (y * W + sb - 1) * 4; continue; }
      const o = (row + (x & 3)) * 256;
      p[i] = LR[o + p[i]]; p[i + 1] = LG[o + p[i + 1]]; p[i + 2] = LB[o + p[i + 2]];
    }
  }
  ctx.putImageData(id, 0, 0);
}

// ---------- motion blur while the camera settles: each layer is smeared along its own frame-to-frame motion (from its
// settle grid: the mean displacement change over the layer's box, central difference) times the shutter EXPOSURE
// (fitted on the source: the room's ~7 px smear at 23.12 against its ~30 px/frame motion)
const EXPOSURE = 0.25;
let SMEAR = null, TMP = null, DESKC = null;
const canvasWH = () => { const c = document.createElement("canvas"); c.width = W; c.height = H; return c; };
// (pass 3) through the fastest part of the settle (to 23.28) the room behind is smeared more than the layers in front:
// its horizontal gradient energy there ran 25-40 % above the source's with EXPOSURE (blurred error 4.7 -> 3.5 at 23.20)
// (fix pass 2: tapered to nothing over frames 585-588, so frame 588 no longer steps from smeared to crisp: the room's
// motion-compensated texture change on 587 -> 588 read 5.5 against the source's 2.4)
const ROOM_EXP = (k) => (k <= 582 ? 0.45 : k < 585 ? EXPOSURE : EXPOSURE * Math.max(0, 588 - k) / 3);
function blurVec(name, k, box) {
  const f0 = settleField(name, k - 1), f1 = settleField(name, k + 1);
  const fk = settleField(name, k);
  if (!fk) return [0, 0];
  const a = f0 || fk, b = f1 || ((x, y) => [x, y]);      // after the last grid frame the layer is at rest
  const span = (f0 ? 1 : 0) + 1;
  let sx = 0, sy = 0, n = 0;
  const [x0, y0, x1, y1] = box;
  for (let j = 0; j <= 4; j++) for (let i = 0; i <= 4; i++) {
    const x = x0 + ((x1 - x0) * i) / 4, y = y0 + ((y1 - y0) * j) / 4, p = a(x, y), q = b(x, y);
    sx += q[0] - p[0]; sy += q[1] - p[1]; n++;
  }
  const e = name === "room" ? ROOM_EXP(k) : EXPOSURE;
  return [(sx / n / span) * e, (sy / n / span) * e];
}
// paint(g) into a scratch canvas, then lay it down smeared over the vector v (a box blur along v)
function smeared(ctx, v, paint) {
  const L = Math.hypot(v[0], v[1]);
  if (L < 0.8) { paint(ctx); return; }
  if (!SMEAR) SMEAR = canvasWH();
  if (!TMP) TMP = canvasWH();
  const g = SMEAR.getContext("2d"), q = TMP.getContext("2d");
  q.setTransform(1, 0, 0, 1, 0, 0); q.clearRect(0, 0, W, H); q.imageSmoothingEnabled = true; q.imageSmoothingQuality = "high";
  paint(q);
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H); g.globalCompositeOperation = "lighter";
  const N = Math.max(3, Math.round(L) + 1);
  for (let k = 0; k < N; k++) { const d = k / (N - 1) - 0.5; g.globalAlpha = 1 / N; g.drawImage(TMP, d * v[0], d * v[1]); }
  g.globalAlpha = 1; g.globalCompositeOperation = "source-over";
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(SMEAR, 0, 0); ctx.restore();
}

// ---------- the pencil through the settle: [frame k, dx, dy, scale, rot (deg)] of a similarity about PENCIL_C (ECC affine of
// the pencil, trace/settle_track.py pencil; rotation and scale smoothed, the 23.48 fit's shear dropped); at rest after
const PENCIL_C = [1275, 440];
const PENCIL_T = [[578, -20.5, 34.5, 1.022, -1.91], [579, -16.8, 28.3, 1.012, -1.6], [580, -14.1, 23.2, 1.009, -1.22], [581, -12.0, 18.8, 1.005, -1.04], [582, -9.9, 15.5, 1.004, -0.82], [583, -6.6, 10.6, 1.002, -0.55], [584, -4.6, 7.1, 1.0, -0.4], [585, -2.8, 4.8, 1.0, -0.28], [586, -1.9, 3.2, 1.0, -0.16], [587, -0.1, 1.7, 1.0, -0.07], [588, 0.1, 0.2, 1.0, 0]];
function pencilAt(k) {
  for (const r of PENCIL_T) if (r[0] === k) return r.slice(1);
  return k > 588 ? [0, 0, 1, 0] : null;
}

// ---------- drawing helpers
const blit = (ctx, l) => ctx.drawImage(l.c, l.x, l.y);
// a layer canvas warped through f(x, y) -> [x', y'] (frame px), as a mesh of affine triangles (cell ~ step px)
function warpBlit(ctx, l, f, step = 40) {
  const nx = Math.max(1, Math.ceil(l.w / step)), ny = Math.max(1, Math.ceil(l.h / step));
  const P = [];
  for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) { const x = l.x + (l.w * i) / nx, y = l.y + (l.h * j) / ny; P.push([x, y, ...f(x, y)]); }
  const at = (i, j) => P[j * (nx + 1) + i];
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const a = at(i, j), b = at(i + 1, j), c = at(i + 1, j + 1), d = at(i, j + 1);
    tri(ctx, l, a, b, c); tri(ctx, l, a, c, d);
  }
}
// draw the triangle (source frame px p[0..1] -> dest p[2..3]) of layer l; only the source rectangle under it is drawn
function tri(ctx, l, p0, p1, p2) {
  const [x0, y0, u0, v0] = p0, [x1, y1, u1, v1] = p1, [x2, y2, u2, v2] = p2;
  const den = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0);
  if (Math.abs(den) < 1e-6) return;
  ctx.save();
  // dilate the clip a hair so neighbouring triangles leave no seam
  const cx = (u0 + u1 + u2) / 3, cy = (v0 + v1 + v2) / 3;
  const gr = (x, y) => { const dx = x - cx, dy = y - cy, n = Math.hypot(dx, dy) || 1; return [x + (dx / n) * 0.6, y + (dy / n) * 0.6]; };
  ctx.beginPath(); ctx.moveTo(...gr(u0, v0)); ctx.lineTo(...gr(u1, v1)); ctx.lineTo(...gr(u2, v2)); ctx.closePath(); ctx.clip();
  const a = ((u1 - u0) * (y2 - y0) - (u2 - u0) * (y1 - y0)) / den, c = ((u2 - u0) * (x1 - x0) - (u1 - u0) * (x2 - x0)) / den;
  const b = ((v1 - v0) * (y2 - y0) - (v2 - v0) * (y1 - y0)) / den, d = ((v2 - v0) * (x1 - x0) - (v1 - v0) * (x2 - x0)) / den;
  const e = u0 - a * x0 - c * y0, f = v0 - b * x0 - d * y0;
  ctx.transform(a, b, c, d, e, f);
  const sx0 = Math.max(0, Math.floor(Math.min(x0, x1, x2) - l.x - 3)), sy0 = Math.max(0, Math.floor(Math.min(y0, y1, y2) - l.y - 3));
  const sx1 = Math.min(l.c.width, Math.ceil(Math.max(x0, x1, x2) - l.x + 3)), sy1 = Math.min(l.c.height, Math.ceil(Math.max(y0, y1, y2) - l.y + 3));
  if (sx1 > sx0 && sy1 > sy0) ctx.drawImage(l.c, sx0, sy0, sx1 - sx0, sy1 - sy0, l.x + sx0, l.y + sy0, sx1 - sx0, sy1 - sy0);
  ctx.restore();
}
// the camera-settle motion grids (data/settle.js): displacement of a settled point in source frame k, per layer
const FD = {};
function settleField(name, k) {
  const i = SKS.indexOf(k);
  if (i < 0 || !SFIELDS[name]) return null;
  const key = name + k;
  if (!FD[key]) {
    const F = SFIELDS[name], a = decode(F.d[i]);
    FD[key] = { ...F, a };
  }
  const { x0, y0, G, nx, ny, a } = FD[key];
  // the room right of the head moves by its own measured translation (s05/right.js)
  const rs = name === "room" ? rightShift(k) : null;
  if (rs) {
    const base = gridField(x0, y0, G, nx, ny, a);
    return (x, y) => {
      const u = Math.max(0, Math.min(1, (x - RIGHT_X[0]) / (RIGHT_X[1] - RIGHT_X[0]))), w = u * u * (3 - 2 * u);
      if (w <= 0) return base(x, y);
      const b = w < 1 ? base(x, y) : [x, y];
      return [b[0] * (1 - w) + (x + rs[0]) * w, b[1] * (1 - w) + (y + rs[1]) * w];
    };
  }
  return gridField(x0, y0, G, nx, ny, a);
}
function gridField(x0, y0, G, nx, ny, a) {
  return (x, y) => {
    let fx = (x - x0) / G, fy = (y - y0) / G;
    fx = Math.max(0, Math.min(nx - 1.0001, fx)); fy = Math.max(0, Math.min(ny - 1.0001, fy));
    const i0 = Math.floor(fx), j0 = Math.floor(fy), u = fx - i0, v = fy - j0;
    const n = (i, j, c) => a[(j * nx + i) * 2 + c] / 10;
    const lerp2 = (c) => (n(i0, j0, c) * (1 - u) + n(i0 + 1, j0, c) * u) * (1 - v) + (n(i0, j0 + 1, c) * (1 - u) + n(i0 + 1, j0 + 1, c) * u) * v;
    return [x + lerp2(0), y + lerp2(1)];
  };
}
// draw a layer as it is at time t: warped through its settle grid in the settle frames, as is after
function drawLayer(ctx, l, name, t) {
  const f = settleField(name, Math.round(t * 25));
  if (f) warpBlit(ctx, l, f, SFIELDS[name].G * 0.75); else blit(ctx, l);
}
// the head's rigid motion (rotation about HEAD_C, then a shift) faded out down the neck
const neckK = (y) => (y <= NECK[0] ? 1 : y >= NECK[1] ? 0 : (() => { const u = (y - NECK[0]) / (NECK[1] - NECK[0]); return 1 - u * u * (3 - 2 * u); })());
function headWarp(th, dx, dy, fromTh = 0, fromDx = 0, fromDy = 0) {
  // settled-pose point p -> pose (th, dx, dy); a drawing made at pose (fromTh, fromDx, fromDy) is first taken back
  const [hx, hy] = HEAD_C, a = th - fromTh, cs = Math.cos(a), sn = Math.sin(a);
  return (x, y) => {
    const qx = x - hx - fromDx, qy = y - hy - fromDy;
    const px = hx + dx + qx * cs - qy * sn, py = hy + dy + qx * sn + qy * cs, k = neckK(y);
    return [x + (px - x) * k, y + (py - y) * k];
  };
}

// the owl: its drawing carried to the frame's head pose (the head turns about HEAD_C and shifts; the warp fades out
// down the neck)
function drawOwl(ctx, t) {
  const l = layer("owl");
  const [th, dx, dy] = tab(DIP, t);
  if (!th && !dx && !dy) { blit(ctx, l); return; }
  warpBlit(ctx, l, headWarp(th, dx, dy), 30);
}

export const shot = {
  draw(ctx, local, t) {
    // Hold each 25 fps source frame (a no-op in the film render, which samples frame times exactly); previews and
    // the snapshot tool sample slightly early, and holding keeps every measured per-frame table on its frame.
    t = Math.ceil(t * 25 - 1e-6) / 25;
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
    const k = Math.round(t * 25), settling = SKS.includes(k);
    // room (smeared along the move while the camera settles)
    smeared(ctx, blurVec("room", k, [0, 0, W, H]), (g) => { drawLayer(g, layer("room"), "room", t); paintPaleCartons(g, k); });
    // desk, laptop, screen (composed in settled coordinates, then moved together)
    if (settling) {
      const l = layer("desk");
      if (!DESKC) { DESKC = document.createElement("canvas"); DESKC.width = l.w; DESKC.height = l.h; }
      const g = DESKC.getContext("2d");
      g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, l.w, l.h); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = "high";
      g.drawImage(l.c, 0, 0); g.translate(-l.x, -l.y); drawScreen(g, t, SITES, PURE); drawScreenRim(g);
      smeared(ctx, blurVec("desk", k, [200, 150, 1400, 900]), (q) => drawLayer(q, { ...l, c: DESKC }, "desk", t));
    } else { blit(ctx, layer("desk")); drawScreen(ctx, t, SITES, PURE); drawScreenRim(ctx); }
    // the hands and the forearm (their measured image motion; the right hand swaps between its two drawings)
    const put = (g, name, dx, dy, s = 1, rot = 0, C = null) => {
      const l = layer(name);
      g.save();
      if (C && (s !== 1 || rot)) { g.translate(C[0] + dx, C[1] + dy); g.rotate((rot * Math.PI) / 180); g.scale(s, s); g.translate(-C[0], -C[1]); }
      else g.translate(dx, dy);
      blit(g, l); g.restore();
    };
    const hands = (g) => {
      { const [dx, dy, s, rot] = tab(LH_SET, t); put(g, "lh", dx, dy, s, rot, C_L); }
      if (tab(POSE_B, t)[0] < 0.5) { const [rx, ry] = tab(HAND_R, t), [ax, ay] = tab(HAND_A, t); put(g, "rh", rx, ry); put(g, "arm", ax, ay); }
      else { const [rx, ry] = tab(HAND_RB, t), [ax, ay] = tab(HAND_AB, t); put(g, "rhB", rx, ry, tab(SCALE_R, t)[0], 0, C_RB); put(g, "armB", ax, ay, tab(SCALE_A, t)[0], 0, C_AB); }
    };
    if (settling) {
      const p0 = tab(HAND_RB, t - 0.04), p1 = tab(HAND_RB, t + 0.04);
      smeared(ctx, [((p1[0] - p0[0]) / 2) * EXPOSURE, ((p1[1] - p0[1]) / 2) * EXPOSURE], hands);
    } else hands(ctx);
    // the designer (through the settle his pencil is a rigid piece on its own track, smeared along its own motion)
    if (settling) {
      smeared(ctx, blurVec("fig", k, [1150, 0, 2150, 946]), (q) => drawLayer(q, layer("fig"), "fig", t));
      const a = pencilAt(k), p0 = pencilAt(k - 1) || a, p1 = pencilAt(k + 1);
      const span = (pencilAt(k - 1) ? 1 : 0) + 1;
      smeared(ctx, [((p1[0] - p0[0]) / span) * EXPOSURE, ((p1[1] - p0[1]) / span) * EXPOSURE], (q) => {
        q.save(); q.translate(PENCIL_C[0] + a[0], PENCIL_C[1] + a[1]); q.rotate((a[3] * Math.PI) / 180); q.scale(a[2], a[2]); q.translate(-PENCIL_C[0], -PENCIL_C[1]);
        blit(q, layer("pencil")); q.restore();
      });
      drawLayer(ctx, layer("lips"), "fig", t);
    } else { blit(ctx, layer("fig")); blit(ctx, layer("pencil")); blit(ctx, layer("lips")); }
    // the owl
    if (settling) smeared(ctx, blurVec("owl", k, [1400, 200, 1780, 700]), (q) => drawLayer(q, layer("owl"), "owl", t)); else drawOwl(ctx, t);
    applyLight(ctx, t);
    applyLight2(ctx, t);
    applyTint(ctx, t);
  },
  release() { GAIN = null; GMASK = null; GAIN2 = null; GMASK2 = null; SMEAR = null; TMP = null; DESKC = null; for (const key in FD) delete FD[key]; releaseLayers(); releaseScreen(); releaseRight(); },
};
