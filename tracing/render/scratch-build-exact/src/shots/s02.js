// Shot 2 (6.04–19.12): one continuous camera.
//   6.04–10.52  the stare: a hard front close-up of the designer lit from below by the laptop; his eyes scan in small
//               flicks (measured iris track), then snap to screen-right at 8.72–8.84 and hold; three sweat beads slide.
//   10.52–14.44 the pan: the camera swings up-right off his face (he slides out bottom-left), through the dark
//               shelves, accelerating (on twos at first — the source's ramped frames), and stops dead on the cartons.
//   14.44–16.52 locked on the carton stack: the owl sits on the top box; slow blink 15.20–15.68; wings open 15.88.
//   16.12–19.12 it takes off, rises, drops toward us and flies right; the camera pans back down-left with it and his
//               face slides in again from the left (still looking right) as the owl flaps at upper right. Cut at 19.12.
// Camera: per-frame translation measured with chained ORB tracks (owl masked), anchored by direct matches back to the
// stare frame (src/shots/s02/cam.js). No zoom or rotation in the source (s = 1.000 ± 0.003).
// Layers (world coords = the 6.04 frame): room plates (engraved: face room full-res, cartons full-res, the whole
// world at half res under both), the designer (Canvas2D ink), eyes + sweat per frame, the owl (kit) on top.
import { W, H } from "../config.js";
import { Plate } from "../lib/engrave.js";
import { clamp, lerp, smooth } from "../lib/rng.js";
import { CAM, CAM0 } from "./s02/cam.js";
import { paintWorld, BOX_OFF } from "./s02/room.js";
import { paintDesigner, paintEye, EYE_DEFS, DROPS, drop } from "./s02/designer.js";
import { sitOwl, flyOwl, owlLayer, SIT, drawFanWing } from "./s02/owl.js";
import { setPPU } from "../lib/owlInk.js";

const T0 = 6.04;
const frameOf = (t) => Math.floor(t * 25 + 0.5);

// ---------- camera ----------
function camAt(f) {
  if (f < CAM0) return [0, 0];
  const i = Math.min(CAM.length / 2 - 1, f - CAM0);
  return [CAM[2 * i], CAM[2 * i + 1]];
}
// motion blur: the source smears along the last real step (held frames keep their smear)
function blurAt(f) {
  if (f <= CAM0) return [0, 0];
  const n = CAM.length / 2;
  for (let k = f; k > CAM0 && k - CAM0 < n; k--) {
    const a = camAt(k - 1), b = camAt(k);
    const d = [b[0] - a[0], b[1] - a[1]];
    if (Math.hypot(d[0], d[1]) > 0.8) return f - k > 2 ? [0, 0] : d;
  }
  return [0, 0];
}

// isotropic softness of the source while the camera sweeps the dark cartons (Laplacian/std drops to a third of the
// static frames with no directional bias): a gaussian of ~1.8 px during 13.8–14.42 s and 16.6–17.62 s
function softAt(t) {
  if (t >= 13.78 && t < 14.43) return 1.8;
  if (t >= 16.58 && t < 17.63) return 1.8;
  return 0;
}

// ---------- the eyes (measured iris offsets during the scan, then the look) ----------
const SCAN = [[6.04, 0], [7.0, 0], [7.04, -2], [7.08, -6], [7.12, -10], [7.16, -10], [7.2, -16], [7.24, -20], [7.28, -22], [7.36, -22], [7.4, -20], [7.44, -16], [7.48, -11], [7.52, -2], [7.56, 5], [7.68, 5], [7.72, 4], [7.76, 0], [7.8, -5], [7.84, -13], [7.88, -19], [7.92, -21], [8.0, -21], [8.04, -20], [8.08, -16], [8.12, -11], [8.16, -11], [8.2, -2], [8.24, 2], [8.32, 2], [8.36, 0], [8.4, -4], [8.44, -8], [8.48, -13], [8.52, -20], [8.56, -21], [8.68, -21], [8.72, -8]];
function tab(T, t) {
  if (t <= T[0][0]) return T[0][1];
  for (let i = 1; i < T.length; i++) if (t <= T[i][0] + 1e-6) { const a = T[i - 1], b = T[i]; return a[1] + (b[1] - a[1]) * (t - a[0]) / (b[0] - a[0]); }
  return T[T.length - 1][1];
}
function eyeState(t) {
  if (t < 8.74) return { dx: tab(SCAN, t), dy: 0, look: 0 };
  if (t < 8.78) return { dx: 6, dy: 2, look: 0.55 };
  if (t < 8.82) return { dx: 1, dy: 0, look: 0.9 };
  return { dx: 0, dy: 0, look: 1 };
}
// sweat beads: measured slide (px below the rest position at 6.04)
const SLIDE_A = [[6.04, 0], [6.28, 3], [6.52, 7], [6.76, 11], [7.0, 15], [7.24, 18], [7.48, 22], [7.72, 25], [7.96, 27], [8.2, 28]];

