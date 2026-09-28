// s16 room: the designer at his desk seen straight on (the steady framing of 46.08–47.48), with the laptop, mug,
// books and cables. Drawn as an engraving plate (src/lib/engrave.js):
//   - value study: outlines of the light measured on the source blurred at sigma 5 (./data/room.js LEVELS), painted
//     as soft grey regions; the engraver cuts white lines whose width follows that value
//   - hatch direction per region (DIRS), measured as the source's dominant stroke direction; classes set the line
//     spacing and style (hair sparser, the laptop lid flat)
//   - the drawing's major ink lines on top (DARK on lit areas, PALE on dark ones): centre-lines measured on the
//     source with the s12 method and redrawn as tapered strokes
// Plus authored details that must be crisp (laptop logo dot, lid rim). His irises are drawn per frame (./eyes.js).
// Coordinates are frame px of the steady framing; the plate reaches M px past every edge (camera jolt, pull-back).
import { W, H } from "../../config.js";
import { grey } from "../../lib/engrave.js";
import { engraveCanvases, rasterRegions, dirRGB } from "./engrave16.js";
import { taper } from "../../lib/ink.js";
import { sampleCurve, smoothPath } from "../../lib/paths.js";
import { rng } from "../../lib/rng.js";
import { LEVELS, DIRS, DARK, PALE } from "./data/room.js";

export const M = 90;
// class -> engraving spacing scale (0..1 -> 0.55x..1.9x of the base spacing) and style (0 lines, 1 cross, 2 flat, 3 knit)
export const CLASSES = {
  0: { sp: 0.35, style: 0, k: 0.6 },   // default
  1: { sp: 0.62, style: 0, k: 0.35 },  // hair: sparse, faint strands (its bright strands are traced)
  2: { sp: 0.62, style: 0, k: 0.15 },  // beanie (its rib lines are traced; the cut lines only a faint knit)
  3: { sp: 0.35, style: 2, k: 1 },     // flat (laptop lid)
  4: { sp: 0.15, style: 0, k: 0.3 },   // skin: fine, faint lines (~3.3 px)
  5: { sp: 0.4, style: 0, k: 0.7 },    // desk grain
  6: { sp: 0.35, style: 0, k: 0.6 },   // shirt
  7: { sp: 0.35, style: 2, k: 1 },     // clean (the whites of his eyes)
  8: { sp: 0.18, style: 0, k: 0.75 },  // the mug's fine vertical hatching
  9: { sp: 0.2, style: 5, k: 1 },      // the mug's speckled shadow side
};
export const ENGRAVE = { spacing: 4.4, seed: 16, contrast: 1.0, ink: 1.06 };
export const TUNE = { blur: 1.2, soft: 0.6, darkW: 1.0, paleW: 1.0, darkDv: 0.0, paleDv: 0.0 };

function ringsPath(g, item, from) {
  g.beginPath();
  for (let k = from; k < item.length; k++) {
    const r = item[k];
    g.moveTo(r[0], r[1]);
    for (let i = 2; i < r.length; i += 2) g.lineTo(r[i], r[i + 1]);
    g.closePath();
  }
}

function blurCanvas(c, s) {
  if (s <= 0) return;
  const t = document.createElement("canvas"); t.width = c.width; t.height = c.height;
  const tg = t.getContext("2d");
  tg.filter = `blur(${s}px)`; tg.drawImage(c, 0, 0); tg.filter = "none";
  const g = c.getContext("2d");
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, c.width, c.height); g.drawImage(t, 0, 0); g.restore();
}

// One stroke in one tone (its darkest value for dark ink, brightest for pale); the width at each point is scaled so
// the ink mass matches the measurement, which tapers the paler ends; short end tapers.
export function drawStrokes(g, S, pale = false, { wk = 1, dv = 0, end = 4, wMin = 0.6 } = {}) {
  for (const s of S) {
    const n = s.length / 4;
    if (n < 2) continue;
    const pts = [], w = [], v = [];
    for (let i = 0; i < s.length; i += 4) { pts.push([s[i], s[i + 1]]); w.push(s[i + 2]); v.push(s[i + 3]); }
    let ve = pale ? 0 : 1;
    for (const x of v) ve = pale ? Math.max(ve, x) : Math.min(ve, x);
    ve = Math.max(0, Math.min(1, ve + dv));
    const wm = w.map((x, i) => pale ? x * v[i] / Math.max(0.05, ve) : x * (1 - v[i]) / Math.max(0.05, 1 - ve));
    const per = 4, q = sampleCurve(pts, per);
    const L = [0];
    for (let i = 1; i < q.length; i++) L.push(L[i - 1] + Math.hypot(q[i][0] - q[i - 1][0], q[i][1] - q[i - 1][1]));
    const len = L[L.length - 1];
    const wAt = (i) => { const f = i / per, a = Math.min(n - 1, Math.floor(f)), b = Math.min(n - 1, a + 1), t = f - a; return wm[a] + (wm[b] - wm[a]) * t; };
    g.globalCompositeOperation = pale ? "lighten" : "darken";   // ink lines only ever darken / lighten
    taper(g, q, (u) => {
      const i = Math.round(u * (q.length - 1)), d = L[i];
      const e = Math.min(1, d / end, (len - d) / end);
      return Math.max(wMin, wAt(i) * wk) * (0.35 + 0.65 * Math.sqrt(Math.max(0, e)));
    }, grey(ve));
  }
  g.globalCompositeOperation = "source-over";
}

