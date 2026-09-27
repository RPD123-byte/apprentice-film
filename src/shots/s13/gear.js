// s13 hand-built parts (fix pass 1b): the headphones, bandage, beak, eyes and sweat drop, drawn as authored shapes
// from measured control points (ellipse centres / axes, corner and tip points, a few widths and values read on
// zoomed source frames). No traced polygons or strokes.
import { taper } from "../../lib/ink.js";
import { gv, LINE, ink, flick, softShade, V } from "../../lib/owlInk.js";
import { brush, swellStroke, brushRim, angInterp, leather } from "./brush.js";
import { TAU, mixPath, shp, clipTo, ell, offsetLine, sampleCurve, smoothPath, rng } from "./util.js";

const { add, sub, mul, nrm, perp } = V;
const clamp01 = (x) => Math.max(0, Math.min(1, x));

// ---------------------------------------------------------------- print mesh
// The headphones' metal mesh (measured by FFT on the 3/4 plate: two families of crisp lines at +-45 deg, 3.25 px
// apart across the lines, contrast ~0.2 .. 0.8 pre-grade): drawn as 1.1-1.3 px dark lines over a light ground inside
// the clip, each line's darkness varied a little (the source shows a faint moire).
export function mesh(g, clip, box, { lo = 0.16, hi = 0.8, pitch = 3.25, w = 1.2, seed = 7, ground = true, alpha = 1 } = {}) {
  const [x0, y0, x1, y1] = box, r = rng(seed);
  g.save(); g.beginPath(); clip(g); g.clip("evenodd");
  if (ground) { g.fillStyle = gv(hi); g.fillRect(x0 - 2, y0 - 2, x1 - x0 + 4, y1 - y0 + 4); }
  g.lineWidth = w; g.lineCap = "butt";
  const D = (x1 - x0) + (y1 - y0), s2 = Math.SQRT2 * pitch;
  for (const sgn of [1, -1]) {
    for (let k = -D; k < D; k += s2) {
      g.strokeStyle = gv(lo + (r() - 0.5) * 0.12, alpha);
      g.beginPath();
      if (sgn > 0) { g.moveTo(x0 + k, y0); g.lineTo(x0 + k + (y1 - y0), y1); }
      else { g.moveTo(x1 - k, y0); g.lineTo(x1 - k - (y1 - y0), y1); }
      g.stroke();
    }
  }
  g.restore();
}

// ---------------------------------------------------------------- eyes
// pupil: a small dark dot inside a ring broken into two arcs (parentheses)
export function pupil(g, e) {
  const P = e.pupil;
  for (const [a0, a1, w] of P.arcs) {
    const pts = []; for (let i = 0; i <= 16; i++) { const a = a0 + ((a1 - a0) * i) / 16; pts.push([P.x + Math.cos(a) * P.rx, P.y + Math.sin(a) * P.ry]); }
    taper(g, pts, (u) => w * (0.3 + 0.7 * Math.pow(Math.sin(Math.PI * u), 0.5)), gv(P.arcV ?? 0.1, 0.95));
  }
  g.fillStyle = LINE; g.beginPath(); g.ellipse(P.x, P.y + 0.5, P.dot[0], P.dot[1], 0, 0, TAU); g.fill();
  if (P.notch) { g.fillStyle = gv(0.99); g.beginPath(); g.moveTo(P.x - 1.2, P.y - P.dot[1] - 0.5); g.lineTo(P.x + 1.2, P.y - P.dot[1] - 0.5); g.lineTo(P.x, P.y - P.dot[1] * 0.3); g.fill(); }
}
// a big startled eye: white inside a rim drawn as 2-3 overlapping brush strokes (radius and weight measured round the
// eye at 32 angles), fine grey lashes outside it (seeded rule), and the pupil
export function eye(g, e, seed) {
  const R = e.R ? angInterp(e.R) : () => 1;
  const Wd = e.W ? angInterp(e.W) : (a) => 4.4 + 2 * Math.pow(Math.max(0, Math.sin(a)), 1.2) + 1.2 * Math.max(0, -Math.cos(a));
  const cr = Math.cos(e.rot), sr = Math.sin(e.rot);
  const at = (a, k) => { const x = Math.cos(a) * e.rx * k, y = Math.sin(a) * e.ry * k; return [e.x + x * cr - y * sr, e.y + x * sr + y * cr]; };
  g.fillStyle = gv(e.white ?? 0.99); g.beginPath();
  for (let i = 0; i <= 64; i++) { const a = (i / 64) * TAU, q = at(a, R(a)); i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]); }
  g.fill();
  if (e.inner) {   // a faint grey inner shade along the top of the eye (the lid's shadow)
    g.save(); g.beginPath(); for (let i = 0; i <= 64; i++) { const a = (i / 64) * TAU, q = at(a, R(a)); i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]); } g.clip();
    g.filter = `blur(${e.inner[3] ?? 6}px)`; g.fillStyle = gv(e.inner[0], e.inner[1]); g.beginPath(); const c = at(-Math.PI / 2, 1.05); g.ellipse(c[0], c[1], e.rx * 0.9, e.ry * e.inner[2], e.rot, 0, TAU); g.fill(); g.filter = "none"; g.restore();
  }
  const r = rng(seed);
  for (const [a0, a1, n0, lv = 0.32] of e.lash) {
    const n = Math.round(n0 * 1.3);
    for (let i = 0; i < n; i++) {
      const a = a0 + (a1 - a0) * r(), k = R(a) + 0.07 + r() * 0.08, span = 0.25 + r() * 0.35;
      swellStroke(g, [at(a, k), at(a + span * 0.5, k + 0.015), at(a + span, k)], 1.1 + r() * 0.9, gv(lv, 0.65));
    }
  }
  brushRim(g, e, R, Wd, e.segs || [[-0.35, 3.35, 0], [3.0, 6.1, 0.004], [5.75, 6.75, -0.003]], gv(e.rimV ?? 0.07));
  if (e.tick) brush(g, e.tick, 4.5, gv(0.07));
  pupil(g, e);
}

