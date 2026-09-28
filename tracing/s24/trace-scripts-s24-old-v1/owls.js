// The owls of s24. Head, body, tail, feet and headphones come from the owl kit (src/lib/owlInk.js) with wings
// switched off; the wings are painted feather by feather from measured tips (./wing.js), and props (scissors,
// fists, the blades behind the head) are drawn in frame px. Each bird is composited once into a cached canvas in
// frame coordinates at its measured placement, then only translated/rotated per frame.
import { owlLayer, owlPose, mergePose, gv, LINE, V, ink, setPPU, headGeom, drawFoot } from "../../lib/owlInk.js";
import { smoothPath } from "../../lib/paths.js";
import { drawShears, glint } from "./shears.js";
import { paintWing } from "./wing.js";

// ---------------------------------------------------------------- helpers
// A white blade with a dark keyline and hatching (the scissors carried behind the head: only blades show).
export function blade(g, base, tip, w) {
  const d = V.nrm(V.sub(tip, base)), n = V.perp(d), L = V.len(V.sub(tip, base));
  const q = [V.add(base, V.mul(n, -w / 2)), V.add(V.add(base, V.mul(d, L * 0.6)), V.mul(n, -w * 0.45)), tip, V.add(V.add(base, V.mul(d, L * 0.5)), V.mul(n, w * 0.5)), V.add(base, V.mul(n, w / 2))];
  g.save(); g.lineJoin = "round";
  g.beginPath(); g.moveTo(q[0][0], q[0][1]); for (const p of q.slice(1)) g.lineTo(p[0], p[1]); g.closePath();
  g.fillStyle = gv(0.9); g.fill(); g.lineWidth = 2; g.strokeStyle = LINE; g.stroke();
  for (let i = 0; i < 5; i++) { const a = V.add(V.add(base, V.mul(d, L * (0.1 + i * 0.1))), V.mul(n, -w * 0.3)); ink(g, [a, V.add(a, V.mul(d, L * 0.35))], 1, gv(0.4, 0.6)); }
  g.restore();
}
// A wing tip closed into a fist (frame px): a rounded mitten of feathers with knuckle creases.
export function fist(g, c, dir, R) {
  const d = V.nrm(dir), n = V.perp(d);
  const P = (u, v) => V.add(c, V.add(V.mul(d, u * R), V.mul(n, v * R)));
  const out = [P(-1.2, -0.8), P(-0.2, -1.0), P(0.6, -0.9), P(1.0, -0.35), P(1.05, 0.3), P(0.7, 0.85), P(-0.1, 1.0), P(-1.2, 0.75)];
  g.save();
  g.beginPath(); smoothPath(g, out, true); g.fillStyle = gv(0.93); g.fill();
  g.lineWidth = 2.4; g.strokeStyle = LINE; g.stroke();
  for (const k of [-0.5, 0.0, 0.5]) ink(g, [P(1.0, k - 0.15), P(0.6, k + 0.02), P(0.1, k + 0.1)], 2.0, LINE, { end: 0.2 });
  for (let i = 0; i < 7; i++) ink(g, [P(-1.0, -0.6 + i * 0.2), P(-0.35, -0.55 + i * 0.2)], 1.0, gv(0.4, 0.5));
  g.restore();
}