// ---------- the owl in flight: measured by template-matching the owl's head (with headphones, from the 18.64 s
// frame) over scale 0.66–1.06 and rotation −0.45…+0.2 rad, every frame 16.12–19.12 (scores 0.85–0.98; the motion-blurred
// frames 16.88–16.96 and 17.04–17.08 dropped). Converted to the rig: [t, root x, root y, px per owl unit, bank rad]
// (root offset and scale calibrated on the last sitting frame, 16.08; scale and bank lightly smoothed).
const ROOT = [
  [16.00, 1087, 247, 0.650, 0.000], [16.04, 1087, 247, 0.650, -0.006], [16.08, 1088, 247, 0.650, -0.012], [16.12, 1088, 241, 0.655, -0.018], [16.16, 1088, 231, 0.661, -0.024], [16.20, 1089, 215, 0.666, -0.030], [16.24, 1091, 194, 0.671, -0.030], [16.28, 1092, 186, 0.677, -0.030], [16.32, 1093, 189, 0.682, -0.030], [16.36, 1095, 197, 0.687, -0.030], [16.40, 1098, 212, 0.687, -0.040], [16.44, 1098, 233, 0.687, -0.050], [16.48, 1101, 258, 0.687, -0.060], [16.52, 1104, 283, 0.687, -0.070], [16.56, 1110, 307, 0.692, -0.090], [16.60, 1119, 330, 0.698, -0.110], [16.64, 1126, 352, 0.703, -0.130], [16.68, 1141, 369, 0.703, -0.150], [16.72, 1155, 387, 0.708, -0.170], [16.76, 1169, 401, 0.714, -0.190], [16.80, 1185, 413, 0.719, -0.220], [16.84, 1203, 419, 0.719, -0.250], [17.00, 1286, 429, 0.719, -0.270], [17.12, 1320, 425, 0.703, -0.290], [17.16, 1336, 421, 0.692, -0.300], [17.20, 1352, 415, 0.677, -0.290], [17.24, 1352, 411, 0.671, -0.290], [17.28, 1365, 406, 0.671, -0.270], [17.32, 1377, 403, 0.671, -0.260], [17.36, 1403, 396, 0.671, -0.250], [17.40, 1422, 398, 0.687, -0.240], [17.44, 1435, 401, 0.703, -0.220], [17.48, 1449, 404, 0.719, -0.230], [17.52, 1460, 404, 0.724, -0.230], [17.56, 1469, 402, 0.724, -0.210], [17.60, 1479, 400, 0.730, -0.200], [17.64, 1494, 391, 0.735, -0.200], [17.68, 1496, 394, 0.746, -0.200], [17.72, 1509, 394, 0.756, -0.210], [17.76, 1517, 395, 0.772, -0.240], [17.80, 1532, 403, 0.788, -0.270], [17.84, 1538, 404, 0.804, -0.290], [17.88, 1545, 403, 0.820, -0.300], [17.92, 1548, 400, 0.836, -0.310], [17.96, 1552, 395, 0.846, -0.310], [18.00, 1556, 390, 0.857, -0.300], [18.04, 1559, 384, 0.862, -0.280], [18.08, 1558, 385, 0.868, -0.260], [18.12, 1559, 380, 0.878, -0.220], [18.16, 1562, 375, 0.883, -0.190], [18.20, 1564, 369, 0.889, -0.150], [18.24, 1571, 362, 0.894, -0.110], [18.28, 1576, 355, 0.899, -0.080], [18.32, 1580, 348, 0.905, -0.050], [18.36, 1585, 340, 0.910, -0.020], [18.40, 1588, 334, 0.910, 0.010], [18.44, 1595, 328, 0.910, 0.030], [18.48, 1599, 325, 0.910, 0.050], [18.52, 1606, 321, 0.915, 0.070], [18.56, 1612, 316, 0.921, 0.090], [18.60, 1623, 307, 0.926, 0.100], [18.64, 1632, 304, 0.931, 0.110], [18.68, 1639, 299, 0.937, 0.120], [18.72, 1646, 294, 0.942, 0.120], [18.76, 1653, 290, 0.947, 0.130], [18.80, 1658, 287, 0.947, 0.140], [18.84, 1667, 282, 0.947, 0.150], [18.88, 1674, 277, 0.947, 0.160], [18.92, 1680, 271, 0.947, 0.170], [18.96, 1686, 266, 0.947, 0.170], [19.00, 1693, 259, 0.947, 0.170], [19.04, 1700, 253, 0.947, 0.170], [19.08, 1700, 253, 0.947, 0.170], [19.12, 1706, 251, 0.947, 0.170]];
