// FIX PASS 1 version of src/shots/s05.js (kept for reference, not imported). Imports re-pointed at the legacy
// painters in this folder; to restore, copy it back to src/shots/s05.js with the imports pointed at ./s05/... and put
// the legacy painters back in src/shots/s05/ (see fidelity/s05.md).
// s05 (23.12–26.72): over his shoulder. He types with the pencil between his teeth, the owl (in headphones, bandage on the back of its head) on his right shoulder; speakers, cartons and cables round the desk.
import { W, H } from "../../../config.js";
import { Plate } from "../../../lib/engrave.js";
import { paintRoom } from "./room.js";
import { paintDeskLayer, DESK_MASK } from "./desk.js";
import { paintFigure, FIG_MASK, paintArm, ARM_MASK } from "./figure.js";
import { paintLeftHand, paintRightHand, LHAND_BOX, RHAND_BOX, LHAND_MASK, RHAND_MASK } from "./hands.js";
import { owlCanvases, releaseOwl, OWL_BOX, HEAD_PIVOT } from "./owl.js";
import { drawScreen, releaseScreen } from "../screen.js";
import { maskOf, applyMask } from "../kit.js";

let SITES = null, PURE = null;
try { SITES = await import("../../../lib/sites.js"); } catch (e) { console.warn("[s05] sites.js unavailable:", e); }
try { PURE = await import("../../../lib/pureimg.js"); } catch (e) { console.warn("[s05] pureimg.js unavailable:", e); }
try {
  await Promise.all(["900 79px Archivo", "800 40px Archivo", "600 20px Geist", "500 20px Geist", "400 20px 'Geist Mono'", "400 20px Shrikhand", "900 20px 'Fraunces Soft'", "500 20px Poppins", "600 20px Poppins", "700 20px Poppins"].map((f) => document.fonts.load(f)));
} catch (e) { /* pages fall back to system faces */ }