// Dark headphones drawn in frame px (the s24 close-ups show them nearly black, with grey rims and a brushed plate).
//   band: polyline over the head; cup: { x, y, rx, ry, rot, side (+1: the plate faces viewer's right) }
export function phoneBand(g, pts, w = 17) {
  g.save(); g.lineCap = "round"; g.lineJoin = "round";
  const path = () => { g.beginPath(); smoothPath(g, pts, false); };
  path(); g.lineWidth = w + 4; g.strokeStyle = "#060606"; g.stroke();
  path(); g.lineWidth = w; g.strokeStyle = "#1c1c1c"; g.stroke();
  g.save(); g.translate(0, -w * 0.18); path(); g.lineWidth = w * 0.22; g.strokeStyle = "rgba(150,150,150,0.75)"; g.stroke(); g.restore();
  g.save(); g.translate(0, w * 0.2); path(); g.lineWidth = w * 0.12; g.strokeStyle = "rgba(90,90,90,0.6)"; g.stroke(); g.restore();
  g.restore();
}
export function phoneCup(g, c) {
  const { x, y, rx, ry, rot = 0, side = 1, yoke = true } = c;
  g.save(); g.translate(x, y); g.rotate(rot);
  const s = side;
  // cushion (toward the head)
  g.fillStyle = "#0b0b0b"; g.beginPath(); g.ellipse(-s * rx * 0.62, ry * 0.03, rx * 0.5, ry * 0.98, 0, 0, Math.PI * 2); g.fill();
  g.strokeStyle = "rgba(120,120,120,0.55)"; g.lineWidth = 1.2;
  for (let i = -8; i <= 8; i++) { const yy = i / 8 * ry * 0.85, hw = Math.sqrt(1 - (i / 8) ** 2) * rx * 0.38; g.beginPath(); g.moveTo(-s * rx * 0.62 - s * hw, yy); g.lineTo(-s * rx * 0.62 - s * hw * 0.35, yy + 2); g.stroke(); }
  // shell
  const gr = g.createLinearGradient(-rx, -ry, rx, ry);
  gr.addColorStop(0, "rgb(92,92,92)"); gr.addColorStop(0.45, "rgb(46,46,46)"); gr.addColorStop(1, "rgb(18,18,18)");
  g.fillStyle = gr; g.beginPath(); g.ellipse(0, 0, rx * 0.85, ry, 0, 0, Math.PI * 2); g.fill();
  g.strokeStyle = "#050505"; g.lineWidth = 2.5; g.stroke();
  // plate
  const px = s * rx * 0.32, pry = ry * 0.72, prx = rx * 0.5;
  const gp = g.createLinearGradient(px - prx, -pry, px + prx, pry);
  gp.addColorStop(0, "rgb(150,150,148)"); gp.addColorStop(0.5, "rgb(104,104,102)"); gp.addColorStop(1, "rgb(52,52,52)");
  g.fillStyle = gp; g.beginPath(); g.ellipse(px, -ry * 0.12, prx, pry, 0, 0, Math.PI * 2); g.fill();
  g.save(); g.clip();
  g.strokeStyle = "rgba(200,200,196,0.35)"; g.lineWidth = 1.3;
  for (let i = 0; i < 9; i++) { const xx = px - prx + (i + 0.5) / 9 * prx * 2; g.beginPath(); g.moveTo(xx, -ry * 0.12 - pry); g.quadraticCurveTo(xx + s * 6, -ry * 0.12, xx, -ry * 0.12 + pry); g.stroke(); }
  g.restore();
  g.strokeStyle = "#080808"; g.lineWidth = 2.4; g.beginPath(); g.ellipse(px, -ry * 0.12, prx, pry, 0, 0, Math.PI * 2); g.stroke();
  g.strokeStyle = "rgba(220,220,216,0.7)"; g.lineWidth = 2; g.beginPath(); g.ellipse(0, 0, rx * 0.8, ry * 0.95, 0, Math.PI * 1.05, Math.PI * 1.45); g.stroke();
  // yoke arm at the top
  if (yoke) { g.fillStyle = "rgb(120,120,118)"; g.strokeStyle = "#080808"; g.lineWidth = 2; g.beginPath(); g.roundRect(-rx * 0.35, -ry * 1.18, rx * 0.5, ry * 0.3, 4); g.fill(); g.stroke(); }
  g.restore();
}


