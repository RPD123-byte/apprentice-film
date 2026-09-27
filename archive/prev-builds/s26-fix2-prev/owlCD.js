// s26 beats C and D (111.64–113.88): the white owl in flight, drawn with the shared B&W owl kit (src/lib/owlInk.js:
// the same soft white plumage, layered wing feathers with fine grey edges, merged head + body, heart facial disc,
// scowl / sly / shut eyes, hooked beak, slim band with edge-on cups, dark-clawed talons, print mesh). Units = frame px
// (placement x = y = 0, s = 1), so every pose number below is a frame coordinate.
//
// Per source frame the pose comes from:
//   * the head: placed so the kit's two eyes land on the tracked pupils (the rig's eye centres, s26/rig.js headGeom of
//     the per-frame fits in s26/posesC.js / posesD.js); roll = the eye line; size from the eye distance
//   * body and wings: s26/owlCDfit.js — the kit's own egg body and layered wings refitted per frame to the source owl
//     silhouette (snapshots/s26-fix1-tools/fitCD.mjs; measurements only), starting from the rig fits
//   * feet: measured ankles (2x gridded crops), long feathered shanks with big talons
// The dark crown of beat C (the feathers under the band are black at 111.64–112.68, white again in D) is drawn here
// between the kit layer and the near half of the headphones.
import { owlLayer, headGeom, headphoneGeom, drawBandSlim, setPPU, ink, gv, LINE, featherShape } from "../../lib/owlInk.js";
import { unpack, headGeom as rigHeadGeom } from "./rig.js";
import { POSES_C, POSES_C_KEYS } from "./posesC.js";
import { POSES_D, POSES_D_KEYS } from "./posesD.js";
import { CD_FIT } from "./owlCDfit.js";
import { rng } from "../../lib/rng.js";

const RIG_BASE = { head: { x: 0, y: 0, r: 90, rot: 0, yaw: -0.3, tuft: 0.4 }, body: { x: 0, y: 0, rx: 100, ry: 100, rot: 0 },
  wings: [{ S: [0, 0], Wr: [0, 0], T: [0, 0], trail: 2, sec: 120 }, { S: [0, 0], Wr: [0, 0], T: [0, 0], trail: 1, sec: 120 }],
  feet: [{ x: 0, y: 0, ang: 0, size: 58 }, { x: 0, y: 0, ang: 0, size: 58 }] };
export const CD_F0 = 2791, CD_F1 = 2847;
export function rigPose(F) {
  F = Math.max(CD_F0, Math.min(CD_F1, F));
  return F <= 2817 ? unpack(POSES_C_KEYS, POSES_C[F], RIG_BASE) : unpack(POSES_D_KEYS, POSES_D[F], { ...RIG_BASE, head: { ...RIG_BASE.head, yaw: 0.3 } });
}
// head shape constants (kit head, units = px): eyes on the sphere at azimuth ±SP, elevation EL; yaw per beat
// (fix #1, D: the crown sits ≈ 118 px above the eyes at 113.64, not 150 -> el −0.22, ryk 0.95. A narrower head
// (sp 0.6) was tried and read too small against the source's cup-to-cup head)
export const HEADK = { sp: 0.5, el: -0.3, elD: -0.22, yawC: -0.26, yawD: 0.28, ryk: 1.02, rykD: 0.95, eyeR: 0.215 };
// the kit head placed on the tracked eyes
export function headFromEyes(EL, ER, yaw, o = HEADK) {
  const d = Math.hypot(ER[0] - EL[0], ER[1] - EL[1]), roll = Math.atan2(ER[1] - EL[1], ER[0] - EL[0]);
  const rx = d / (2 * Math.cos(o.el) * Math.cos(yaw) * Math.sin(o.sp)), ry = rx * o.ryk;
  const mx = Math.cos(o.el) * Math.sin(yaw) * Math.cos(o.sp) * rx, my = -Math.sin(o.el) * ry;
  const c = Math.cos(roll), s = Math.sin(roll);
  const cx = (EL[0] + ER[0]) / 2 - (mx * c - my * s), cy = (EL[1] + ER[1]) / 2 - (mx * s + my * c);
  return { x: cx, y: cy, rx, ry, yaw, pitch: 0, roll, square: 2.3, jowl: 0.28 };
}
const lerp = (a, b, u) => a + (b - a) * u;
// the dangling feet: ankles (frame px) measured on 2x gridded crops. C: 111.64 / 112.00 / 112.40 / 112.68;
// D: relative to the body centre at 112.88 and 113.60
const BODY_K = [[2791, 58, 140, 126, 94], [2800, 65, 149, 119, 102], [2817, 5, 170, 131, 90], [2818, -65, 168, 129, 124],
  [2829, -67, 151, 135, 121], [2841, -65, 190, 122, 113], [2847, -60, 185, 122, 113]];
