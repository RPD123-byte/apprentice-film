// s05 face and front hair: his profile in lost profile, the pencil between his teeth, black locks falling from the
// beanie's cuff. Traced from the source at 25.00 s (the settled frame): the skin/dark boundary from luminance runs
// along rows and columns (snapshots/s05-fix1-study/runs.py, skin.py), the locks, strands and hatching from 3–5x crops
// (t-hair3.jpg, g-mouth.jpg, t-face.jpg). Frame coordinates of the settled camera.
import { INK, rng, taper, poly, blob, line, curve, stroke, inside, clearO, sampleCurve } from "./kit.js";

const INKD = "#0b0b0b";

// ---- the skin (face, jaw, the temple between the lock and the headphone cup). The cup (owl layer) covers x > ~1420
// at y 300–460, so the skin runs on under it.
export const SKIN = [
  [1322, 229], [1331, 224], [1343, 236], [1352, 246], [1357, 255], [1360, 244], [1367, 251], [1372, 260], [1374, 272], [1374, 292],
  [1376, 312], [1380, 302], [1384, 291], [1388, 293], [1392, 312], [1397, 323], [1403, 347], [1406, 334], [1409, 318], [1414, 305],
  [1420, 292], [1424, 276], [1432, 268], [1450, 265], [1470, 268], [1474, 330], [1474, 460], [1466, 474], [1460, 486], [1452, 499],
  [1436, 497], [1427, 502], [1418, 509], [1410, 510], [1400, 507], [1394, 501], [1388, 496], [1383, 489], [1379, 480], [1380, 468],
  [1377, 452], [1369, 444], [1362, 438], [1359, 430], [1360, 423], [1372, 424], [1386, 425], [1396, 423], [1397, 412], [1392, 403],
  [1384, 399], [1370, 400], [1356, 398], [1347, 395], [1339, 389], [1334, 381], [1337, 368], [1336, 355], [1330, 347], [1323, 345],
  [1322, 342], [1316, 339], [1311, 342], [1304, 341], [1297, 336], [1292, 330], [1290, 323], [1292, 316], [1296, 307], [1303, 295],
  [1313, 289], [1317, 277], [1322, 267], [1324, 250],
];
// the black hair on the face side: under the cuff's lower edge, the locks over the brow and temple, and the hair that
// hangs down the far side of his face (over the dark speaker)
const CUFF_EDGE = [[1272, 50], [1276, 62], [1284, 80], [1293, 95], [1300, 105], [1310, 120], [1320, 133], [1330, 144], [1340, 152], [1350, 163], [1360, 170], [1370, 180], [1380, 187], [1390, 195], [1400, 201], [1410, 208], [1420, 216], [1430, 221], [1440, 228], [1460, 238], [1478, 246]];
export const HAIR_F = [
  ...CUFF_EDGE,
  [1480, 300], [1470, 272], [1462, 268], [1450, 266], [1432, 268], [1424, 275], [1420, 291], [1414, 304], [1409, 317], [1406, 332], [1403, 350],
  [1399, 332], [1396, 322], [1391, 312], [1387, 294], [1384, 292], [1380, 303], [1376, 315], [1373, 300], [1373, 272], [1370, 259], [1364, 252],
  [1360, 246], [1357, 258], [1352, 246], [1343, 236], [1331, 225], [1323, 232], [1323, 262], [1318, 272], [1314, 287], [1303, 294], [1298, 300],
  [1289, 292], [1280, 280], [1270, 258], [1260, 228], [1252, 190], [1249, 150], [1253, 110], [1262, 78],
];
export const FACE_MASK = [(c) => poly(SKIN)(c), (c) => poly(HAIR_F)(c)];

// tapered white strands in the black hair (from t-hair3.jpg): [points, width, alpha]
const STRANDS = [
  // long strands hanging down the far side of the face
  [[[1281, 80], [1268, 108], [1257, 146], [1254, 184], [1260, 214]], 2.4, 0.9],
  [[[1278, 88], [1271, 126], [1270, 166], [1279, 204], [1292, 240], [1304, 270]], 2.6, 0.95],
  [[[1287, 112], [1283, 150], [1287, 190], [1294, 224]], 1.8, 0.75],
  [[[1263, 120], [1259, 160], [1263, 196]], 1.2, 0.55],
  [[[1296, 150], [1300, 186], [1309, 214], [1318, 238]], 1.5, 0.7],
  [[[1291, 196], [1298, 226], [1306, 252]], 1.2, 0.55],
  // strands sweeping down-right from under the cuff into the locks over the brow
  [[[1300, 128], [1318, 156], [1333, 184], [1344, 210], [1352, 234]], 1.8, 0.8],
  [[[1316, 146], [1336, 174], [1352, 204], [1364, 232], [1371, 262]], 1.6, 0.75],
  [[[1338, 160], [1358, 188], [1376, 220], [1389, 256], [1398, 296], [1402, 330]], 2.0, 0.85],
  [[[1356, 178], [1376, 204], [1392, 234], [1404, 262], [1410, 290]], 1.4, 0.65],
  [[[1380, 196], [1398, 218], [1414, 244], [1424, 266]], 1.3, 0.6],
  [[[1404, 212], [1420, 232], [1434, 252], [1442, 262]], 1.1, 0.5],
  [[[1326, 170], [1340, 200], [1350, 226], [1356, 248]], 1.0, 0.45],
  [[[1362, 214], [1372, 240], [1378, 270], [1380, 296]], 1.1, 0.5],
];