const WROOT = (t, k) => spline(ROOT, t, k);
function spline(T, t, k) {
  // Catmull-Rom through table rows [t, v1, v2...], column k
  if (t <= T[0][0]) return T[0][k];
  const n = T.length;
  if (t >= T[n - 1][0]) return T[n - 1][k];
  let i = 1; while (T[i][0] < t) i++;
  const p0 = T[Math.max(0, i - 2)], p1 = T[i - 1], p2 = T[i], p3 = T[Math.min(n - 1, i + 1)];
  const u = (t - p1[0]) / (p2[0] - p1[0]), u2 = u * u, u3 = u2 * u;
  return 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * u + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * u2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * u3);
}
// wing elevation per frame as seen in the frame, viewer-left and viewer-right wing (+1 up, 0 level, -1 down), read off
// an owl-centred strip of every source frame (snapshots/s02-study/flap-strip.jpg); converted to owl space with the bank
const WINGS = [[16.0, -0.7, -0.7], [16.04, -0.4, -0.4], [16.08, -0.3, -0.3], [16.12, -0.2, -0.2], [16.16, -0.1, -0.1], [16.2, 0, 0], [16.24, 0.1, 0.1],
  [16.28, 0.3, 0.3], [16.32, 0.6, 0.6], [16.36, 0.8, 0.8], [16.4, 0.9, 0.9], [16.44, 0.7, 0.7], [16.48, 0.3, 0.3], [16.52, 0, 0], [16.56, -0.2, -0.2],
  [16.6, -0.2, -0.2], [16.64, -0.1, -0.1], [16.68, 0.1, 0.1], [16.72, 0.5, 0.5], [16.76, 0.8, 0.8], [16.8, 0.5, 0.5], [16.84, 0.2, 0.2], [16.88, 0, 0],
  [16.92, -0.1, -0.1], [16.96, 0, 0], [17.0, 0, 0.2], [17.04, -0.2, 0.4], [17.08, 0, 0.6], [17.12, 0.3, 0.9], [17.16, 0.1, 0.7], [17.2, -0.2, 0.4],
  [17.24, -0.1, 0.2], [17.28, 0, 0.3], [17.32, 0.1, 0.5], [17.36, -0.2, 0.1], [17.4, -0.2, 0.2], [17.44, 0, 0.7], [17.48, 0.1, 0.9], [17.52, 0, 0.7],
  [17.56, -0.2, 0.4], [17.6, -0.2, 0.1], [17.64, -0.2, 0.2], [17.68, -0.2, 0.3], [17.72, -0.2, 0.2], [17.76, 0, 0.4], [17.8, 0.1, 0.8], [17.84, 0, 0.8],
  [17.88, -0.2, 0.6], [17.92, -0.1, 0.2], [17.96, 0, 0.1], [18.0, 0, 0], [18.04, 0, 0.1], [18.08, 0, 0], [18.12, 0, 0.1], [18.16, 0.1, 0.2],
  [18.2, 0.3, 0.4], [18.24, 0.5, 0.4], [18.28, 0.3, 0.2], [18.32, 0.1, 0.15], [18.36, 0.1, 0.05], [18.4, 0.1, -0.05], [18.44, 0.2, -0.05], [18.48, 0.4, 0.05],
  [18.52, 0.6, 0.15], [18.56, 0.7, 0.15], [18.6, 0.6, 0.05], [18.64, 0.5, 0.05], [18.68, 0.3, -0.05], [18.72, 0.4, -0.05], [18.76, 0.4, -0.05],
  [18.8, 0.5, -0.05], [18.84, 0.8, 0.05], [18.88, 0.8, 0.05], [18.92, 0.6, -0.05], [18.96, 0.4, -0.05], [19.0, 0.3, -0.05], [19.12, 0.3, -0.05]];