const FEET_C = [[2791, 1175, 745, 1240, 718], [2800, 1190, 722, 1262, 712], [2810, 1188, 728, 1262, 716], [2817, 1182, 728, 1258, 716]];
function interpRows(rows, F) {
  if (F <= rows[0][0]) return rows[0].slice(1);
  for (let i = 0; i < rows.length - 1; i++) if (F <= rows[i + 1][0]) { const u = (F - rows[i][0]) / (rows[i + 1][0] - rows[i][0]); return rows[i].slice(1).map((v, k) => lerp(v, rows[i + 1][k + 1], u)); }
  return rows[rows.length - 1].slice(1);
}
// the kit pose for source frame F (units = frame px). Pure (no DOM): also used by the fitting script under node.
export function cdPose(F, fit = CD_FIT[F]) {
  F = Math.max(CD_F0, Math.min(CD_F1, F));
  const C = F <= 2817, P = rigPose(F), G = rigHeadGeom(P.head);
  const head = headFromEyes(G.eyes[0].c, G.eyes[1].c, C ? HEADK.yawC : HEADK.yawD, C ? HEADK : { ...HEADK, el: HEADK.elD, ryk: HEADK.rykD });
  const k = head.rx / 100;   // size factor of this frame's owl (1 = a head 200 px wide)
  // the body: measured on 2x grids relative to the tracked eye midpoint (the silhouette refit had bloated it over the
  // wing coverts, ≈ 50 px too wide): [F, dx, dy, half width, half height] in px at an eye distance of 90
  const E0 = G.eyes[0].c, E1 = G.eyes[1].c, dE = Math.hypot(E1[0] - E0[0], E1[1] - E0[1]) / 90, mid = [(E0[0] + E1[0]) / 2, (E0[1] + E1[1]) / 2];
  const [bx, by, bw, bh] = interpRows(BODY_K, F).map((v) => v * dE);
  const B = { x: mid[0] + bx, y: mid[1] + by, a: bh, b: bw, rot: Math.PI / 2 };
  const B0 = fit?.body ?? (() => {
    const b = P.body; let rot = b.rot - Math.PI / 2; if (Math.sin(rot) < 0) rot += Math.PI;
    return { x: b.x, y: b.y, a: b.ry, b: b.rx, rot };
  })();
  const wings = (fit?.wings ?? P.wings.map((w) => ({ S: w.S, Wr: w.Wr, T: w.T, trail: [Math.cos(w.trail), Math.sin(w.trail)], len: w.sec * 0.9, spread: 0.9 }))).map((w, i) => ({
    type: "spread", style: "layered", layer: "back", n: 9, m: 7, cov: 2, fw: 0.85, point: 0.3, seed: 21 + 2 * i, secLen: 1.0, ...w,
  }));
  let feet;
  if (C) {
    const [x0, y0, x1, y1] = interpRows(FEET_C, F);
    // (fix #1: toe tips on the 112.00 grid sit ≈ 20 px right of and 20 px below the drawn ones)
    feet = [[x0 + 20, y0 + 20, 0.12], [x1 + 20, y1 + 20, -0.1]];
  } else {
    // D: ankles at body + (−159, 165) / (−95, 165) at 112.88, + (−178, 133) / (−103, 158) at 113.60
    const u = Math.max(0, Math.min(1, (F - 2822) / 18)), b = B0;   // (ankles measured against the fitted body)
    // (fix #1: toe tips on the 113.16 / 113.64 grids sit ≈ 60 / 30 px right of the drawn ones)
    const sh = F <= 2829 ? 60 : Math.max(30, 60 - 30 * (F - 2829) / 12);
    feet = [[b.x - 159 - 19 * u + sh, b.y + 165 - 32 * u, 0.15], [b.x - 95 - 8 * u + sh, b.y + 165 - 7 * u, 0.05]];
  }
  const pose = {
    ink: "solid", disc: "line", discOpts: { w: 1.1 * k, v: 0.55, ticks: 1 }, flow: [0, 1], merge: true, grain: 3,
    light: [-0.5, -0.86],
    head,
    tufts: C ? [{ at: 0.86, size: 46 * k, width: 0.42, lean: -0.2, spikes: 3, fan: 0.6, curl: 0.35, seed: 5, valley: 0.6 }, { at: -0.8, size: 22 * k, width: 0.28, lean: 0.25, spikes: 2, fan: 0.4, curl: 0.2, seed: 6, valley: 0.55 }]
      : [{ at: -0.84, size: 40 * k, width: 0.4, lean: 0.2, spikes: 3, fan: 0.6, curl: 0.35, seed: 7, valley: 0.6 }, { at: 0.82, size: 24 * k, width: 0.3, lean: -0.2, spikes: 2, fan: 0.4, curl: 0.2, seed: 8, valley: 0.55 }],
    body: { ...B, egg: -0.04, sag: 0.05, edge: { step: 16, depth: 7, lean: 0.8, from: 0.15, to: 0.85, seed: 5 } },
    tail: fit?.tail ?? null,
    wings,
    feet: feet.map(([x, y, rot], i) => ({ x, y, rot, size: 44 * k, mode: "dangle", toes: 3, spread: 0.7, leg: 0, seed: 2 + 3 * i })),
    eyes: { state: "scowl", r: HEADK.eyeR * head.rx, spread: HEADK.sp, el: HEADK.el, look: [0, 0], over: { sx: 1, lookX: 0.45, browSlant: 0.7, brow: 1.1, iris: 0.6, top: 0.42, bot: 0.34 } },
    beak: { el: -0.45, lift: 1.08, w: 32 * k, l: 38 * k, style: "grin", smirk: C ? 0.3 : 0.4, rot: 0 },
    bandage: { az: -0.5, el: 0.36, size: 52 * k, rot: -0.45 },
    headphones: { on: true, yaw: head.yaw * 1.1, lift: 1.04, r: 44 * k, bandR: 1.12, bandH: 1.3, tilt: 0.08, cupEl: -0.1, w: 12 * k, slim: true, open: 0.72 },
  };
  return pose;
}

