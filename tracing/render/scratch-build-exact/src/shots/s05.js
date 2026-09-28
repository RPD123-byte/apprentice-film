// s05 (23.12–26.72): over his shoulder. He types at the laptop with the pencil between his teeth, the owl (in
// headphones, bandage on the back of its head) on his right shoulder; speakers, cartons and cables round the desk.
// The laptop goes from his own site (sōko) to a file window (23.72) and on to Pure Imagination (24.16); the red
// selection and the note card pop up on the page (25.16, 25.44).
//
// Measured on the source (snapshots/s05-study/):
//  - camera: the shot opens on the tail of the move that ends s04 and settles by 23.48 (SIFT per depth layer vs
//    23.52). Every layer moves by a similarity about its own centre that decays as u(t) = (1 - (t-23.12)/0.40)^1.85
//    (fits the room's track to ±3 px). After 23.48 the frame is locked off.
//  - screen timeline: see s05/screen.js. Hands: HAND_R below; owl head: OWL_TILT.
// Layers (settled frame coordinates): room (far) | desk + laptop + screen + hands | the designer | the owl.
import { W, H } from "../config.js";
import { Plate } from "../lib/engrave.js";
import { paintRoom } from "./s05/room.js";
import { paintDeskLayer, DESK_MASK } from "./s05/desk.js";
import { paintFigure, FIG_MASK, paintArm, ARM_MASK } from "./s05/figure.js";
import { paintLeftHand, paintRightHand, LHAND_BOX, RHAND_BOX, LHAND_MASK, RHAND_MASK } from "./s05/hands.js";
import { owlCanvases, releaseOwl, OWL_BOX, HEAD_PIVOT } from "./s05/owl.js";
import { drawScreen, releaseScreen } from "./s05/screen.js";
import { maskOf, applyMask } from "./s05/kit.js";

let SITES = null, PURE = null;
try { SITES = await import("../lib/sites.js"); } catch (e) { console.warn("[s05] sites.js unavailable:", e); }
try { PURE = await import("../lib/pureimg.js"); } catch (e) { console.warn("[s05] pureimg.js unavailable:", e); }
try {
  await Promise.all(["900 79px Archivo", "800 40px Archivo", "600 20px Geist", "500 20px Geist", "400 20px 'Geist Mono'", "400 20px Shrikhand", "900 20px 'Fraunces Soft'", "500 20px Poppins", "600 20px Poppins", "700 20px Poppins"].map((f) => document.fonts.load(f)));
} catch (e) { /* pages fall back to system faces */ }

const T0 = 23.12;

// ---------- camera settle: per-layer similarity about a centre, scaled by u(t) (fitted on 23.12–23.48)
// [scale-1, rotation (deg), dx, dy, cx, cy]
const SETTLE = {
  room: [0.0459, -1.30, -163.0, 51.1, 600, 300],
  desk: [0.0639, -2.99, -111.5, 74.9, 700, 650],
  fig: [0.0403, -0.65, 18.1, 26.2, 1650, 500],
  owl: [0.0182, -1.58, 47.9, 23.9, 1580, 440],
};
const settleU = (t) => { const x = (t - T0) / 0.4; return x >= 1 ? 0 : Math.pow(1 - Math.max(0, x), 1.85); };
function layerXf(ctx, name, t) {
  const u = settleU(t);
  if (u <= 0) return;
  const [S, R, dx, dy, cx, cy] = SETTLE[name];
  const s = 1 + S * u, a = (R * u * Math.PI) / 180;
  ctx.translate(cx + dx * u, cy + dy * u);
  ctx.rotate(a); ctx.scale(s, s);
  ctx.translate(-cx, -cy);
}