const tab2 = (T, t, k) => {
  if (t <= T[0][0]) return T[0][k];
  for (let i = 1; i < T.length; i++) if (t <= T[i][0] + 1e-6) { const a = T[i - 1], b = T[i]; return a[k] + (b[k] - a[k]) * (t - a[0]) / (b[0] - a[0]); }
  return T[T.length - 1][k];
};
function owlState(t) {
  // measured on the eye region: lids close 15.20, shut 15.24–15.56, open again by 15.76; shut again 15.88–15.96
  // for the take-off; wings leave the sides at 15.96
  const eyes = t < 15.2 - 1e-6 ? "open" : t < 15.24 - 1e-6 ? "half" : t < 15.6 - 1e-6 ? "closed" : t < 15.74 - 1e-6 ? "half" : t < 15.88 - 1e-6 ? "open" : t < 15.96 - 1e-6 ? "half" : "closed";
  if (t < 16.0 - 1e-6) return { kind: "sit", eyes, wing: t < 15.96 - 1e-6 ? 0 : 0.3 };
  const rot = spline(ROOT, t, 4);
  // wing angle per unit of elevation is ~1 rad, so the bank shifts the frame-space readings by -rot / +rot
  return { kind: "fly", eL: tab2(WINGS, t, 1) - rot, eR: tab2(WINGS, t, 2) + rot, rot, perch: t < 16.12 - 1e-6 };
}

// ---------- layers ----------
let L = null;
function region(x0, y0, x1, y1, scale, feather) {
  const P = new Plate(x1 - x0, y1 - y0, scale);
  for (const g of [P.v, P.d, P.o]) g.translate(-x0, -y0);
  paintWorld(P);
  const c = P.engrave({ spacing: 4.6, seed: 23, contrast: 1.0 });
  if (feather) {
    // fade the plate's inner edges so it melts into the half-res world under it: [side, width] in world px
    const m = document.createElement("canvas"); m.width = c.width; m.height = c.height;
    const mg = m.getContext("2d"); mg.scale(scale, scale);
    const w = x1 - x0, h = y1 - y0;
    mg.fillStyle = "#fff"; mg.fillRect(0, 0, w, h);
    mg.globalCompositeOperation = "destination-out";
    for (const [side, fw] of feather) {
      const [ax, ay, bx, by, rx, ry, rw, rh] = side === "r" ? [w, 0, w - fw, 0, w - fw, 0, fw, h] : side === "l" ? [0, 0, fw, 0, 0, 0, fw, h] : side === "t" ? [0, 0, 0, fw, 0, 0, w, fw] : [0, h, 0, h - fw, 0, h - fw, w, fw];
      const gr = mg.createLinearGradient(ax, ay, bx, by); gr.addColorStop(0, "rgba(0,0,0,1)"); gr.addColorStop(1, "rgba(0,0,0,0)");
      mg.fillStyle = gr; mg.fillRect(rx, ry, rw, rh);
    }
    const g = c.getContext("2d");
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = "destination-in"; g.drawImage(m, 0, 0); g.restore();
  }
  return { c, x0, y0, x1, y1 };
}
function layers() {
  if (L) return L;
  const mid = region(-60, -1980, 4460, 1000, 0.5, null);
  const face = region(-40, -620, 2760, 960, 1, [["r", 140], ["t", 140]]);
  const boxes = region(1880, -1980, 4460, -300, 1, [["l", 140], ["b", 140]]);
  // the designer, drawn once (world rect x 0..W, y -400..H)
  const d = document.createElement("canvas"); d.width = W; d.height = H + 400;
  const dg = d.getContext("2d"); dg.translate(0, 400);
  paintDesigner(dg);
  L = { plates: [mid, face, boxes], designer: { c: d, x0: 0, y0: -400, x1: W, y1: H }, scratch: null, acc: null, owl: new Map() };
  return L;
}
const visible = (r, ox, oy, m) => r.x1 + ox > -m && r.x0 + ox < W + m && r.y1 + oy > -m && r.y0 + oy < H + m;

// paint the world (room, designer, eyes, sweat) with the camera offset (ox, oy)
function drawWorld(g, t, ox, oy, m) {
  for (const p of L.plates) if (visible(p, ox, oy, m)) g.drawImage(p.c, p.x0 + ox, p.y0 + oy, p.x1 - p.x0, p.y1 - p.y0);
  const D = L.designer;
  if (visible(D, ox, oy, m)) {
    g.drawImage(D.c, D.x0 + ox, D.y0 + oy);
    g.save(); g.translate(ox, oy);
    g.lineCap = "round"; g.lineJoin = "round";
    const st = eyeState(t);
    for (const E of EYE_DEFS) paintEye(g, E, st);
    const sa = tab(SLIDE_A, t) / 28;
    for (const d of DROPS) {
      let dy = 0;
      if (d.slide) dy = d.slide[2] * (d.slide[1] > 8 ? sa : smooth(clamp((t - 6.04) / (d.slide[1] - 6.04))));
      drop(g, d.x, d.y + dy, d.s);
    }
    g.restore();
  }
}