// a short tapered tick (3 points, so the taper has a body)
export function tick(o, x, y, ang, L, w, color) {
  const c = Math.cos(ang), s = Math.sin(ang);
  taper(o, [[x, y], [x + c * L * 0.45, y + s * L * 0.45], [x + c * L, y + s * L]], (u) => w * (0.25 + 0.75 * Math.sin(Math.PI * Math.min(1, u * 0.85 + 0.1))), color);
}

function hatchLines(o, x0, y0, n, dx, dy, lx, ly, w, a, seed, jit = 1) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const x = x0 + dx * i + (r() - 0.5) * jit, y = y0 + dy * i + (r() - 0.5) * jit;
    const k = 0.75 + r() * 0.5;
    taper(o, [[x, y], [x + lx * k * 0.5, y + ly * k * 0.5], [x + lx * k, y + ly * k]], (u) => w * Math.sin(Math.PI * Math.min(1, u * 1.05 + 0.02)), `rgba(18,18,18,${(a * (0.7 + 0.3 * r())).toFixed(2)})`);
  }
}

export function paintFace(P) {
  const o = P.o, r = rng(801);
  // ---- skin: pale, the nose tip and the temple a little darker (source 25.00: cheek 211, nose 193, jaw 215, temple 145)
  clearO(P, poly(SKIN));
  P.fill(poly(SKIN), 0.8, 1.2, { style: 2 });
  P.light((c) => c.ellipse(1296, 322, 12, 16, 0, 0, 7), 0.72, "source-over", 0.6);
  P.light(poly([[1418, 268], [1474, 262], [1474, 345], [1440, 350], [1422, 330]]), 0.56, "source-over", 0.8);
  // the jaw is lit (215): a touch brighter than the cheek
  P.light((c) => c.ellipse(1418, 478, 36, 26, 0.2, 0, 7), 0.84, "source-over", 0.6);
  // ---- blush hatch high on the cheek (short strokes rising to the right)
  hatchLines(o, 1303, 312, 8, 3.4, -1.2, 9, -14, 1.2, 0.55, 811);
  // ---- the line down the side of the nose, the nostril
  curve(o, [[1324, 282], [1327, 300], [1331, 320], [1336, 338]], 1.0, "rgba(40,40,40,0.55)", 812);
  curve(o, [[1311, 341], [1318, 338], [1325, 340], [1330, 344]], 1.8, INKD, 813);
  // ---- profile edge: a fine dark keyline where the lit skin meets the dark (nose to upper lip)
  curve(o, [[1313, 289], [1303, 295], [1296, 307], [1292, 316], [1290, 323], [1292, 330], [1297, 336], [1304, 341], [1311, 342]], 1.3, "rgba(12,12,12,0.8)", 814);
  curve(o, [[1323, 345], [1330, 347], [1336, 355], [1337, 368], [1334, 381], [1339, 389], [1347, 395]], 1.3, "rgba(12,12,12,0.8)", 815);
  // the lip line where the upper lip closes on the pencil
  curve(o, [[1345, 395], [1356, 399], [1370, 401], [1383, 401]], 2.2, INKD, 816);
  // moustache stubble above the lip: short ticks leaning down-right
  for (let i = 0; i < 16; i++) {
    const x = 1343 + r() * 50, y = 372 + r() * 22 + (x - 1343) * 0.1;
    if (!inside(SKIN, x, y) || y > 396) continue;
    tick(o, x, y, 1.05 + (r() - 0.5) * 0.4, 5 + r() * 4, 1.2, `rgba(20,20,20,${(0.5 + 0.3 * r()).toFixed(2)})`);
  }
  // cheek hatch toward the jaw (fine, sparse)
  hatchLines(o, 1386, 368, 6, 3, 1.2, -5, 12, 0.9, 0.4, 817, 2);
  // ---- chin and jaw stubble: dense fine ticks on the chin front, sparser along the jaw
  for (let i = 0; i < 360; i++) {
    const x = 1362 + r() * 100, y = 436 + r() * 74;
    if (!inside(SKIN, x, y)) continue;
    const edge = Math.max(0, 1 - Math.abs(x - (1380 + (y - 440) * 0.25)) / 45);   // densest near the chin front
    if (r() > 0.25 + 0.75 * edge) continue;
    const a = 1.45 + (r() - 0.5) * 0.5, L = 5 + r() * 6;
    tick(o, x, y, a, L, 1.0 + r() * 0.5, `rgba(22,22,22,${(0.45 + 0.35 * r()).toFixed(2)})`);
  }
  // chin: the underside turns away (a soft grey line of stubble), the edge against the dark
  curve(o, [[1360, 424], [1359, 431], [1364, 439], [1373, 447], [1378, 456], [1380, 468], [1380, 480], [1386, 492], [1396, 503], [1410, 510]], 1.2, "rgba(12,12,12,0.7)", 818);
  // ---- the lips round the pencil: the lower lip under it, the dark hook of the far lip closing over its end
  P.fill(poly([[1360, 417], [1392, 414], [1397, 422], [1386, 427], [1366, 426]]), 0.7, 0.2, { style: 2 });
  curve(o, [[1362, 425], [1374, 427], [1388, 426], [1396, 422]], 1.6, "rgba(14,14,14,0.85)", 819);
  o.fillStyle = "rgba(16,16,16,0.8)"; o.beginPath(); o.moveTo(1385, 403); o.quadraticCurveTo(1391, 407, 1392, 415); o.lineTo(1387, 414); o.closePath(); o.fill();
  taper(o, sampleCurve([[1372, 395], [1382, 397], [1390, 402], [1395, 410], [1396, 418], [1394, 424]], 6), (u) => 2.6 * Math.pow(Math.sin(Math.PI * Math.min(1, u * 0.9 + 0.08)), 0.5), INKD);
  // ---- sweat drops (outlined, white inside)
  for (const [x, y, s] of [[1348, 286, 1.0], [1414, 450, 0.75], [1422, 447, 0.7]]) {
    o.fillStyle = "rgba(240,238,232,1)"; o.strokeStyle = "rgba(15,15,15,0.9)"; o.lineWidth = 1.3;
    o.beginPath(); o.moveTo(x, y - 8 * s); o.quadraticCurveTo(x + 5 * s, y + 1 * s, x, y + 5 * s); o.quadraticCurveTo(x - 5 * s, y + 1 * s, x, y - 8 * s); o.fill(); o.stroke();
  }
  // ---- hair: black mass, lit strands, fine dark hairs over the temple
  clearO(P, poly(HAIR_F));
  P.fill(poly(HAIR_F), 0.02, 1.0, { style: 2 });
  o.save(); o.beginPath(); poly(HAIR_F)(o); o.clip();
  STRANDS.forEach(([pts, w, a], i) => {
    const q = sampleCurve(pts, 7);
    taper(o, q, (u) => w * Math.pow(Math.max(0, Math.sin(Math.PI * u)), 0.6), `rgba(236,234,228,${a})`);
  });
  // fine short lit hairs at the lock tips
  for (let i = 0; i < 26; i++) {
    const x = 1330 + r() * 90, y = 200 + r() * 90, L = 16 + r() * 26;
    taper(o, sampleCurve([[x, y], [x + L * 0.25, y + L * 0.5], [x + L * 0.35, y + L]], 5), (u) => 0.9 * Math.sin(Math.PI * u), `rgba(230,228,222,${(0.18 + 0.3 * r()).toFixed(2)})`);
  }
  o.restore();
  // fine dark hairs falling over the temple and the cheek beside the lock
  for (let i = 0; i < 18; i++) {
    const x = 1412 + r() * 50, y = 262 + r() * 30, L = 30 + r() * 60;
    taper(o, sampleCurve([[x, y], [x + 2 + r() * 4, y + L * 0.5], [x + 3 + r() * 8, y + L]], 5), (u) => (0.8 + 0.6 * r()) * Math.pow(Math.sin(Math.PI * u), 0.6), `rgba(12,12,12,${(0.45 + 0.35 * r()).toFixed(2)})`);
  }
  for (let i = 0; i < 6; i++) {
    const x = 1378 + r() * 26, y = 300 + r() * 20, L = 20 + r() * 26;
    taper(o, sampleCurve([[x, y], [x + 2, y + L * 0.5], [x + 3, y + L]], 5), (u) => 0.8 * Math.sin(Math.PI * u), "rgba(14,14,14,0.55)");
  }
}
