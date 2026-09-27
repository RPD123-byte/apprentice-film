// s25 v2 — the standing owl's face and headphones, drawn by code in 104.60 page px (the head layer is then placed on
// every frame with the head's measured affine). Control points read off 4–10x grid crops of the source at 104.60:
//   bandage   two rounded strips crossing on the right brow: A (998,404)→(1060,370), B (1011,366)→(1054,407), 18 px wide
//   brows     left (979,421)→(1017,444), 5 px; right (1058,432) hook → (1100,420) → (1142,401), 6 px
//   eyes      almond: left upper lid (980,452)…(1034,461), iris (1011,456) 9×6; right upper lid (1082,456)…(1150,444),
//             iris (1114,448) 12×8, catchlight (1120,445) r 4; lower lids 2 px grey
//   beak      hooked upper beak (1045,465)…(1037,515) with the grin (1083,480) and the lower mandible crescent
//   headphones band centre line, right cup cushion (1195,445) 27×66 + shell (1238,437) 24×72, left cup (950,450) 25×64
// Eye states: "sly" (open, 103.60 on), "shut" (103.08–103.52: soft lid arcs), "half" (103.56).
import { taper } from "../../../lib/ink.js";
import { sampleCurve } from "../../../lib/paths.js";
import { rng } from "../../../lib/rng.js";
import { gray } from "./draw.js";