// ---------------------------------------------------------------- traced faces (frame px)
// The kit's eyes and beak are swapped for the source's own drawing: almond eyes with a heavy upper lid, a black
// pupil with a white catch-light, sharp brows, an open hooked beak. Every point below was read off 3–4x zooms of
// the source frame named on each face (10 px grids).
function taperLine(g, pts, w, col = LINE, end = 0.15) { ink(g, pts, w, col, { end, bias: 0.5, pow: 0.5 }); }
export function drawFace(g, F) {
  g.save(); g.lineJoin = "round"; g.lineCap = "round";
  setPPU(1);
  for (const e of F.eyes) {
    const open = [...e.top, ...[...e.bot].reverse()];
    g.beginPath(); smoothPath(g, open, true); g.fillStyle = gv(0.97); g.fill();
    g.save(); g.beginPath(); smoothPath(g, open, true); g.clip();
    g.fillStyle = "#070707"; g.beginPath(); g.arc(e.pupil[0], e.pupil[1], e.pupil[2], 0, Math.PI * 2); g.fill();
    if (e.hl) { g.fillStyle = gv(0.97); g.beginPath(); g.arc(e.hl[0], e.hl[1], e.hl[2], 0, Math.PI * 2); g.fill(); }
    g.restore();
    taperLine(g, e.bot, e.lidW * 0.45, LINE, 0.2);
    taperLine(g, e.top, e.lidW, "#070707", 0.25);
  }
  for (const [pts, w] of F.brows) taperLine(g, pts, w, LINE, 0.05);
  const B = F.beak;
  if (B) {
    g.beginPath(); smoothPath(g, B.upper, true); g.fillStyle = gv(0.9); g.fill();
    g.save(); g.clip();
    g.filter = "blur(4px)"; g.fillStyle = gv(0.55, 0.6); g.beginPath(); smoothPath(g, B.shade || B.upper.slice(3, 7), true); g.fill(); g.filter = "none";
    g.restore();
    g.beginPath(); smoothPath(g, B.mouth, true); g.fillStyle = "#111"; g.fill();
    g.beginPath(); smoothPath(g, B.lower, true); g.fillStyle = gv(0.82); g.fill();
    g.lineWidth = 2.2; g.strokeStyle = LINE; g.stroke();
    g.beginPath(); smoothPath(g, B.upper, true); g.lineWidth = 2.8; g.strokeStyle = LINE; g.stroke();
    if (B.nostril) taperLine(g, B.nostril, 2.2, LINE, 0.3);
  }
  g.restore();
}
// F at 98.40 (f40)
export const FACE_F = {
  eyes: [
    { top: [[1400, 617], [1406, 604], [1425, 590], [1450, 576], [1470, 565], [1488, 551]], bot: [[1402, 618], [1430, 623], [1450, 618], [1466, 605], [1478, 588], [1486, 560]], pupil: [1437, 595, 13], hl: [1443, 587, 4.5], lidW: 5.5 },
    { top: [[1269, 642], [1290, 637], [1310, 636], [1330, 640], [1341, 647]], bot: [[1272, 645], [1295, 667], [1315, 672], [1335, 661], [1341, 650]], pupil: [1311, 645, 10], hl: [1315, 642, 3.5], lidW: 5 },
  ],
  brows: [[[[1262, 600], [1290, 610], [1310, 618], [1333, 630]], 5], [[[1398, 618], [1408, 590], [1425, 560], [1440, 530]], 4.5], [[[1362, 602], [1375, 609], [1388, 606], [1400, 596]], 2.6]],
  beak: {
    upper: [[1355, 652], [1378, 649], [1400, 650], [1413, 654], [1416, 668], [1410, 686], [1398, 700], [1385, 708], [1373, 716], [1360, 700], [1350, 675]],
    lower: [[1385, 709], [1398, 700], [1409, 697], [1405, 713], [1394, 722], [1386, 718]],
    mouth: [[1377, 712], [1390, 690], [1404, 672], [1412, 684], [1403, 700], [1390, 710]],
    shade: [[1392, 660], [1412, 660], [1410, 690], [1392, 700]], nostril: [[1372, 663], [1376, 670]],
  },
};
// H at 99.08 (f57)
export const FACE_H = {
  eyes: [
    { top: [[1192, 455], [1205, 435], [1225, 422], [1250, 410], [1270, 400], [1281, 390]], bot: [[1202, 455], [1225, 460], [1250, 457], [1265, 447], [1275, 430], [1279, 405]], pupil: [1227, 432, 14], hl: [1236, 424, 5.5], lidW: 5.5 },
    { top: [[1062, 480], [1080, 475], [1100, 474], [1120, 477], [1132, 482]], bot: [[1070, 482], [1085, 502], [1105, 510], [1125, 502], [1132, 490]], pupil: [1102, 487, 11], hl: [1107, 482, 4], lidW: 5 },
  ],
  brows: [[[[1057, 437], [1087, 450], [1110, 460], [1127, 469]], 5], [[[1194, 452], [1205, 425], [1220, 395], [1240, 362]], 4.5], [[[1157, 441], [1170, 447], [1182, 442], [1190, 435]], 2.6]],
  beak: {
    upper: [[1150, 490], [1170, 486], [1192, 487], [1207, 489], [1211, 500], [1205, 515], [1193, 528], [1180, 540], [1167, 552], [1152, 532], [1144, 508]],
    lower: [[1180, 541], [1193, 529], [1206, 523], [1207, 536], [1197, 550], [1188, 557], [1181, 553]],
    mouth: [[1172, 546], [1185, 523], [1200, 505], [1208, 515], [1198, 530], [1185, 545]],
    shade: [[1188, 495], [1208, 495], [1206, 520], [1190, 528]], nostril: [[1166, 500], [1170, 507]],
  },
};
// J at 99.80 (f75)
export const FACE_J = {
  eyes: [
    { top: [[1033, 518], [1063, 520], [1090, 533], [1113, 548], [1130, 555], [1153, 555]], bot: [[1043, 524], [1048, 555], [1067, 573], [1097, 580], [1120, 573], [1133, 561]], pupil: [1106, 559, 14], hl: [1099, 556, 3], lidW: 7.5 },
    { top: [[1247, 497], [1227, 517], [1210, 537], [1193, 553], [1178, 557]], bot: [[1237, 528], [1233, 553], [1220, 570], [1197, 570], [1183, 560]], pupil: [1204, 558, 10], hl: [1200, 556, 3], lidW: 6.5 },
  ],
  brows: [[[[1047, 488], [1077, 510], [1100, 533], [1120, 553]], 6.5], [[[1256, 478], [1240, 500], [1222, 522]], 5]],
  beak: {
    upper: [[1120, 603], [1133, 597], [1157, 582], [1173, 580], [1187, 590], [1192, 613], [1183, 637], [1172, 652], [1160, 640], [1145, 625], [1127, 612]],
    lower: [[1128, 618], [1142, 640], [1157, 652], [1166, 648], [1152, 630], [1137, 616]],
    mouth: [[1127, 609], [1150, 619], [1162, 634], [1166, 648], [1150, 640], [1134, 622]],
    shade: [[1170, 590], [1190, 600], [1188, 630], [1172, 640]], nostril: [[1158, 594], [1165, 596]],
  },
};
const NOFACE = { eyes: { r: 0.01, left: { brow: 0 }, right: { brow: 0 } }, beak: { w: 0.01, l: 0.01, open: 0 } };

