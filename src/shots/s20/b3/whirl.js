// s20 fix pass 2: the whirl (67.40–67.76, source frames 1685–1694). The owl spins round with the scissors: every
// source frame shows the owl drawn in a new orientation, motion-blurred, with the raised wing and the scissors smeared
// into bright swept fans round the shoulder. Here each frame is
//   - the owl drawing of that frame (owl.js, WHIRL poses), stamped n times round a pivot / along a shift and averaged
//     (a rotational motion blur), then blurred `blur` px: the blur per frame is set from the source's high-pass level
//     in the owl box (src 9.0 / 6.6 / 4.8 / 4.0 / 4.0 / 3.9 / 4.5 / 5.7 / 6.7 / 9.1 for 1685 … 1694);
//   - the swept fans: one feathered wing sprite (featherWing, the same wing drawing the other poses use) stamped
//     along the turn round a pivot (bright, overlapping, so the feather tips leave streaks along the arc), and the
//     scissors sprite stamped along the same turn; blurred 3–6 px. Extents measured on 1.0–1.1x gridded crops of each
//     source frame (frame px; B2 camera, converted with toA).
// All seeded; scratch canvases are reused (pure function of the frame).
import { owlAt, toA } from "./owl.js";
import { drawScissorsLocal, HOLD } from "./scissors.js";
import { featherWing, setPX } from "./owlparts.js";
import { setPPU } from "../../../lib/owlInk.js";

const KA = 1 / 0.978;                    // B2 px -> A px (the B2 camera's mean scale)
// scratch region in A coordinates
const X0 = 300, Y0 = -120, CW = 1750, CH = 1100;
let OC = null, FC = null, WING = null, SCI = null;
function scratch() {
  if (!OC) {
    OC = document.createElement("canvas"); OC.width = CW; OC.height = CH;
    FC = document.createElement("canvas"); FC.width = CW; FC.height = CH;
  }
}
// the wing sprite: a spread feathered wing pointing along +x from the shoulder at (WX, WY), 400 px long
const WX = 30, WY = 150, WL = 400;
function wingSprite() {
  if (WING) return WING;
  const c = document.createElement("canvas"); c.width = 470; c.height = 330;
  const g = c.getContext("2d");
  setPPU(1); setPX(1);
  g.translate(WX, WY);
  featherWing(g, { S: [0, 0], W: [170, -14], T: [WL, 6], w: 58, trail: 1, n: 9, fan: 0.95, shrink: 0.38, pw: 0.7, seed: 83, hand: 0.35, shadow: 0, from: 0, base: 0.97, under: 0.8 });
  // fade the part near the shoulder: every stamp overlaps there, so it would saturate into a white blob
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = "destination-in";
  const q = g.createLinearGradient(WX, 0, WX + WL, 0);
  q.addColorStop(0, "rgba(0,0,0,0.05)"); q.addColorStop(0.3, "rgba(0,0,0,0.35)"); q.addColorStop(0.55, "rgba(0,0,0,0.9)"); q.addColorStop(1, "rgba(0,0,0,1)");
  g.fillStyle = q; g.fillRect(0, 0, c.width, c.height); g.globalCompositeOperation = "source-over";
  WING = c;
  return c;
}
// scissors sprite: the hold drawing (open, face-on loops), pivot at the centre, blades toward +y, pre-blurred 1.5 px
function sciSprite() {
  if (SCI) return SCI;
  const s = HOLD.s * KA, R = Math.ceil(430 * s), c = document.createElement("canvas"); c.width = c.height = R * 2;
  const g = c.getContext("2d"); g.filter = "blur(1.5px)"; g.translate(R, R); g.scale(s, s);
  drawScissorsLocal(g, { open: HOLD.open, loops: HOLD.loops, wide: HOLD.wide, blen: HOLD.blen });
  SCI = { c, R, s };
  return SCI;
}

