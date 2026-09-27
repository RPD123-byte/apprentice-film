// s04 (fix2): the owl's plaster as an authored shape on the keys 22.20-23.08 (s04/plasterdata.js: the model measured
// on 23.04 and its measured placement per source frame). Two crossed rounded strips (the near-horizontal one on top,
// as in the source), a light grey a little under the head's white (paint ~220 against ~244), a soft grey outline (1.5 px, ~92), a gauze pad on the
// top strip at the crossing and two rows of perforation dots on each arm. Drawn into the key canvas, and only where
// the key's drawing is lit (the owl's white head): the headband and the cup it turns behind stay in front of it.
import { PLASTER_STRIPS, PLASTER_A } from "./plasterdata.js";

const grey = (v) => { const c = Math.max(0, Math.min(255, Math.round(v))); return `rgb(${c},${c},${c})`; };
function stripPath(g, s) {
  const r = s.w / 2, a = Math.max(0, s.L / 2 - r), th = (s.a * Math.PI) / 180;
  g.save(); g.translate(s.c[0], s.c[1]); g.rotate(th);
  g.beginPath(); g.moveTo(-a, -r); g.lineTo(a, -r); g.arc(a, 0, r, -Math.PI / 2, Math.PI / 2); g.lineTo(-a, r);
  g.arc(-a, 0, r, Math.PI / 2, (3 * Math.PI) / 2); g.closePath(); g.restore();
}
// the strip outline as a polygon (model coords)
function stripPoly(s, grow = 0, n = 24) {
  const r = s.w / 2 + grow, a = Math.max(0, s.L / 2 - s.w / 2), th = (s.a * Math.PI) / 180, ux = Math.cos(th), uy = Math.sin(th);
  const P = [];
  for (let k = 0; k <= n; k++) { const t = -Math.PI / 2 + (Math.PI * k) / n; P.push([s.c[0] + ux * (a + r * Math.cos(t)) - uy * r * Math.sin(t), s.c[1] + uy * (a + r * Math.cos(t)) + ux * r * Math.sin(t)]); }
  for (let k = 0; k <= n; k++) { const t = Math.PI / 2 + (Math.PI * k) / n; P.push([s.c[0] + ux * (-a + r * Math.cos(t)) - uy * r * Math.sin(t), s.c[1] + uy * (-a + r * Math.cos(t)) + ux * r * Math.sin(t)]); }
  return P;
}
export const plasterAt = (t) => PLASTER_A[t.toFixed(2)] || null;
// the strips' outlines at key time t in frame coords, grown by `grow` px (to drop the traced lines there)
export function plasterPolys(t, grow = 4) {
  const A = plasterAt(t);
  if (!A) return null;
  const [a, b, tx, c, d, ty] = A;
  return PLASTER_STRIPS.map((s) => stripPoly(s, grow).map(([x, y]) => [a * x + b * y + tx, c * x + d * y + ty]));
}
function strip(g, s, face, top) {
  stripPath(g, s); g.fillStyle = grey(face - 24); g.fill();
  const th = (s.a * Math.PI) / 180;
  g.save(); g.translate(s.c[0], s.c[1]); g.rotate(th);
  if (top) {   // the gauze pad at the crossing
    g.fillStyle = grey(face - 36); g.beginPath(); g.roundRect(-s.L * 0.16, -s.w * 0.3, s.L * 0.32, s.w * 0.6, 2); g.fill();
    g.strokeStyle = grey(160); g.lineWidth = 0.8; g.stroke();
  }
  g.fillStyle = grey(185);   // perforation dots: two rows along each arm (faint in the source)
  for (const side of [-1, 1]) for (let i = 0; i < 3; i++) for (const row of [-1, 1]) {
    const x = side * (s.L * 0.25 + i * s.L * 0.07), y = row * s.w * 0.2;
    g.beginPath(); g.arc(x, y, 0.7, 0, Math.PI * 2); g.fill();
  }
  g.restore();
  stripPath(g, s); g.lineWidth = 1.5; g.strokeStyle = grey(92); g.stroke();
}
let SCR = null;
// the head's ellipse round the plaster (frame px, from the top strip's centre): measured on 22.60 and 23.04
const HEAD_R = { dx: 25, dy: 10, rx: 120, ry: 105 };
// paint the plaster for key time t into key canvas context g (margin M); face = the head's white (paint)
export function paintPlaster(g, M, t, face = 244) {
  const A = plasterAt(t);
  if (!A) return false;
  const polys = plasterPolys(t, 3);
  const xs = polys.flat().map((p) => p[0]), ys = polys.flat().map((p) => p[1]);
  const x0 = Math.floor(Math.min(...xs)) + M - 6, y0 = Math.floor(Math.min(...ys)) + M - 6;
  const w = Math.ceil(Math.max(...xs)) + M + 6 - x0, h = Math.ceil(Math.max(...ys)) + M + 6 - y0;
  if (!SCR) SCR = { a: document.createElement("canvas"), b: document.createElement("canvas") };
  const { a, b } = SCR;
  a.width = b.width = w; a.height = b.height = h;   // (exact size each time: fresh state, order-independent)
  const ag = a.getContext("2d"), bg = b.getContext("2d", { willReadFrequently: true });
  ag.setTransform(1, 0, 0, 1, 0, 0); ag.globalAlpha = 1; ag.globalCompositeOperation = "source-over"; ag.filter = "none"; ag.clearRect(0, 0, a.width, a.height);
  ag.setTransform(A[0], A[3], A[1], A[4], A[2] + M + 0.5 - x0, A[5] + M + 0.5 - y0);
  strip(ag, PLASTER_STRIPS[1], face, false);
  strip(ag, PLASTER_STRIPS[0], face, true);
  ag.setTransform(1, 0, 0, 1, 0, 0);
  // where the key's drawing is lit (the owl's white head; its blurred value over ~170): not over the headband or cup
  bg.setTransform(1, 0, 0, 1, 0, 0); bg.globalCompositeOperation = "source-over"; bg.clearRect(0, 0, b.width, b.height);
  bg.filter = "blur(7px)"; bg.drawImage(g.canvas, x0, y0, w, h, 0, 0, w, h); bg.filter = "none";   // (wide: the traced lines on the head must not cut it)
  const id = bg.getImageData(0, 0, w, h), dd = id.data;
  for (let q = 0; q < dd.length; q += 4) { const u = Math.max(0, Math.min(1, (dd[q] - 135) / 40)); dd[q + 3] = Math.round(255 * u * u * (3 - 2 * u)); }
  bg.putImageData(id, 0, 0);
  ag.globalCompositeOperation = "destination-in"; ag.drawImage(b, 0, 0, w, h, 0, 0, w, h); ag.globalCompositeOperation = "source-over";
  // the owl's white head round the plaster (review: 'mottled with pale grey blotches'; the source's head is an even
  // tone there, with grain): inside an ellipse round the plaster, where the drawing is lit, the study's patches are
  // evened out to their local mean (so its measured tone is kept: lifting them to ~215 made the head 12 levels too
  // bright); dark lines, the band and the cup (unlit) are left as they are
  { const R = HEAD_R, cx = A[0] * PLASTER_STRIPS[0].c[0] + A[1] * PLASTER_STRIPS[0].c[1] + A[2] + M - x0 + R.dx, cy = A[3] * PLASTER_STRIPS[0].c[0] + A[4] * PLASTER_STRIPS[0].c[1] + A[5] + M - y0 + R.dy;
    const X0 = Math.max(0, Math.floor(x0 + cx - R.rx)), Y0 = Math.max(0, Math.floor(y0 + cy - R.ry));
    const X1 = Math.min(g.canvas.width, Math.ceil(x0 + cx + R.rx)), Y1 = Math.min(g.canvas.height, Math.ceil(y0 + cy + R.ry));
    if (X1 > X0 && Y1 > Y0) {
      const lb = SCR.l || (SCR.l = document.createElement("canvas")); lb.width = X1 - X0; lb.height = Y1 - Y0;
      const lg = lb.getContext("2d", { willReadFrequently: true });
      lg.setTransform(1, 0, 0, 1, 0, 0); lg.clearRect(0, 0, lb.width, lb.height); lg.filter = "blur(7px)"; lg.drawImage(g.canvas, X0, Y0, X1 - X0, Y1 - Y0, 0, 0, X1 - X0, Y1 - Y0); lg.filter = "none";
      const L = lg.getImageData(0, 0, X1 - X0, Y1 - Y0).data;
      lg.clearRect(0, 0, lb.width, lb.height); lg.filter = "blur(10px)"; lg.drawImage(g.canvas, X0, Y0, X1 - X0, Y1 - Y0, 0, 0, X1 - X0, Y1 - Y0); lg.filter = "none";
      // (the key canvas itself is never read back with getImageData: its region is copied to a CPU scratch canvas, worked
      // there and drawn back -- a direct getImageData/putImageData round trip on the key canvas gave slightly different
      // pixels depending on which frames had been drawn before)
      const L2 = lg.getImageData(0, 0, X1 - X0, Y1 - Y0).data;
      const ub = SCR.u || (SCR.u = document.createElement("canvas")); ub.width = X1 - X0; ub.height = Y1 - Y0;
      const gg = ub.getContext("2d", { willReadFrequently: true }); gg.drawImage(g.canvas, X0, Y0, X1 - X0, Y1 - Y0, 0, 0, X1 - X0, Y1 - Y0);
      const id2 = gg.getImageData(0, 0, X1 - X0, Y1 - Y0), D = id2.data;
      for (let yy = 0, q = 0; yy < Y1 - Y0; yy++) for (let xx = 0; xx < X1 - X0; xx++, q += 4) {
        const ex = (X0 + xx - x0 - cx) / R.rx, ey = (Y0 + yy - y0 - cy) / R.ry, e = 1 - (ex * ex + ey * ey); if (e <= 0) continue;
        const lit = Math.max(0, Math.min(1, (L[q] - 150) / 30)), v = D[q];
        if (v < 150) continue;
        // evened out to its local mean (a 10 px blur): the patches go, the head's measured tone stays
        const k = Math.min(1, e * 4) * lit * Math.min(1, (v - 150) / 20), nv = v + (L2[q] - v) * k;
        D[q] = D[q + 1] = D[q + 2] = nv;
      }
      gg.putImageData(id2, 0, 0);
      g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = "source-over"; g.filter = "none"; g.drawImage(ub, X0, Y0); g.restore();
    } }
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = "source-over"; g.filter = "none";
  g.filter = "blur(0.5px)"; g.drawImage(a, 0, 0, w, h, x0, y0, w, h); g.restore();   // (soft, as the source draws it)
  return true;
}