// Composite a bird into a frame-coordinate canvas over the box [x0, y0, x1, y1]:
// under (behind everything), back wings, the kit layer (pose at place), front wings, over.
const CACHE = new Map();
export function birdCanvas(key, { box, pose, place, back = [], mid = [], front = [], under, over }) {
  if (CACHE.has(key)) return CACHE.get(key);
  const [x0, y0, x1, y1] = box;
  const c = document.createElement("canvas");
  c.width = x1 - x0; c.height = y1 - y0;
  const g = c.getContext("2d");
  g.translate(-x0, -y0);
  setPPU(1);
  if (under) under(g);
  for (const w of back) paintWing(g, w);
  if (pose) {
    const L = owlLayer({ ...pose, ...place, wings: [], clip: [x0, y0, x1, y1] });
    if (mid.length) {
      // wings between the body and the head: paint the body layer, the wings, then the head again on top (a
      // second layer of the same pose clipped to the head outline)
      g.drawImage(L.canvas, L.x, L.y, L.w, L.h);
      setPPU(1);
      for (const w of mid) paintWing(g, w);
      const H = headGeom(pose.head), s = place.s, c = Math.cos(place.rot || 0), sn = Math.sin(place.rot || 0);
      const toF = ([ux, uy]) => [place.x + s * (c * ux - sn * uy), place.y + s * (sn * ux + c * uy)];
      g.save(); g.beginPath(); smoothPath(g, H.out.map(toF), true); g.clip();
      g.drawImage(L.canvas, L.x, L.y, L.w, L.h);
      g.restore();
    } else g.drawImage(L.canvas, L.x, L.y, L.w, L.h);
  }
  setPPU(1);
  for (const w of front) paintWing(g, w);
  if (over) over(g);
  const out = { canvas: c, x: x0, y: y0, w: c.width, h: c.height };
  CACHE.set(key, out);
  return out;
}
export function releaseOwls() { CACHE.clear(); }