// ---------------------------------------------------------------- sweat drop (C, measured on the C hold: a grey
// outline, a fine tail from (1296, 231) down the left side at x 1303, the round bottom at (1311, 301), fading out up the
// right side at (1313, 264); a faint grey dab inside)
const DROP = [[1295.5, 231], [1298.5, 238], [1300.5, 244], [1302, 250], [1303, 257], [1303.3, 266], [1303.3, 276], [1303.4, 286], [1304, 293], [1305.5, 297], [1308, 299.8], [1311, 300.5], [1314, 299.3], [1316.3, 296.5], [1317.6, 292], [1318, 285], [1317.2, 279], [1315.8, 273], [1314.3, 268], [1313, 264]];
const DROP_W = [0.3, 0.8, 1.3, 1.7, 1.9, 2.1, 2.4, 2.8, 3.0, 3.1, 3.1, 3.1, 3.1, 3.0, 2.8, 2.4, 1.5, 0.8, 0.4, 0.2];
export function drop(g, o = [0, 0], v = 0.2, dab = 0.72) {
  const q = sampleCurve(DROP.map(([x, y]) => [x + o[0], y + o[1]]), 4), n = DROP.length;
  taper(g, q, (u) => { const f = u * (n - 1), i = Math.min(n - 2, Math.floor(f)), k = f - i; return DROP_W[i] * (1 - k) + DROP_W[i + 1] * k; }, gv(v));
  ink(g, [[1308.6 + o[0], 285 + o[1]], [1308.4 + o[0], 290 + o[1]], [1308.6 + o[0], 295 + o[1]]], 2.6, gv(dab, 0.7), { end: 0.3 });
}

export { clamp01 };

