// The picture s02 hands over at 19.12, continued into s04: s02's engraved room (imported live from s02/room.js, so the
// background stays identical across the join) and s02's designer drawing (a copy, designer02.js) as key A.
// World coordinates = the 6.04 s source frame (s02's stare framing). s02 ends at a camera offset of (-157.5, +120.1);
// s04 carries the pan on to the held framing, where world + HOLD = the 20.40 frame (key A's frame).
import { W, H } from "../../config.js";
import { Plate } from "../../lib/engrave.js";
import * as ROOM02 from "../s02/room.js";
import { paintHoodie, paintFace, paintHair, paintBeanie, paintEye, EYES, DROPS, drop, paintLaptop, LAPTOP, INKC } from "./designer02.js";
import { smoothPath } from "../../lib/paths.js";

export const OFF_1912 = [-157.5, 120.1];     // s02's camera offset on its last frame (src/shots/s02/cam.js, frame 478)
// pan (19.12–19.60): content offset relative to the 20.40 frame, from camtrack (tx, ty) minus its end value
const PAN = [[19.12, 0, 0], [19.16, 23.0, -16.8], [19.2, 46.8, -35.7], [19.24, 68.3, -52.6], [19.28, 87.0, -68.9], [19.32, 102.3, -80.0],
  [19.36, 129.9, -100.9], [19.4, 137.6, -106.4], [19.44, 145.1, -112.0], [19.48, 149.8, -114.9], [19.52, 154.5, -119.3], [19.56, 156.1, -121.9], [19.6, 155.9, -121.2]];
const tab = (T, t) => {
  if (t <= T[0][0]) return T[0].slice(1);
  for (let i = 1; i < T.length; i++) if (t <= T[i][0]) { const a = T[i - 1], b = T[i], f = (t - a[0]) / (b[0] - a[0]); return a.slice(1).map((v, k) => v + (b[k + 1] - v) * f); }
  return T[T.length - 1].slice(1);
};
// world -> frame offset at time t (continues s02's last offset with the measured pan)
export function worldOff(t) { const [x, y] = tab(PAN, t); return [OFF_1912[0] + x, OFF_1912[1] + y]; }
export const HOLD = worldOff(20.0);           // ≈ (-1.6, -1.1): world + HOLD = the held (20.40) frame
// the source smears the picture along the pan (s02 measured ~4 px at 10 px/frame, ~9 px at 40 px/frame)
export function smearAt(t) {
  const a = worldOff(t - 0.04), b = worldOff(t);
  const d = [b[0] - a[0], b[1] - a[1]], step = Math.hypot(d[0], d[1]);
  return { d, len: step < 0.5 ? 0 : 10 * (1 - Math.exp(-step / 15)) };
}

// ---------- s02's room: the full-res "face" region of its world (x -40..2760, y -620..960), as s02 builds it
let ROOM = null;
export function room02() {
  if (ROOM) return ROOM;
  const x0 = -40, y0 = -620, x1 = 2760, y1 = 960;
  const P = new Plate(x1 - x0, y1 - y0, 1);
  for (const g of [P.v, P.d, P.o]) g.translate(-x0, -y0);
  if (typeof ROOM02.paintWorld === "function") ROOM02.paintWorld(P);
  const c = P.engrave({ spacing: 4.6, seed: 23, contrast: 1.0 });
  ROOM = { c, x0, y0, x1, y1 };
  return ROOM;
}

// ---------- key A: s02's figure (no pencil, no laptop lid: both are drawn per frame), on a canvas with margin M in
// frame coordinates of the held framing. The eyes go on a separate layer (they swing to the lens at 21.28–21.48).
const MOUTH = [[962, 715], [1000, 717], [1050, 718], [1100, 717], [1142, 715], [1138, 734], [1100, 746], [1050, 749], [1000, 746], [966, 736]];
export function paintKeyA02(g) {
  g.lineCap = "round"; g.lineJoin = "round";
  paintHoodie(g);
  paintFace(g);
  // the open mouth round the pencil (s02 covered it with its fixed pencil)
  g.beginPath(); smoothPath(g, MOUTH, true); g.fillStyle = "#141414"; g.fill();
  paintHair(g);
  paintBeanie(g);
  for (const d of DROPS) drop(g, d.x, d.y + (d.slide ? d.slide[2] : 0), d.s);
}
// eyes: look 1 = the narrowed look at the owl (s02 after 8.84 s), 0 = the wide stare at the lens
export function paintEyes02(g, look) {
  g.lineCap = "round"; g.lineJoin = "round";
  for (const E of EYES) paintEye(g, E, { dx: 0, dy: 0, look });
}
export function keyCanvasA(M, paint) {
  const c = document.createElement("canvas"); c.width = W + 2 * M; c.height = H + 2 * M;
  const g = c.getContext("2d");
  g.translate(M + HOLD[0], M + HOLD[1]);
  paint(g);
  return c;
}
// s02's laptop lid, in world coordinates (drawn with the world offset before the arc)
export function drawLid02(g, ox, oy) {
  g.save(); g.translate(ox, oy); g.lineCap = "round"; g.lineJoin = "round"; paintLaptop(g); g.restore();
}
export { LAPTOP, INKC };
export function releaseWorld02() { ROOM = null; }