// per frame: owl motion blur { pv: pivot (B2 px), da: rotation span (rad), sh: [dx, dy] shift span (px), n, blur }
// and the fans: { p: pivot (B2 px), a0, a1 (screen radians), r: wing length (B2 px), al: alpha per stamp, n, sy:
// sprite thickness factor, sc: scissors { d: pivot distance from p, s: scale, al, off: blade angle offset } }
const WH = new Map([
  [1685, { owl: { pv: [990, 600], da: 0.05, sh: [0, 0], n: 7, blur: 1.6 },
    fans: [{ p: [930, 430], a0: -1.9, a1: -1.12, r: 410, al: 0.11, n: 26, sy: 1.1 },
      { p: [905, 470], a0: 1.5, a1: 1.78, r: 0, al: 0, n: 0, sc: { d: 110, s: 0.72, al: 0.12, n: 10 } }] }],
  [1686, { owl: { pv: [1050, 600], da: 0.08, sh: [-16, 0], n: 9, blur: 2.2 },
    fans: [{ p: [1060, 420], a0: 2.2, a1: 3.25, r: 300, al: 0.07, n: 24, sy: 1.15 },
      { p: [1070, 400], a0: -1.4, a1: -0.55, r: 470, al: 0.11, n: 28, sy: 1.2, sc: { d: 170, s: 0.9, al: 0.05, n: 14 } }] }],
  [1687, { owl: { pv: [1120, 620], da: 0.08, sh: [-14, 0], n: 9, blur: 2.2 },
    fans: [{ p: [1120, 470], a0: -3.25, a1: -1.95, r: 320, al: 0.07, n: 26, sy: 1.2 },
      { p: [1150, 440], a0: -1.75, a1: 0.05, r: 400, al: 0.09, n: 34, sy: 1.15, sc: { d: 150, s: 0.85, al: 0.045, n: 16 } }] }],
  [1688, { owl: { pv: [1160, 620], da: 0.05, sh: [8, 0], n: 7, blur: 1.8 },
    fans: [{ p: [1150, 390], a0: -2.08, a1: -1.12, r: 380, al: 0.11, n: 28, sy: 1.2, sc: { d: 120, s: 0.8, al: 0.045, n: 14 } }] }],
  [1689, { owl: { pv: [1160, 620], da: 0.05, sh: [8, 0], n: 7, blur: 1.8 },
    fans: [{ p: [1152, 392], a0: -2.05, a1: -1.1, r: 380, al: 0.11, n: 28, sy: 1.2, sc: { d: 120, s: 0.8, al: 0.045, n: 14 } }] }],
  [1690, { owl: { pv: [1150, 600], da: 0.05, sh: [10, 0], n: 7, blur: 1.8 },
    fans: [{ p: [1245, 440], a0: -1.95, a1: -0.95, r: 420, al: 0.11, n: 28, sy: 1.25, sc: { d: 140, s: 0.85, al: 0.045, n: 14 } },
      { p: [1120, 560], a0: 2.9, a1: 3.4, r: 170, al: 0.07, n: 12, sy: 1 }] }],
  [1691, { owl: { pv: [1125, 620], da: 0.06, sh: [-10, 0], n: 9, blur: 2.2 },
    fans: [{ p: [1100, 400], a0: -2.9, a1: -1.55, r: 360, al: 0.1, n: 30, sy: 1.25, sc: { d: 120, s: 0.8, al: 0.045, n: 14 } }] }],
  [1692, { owl: { pv: [1150, 620], da: 0.02, sh: [-6, 0], n: 5, blur: 1 },
    fans: [{ p: [1010, 370], a0: -0.78, a1: -0.36, r: 540, al: 0.08, n: 22, sy: 1.3 }],
    smear: { p: [1060, 330], th0: -0.98, th1: -0.66, n: 22 } }],
  [1693, { owl: { pv: [1080, 640], da: 0.03, sh: [0, 0], n: 5, blur: 1.4 },
    smear: { p: [912, 387], th0: -1.75, th1: -1.33, n: 22 } }],
  [1694, { owl: { pv: [1080, 640], da: 0.01, sh: [0, 0], n: 3, blur: 1 }, smear: { p: [955, 430], th0: -1.12, th1: -0.99, n: 22 } }],
]);
export const isWhirl = (fr) => WH.has(fr);