// ---------------------------------------------------------------- F: speed lines, 97.76–98.96
// Measured at 98.40 (f40) on 2x gridded crops. Head centre (1385, 578), r ≈ 170 px; eyes (1308, 649) / (1445, 595)
// (eye line −24°); beak (1350–1415, 647–722); bandage (1298, 524); near cup centre (1612, 488), half-height 88 px;
// far cup behind the head's left edge (1220, 596); band top (1420, 310). Raised right wing: leading edge
// (1610,600)…(1822,155), primary tips below; left wing: leading edge (1300,745)…(942,714). Body (chest line
// (1300,745)–(1475,946)), tail to (2020, 800), feet (1905–2023, 850–916). Two blades behind the head.
export const F_PLACE = { x: 1385, y: 578, s: 1.7 };
const F_POSE = mergePose(mergePose(owlPose("angry"), {
  light: [-0.5, -0.85],
  head: { x: 0, y: 6, rx: 98, ry: 92, yaw: -0.21, pitch: -0.12, roll: -0.38, square: 2.3, jowl: 0.1 },
  tufts: [{ at: -1.22, size: 30, width: 0.3, lean: -0.35, second: 0.35, curl: 0.1 }, { at: 0.55, size: 18, width: 0.22, lean: 0.1, second: 0.3, curl: 0.1 }],
  body: { x: 127, y: 160, a: 172, b: 102, rot: 0.25, egg: 0.04, sag: 0.05 },
  tail: { base: [262, 138], tip: [373, 131], w: 42, n: 3 },
  feet: [{ x: 306, y: 172, rot: -1.5, size: 22, mode: "dangle", toes: 3, seed: 2 }, { x: 323, y: 190, rot: -1.4, size: 22, mode: "dangle", toes: 3, seed: 5 }],
  eyes: { state: "angry", r: 26, spread: 0.42, el: 0.06, look: [-0.35, -0.4], left: { state: "half", lid: 0.6, slant: -0.05, pupil: 0.46, curve: -0.05, brow: 0.7, low: 0.14, look: [0.1, -0.6] }, right: { brow: 1.2, slant: 0.9, lid: 0.52, pupil: 0.46, curve: 0.05, low: 0.14, ringW: 1.6 } },
  beak: { el: -0.1, lift: 1.2, w: 38, l: 46, open: 0.6 },
  bandage: { az: -0.5, el: 0.86, size: 66, rot: -0.63 },
  headphones: { on: false },
  flow: [0.35, 1],
}), NOFACE);
const F_RIGHT_WING = {
  lead: [[1635, 612], [1725, 512], [1775, 412], [1810, 322], [1830, 237], [1847, 170]],
  root: [[1815, 342], [1847, 422], [1825, 512], [1770, 597], [1715, 662]],
  tips: [[1849, 167], [1950, 200], [2019, 284], [2054, 400], [2034, 502], [1985, 594], [1942, 657], [1887, 704], [1825, 737]],
  w: [84, 72], cov: 3, covW: 70, seed: 21, bend: 0.04,
  base: [[1565, 672], [1625, 592], [1715, 492], [1780, 392], [1825, 332], [1860, 432], [1825, 532], [1755, 622], [1675, 702], [1595, 732]],
};
const F_LEFT_WING = {
  lead: [[1330, 772], [1140, 757], [1040, 742], [948, 734]],
  root: [[1262, 776], [1250, 830], [1236, 890], [1225, 950], [1215, 1000]],
  tips: [[948, 734], [962, 800], [1000, 866], [1055, 920], [1120, 960], [1190, 990]],
  w: [76, 84], cov: 3, covW: 60, seed: 23, bend: 0.03,
  base: [[1360, 760], [1250, 755], [1150, 760], [1180, 820], [1230, 920], [1300, 980], [1380, 920]],
};
export function birdF() {
  return birdCanvas("F", {
    box: [880, 120, 2206, 1000], pose: F_POSE, place: F_PLACE, back: [F_RIGHT_WING, F_LEFT_WING],
    under: (g) => {
      blade(g, [1400, 430], [1255, 357], 24); blade(g, [1435, 405], [1340, 298], 26);
      g.fillStyle = "#0c0c0c"; g.beginPath(); g.ellipse(1236, 592, 42, 100, 0.25, 0, Math.PI * 2); g.fill();
    },
    over: (g) => {
      drawFace(g, FACE_F);
      phoneBand(g, [[1205, 480], [1228, 400], [1285, 332], [1360, 296], [1435, 293], [1500, 318], [1550, 362], [1580, 415]], 21);
      phoneCup(g, { x: 1603, y: 505, rx: 76, ry: 84, rot: -0.12, side: 1 });
    },
  });
}