// the value study (value canvas) and the hatch directions (dir canvas, rasterised without anti-aliasing) of the
// room; both canvases have their origin at frame (-M, -M)
export function paintRoomMaps(valC, dirC) {
  const v = valC.getContext("2d");
  v.save(); v.setTransform(1, 0, 0, 1, M, M);
  for (const it of LEVELS) { ringsPath(v, it, 1); v.fillStyle = grey(it[0] / 1000); v.fill("evenodd"); }
  v.restore();
  const regions = DIRS.map((it) => {
    const c = CLASSES[it[1]] || CLASSES[0];
    return { rings: it.slice(2), rgb: dirRGB((it[0] * Math.PI) / 12, c.sp, c.style, c.k) };
  });
  dirC.getContext("2d").putImageData(rasterRegions(dirC.width, dirC.height, regions, M, M), 0, 0);
}

// crisp authored details on top of the engraving (measured on 8x grids of 47.00): the lid's logo dot, the sweat
// drops (a grey U with its tail), the stubble on his chin and jaw (seeded short flecks)
const DROPS = [[1352.6, 136, 124], [1455.6, 139, 124], [1444, 262.4, 252], [1309, 314.8, 298], [1517, 310.5, 294], [1507, 359, 347]];
const STUBBLE = [[1318, 400], [1340, 402], [1362, 425], [1400, 440], [1440, 441], [1478, 425], [1500, 402], [1520, 398],
  [1512, 425], [1490, 452], [1445, 468], [1395, 467], [1350, 448], [1325, 425]];
function paintDetails(g) {
  g.fillStyle = "#f4f2ec";
  g.beginPath(); g.ellipse(1245, 765, 23.5, 24, 0, 0, Math.PI * 2); g.fill();
  g.save();
  g.lineCap = "round"; g.lineJoin = "round";
  for (const [x, yb, yt] of DROPS) {
    const h = yb - yt, hw = 2.7;
    g.strokeStyle = grey(0.42); g.lineWidth = 1.25;
    g.beginPath();
    g.moveTo(x + 0.3, yt);
    g.bezierCurveTo(x - 0.5, yt + h * 0.45, x - hw, yb - 4.5, x - hw, yb - 2.2);
    g.bezierCurveTo(x - hw, yb + 0.6, x + hw, yb + 0.6, x + hw, yb - 2.2);
    g.bezierCurveTo(x + hw, yb - 4.5, x + 1.2, yt + h * 0.45, x + 0.3, yt);
    g.stroke();
    g.fillStyle = "rgba(252,252,248,0.9)"; g.beginPath(); g.ellipse(x - 0.8, yb - 3.2, 0.9, 1.4, 0, 0, Math.PI * 2); g.fill();
  }
  // the mug's handles (measured on an 8x grid of 46.12): the near one a thick white loop, the far one a thin grey loop
  g.lineCap = "round";
  const loop = (pts, w, v) => { g.strokeStyle = grey(v); g.lineWidth = w; g.beginPath(); smoothPath(g, pts, false); g.stroke(); };
  loop([[873, 754], [895, 754], [906, 762], [910, 778], [910, 800], [906, 818], [896, 830], [874, 833]], 7, 0.93);
  loop([[732, 748], [712, 752], [700, 765], [695, 785], [698, 805], [710, 822], [731, 832]], 3, 0.42);
  // stubble: short flecks, denser toward the jaw's lower edge
  g.beginPath(); g.moveTo(STUBBLE[0][0], STUBBLE[0][1]); for (const p of STUBBLE) g.lineTo(p[0], p[1]); g.closePath(); g.clip();
  const r = rng(1616);
  for (let i = 0; i < 900; i++) {
    const x = 1318 + r() * 202, y = 398 + r() * 72;
    const low = Math.max(0, Math.min(1, (y - 405) / 50));
    if (r() > 0.25 + 0.75 * low) continue;
    const a = Math.PI / 2 + (r() - 0.5) * 1.2, l = 1.2 + r() * 2.2;
    g.strokeStyle = grey(0.28 + 0.3 * r()); g.lineWidth = 0.7 + 0.5 * r();
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
  g.restore();
}

let ROOM = null;
export function roomCanvas() {
  if (ROOM) return ROOM;
  const mk = (fill) => { const c = document.createElement("canvas"); c.width = W + 2 * M; c.height = H + 2 * M; const g = c.getContext("2d"); g.fillStyle = fill; g.fillRect(0, 0, c.width, c.height); return c; };
  const valC = mk("#000"), dirC = mk("rgb(0,128,0)");
  paintRoomMaps(valC, dirC);
  blurCanvas(valC, TUNE.blur);
  // measurement hook for the lab harness (snapshots/s16-fix1-tools): view the value / direction maps; never set in the film
  const view = (globalThis.__S16 || {}).view;
  if (view === "val") return (ROOM = valC);
  if (view === "dir") return (ROOM = dirC);
  const cut = engraveCanvases(valC, dirC, ENGRAVE);
  if (view === "cut") return (ROOM = cut);
  const g = cut.getContext("2d");
  g.save(); g.translate(M, M);
  drawStrokes(g, DARK, false, { wk: TUNE.darkW, dv: TUNE.darkDv });
  drawStrokes(g, PALE, true, { wk: TUNE.paleW, dv: TUNE.paleDv });
  paintDetails(g);
  g.restore();
  // the source's print is soft: a slight blur of the finished plate
  if (view !== "sharp") blurCanvas(cut, TUNE.soft);
  ROOM = cut;
  return cut;
}
export function releaseRoom() { ROOM = null; }
