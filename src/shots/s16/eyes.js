// s16: his irises, drawn per frame over the room plate (whose eye openings are left white).
// Each iris is a dark oval clipped to the measured eye opening, with its highlight: a round dot inside the iris while
// he looks right (to 1154), then a notch bitten out of its right edge once the eyes slide onto the owl.
// Measured on the source (src/shots/s16/trace/irises.py and 8x grids of 1153 / 1175, plate px): the irises sit at
// x 1336 / 1506 until 1153, slide left over 1154–1160 (fast at first, easing in) and stay at 1296 / 1466.
// Openings: control points read off 8x grids of 1153 and 1175 (between the lash line and the lower lid).
import { grey } from "../../lib/engrave.js";
import { taper } from "../../lib/ink.js";
import { sampleCurve } from "../../lib/paths.js";

const OPEN = {
  L: [[1283, 215], [1290, 211], [1300, 208], [1310, 206.5], [1320, 205.5], [1330, 205.5], [1340, 206], [1348, 207.5], [1354, 210], [1358, 213],
    [1361, 216], [1356, 221], [1348, 225], [1340, 227.5], [1330, 228.5], [1320, 229], [1310, 229], [1300, 227.5], [1292, 224], [1286, 219.5]],
  R: [[1459, 213], [1464, 209], [1472, 206], [1480, 204], [1490, 203], [1500, 203], [1510, 203.5], [1518, 205], [1524, 207.5], [1529, 211],
    [1531, 213], [1526, 217], [1520, 221], [1510, 224.5], [1500, 225.5], [1490, 225.5], [1480, 224], [1470, 221], [1463, 217]],
};
// iris centre x per frame (viewer-left eye L, right eye R); cy fixed. Before 1154 and after 1160 constant.
const SLIDE = { 1154: [1332, 1502], 1155: [1319, 1487], 1156: [1309, 1480], 1157: [1303, 1474], 1158: [1301, 1472], 1159: [1300, 1471] };
const RIGHT = [1336, 1506], LEFT = [1296, 1466];
const CY = [219, 216], RX = 13, RY = 13;
const IRIS_V = 0.14;       // pre-grade value inside the iris (measured 0.14–0.17)

export function irisAt(F) {
  const x = F <= 1153 ? RIGHT : F >= 1160 ? LEFT : SLIDE[F];
  return { x, notch: F >= 1155 };
}

function openPath(g, pts) {
  g.beginPath();
  g.moveTo(pts[0][0] + 0.5, pts[0][1] + 0.5);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0] + 0.5, pts[i][1] + 0.5);
  g.closePath();
}