// ------------------------------------------------------------------ drawing (browser)
// the dark crown of beat C: the feathers under the band, black with a ragged lower edge of pointed locks falling onto
// the forehead (measured at 112.00: from the band down to y ≈ 350–365 at the brow, the white spiky tuft standing in
// front of it on the viewer's right)
function crown(g, H, seed = 4) {
  const r = rng(seed);
  const top = [];
  for (let i = 0; i <= 24; i++) { const ph = -1.35 + 2.7 * (i / 24), q = H.at(ph); top.push(q.p); }
  // lower edge: locks (points down) along a line ~0.35 ry below the top of the head
  const low = [];
  const n = 6;
  for (let i = n; i >= 0; i--) {
    const u = i / n, x = lerp(-0.98, 0.98, u) * H.rx, base = -H.ry * (0.6 - 0.25 * Math.pow(Math.abs(u - 0.5) * 2, 2.2));
    const p = (dx, dy) => { const c = Math.cos(H.roll), s = Math.sin(H.roll); return [H.x + dx * c - dy * s, H.y + dx * s + dy * c]; };
    low.push(p(x, base));
    if (i > 0) { const xm = x - (1.96 / n) * H.rx * (0.45 + 0.1 * r()), dep = H.ry * (0.04 + 0.06 * r()) * (1 - Math.abs(u - 0.5)); low.push(p(xm, base + dep)); }
  }
  g.save();
  g.beginPath(); g.moveTo(top[0][0], top[0][1]); for (const q of top) g.lineTo(q[0], q[1]); for (const q of low) g.lineTo(q[0], q[1]); g.closePath();
  g.fillStyle = gv(0.08); g.fill();
  // a few soft grey feather strokes in the black
  g.clip();
  g.lineCap = "round";
  for (let i = 0; i < 14; i++) {
    const u = r(), q = H.at(-1.1 + 2.2 * u).p, L = H.ry * (0.15 + 0.18 * r());
    g.strokeStyle = gv(0.28, 0.5); g.lineWidth = 1 + r();
    g.beginPath(); g.moveTo(q[0], q[1]); g.quadraticCurveTo(q[0] + (H.x - q[0]) * 0.15, q[1] + L * 0.6, q[0] + (H.x - q[0]) * 0.25, q[1] + L); g.stroke();
  }
  g.restore();
}
// long feathered shanks from the belly to each ankle (the source's legs are white, feathered to the toes)
function shanks(g, pose) {
  const B = pose.body;
  for (const f of pose.feet) {
    const hip = [lerp(B.x, f.x, 0.35), lerp(B.y, f.y, 0.3)], w = f.size * 0.42;
    const d = [f.x - hip[0], f.y - hip[1]], L = Math.hypot(d[0], d[1]) || 1, u = [d[0] / L, d[1] / L], n = [-u[1], u[0]];
    const pts = [[hip[0] + n[0] * w * 1.3, hip[1] + n[1] * w * 1.3], [f.x + n[0] * w * 0.6, f.y + n[1] * w * 0.6], [f.x - n[0] * w * 0.6, f.y - n[1] * w * 0.6], [hip[0] - n[0] * w * 1.3, hip[1] - n[1] * w * 1.3]];
    g.fillStyle = gv(0.9); g.beginPath(); pts.forEach((q, i) => (i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]))); g.closePath(); g.fill();
    ink(g, [pts[0], pts[1]], 1.3, gv(0.35, 0.8), { end: 0.3 });
    ink(g, [pts[3], pts[2]], 1.3, gv(0.35, 0.8), { end: 0.3 });
    const r = rng(Math.round(f.x));
    for (let k = 0; k < 6; k++) { const t = 0.3 + 0.1 * k, c = [lerp(hip[0], f.x, t), lerp(hip[1], f.y, t)]; ink(g, [[c[0] - n[0] * w * 0.5, c[1] - n[1] * w * 0.5], [c[0] + u[0] * w * 0.4, c[1] + u[1] * w * 0.4 + 2], [c[0] + n[0] * w * 0.5 * (0.6 + 0.4 * r()), c[1] + n[1] * w * 0.5]], 0.9, gv(0.45, 0.6), { end: 0.2 }); }
  }
}
// the source's cups here: a black shell seen three-quarter, a dark grey plate with a pale rim highlight on its upper
// outer edge, a black cushion toward the head, a short yoke up to the band
function cupCD(g, c, r, roll) {
  const sd = c.side;
  g.save(); g.translate(c.x, c.y); g.rotate(roll);
  g.fillStyle = gv(0.05); g.beginPath(); g.ellipse(-sd * r * 0.22, 0, r * 0.34, r * 0.92, 0, 0, Math.PI * 2); g.fill();
  const gr = g.createLinearGradient(-r * 0.5, -r, r * 0.5, r);
  gr.addColorStop(0, gv(0.2)); gr.addColorStop(0.5, gv(0.1)); gr.addColorStop(1, gv(0.05));
  g.fillStyle = gr; g.beginPath(); g.ellipse(sd * r * 0.08, 0, r * 0.52, r * 0.9, 0, 0, Math.PI * 2); g.fill();
  g.strokeStyle = LINE; g.lineWidth = Math.max(1.2, r * 0.05); g.stroke();
  g.fillStyle = gv(0.24); g.beginPath(); g.ellipse(sd * r * 0.14, r * 0.02, r * 0.3, r * 0.58, 0, 0, Math.PI * 2); g.fill();
  g.strokeStyle = gv(0.62, 0.85); g.lineWidth = Math.max(1, r * 0.045); g.beginPath(); g.ellipse(sd * r * 0.1, 0, r * 0.44, r * 0.8, 0, sd > 0 ? -1.4 : Math.PI + 0.3, sd > 0 ? -0.3 : Math.PI + 1.4); g.stroke();
  ink(g, [[sd * r * 0.02, -r * 0.86], [sd * r * 0.06, -r * 1.08], [0, -r * 1.26]], r * 0.12, gv(0.08), { end: 0.7 });
  g.restore();
}
function headphonesCD(g, H, HP, layer) {
  const hp = headphoneGeom(H, HP);
  for (const sg of hp.segs) if ((layer === "back") === !sg.front) drawBandSlim(g, sg.pts, { w: HP.w, ends: sg.ends, ribs: false });
  for (const c of hp.cups) if ((layer === "back") === (c.z < -0.02)) cupCD(g, c, HP.r, H.roll);
}
// draw the C/D owl of source frame F into g (frame coordinates). eyes: kit eye override ({ state } or per-eye).
export function drawOwlCD(g, F, { eyes = null, canvas = null } = {}) {
  const pose = cdPose(F);
  if (eyes) pose.eyes = { ...pose.eyes, ...eyes, over: { ...pose.eyes.over, ...(eyes.over || {}) } };
  const H = headGeom(pose.head), HP = pose.headphones;
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
  setPPU(1);
  headphonesCD(g, H, HP, "back");
  // legs behind the plumage: the kit draws the talons; the shanks first
  shanks(g, pose);
  const L = owlLayer({ ...pose, headphones: { ...HP, on: false }, x: 0, y: 0, s: 1, canvas });
  g.drawImage(L.canvas, L.x, L.y, L.w, L.h);
  setPPU(1);
  if (F <= 2817) crown(g, H);
  headphonesCD(g, H, HP, "front");
  g.restore();
  return { pose, H };
}
export { featherShape, LINE };
