// The designer asleep on his folded arms (beanie, headphones round his neck, green jacket), painted once in the
// coordinates of the 125.0 s source frame, then moved per frame by the measured motion field (see s27.js).
// Painting: flat colour regions + tapered ink strokes + the outer keyline, from the measurements in designerData.js,
// plus a soft light pass (window light from the right) and a print grain. Everything is drawn here with canvas paths.
import { DES_REGIONS, DES_INK, DES_SOFT, DES_OUTLINE } from "./designerData.js";
import { canvas } from "./paint.js";
import { rng } from "../../lib/rng.js";

export const DES_BOX = { x0: -40, y0: 60, x1: 1120, y1: 1000 };   // frame@125 coords covered by the layer
export const DES_SC = 1.5;                                       // layer px per frame px

const INK = "#1d1714";
function poly(g, a) { g.moveTo(a[0] / 4, a[1] / 4); for (let i = 2; i < a.length; i += 2) g.lineTo(a[i] / 4, a[i + 1] / 4); g.closePath(); }

// tapered stroke through points with per-point widths (both in frame px)
function inkStroke(g, P, Wd, col = INK) {
  const n = P.length / 2;
  if (n < 2) return;
  // resample densely for a smooth taper
  const pts = [], ws = [];
  for (let i = 0; i < n - 1; i++) {
    const x0 = P[i * 2] / 2, y0 = P[i * 2 + 1] / 2, x1 = P[i * 2 + 2] / 2, y1 = P[i * 2 + 3] / 2;
    const L = Math.hypot(x1 - x0, y1 - y0), k = Math.max(1, Math.ceil(L / 3));
    for (let j = 0; j < k; j++) { const u = j / k; pts.push([x0 + (x1 - x0) * u, y0 + (y1 - y0) * u]); ws.push((Wd[i] + (Wd[i + 1] - Wd[i]) * u) / 2); }
  }
  pts.push([P[(n - 1) * 2] / 2, P[(n - 1) * 2 + 1] / 2]); ws.push(Wd[n - 1] / 2);
  const m = pts.length, Lf = [], Rt = [];
  let total = 0; const acc = [0];
  for (let i = 1; i < m; i++) { total += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); acc.push(total); }
  for (let i = 0; i < m; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(m - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1]; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    // taper the ends over ~8 px
    const e = Math.min(1, acc[i] / 8, (total - acc[i]) / 8);
    const w = Math.max(0.35, Math.min(4.2, ws[i] * 0.92)) * (0.35 + 0.65 * e) / 2;
    Lf.push([pts[i][0] - dy * w, pts[i][1] + dx * w]); Rt.push([pts[i][0] + dy * w, pts[i][1] - dx * w]);
  }
  g.beginPath(); g.moveTo(Lf[0][0], Lf[0][1]);
  for (let i = 1; i < m; i++) g.lineTo(Lf[i][0], Lf[i][1]);
  for (let i = m - 1; i >= 0; i--) g.lineTo(Rt[i][0], Rt[i][1]);
  g.closePath(); g.fillStyle = col; g.fill();
}

export function paintDesigner() {
  const B = DES_BOX, S = DES_SC;
  const c = canvas((B.x1 - B.x0) * S, (B.y1 - B.y0) * S), g = c.getContext("2d");
  g.scale(S, S); g.translate(-B.x0, -B.y0);
  g.lineJoin = "round"; g.lineCap = "round";
  // base: the whole figure in the jacket's mid green, so no seam shows the room through
  g.beginPath(); for (const o of DES_OUTLINE) poly(g, o); g.fillStyle = "#6f7466"; g.fill();
  // colour regions (largest first); each also stroked in its own colour to close the seams between neighbours
  for (const r of DES_REGIONS) {
    g.beginPath(); poly(g, r[1]); for (let k = 2; k < r.length; k++) poly(g, r[k]);
    g.fillStyle = r[0]; g.fill("evenodd");
    g.lineWidth = 1.1; g.strokeStyle = r[0]; g.stroke();
  }
  // soft light: warm window light from the right on the head and arms, cooler shade to the left
  g.save();
  g.beginPath(); for (const o of DES_OUTLINE) poly(g, o); g.clip();
  const gr = g.createLinearGradient(0, 0, 1100, 0);
  gr.addColorStop(0, "rgba(40,50,45,0.10)"); gr.addColorStop(0.55, "rgba(0,0,0,0)"); gr.addColorStop(1, "rgba(255,236,200,0.08)");
  g.fillStyle = gr; g.fillRect(B.x0, B.y0, B.x1 - B.x0, B.y1 - B.y0);
  // print grain (fine seeded speckle, like the source's paper texture)
  const R = rng(271);
  for (let i = 0; i < 26000; i++) {
    const x = B.x0 + R() * (B.x1 - B.x0), y = B.y0 + R() * (B.y1 - B.y0), v = R();
    g.fillStyle = v < 0.5 ? "rgba(30,26,22,0.07)" : "rgba(255,250,240,0.06)";
    g.fillRect(x, y, 1.1, 1.1);
  }
  g.restore();
  // soft brown modelling lines, then the black line art and hair
  for (const r of DES_SOFT) { g.beginPath(); for (let k = 1; k < r.length; k++) poly(g, r[k]); g.fillStyle = r[0]; g.globalAlpha = 0.9; g.fill("evenodd"); }
  g.globalAlpha = 1;
  g.beginPath(); for (const r of DES_INK) for (const p of r) poly(g, p); g.fillStyle = INK; g.fill("evenodd");
  // outer keyline
  g.beginPath(); for (const o of DES_OUTLINE) poly(g, o);
  g.lineWidth = 1.6; g.strokeStyle = INK; g.stroke();
  return c;
}
