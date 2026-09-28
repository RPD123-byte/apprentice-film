// s25 v3 (end targeted fix) — the standing owl's face and headphones, redrawn in the source's manner. Same 104.60 head
// space as v2/head.js (the layer is placed by the head's measured affine, v2/headtrack.js). Measured on 5x grid crops of
// the source warped into head space (frames 2615 and 2735 — the source's face is the same drawing in both holds):
//   brows   left (982,417)→(1032,451), 4.5 px peak, tapering; right: a small hook (1057,431)→(1066,440), then
//           (1066,440)→(1134,397), ~5 px peak near (1095,425), tapering to a hair at the outer end
//   eyes    left upper lid (979,451)…(1034,461), lower lid (985,461)…(1028,465), iris (1013,455) 7×6.5;
//           right upper lid (1082,455)…(1149,443), lower lid (1089,460)…(1143,455), iris (1113,448) 9.5×8, catchlight
//           (1122,445) r 3.5
//   beak    hook (1041,465)…(1037,515); mouth (1037,515)→(1089,480) with the smirk's curl (1085,480)→(1094,483); a
//           narrow lower mandible (1044,507)…(1089,487), mid grey; the upper beak light with a grey shade on its right
//   cups    near: dark ribbed cushion (1188,437) 18×52, a stacked-ring shell (1229,437) 32×44 with a face disc
//           (1240,437) 20×33 (post-grade ~59 left, ~89 face), grey yoke; no bright highlight arcs
// The v2 face was drawn with 5–6 px near-black strokes, a big light-grey jaw crescent (read as an open, shouting beak)
// and a pale plastic cup with bright ring highlights: the source's lines are thinner and greyer, the grin narrow, the
// cups dark. Fine grey feather wisps round the eyes, brows, beak and the plumage edge (the source's engraved face).
import { taper } from "../../../lib/ink.js";
import { sampleCurve } from "../../../lib/paths.js";
import { rng } from "../../../lib/rng.js";
import { gray } from "../v2/draw.js";
import { bandage } from "../v2/head.js";

const INKC = gray(0.1);
export function pen(g, pts, w, col = INKC, { a = 0.25, b = 0.25, bias = 0.5, per = 6 } = {}) {
  const q = pts.length > 2 ? sampleCurve(pts, per) : pts;
  taper(g, q, (u) => {
    const s = u < bias ? a + (1 - a) * Math.sin((Math.PI / 2) * (u / bias)) : b + (1 - b) * Math.sin((Math.PI / 2) * ((1 - u) / (1 - bias)));
    return w * s;
  }, col);
}

// ------------------------------------------------------------------ face texture: seeded fine grey feather wisps
// zones [cx, cy, rx, ry, n, angle, len, value, alpha]: strokes scattered in an ellipse, flowing at `angle` (± 0.35)
const WISPS = [
  [990, 405, 18, 8, 10, 0.35, 12, 0.5, 0.35],     // above the left brow
  [1048, 425, 9, 22, 12, -1.75, 14, 0.5, 0.4],    // the crease between the brows (upward strokes)
  [1118, 405, 26, 8, 14, -0.45, 14, 0.52, 0.34],  // the ridge above the right brow
  [1000, 478, 20, 7, 12, 0.2, 13, 0.55, 0.32],    // under the left eye
  [1112, 472, 28, 7, 16, -0.1, 15, 0.55, 0.32],   // under the right eye
  [1022, 488, 7, 16, 9, 1.75, 12, 0.5, 0.36],     // left of the beak
  [1098, 498, 16, 12, 12, 0.9, 13, 0.55, 0.3],    // right of the grin
  [1060, 528, 30, 10, 18, 1.5, 13, 0.6, 0.26],    // the chin ruff
  [975, 480, 10, 30, 14, 1.85, 15, 0.55, 0.3],    // the left cheek edge
  [1160, 490, 10, 26, 12, 1.25, 15, 0.55, 0.28],  // the right cheek edge
  [1072, 365, 50, 12, 22, 1.45, 12, 0.6, 0.22],   // the crown
];
export function faceWisps(g, seed = 11) {
  const r = rng(seed);
  g.save(); g.lineCap = "round";
  for (const [cx, cy, rx, ry, n, an, L, v, al] of WISPS) {
    for (let i = 0; i < n; i++) {
      let u = r() * 2 - 1, w = r() * 2 - 1;
      if (u * u + w * w > 1) { u *= 0.7; w *= 0.7; }
      const x = cx + u * rx, y = cy + w * ry, a = an + (r() - 0.5) * 0.7, l = L * (0.6 + 0.6 * r()), bend = (r() - 0.5) * 0.5;
      g.strokeStyle = gray(v, al * (0.6 + 0.5 * r())); g.lineWidth = 0.7 + 0.5 * r();
      g.beginPath(); g.moveTo(x, y);
      g.quadraticCurveTo(x + Math.cos(a + bend) * l * 0.5, y + Math.sin(a + bend) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l);
      g.stroke();
    }
  }
  g.restore();
}