function owlAt(t, off) {
  const st = owlState(t);
  let key, pose, x, y, s;
  if (st.kind === "sit") {
    key = `sit-${st.eyes}-${st.wing.toFixed(2)}`;
    pose = () => sitOwl(st);
    const base = [-BOX_OFF[0], -BOX_OFF[1]];
    x = SIT.x + off[0] - base[0]; y = SIT.y + off[1] - base[1]; s = SIT.s;
  } else {
    const rot = st.rot;
    s = WROOT(t, 3); x = WROOT(t, 1); y = WROOT(t, 2);
    key = null; pose = () => ({ ...flyOwl(st), rot });
    return { key, pose, x, y, s, rot };
  }
  return { key, pose, x, y, s };
}

export const shot = {
  draw(ctx, local, t) {
    const f = frameOf(t), tq = f / 25;
    layers();
    const off = camAt(f);
    const bl = blurAt(f);
    // the source smears far less than the step: ~4 px at 10 px/frame, ~9 px at 40 px/frame (directional
    // gradient ratio along/across the pan, calibrated against synthetic line blurs of a static source frame)
    const step = Math.hypot(bl[0], bl[1]);
    const blen = 10 * (1 - Math.exp(-step / 15));
    const soft = softAt(tq);
    if (blen < 2 && !soft) {
      drawWorld(ctx, tq, off[0], off[1], 0);
    } else {
      // average N copies along the smear in an offscreen buffer (premultiplied "lighter" sum)
      const m = Math.ceil(blen) + 4;
      if (!L.scratch) { L.scratch = document.createElement("canvas"); }
      const S = L.scratch;
      if (S.width !== W + 2 * m || S.height !== H + 2 * m) { S.width = W + 2 * m; S.height = H + 2 * m; }
      const sg = S.getContext("2d");
      sg.setTransform(1, 0, 0, 1, 0, 0); sg.globalCompositeOperation = "source-over"; sg.globalAlpha = 1;
      sg.fillStyle = "#000"; sg.fillRect(0, 0, S.width, S.height);
      drawWorld(sg, tq, off[0] + m, off[1] + m, m);
      let src = S;
      if (soft) {
        // one isotropic blur pass into a second buffer (not per copy)
        if (!L.scratch2) L.scratch2 = document.createElement("canvas");
        const S2 = L.scratch2;
        if (S2.width !== S.width || S2.height !== S.height) { S2.width = S.width; S2.height = S.height; }
        const g2 = S2.getContext("2d");
        g2.setTransform(1, 0, 0, 1, 0, 0); g2.filter = `blur(${soft}px)`; g2.drawImage(S, 0, 0); g2.filter = "none";
        src = S2;
      }
      const N = blen < 2 ? 1 : Math.min(8, 2 + Math.round(blen / 2));
      ctx.save();
      ctx.globalCompositeOperation = N > 1 ? "lighter" : "source-over"; ctx.globalAlpha = 1 / N;
      const bh = Math.hypot(bl[0], bl[1]) || 1, ux = bl[0] / bh, uy = bl[1] / bh;
      for (let k = 0; k < N; k++) {
        const s = N > 1 ? (k / (N - 1) - 0.5) * blen : 0;
        ctx.drawImage(src, -m + ux * s, -m + uy * s);
      }
      ctx.restore();
    }
    // the owl (visible from 13.9 s)
    if (tq >= 13.8) {
      const o = owlAt(tq, off);
      let lay;
      if (o.key) {
        if (!L.owl.has(o.key)) L.owl.set(o.key, owlLayer({ ...o.pose(), x: 0, y: 0, s: o.s, res: 1 }));
        lay = L.owl.get(o.key);
      } else {
        if (!L.flyCanvas) L.flyCanvas = document.createElement("canvas");
        lay = owlLayer({ ...o.pose(), x: 0, y: 0, s: o.s, canvas: L.flyCanvas });
        // the wings, behind the body: owl units -> frame (x, y, s, rot)
        const st = owlState(tq);
        ctx.save(); ctx.translate(o.x, o.y); ctx.rotate(o.rot || 0); ctx.scale(o.s, o.s);
        setPPU(o.s);
        drawFanWing(ctx, -1, Math.max(-1, Math.min(1, st.eL)));
        drawFanWing(ctx, 1, Math.max(-1, Math.min(1, st.eR)));
        ctx.restore();
      }
      ctx.drawImage(lay.canvas, lay.x + o.x, lay.y + o.y, lay.w, lay.h);
    }
  },
  release() { L = null; },
};