// ---------------------------------------------------------------- hand-built parts kept from pass 2 (measured at 35.80 / 36.20;
// values re-measured in 1b): the 3/4 beak and the front cups
export function paintBeak3q(g) {
  // (fix pass 1b: values re-measured on the C hold — mandible 0.94 left / 0.83 middle / 0.71 lower right, cavity 0.09,
  // tongue 0.45, jaw 0.72, the jaw's near side 0.5)
  // measured on 35.80 (6x zoom): a pale hooked upper mandible with smooth grey washes, the mouth a dark lens under
  // a heavy upper lip with a grey tongue in it, and the lower mandible hanging open as a pale wedge (tip 1048,512)
  const up = [[1008, 396], [1034, 392], [1062, 398], [1070, 420], [1067, 444], [1060, 457], [1053, 462], [1045, 468], [1038, 477], [1035, 487], [1032.5, 495, 1], [1025, 488], [1015, 473], [1006, 453], [1004, 430], [1005, 410]];
  const p = shp(up);
  g.fillStyle = gv(0.88); g.beginPath(); p(g); g.fill();
  clipTo(g, p, () => {
    g.filter = "blur(7px)";
    g.fillStyle = gv(0.95); g.beginPath(); g.ellipse(1016, 425, 10, 36, 0.15, 0, TAU); g.fill();
    g.fillStyle = gv(0.8, 0.8); g.beginPath(); g.ellipse(1042, 440, 16, 16, 0, 0, TAU); g.fill();
    g.fillStyle = gv(0.64, 0.9); g.beginPath(); g.ellipse(1056, 456, 12, 10, 0.4, 0, TAU); g.fill();
    // (fix 2) rows on the C hold: the mandible's middle and right are grey (screen 209-237 at y 440, x 1024-1076)
    g.fillStyle = gv(0.8, 0.75); g.beginPath(); g.ellipse(1052, 436, 20, 30, 0.1, 0, TAU); g.fill();
    g.filter = "none";
  });
  g.save(); g.filter = "blur(4px)"; swellStroke(g, [[1066, 398], [1075, 420], [1072, 444], [1066, 455]], 7, gv(0.97, 0.8), { end: 0.6 }); g.restore();
  // mouth: the dark cavity (a lens under the upper lip running down the left side of the tongue to the hinge)
  const cav = [[1049, 468], [1054, 461], [1064, 454], [1076, 451], [1090, 454], [1104, 459], [1113, 465], [1119, 471], [1104, 466], [1090, 463.5], [1078, 464], [1068, 467], [1063, 474], [1061.5, 484], [1060, 492], [1058, 494], [1056, 484], [1052, 472]];
  g.fillStyle = gv(0.07); g.beginPath(); smoothPath(g, cav, true); g.fill();
  clipTo(g, (c) => smoothPath(c, cav, true), () => { g.filter = "blur(3px)"; g.fillStyle = gv(0.3, 0.7); g.beginPath(); g.ellipse(1057, 482, 3, 10, 0, 0, TAU); g.fill(); g.filter = "none"; });
  // tongue: grey, a couple of pale streaks along it
  const tongue = [[1063, 478], [1068, 469.5], [1080, 466], [1096, 465.5], [1111, 467.5], [1118, 471], [1104, 477], [1088, 482], [1074, 489], [1062, 494]];
  g.fillStyle = gv(0.4); g.beginPath(); smoothPath(g, tongue, true); g.fill();
  clipTo(g, (c) => smoothPath(c, tongue, true), () => {
    g.filter = "blur(2px)"; g.fillStyle = gv(0.18, 0.8); g.beginPath(); g.ellipse(1086, 467, 26, 3.5, 0.05, 0, TAU); g.fill(); g.filter = "none";
    swellStroke(g, [[1072, 475], [1092, 471], [1112, 470]], 2.4, gv(0.66, 0.85));
    swellStroke(g, [[1068, 485], [1086, 478], [1105, 474]], 1.8, gv(0.58, 0.8));
  });
  // lower mandible: a pale wedge hanging from the hinge, inner lip along its top
  const jaw = [[1057, 497], [1072, 489], [1088, 481], [1104, 475], [1118, 471], [1113, 482], [1104, 493], [1088, 504], [1070, 509], [1047.5, 513, 1]];
  g.fillStyle = gv(0.74); g.beginPath(); mixPath(g, jaw, true); g.fill();
  clipTo(g, (c) => mixPath(c, jaw, true), () => {
    g.filter = "blur(5px)"; g.fillStyle = gv(0.6, 0.8); g.beginPath(); g.ellipse(1060, 505, 9, 7, 0.3, 0, TAU); g.fill();
    g.fillStyle = gv(0.6, 0.6); g.beginPath(); g.ellipse(1100, 492, 14, 5, -0.5, 0, TAU); g.fill(); g.filter = "none";
  });
  // the jaw's near side between the cavity and its outer edge
  const side = [[1051, 469], [1055, 486], [1058, 498], [1047.5, 513], [1049, 490]];
  g.fillStyle = gv(0.5); g.beginPath(); smoothPath(g, side, true); g.fill();
  // ink: mandible outline and hook, the heavy upper lip, the jaw outline and inner lip
  swellStroke(g, [[1008, 402], [1004, 430], [1006, 453], [1015, 473], [1025, 488], [1032.5, 495]], 3.3, LINE, { end: 0.35 });
  swellStroke(g, [[1032.5, 496], [1035.5, 486], [1038, 477], [1045, 468]], 2.8, LINE, { end: 0.5 });
  swellStroke(g, [[1044, 469], [1053, 462], [1066, 453], [1078, 450.5], [1092, 454], [1106, 460], [1119, 470]], 4.6, LINE, { end: 0.25, pow: 0.4 });
  swellStroke(g, [[1052, 468], [1049, 490], [1047.5, 513]], 2.6, LINE, { end: 0.5 });
  swellStroke(g, [[1047.5, 513], [1070, 509.5], [1088, 505], [1104, 494], [1113, 483], [1119, 471]], 2.8, LINE, { end: 0.3 });
  swellStroke(g, [[1057, 497], [1072, 489], [1088, 481], [1104, 475], [1117, 471]], 1.7, gv(0.12), { end: 0.3 });
  // the facial feathers overlap the root of the beak
  const r = rng(391);
  for (let i = 0; i < 30; i++) { const x = 1000 + r() * 70, y = 376 + r() * 14; flick(g, [x, y], nrm([0.25 * (r() - 0.5), 1]), 18 + r() * 14, 3.0, gv(0.97), 0.1); }
  // rictal bristles: dark tapered strokes sweeping down-right across the beak base to the mouth corner
  const BR = [[1052, 398, 1061, 421], [1057, 395, 1067, 423], [1063, 403, 1074, 433], [1068, 408, 1083, 440], [1075, 414, 1091, 443], [1082, 428, 1098, 452], [1090, 432, 1108, 459],
    [1098, 440, 1115, 463], [1107, 444, 1123, 463], [1115, 447, 1130, 462], [1046, 400, 1052, 418]];
  BR.forEach(([x0, y0, x1, y1], i) => { const q = rng(395 + i); brush(g, [[x0, y0], [(x0 + x1) / 2 + 1.5, (y0 + y1) / 2 - 1], [x1, y1]], 2.2 + q() * 0.8, gv(0.2 + q() * 0.15, 0.95)); });
  // the nostril (source: ~6 px, screen ~80 at (1041, 418))
  g.fillStyle = gv(0.28); g.beginPath(); g.ellipse(1041, 418.5, 3.1, 2.5, 0.3, 0, TAU); g.fill();
}
// the near headphone cup, seen from the side: ribbed dark cushion against the head, brushed shell, mesh plate,
// a pale yoke bar down the front and the mesh slider running up to the band
export function paintCupD(g, C) {
  const r = rng(C.seed), s = C.side;
  // shell bands, outermost first: dark chrome with a bright stripe and a grey one, heavy outline, convex outer edge
  for (let i = C.bands.length - 1; i >= 0; i--) {
    const [a, b, y0, y1] = C.bands[i], ym = (y0 + y1) / 2, xo = s < 0 ? a : b, xi = s < 0 ? b : a, lean = C.lean || 0;
    const L = (y) => (y - ym) * lean;
    // the band's inner edge runs straight down under the next band in (drawn later, so no gap shows); its outer
    // edge bows out, with rounded ends
    const ow = [[xi + s * 3 + L(y0 - 2), y0], [xo - s * 3 + L(y0 + 12), y0 + 10], [xo + L(ym), ym], [xo - s * 3 + L(y1 - 12), y1 - 10], [xi + s * 3 + L(y1 + 2), y1]];
    const path = (c) => { smoothPath(c, ow, false, 0.5); c.lineTo(xi - s * 6 + L(y1), y1); c.lineTo(xi - s * 6 + L(y0), y0); c.closePath(); };
    // (fix pass 1b) each band's mean tone measured on the source (C.bandV, pre-grade): base at 0.62 of it, one bright
    // stripe and one grey stripe scaled to it
    const bv = (C.bandV || [0.56, 0.56, 0.56])[i];
    g.fillStyle = gv(bv * 0.62); g.beginPath(); path(g); g.fill();
    clipTo(g, path, () => {
      const w = Math.abs(b - a);
      for (const [f, v, ww] of [[0.3, Math.min(0.95, bv + 0.42), 0.26], [0.64, Math.min(0.9, bv + 0.12), 0.2], [0.95, 0.1, 0.08]]) {
        const x = xi + (xo - xi) * f;
        taper(g, sampleCurve([[x + L(y0), y0 + 6], [x + L(ym) - s * 1.5, ym], [x + L(y1), y1 - 6]], 10), (u) => w * ww * (0.4 + 0.6 * Math.pow(Math.sin(Math.PI * u), 0.4)), gv(v, 0.9));
      }
      for (let k = 0; k < 3; k++) { const x = xi + (xo - xi) * (0.2 + r() * 0.6), yy = y0 + 20 + r() * (y1 - y0 - 40); brush(g, [[x + L(yy), yy], [x + L(yy + 30), yy + 24 + r() * 20]], 1.2, gv(r() < 0.5 ? 0.97 : 0.1, 0.7)); }
      // (measured) the chrome dims toward the bottom of each band
      g.filter = "blur(12px)"; g.fillStyle = gv(0.12, 0.6); g.beginPath(); g.ellipse((a + b) / 2 + L(y1), y1 - (y1 - y0) * 0.12, Math.abs(b - a), (y1 - y0) * 0.32, 0, 0, TAU); g.fill(); g.filter = "none";
    });
    g.strokeStyle = LINE; g.lineWidth = 1.8; g.beginPath(); smoothPath(g, ow, false, 0.5); g.stroke();
  }
  // cushion: black; ribs = thin pale arcs across it, bowing up in the top half and down in the bottom half
  const cp = (c) => smoothPath(c, C.cush, true, 0.3);
  g.fillStyle = gv(C.cushV ?? 0.05); g.beginPath(); cp(g); g.fill();
  clipTo(g, cp, () => {
    let ys = 1e9, ye = -1e9, xs = 1e9, xe = -1e9; for (const [x, y] of C.cush) { ys = Math.min(ys, y); ye = Math.max(ye, y); xs = Math.min(xs, x); xe = Math.max(xe, x); }
    const [px0, py0, px1, py1] = C.patch;
    g.filter = "blur(5px)"; g.fillStyle = gv(C.patchV ?? 0.52, 0.9); g.beginPath(); g.ellipse((px0 + px1) / 2, (py0 + py1) / 2, (px1 - px0) * 0.62, (py1 - py0) * 0.56, (C.lean || 0) * -1, 0, TAU); g.fill(); g.filter = "none";
    for (let y = ys + 10; y < ye - 6; y += 9 + r() * 6) {
      const u = (y - ys) / (ye - ys), bow = (u < 0.5 ? -1 : 1) * (2 + r() * 3), L0 = (C.lean || 0) * (y - (ys + ye) / 2);
      const wc = xe - xs, fr = 0.35 + r() * 0.4, x0 = (s < 0 ? xs + 4 : xe - 4 - wc * fr) + r() * 4 + L0, x1 = x0 + wc * fr;
      if (y > py0 && y < py1 && r() < 0.5) continue;
      swellStroke(g, [[x0, y + bow], [(x0 + x1) / 2, y], [x1, y + bow]], 1.4 + r() * 1.6, gv(0.45 + 0.3 * r(), 0.85));
    }
    for (let y = py0 + 4; y < py1 - 4; y += 7 + r() * 6) { const x = px0 + r() * 6; brush(g, [[x + (px1 - px0) * 0.9, y + 2], [x + (px1 - px0) * 0.4, y + (r() - 0.5) * 3], [x, y + 3]], 2, gv(0.08, 0.8)); }
    // (1b) crumpled leather: pale irregular blotches stacked down the lit column (the D right cup, 901-902)
    if (C.blotch) for (let y = py0; y < py1 + 20; y += 8 + r() * 7) {
      const x = (px0 + px1) / 2 + (r() - 0.5) * 10 + (C.lean || 0) * (y - (py0 + py1) / 2), w = 8 + r() * 12, h = 3 + r() * 4;
      g.fillStyle = gv(0.45 + r() * 0.25, 0.9); g.beginPath(); smoothPath(g, [[x - w, y], [x - w * 0.3, y - h], [x + w * 0.6, y - h * 0.6], [x + w, y + 1], [x + w * 0.2, y + h], [x - w * 0.6, y + h * 0.7]], true); g.fill();
    }
  });
  g.strokeStyle = LINE; g.lineWidth = 3; g.beginPath(); cp(g); g.stroke();
}

