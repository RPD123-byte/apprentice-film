// s20 (63.12–69.44), build 3: the wide room behind the synth. Two setups of one drawing:
//   A 63.12–66.84 (locked off, camtrack s = 1.0000): the owl pushes the note card up against the box stack
//     (63.12–63.40, seen from behind), turns to face us (63.64–63.84) and glances at the card, trots left to the
//     grimy, cobwebbed scissors leaning on the speaker (64.28–64.40) and beats the dust off them with its wing
//     (64.44–65.52, a 4-frame wing cycle; puffs bloom one by one), backs off (65.56–65.76) and stares at the clean
//     blades (to 66.84) while the dust drifts up and melts away;
//   B 66.84–69.44: the same room re-framed (measured affines B1, a 3-frame step at 67.40–67.48, then B2): the stare
//     holds, the owl lunges (67.20), grabs the scissors (67.28), lifts them (67.36), whirls round with them
//     (67.40–67.76, motion-blurred) and holds them up with a sly grin, left wing on its hip (67.80–69.40); a glint
//     flares on the blade tip 67.96–68.96; the last frame (69.40) carries the next shot's light leak.
// Everything is drawn by code from measurements (grid crops, per-frame template/silhouette tracks, tone samples of
// owl-free medians of the source; scripts in snapshots/s20-b3-tools/). No source pixels, traces or image files are
// used. Helpers: s20/b3/room.js (engraved plate), card.js (notecard.js kit, warped), scissors.js, owl.js
// (owlInk.js kit poses + s20's own headphones/feet), dust.js.
// The older files in s20/ (data/, trace/, owl*.js, trace*.js) belong to an earlier build and are not imported.
import { buildRoom, M } from "./s20/b3/room.js";
import { drawCard, releaseCard } from "./s20/b3/card.js";
import { drawScissors, drawScissorsLocal, drawCobwebs, LEAN, HOLD } from "./s20/b3/scissors.js";
import { drawDust, releaseDust } from "./s20/b3/dust.js";
import { clamp } from "../lib/rng.js";
import { drawOwlAt, releaseOwl, toA } from "./s20/b3/owl.js";
// the held scissors, measured in B2 frame px, placed in A coordinates (everything is drawn under the camera)
const HOLD_A = (() => { const [x, y] = toA(HOLD.x, HOLD.y); return { ...HOLD, x, y, s: HOLD.s / 0.978 }; })();
// the scissors while the owl takes them (frame px -> A): 67.28–67.36 lifted from the lean to upright (loops up),
// then the whirl 67.40–67.76: held by the shank (local (0, -150)) at the hand, the axis turning clockwise about
// 1 rad a frame (tips up-left at 67.40, right at 67.48, down behind it at 67.56, up at 67.72, into the hold)
const CARRY = new Map([
  [1682, { x: 750, y: 540, rot: -0.22, s: 1 }], [1683, { x: 758, y: 485, rot: -0.08, s: 1.04 }], [1684, { x: 742, y: 530, rot: 0.02, s: 1.06 }],
]);
const SWING = new Map([
  [1685, [930, 500, 2.93]], [1686, [1000, 420, 3.67]], [1687, [1060, 420, 4.4]], [1688, [1150, 480, 5.35]], [1689, [1160, 480, 5.6]],
  [1690, [1160, 470, 6.5]], [1691, [1100, 400, 7.5]], [1692, [1000, 420, 8.5]], [1693, [900, 540, 9.42]], [1694, [912, 505, 9.9]],
]);
// the spinning scissors: one pre-blurred sprite (local units at the hold scale, pivot at the sprite centre + 150
// units toward the tips, i.e. held by the shank), stamped along the swept angle
let SPR = null;
function swingSprite(s) {
  if (SPR) return SPR;
  const R = Math.ceil(470 * s), c = document.createElement("canvas"); c.width = c.height = R * 2;
  const g = c.getContext("2d"); g.filter = "blur(3px)"; g.translate(R, R); g.scale(s, s); g.translate(0, 150);
  drawScissorsLocal(g, { open: 0.05 });
  SPR = { c, R };
  return SPR;
}
function drawSwing(ctx, fr) {
  const [hx, hy, rot] = SWING.get(fr), prev = SWING.get(fr - 1) || [hx, hy, rot - 0.8];
  const [ax, ay] = toA(hx, hy), [px, py] = toA(prev[0], prev[1]);
  const n = fr === 1694 ? 3 : 8, sp = swingSprite(HOLD_A.s);
  ctx.save();
  for (let k = 0; k < n; k++) {
    const u = (k + 1) / n, r = prev[2] + (rot - prev[2]) * u, x = px + (ax - px) * u, y = py + (ay - py) * u;
    ctx.globalAlpha = (fr === 1694 ? 0.5 : 0.22) * (0.4 + 0.6 * u);
    ctx.save(); ctx.translate(x, y); ctx.rotate(r); ctx.drawImage(sp.c, -sp.R, -sp.R); ctx.restore();
  }
  ctx.restore();
}

// camera: A locked 63.12–66.84; B views the A drawing through a measured affine (ORB + RANSAC on the room, owl band
// masked, residual 0.7 px): x' = a x + c y + e, y' = b x + d y + f
const B1 = [0.9846, -0.0003, -0.0002, 0.9698, 0.95, -3.1];
const STEP = new Map([[1685, [0.9861, -0.0003, -0.0001, 0.9696, -1.07, -2.82]], [1686, [0.9889, -0.0001, 0.0005, 0.9664, -5.64, -0.35]], [1687, [0.9908, -0.0006, -0.0001, 0.9643, -8.11, 1.96]]]);
const B2 = [0.9910, -0.0003, -0.0007, 0.9649, -7.95, 1.1];
function camAt(fr) {
  if (fr < 1671) return null;
  if (fr < 1685) return B1;
  return STEP.get(fr) || B2;
}