// fix 2: the lids, authored from 6x grids of 1175 (plate px; the lash lines follow the openings' upper edges): the
// crease (a soft grey fold ~15 px above), the upper lid (one dark tapered stroke), the lower lid (a thin grey line),
// and the bag under each eye (a few curved hatch strokes). Resampled as Catmull-Rom curves, one tapered stroke each.
export const LIDS = {
  L: {
    crease: [[1281, 193], [1301.7, 189.7], [1320, 188], [1335, 188.7], [1348, 191.7], [1358, 198]],
    upper: [[1276.7, 215], [1290, 209], [1305, 206], [1320, 204.7], [1335, 205], [1346.7, 207.5], [1355, 212.5], [1358.5, 216.7]],
    lower: [[1278, 216.5], [1290, 223], [1305, 227], [1320, 228.7], [1335, 228], [1348, 225], [1356, 220.5]],
    bag: [[1280, 225], [1300, 231.7], [1320, 233], [1340, 232.5], [1358, 226.7]],
  },
  R: {
    crease: [[1460, 191.7], [1480, 186.7], [1500, 185.8], [1520, 188], [1533, 195]],
    upper: [[1453, 214.5], [1460, 209.5], [1478, 204.5], [1500, 203.5], [1515, 204], [1528, 208], [1535, 211.5], [1541, 215.5], [1545, 221]],
    lower: [[1456.7, 217.5], [1468, 223], [1485, 225], [1501.7, 224.7], [1518, 221.7], [1530, 216.7]],
    bag: [[1460, 225], [1478, 231.7], [1500, 233], [1518, 230], [1531, 223]],
  },
};
export const LID = { upV: 0.17, upW: 3.4, loV: 0.42, loW: 2.0, crV: 0.36, crW: 2.6, bagV: 0.38, bagW: 1.3, bagN: 7, shV: 0.55, shW: 4, shA: 0.4, bagBandV: 0.48, bagBandW: 10, bagBandA: 0.5, dy: 1.0, cornV: 0.25, cornA: 0.85 };
// the dark corners of each eye (source 0.2-0.4 over ~10 x 15 px at both ends, vertical profiles of 1175; the right
// eye's outer lash line flicks out to x ~1545, y ~221)
const CORNERS = [[1282, 213, 7, 8], [1356, 210, 6, 9], [1457, 211, 7, 9], [1538, 212, 8, 10]];
const bell = (u) => Math.pow(Math.sin(Math.PI * Math.max(0, Math.min(1, u))), 0.45);
function lid(g, pts, w, v, k = 0.25) { taper(g, sampleCurve(pts, 6), (u) => w * (k + (1 - k) * bell(u)), grey(v)); }
const dn = (pts, d) => pts.map(([x, y], i) => [x, y + d * Math.sin(Math.PI * i / (pts.length - 1))]);
export function drawUpperLid(g, eye) { lid(g, dn(LIDS[eye].upper, LID.dy), LID.upW, LID.upV, 0.3); }
// a soft band along a curve (blurred), for the shadows the source paints round the eye (measured on vertical
// profiles of 1175: the lid's shadow on the top of the eye white ~0.5, the bag ~0.5-0.6)
function band(g, pts, w, v, a, blur) {
  g.save(); g.filter = `blur(${blur}px)`; g.globalAlpha = a; g.lineCap = "round"; g.lineJoin = "round";
  g.strokeStyle = grey(v); g.lineWidth = w; g.beginPath();
  const q = sampleCurve(pts, 6); g.moveTo(q[0][0], q[0][1]); for (const p of q) g.lineTo(p[0], p[1]); g.stroke();
  g.restore();
}
export function drawLids(g) {
  for (const eye of ["L", "R"]) {
    const E = LIDS[eye];
    // the upper lid's shadow on the top of the eye white (inside the opening) and the bag's darker band
    g.save(); openPath(g, OPEN[eye]); g.clip();
    band(g, dn(E.upper, LID.dy + 3), LID.shW, LID.shV, LID.shA, 1.5);
    g.restore();
    band(g, E.bag.map(([x, y]) => [x, y + 1.5]), LID.bagBandW, LID.bagBandV, LID.bagBandA, 2.5);
    g.save(); g.filter = "blur(2.5px)"; g.globalAlpha = LID.cornA; g.fillStyle = grey(LID.cornV);
    for (const [x, y, rx, ry] of CORNERS.filter((c) => (eye === "L") === (c[0] < 1400))) { g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fill(); }
    g.restore();
    lid(g, E.crease, LID.crW, LID.crV, 0.1);
    lid(g, E.lower, LID.loW, LID.loV, 0.2);
    // the bag: short curved hatch strokes following the bag's curve, fanning down from it (0.35-0.45, 1-1.5 px)
    for (let k = 0; k < LID.bagN; k++) {
      const t0 = 0.12 + 0.76 * (k / (LID.bagN - 1)), off = (k % 2) * 1.5;
      const q = sampleCurve(E.bag, 8), i0 = Math.round(t0 * (q.length - 1));
      const a = q[Math.max(0, i0 - 9)], b = q[i0], c = q[Math.min(q.length - 1, i0 + 9)];
      const pts = [[a[0], a[1] + 1 + off], [b[0], b[1] + 3.5 + off], [c[0], c[1] + 1 + off]];
      taper(g, sampleCurve(pts, 6), (u) => LID.bagW * bell(u), grey(LID.bagV + 0.04 * (k % 2)));
    }
    drawUpperLid(g, eye);
  }
}

// F = source frame index; g carries the camera transform
export function drawIrises(g, F) {
  const { x, notch } = irisAt(F);
  ["L", "R"].forEach((eye, i) => {
    const cx = x[i], cy = CY[i];
    g.save();
    openPath(g, OPEN[eye]); g.clip();
    // the iris: a round dark disc with a slightly darker rim, clipped by the lids
    g.fillStyle = grey(IRIS_V);
    g.beginPath(); g.ellipse(cx, cy, RX, RY, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = grey(0.06); g.lineWidth = 1.5;
    g.beginPath(); g.ellipse(cx, cy, RX - 0.75, RY - 0.75, 0, 0, Math.PI * 2); g.stroke();
    // the catchlight: a round dot while he looks right; once the eyes slide onto the owl, a short round-ended pill
    // at the iris's right edge (measured on 1175: x cx+9..cx+14, 3.5 px tall, 3-4 px above the centre)
    g.fillStyle = "#f4f3ee";
    if (!notch) {
      g.beginPath(); g.arc(cx + (i === 0 ? 7.5 : 9), cy - 2.5, 3.0, 0, Math.PI * 2); g.fill();
    } else {
      g.lineCap = "round"; g.strokeStyle = "#f4f3ee"; g.lineWidth = 3.6;
      g.beginPath(); g.moveTo(cx + 9.5, cy - 3.5); g.lineTo(cx + 14, cy - 3.5); g.stroke();
    }
    g.restore();
    // the upper lid's lash line over the iris
    drawUpperLid(g, eye);
  });
}
export function releaseEyes() {}
