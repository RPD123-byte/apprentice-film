// s05: the pose-B forearm (layer armB) where it runs on under the torso. The tracer only saw the sleeve up to the
// torso's edge (the figure is in front); the layer's smooth fill past that edge showed as a flat grey wedge, and its
// copy of the torso's edge line as a doubled contour, whenever the forearm slides left of where it was traced (the
// camera settle, 23.12-23.44, and the pose changes 24.52-24.60 and 25.16-25.40). Frames that show more of the sleeve
// (23.12 mapped back through the forearm's own track) put the sleeve's continuation about 110 px past that edge, its
// lower contour running on at the same slope. So:
//  - strokes lying on the figure's side of that edge are dropped (the torso's edge line belongs to the figure),
//  - the sleeve's continuation is painted past the edge (measured values: 0.72-0.81 pre-grade at pose B's light, soft
//    folds, the lower contour line), fading in across the edge,
//  - the layer's outline keeps only the sleeve: the fill above its top contour (under the owl's foot) and below its
//    lower contour (under the back) is cut away.
// All coordinates are frame px of the pose-B trace (armB's own box: 1160..1680 x 570..830).
import { decodeRings } from "./ink.js";
import { taper } from "../../lib/ink.js";

export const SLEEVE_TOP = [[1330, 638], [1380, 641], [1440, 646], [1480, 649], [1520, 652], [1580, 656], [1700, 661]];
export const SLEEVE_BOT = [[1200, 700], [1220, 711], [1260, 741], [1300, 757], [1340, 769], [1380, 783], [1420, 795], [1460, 803], [1520, 812], [1700, 830]];
const X_KEEP = 1320;        // left of this the traced layer is kept as it is (cuff, hand side)
const X_EXT = 1590;         // how far the continuation runs (the largest slide against the torso is ~105 px)

const grey = (v) => { const c = Math.max(0, Math.min(255, Math.round(v * 255))); return `rgb(${c},${c},${c})`; };
function ringsPath(g, rings, dx, dy) { for (const r of rings) { g.moveTo(r[0][0] + dx, r[0][1] + dy); for (let k = 1; k < r.length; k++) g.lineTo(r[k][0] + dx, r[k][1] + dy); g.closePath(); } }

// the band between the sleeve's two contours from X_KEEP - 40 to x1 (frame px), as a path in box coordinates
function bandPath(g, ox, oy, x1) {
  const xs = [];
  for (let x = X_KEEP - 40; x < x1; x += 10) xs.push(x);
  xs.push(x1);
  xs.forEach((x, i) => (i ? g.lineTo(x - ox, yOn(SLEEVE_TOP, x) - oy) : g.moveTo(x - ox, yOn(SLEEVE_TOP, x) - oy)));
  for (let i = xs.length - 1; i >= 0; i--) g.lineTo(xs[i] - ox, yOn(SLEEVE_BOT, xs[i]) - oy);
  g.closePath();
}
const yOn = (P, x) => { for (let i = 1; i < P.length; i++) if (x <= P[i][0]) { const [x0, y0] = P[i - 1], [x1, y1] = P[i], u = (x - x0) / (x1 - x0); return y0 + (y1 - y0) * u; } return P[P.length - 1][1]; };

// the figure's region (its outline) rasterised in armB's box, grown by `grow` px
function figMask(DB, DF, grow) {
  const [bx0, by0, bx1, by1] = DB.box, [fx0, fy0] = DF.box;
  const m = document.createElement("canvas"); m.width = bx1 - bx0; m.height = by1 - by0;
  const g = m.getContext("2d");
  g.beginPath(); ringsPath(g, decodeRings(DF.alpha), fx0 - bx0, fy0 - by0);
  g.fillStyle = "#fff"; g.fill("evenodd");
  if (grow > 0) { g.lineWidth = 2 * grow; g.strokeStyle = "#fff"; g.lineJoin = "round"; g.stroke(); }
  return m;
}

// keep(st) for buildInkLayer: drop strokes that lie mostly on the figure's side of its edge (grown 3 px)
export function armBKeep(DB, DF) {
  const m = figMask(DB, DF, 3), a = m.getContext("2d").getImageData(0, 0, m.width, m.height).data, w = m.width, h = m.height;
  return (st) => {
    let n = 0;
    for (const [x, y] of st.pts) { const i = Math.round(x), j = Math.round(y); if (i >= 0 && j >= 0 && i < w && j < h && a[(j * w + i) * 4] > 127) n++; }
    return n < st.pts.length * 0.5;
  };
}