// ---------- the right hand and forearm slide on the trackpad (template match per source frame vs 24.80, where the
// hand was traced): out to the right as the file window opens, back left 24.32–24.80, right again 25.12–25.48.
// The left hand never moves (match 0.99+ on every frame). Before 23.56 the camera move hides it; held.
const HAND_R = [[23.56, 35.0, -13.7], [23.60, 33.8, -11.0], [23.64, 32.3, -9.9], [23.68, 34.2, -11.0], [23.72, 44.3, -14.9], [23.76, 50.4, -17.1], [23.80, 57.4, -19.9], [23.84, 61.6, -21.4], [23.88, 64.9, -22.1], [23.92, 66.0, -22.2], [24.04, 66.3, -22.2], [24.24, 66.3, -22.1], [24.28, 65.5, -21.8], [24.32, 62.2, -20.9], [24.36, 58.9, -20.0], [24.40, 54.9, -18.9], [24.44, 49.5, -16.8], [24.48, 42.9, -15.0], [24.52, 35.8, -12.7], [24.56, 28.8, -10.7], [24.60, 21.7, -8.0], [24.64, 14.1, -5.0], [24.68, 8.6, -3.0], [24.72, 4.1, -1.4], [24.76, 1.6, -0.5], [24.80, -0.0, 0.0], [24.84, -0.9, 0.2], [24.88, -1.2, 0.2], [25.00, -1.3, 0.2], [25.04, -0.3, -0.7], [25.08, -0.3, -0.7], [25.12, 3.0, -2.9], [25.16, 10.1, -7.3], [25.20, 16.6, -10.5], [25.24, 23.0, -12.8], [25.28, 26.1, -12.9], [25.32, 30.2, -13.5], [25.36, 34.0, -14.6], [25.40, 36.8, -15.1], [25.44, 38.5, -15.3], [25.48, 40.1, -15.2], [26.68, 40.3, -15.2]];
// the owl's head dips toward the screen and back (template match on the head: up to (-6.9, +5.7) px at 26.00–26.08,
// the body still), drawn as a turn of the head layer about the back of its neck
const OWL_TILT = [[25.76, 0], [25.80, -0.0062], [25.84, -0.0165], [25.88, -0.0313], [25.92, -0.0524], [25.96, -0.0649], [26.00, -0.0684], [26.08, -0.0684], [26.12, -0.0639], [26.16, -0.0537], [26.20, -0.0399], [26.24, -0.0268], [26.28, -0.0193], [26.32, -0.0043], [26.36, 0]];
function tab(T, t) {
  if (t <= T[0][0]) return T[0].slice(1);
  for (let i = 1; i < T.length; i++) if (t <= T[i][0]) {
    const a = T[i - 1], b = T[i], f = (t - a[0]) / (b[0] - a[0]);
    return a.slice(1).map((v, k) => v + (b[k + 1] - v) * f);
  }
  return T[T.length - 1].slice(1);
}

// ---------- the screen lights the room: while his dark sōko page and then the white window are up (to 24.0) the
// room reads brighter than once Pure Imagination is on screen. Measured as the source's non-screen mean luminance
// against 24.60 (where the plates were calibrated); blurred per-block ratios put the change mostly on the desk side
// (1.3–1.4 left of x 1250) and little on the figure at right (1.07 beyond x 1700). A = gain amplitude on the left.
const LIGHT = [[23.12, 0.245], [23.24, 0.243], [23.32, 0.27], [23.40, 0.313], [23.48, 0.337], [23.56, 0.33], [23.64, 0.30], [23.72, 0.28], [23.80, 0.27], [23.88, 0.27], [23.96, 0.26], [24.04, 0.135], [24.12, 0.04], [24.20, -0.04], [24.28, -0.025], [24.36, 0], [24.60, 0], [24.76, 0.03], [24.92, 0.012], [25.08, -0.037], [25.24, -0.02], [25.40, -0.04], [25.56, -0.013], [25.72, 0.027], [25.88, 0.0], [26.04, 0.004], [26.20, -0.02], [26.36, -0.065], [26.52, -0.017], [26.68, -0.012]];
const lightW = (x) => (x < 1250 ? 1 : x > 1700 ? 0.2 : 1 - 0.8 * (x - 1250) / 450);
let GAIN = null, GMASK = null;
function applyLight(ctx, t) {
  const A = tab(LIGHT, t)[0] * 0.75;     // pre-grade gain: the grade's S-curve expands it (fitted: 0.75 lands the measured ratio)
  if (Math.abs(A) < 0.004) return;
  const c = ctx.canvas;
  const screenOut = (g) => { g.save(); layerXf(g, "desk", t); g.beginPath(); SCREEN_Q.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.restore(); };
  if (!GMASK) {
    GMASK = document.createElement("canvas"); GMASK.width = W; GMASK.height = 1;
    const m = GMASK.getContext("2d"), gr = m.createLinearGradient(0, 0, W, 0);
    gr.addColorStop(0, "rgba(0,0,0,1)"); gr.addColorStop(1250 / W, "rgba(0,0,0,1)"); gr.addColorStop(1700 / W, "rgba(0,0,0,0.2)"); gr.addColorStop(1, "rgba(0,0,0,0.2)");
    m.fillStyle = gr; m.fillRect(0, 0, W, 1);
  }
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (A > 0) {
    // frame * (1 + A·w): add a copy of the frame weighted by A·w, the screen cut out of the copy
    if (!GAIN) { GAIN = document.createElement("canvas"); GAIN.width = W; GAIN.height = H; }
    const g = GAIN.getContext("2d");
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = "copy"; g.globalAlpha = 1; g.drawImage(c, 0, 0);
    g.globalCompositeOperation = "destination-in"; g.globalAlpha = Math.min(1, A); g.drawImage(GMASK, 0, 0, W, H);
    g.globalCompositeOperation = "destination-out"; g.globalAlpha = 1; screenOut(g); g.fillStyle = "#000"; g.fill();
    g.globalCompositeOperation = "source-over";
    ctx.globalCompositeOperation = "lighter"; ctx.drawImage(GAIN, 0, 0);
  } else {
    // frame * (1 - |A|·w): black laid over at that alpha, clipped away from the screen
    ctx.beginPath(); ctx.rect(0, 0, W, H); layerXf(ctx, "desk", t); SCREEN_Q.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath();
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clip("evenodd");
    ctx.globalAlpha = -A; ctx.drawImage(GMASK, 0, 0, W, H);
  }
  ctx.restore();
}
const SCREEN_Q = [[315, 246], [834, 168], [898, 519], [409, 648]];

