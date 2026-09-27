// s07 laptop hinge and deck rim (fix pass 1, this run). The traced plate and the hands' traced layer drew the band
// between the screen's bottom edge and the keyboard as a ragged strip - white scratch fragments, dark specks, a spurious
// dark line 2 px under the deck's edge, and a torn patch at the right corner (x 850-940). It is repainted here as
// clean geometry, measured on the source (column profiles of the 727-763 mean, sub-pixel threshold crossings; the band
// is static: its per-pixel std over the shot is grain only, ~5-9 levels, and no finger enters it):
//  - the screen glass's bottom lip: one continuous ribbon along the quad's bottom edge, its centre 7 px below the
//    edge at the left, converging to the edge at the right, 6 px wide at the left thinning to 2 px, bright on the left
//    and fading to the right (peak 235-250 levels at x < 640, 223 at 740, 177 at 780, 150 at 820);
//  - the black bezel / hinge band under it (from the lip down: between the quad's edge and the lip the source's
//    screen picture continues, and the plate's traced edge is kept there);
//  - the deck's lit top strip: bright (240-248 levels), from the hinge's bottom edge e1 (a straight line, slope
//    -0.2906, with the left hinge end's small step at x 476-490 and the right hinge end's notch at x 873-886) down to
//  - the keyboard well's top line (a dark 1.6 px line 8.9 -> 7.7 px under e1) and its bright bevel (2.3 px under it).
// Drawn after the hands, as one canvas softened like the screen (0.6 px), with its outer edges feathered into the plate.
import { ctx2d } from "./tracekit.js";

const TINT = [1.014, 1.0, 0.985];
const col = (v, a = 1) => `rgba(${(v * 255 * TINT[0]).toFixed(1)},${(v * 255 * TINT[1]).toFixed(1)},${(v * 255 * TINT[2]).toFixed(1)},${a})`;
// the screen quad's bottom edge BL (409, 648) -> BR (898, 519)
const q = (x) => 648 + ((519 - 648) * (x - 409)) / (898 - 409);
// the hinge's bottom edge (the deck's top edge), measured crossings at 125 levels
const e1M = (x) => 667.5 - 0.2906 * (x - 508);
const E1_LEFT = [[409, 686.5], [412, 685.5], [424, 680.9], [436, 677.3], [448, 673.7], [460, 670.4], [466, 668.8], [470, 667.6], [476, 666.2], [478, 666.6],
  [480, 667.8], [482, 669.0], [484, 669.9], [486, 670.6], [488, 671.9], [490, 672.2]];
const lin = (P, x) => { if (x <= P[0][0]) return P[0][1]; for (let i = 1; i < P.length; i++) if (x <= P[i][0]) { const [a, va] = P[i - 1], [b, vb] = P[i]; return va + ((vb - va) * (x - a)) / (b - a); } return P[P.length - 1][1]; };
const e1 = (x) => (x <= 490 ? lin(E1_LEFT, x) + 0.5 : e1M(x));
// right hinge end: the deck's edge beyond the hinge (with the notch: a thin lit edge over a dark wedge at x 873-886),
// flat from x 915 to 937, then under a dark diagonal (the box behind) running down to the right
const yTop = (x) => 548.0 - 0.27 * (x - 887);
const diag = (x) => 539.8 + 0.33 * (x - 937);
const deckTop = (x) => (x <= 873 ? e1(x) : x <= 915 ? yTop(x) : x <= 937 ? 540.1 : diag(x) + 1.2);
// the keyboard well's top line, under e1, to its top-right corner at x 930 (then its right side runs down-right)
const well = (x) => e1M(x) + 8.75 - 0.0028 * (x - 520);
const wellR = (x) => 553.5 + 0.4 * (x - 930);
// the lip: [x, centre below the quad edge, FWHM, peak value (pre-grade)]. (All measured positions here are pixel
// indices + 0.5: a pixel's value sits at its centre in canvas coordinates.)
const LIP = [[409, 7.7, 6.0, 0.93], [416, 7.5, 6.0, 0.95], [480, 6.2, 5.6, 1.0], [540, 5.4, 5.0, 1.0], [600, 4.5, 4.0, 1.0], [640, 3.9, 3.4, 0.95],
  [700, 3.1, 3.0, 0.93], [740, 2.7, 2.6, 0.86], [780, 2.0, 2.3, 0.72], [820, 1.6, 2.1, 0.6], [840, 1.3, 2.0, 0.44], [860, 1.0, 2.0, 0.32],
  [870, 0.8, 2.0, 0.34], [880, 0.6, 2.0, 0.3], [892, 0.3, 2.0, 0.18], [896, 0.2, 2.0, 0.5], [898, 0.1, 2.2, 0.8]];