// under(g) for buildInkLayer: the sleeve's continuation past the torso's edge (g in armB box coordinates)
export function armBUnder(DB, DF) {
  const [ox, oy] = DB.box;
  return (g) => {
    const w = g.canvas.width, h = g.canvas.height;
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const q = c.getContext("2d");
    q.beginPath(); bandPath(q, ox, oy, X_EXT); q.clip();
    // the sleeve's light, a little darker toward its lower side and toward the elbow
    const gr = q.createLinearGradient(0, 640 - oy, 0, 810 - oy);
    gr.addColorStop(0, grey(0.79)); gr.addColorStop(0.55, grey(0.8)); gr.addColorStop(1, grey(0.7));
    q.fillStyle = gr; q.fillRect(0, 0, w, h);
    // soft folds running down the sleeve (as at 23.12)
    q.filter = "blur(3px)";
    for (const [x, y, rx, ry, rot, v, a] of [[1452, 742, 48, 7, 0.55, 0.5, 0.55], [1402, 694, 34, 5, 0.32, 0.6, 0.45], [1505, 700, 40, 6, 0.4, 0.58, 0.4], [1372, 752, 26, 5, 0.5, 0.6, 0.35]]) {
      q.globalAlpha = a; q.fillStyle = grey(v); q.beginPath(); q.ellipse(x - ox, y - oy, rx, ry, rot, 0, Math.PI * 2); q.fill();
    }
    q.filter = "none"; q.globalAlpha = 1;
    // the lower contour, running on from where the traced one meets the torso
    const pts = [];
    for (let x = 1336; x <= 1560; x += 8) pts.push([x - ox, yOn(SLEEVE_BOT, x) - 1.5 - oy]);
    taper(q, pts, (u) => 3.4 - 1.4 * u, grey(0.08));
    // fade in across the torso's edge: only past it (the figure's region, blurred 2 px)
    const m = figMask(DB, DF, 0), mb = document.createElement("canvas"); mb.width = w; mb.height = h;
    const mq = mb.getContext("2d"); mq.filter = "blur(2px)"; mq.drawImage(m, 0, 0);
    q.globalCompositeOperation = "destination-in"; q.drawImage(mb, 0, 0);
    g.drawImage(c, 0, 0);
  };
}

// the new outline: the traced layer's outline kept left of X_KEEP and inside the sleeve band, plus the band itself out
// to X_EXT (g in box coordinates, destination-in)
export function armBCut(c, DB) {
  const [ox, oy] = DB.box, w = c.width, h = c.height;
  const m = document.createElement("canvas"); m.width = w; m.height = h;
  const g = m.getContext("2d");
  g.beginPath(); ringsPath(g, decodeRings(DB.alpha), 0, 0); g.fillStyle = "#fff"; g.fill("evenodd");
  // keep: left of X_KEEP, or inside the band
  g.globalCompositeOperation = "destination-in";
  g.beginPath(); g.rect(0, 0, X_KEEP - ox, h); bandPath(g, ox, oy, 4000); g.fill("nonzero");
  // add: the band out to X_EXT
  g.globalCompositeOperation = "source-over";
  g.beginPath(); bandPath(g, ox, oy, X_EXT); g.clip();
  g.beginPath(); g.rect(X_KEEP - 40 - ox, 0, X_EXT - X_KEEP + 40, h); g.fill();
  const q = c.getContext("2d");
  q.save(); q.globalCompositeOperation = "destination-in"; q.drawImage(m, 0, 0); q.restore();
  return c;
}