const T0 = 23.12;
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
const HAND_R = [[23.56, 35.0, -13.7], [23.60, 33.8, -11.0], [23.64, 32.3, -9.9], [23.68, 34.2, -11.0], [23.72, 44.3, -14.9], [23.76, 50.4, -17.1], [23.80, 57.4, -19.9], [23.84, 61.6, -21.4], [23.88, 64.9, -22.1], [23.92, 66.0, -22.2], [24.04, 66.3, -22.2], [24.24, 66.3, -22.1], [24.28, 65.5, -21.8], [24.32, 62.2, -20.9], [24.36, 58.9, -20.0], [24.40, 54.9, -18.9], [24.44, 49.5, -16.8], [24.48, 42.9, -15.0], [24.52, 35.8, -12.7], [24.56, 28.8, -10.7], [24.60, 21.7, -8.0], [24.64, 14.1, -5.0], [24.68, 8.6, -3.0], [24.72, 4.1, -1.4], [24.76, 1.6, -0.5], [24.80, -0.0, 0.0], [24.84, -0.9, 0.2], [24.88, -1.2, 0.2], [25.00, -1.3, 0.2], [25.04, -0.3, -0.7], [25.08, -0.3, -0.7], [25.12, 3.0, -2.9], [25.16, 10.1, -7.3], [25.20, 16.6, -10.5], [25.24, 23.0, -12.8], [25.28, 26.1, -12.9], [25.32, 30.2, -13.5], [25.36, 34.0, -14.6], [25.40, 36.8, -15.1], [25.44, 38.5, -15.3], [25.48, 40.1, -15.2], [26.68, 40.3, -15.2]];
const RH_SET = [[23.12, -38.9, 45.2, 1.06], [23.16, -25.6, 33.8, 1.04], [23.20, -14.0, 24.1, 1.03], [23.24, -4.3, 15.4, 1.02], [23.28, 3.4, 8.7, 1.01], [23.32, 13.3, 1.7, 1.01], [23.36, 19.7, -4.7, 1.0], [23.40, 25.7, -8.7, 1.0], [23.44, 29.7, -11.7, 1.0], [23.48, 32.7, -13.7, 1.0], [23.52, 35.0, -13.7, 1.0]];
const LH_SET = [[23.12, -73.6, 86.0, 1.12], [23.16, -60.0, 68.5, 1.10], [23.20, -49.4, 55.0, 1.08], [23.24, -39.8, 43.5, 1.06], [23.28, -32.0, 33.8, 1.05], [23.32, -23.4, 23.2, 1.03], [23.36, -15.6, 15.5, 1.02], [23.40, -9.8, 9.8, 1.01], [23.44, -5.8, 5.8, 1.01], [23.48, -1.8, 2.8, 1.0], [23.52, 0, 0, 1.0]];
const FA_SET = [[23.12, -23.0, 44.8, 1.05], [23.16, -12.0, 35.8, 1.05], [23.20, -3.6, 28.2, 1.03], [23.24, 4.6, 21.5, 1.02], [23.28, 10.6, 16.5, 1.02], [23.32, 17.8, 9.8, 1.01], [23.36, 22.8, 4.8, 1.01], [23.40, 26.8, 1.8, 1.0], [23.44, 29.2, -0.8, 1.0], [23.48, 31.2, -2.8, 1.0], [23.52, 32.9, -4.4, 1.0]];
const T_SET = 23.52;
const ARM_K = [0.94, 0.32];
const OWL_TILT = [[25.76, 0], [25.80, -0.0062], [25.84, -0.0165], [25.88, -0.0313], [25.92, -0.0524], [25.96, -0.0649], [26.00, -0.0684], [26.08, -0.0684], [26.12, -0.0639], [26.16, -0.0537], [26.20, -0.0399], [26.24, -0.0268], [26.28, -0.0193], [26.32, -0.0043], [26.36, 0]];
function tab(T, t) {
  if (t <= T[0][0]) return T[0].slice(1);
  for (let i = 1; i < T.length; i++) if (t <= T[i][0]) {
    const a = T[i - 1], b = T[i], f = (t - a[0]) / (b[0] - a[0]);
    return a.slice(1).map((v, k) => v + (b[k + 1] - v) * f);
  }
  return T[T.length - 1].slice(1);
}
const LIGHT = [[23.12, 0.34], [23.24, 0.335], [23.32, 0.325], [23.40, 0.33], [23.48, 0.337], [23.56, 0.33], [23.64, 0.30], [23.72, 0.28], [23.80, 0.27], [23.88, 0.27], [23.96, 0.26], [24.04, 0.135], [24.12, 0.04], [24.20, -0.04], [24.28, -0.025], [24.36, 0], [24.60, 0], [24.76, 0.03], [24.92, 0.012], [25.08, -0.037], [25.24, -0.02], [25.40, -0.04], [25.56, -0.013], [25.72, -0.03], [25.88, 0.0], [26.04, 0.004], [26.20, -0.02], [26.36, -0.065], [26.52, -0.017], [26.68, -0.012]];
let GAIN = null, GMASK = null;
function applyLight(ctx, t) {
  const A = tab(LIGHT, t)[0] * 0.75;
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
    if (!GAIN) { GAIN = document.createElement("canvas"); GAIN.width = W; GAIN.height = H; }
    const g = GAIN.getContext("2d");
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = "copy"; g.globalAlpha = 1; g.drawImage(c, 0, 0);
    g.globalCompositeOperation = "destination-in"; g.globalAlpha = Math.min(1, A); g.drawImage(GMASK, 0, 0, W, H);
    g.globalCompositeOperation = "destination-out"; g.globalAlpha = 1; screenOut(g); g.fillStyle = "#000"; g.fill();
    g.globalCompositeOperation = "source-over";
    ctx.globalCompositeOperation = "lighter"; ctx.drawImage(GAIN, 0, 0);
  } else {
    ctx.beginPath(); ctx.rect(0, 0, W, H); layerXf(ctx, "desk", t); SCREEN_Q.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath();
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clip("evenodd");
    ctx.globalAlpha = -A; ctx.drawImage(GMASK, 0, 0, W, H);
  }
  ctx.restore();
}
const SCREEN_Q = [[315, 246], [834, 168], [898, 519], [409, 648]];
const ROOM_M = [60, 80, 160, 40];
let L = null;
function plateLayer(x, y, w, h, scale, paint, seed, spacing = 4.6, mask = null) {
  const P = new Plate(w, h, scale);
  for (const g of [P.v, P.d, P.o]) g.translate(-x, -y);
  paint(P);
  const c = P.engrave({ spacing, seed, contrast: 1.0 });
  if (mask) applyMask(c, maskOf(w, h, scale, mask, { ox: x, oy: y, grow: 1.5 }));
  return { c, x, y, w, h };
}
function soften(c, px) {
  const t = document.createElement("canvas"); t.width = c.width; t.height = c.height;
  const g = t.getContext("2d"); g.filter = `blur(${px}px)`; g.drawImage(c, 0, 0);
  const d = c.getContext("2d"); d.save(); d.setTransform(1, 0, 0, 1, 0, 0); d.globalCompositeOperation = "copy"; d.drawImage(t, 0, 0); d.restore();
  return c;
}
const BLUR_ROOM = [[23.12, 7], [23.20, 6], [23.28, 5], [23.32, 5], [23.40, 3], [23.44, 2], [23.48, 1], [23.52, 0]];
const BLUR_ALL = [[23.12, 3.5], [23.32, 3], [23.40, 2.5], [23.44, 2], [23.48, 1], [23.52, 0]];
let SMEAR = null;
function smearCanvas() { if (!SMEAR) { SMEAR = document.createElement("canvas"); SMEAR.width = W; SMEAR.height = H; } return SMEAR; }
function smeared(ctx, L, paint) {
  if (L < 0.8) { paint(ctx); return; }
  const S = smearCanvas(), g = S.getContext("2d");
  const tmp = smeared.tmp || (smeared.tmp = document.createElement("canvas"));
  if (tmp.width !== W) { tmp.width = W; tmp.height = H; }
  const q = tmp.getContext("2d");
  q.setTransform(1, 0, 0, 1, 0, 0); q.clearRect(0, 0, W, H); q.imageSmoothingEnabled = true; q.imageSmoothingQuality = "high";
  paint(q);
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H); g.globalCompositeOperation = "lighter";
  const N = Math.max(3, Math.round(L) + 1);
  for (let k = 0; k < N; k++) { const d = (k / (N - 1) - 0.5) * L; g.globalAlpha = 1 / N; g.drawImage(tmp, d, -0.2 * d); }
  g.globalAlpha = 1; g.globalCompositeOperation = "source-over";
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(S, 0, 0); ctx.restore();
}
function smearFrame(ctx, L) {
  if (L < 0.8) return;
  const tmp = smeared.tmp || (smeared.tmp = document.createElement("canvas"));
  if (tmp.width !== W) { tmp.width = W; tmp.height = H; }
  const q = tmp.getContext("2d"); q.setTransform(1, 0, 0, 1, 0, 0); q.globalCompositeOperation = "copy"; q.drawImage(ctx.canvas, 0, 0); q.globalCompositeOperation = "source-over";
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = "lighter";
  const N = Math.max(3, Math.round(L) + 1);
  for (let k = 0; k < N; k++) { const d = (k / (N - 1) - 0.5) * L; ctx.globalAlpha = 1 / N; ctx.drawImage(tmp, d, -0.2 * d); }
  ctx.restore();
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
  const oc = owlCanvases(), copy = (c) => { const k = document.createElement("canvas"); k.width = c.width; k.height = c.height; k.getContext("2d").drawImage(c, 0, 0); return k; };
  const owl = { body: soften(copy(oc.body), 0.55), head: soften(copy(oc.head), 0.55) };
  soften(room.c, 0.6); soften(desk.c, 0.4);
  for (const l of [fig, arm, lh, rh]) soften(l.c, 0.55);
  L = { room, desk, fig, arm, lh, rh, owl };
  return L;
}
const blit = (ctx, l) => ctx.drawImage(l.c, l.x, l.y, l.w, l.h);