// ------------------------------------------------------------------ brows, eyes, beak
export function brows(g) {
  pen(g, [[982, 417], [992, 419], [1003, 425], [1014, 434], [1024, 444], [1032, 451]], 4.2, INKC, { a: 0.25, b: 0.25, bias: 0.45 });
  pen(g, [[1057, 431], [1058, 436], [1062, 439], [1067, 440]], 2.6, INKC, { a: 0.4, b: 0.5 });
  pen(g, [[1064, 440], [1075, 438], [1088, 431], [1100, 421], [1112, 411], [1124, 403], [1135, 397]], 4.8, INKC, { a: 0.35, b: 0.12, bias: 0.4 });
  // the faint ridge line above the right brow
  pen(g, [[1098, 409], [1116, 400], [1138, 394]], 1.6, gray(0.5, 0.6), { a: 0.2, b: 0.2 });
}
function almond(g, up, low, iris, lights, st, wUp) {
  if (st === "shut") {
    const m = up.map(([x, y], i) => { const l = low[Math.min(low.length - 1, Math.round((i * (low.length - 1)) / (up.length - 1)))]; return [x, (y + l[1]) / 2 + 1]; });
    pen(g, m, 3, INKC, { a: 0.25, b: 0.3 });
    pen(g, low, 1.2, gray(0.45, 0.7), { a: 0.2, b: 0.2 });
    return;
  }
  const lidDrop = st === "half" ? 0.5 : 0;
  const upp = up.map(([x, y], i) => [x, y + lidDrop * ((low[Math.min(low.length - 1, i)] || low[low.length - 1])[1] - y)]);
  g.save();
  g.beginPath();
  g.moveTo(upp[0][0], upp[0][1]);
  for (const p of sampleCurve(upp, 5)) g.lineTo(p[0], p[1]);
  for (const p of sampleCurve(low.slice().reverse(), 5)) g.lineTo(p[0], p[1]);
  g.closePath();
  g.fillStyle = gray(0.98); g.fill();
  g.clip();
  // the lid's shadow on the eyeball, then the iris
  const [cx, cy, rx, ry] = iris;
  g.fillStyle = gray(0.78, 0.5); g.beginPath(); g.ellipse(cx, upp[Math.floor(upp.length / 2)][1] + 1, 60, 3.5, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = gray(0.2); g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = gray(0.1); g.beginPath(); g.ellipse(cx, cy, rx * 0.5, ry * 0.55, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = gray(0.99);
  for (const [x, y, r] of lights) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
  g.restore();
  pen(g, upp, wUp, INKC, { a: 0.55, b: 0.6, bias: 0.55 });
  pen(g, low, 1.9, gray(0.28), { a: 0.45, b: 0.45 });
}
export function eyes(g, st = "sly") {
  almond(g, [[979, 451], [988, 448], [1000, 446], [1012, 447], [1022, 451], [1030, 457], [1034, 461]], [[985, 461], [995, 463], [1008, 465], [1020, 466], [1028, 465]],
    [1012, 455, 7, 6.5], [[1016.5, 452.5, 2.3]], st, 2.8);
  almond(g, [[1082, 455], [1090, 449], [1100, 445], [1112, 442], [1126, 441], [1140, 441], [1149, 443]], [[1089, 460], [1100, 460], [1115, 459], [1130, 458], [1143, 455]],
    [1116, 447, 9.5, 8], [[1123, 444.5, 3.8], [1108, 450, 1.6]], st, 3.2);
  if (st !== "shut") {
    pen(g, [[1143, 444], [1145, 450], [1143, 455]], 1.5, gray(0.3));
    pen(g, [[988, 468], [1008, 471], [1030, 469]], 1.4, gray(0.45, 0.7));
    pen(g, [[1084, 465], [1108, 467], [1140, 463]], 1.4, gray(0.45, 0.7));
  }
}
export function beak(g) {
  const outer = [[1088, 478], [1080, 477], [1070, 471], [1060, 465], [1050, 463], [1041, 465], [1033, 471], [1028, 482], [1028, 495], [1031, 506], [1037, 515]];
  const mouth = [[1037, 515], [1041, 508], [1048, 502], [1060, 497], [1072, 492], [1082, 486], [1089, 480]];
  const jaw = [[1044, 507], [1050, 511], [1060, 512], [1072, 508], [1082, 498], [1089, 487]];
  g.save();
  const o = sampleCurve(outer, 5), m = sampleCurve(mouth, 5), j = sampleCurve(jaw, 5);
  g.beginPath(); g.moveTo(o[0][0], o[0][1]); for (const p of o) g.lineTo(p[0], p[1]); for (const p of m) g.lineTo(p[0], p[1]); g.closePath();
  const gr = g.createLinearGradient(1032, 470, 1080, 492);
  gr.addColorStop(0, gray(0.96)); gr.addColorStop(0.55, gray(0.9)); gr.addColorStop(1, gray(0.78));
  g.fillStyle = gr; g.fill();
  // the lower mandible: a narrow mid-grey crescent under the grin
  g.beginPath(); g.moveTo(j[0][0], j[0][1]); for (const p of j) g.lineTo(p[0], p[1]); for (const p of m.slice().reverse()) g.lineTo(p[0], p[1]); g.closePath();
  g.fillStyle = gray(0.8); g.fill();
  g.restore();
  // a soft grey shade along the upper beak's right side and the nostril
  pen(g, [[1052, 470], [1063, 476], [1074, 482]], 3.2, gray(0.6, 0.35), { a: 0.3, b: 0.3 });
  // the hook is inked on its left (from the top of the beak round to the tip); its top-right edge, where the upper beak
  // meets the cheek, is only a faint grey line on the source
  pen(g, outer.slice(4), 2.4, INKC, { a: 0.3, b: 0.4, bias: 0.55 });
  pen(g, outer.slice(0, 5), 1.3, gray(0.55, 0.6), { a: 0.3, b: 0.5 });
  pen(g, mouth, 2.9, INKC, { a: 0.35, b: 0.7, bias: 0.6 });
  pen(g, jaw, 1.8, gray(0.18), { a: 0.35, b: 0.45 });
  // the smirk's curl at the corner
  pen(g, [[1084, 481], [1089, 477], [1094, 483]], 2.2, INKC, { a: 0.6, b: 0.2 });
  pen(g, [[1045, 479], [1047, 476], [1050, 478]], 1.4, gray(0.35));
}
// soft grey modelling of the face (source 109.40, head space): the socket under the right brow, round the left eye's
// inner corner, the cheek fold right of the grin, beside the beak, under the chin
const FACE_SHADE = [[1100, 437, 38, 7, -0.25, 0.22], [1040, 447, 12, 9, 0, 0.2], [1085, 500, 22, 12, -0.5, 0.2], [1022, 492, 7, 16, 0, 0.18],
  [1060, 528, 38, 7, 0, 0.14], [1000, 440, 22, 6, 0.4, 0.14]];
function faceShade(g) {
  g.save(); g.filter = "blur(5px)";
  for (const [x, y, rx, ry, rot, a] of FACE_SHADE) { g.fillStyle = gray(0.45, a); g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); g.fill(); }
  g.restore();
}
export function face3(g, st = "sly") {
  faceShade(g);
  // the far (left) side of the head in shade (source 109.40: ~190 at x 962–975 vs ~245 mid-face, post-grade)
  const sg = g.createLinearGradient(958, 0, 1000, 0);
  sg.addColorStop(0, gray(0.45, 0.45)); sg.addColorStop(1, gray(0.45, 0));
  g.save(); g.fillStyle = sg; g.beginPath(); g.ellipse(985, 460, 30, 75, 0, 0, Math.PI * 2); g.fill(); g.restore();
  faceWisps(g);
  bandage(g); brows(g); eyes(g, st); beak(g);
}

// ------------------------------------------------------------------ plumage edge fur and tufts
// fine grey strokes along the head's plumage outline (the source's silhouette is feathery, not a hard contour)
export function plumageFur(g, hull, seed = 23) {
  const r = rng(seed);
  g.save(); g.lineCap = "round";
  for (const p of hull) {
    const n = p.length / 2;
    let cx = 0, cy = 0; for (let i = 0; i < n; i++) { cx += p[2 * i]; cy += p[2 * i + 1]; } cx /= n; cy /= n;
    for (let i = 0; i < n; i += 1) {
      const x = p[2 * i], y = p[2 * i + 1];
      if (y > 540 || r() < 0.35) continue;
      const dx = cx - x, dy = cy - y, L0 = Math.hypot(dx, dy) || 1, a = Math.atan2(dy, dx) + (r() - 0.5) * 0.6, l = 7 + r() * 9;
      const x0 = x + (dx / L0) * 2, y0 = y + (dy / L0) * 2;
      g.strokeStyle = gray(0.5, 0.25 + 0.2 * r()); g.lineWidth = 0.8 + 0.4 * r();
      g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0 + Math.cos(a) * l, y0 + Math.sin(a) * l); g.stroke();
    }
  }
  g.restore();
}
export function tufts3(g) {
  g.save(); g.lineJoin = "round"; g.lineCap = "round";
  for (const t of [[[975, 382], [977, 360], [979, 341], [990, 349], [1006, 356]], [[1156, 355], [1175, 349], [1191, 342], [1196, 355], [1200, 371]]]) {
    g.fillStyle = gray(0.93); g.beginPath(); g.moveTo(t[0][0], t[0][1]);
    g.quadraticCurveTo(t[1][0], t[1][1], t[2][0], t[2][1]); g.quadraticCurveTo(t[3][0], t[3][1], t[4][0], t[4][1]);
    g.lineTo(t[4][0] + (t[0][0] - t[4][0]) * 0.5, t[4][1] + 12); g.closePath(); g.fill();
    g.strokeStyle = gray(0.3, 0.7); g.lineWidth = 1.3; g.beginPath(); g.moveTo(t[0][0], t[0][1]);
    g.quadraticCurveTo(t[1][0], t[1][1], t[2][0], t[2][1]); g.quadraticCurveTo(t[3][0], t[3][1], t[4][0], t[4][1]); g.stroke();
  }
  // the dark feather stripes on the right tuft (source 104.60: three short strokes down its inner side)
  for (const s of [[[1163, 357], [1175, 368]], [[1170, 354], [1184, 366]], [[1178, 352], [1190, 361]]]) pen(g, s, 1.8, gray(0.3, 0.8), { a: 0.3, b: 0.3 });
  g.restore();
}
export function headOutline3(g, hull) {
  tufts3(g);
  plumageFur(g, hull);
  g.save(); g.lineJoin = "round"; g.strokeStyle = gray(0.35, 0.55); g.lineWidth = 1.2;
  g.beginPath();
  for (const p of hull) { g.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) g.lineTo(p[i], p[i + 1]); g.closePath(); }
  g.stroke(); g.restore();
}