// ---------------------------------------------------------------- J: the dive, 99.48–100.44
// Measured at 99.80 (f75) on a labelled grid. Head x 855–1290, y 340–690 (centre (1070, 515)); eyes (1095, 550) /
// (1215, 552) under heavy V brows; beak top (1160, 590); bandage (1072, 410), a flat X; near cup (915, 475)
// rx 65 ry 95 (plate to the left), band over the crown to a far-cup sliver at (1275, 490). Body up-left behind the
// head, tail feathers at (520–720, 10–190), a foot at (430–600, 200–300) toes left. Upper wing across the top
// (tips (930,100)…(1395,320)) to a fist at (1370, 425) holding scissors (pivot (1415, 515), tips (1590, 700) /
// (1485, 760)); lower wing fanned down-left (tips (450,405)…(900,905)) to a fist at (1000, 770) holding scissors
// pointing right (pivot (1105, 797), tips (1385, 745) / (1390, 860)).
export const J_PLACE = { x: 1070, y: 515, s: 1.75 };
const J_POSE = mergePose(mergePose(owlPose("angry"), {
  light: [-0.5, -0.85],
  head: { x: 0, y: 0, rx: 118, ry: 100, yaw: 0.46, pitch: -0.05, roll: 0.02, square: 2.3, jowl: 0.1 },
  tufts: [{ at: -0.5, size: 20, width: 0.25, lean: -0.1, second: 0.4, curl: 0.1 }, { at: 0.35, size: 22, width: 0.25, lean: 0.1, second: 0.4, curl: 0.1 }],
  body: { x: -175, y: -95, a: 150, b: 100, rot: -2.6, egg: -0.05, sag: 0 },
  tail: null,
  feet: [],
  eyes: { state: "angry", r: 26, spread: 0.31, el: -0.15, look: [-0.3, 0.1], right: { brow: 1.4, slant: 0.8, lid: 0.45, pupil: 0.55 }, left: { brow: 1.4, slant: 0.8, lid: 0.45, pupil: 0.55 } },
  beak: { el: -0.32, lift: 1.12, w: 36, l: 44, open: 0.6 },
  bandage: { az: -0.45, el: 0.66, size: 56, rot: 0.2 },
  headphones: { on: false },
  flow: [-0.6, -1],
}), NOFACE);
export const J_SC = [{ x: 1415, y: 515, ang: 1.05, L: 250, open: 0.35, lw: 2.4, bw: 0.09, loop: 0.55 }, { x: 1105, y: 797, ang: 0.02, L: 285, open: 0.38, lw: 2.4, flip: true, bw: 0.09, loop: 0.55 }];
export function birdJ() {
  return birdCanvas("J", { box: [380, 0, 1640, 946], pose: J_POSE, place: J_PLACE,
    back: [
      { lead: [[1060, 120], [1150, 122], [1250, 172], [1310, 222], [1400, 300]], root: [[1140, 150], [1200, 185], [1250, 230], [1290, 280]],
        tips: [[931, 100], [953, 147], [950, 190], [953, 235], [965, 278]], w: 62, cov: 3, seed: 31, order: "trail-top",
        base: [[930, 110], [1150, 125], [1300, 215], [1400, 300], [1400, 400], [1300, 360], [1150, 320], [1000, 310], [900, 260]] },
      // the tail fan at the top left (feathers up-left, tips (525, 40)…(700, 40))
      { lead: [[590, 215], [700, 165]], root: [[610, 200], [650, 190], [690, 180], [730, 170]],
        tips: [[525, 45], [575, 18], [640, 12], [705, 40]], w: 58, cov: 1, seed: 35, order: "trail-top",
        base: [[560, 230], [620, 150], [720, 120], [780, 200], [700, 260]] },
    ],
    mid: [
      { lead: [[860, 520], [930, 610], [990, 700], [1040, 790]], root: [[790, 560], [840, 640], [890, 720], [950, 800]],
        tips: [[446, 411], [486, 543], [543, 650], [621, 729], [700, 793], [800, 845], [900, 890]], w: 78, cov: 3, seed: 33, order: "trail-top",
        base: [[700, 470], [860, 500], [960, 640], [1040, 780], [980, 830], [860, 760], [760, 640], [690, 540]] },
    ],
    under: (g) => { g.fillStyle = "#0c0c0c"; g.beginPath(); g.ellipse(1272, 490, 26, 60, 0, 0, Math.PI * 2); g.fill(); },
    over: (g) => {
      // the dangling foot at the top left, toes pointing left (measured (430–600, 200–300))
      setPPU(1); drawFoot(g, { x: 590, y: 262, rot: Math.PI / 2 + 0.3, size: 56, mode: "dangle", toes: 3, leg: 40, seed: 2 });
      drawFace(g, FACE_J);
      phoneBand(g, [[900, 385], [915, 330], [975, 290], [1050, 275], [1130, 280], [1200, 295], [1250, 340], [1272, 420]], 22);
      phoneCup(g, { x: 915, y: 475, rx: 72, ry: 95, rot: 0.05, side: -1 });
      for (const sc of J_SC) drawShears(g, sc);
      fist(g, [1375, 410], [0.3, 1], 38); fist(g, [1010, 775], [1, -0.1], 42);
    } });
}

