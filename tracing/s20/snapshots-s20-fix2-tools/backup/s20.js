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
// Fix pass 1: the owl's own parts (s20/b3/owlparts.js), re-measured poses, the whirl rebuilt as a sharp turning owl
// with swept fans (FANS / SMEAR below), the grab re-timed, new hold scissors, glint / leak / side-panel light and
// grain measured on the source; notes and numbers in fidelity/s20.md.
import { buildRoom, M, SPK } from "./s20/b3/room.js";
import { drawCard, releaseCard } from "./s20/b3/card.js";
import { drawScissors, drawScissorsLocal, drawCobwebs, LEAN, HOLD } from "./s20/b3/scissors.js";
import { drawDust, releaseDust } from "./s20/b3/dust.js";
import { clamp, rng } from "../lib/rng.js";
import { drawOwlAt, releaseOwl, toA } from "./s20/b3/owl.js";
// the held scissors, measured in B2 frame px, placed in A coordinates (everything is drawn under the camera)
const HOLD_A = (() => { const [x, y] = toA(HOLD.x, HOLD.y); return { ...HOLD, x, y, s: HOLD.s / 0.978 }; })();
// the scissors while the owl takes them (fix pass 1, measured on 1.4x crops, B2 frame px): 1682 still at the lean,
// 1683 pulled in at the same angle, 1684 lifted (smeared from the 1683 placement)
const CARRY = new Map([[1683, { x: 752, y: 578, rot: -0.3, s: 1 }], [1684, { x: 795, y: 508, rot: -0.14, s: 1.02 }]]);
// the whirl (1685–1694): the wing and the scissors blur into swept fans round the hand (measured extents on 1.25x crops
// of each source frame): { p: pivot (B2 px), r0, r1, a0, a1 (radians, screen), al: peak opacity }
const FANS = new Map([
  [1685, [{ p: [960, 400], r0: 70, r1: 380, a0: -2.3, a1: -1.15, al: 0.55 }, { p: [960, 400], r0: 150, r1: 380, a0: 1.8, a1: 2.1, al: 0.4 }]],
  [1686, [{ p: [1050, 390], r0: 110, r1: 300, a0: 2.1, a1: 3.2, al: 0.45 }, { p: [1050, 390], r0: 140, r1: 420, a0: -1.45, a1: -0.3, al: 0.45 }]],
  [1687, [{ p: [1150, 360], r0: 60, r1: 330, a0: 2.6, a1: 5.28, al: 0.5 }]],
  [1688, [{ p: [1145, 370], r0: 40, r1: 350, a0: -2.1, a1: -1.3, al: 0.6 }]],
  [1689, [{ p: [1148, 372], r0: 40, r1: 350, a0: -2.05, a1: -1.28, al: 0.6 }]],
  [1690, [{ p: [1240, 420], r0: 40, r1: 395, a0: -1.95, a1: -1.2, al: 0.58 }]],
  [1691, [{ p: [1100, 360], r0: 50, r1: 360, a0: -2.85, a1: -1.35, al: 0.52 }]],
]);
// the scissors smeared along their turn (blade direction th0 -> th1, pivot fixed, B2 px) as they come round into the hold
const SMEAR = new Map([[1692, { p: [1031, 347], th0: -0.98, th1: -0.62 }], [1693, { p: [912, 387], th0: -1.75, th1: -1.33 }], [1694, { p: [955, 430], th0: -1.12, th1: -0.99 }]]);
function drawFan(g, f) {
  const [px, py] = toA(f.p[0], f.p[1]), k = 1 / 0.978, r0 = f.r0 * k, r1 = f.r1 * k;
  g.save();
  g.filter = "blur(13px)";
  const n = 40;
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n, b0 = f.a0 + (f.a1 - f.a0) * i / n, b1 = f.a0 + (f.a1 - f.a0) * (i + 1) / n;
    const edge = Math.min(1, Math.min(u, 1 - u) * 2.6);                         // soft angular ends
    const q = g.createRadialGradient(px, py, r0 * 0.4, px, py, r1);
    const a = Math.min(0.95, f.al * 1.5) * (0.15 + 0.85 * edge);
    q.addColorStop(0, `rgba(246,244,239,${(a * 0.3).toFixed(3)})`); q.addColorStop(0.35, `rgba(246,244,239,${(a * 0.72).toFixed(3)})`);
    q.addColorStop(0.72, `rgba(248,246,241,${a.toFixed(3)})`); q.addColorStop(0.9, `rgba(240,238,232,${(a * 0.65).toFixed(3)})`); q.addColorStop(1, "rgba(240,238,232,0)");
    g.fillStyle = q; g.beginPath(); g.arc(px, py, r1, b0, b1 + 0.004); g.arc(px, py, r0 * 0.4, b1 + 0.004, b0, true); g.closePath(); g.fill();
  }
  // streaks along the turn: faint concentric arcs (the feathers and blades smeared round the pivot)
  g.filter = "blur(3px)";
  const r = rng(Math.round(f.p[0] * 3 + f.p[1] * 7 + f.a0 * 100));
  g.lineCap = "round";
  for (let i = 0; i < 18; i++) {
    const rr = r0 + (r1 - r0) * (0.25 + 0.7 * r()), da = (f.a1 - f.a0) * (0.15 + 0.3 * r()), c = f.a0 + (f.a1 - f.a0) * (0.2 + 0.6 * r());
    g.strokeStyle = r() < 0.7 ? `rgba(255,253,248,${(0.06 + 0.08 * r()).toFixed(3)})` : `rgba(40,40,40,${(0.04 + 0.04 * r()).toFixed(3)})`;
    g.lineWidth = 3 + r() * 6;
    g.beginPath(); g.arc(px, py, rr, c - da, c + da); g.stroke();
  }
  g.restore();
}
// scissors sprite at the hold drawing (open, face-on loops), pivot at the centre, pre-blurred 2 px
let SPR = null;
function scissorsSprite() {
  if (SPR) return SPR;
  const s = HOLD_A.s, R = Math.ceil(430 * s), c = document.createElement("canvas"); c.width = c.height = R * 2;
  const g = c.getContext("2d"); g.filter = "blur(2px)"; g.translate(R, R); g.scale(s, s);
  drawScissorsLocal(g, { open: HOLD.open, loops: HOLD.loops, wide: HOLD.wide, blen: HOLD.blen });
  SPR = { c, R };
  return SPR;
}
function drawSmear(g, m, n = 22) {
  const sp = scissorsSprite(), [px, py] = toA(m.p[0], m.p[1]);
  g.save();
  for (let k = 0; k < n; k++) {
    const u = (k + 0.5) / n, th = m.th0 + (m.th1 - m.th0) * u;
    g.globalAlpha = Math.min(1, (2.2 / n) * (0.35 + 0.9 * u));
    g.save(); g.translate(px, py); g.rotate(th - Math.PI / 2); g.drawImage(sp.c, -sp.R, -sp.R); g.restore();
  }
  g.restore();
}
function drawCarry(g, fr) {
  if (fr === 1682) { drawScissors(g, LEAN, {}); return; }
  const c = CARRY.get(fr);
  if (fr === 1684) {
    // lifted fast: smeared from the 1683 placement
    const c0 = CARRY.get(1683), n = 10;
    for (let k = 0; k < n; k++) {
      const u = (k + 1) / n, x = c0.x + (c.x - c0.x) * u, y = c0.y + (c.y - c0.y) * u, [ax, ay] = toA(x, y);
      drawScissors(g, { x: ax, y: ay, rot: c0.rot + (c.rot - c0.rot) * u, s: c.s }, { alpha: k === n - 1 ? 0.55 : 0.12 });
    }
    return;
  }
  const [x, y] = toA(c.x, c.y); drawScissors(g, { ...c, x, y }, {});
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
  // fix pass 1: sized to the source at 68.40 (horizontal rays x 1040–1330, a vertical ray up to y 30, a soft halo of
  // radius 55–90 px round (1176, 155))
  const x = 1176, y = 155;
  g.save(); g.globalCompositeOperation = "lighter";
  const halo = g.createRadialGradient(x, y, 0, x, y, 130 * k);
  halo.addColorStop(0, `rgba(255,255,255,${(0.35 * k).toFixed(3)})`); halo.addColorStop(0.45, `rgba(255,255,255,${(0.14 * k).toFixed(3)})`); halo.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = halo; g.beginPath(); g.arc(x, y, 130 * k, 0, Math.PI * 2); g.fill();
  const core = g.createRadialGradient(x, y, 0, x, y, 80 * k);
  core.addColorStop(0, "rgba(255,255,255,0.95)"); core.addColorStop(0.3, `rgba(255,255,255,${0.7 * k})`); core.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = core; g.beginPath(); g.arc(x, y, 80 * k, 0, Math.PI * 2); g.fill();
  const ray = (dx, dy, L, w) => {
    const q = g.createLinearGradient(x, y, x + dx * L, y + dy * L);
    q.addColorStop(0, "rgba(255,255,255,0.95)"); q.addColorStop(0.5, "rgba(255,255,255,0.45)"); q.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = q; g.beginPath(); g.moveTo(x - dy * w, y + dx * w); g.lineTo(x + dx * L, y + dy * L); g.lineTo(x + dy * w, y - dx * w); g.closePath(); g.fill();
  };
  ray(1, 0, 160 * k, 5); ray(-1, 0, 160 * k, 5); ray(0, -1, 125 * k, 5); ray(0, 1, 60 * k, 4);
  for (const [dx, dy] of [[0.7, -0.7], [-0.7, -0.7], [0.7, 0.7], [-0.7, 0.7]]) ray(dx, dy, 40 * k, 2.2);
  g.restore();
}
// 69.40 (the last frame): a light leak from the next shot's lit screen: bright bands along the top, left and right
// edges (measured difference 69.40 - 69.36: top +62 levels, peaking +90 at y 100, gone by y 125; left +33 rising to
// +75 at x 120, gone by 145; right +79 at x 2040 falling to +20 at the edge), added as pre-grade light
function drawLeak(g) {
  g.save(); g.globalCompositeOperation = "lighter";
  const band = (x0, y0, x1, y1, stops) => { const q = g.createLinearGradient(x0, y0, x1, y1); for (const [t, a] of stops) q.addColorStop(t, `rgba(255,255,255,${a})`); g.fillStyle = q; };
  band(0, 0, 0, 130, [[0, 0.25], [0.6, 0.26], [0.77, 0.38], [0.9, 0.23], [1, 0]]); g.fillRect(0, 0, 2206, 130);
  band(0, 0, 150, 0, [[0, 0.135], [0.4, 0.195], [0.8, 0.3], [0.93, 0.135], [1, 0]]); g.fillRect(0, 130, 150, 816);
  band(2020, 0, 2206, 0, [[0, 0], [0.1, 0.35], [0.4, 0.2], [1, 0.095]]); g.fillRect(2020, 130, 186, 816);
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
    // the step into B2 relights the speaker's side panel (source mean over 600–690 x 100–650: 136 at 1682 -> 169 at
    // 1686): a soft white screen over the panel, ramped in over 1683–1686
    const relight = clamp((fr - 1682) / 4);
    if (relight > 0) { ctx.save(); ctx.globalCompositeOperation = "screen"; ctx.fillStyle = `rgba(255,255,255,${(0.3 * relight).toFixed(3)})`; ctx.beginPath(); SPK.side.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.fill(); ctx.restore(); }
    // scissors leaning on the speaker until the owl grabs them (67.24)
    // grime rubbed off 65.52–65.96 (blade median measured 152 -> 172 -> 191 levels at 1638 / 1642 / 1650); the
    // cobwebs are gone by 65.68
    const grime = 1 - clamp((fr - 1638) / 11);
    if (fr < 1682) { drawCobwebs(ctx, 1 - clamp((fr - 1637) / 5)); drawScissors(ctx, LEAN, { grime }); }
    drawCard(ctx, fr);
    ctx.drawImage(room.front, -M, -M);
    if (!dbg.nodust) drawDust(ctx, fr / 25);
    if (fr >= 1682 && fr <= 1684) drawCarry(ctx, fr);
    if (SMEAR.has(fr)) drawSmear(ctx, SMEAR.get(fr));
    if (fr >= 1695) drawScissors(ctx, HOLD_A, {});
    if (!dbg.noowl) drawOwlAt(ctx, fr);
    if (FANS.has(fr)) for (const f of FANS.get(fr)) drawFan(ctx, f);
    ctx.restore();
    const gk = glintAt(fr);
    if (gk > 0) drawGlint(ctx, gk);
    if (fr >= 1735) drawLeak(ctx);
  },
  // fix pass 1: finer grain than the default 6/255 (static regions: frame-to-frame |diff| 2.4–2.9 here vs 1.0–1.9 in
  // the source; the grain is the only change there)
  grade: () => ({ grain: 3 / 255 }),
  release() { L = null; SPR = null; releaseCard(); releaseOwl(); releaseDust(); },
};