export const shot = {
  draw(ctx, local, t) {
    t = Math.ceil(t * 25 - 1e-6) / 25;
    const Ls = layers();
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
    smeared(ctx, tab(BLUR_ROOM, t)[0], (g) => { g.save(); layerXf(g, "room", t); blit(g, Ls.room); g.restore(); });
    ctx.save(); layerXf(ctx, "desk", t);
    blit(ctx, Ls.desk);
    drawScreen(ctx, t, SITES, PURE);
    ctx.restore();
    const f = t;
    const [rx, ry] = tab(HAND_R, f);
    const place = (l, T, k = [1, 1]) => {
      ctx.save();
      if (t < T_SET) { const [dx, dy, sc] = tab(T, t), cx = l.x + l.w / 2, cy = l.y + l.h / 2; ctx.translate(cx + dx, cy + dy); ctx.scale(sc, sc); ctx.translate(-cx, -cy); }
      else if (T !== LH_SET) ctx.translate(rx * k[0], ry * k[1]);
      blit(ctx, l); ctx.restore();
    };
    place(Ls.lh, LH_SET);
    place(Ls.rh, RH_SET);
    place(Ls.arm, FA_SET, ARM_K);
    ctx.save(); layerXf(ctx, "fig", t);
    blit(ctx, Ls.fig);
    ctx.restore();
    ctx.save(); layerXf(ctx, "owl", t);
    const [ox, oy, ow, oh] = OWL_BOX;
    ctx.drawImage(Ls.owl.body, ox, oy, ow, oh);
    const [th] = tab(OWL_TILT, f);
    if (th) { ctx.translate(HEAD_PIVOT[0], HEAD_PIVOT[1]); ctx.rotate(th); ctx.translate(-HEAD_PIVOT[0], -HEAD_PIVOT[1]); }
    ctx.drawImage(Ls.owl.head, ox, oy, ow, oh);
    ctx.restore();
    smearFrame(ctx, tab(BLUR_ALL, t)[0]);
    applyLight(ctx, t);
  },
  release() { L = null; GAIN = null; GMASK = null; SMEAR = null; smeared.tmp = null; releaseOwl(); releaseScreen(); },
};