// ---- the desk under the forearm and the owl's foot. The tracer never saw it (the forearm and owl cover it in every
// frame it used); the smooth fill there (about 0.4) showed as flat pale-grey shards whenever the forearm slid away from
// it. The frames that show it (23.12-23.24 mapped back through the desk's settle grid; 24.56) put the desk top's front
// edge on DESK_EDGE: above it the desk top's wood, grain running along the edge (0.2-0.3 pre-grade), below it the
// desk's dark front face (0.06-0.10) down to the sleeve. under(g) for the desk layer paints its hidden part inside
// VIS.desk's box that way.
import { VIS } from "./data/vis.js";
import { rng } from "../../lib/rng.js";
// the desk top's front edge (settled frame px; strongest light-to-dark edge of 23.12-23.28 mapped back)
const DESK_EDGE_P = [[1200, 632], [1420, 638], [1440, 629], [1460, 620], [1480, 610], [1500, 601], [1520, 591], [1540, 582], [1560, 573], [1600, 555], [1760, 480]];
export const DESK_EDGE = (x) => yOn(DESK_EDGE_P, x);
const GRAIN = Math.tan((-17 * Math.PI) / 180);      // the wood grain's slope there (structure tensor, same frames)
export function deskUnder(DD, DO) {
  const [ox, oy] = DD.box, V = VIS.desk, [bx0, by0, bx1, by1] = V.box;
  return (g) => {
    const w = g.canvas.width, h = g.canvas.height;
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const q = c.getContext("2d");
    const edge = (x) => DESK_EDGE(x) - oy;
    const r = rng(9173);
    // the desk top: dark wood (0.2-0.47, mean 0.32), streaked along its grain
    q.save(); q.beginPath(); q.moveTo(bx0 - ox, by0 - oy); q.lineTo(bx1 - ox, by0 - oy);
    for (let x = bx1; x >= bx0; x -= 10) q.lineTo(x - ox, edge(x));
    q.closePath(); q.clip();
    q.fillStyle = grey(0.27); q.fillRect(bx0 - ox, by0 - oy, bx1 - bx0, by1 - by0);
    q.lineCap = "round";
    for (let y = by0 - 200; y < by1 + 60; y += 1.8 + r() * 2.4) {
      const light = r() < 0.5;
      q.strokeStyle = grey(light ? 0.42 + r() * 0.1 : 0.1); q.lineWidth = light ? 0.8 + r() * 0.9 : 0.9 + r() * 1.3; q.globalAlpha = 0.35 + r() * 0.5;
      let x = bx0 - 10 + r() * 40;
      while (x < bx1) {
        const L = 20 + r() * 70;
        q.beginPath(); q.moveTo(x - ox, y + (x - bx0) * GRAIN - oy); q.lineTo(x + L - ox, y + (x + L - bx0) * GRAIN + (r() - 0.5) * 1.2 - oy); q.stroke();
        x += L + 3 + r() * 22;
      }
    }
    q.globalAlpha = 1;
    q.restore();
    // the front face, below the edge: dark, with faint hatching
    q.save(); q.beginPath(); for (let x = bx0; x <= bx1; x += 10) q.lineTo(x - ox, edge(x)); q.lineTo(bx1 - ox, by1 - oy); q.lineTo(bx0 - ox, by1 - oy); q.closePath(); q.clip();
    q.fillStyle = grey(0.06); q.fillRect(bx0 - ox, by0 - oy, bx1 - bx0, by1 - by0);
    q.strokeStyle = grey(0.17);
    for (let d = 3; d < 200; d += 4 + r() * 2) {
      q.lineWidth = 0.6 + r() * 0.5; q.globalAlpha = 0.25 + r() * 0.35;
      let x = bx0 + r() * 30;
      while (x < bx1) { const L = 15 + r() * 50; q.beginPath(); q.moveTo(x - ox, edge(x) + d); q.lineTo(x + L - ox, edge(x + L) + d); q.stroke(); x += L + 6 + r() * 30; }
    }
    q.restore();
    q.globalAlpha = 1;
    // only where the tracer saw nothing (the hidden part of VIS.desk's box), faded in over 2 px
    const m = document.createElement("canvas"); m.width = w; m.height = h;
    const mq = m.getContext("2d");
    mq.fillStyle = "#fff"; mq.beginPath(); mq.rect(bx0 - ox, by0 - oy, bx1 - bx0, by1 - by0); ringsPath(mq, decodeRings(V.rings), bx0 - ox, by0 - oy); mq.fill("evenodd");
    // ... and all of it under the owl: what the settle frames filled in there came back through the wrong motion
    // (the owl's own), and showed at 23.12-23.24 as a sheared piece of desk
    // (and right of x 1440 above the sleeve, where the settle frames' fill carried pieces of the owl's foot)
    mq.fillRect(1440 - ox, by0 - oy, bx1 - 1440, 668 - by0);
    if (DO) { mq.save(); mq.beginPath(); mq.rect(bx0 - ox, by0 - oy, bx1 - bx0, by1 - by0); mq.clip(); mq.beginPath(); ringsPath(mq, decodeRings(DO.alpha), DO.box[0] - ox, DO.box[1] - oy); mq.fill("evenodd"); mq.restore(); }
    const mb = document.createElement("canvas"); mb.width = w; mb.height = h;
    const bq = mb.getContext("2d"); bq.filter = "blur(2px)"; bq.drawImage(m, 0, 0);
    q.globalCompositeOperation = "destination-in"; q.drawImage(mb, 0, 0);
    g.drawImage(c, 0, 0);
  };
}
