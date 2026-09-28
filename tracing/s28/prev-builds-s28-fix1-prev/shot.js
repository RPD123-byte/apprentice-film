// s28 (129.30-136.00), drawn: from behind the laptop, the designer asleep in the sunlit room.
//   orbit (129.30-131.36): room layers re-projected per plane with the measured camera (geo.js), figure key drawings
//   moved by their measured motion (tracks.js), the lid from its measured corners (lid.js);
//   locked (131.36-136.00): the locked room + the locked figure with measured breathing and eye timing.
import { W, H } from "../../../config.js";
import { createGL } from "./gl.js";
import { canvas, trace } from "./kit.js";
import { paintRoomL, paintLightL, paintShafts, CORNER_X, DESK_POLY } from "./roomL.js";
import { paintBodyL, paintFaceL, paintHairL, paintHandL, eyes } from "./figL.js";
import { paintKey } from "./figK.js";
import { paintRightX, paintDeskA, paintDeskB, drawBase, drawChair, drawMug } from "./roomX.js";
import { drawLid, lidQuad } from "./lid.js";
import { BREATH } from "./measure.js";
import { LOCK, Hplane, happly, BACK, RIGHT, DESK } from "./geo.js";
import { TRACKS } from "./tracks.js";
import { overlayEndCard } from "../../s40/card.js";

const REF = 131.6;                                   // locked camera = identity
const frameT = (t) => Math.ceil(t * 25 - 1e-6) / 25;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
// eye openness, measured frame by frame on crops: open until 133.04, shut by 133.40; open again 134.96 -> 135.16
function eyeK(t) {
  if (t < 133.04) return 1;
  if (t < 133.40) return 1 - (t - 133.04) / 0.36;
  if (t < 134.96) return 0;
  if (t < 135.16) return (t - 134.96) / 0.2;
  return 1;
}
// breathing control points (locked-view px, sigma) and their measured displacement per frame
const CPS = [[1200, 540, 140], [1390, 240, 150], [720, 380, 220], [1300, 665, 90], [1000, 790, 160]];
function breath(t) {
  if (t < LOCK) return CPS.map(() => [0, 0]);
  const k = Math.max(0, Math.min(BREATH.length - 1, Math.round((t - BREATH[0][0]) * 25)));
  const r = BREATH[k];
  const hand = [r[7], r[8]];
  return [[r[1], r[2]], [r[3], r[4]], [r[5], r[6]], hand, [hand[0] * 0.8, hand[1] * 0.8]];
}
// measured figure motion of a key drawing at frame t: homography + residual grid (bilinear)
function trackMap(key, t) {
  const T = TRACKS[key];
  if (!T.ts) T.ts = Object.keys(T.f).map(Number);
  let tt = Math.round(t * 25) / 25;
  tt = clamp(tt, Math.min(...T.ts), Math.max(...T.ts));
  const r = T.f[tt.toFixed(2)];
  const { x0, y0, w, h, nx, ny } = T.grid, D = r.D;
  return (x, y) => {
    const [X, Y] = happly(r.H, x, y);
    const u = clamp((x - x0) / w * (nx - 1), 0, nx - 1.0001), v = clamp((y - y0) / h * (ny - 1), 0, ny - 1.0001);
    const i = Math.floor(u), j = Math.floor(v), fu = u - i, fv = v - j;
    const at = (a, b, c) => D[(b * nx + a) * 2 + c];
    const d = (c) => (at(i, j, c) * (1 - fu) + at(i + 1, j, c) * fu) * (1 - fv) + (at(i, j + 1, c) * (1 - fu) + at(i + 1, j + 1, c) * fu) * fv;
    return [X + d(0), Y + d(1)];
  };
}
function clipLayer(src, poly) {
  const c = canvas(W, H), g = c.getContext("2d");
  g.save(); g.beginPath(); trace(g, poly, true, false); g.clip(); g.drawImage(src, 0, 0); g.restore();
  return c;
}

let S = null;
function res() {
  if (S) return S;
  const room = paintRoomL();
  paintLightL(room.getContext("2d"));
  const shaft = canvas(W, H); paintShafts(shaft.getContext("2d"));
  S = { room, shaft, body: paintBodyL(), face: paintFaceL(), hair: paintHairL(), hand: paintHandL(), fig: canvas(W, H), gl: createGL(W, H), figK: -1 };
  return S;
}
function orbitLayers() {
  if (S.backL) return;
  S.backL = clipLayer(S.room, [[0, 0], [CORNER_X, 0], [CORNER_X, 800], [0, 800]]);
  S.rightL = clipLayer(S.room, [[CORNER_X, 0], [W, 0], [W, 930], [1878, 800], [CORNER_X, 800]]);
  S.deskL = clipLayer(S.room, DESK_POLY);
  S.rightX = paintRightX();
  S.deskA = paintDeskA();
  S.deskB = paintDeskB();
}
function composeFig(k) {
  const g = S.fig.getContext("2d");
  g.clearRect(0, 0, W, H);
  g.drawImage(S.body, 0, 0);
  g.drawImage(S.face, 0, 0);
  eyes(g, k);
  g.drawImage(S.hair, 0, 0);
  g.drawImage(S.hand, 0, 0);
  S.fig.__dirty = true;
  S.figK = k;
}