// ---------------------------------------------------------------- H: holding up two pairs, 98.96–99.28
// Measured at 99.08 (f57) on a labelled grid. Eyes (1095, 490) / (1225, 428) (−25°), beak (1180, 490–550),
// bandage (1090, 365), near cup (1395, 328) rx 75 ry 103, band over the crown to a far cup at (1010, 440). Body
// egg x 950–1670, y 530–820; tail (1620–1820, 610–720); feet toes-right at (1660–1830, 680–770) and (1580–1740,
// 790–880). Lower wing: an arm from the body left to a fist at (530, 570), feathers hanging below to (500–1060,
// 690–820); scissors upright in it (pivot (560, 370), tips (595, 150) / (620, 170)). Upper wing arching over the head
// to a fist at (1010, 120) holding scissors pointing down-left (pivot (880, 195), tips (670, 300) / (685, 355)).
export const H_PLACE = { x: 1183, y: 432, s: 1.72 };
const H_POSE = mergePose(mergePose(owlPose("angry"), {
  light: [-0.5, -0.85],
  head: { x: 0, y: 0, rx: 102, ry: 100, yaw: -0.2, pitch: -0.1, roll: -0.42, square: 2.3, jowl: 0.1 },
  tufts: [{ at: -1.2, size: 28, width: 0.3, lean: -0.35, second: 0.35, curl: 0.1 }, { at: 0.5, size: 18, width: 0.22, lean: 0.1, second: 0.3, curl: 0.1 }],
  body: { x: 80, y: 128, a: 205, b: 82, rot: 0.2, egg: 0.05, sag: 0.1 },
  tail: { base: [254, 133], tip: [370, 133], w: 35, n: 3 },
  feet: [{ x: 295, y: 167, rot: -1.5, size: 38, mode: "dangle", toes: 3, leg: 20, seed: 2 }, { x: 262, y: 214, rot: -1.3, size: 38, mode: "dangle", toes: 3, leg: 20, seed: 5 }],
  eyes: { state: "angry", r: 27, spread: 0.42, el: 0.0, look: [0.1, -0.1], left: { state: "half", lid: 0.58, slant: -0.05, pupil: 0.5, curve: -0.05, brow: 0.7, low: 0.12 }, right: { brow: 1.2, slant: 0.9, lid: 0.5, pupil: 0.5, curve: 0.05, low: 0.1 } },
  beak: { el: -0.12, lift: 1.02, w: 36, l: 44, open: 0.55 },
  bandage: { az: -0.3, el: 0.74, size: 62, rot: -0.63 },
  headphones: { on: false },
  flow: [0.35, 1],
}), NOFACE);
export const H_SC = [{ x: 562, y: 380, ang: -1.43, L: 235, open: 0.14, lw: 2.4, bw: 0.1, loop: 0.6 }, { x: 880, y: 195, ang: 2.56, L: 250, open: 0.24, lw: 2.4, flip: true, bw: 0.1, loop: 0.65 }];
export function birdH() {
  return birdCanvas("H", { box: [400, 0, 1880, 946], pose: H_POSE, place: H_PLACE,
    back: [
      { lead: [[1000, 130], [1100, 125], [1230, 160], [1320, 260], [1340, 400]], root: [[1050, 110], [1180, 100], [1300, 150], [1380, 250], [1400, 380]],
        tips: [[1150, 30], [1250, 25], [1350, 40], [1445, 80], [1530, 130], [1590, 190], [1628, 260], [1635, 340], [1612, 425]], w: 64, cov: 2, seed: 41, order: "trail-top", lw: 1.6,
        base: [[990, 140], [1100, 90], [1250, 110], [1370, 200], [1420, 330], [1400, 450], [1320, 460], [1300, 300], [1200, 190], [1080, 160]] },
    ],
    mid: [
      { lead: [[600, 540], [800, 545], [1000, 560], [1100, 580]], root: [[620, 605], [760, 615], [900, 625], [1040, 635], [1150, 650]],
        tips: [[470, 640], [520, 690], [590, 735], [670, 775], [760, 805], [860, 830], [960, 840], [1060, 845], [1150, 830]], w: 70, cov: 2, seed: 43, order: "lead-top", lw: 1.6,
        base: [[580, 525], [800, 520], [1000, 535], [1120, 575], [1100, 670], [900, 650], [700, 640], [580, 630]] },
    ],
    under: (g) => { g.fillStyle = "#0c0c0c"; g.beginPath(); g.ellipse(1012, 440, 32, 80, 0.3, 0, Math.PI * 2); g.fill(); },
    over: (g) => {
      drawFace(g, FACE_H);
      phoneBand(g, [[1015, 420], [1020, 300], [1080, 195], [1180, 160], [1280, 175], [1340, 222]], 22);
      phoneCup(g, { x: 1395, y: 328, rx: 78, ry: 103, rot: -0.15, side: 1 });
      for (const sc of H_SC) drawShears(g, sc);
      fist(g, [535, 570], [-1, 0.25], 80); fist(g, [1010, 125], [-0.4, -1], 50);
    } });
}

