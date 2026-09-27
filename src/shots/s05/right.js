// s05 right edge through the camera settle (23.12-23.52). The optical-flow grid of the room layer fails right of the
// head in the first frames (what the source shows there is not in the settled frame), so the room right of x 1800 is
// moved by its own measured translation instead, and the pale cartons the source shows there at 23.12-23.32 (a tall
// one leaving the frame at the right, and the taped front of the carton row that turns into the settled frame's dark
// hatched carton at 23.36) are painted here. All positions and values measured on the un-graded source frames
// (edge profiles and NCC of the settled frame's shelf upright and carton, frames 578-588).
import { rng } from "../../lib/rng.js";

// [frame k, dx, dy]: the room right of the head, settled position -> position in frame k (upright + carton tracks;
// 578-580 extrapolated from the carton row's left edge, which the head hides from the upright)
export const RIGHT_T = [[577, -187, 13], [578, -158, 12], [579, -126, 11], [580, -104, 10], [581, -81, 9], [582, -61, 8], [583, -43, 6], [584, -28, 4], [585, -17, 2], [586, -10, 2], [587, -3, 0], [588, -1, 0]];
export const RIGHT_X = [1740, 1830];         // the room's own grid left of RIGHT_X[0], this translation right of RIGHT_X[1]
export function rightShift(k) {
  for (const r of RIGHT_T) if (r[0] === k) return [r[1], r[2]];
  return null;
}

// the pale carton row (frame px per source frame): left edge, top of the front face, bottom, and the tall carton's
// left edge / top (gone after 580)
const ROW = { 577: [1861, 466, 646], 578: [1890, 462, 645], 579: [1922, 457, 645], 580: [1945, 452, 644], 581: [1966, 450, 640], 582: [1985, 447, 635], 583: [2005, 440, 630] };
const LEFT_GAIN = { 578: 0.97, 579: 0.94, 580: 0.9, 581: 0.86, 582: 0.83, 583: 0.79 };
const TALL = { 576: [2090, 169], 577: [2090, 169], 578: [2121, 165], 579: [2155, 158], 580: [2186, 152] };

const grey = (v) => { const c = Math.max(0, Math.min(255, Math.round(v * 255))); return `rgb(${c},${c},${c})`; };
let STREAK = null;
// vertical streaks of the cardboard (a fixed seeded strip, 1 px per column): multiplier around 1
function streaks() {
  if (STREAK) return STREAK;
  const r = rng(5051), a = new Float32Array(600);
  let v = 0;
  for (let i = 0; i < 600; i++) { v = v * 0.55 + (r() - 0.5) * 0.9; a[i] = v; }
  STREAK = a;
  return a;
}
function streakFill(g, x0, y0, x1, y1, top, bot, amp, phase) {
  const s = streaks();
  const gr = g.createLinearGradient(0, y0, 0, y1);
  gr.addColorStop(0, grey(top)); gr.addColorStop(1, grey(bot));
  g.fillStyle = gr; g.fillRect(x0, y0, x1 - x0, y1 - y0);
  // darker vertical streaks, strongest low on the face
  for (let x = Math.floor(x0); x < x1; x += 2) {
    const k = s[(x - Math.floor(phase) + 6000) % 600];
    if (k >= 0) continue;
    g.globalAlpha = Math.min(1, -k * amp);
    const gg = g.createLinearGradient(0, y0, 0, y1);
    gg.addColorStop(0, "rgba(0,0,0,0.3)"); gg.addColorStop(1, "rgba(0,0,0,1)");
    g.fillStyle = gg; g.fillRect(x, y0 + (y1 - y0) * 0.1, 2, (y1 - y0) * 0.9);
  }
  g.globalAlpha = 1;
}