// ---------- layers (built once)
const ROOM_M = [60, 80, 160, 40];   // margins: left, top, right, bottom
let L = null;
function plateLayer(x, y, w, h, scale, paint, seed, spacing = 4.6, mask = null) {
  const P = new Plate(w, h, scale);
  for (const g of [P.v, P.d, P.o]) g.translate(-x, -y);
  paint(P);
  const c = P.engrave({ spacing, seed, contrast: 1.0 });
  if (mask) applyMask(c, maskOf(w, h, scale, mask, { ox: x, oy: y, grow: 1.5 }));
  return { c, x, y, w, h };
}
function layers() {
  if (L) return L;
  const [ml, mt, mr, mb] = ROOM_M;
  const room = plateLayer(-ml, -mt, W + ml + mr, H + mt + mb, 1, paintRoom, 7, 4.4);
  const desk = plateLayer(-60, 0, W + 60, H + 60, 1, paintDeskLayer, 11, 4.4, DESK_MASK);
  const fig = plateLayer(760, -80, W - 760 + 160, H + 80 + 60, 1, paintFigure, 13, 4.2, FIG_MASK);
  const arm = plateLayer(1140, 600, 460, 230, 1, paintArm, 23, 4.2, ARM_MASK);
  const lh = plateLayer(...LHAND_BOX, 1, paintLeftHand, 17, 4.2, LHAND_MASK);
  const rh = plateLayer(...RHAND_BOX, 1, paintRightHand, 19, 4.2, RHAND_MASK);
  const owl = owlCanvases();
  L = { room, desk, fig, arm, lh, rh, owl };
  return L;
}
const blit = (ctx, l) => ctx.drawImage(l.c, l.x, l.y, l.w, l.h);

export const shot = {
  draw(ctx, local, t) {
    // Hold each 25 fps source frame (a no-op in the film render, which samples frame times exactly); previews and
    // the snapshot tool sample slightly early, and holding keeps every measured per-frame table on its frame.
    t = Math.ceil(t * 25 - 1e-6) / 25;
    const Ls = layers();
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
    // room
    ctx.save(); layerXf(ctx, "room", t); blit(ctx, Ls.room); ctx.restore();
    // desk, laptop, screen, hands
    ctx.save(); layerXf(ctx, "desk", t);
    blit(ctx, Ls.desk);
    drawScreen(ctx, t, SITES, PURE);
    blit(ctx, Ls.lh);
    const f = t;                                             // measured per source frame
    const [rx, ry] = tab(HAND_R, f);
    ctx.save(); ctx.translate(rx, ry); blit(ctx, Ls.rh); ctx.restore();
    ctx.restore();
    // the designer: the forearm slides with the hand, under the back of the sweatshirt
    ctx.save(); layerXf(ctx, "fig", t);
    ctx.save(); ctx.translate(rx, ry); blit(ctx, Ls.arm); ctx.restore();
    blit(ctx, Ls.fig);
    ctx.restore();
    // the owl
    ctx.save(); layerXf(ctx, "owl", t);
    const [ox, oy, ow, oh] = OWL_BOX;
    ctx.drawImage(Ls.owl.body, ox, oy, ow, oh);
    const [th] = tab(OWL_TILT, f);
    if (th) { ctx.translate(HEAD_PIVOT[0], HEAD_PIVOT[1]); ctx.rotate(th); ctx.translate(-HEAD_PIVOT[0], -HEAD_PIVOT[1]); }
    ctx.drawImage(Ls.owl.head, ox, oy, ow, oh);
    ctx.restore();
    applyLight(ctx, t);
  },
  release() { L = null; GAIN = null; GMASK = null; releaseOwl(); releaseScreen(); },
};