// ---------------------------------------------------------------- the near cup in 3/4 (pose C), fix pass 1b
// Geometry measured on the C hold by edge-fitted ellipses (snapshots/s13-fix1-tools/fitell.py) and snapped control
// points (snap.py): the cushion's outer rim, the shell's rim (= the cushion's inner edge), the plate's dark rim and its
// mesh; the yoke (J strip) centre line and the arm's outer edge. Materials authored: black leather with pale crumpled
// pleats on its lit left face and a row of stitch dots low; chrome bands round the plate (bright on the left, dim
// below); a crisp +-45 deg mesh.
export const C3 = {
  cush: { x: 1458.6, y: 279.3, rx: 84.5, ry: 119.2, rot: -0.055 },
  shell: { x: 1481.5, y: 280.9, rx: 64.5, ry: 93, rot: -0.025 },
  rim: { x: 1510.9, y: 274.1, rx: 35.1, ry: 67.8, rot: -0.055 },
  plate: { x: 1511.2, y: 277.5, rx: 33.0, ry: 62.0, rot: -0.03 },
  yoke: [[1453, 124], [1455, 130], [1461, 160], [1465, 190], [1466, 215], [1454, 239], [1451, 265], [1452, 285], [1455, 297], [1464, 303], [1478, 305]],
  arm: [[1450, 118], [1480, 96], [1492, 125], [1506, 149], [1513, 179], [1521, 199], [1512, 206], [1497, 212], [1484, 226], [1478, 252], [1476, 282], [1478, 300], [1465, 302], [1458, 285], [1460, 255], [1468, 225], [1469, 200], [1466, 170], [1459, 140]],
  clamp: [[1447, 50], [1462, 52], [1474, 78], [1488, 95], [1480, 118], [1452, 120], [1448, 96], [1443, 70]],
};
// a point on an ellipse at parameter angle a, pushed by k (1 = on it)
const onE = (E, a, k = 1) => { const x = Math.cos(a) * E.rx * k, y = Math.sin(a) * E.ry * k, c = Math.cos(E.rot), s = Math.sin(E.rot); return [E.x + x * c - y * s, E.y + x * s + y * c]; };
// between two ellipses: the point at parameter a, fraction f from E0 (0) to E1 (1)
const between = (E0, E1, a, f) => { const p = onE(E0, a), q = onE(E1, a); return [p[0] + (q[0] - p[0]) * f, p[1] + (q[1] - p[1]) * f]; };
// a ring band between fractions f0..f1 of (E0 -> E1) over angles a0..a1, value v (or (a) => v)
function ringBand(g, E0, E1, f0, f1, a0, a1, v, { soft = 0, alpha = 1 } = {}) {
  const n = Math.max(12, Math.round(Math.abs(a1 - a0) * 30));
  // drawn crisp off-screen (one piece per angle step for an angle-varying value), then laid down with one blur pass
  const cv = g.canvas, tr = g.getTransform(), off = document.createElement("canvas"); off.width = cv.width; off.height = cv.height;
  const o = off.getContext("2d"); o.setTransform(tr);
  const m = typeof v === "function" ? 24 : 1;
  for (let k = 0; k < m; k++) {
    const b0 = a0 + ((a1 - a0) * k) / m, b1 = m > 1 ? a0 + ((a1 - a0) * (k + 1.08)) / m : a1, nn = m > 1 ? 6 : n;
    o.fillStyle = gv(m > 1 ? v((b0 + b1) / 2) : v, alpha); o.beginPath();
    for (let i = 0; i <= nn; i++) { const p = between(E0, E1, b0 + ((b1 - b0) * i) / nn, f0); i ? o.lineTo(p[0], p[1]) : o.moveTo(p[0], p[1]); }
    for (let i = nn; i >= 0; i--) { const p = between(E0, E1, b0 + ((b1 - b0) * i) / nn, f1); o.lineTo(p[0], p[1]); }
    o.closePath(); o.fill();
  }
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); if (soft) g.filter = `blur(${soft}px)`; g.drawImage(off, 0, 0); g.filter = "none"; g.restore();
}
const DEG = Math.PI / 180;
export function cup3q(g, o = {}) {
  const { cush, shell, rim, plate } = C3;
  const r = rng(o.seed ?? 551);
  // cushion: black leather
  g.fillStyle = gv(0.05); g.beginPath(); ell(cush)(g); g.fill();
  clipTo(g, ell(cush), () => {
    // the lit left face: a soft grey sheen, then pale crumpled pleats lying across the rim (radial), dark creases
    ringBand(g, cush, shell, 0.12, 0.85, 140 * DEG, 225 * DEG, (a) => 0.16 + 0.2 * Math.pow(Math.max(0, -Math.cos(a)), 3), { soft: 5 });
    // (fix 2) crumpled leather: thin wavy radial streaks (1.5-3.5 px, 8-25 px long), often broken in two, more black
    // between them than 1b's flat bars
    for (let a = 118 * DEG; a < 252 * DEG; a += (1.8 + r() * 1.8) * DEG) {
      const lit = Math.pow(Math.max(0, -Math.cos(a - 0.35)), 1.5);
      if (r() > 0.25 + 0.75 * lit) continue;
      let f = 0.06 + r() * 0.12;
      for (let piece = 0; piece < 2 && f < 0.9; piece++) {
        const len = 0.18 + r() * 0.3, f1 = Math.min(0.95, f + len), am = a + (r() - 0.5) * 0.04;
        const p0 = between(cush, shell, am, f), p1 = between(cush, shell, am + (r() - 0.5) * 0.04, f + (f1 - f) * 0.35), p2 = between(cush, shell, am + (r() - 0.5) * 0.04, f + (f1 - f) * 0.7), p3 = between(cush, shell, am + (r() - 0.5) * 0.03, f1);
        swellStroke(g, [p0, p1, p2, p3], 1.5 + r() * 2 * (0.4 + lit), gv(0.28 + 0.4 * lit * (0.5 + r() * 0.5), 0.92), { pow: 0.5 });
        f = f1 + 0.06 + r() * 0.12;
        if (r() < 0.4) break;
      }
    }
    // stitch dots low on the cushion (rows of short pale dashes)
    g.fillStyle = gv(0.55, 0.9);
    for (let row = 0; row < 3; row++) for (let a = 100 * DEG; a < 150 * DEG; a += 3.2 * DEG) {
      if (r() < 0.25) continue;
      const p = between(cush, shell, a, 0.25 + row * 0.18); g.beginPath(); g.ellipse(p[0], p[1], 1.8, 1.1, a, 0, TAU); g.fill();
    }
  });
  g.strokeStyle = LINE; g.lineWidth = 2; g.beginPath(); ell(cush)(g); g.stroke();
  // shell: chrome ring round the plate
  g.fillStyle = gv(0.3); g.beginPath(); ell(shell)(g); g.fill();
  clipTo(g, ell(shell), () => {
    const lit = (a, lo, hi, p = 2) => lo - 0.06 + (hi - lo) * Math.pow(Math.max(0, -Math.cos(a - 0.15)), p);
    // (lit on the left, 150-230 deg; the top under the arm in shadow; dim chrome below the plate)
    const up = (a) => (a > 235 * DEG ? Math.max(0.25, 1 - (a - 235 * DEG) / (50 * DEG)) : 1);
    // (fix 2) crisp chrome: hard-edged bright sub-bands split by thin black lines, read along row 280 of the C hold
    // (fractions shell -> rim: bright 0-0.1, black 0.12, bright 0.14-0.34, black 0.37, bright 0.4-0.64, black 0.66,
    // grey 0.68-0.78, black 0.8-0.83, bright 0.85-1), each bright band dimming away from the lit left side
    const L = (a, hi, p = 1.3) => Math.max(0.2, lit(a, 0.25, hi, p) * up(a));
    for (const [f0, f1, v] of [[0, 0.1, 0.9], [0.1, 0.14, -0.12], [0.14, 0.35, 0.94], [0.35, 0.4, -0.12], [0.4, 0.645, 0.92], [0.645, 0.685, -0.13], [0.685, 0.79, 0.62], [0.79, 0.845, -0.1], [0.845, 1.02, 0.95]])
      ringBand(g, shell, rim, f0, f1, 92 * DEG, 288 * DEG, v < 0 ? -v : (a) => L(a, v), { soft: 0.5 });
    ringBand(g, shell, rim, 0.0, 1.0, -70 * DEG, 90 * DEG, (a) => 0.14 + 0.3 * Math.pow(Math.max(0, Math.sin(a)), 2), { soft: 2 });
    // concentric streaks (bright and dark) on the lit side
    for (let i = 0; i < 26; i++) {
      const f = 0.05 + r() * 0.9, a0 = (110 + r() * 60) * DEG, a1 = a0 + (30 + r() * 70) * DEG, q = [];
      for (let k = 0; k <= 16; k++) q.push(between(shell, rim, a0 + ((a1 - a0) * k) / 16, f));
      taper(g, q, (u) => (0.8 + r() * 0.6) * Math.pow(Math.sin(Math.PI * u), 0.6), i % 3 === 0 ? gv(0.12, 0.7) : gv(0.97, 0.6));
    }
  });
  g.strokeStyle = LINE; g.lineWidth = 2.2; g.beginPath(); ell(shell)(g); g.stroke();
  // the arm (mesh) from the clamp down to the plate, the clamp block, the yoke over it
  const ap = (c) => smoothPath(c, C3.arm, true, 0.25);
  mesh(g, ap, [1440, 90, 1530, 310], { lo: 0.22, hi: 0.66, w: 0.9, seed: 11 });
  g.strokeStyle = LINE; g.lineWidth = 2.2; g.beginPath(); ap(g); g.stroke();
  const cp = (c) => smoothPath(c, C3.clamp, true, 0.15);
  // (fix 2) the clamp reads lighter on the source (sigma-8 blocks at (1420-1470, 60-110) were -30 .. -60)
  mesh(g, cp, [1438, 44, 1494, 124], { lo: 0.2, hi: 0.78, w: 0.95, seed: 13 });
  g.strokeStyle = LINE; g.lineWidth = 2.4; g.beginPath(); cp(g); g.stroke();
  ink(g, [[1450, 121], [1466, 121], [1484, 119]], 5, LINE, { end: 0.7 });
  // plate: dark rim, mesh face, dots along the rim's right edge
  g.fillStyle = gv(0.05); g.beginPath(); ell(rim)(g); g.fill();
  mesh(g, ell(plate), [1474, 212, 1548, 342], { lo: 0.22, hi: 0.64, w: 0.9, seed: 12 });
  g.fillStyle = gv(0.6, 0.9); for (let k = 0; k < 16; k++) { const p = onE(rim, -60 * DEG + k * 7.5 * DEG, 1.035); g.beginPath(); g.arc(p[0], p[1], 1.3, 0, TAU); g.fill(); }
  // the yoke: a chrome J strip, dark edges, a grey reflection down its right half
  // (fix 2) the yoke: a thinner, greyer silver bar than 1b's (source: ~6 px bright at ~230 over y 150-170, grey ~100-170
  // lower down), a thin dark outline
  const yq = sampleCurve(C3.yoke, 8), yw = (u) => (u < 0.06 ? 7 + (u / 0.06) * 3 : u > 0.9 ? 10 - ((u - 0.9) / 0.1) * 4 : 10);
  taper(g, yq, (u) => yw(u) + 2.6, LINE);
  const ygr = g.createLinearGradient(0, 130, 0, 300); ygr.addColorStop(0, gv(0.9)); ygr.addColorStop(0.3, gv(0.78)); ygr.addColorStop(1, gv(0.7));
  taper(g, yq, yw, ygr);
  taper(g, offsetLine(yq, 2), (u) => yw(u) * 0.35, gv(0.95, 0.9));
  taper(g, offsetLine(yq, -3), (u) => yw(u) * 0.25, gv(0.45, 0.85));
}