function drawOwlBlur(g, fr, o) {
  const L = owlAt(fr);
  if (!o) { g.drawImage(L.canvas, L.x, L.y, L.w, L.h); return; }
  scratch();
  const c = OC.getContext("2d");
  c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, CW, CH);
  c.setTransform(1, 0, 0, 1, -X0, -Y0);
  c.globalCompositeOperation = "lighter";
  const [px, py] = toA(...o.pv);
  for (let i = 0; i < o.n; i++) {
    const u = o.n === 1 ? 0 : i / (o.n - 1) - 0.5;
    c.save(); c.globalAlpha = 1 / o.n;
    c.translate(px + o.sh[0] * u, py + o.sh[1] * u); c.rotate(o.da * u); c.translate(-px, -py);
    c.drawImage(L.canvas, L.x, L.y, L.w, L.h);
    c.restore();
  }
  c.globalCompositeOperation = "source-over";
  g.save(); if (o.blur > 0) g.filter = `blur(${o.blur.toFixed(1)}px)`; g.drawImage(OC, X0, Y0); g.restore();
}
function drawFans(g, fans) {
  scratch();
  const c = FC.getContext("2d");
  c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, CW, CH);
  c.setTransform(1, 0, 0, 1, -X0, -Y0);
  const W = wingSprite(), S = sciSprite();
  for (const f of fans) {
    const [px, py] = toA(...f.p);
    const env = (u) => 0.35 + 0.65 * Math.min(1, u * 3.5, (1 - u) * 3.5);
    // the scissors first (the wing is in front of them)
    if (f.sc) {
      const m = f.sc.n;
      for (let i = 0; i < m; i++) {
        const u = (i + 0.5) / m, a = f.a0 + (f.a1 - f.a0) * u;
        c.save(); c.globalAlpha = f.sc.al * env(u);
        c.translate(px, py); c.rotate(a); c.translate(f.sc.d * KA, 0); c.rotate(-Math.PI / 2 + (f.sc.off || 0));
        c.scale(f.sc.s, f.sc.s); c.drawImage(S.c, -S.R, -S.R);
        c.restore();
      }
    }
    // dense stamps (about 3 px apart at the tip) so every feather tip and separation line draws a continuous streak
    // along the turn; the per-stamp alpha keeps the total the same as `al` at 26 stamps
    const n = f.r > 0 ? Math.max(8, Math.ceil(Math.abs(f.a1 - f.a0) * f.r / 3)) : 0, al = 1 - Math.pow(1 - f.al, 26 / Math.max(1, n));
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5) / n, a = f.a0 + (f.a1 - f.a0) * u, k = f.r * KA / WL;
      c.save(); c.globalAlpha = al * env(u);
      c.translate(px, py); c.rotate(a); c.scale(k, k * (f.sy || 1)); c.drawImage(W, -WX, -WY);
      c.restore();
    }
  }
  g.save(); g.filter = "blur(2.5px)"; g.drawImage(FC, X0, Y0); g.restore();
}
function drawSmear(g, m) {
  const S = sciSprite(), [px, py] = toA(m.p[0], m.p[1]), n = m.n;
  g.save();
  for (let k = 0; k < n; k++) {
    const u = (k + 0.5) / n, th = m.th0 + (m.th1 - m.th0) * u;
    g.globalAlpha = Math.min(1, (2.2 / n) * (0.35 + 0.9 * u));
    g.save(); g.translate(px, py); g.rotate(th - Math.PI / 2); g.scale(1 / KA, 1 / KA); g.drawImage(S.c, -S.R, -S.R); g.restore();
  }
  g.restore();
}
// draws the whirl frame fr (under the camera transform, A coordinates): smeared scissors, owl, fans
export function drawWhirl(g, fr, dbg = {}) {
  const w = WH.get(fr);
  if (w.smear) drawSmear(g, w.smear);
  if (!dbg.noowl) drawOwlBlur(g, fr, w.owl);
  if (w.fans) drawFans(g, w.fans);
}
export function releaseWhirl() { OC = FC = WING = SCI = null; }
