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
import { owlLayer, headGeom, headphoneGeom, drawBandSlim, setPPU, ink, gv, LINE, featherShape, bodyOutline } from "../../lib/owlInk.js";
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
// fix #2 (2x gridded crops / source silhouette): the C head is ≈ 185 px wide at 112.24 (ours was ≈ 200) -> eyes further
// round the sphere (spC 0.55; 0.6 matched the width but scored worse at σ8, 11.67 vs 11.55 on 4 frames); D keeps 0.5
export const HEADK = { sp: 0.5, spC: 0.55, spD: 0.5, el: -0.3, elD: -0.22, yawC: -0.26, yawD: 0.28, ryk: 1.02, rykD: 0.95, eyeR: 0.215, eyeRC: 0.235 };
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
// fix #2 (source silhouette masks, snapshots/s26-fix2-tools/bodyprof): per frame [F, lower-body centre x, body bottom]
const BODY_M = [[2791,1176,728], [2792,1176,727], [2793,1176,727], [2794,1172,721], [2795,1167,714], [2796,1160,705], [2797,1157,700], [2798,1157,697], [2799,1159,695], [2800,1161,693], [2801,1162,693], [2802,1162,692], [2803,1162,691], [2804,1160,688], [2805,1160,685], [2806,1159,683], [2807,1159,684], [2808,1159,685], [2809,1159,685], [2810,1160,682], [2811,1161,678], [2812,1164,674], [2813,1167,672], [2814,1169,671], [2815,1170,672], [2816,1170,672], [2817,1171,672], [2818,1147,666], [2819,1150,666], [2820,1154,665], [2821,1157,665], [2822,1160,663], [2823,1164,661], [2824,1168,659], [2825,1170,657], [2826,1172,655], [2827,1175,653], [2828,1178,652], [2829,1182,651], [2830,1186,650], [2831,1190,650], [2832,1191,650], [2833,1193,650], [2834,1195,649], [2835,1198,648], [2836,1200,647], [2837,1202,645], [2838,1204,644], [2839,1206,642], [2840,1209,641], [2841,1214,640], [2842,1218,638], [2843,1220,637], [2844,1223,636], [2845,1225,635], [2846,1228,634], [2847,1229,634]];
export const BODY_WK = 0.95;
const FEET_C = [[2791, 1175, 745, 1240, 718], [2800, 1190, 722, 1262, 712], [2810, 1188, 728, 1262, 716], [2817, 1182, 728, 1258, 716]];
const FEET_D = [[2818, 1080, 702, 1130, 716], [2819, 1082, 700, 1130, 715], [2825, 1096, 690, 1130, 705], [2832, 1085, 685, 1160, 700], [2839, 1099, 660, 1160, 690], [2846, 1115, 670, 1190, 690]];
function interpRows(rows, F) {
  if (F <= rows[0][0]) return rows[0].slice(1);
  for (let i = 0; i < rows.length - 1; i++) if (F <= rows[i + 1][0]) { const u = (F - rows[i][0]) / (rows[i + 1][0] - rows[i][0]); return rows[i].slice(1).map((v, k) => lerp(v, rows[i + 1][k + 1], u)); }
  return rows[rows.length - 1].slice(1);
}
// the kit pose for source frame F (units = frame px). Pure (no DOM): also used by the fitting script under node.
export function cdPose(F, fit = CD_FIT[F]) {
  F = Math.max(CD_F0, Math.min(CD_F1, F));
  const C = F <= 2817, P = rigPose(F), G = rigHeadGeom(P.head);
  const SP = C ? HEADK.spC : HEADK.spD;
  const head = headFromEyes(G.eyes[0].c, G.eyes[1].c, C ? HEADK.yawC : HEADK.yawD, C ? { ...HEADK, sp: SP } : { ...HEADK, sp: SP, el: HEADK.elD, ryk: HEADK.rykD });
  const k = head.rx / 100;   // size factor of this frame's owl (1 = a head 200 px wide)
  // the body: measured on 2x grids relative to the tracked eye midpoint (the silhouette refit had bloated it over the
  // wing coverts, ≈ 50 px too wide): [F, dx, dy, half width, half height] in px at an eye distance of 90
  const E0 = G.eyes[0].c, E1 = G.eyes[1].c, dE = Math.hypot(E1[0] - E0[0], E1[1] - E0[1]) / 90, mid = [(E0[0] + E1[0]) / 2, (E0[1] + E1[1]) / 2];
  const [, , bw, bh] = interpRows(BODY_K, F).map((v) => v * dE);
  // fix #2: the body's centre x and its bottom from the source silhouette (BODY_M: the lower body's run 30 px above
  // the bottom); the eye-keyed placement had it 50–85 px left in C and 50–70 px right in D
  // The egg runs from under the head (neck) to that bottom, so it leans with the bird: its lower end right of the head
  // in C, left of it in D (as the source's body does)
  const [mx, mb] = interpRows(BODY_M, F);
  const N = [head.x, head.y + head.ry * 0.5], ax = [mx - N[0], mb - N[1]], Lax = Math.hypot(ax[0], ax[1]), au = [ax[0] / Lax, ax[1] / Lax];
  const ba = bh;
  const B = { x: mx - au[0] * ba, y: mb - au[1] * ba, a: ba, b: bw * BODY_WK, rot: Math.atan2(au[1], au[0]) };
  const B0 = fit?.body ?? (() => {
    const b = P.body; let rot = b.rot - Math.PI / 2; if (Math.sin(rot) < 0) rot += Math.PI;
    return { x: b.x, y: b.y, a: b.ry, b: b.rx, rot };
  })();
  const wings = (fit?.wings ?? P.wings.map((w) => ({ S: w.S, Wr: w.Wr, T: w.T, trail: [Math.cos(w.trail), Math.sin(w.trail)], len: w.sec * 0.9, spread: 0.9 }))).map((w, i) => ({
    type: "spread", style: "layered", layer: "back", n: 9, m: 7, cov: 2, fw: 0.85, point: 0.3, seed: 21 + 2 * i, secLen: 1.0, ...w,
  }));
  // fix #2: ankles measured on 2x gridded source crops (C: FEET_C; D: FEET_D); the legs leave the belly ≈ 12 px above
  // the body bottom, a little toward the body's middle
  const [x0, y0, x1, y1] = interpRows(C ? FEET_C : FEET_D, F);
  const kl = Math.max(0.85, Math.min(1.15, dE));
  const legs = [[x0, y0, -1, 2], [x1, y1, 1, 5]].map(([x, y, side, seed]) => ({ ank: [x, y], hip: [x + (B.x - x) * 0.12, mb - 14], k: kl, side, seed }));
  const pose = {
    ink: "solid", disc: "line", discOpts: { w: 1.1 * k, v: 0.55, ticks: 1 }, flow: [0, 1], merge: true, grain: 3,
    light: [-0.5, -0.86],
    head,
    tufts: C ? [{ at: 0.86, size: 46 * k, width: 0.42, lean: -0.2, spikes: 3, fan: 0.6, curl: 0.35, seed: 5, valley: 0.6 }, { at: -0.8, size: 22 * k, width: 0.28, lean: 0.25, spikes: 2, fan: 0.4, curl: 0.2, seed: 6, valley: 0.55 }]
      : [{ at: -0.84, size: 40 * k, width: 0.4, lean: 0.2, spikes: 3, fan: 0.6, curl: 0.35, seed: 7, valley: 0.6 }, { at: 0.82, size: 24 * k, width: 0.3, lean: -0.2, spikes: 2, fan: 0.4, curl: 0.2, seed: 8, valley: 0.55 }],
    body: { ...B, egg: -0.12, sag: 0.05 },
    tail: fit?.tail ?? null,
    wings,
    feet: [], legs,
    eyes: { state: "scowl", r: (C ? HEADK.eyeRC : HEADK.eyeR) * head.rx, spread: SP, el: HEADK.el, look: [0, 0], over: { sx: 1, lookX: 0.45, browSlant: 0.7, brow: 1.1, iris: 0.6, top: 0.42, bot: 0.34 } },
    beak: { el: -0.45, lift: 1.08, w: 32 * k, l: 38 * k, style: "grin", smirk: C ? 0.3 : 0.4, rot: 0 },
    bandage: { az: -0.5, el: 0.36, size: 52 * k, rot: -0.45 },
    // fix #2: bigger cups (the source's are ≈ 70 x 125 px in C, 80 x 105 in D), set further out in C and higher in D
    headphones: { on: true, yaw: head.yaw * 1.1, lift: C ? 1.16 : 1.1, r: (C ? 58 : 60) * k, bandR: 1.12, bandH: 1.3, tilt: 0.08, cupEl: C ? -0.06 : 0.16, w: 12 * k, slim: true, open: 0.72 },
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
// fix #2: the legs as in the source (2x gridded crops at 112.20, 112.76–113.84): a white feathered shank ≈ 28 px wide
// from under the belly down to the ankle, then three thin pale toes (≈ 40–55 px) fanning downward with scale creases
// and small light claws, plus a short back toe. Drawn behind the plumage, so only the part below the belly shows.
function legsCD(g, legs) {
  const P = (p, u, n, a, b) => [p[0] + u[0] * a + n[0] * b, p[1] + u[1] * a + n[1] * b];
  g.save(); g.lineCap = "round"; g.lineJoin = "round";
  for (const L of legs) {
    const { hip, ank, k } = L, r = rng(L.seed);
    const d = [ank[0] - hip[0], ank[1] - hip[1]], len = Math.hypot(d[0], d[1]) || 1, u = [d[0] / len, d[1] / len], n = [-u[1], u[0]];
    const w0 = 17 * k, w1 = 12 * k;
    // shank: soft white, fine grey contour on both sides, feather ticks down its front
    const sh = [P(hip, u, n, 0, -w0), P(hip, u, n, len * 0.55, -w0 * 0.95), P(ank, u, n, 4 * k, -w1), P(ank, u, n, 4 * k, w1), P(hip, u, n, len * 0.55, w0 * 0.95), P(hip, u, n, 0, w0)];
    g.fillStyle = gv(0.9); g.beginPath(); sh.forEach((q, i) => (i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]))); g.closePath(); g.fill();
    ink(g, [sh[0], sh[1], sh[2]], 1.5 * k, gv(0.42, 0.9), { end: 0.35 });
    ink(g, [sh[5], sh[4], sh[3]], 1.5 * k, gv(0.42, 0.9), { end: 0.35 });
    for (let i = 0; i < 5; i++) {
      const t = 0.25 + 0.15 * i, c = P(hip, u, n, len * t, (r() - 0.5) * w0 * 0.6);
      ink(g, [P(c, u, n, 0, -w0 * 0.35), P(c, u, n, 5 * k, 0), P(c, u, n, 0, w0 * 0.35)], 0.9 * k, gv(0.55, 0.55), { end: 0.2 });
    }
    // toes: back toe first, then the three front toes fanning round the leg's own direction
    const base = Math.atan2(u[1], u[0]);
    const toes = [[base + Math.PI * 0.85 * L.side, 16], [base - 0.5 * L.side, 44], [base + 0.02, 54], [base + 0.42 * L.side, 46]];
    for (const [a, tl] of toes) {
      const T = tl * k, tu = [Math.cos(a), Math.sin(a)], tn = [-tu[1], tu[0]], bend = 0.12 * (a > base ? 1 : -1);
      const root = P(ank, u, n, 6 * k, 0), mid = P(root, tu, tn, T * 0.5, T * bend), tip = P(root, tu, tn, T, T * bend * 0.4);
      const q = [root, mid, tip], tw = 5.2 * k;
      const edge = (s) => q.map((p, i) => { const f = 1 - 0.35 * i / 2; return [p[0] + tn[0] * tw * f * s, p[1] + tn[1] * tw * f * s]; });
      const A = edge(1), Bq = edge(-1);
      g.fillStyle = gv(0.86); g.beginPath(); g.moveTo(A[0][0], A[0][1]); g.quadraticCurveTo(A[1][0], A[1][1], A[2][0], A[2][1]);
      g.lineTo(Bq[2][0], Bq[2][1]); g.quadraticCurveTo(Bq[1][0], Bq[1][1], Bq[0][0], Bq[0][1]); g.closePath(); g.fill();
      g.strokeStyle = gv(0.38, 0.9); g.lineWidth = 1.1 * k; g.stroke();
      for (const f of [0.3, 0.52, 0.74]) {       // scale creases across the toe
        const c = [lerp(lerp(root[0], mid[0], f * 2 > 1 ? 1 : f * 2), lerp(mid[0], tip[0], Math.max(0, f * 2 - 1)), f), lerp(lerp(root[1], mid[1], f * 2 > 1 ? 1 : f * 2), lerp(mid[1], tip[1], Math.max(0, f * 2 - 1)), f)];
        g.strokeStyle = gv(0.5, 0.7); g.lineWidth = 0.8 * k; g.beginPath(); g.moveTo(c[0] - tn[0] * tw * 0.7, c[1] - tn[1] * tw * 0.7); g.lineTo(c[0] + tn[0] * tw * 0.7, c[1] + tn[1] * tw * 0.7); g.stroke();
      }
      // claw: a small light hook curling down, a fine keyline, a dark point
      const cu = [tip[0] - mid[0], tip[1] - mid[1]], cl = Math.hypot(cu[0], cu[1]) || 1, cd = [cu[0] / cl, cu[1] / cl], cn = [-cd[1], cd[0]], hk = a > base ? -1 : 1;
      const c1 = P(tip, cd, cn, 6 * k, hk * 2 * k), c2 = P(tip, cd, cn, 9 * k, hk * 5 * k);
      g.fillStyle = gv(0.8); g.beginPath(); g.moveTo(tip[0] + cn[0] * tw * 0.6, tip[1] + cn[1] * tw * 0.6); g.quadraticCurveTo(c1[0], c1[1], c2[0], c2[1]);
      g.lineTo(tip[0] - cn[0] * tw * 0.6, tip[1] - cn[1] * tw * 0.6); g.closePath(); g.fill();
      g.strokeStyle = gv(0.35, 0.9); g.lineWidth = 0.9 * k; g.stroke();
      g.fillStyle = gv(0.2); g.beginPath(); g.arc(c2[0], c2[1], 1.1 * k, 0, Math.PI * 2); g.fill();
    }
  }
  g.restore();
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
// fix #2: the belly as in the source (2x crops at 112.20 / 113.00): white, a soft grey shade on the side away from the
// light and along the bottom (value ≈ 0.8 at the rim), fine pencil strokes following the breast curve on the shaded
// side, and a thin dark ink contour (≈ rgb 70) — not the kit's flat white egg with a feathered edge
function bodyTone(g, pose, H) {
  const b = pose.body, O = bodyOutline(b), r = rng(31);
  const ca = Math.cos(b.rot), sa = Math.sin(b.rot);
  const at = (u, v) => [b.x + ca * u * b.a - sa * v * b.b, b.y + sa * u * b.a + ca * v * b.b];   // u along the axis (+1 = bottom)
  const bp = new Path2D(); O.forEach(([x, y], i) => (i ? bp.lineTo(x, y) : bp.moveTo(x, y))); bp.closePath();
  const notHead = new Path2D(); notHead.rect(0, 0, 4000, 2000); H.out.forEach(([x, y], i) => (i ? notHead.lineTo(x, y) : notHead.moveTo(x, y))); notHead.closePath();
  g.save();
  g.clip(bp); g.clip(notHead, "evenodd");
  // shade: away from the light (upper left) and toward the bottom
  const lx = b.x + b.b * 0.45, ly = b.y - b.a * 0.35;
  const gr = g.createRadialGradient(b.x - b.b * 0.3, b.y - b.a * 0.25, b.b * 0.3, lx, ly, Math.max(b.a, b.b) * 1.55);
  gr.addColorStop(0, "rgba(40,40,44,0)"); gr.addColorStop(0.55, "rgba(40,40,44,0.05)"); gr.addColorStop(1, "rgba(40,40,44,0.26)");
  g.fillStyle = gr; g.fillRect(b.x - 2 * b.b - 2 * b.a, b.y - 2 * b.a - 2 * b.b, 4 * (b.a + b.b), 4 * (b.a + b.b));
  // pencil strokes along the breast curve: arcs round the body's lower end, on the shaded (viewer-right / lower) side
  g.lineCap = "round";
  for (let i = 0; i < 26; i++) {
    const ring = 0.55 + 0.42 * r(), a0 = -0.15 + 1.2 * r(), a1 = a0 + 0.25 + 0.35 * r();
    const pts = [];
    for (let k = 0; k <= 6; k++) { const t = a0 + (a1 - a0) * k / 6; pts.push(at(Math.cos(t) * ring, Math.sin(t) * ring)); }
    g.strokeStyle = `rgba(70,70,76,${(0.12 + 0.16 * r()).toFixed(3)})`; g.lineWidth = 0.8 + 0.7 * r();
    g.beginPath(); pts.forEach(([x, y], k) => (k ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke();
  }
  g.restore();
  // the contour (outside the head), on the lower part of the egg only: above it the wing coverts and the head merge
  // into the body in the source
  g.save(); g.clip(notHead, "evenodd");
  g.lineJoin = "round"; g.lineCap = "round"; g.strokeStyle = "rgba(78,78,84,0.8)"; g.lineWidth = 1.6;
  const N = O.length; g.beginPath();
  let on = false;
  for (let i = 0; i <= N; i++) {
    const [x, y] = O[i % N], u = ((x - b.x) * ca + (y - b.y) * sa) / b.a;
    if (u > -0.15) { if (on) g.lineTo(x, y); else g.moveTo(x, y); on = true; } else on = false;
  }
  g.stroke();
  g.restore();
}
// draw the C/D owl of source frame F into g (frame coordinates). eyes: kit eye override ({ state } or per-eye).
export function drawOwlCD(g, F, { eyes = null, canvas = null } = {}) {
  const pose = cdPose(F);
  if (eyes) pose.eyes = { ...pose.eyes, ...eyes, over: { ...pose.eyes.over, ...(eyes.over || {}) } };
  const H = headGeom(pose.head), HP = pose.headphones;
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
  setPPU(1);
  headphonesCD(g, H, HP, "back");
  // legs behind the plumage (shanks, pale toes and claws: legsCD)
  legsCD(g, pose.legs);
  const L = owlLayer({ ...pose, headphones: { ...HP, on: false }, x: 0, y: 0, s: 1, canvas });
  g.drawImage(L.canvas, L.x, L.y, L.w, L.h);
  setPPU(1);
  bodyTone(g, pose, H);
  if (F <= 2817) crown(g, H);
  headphonesCD(g, H, HP, "front");
  g.restore();
  return { pose, H };
}
export { featherShape, LINE };