// paint the pale cartons of source frame k (frame px; drawn over the room layer, under the figure)
// (pass 3) painted into a scratch strip, then softened (1.3 px) and given the source's grain (its faces carry ~8
// levels of fine mottle in the graded frame against ~5 here before), then laid over the room
const CX0 = 1740;
let CART = null, NOISE = null;
export function paintPaleCartons(g0, k) {
  const T = TALL[k], R = ROW[k];
  if (!T && !R) return;
  const cw = 2206 - CX0 + 8, ch = 946;
  if (!CART) { CART = document.createElement("canvas"); CART.width = cw; CART.height = ch; }
  const g = CART.getContext("2d", { willReadFrequently: true });
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cw, ch); g.translate(-CX0, 0);
  g.save();
  if (T) {
    const [x, y] = T, y1 = 405;
    streakFill(g, x, y, 2206, y1, 0.3, 0.16, 0.12, x);
    // the shaded left side
    const gl = g.createLinearGradient(x, 0, x + 24, 0);
    gl.addColorStop(0, "rgba(0,0,0,0.85)"); gl.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = gl; g.fillRect(x, y, 24, y1 - y);
    g.fillStyle = grey(0.03); g.fillRect(x, y1, 2206 - x, 8);
  }
  if (R) {
    // (fix pass 2: the row's front face starts 20 px lower than before, under a lid flap: a lit parallelogram with a
    // dark seam, (1975, 420)-(2200, 410)-(2200, 450)-(1990, 460) at 23.16; the faces carry fine 75-degree hatching)
    const [L, top0, bot] = R, top = top0 + 20, tx = L + 143;
    // the top faces: dark over the left carton, a lit strip over the taped one
    g.fillStyle = grey(0.05); g.beginPath(); g.moveTo(L, top - 20); g.lineTo(tx, top - 14); g.lineTo(tx, top); g.lineTo(L, top); g.closePath(); g.fill();
    g.fillStyle = grey(0.12); g.beginPath(); g.moveTo(tx - 6, top - 54); g.lineTo(2206, top - 50); g.lineTo(2206, top - 8); g.lineTo(tx, top - 2); g.closePath(); g.fill();
    // the front faces (pass 3: the left carton's face dims as it slides out, measured per frame against the source's)
    const gk = LEFT_GAIN[k] || 1;
    streakFill(g, L, top, 2206, bot, 0.34, 0.19, 0.1, L);
    if (gk < 1) { g.save(); g.globalAlpha = 1 - gk; g.fillStyle = "#000"; g.fillRect(L, top, tx - L, bot - top); g.restore(); }
    // the seam between the two cartons and their outlines
    g.strokeStyle = grey(0.06); g.lineWidth = 2.5;
    g.beginPath(); g.moveTo(L, top); g.lineTo(2206, top + 4); g.stroke();
    g.beginPath(); g.moveTo(tx - 2, top - 2); g.lineTo(tx + 4, bot); g.stroke();
    g.lineWidth = 3.5; g.beginPath(); g.moveTo(L - 4, bot + 2); g.lineTo(2206, bot - 2); g.stroke();
    // the tape flap over the taped carton's top edge
    g.fillStyle = grey(0.3); g.beginPath(); g.moveTo(tx, top - 17); g.lineTo(tx + 65, top - 15); g.lineTo(tx + 62, top + 48); g.lineTo(tx + 2, top + 44); g.closePath(); g.fill();
    g.strokeStyle = grey(0.07); g.lineWidth = 2; g.beginPath(); g.moveTo(tx + 2, top + 44); g.lineTo(tx + 62, top + 48); g.lineTo(tx + 65, top - 15); g.stroke();
    // the left carton's left edge
    g.strokeStyle = grey(0.05); g.lineWidth = 3; g.beginPath(); g.moveTo(L, top - 20); g.lineTo(L, bot + 2); g.stroke();
    // the lid flap over the row's top and its seam
    g.fillStyle = grey(0.36); g.beginPath(); g.moveTo(L + 53, top - 57); g.lineTo(2206, top - 67); g.lineTo(2206, top - 27); g.lineTo(L + 68, top - 17); g.closePath(); g.fill();
    g.strokeStyle = grey(0.04); g.lineWidth = 2.5; g.beginPath(); g.moveTo(L + 68, top - 17); g.lineTo(2206, top - 27); g.stroke();
    // fine hatching over the front faces (75 degrees, 4 px apart)
    g.save(); g.beginPath(); g.rect(L, top, 2206 - L, bot - top); g.clip();
    const hr = rng(5071), run = (bot - top) / Math.tan((75 * Math.PI) / 180);
    for (let x = L - run; x < 2206; x += 4) { g.strokeStyle = `rgba(0,0,0,${(0.18 + hr() * 0.2).toFixed(2)})`; g.lineWidth = 0.8 + hr() * 0.6; g.beginPath(); g.moveTo(x, top); g.lineTo(x + run, bot); g.stroke(); }
    g.restore();
  }
  g.restore();
  // soften, then the grain (a fixed seeded field: the same pixels every frame, so it does not boil against the room)
  const id = g.getImageData(0, 0, cw, ch), d = id.data;
  if (!NOISE) { const r = rng(7331); NOISE = new Float32Array(cw * ch); for (let i = 0; i < NOISE.length; i++) NOISE[i] = (r() + r() + r() - 1.5) * 2; }
  for (let i = 0, j = 0; i < d.length; i += 4, j++) {
    if (!d[i + 3]) continue;
    const n = NOISE[j] * 6 * Math.min(1, d[i] / 40);
    d[i] = Math.max(0, Math.min(255, d[i] + n)); d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n)); d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n));
  }
  g.putImageData(id, 0, 0);
  g0.save(); g0.filter = "blur(1.3px)"; g0.drawImage(CART, CX0, 0); g0.restore();
}
export function releaseRight() { STREAK = null; CART = null; NOISE = null; }