// which figure key(s) at t: [[key, alpha], ...] bottom first. A newer key fades in over two frames on top of the older
// one; the older key stays underneath (full) while it is tracked, filling what the newer key's frame saw only as lid.
const ramp = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
function figKeys(t) {
  if (t < 129.62) return [["A", 1]];
  if (t < 129.97) return [["A", 1], ["B", ramp(t, 129.60, 129.72)]];
  if (t < 130.28) return [["L", 1, true], ["B", 1]];
  if (t < 130.36) { const r = ramp(t, 130.28, 130.36); return [["L", 1, true], ["B", 1 - r], ["L", r]]; }
  return [["L", 1]];
}
function drawOrbit(ctx, tf) {
  orbitLayers();
  const G = S.gl;
  G.begin([0.937, 0.918, 0.859, 1]);
  const plane = (L, ref, P, alpha = 1) => {
    if (alpha <= 0.001) return;
    const Hm = Hplane(ref, tf, P);
    G.draw({ canvas: L }, (x, y) => happly(Hm, x, y), { nx: 32, ny: 16, alpha });
  };
  plane(S.rightX, 129.32, RIGHT);
  plane(S.rightL, REF, RIGHT);
  plane(S.backL, REF, BACK);
  // desk: three views of it, cross-faded (129.32 -> 129.96 -> locked)
  const aB = clamp((tf - 129.76) / 0.24, 0, 1), aL = clamp((tf - 130.48) / 0.32, 0, 1);
  if (aB < 1) plane(S.deskA, 129.32, DESK);
  if (aL < 1) plane(S.deskB, 129.96, DESK, aB);
  plane(S.deskL, REF, DESK, aL);
  ctx.drawImage(G.canvas, 0, 0);
  // props between the room and the figure
  drawChair(ctx, tf);
  drawMug(ctx, tf);
  drawBase(ctx, tf);
  // figure: key drawings moved by their measured motion (a key marked "clip" only fills in round the lid)
  for (const [k, a, clip] of figKeys(tf)) {
    if (a <= 0.001) continue;
    let cv;
    if (k === "L") { if (S.figK !== 1) composeFig(1); cv = S.fig; }
    else cv = S["key" + k] || (S["key" + k] = paintKey(k));
    G.begin([0, 0, 0, 0]);
    G.draw({ canvas: cv }, trackMap(k, tf), { nx: 44, ny: 20, alpha: a });
    ctx.save();
    if (clip) {
      const Q = lidQuad(tf), cx = (Q[0][0] + Q[2][0]) / 2, cy = (Q[0][1] + Q[2][1]) / 2;
      ctx.beginPath();
      Q.forEach(([x, y], i) => { const d = Math.hypot(x - cx, y - cy) || 1, X = x + (x - cx) / d * 70, Y = y + (y - cy) / d * 70; if (i) ctx.lineTo(X, Y); else ctx.moveTo(X, Y); });
      ctx.closePath(); ctx.clip();
    }
    ctx.drawImage(G.canvas, 0, 0);
    ctx.restore();
  }
}

export const shot = {
  draw(ctx, local, t) {
    const tf = frameT(t);
    res();
    if (tf < LOCK) {
      drawOrbit(ctx, tf);
      drawLid(ctx, tf);
      return;
    }
    ctx.drawImage(S.room, 0, 0);
    const k = Math.round(eyeK(tf) * 20) / 20;
    if (k !== S.figK) composeFig(k);
    const d = breath(tf);
    const G = S.gl;
    G.begin([0, 0, 0, 0]);
    G.draw({ canvas: S.fig }, (x, y) => {
      let dx = 0, dy = 0;
      for (let i = 0; i < CPS.length; i++) {
        const [cx, cy, s] = CPS[i];
        const w = Math.exp(-((x - cx) ** 2 + (y - cy) ** 2) / (2 * s * s));
        dx += w * d[i][0]; dy += w * d[i][1];
      }
      return [x + dx, y + dy];
    }, { nx: 44, ny: 20 });
    ctx.drawImage(G.canvas, 0, 0);
    ctx.save(); ctx.globalCompositeOperation = "screen"; ctx.drawImage(S.shaft, 0, 0); ctx.restore();
    drawLid(ctx, tf);
    if (t >= 135.72 && t < 136.0) overlayEndCard(ctx, t);
  },
  release() { if (S) S.gl.release(); S = null; },
};