// ---------------------------------------------------------------- B: slashing across the page, 97.12–97.52
// Measured at 97.40 (f15) on a 2x grid: head centre (1072, 418), eyes (1027, 440) / (1087, 427), beak (1052, 465),
// bandage (1035, 377), near cup (1162, 412); body x 1000–1400, y 470–580; near wing forward-left to a fist at
// (900, 505) holding scissors (pivot (802, 470), tips (630, 520) / (665, 435)); far wing raised back, top edge
// (1195,430)…(1345,345)…(1500,405), holding a second pair (pivot (1470, 430), tip (1540, 515)); tail x 1370–1445;
// feet (1310–1420, 575–630); two blades behind the head (1040–1100, 290–350).
export const B_PLACE = { x: 1072, y: 418, s: 0.78 };
const B_POSE = mergePose(owlPose("angry"), {
  light: [-0.5, -0.85],
  head: { x: 0, y: 0, rx: 102, ry: 100, yaw: -0.22, pitch: -0.05, roll: -0.2, square: 2.3, jowl: 0.1 },
  body: { x: 190, y: 130, a: 230, b: 88, rot: 0.1, egg: 0.1, sag: 0.08 },
  tail: { base: [390, 130], tip: [480, 150], w: 36, n: 3 },
  feet: [{ x: 320, y: 225, rot: -1.0, size: 26, mode: "dangle", toes: 3, seed: 2 }, { x: 420, y: 205, rot: -1.1, size: 26, mode: "dangle", toes: 3, seed: 5 }],
  eyes: { state: "angry", r: 24, spread: 0.42, el: -0.12, look: [-0.5, 0.1], left: { state: "half", lid: 0.55, pupil: 0.55, brow: 0.7 }, right: { brow: 1.2, slant: 0.8, lid: 0.45, pupil: 0.55 } },
  beak: { el: -0.4, lift: 1.1, w: 30, l: 40, open: 0.35 },
  bandage: { az: -0.4, el: 0.62, size: 62, rot: -0.4 },
  headphones: { on: false },
  flow: [0.6, 0.8],
});
export function birdB() {
  return birdCanvas("B", { box: [600, 270, 1560, 660], pose: B_POSE, place: B_PLACE,
    back: [
      { lead: [[1190, 440], [1260, 380], [1345, 345], [1430, 360], [1500, 405]], root: [[1210, 470], [1280, 425], [1350, 400], [1430, 410]],
        tips: [[1230, 540], [1300, 535], [1370, 522], [1440, 505], [1505, 470]], w: 48, cov: 2, covW: 30, seed: 51, lw: 1.4 },
    ],
    under: (g) => {
      blade(g, [1060, 352], [1040, 292], 14); blade(g, [1086, 348], [1100, 290], 14);
      drawShears(g, { x: 1470, y: 430, ang: 0.88, L: 110, open: 0.25, lw: 1.3, loop: 0.7 });
    },
    over: (g) => {
      paintWing(g, { lead: [[1060, 478], [990, 470], [935, 482], [900, 500]], root: [[1055, 500], [990, 502], [940, 515]],
        tips: [[1110, 565], [1050, 570], [995, 562], [950, 548]], w: 44, cov: 1, covW: 22, seed: 53, lw: 1.3 });
      phoneBand(g, [[992, 425], [1000, 365], [1040, 325], [1090, 318], [1135, 340], [1152, 375]], 10);
      phoneCup(g, { x: 1162, y: 412, rx: 36, ry: 45, rot: -0.15, side: 1 });
      drawShears(g, { x: 805, y: 470, ang: Math.PI + 0.08, L: 172, open: 0.3, lw: 1.6, loop: 0.62 });
      fist(g, [905, 500], [-1, 0], 26);
    } });
}
const KIT = new Map();
export function kitLayer(key, pose, place) {
  if (!KIT.has(key)) KIT.set(key, owlLayer({ ...pose, ...place, clip: [-400, -400, 2606, 1346] }));
  return KIT.get(key);
}
export function releaseKit() { KIT.clear(); }
export { drawShears, glint };