// ---------------------------------------------------------------- bandage, 3/4 (pose C), fix pass 1b
// measured on the C hold (outline points snapped to the ink, snap.py): the long strip from its left cap (936, 152) up to
// its right cap (1095, 78), 28 px wide at the left narrowing to 19 px (it turns away), shaded from 0.96 to 0.80 toward
// the right; the gauze pad over it as a rounded quadrilateral (11 outline points), a grey band down its left side.
export function taperStrip(a, b, w0, w1) {
  return (c) => {
    const d = sub(b, a), L = Math.hypot(d[0], d[1]), t = mul(d, 1 / L), n = perp(t), N = 20, top = [], bot = [];
    for (let i = 0; i <= N; i++) { const u = i / N, w = (w0 + (w1 - w0) * u) / 2, p = add(a, mul(t, L * u)); top.push(add(p, mul(n, -w))); bot.push(add(p, mul(n, w))); }
    c.moveTo(top[0][0], top[0][1]);
    for (let i = 1; i <= N; i++) c.lineTo(top[i][0], top[i][1]);
    const e1 = add(b, mul(t, w1 / 2)); c.quadraticCurveTo(e1[0] + n[0] * -w1 * 0.5, e1[1] + n[1] * -w1 * 0.5, e1[0], e1[1]); c.quadraticCurveTo(e1[0] + n[0] * w1 * 0.5, e1[1] + n[1] * w1 * 0.5, bot[N][0], bot[N][1]);
    for (let i = N - 1; i >= 0; i--) c.lineTo(bot[i][0], bot[i][1]);
    const e0 = sub(a, mul(t, w0 / 2)); c.quadraticCurveTo(e0[0] + n[0] * w0 * 0.5, e0[1] + n[1] * w0 * 0.5, e0[0], e0[1]); c.quadraticCurveTo(e0[0] - n[0] * w0 * 0.5, e0[1] - n[1] * w0 * 0.5, top[0][0], top[0][1]);
    c.closePath();
  };
}
export const BAND_C = {
  strip: { a: [944, 150], b: [1088, 80], w0: 28, w1: 19, v0: 0.96, v1: 0.8, dots: [[953, 147], [960, 139], [967, 146], [963, 154], [972, 136], [977, 131], [974, 149], [1040, 90], [1049, 84], [1058, 81], [1063, 90], [1071, 79], [1077, 87], [1083, 81]] },
  pad: { pts: [[974, 120], [995, 104], [1016, 90], [1030, 96], [1045, 107], [1057, 125], [1062, 144], [1056, 157], [1044, 162], [1015, 166], [994, 144]], v: 0.965, shade: [[972, 122], [992, 146], [1012, 164]],
    dots: [[1016, 130], [1026, 125], [1033, 138], [1041, 131], [1046, 142], [1024, 146], [1036, 120], [1018, 150]], crease: [[[980, 118], [1004, 113], [1026, 110]], [[1000, 128], [1018, 118], [1034, 110]]] },
};
export function bandageC(g, B = BAND_C, o = [0, 0]) {
  const S = B.strip, sp = taperStrip(S.a, S.b, S.w0, S.w1);
  const gr = g.createLinearGradient(S.a[0], S.a[1], S.b[0], S.b[1]); gr.addColorStop(0, gv(S.v0)); gr.addColorStop(0.45, gv(S.v0)); gr.addColorStop(1, gv(S.v1));
  g.fillStyle = gr; g.beginPath(); sp(g); g.fill();
  g.fillStyle = gv(0.12, 0.9); for (const [x, y] of S.dots) { g.beginPath(); g.ellipse(x, y, 1.8, 1.6, -0.45, 0, TAU); g.fill(); }
  g.strokeStyle = LINE; g.lineWidth = 2.2; g.beginPath(); sp(g); g.stroke();
  const P = B.pad, pp = (c) => smoothPath(c, P.pts, true, 0.35);
  g.fillStyle = gv(P.v); g.beginPath(); pp(g); g.fill();
  clipTo(g, pp, () => {
    g.filter = "blur(3px)"; ink(g, P.shade, 9, gv(0.8, 0.8), { end: 0.4 }); g.filter = "none";
    for (const c of P.crease) ink(g, c, 1.4, gv(0.45, 0.7), { end: 0.3 });
    g.fillStyle = gv(0.12, 0.9); for (const [x, y] of P.dots) { g.beginPath(); g.ellipse(x, y, 1.8, 1.6, 0.6, 0, TAU); g.fill(); }
  });
  g.strokeStyle = LINE; g.lineWidth = 2.2; g.beginPath(); pp(g); g.stroke();
}