const INKC = gray(0.08);
// a tapered pen through control points: w = peak width, a/b = end widths as fractions, bias = where it peaks
export function pen(g, pts, w, col = INKC, { a = 0.25, b = 0.25, bias = 0.5, per = 6 } = {}) {
  const q = pts.length > 2 ? sampleCurve(pts, per) : pts;
  taper(g, q, (u) => {
    const s = u < bias ? a + (1 - a) * Math.sin((Math.PI / 2) * (u / bias)) : b + (1 - b) * Math.sin((Math.PI / 2) * ((1 - u) / (1 - bias)));
    return w * s;
  }, col);
}
function capsule(g, x0, y0, x1, y1, r) {
  const a = Math.atan2(y1 - y0, x1 - x0);
  g.moveTo(x0 + Math.cos(a + Math.PI / 2) * r, y0 + Math.sin(a + Math.PI / 2) * r);
  g.arc(x0, y0, r, a + Math.PI / 2, a + (3 * Math.PI) / 2);
  g.arc(x1, y1, r, a - Math.PI / 2, a + Math.PI / 2);
  g.closePath();
}
function strip(g, x0, y0, x1, y1, r, seed) {
  g.save();
  g.beginPath(); capsule(g, x0, y0, x1, y1, r);
  g.fillStyle = gray(0.93); g.fill();
  g.save(); g.clip();
  // padded middle (a slightly greyer rounded square) and the perforation dots
  const mx = (x0 + x1) / 2, my = (y0 + y1) / 2, a = Math.atan2(y1 - y0, x1 - x0);
  g.translate(mx, my); g.rotate(a);
  g.fillStyle = gray(0.86); g.beginPath(); g.roundRect(-r * 0.9, -r * 0.8, r * 1.8, r * 1.6, r * 0.3); g.fill();
  const R = rng(seed), L = Math.hypot(x1 - x0, y1 - y0) / 2 + r;
  g.fillStyle = gray(0.55, 0.7);
  for (let i = 0; i < 22; i++) { const u = (R() * 2 - 1) * (L - 4), v = (R() * 2 - 1) * (r - 3); g.beginPath(); g.arc(u, v, 0.8, 0, Math.PI * 2); g.fill(); }
  // the faint centre line along the strip
  g.strokeStyle = gray(0.62, 0.6); g.lineWidth = 1.1; g.beginPath(); g.moveTo(-L * 0.55, -r * 0.1); g.lineTo(L * 0.55, r * 0.15); g.stroke();
  g.restore();
  g.beginPath(); capsule(g, x0, y0, x1, y1, r);
  g.lineWidth = 2.0; g.strokeStyle = gray(0.2); g.stroke();
  g.restore();
}
export function bandage(g) {
  strip(g, 1006, 399, 1052, 374, 9, 3);   // A: under
  strip(g, 1017, 372, 1047, 402, 9, 5);   // B: over
}
export function brows(g) {
  pen(g, [[979, 421], [990, 423], [1000, 428], [1009, 435], [1017, 444]], 5.2, INKC, { a: 0.3, b: 0.35, bias: 0.55 });
  pen(g, [[1058, 432], [1057, 437], [1063, 440], [1072, 439], [1086, 432], [1100, 420], [1115, 409], [1129, 403], [1143, 401]], 6.2, INKC, { a: 0.3, b: 0.15, bias: 0.45 });
  // the faint second brow line above the right one and the frown creases between the brows
  pen(g, [[1100, 407], [1118, 399], [1140, 395]], 2.2, gray(0.55, 0.7), { a: 0.2, b: 0.2 });
  pen(g, [[1046, 425], [1050, 437], [1049, 447]], 1.8, gray(0.5, 0.7), { a: 0.2, b: 0.3 });
  pen(g, [[1036, 424], [1041, 438]], 1.6, gray(0.55, 0.6));
}
function almond(g, up, low, iris, lights, st) {
  // up / low: lid control points (inner → outer); iris [cx, cy, rx, ry]; st: "sly" | "half" | "shut"
  if (st === "shut") {
    // a soft lid arc along the lower half of the opening, dark in the middle, with a lash tick
    const m = up.map(([x, y], i) => { const l = low[Math.min(low.length - 1, Math.round((i * (low.length - 1)) / (up.length - 1)))]; return [x, (y + l[1]) / 2 + 1]; });
    pen(g, m, 3.4, INKC, { a: 0.25, b: 0.3 });
    pen(g, low, 1.4, gray(0.45, 0.8), { a: 0.2, b: 0.2 });
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
  g.fillStyle = gray(0.97); g.fill();
  g.clip();
  const [cx, cy, rx, ry] = iris;
  g.fillStyle = gray(0.14); g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = gray(0.3, 0.8); g.beginPath(); g.ellipse(cx, cy + ry * 0.55, rx * 0.7, ry * 0.3, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = gray(0.99);
  for (const [x, y, r] of lights) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
  g.restore();
  pen(g, upp, 3.2, INKC, { a: 0.35, b: 0.5, bias: 0.55 });
  pen(g, low, 1.7, gray(0.28), { a: 0.3, b: 0.3 });
}
export function eyes(g, st = "sly") {
  almond(g, [[980, 452], [990, 448], [1002, 447], [1015, 449], [1026, 454], [1034, 461]], [[984, 459], [996, 461], [1010, 463], [1024, 464], [1033, 462]],
    [1011, 456, 9, 6.2], [[1003, 454.5, 2.2], [1018, 457, 2.4]], st);
  almond(g, [[1082, 456], [1090, 449], [1100, 444], [1114, 441], [1130, 441], [1143, 443], [1150, 444]], [[1087, 460], [1100, 459], [1115, 458], [1130, 457], [1141, 455]],
    [1114, 448, 12, 8.2], [[1120, 445, 4.2], [1098, 450, 2.1]], st);
  if (st !== "shut") {
    // the outer corner stroke of the right eye and the lower lid creases under both eyes
    pen(g, [[1142, 444], [1143, 450], [1141, 455]], 1.8, gray(0.25));
    pen(g, [[990, 466], [1010, 468], [1030, 467]], 1.4, gray(0.55, 0.7));
    pen(g, [[1088, 463], [1105, 463], [1122, 461]], 1.4, gray(0.55, 0.7));
  }
}
export function beak(g) {
  // upper beak (hook): outer edge from the top round the left side to the hook tip, then the mouth line back up
  const outer = [[1083, 479], [1072, 480], [1063, 474], [1055, 467], [1045, 465], [1034, 469], [1027, 479], [1026, 493], [1029, 505], [1037, 515]];
  const mouth = [[1037, 515], [1040, 505], [1047, 499], [1060, 494], [1072, 489], [1083, 480]];
  const jaw = [[1041, 503], [1046, 510], [1056, 512], [1069, 507], [1079, 498], [1085, 487], [1084, 481]];
  g.save();
  g.beginPath();
  const o = sampleCurve(outer, 5), m = sampleCurve(mouth, 5);
  g.moveTo(o[0][0], o[0][1]); for (const p of o) g.lineTo(p[0], p[1]); for (const p of m) g.lineTo(p[0], p[1]); g.closePath();
  const gr = g.createLinearGradient(1030, 470, 1075, 500);
  gr.addColorStop(0, gray(0.95)); gr.addColorStop(1, gray(0.8));
  g.fillStyle = gr; g.fill();
  // lower mandible crescent (grey inside the grin)
  g.beginPath();
  const j = sampleCurve(jaw, 5); g.moveTo(j[0][0], j[0][1]); for (const p of j) g.lineTo(p[0], p[1]);
  for (const p of m.slice().reverse()) g.lineTo(p[0], p[1]);
  g.closePath(); g.fillStyle = gray(0.78); g.fill();
  g.restore();
  pen(g, outer, 2.8, INKC, { a: 0.5, b: 0.45, bias: 0.6 });
  pen(g, mouth, 2.6, INKC, { a: 0.4, b: 0.6 });
  pen(g, jaw, 2.4, INKC, { a: 0.35, b: 0.4 });
  // the grin's end tick and the nostril
  pen(g, [[1082, 480], [1088, 477], [1091, 483]], 2.4, INKC, { a: 0.6, b: 0.2 });
  pen(g, [[1045, 479], [1047, 476], [1050, 478]], 1.6, gray(0.3));
}
export function face(g, st = "sly") {
  bandage(g); brows(g); eyes(g, st); beak(g);
}

// ---------------------------------------------------------------- headphones
function smoothLine(g, pts) {
  const q = sampleCurve(pts, 6);
  g.moveTo(q[0][0], q[0][1]); for (const p of q) g.lineTo(p[0], p[1]);
}
function offsetPts(pts, d) {
  return pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
    return [p[0] + (dy / L) * d, p[1] - (dx / L) * d];
  });
}
const BAND = [[943, 402], [946, 360], [962, 326], [995, 300], [1040, 284], [1085, 279], [1130, 282], [1168, 294], [1199, 314], [1219, 338], [1229, 362]];
export function headphonesBack(g) {
  g.save(); g.lineCap = "round"; g.lineJoin = "round";
  g.strokeStyle = gray(0.05); g.lineWidth = 17; g.beginPath(); smoothLine(g, BAND); g.stroke();
  g.strokeStyle = gray(0.33); g.lineWidth = 2.4; g.beginPath(); smoothLine(g, offsetPts(BAND, 6.6)); g.stroke();
  g.strokeStyle = gray(0.2); g.lineWidth = 1.4; g.beginPath(); smoothLine(g, offsetPts(BAND, -6.4)); g.stroke();
  g.strokeStyle = gray(0.45, 0.8); g.lineWidth = 3; g.beginPath(); smoothLine(g, offsetPts(BAND.slice(5, 9), 3)); g.stroke();
  // far (left) cup: dark, a grey rim on its outer side, mostly behind the head
  g.fillStyle = gray(0.09); g.beginPath(); g.ellipse(950, 452, 26, 65, 0.03, 0, Math.PI * 2); g.fill();
  g.strokeStyle = gray(0.34); g.lineWidth = 3; g.beginPath(); g.ellipse(950, 452, 24.5, 63.5, 0.03, Math.PI * 0.55, Math.PI * 1.45); g.stroke();
  g.strokeStyle = gray(0.2); g.lineWidth = 1.2; g.beginPath(); g.ellipse(953, 452, 18, 56, 0.03, Math.PI * 0.6, Math.PI * 1.4); g.stroke();
  g.fillStyle = gray(0.3); g.fillRect(937, 392, 15, 7);
  g.restore();
}
// fix pass 2: the near cup redrawn from a 3.5x grid crop of 104.60 (the old one was a flat, ribbed dark disc, 10–20
// levels too dark): a grey yoke (1206–1221, 369–400); the cushion against the head, dark grey (post-grade ~57), faint
// ribs only in its upper part, centre (1189, 433) 18 × 48; the shell, mid grey (~83 on its left, ~97 on its face),
// centre (1231, 434) 31 × 42, with a lit face (1240, 433) 21 × 35, a dark inner rim on the face's left side, a pale
// highlight on the upper-left rims and dark outlines. Also drawn (scaled, rotated, mirrored) on the chaos owls.
export const CUP_C = [1214, 433];
export function nearCup(g) {
  g.save(); g.lineCap = "round"; g.lineJoin = "round";
  // yoke
  g.save(); g.translate(1215, 384); g.rotate(-0.12);
  g.fillStyle = gray(0.29); g.beginPath(); g.roundRect(-7.5, -18, 15, 34, 5); g.fill();
  g.strokeStyle = gray(0.08); g.lineWidth = 2; g.stroke();
  g.strokeStyle = gray(0.55, 0.8); g.lineWidth = 1.4; g.beginPath(); g.moveTo(-3.5, -14); g.lineTo(-3.5, 12); g.stroke();
  g.restore();
  // cushion
  const cu = g.createLinearGradient(1171, 0, 1207, 0);
  cu.addColorStop(0, gray(0.08)); cu.addColorStop(0.55, gray(0.2)); cu.addColorStop(1, gray(0.26));
  g.fillStyle = cu; g.beginPath(); g.ellipse(1189, 433, 18, 48, 0.02, 0, Math.PI * 2); g.fill();
  g.save(); g.clip();
  g.strokeStyle = gray(0.05, 0.8); g.lineWidth = 1.5;
  for (const y of [398, 406, 414, 422, 430]) { g.beginPath(); g.moveTo(1172, y + 2); g.quadraticCurveTo(1186, y - 2, 1203, y + 1); g.stroke(); }
  g.strokeStyle = gray(0.42, 0.7); g.lineWidth = 1.6; g.beginPath(); g.ellipse(1191, 433, 14, 44, 0.02, -Math.PI * 0.45, Math.PI * 0.4); g.stroke();
  g.restore();
  g.strokeStyle = gray(0.08); g.lineWidth = 2; g.beginPath(); g.ellipse(1189, 433, 18, 48, 0.02, 0, Math.PI * 2); g.stroke();
  // shell
  const sh = g.createLinearGradient(1200, 0, 1262, 0);
  sh.addColorStop(0, gray(0.28)); sh.addColorStop(0.45, gray(0.36)); sh.addColorStop(1, gray(0.43));
  g.fillStyle = sh; g.beginPath(); g.ellipse(1231, 434, 31, 42, 0.03, 0, Math.PI * 2); g.fill();
  const fc = g.createRadialGradient(1234, 418, 2, 1240, 433, 38);
  fc.addColorStop(0, gray(0.47)); fc.addColorStop(0.6, gray(0.36)); fc.addColorStop(1, gray(0.28));
  g.fillStyle = fc; g.beginPath(); g.ellipse(1241, 433, 21, 35, 0.03, 0, Math.PI * 2); g.fill();
  g.strokeStyle = gray(0.13); g.lineWidth = 2; g.beginPath(); g.ellipse(1241, 433, 21, 35, 0.03, Math.PI * 0.5, Math.PI * 1.55); g.stroke();
  g.strokeStyle = gray(0.66, 0.9); g.lineWidth = 2.2; g.beginPath(); g.ellipse(1241, 433, 18.5, 32, 0.03, Math.PI * 1.08, Math.PI * 1.5); g.stroke();
  g.strokeStyle = gray(0.62, 0.85); g.lineWidth = 2; g.beginPath(); g.ellipse(1231, 434, 28, 39, 0.03, Math.PI * 1.05, Math.PI * 1.42); g.stroke();
  g.strokeStyle = gray(0.07); g.lineWidth = 2.4; g.beginPath(); g.ellipse(1231, 434, 31, 42, 0.03, 0, Math.PI * 2); g.stroke();
  g.restore();
}
export function headphonesFront(g) { nearCup(g); }
// the head's own outline: a thin soft grey-dark contour round the plumage (the source's silhouette line)
// fix pass 2: the two pointed ear tufts of the head (104.60, 4x grid crop): left tip (979, 341) on base (976, 378)–(1005, 355),
// right tip (1191, 343) on base (1158, 353)–(1199, 369); plumage-white with the head's soft grey edge line
export function headTufts(g) {
  g.save(); g.lineJoin = "round"; g.lineCap = "round";
  for (const t of [[[975, 382], [977, 360], [979, 341], [990, 349], [1006, 356]], [[1156, 355], [1175, 349], [1191, 342], [1196, 355], [1200, 371]]]) {
    g.fillStyle = gray(0.92); g.beginPath(); g.moveTo(t[0][0], t[0][1]);
    g.quadraticCurveTo(t[1][0], t[1][1], t[2][0], t[2][1]); g.quadraticCurveTo(t[3][0], t[3][1], t[4][0], t[4][1]);
    g.lineTo(t[4][0] + (t[0][0] - t[4][0]) * 0.5, t[4][1] + 12); g.closePath(); g.fill();
    g.strokeStyle = gray(0.2, 0.85); g.lineWidth = 1.8; g.beginPath(); g.moveTo(t[0][0], t[0][1]);
    g.quadraticCurveTo(t[1][0], t[1][1], t[2][0], t[2][1]); g.quadraticCurveTo(t[3][0], t[3][1], t[4][0], t[4][1]); g.stroke();
  }
  g.restore();
}
export function headOutline(g, hull) {
  headTufts(g);
  g.save(); g.lineJoin = "round"; g.strokeStyle = gray(0.2, 0.85); g.lineWidth = 1.8;
  g.beginPath();
  for (const p of hull) { g.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) g.lineTo(p[i], p[i + 1]); g.closePath(); }
  g.stroke(); g.restore();
}
