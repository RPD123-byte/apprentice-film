// s20 (build 3): the note card propped against the box stack. Drawn with the shared note-card kit (notecard.js) in
// its physical "room" look, then warped onto the measured quad (homography, triangle mesh).
// Rest quad: card edges fitted on the source frame 65.48 (left x = -0.164y + 1341.5, top y = -0.163x + 467.1,
// right x = -0.118y + 1536.9, bottom y = 0.318x + 334). The room card's text box sits a little differently from
// the web widget's: inverse-mapped through that quad it measures x0 41, y0 146, x1 405, button row 553, bottom 606,
// divider 224 card units (smiley and trash land on the widget's own 196/80 and 295/80 within 2–5 units).
// The push (63.12–63.40): at 63.12 the card stands upright, held by the owl; its top features (corners, smiley,
// trash, text-box corners) fit an affine of the rest quad (residuals <= 11 px); in between, the corners are
// interpolated by the measured smiley track (yellow-pixel centroid per frame).
import { noteCardCanvas } from "../../../lib/notecard.js";
import { homography, hmap, warpImage, lerp2 } from "./util.js";

export const CARD_REST = [[1299.6, 255.3], [1510.8, 220.8], [1443.3, 793.0], [1222.9, 722.9]];
const CARD0 = [[1030.9, 243.7], [1254.7, 205.2], [1464.4, 780.5], [1177.6, 714.3]];
// source frame -> [fraction of the way to rest (smiley x), smiley dy off the linear path]
const PUSH = new Map([[1578, [0, 0]], [1579, [0.063, -0.7]], [1580, [0.139, -1.5]], [1581, [0.227, -3.5]], [1582, [0.349, -10.8]], [1583, [0.479, -15.3]], [1584, [0.647, -13.1]], [1585, [0.983, -0.8]]]);

const THEME = {
  paper: "#e3dcd6", paperTop: "#d9d2ca", paperBot: "#ded7d1", ink: "#5b4549", text: "#6a5557", muted: "#8f7c7e",
  outline: "rgba(40,24,28,0.9)", smiley: "#d8bd68", smileyHi: "#e6d088", glow: "226,150,92", face: "#6b4b33",
  glowR: 1.45, glowStops: [[0, 0.9], [0.4, 0.5], [1, 0]], trashLw: 3,
  area: { x0: 41, y0: 146, x1: 405, y1: 606, btnY: 553, divX: 224, lw: 3.2 },
};
let tex = null;
function cardTex() {
  if (!tex) tex = noteCardCanvas(930, { theme: THEME, text: "This is really good", smiley: 1 });
  return tex;
}
export function cardQuad(fr) {
  if (fr >= 1586) return CARD_REST;
  const e = PUSH.get(Math.max(1578, fr)) || [0, 0];
  const q = CARD0.map((p, i) => lerp2(p, CARD_REST[i], e[0]));
  return q.map(([x, y]) => [x, y + e[1]]);
}
// draw the card (paper + its dark right-hand thickness) for source frame index fr, under the current transform
export function drawCard(g, fr) {
  const q = cardQuad(fr);
  const c = cardTex(), pad = c.__pad, k = 930 / 465;
  const Hm = homography([[0, 0], [465, 0], [465, 648], [0, 648]], q);
  // thickness: a dark sliver along the right edge (seen on the source 8–12 px wide)
  const tr = q[1], br = q[2];
  g.save();
  g.fillStyle = "rgba(20,14,14,0.95)";
  g.beginPath(); g.moveTo(tr[0] - 2, tr[1] + 6); g.lineTo(tr[0] + 9, tr[1] + 14); g.lineTo(br[0] + 11, br[1] - 4); g.lineTo(br[0] - 2, br[1]); g.closePath(); g.fill();
  g.strokeStyle = "rgba(150,140,138,0.9)"; g.lineWidth = 2;
  g.beginPath(); g.moveTo(tr[0] + 5, tr[1] + 14); g.lineTo(br[0] + 7, br[1] - 4); g.stroke();
  g.restore();
  // the paper, cropped to the card body (+ a little of the pad for the anti-aliased edge and smiley glow)
  const m = 6 / k;
  warpImage(g, c, (u, v) => hmap(Hm, [-m + u * (465 + 2 * m), -m + v * (648 + 2 * m)]), { sx: pad - m * k, sy: pad - m * k, sw: (465 + 2 * m) * k, sh: (648 + 2 * m) * k, n: 6, m: 10 });
  return q;
}
export function releaseCard() { tex = null; }