const lipAt = (x) => { const P = LIP; let i = 1; while (i < P.length - 1 && P[i][0] < x) i++; const a = P[i - 1], b = P[i], u = Math.max(0, Math.min(1, (x - a[0]) / (b[0] - a[0]))); return a.map((v, k) => v + (b[k] - v) * u); };

const X0 = 400, Y0 = 505, X1 = 952, Y1 = 705, DW = X1 - X0, DH = Y1 - Y0;
const DARK = 0.014, STRIP = 0.95, STRIP_L = 0.8, STRIP_R = 0.84, STRIP_R2 = 0.88, WELL = 0.3, BEVEL = 0.92;
let deck = null;
function build() {
  const c = document.createElement("canvas"); c.width = DW; c.height = DH;
  const g = ctx2d(c);
  g.translate(-X0, -Y0);
  const path = (pts) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); };
  const xs = (a, b, s = 1) => { const r = []; for (let x = a; x <= b + 1e-6; x += s) r.push(x); return r; };
  // 1. the deck's lit strip (under everything else), down to the well line + bevel (left of the well: 10 px, feathered)
  const XR = 946;
  const bottom = (x) => (x < 470 ? e1(x) + 10 : x <= 930 ? well(x) + 3.8 : wellR(x) + 3.4);
  path([...xs(409, XR).map((x) => [x, deckTop(x) - 1]), ...xs(409, XR).reverse().map((x) => [x, bottom(x) + 2])]);
  const sg = g.createLinearGradient(409, 0, XR, 0), at = (x) => (x - 409) / (XR - 409);
  sg.addColorStop(0, col(STRIP_L)); sg.addColorStop(at(476), col(STRIP_L)); sg.addColorStop(at(496), col(STRIP));
  sg.addColorStop(at(870), col(STRIP)); sg.addColorStop(at(890), col(STRIP_R)); sg.addColorStop(at(920), col(STRIP_R)); sg.addColorStop(1, col(STRIP_R2));
  g.fillStyle = sg; g.fill();
  // 2. the keyboard well's top line (to its corner at x 930, then down its right side) and its bevel
  g.lineCap = "round"; g.lineJoin = "round";
  const wl = [...xs(470, 926, 4).map((x) => [x, well(x)]), [930, 553.7], [934, 554.9], ...xs(938, XR, 4).map((x) => [x, wellR(x)])];
  g.beginPath(); wl.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.lineWidth = 1.6; g.strokeStyle = col(WELL); g.stroke();
  g.beginPath(); xs(472, 926, 4).forEach((x, i) => (i ? g.lineTo(x, well(x) + 2.5) : g.moveTo(x, well(x) + 2.5)));
  g.lineWidth = 1.8; g.strokeStyle = col(BEVEL); g.stroke();
  // the dark diagonal over the deck's far right corner
  g.beginPath(); g.moveTo(935, diag(935)); g.lineTo(XR + 2, diag(XR + 2)); g.lineWidth = 2; g.strokeStyle = col(0.1); g.stroke();
  // 3. the bezel / hinge band: from the quad's bottom edge down to e1 (left of the notch) or the deck edge (right)
  path([...xs(409, 898).map((x) => { const [, d, w] = lipAt(x); return [x, q(x) + d - w / 2 + 0.3]; }), [920, 527], [920, deckTop(920)],
    ...xs(874, 919).reverse().map((x) => [x, deckTop(x)]), ...xs(409, 873).reverse().map((x) => [x, e1(x)])]);
  g.fillStyle = col(DARK); g.fill();
  // the right notch: the thin lit edge over a dark wedge closing at x 885.6
  path([[873.5, 552.5], [876, 551.0], [886, 548.3], [886, 557.8], [876, 553.7]]); g.fillStyle = col(0.82); g.fill();
  path([[873, 553.5], [885.65, 557.78], [873, 561.4]]); g.fillStyle = col(DARK); g.fill();
  // 4. the lip: one ribbon, width and value along x
  const top = [], bot = [];
  for (const x of xs(409, 898, 2)) { const [, d, w] = lipAt(x), y = q(x) + d; top.push([x, y - w / 2]); bot.push([x, y + w / 2]); }
  path([...top, ...bot.reverse()]);
  const lg = g.createLinearGradient(409, 0, 898, 0);
  for (const [x, , , v] of LIP) lg.addColorStop((x - 409) / 489, col(v));
  g.fillStyle = lg; g.fill();
  // soften like the screen (0.6 px) and feather the outer edges (left end, right end, bottom) into the plate
  const S = document.createElement("canvas"); S.width = DW; S.height = DH;
  const s = ctx2d(S);
  s.filter = "blur(0.6px)"; s.drawImage(c, 0, 0); s.filter = "none";
  const M = document.createElement("canvas"); M.width = DW; M.height = DH;
  const m = ctx2d(M); m.translate(-X0, -Y0);
  m.beginPath();
  [...xs(412, 898).map((x) => { const [, d, w] = lipAt(x); return [x, q(x) + d - w / 2 - 0.4]; }), [920, 526], ...xs(921, XR).map((x) => [x, deckTop(x) - 1.5]),
    ...xs(470, XR).reverse().map((x) => [x, bottom(x) - 0.6])].forEach(([x, y], i) => (i ? m.lineTo(x, y) : m.moveTo(x, y)));
  m.lineTo(470, e1(470) + 2); m.lineTo(412, e1(412) + 2);
  m.closePath(); m.fillStyle = "#fff"; m.filter = "blur(0.8px)"; m.fill();
  // left of the well the strip's lower edge fades out over ~8 px (the plate's deck continues below)
  m.globalCompositeOperation = "lighten"; m.filter = "blur(3px)";
  m.beginPath(); [...xs(412, 474).map((x) => [x, e1(x)]), ...xs(412, 474).reverse().map((x) => [x, e1(x) + 8])].forEach(([x, y], i) => (i ? m.lineTo(x, y) : m.moveTo(x, y)));
  m.closePath(); m.fill(); m.filter = "none"; m.globalCompositeOperation = "source-over";
  // the right end fades out over 938-946
  m.setTransform(1, 0, 0, 1, 0, 0);
  { const fr = m.createLinearGradient(938 - X0, 0, XR - X0, 0); fr.addColorStop(0, "rgba(0,0,0,0)"); fr.addColorStop(1, "rgba(0,0,0,1)");
    m.globalCompositeOperation = "destination-out"; m.fillStyle = fr; m.fillRect(938 - X0, 0, DW, DH); m.globalCompositeOperation = "source-over"; }
  // the left end fades in over 412-424 (the lid's side bezel stays the plate's)
  m.setTransform(1, 0, 0, 1, 0, 0);
  const fl = m.createLinearGradient(412 - X0, 0, 424 - X0, 0); fl.addColorStop(0, "rgba(0,0,0,1)"); fl.addColorStop(1, "rgba(0,0,0,0)");
  m.globalCompositeOperation = "destination-out"; m.fillStyle = fl; m.fillRect(0, 0, 424 - X0, DH); m.globalCompositeOperation = "source-over";
  s.globalCompositeOperation = "destination-in"; s.drawImage(M, 0, 0); s.globalCompositeOperation = "source-over";
  deck = S;
}
export function deckAt() { if (!deck) build(); return { canvas: deck, x: X0, y: Y0 }; }
export function releaseDeck() { deck = null; }