// ------------------------------------------------------------------ headphones
function smoothLine(g, pts) { const q = sampleCurve(pts, 6); g.moveTo(q[0][0], q[0][1]); for (const p of q) g.lineTo(p[0], p[1]); }
function offsetPts(pts, d) {
  return pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
    return [p[0] + (dy / L) * d, p[1] - (dx / L) * d];
  });
}
const BAND = [[943, 402], [946, 360], [962, 326], [995, 300], [1040, 284], [1085, 279], [1130, 282], [1168, 294], [1199, 314], [1219, 338], [1229, 362]];
export function headphonesBack3(g) {
  g.save(); g.lineCap = "round"; g.lineJoin = "round";
  // the band: near-black (post-grade ~13–30), a soft grey sheen along its outer top, no drawn edge lines
  g.strokeStyle = gray(0.07); g.lineWidth = 17; g.beginPath(); smoothLine(g, BAND); g.stroke();
  g.strokeStyle = gray(0.3, 0.55); g.lineWidth = 3.5; g.beginPath(); smoothLine(g, offsetPts(BAND.slice(3, 9), 4.5)); g.stroke();
  // far (left) cup: dark, mostly behind the head, a grey rim on its outer side
  g.fillStyle = gray(0.08); g.beginPath(); g.ellipse(951, 452, 23, 60, 0.03, 0, Math.PI * 2); g.fill();
  g.strokeStyle = gray(0.3, 0.8); g.lineWidth = 2.4; g.beginPath(); g.ellipse(951, 452, 21, 58, 0.03, Math.PI * 0.6, Math.PI * 1.4); g.stroke();
  g.fillStyle = gray(0.2); g.fillRect(939, 393, 13, 7);
  g.restore();
}
export function nearCup3(g) {
  g.save(); g.lineCap = "round"; g.lineJoin = "round";
  // yoke
  g.save(); g.translate(1216, 381); g.rotate(-0.3);
  g.fillStyle = gray(0.26); g.beginPath(); g.roundRect(-8, -17, 16, 32, 4); g.fill();
  g.strokeStyle = gray(0.07); g.lineWidth = 1.8; g.stroke();
  g.restore();
  // shell: stacked rings, dark
  const sh = g.createLinearGradient(1197, 0, 1262, 0);
  sh.addColorStop(0, gray(0.28)); sh.addColorStop(0.5, gray(0.33)); sh.addColorStop(1, gray(0.36));
  g.fillStyle = sh; g.beginPath(); g.ellipse(1231, 434, 31, 43, 0.03, 0, Math.PI * 2); g.fill();
  for (const [x, rx, ry, v, w] of [[1231, 29, 41.5, 0.12, 1.4], [1234, 25.5, 38.5, 0.4, 1.3], [1236, 23, 36, 0.12, 1.3]]) {
    g.strokeStyle = gray(v, 0.85); g.lineWidth = w; g.beginPath(); g.ellipse(x, 437, rx, ry, 0.03, Math.PI * 0.35, Math.PI * 1.65); g.stroke();
  }
  // face disc, lit from the upper right
  const fc = g.createRadialGradient(1248, 420, 3, 1240, 437, 36);
  fc.addColorStop(0, gray(0.44)); fc.addColorStop(0.65, gray(0.36)); fc.addColorStop(1, gray(0.26));
  g.fillStyle = fc; g.beginPath(); g.ellipse(1241, 434, 20, 34, 0.03, 0, Math.PI * 2); g.fill();
  g.strokeStyle = gray(0.1); g.lineWidth = 1.6; g.beginPath(); g.ellipse(1241, 434, 20, 34, 0.03, 0, Math.PI * 2); g.stroke();
  g.strokeStyle = gray(0.62, 0.7); g.lineWidth = 2; g.beginPath(); g.ellipse(1241, 434, 18, 32, 0.03, -Math.PI * 0.45, Math.PI * 0.35); g.stroke();
  g.strokeStyle = gray(0.07); g.lineWidth = 2.2; g.beginPath(); g.ellipse(1231, 434, 31, 43, 0.03, 0, Math.PI * 2); g.stroke();
  // cushion, against the head: dark with ribs on its upper part
  const cu = g.createLinearGradient(1170, 0, 1206, 0);
  cu.addColorStop(0, gray(0.07)); cu.addColorStop(0.6, gray(0.16)); cu.addColorStop(1, gray(0.2));
  g.fillStyle = cu; g.beginPath(); g.ellipse(1191, 435, 17, 50, 0.02, 0, Math.PI * 2); g.fill();
  g.save(); g.clip();
  g.strokeStyle = gray(0.03, 0.85); g.lineWidth = 1.6;
  for (const y of [396, 403, 410, 417, 424, 431]) { g.beginPath(); g.moveTo(1171, y + 2); g.quadraticCurveTo(1184, y - 2, 1198, y + 1); g.stroke(); }
  g.strokeStyle = gray(0.3, 0.6); g.lineWidth = 1.4; g.beginPath(); g.ellipse(1190, 437, 14, 47, 0.02, -Math.PI * 0.45, Math.PI * 0.35); g.stroke();
  g.restore();
  g.strokeStyle = gray(0.05); g.lineWidth = 1.8; g.beginPath(); g.ellipse(1191, 435, 17, 50, 0.02, 0, Math.PI * 2); g.stroke();
  g.restore();
}