// ---------------------------------------------------------------- bandage, front (pose D; E re-placed), fix pass 1b
// measured on 901-902 (outline points snapped to the ink): two strips crossing in an X — the under strip from its left
// cap (1020, 164) up to (1159, 100), the over strip from (1028, 124) down to (1166, 156); rounded outlines through the
// measured points, breathing dots near the ends, a crease across the middle.
export const BAND_D = {
  under: { pts: [[1020, 164], [1028, 146], [1042, 136], [1099, 112], [1133, 96], [1152, 94], [1160, 101], [1150, 113], [1108, 140], [1051, 178], [1032, 181], [1021, 174]], v: 0.93,
    dots: [[1034, 165], [1042, 156], [1048, 168], [1056, 158], [1037, 176], [1130, 104], [1140, 108], [1146, 101]] },
  over: { pts: [[1028, 124], [1040, 110], [1058, 105], [1108, 128], [1160, 145], [1167, 156], [1160, 167], [1149, 168], [1090, 150], [1030, 133]], v: 0.95,
    dots: [[1066, 130], [1088, 136], [1125, 140], [1134, 150], [1146, 150], [1120, 152], [1152, 158]], crease: [[[1070, 116], [1062, 128], [1058, 140]], [[1112, 128], [1102, 139], [1094, 148]]] },
};
export function bandageFront(g, B = BAND_D, o = [0, 0]) {
  g.save(); g.translate(o[0], o[1]);
  for (const k of ["under", "over"]) {
    const S = B[k], p = (c) => smoothPath(c, S.pts, true, 0.3);
    g.fillStyle = gv(S.v); g.beginPath(); p(g); g.fill();
    clipTo(g, p, () => {
      g.filter = "blur(4px)"; g.fillStyle = gv(0.74, 0.5); g.beginPath(); g.ellipse(1095, k === "under" ? 150 : 160, 70, 10, k === "under" ? -0.45 : 0.3, 0, TAU); g.fill(); g.filter = "none";
      for (const c of S.crease || []) ink(g, c, 1.4, gv(0.45, 0.7), { end: 0.3 });
      g.fillStyle = gv(0.12, 0.9); for (const [x, y] of S.dots) { g.beginPath(); g.ellipse(x, y, 1.8, 1.6, 0, 0, TAU); g.fill(); }
    });
    g.strokeStyle = LINE; g.lineWidth = 2.3; g.beginPath(); p(g); g.stroke();
  }
  g.restore();
}