// the glint on the blade tip (hold): a four-point star at (1170, 155) (frame px), growing 67.96–68.44 and gone
// by 69.00 (measured on 0.08 s strips: core radius ~40 px and a horizontal ray ~±90 px at its peak)
const GLINT = [[1699, 0.3], [1701, 0.45], [1703, 0.6], [1705, 0.75], [1707, 0.9], [1709, 0.97], [1711, 1], [1713, 0.97], [1715, 0.9], [1717, 0.82], [1719, 0.7], [1721, 0.58], [1723, 0.42], [1724, 0.3], [1725, 0]];
function glintAt(fr) {
  if (fr < GLINT[0][0] || fr >= 1725) return 0;
  for (let i = 1; i < GLINT.length; i++) if (fr < GLINT[i][0]) { const [f0, a] = GLINT[i - 1], [f1, b] = GLINT[i]; return a + (b - a) * (fr - f0) / (f1 - f0); }
  return 0;
}
function drawGlint(g, k) {
  const x = 1170, y = 155;
  g.save(); g.globalCompositeOperation = "lighter";
  const core = g.createRadialGradient(x, y, 0, x, y, 46 * k);
  core.addColorStop(0, "rgba(255,255,255,0.95)"); core.addColorStop(0.35, `rgba(255,255,255,${0.75 * k})`); core.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = core; g.beginPath(); g.arc(x, y, 46 * k, 0, Math.PI * 2); g.fill();
  const ray = (dx, dy, L, w) => {
    const q = g.createLinearGradient(x, y, x + dx * L, y + dy * L);
    q.addColorStop(0, "rgba(255,255,255,0.95)"); q.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = q; g.beginPath(); g.moveTo(x - dy * w, y + dx * w); g.lineTo(x + dx * L, y + dy * L); g.lineTo(x + dy * w, y - dx * w); g.closePath(); g.fill();
  };
  ray(1, 0, 110 * k, 3.5); ray(-1, 0, 110 * k, 3.5); ray(0, -1, 100 * k, 3); ray(0, 1, 55 * k, 3);
  for (const [dx, dy] of [[0.7, -0.7], [-0.7, -0.7], [0.7, 0.7], [-0.7, 0.7]]) ray(dx, dy, 34 * k, 2);
  g.restore();
}
// 69.40 (the last frame): a light leak from the next shot's lit screen: bright bands along the top, left and right
// edges (measured difference 69.40 - 69.36: top +62 levels, peaking +90 at y 100, gone by y 125; left +33 rising to
// +75 at x 120, gone by 145; right +79 at x 2040 falling to +20 at the edge), added as pre-grade light
function drawLeak(g) {
  g.save(); g.globalCompositeOperation = "lighter";
  const band = (x0, y0, x1, y1, stops) => { const q = g.createLinearGradient(x0, y0, x1, y1); for (const [t, a] of stops) q.addColorStop(t, `rgba(255,255,255,${a})`); g.fillStyle = q; };
  band(0, 0, 0, 130, [[0, 0.22], [0.6, 0.23], [0.77, 0.33], [0.9, 0.2], [1, 0]]); g.fillRect(0, 0, 2206, 130);
  band(0, 0, 150, 0, [[0, 0.12], [0.4, 0.17], [0.8, 0.27], [0.93, 0.12], [1, 0]]); g.fillRect(0, 130, 150, 816);
  band(2020, 0, 2206, 0, [[0, 0], [0.1, 0.29], [0.4, 0.17], [1, 0.08]]); g.fillRect(2020, 130, 186, 816);
  g.restore();
}

let L = null;
function layers(dbg = {}) {
  if (!L) L = { room: buildRoom() };
  return L;
}

export const shot = {
  draw(ctx, local, t) {
    const fr = Math.ceil(t * 25 - 0.05);
    const dbg = this.debug || {};
    if (dbg.owlonly) { const c = camAt(fr); ctx.save(); if (c) ctx.transform(c[0], c[1], c[2], c[3], c[4], c[5]); drawOwlAt(ctx, fr); ctx.restore(); return; }
    const { room } = layers(dbg);
    if (dbg.roomonly) { ctx.drawImage(room.back, -M, -M); ctx.drawImage(room.front, -M, -M); return; }
    const cam = camAt(fr);
    ctx.save();
    if (cam) ctx.transform(cam[0], cam[1], cam[2], cam[3], cam[4], cam[5]);
    ctx.drawImage(room.back, -M, -M);
    // scissors leaning on the speaker until the owl grabs them (67.24)
    const grime = 1 - clamp((fr - 1637) / 5);
    if (fr < 1682) { drawCobwebs(ctx, grime); drawScissors(ctx, LEAN, { grime }); }
    drawCard(ctx, fr);
    ctx.drawImage(room.front, -M, -M);
    if (!dbg.nodust) drawDust(ctx, fr / 25);
    if (CARRY.has(fr)) { const [x, y] = toA(CARRY.get(fr).x, CARRY.get(fr).y); drawScissors(ctx, { ...CARRY.get(fr), x, y }, {}); }
    if (SWING.has(fr) && fr < 1688) drawSwing(ctx, fr);
    if (fr >= 1695) drawScissors(ctx, HOLD_A, {});
    if (!dbg.noowl) drawOwlAt(ctx, fr);
    if (SWING.has(fr) && fr >= 1688) drawSwing(ctx, fr);
    ctx.restore();
    const gk = glintAt(fr);
    if (gk > 0) drawGlint(ctx, gk);
    if (fr >= 1735) drawLeak(ctx);
  },
  release() { L = null; SPR = null; releaseCard(); releaseOwl(); releaseDust(); },
};
