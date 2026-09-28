// s16: his irises, drawn per frame over the room plate (whose eye openings are left white).
// Each iris is a dark oval clipped to the measured eye opening, with its highlight: a round dot inside the iris while
// he looks right (to 1154), then a notch bitten out of its right edge once the eyes slide onto the owl.
// Measured on the source (src/shots/s16/trace/irises.py and 8x grids of 1153 / 1175, plate px): the irises sit at
// x 1336 / 1506 until 1153, slide left over 1154–1160 (fast at first, easing in) and stay at 1296 / 1466.
// Openings: control points read off 8x grids of 1153 and 1175 (between the lash line and the lower lid).
import { grey } from "../../lib/engrave.js";

const OPEN = {
  L: [[1283, 215], [1290, 211], [1300, 208], [1310, 206.5], [1320, 205.5], [1330, 205.5], [1340, 206], [1348, 207.5], [1354, 210], [1358, 213],
    [1361, 216], [1356, 221], [1348, 225], [1340, 227.5], [1330, 228.5], [1320, 229], [1310, 229], [1300, 227.5], [1292, 224], [1286, 219.5]],
  R: [[1459, 213], [1464, 209], [1472, 206], [1480, 204], [1490, 203], [1500, 203], [1510, 203.5], [1518, 205], [1524, 207.5], [1529, 211],
    [1531, 213], [1526, 217], [1520, 221], [1510, 224.5], [1500, 225.5], [1490, 225.5], [1480, 224], [1470, 221], [1463, 217]],
};
// iris centre x per frame (viewer-left eye L, right eye R); cy fixed. Before 1154 and after 1160 constant.
const SLIDE = { 1154: [1332, 1502], 1155: [1319, 1487], 1156: [1309, 1480], 1157: [1303, 1474], 1158: [1301, 1472], 1159: [1300, 1471] };
const RIGHT = [1336, 1506], LEFT = [1296, 1466];
const CY = [219, 216], RX = 13, RY = 17;
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

// F = source frame index; g carries the camera transform
export function drawIrises(g, F) {
  const { x, notch } = irisAt(F);
  ["L", "R"].forEach((eye, i) => {
    const cx = x[i], cy = CY[i];
    g.save();
    openPath(g, OPEN[eye]); g.clip();
    g.fillStyle = grey(IRIS_V);
    g.beginPath(); g.ellipse(cx, cy, RX, RY, 0, 0, Math.PI * 2); g.fill();
    // a slightly darker rim
    g.strokeStyle = grey(0.06); g.lineWidth = 1.6;
    g.beginPath(); g.ellipse(cx, cy, RX - 0.6, RY - 0.6, 0, 0, Math.PI * 2); g.stroke();
    g.fillStyle = "#f4f3ee";
    g.beginPath();
    if (!notch) {
      if (i === 0) g.ellipse(cx + 7.5, cy - 2.5, 3.0, 3.2, 0, 0, Math.PI * 2);
      else g.ellipse(cx + 12.5, cy - 1.5, 4.0, 3.0, 0, 0, Math.PI * 2);
    } else {
      if (i === 0) g.ellipse(cx + 11, cy - 3, 4.2, 2.8, 0, 0, Math.PI * 2);
      else g.ellipse(cx + 13, cy - 1.5, 4.0, 2.6, 0, 0, Math.PI * 2);
    }
    g.fill();
    g.restore();
  });
}
export function releaseEyes() {}
