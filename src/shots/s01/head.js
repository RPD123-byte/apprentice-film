// s01 head: the knit beanie seen from above and behind, the black spiky hair at the nape, the chair back.
// Plate coordinates (t=0 source frame). Measured on 3x grids of the source (snapshots/s01-fix3-meas/g-head.jpg,
// g-fold.jpg, g-nape.jpg, g-chL.jpg, g-chR.jpg) and per-column scans:
//   contour ellipse (1077,677) 129x157 (dark, ~3 px); crown (1076,617)
//   a white rim ~15 px inside the contour over the top and down the sides to y~700
//   ribs: meridians from the crown (radial at the crown, turning to follow the outline lower down), weight and
//   darkness growing toward the bottom; knit courses crossing them below y~700 (arcs parallel to the fold)
//   fold of the cuff: (958,757) (990,782) (1030,798) (1077,803) (1120,798) (1160,782) (1192,753); cuff below it
//   down to the contour (~833 at the centre), same ribs, darker
//   hair: black from the cuff down to ~868 at the centre, 836 at x 1000, 800 at x 972; spikes pointing out and down
//   chair rail: a curved band, top edge 849 at the ends -> 884 at the centre, ~20 px thick, bright rounded ends
import { DARK, grey, rng, taper, ell, lin, curve, stroke, sampleCurve } from "./kit.js";
import { Plate } from "./engrave.js";

const PI = Math.PI;
export const HEAD = { x: 1077, y: 677, rx: 129, ry: 157 };
export const CROWN = [1077, 617];
const TS = (HEAD.y - CROWN[1]) / HEAD.ry, TC = Math.sqrt(1 - TS * TS);
// an orthographic sphere stretched to the head ellipse, its pole (the crown) tipped toward the camera
function sph(th, ph) {
  const st = Math.sin(th), ct = Math.cos(th), sp = Math.sin(ph), cp = Math.cos(ph);
  return [HEAD.x + HEAD.rx * st * cp, HEAD.y + HEAD.ry * (-TS * ct + TC * st * sp), TC * ct + TS * st * sp];
}
const qOf = (x, y) => Math.hypot((x - HEAD.x) / HEAD.rx, (y - HEAD.y) / HEAD.ry);
// distance (px, approx.) from a point inside the ellipse to the contour
const inset = (x, y) => { const q = qOf(x, y); return (1 - q) * Math.hypot(x - HEAD.x, y - HEAD.y) / Math.max(q, 1e-3); };
// the lit rim's width along the outline: ~15 px over the top and the upper sides, gone by y ~715
const rimW = (y) => (y < 600 ? 20 : y < 640 ? 20 - (y - 600) * 0.15 : y > 715 ? 0 : 14 * (1 - (y - 640) / 75));
const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
// the cuff's fold line
export const foldY = (x) => { const u = (x - 1077) / 115; return 803 - 29.4 * u * u - 12.6 * u * u * u * u; };
// the whole fold: the arc across the back, then running up both sides ~6 px inside the contour to y ~680
const outlineX = (y, side) => HEAD.x + side * HEAD.rx * Math.sqrt(Math.max(0, 1 - ((y - HEAD.y) / HEAD.ry) ** 2));
export const FOLD = (() => {
  const L = [], M = [], R = [];
  for (let y = 680; y <= 752; y += 8) { L.push([outlineX(y, -1) + 6, y]); R.unshift([outlineX(y, 1) - 6, y]); }
  for (let x = 974; x <= 1180.1; x += 6) M.push([x, foldY(x)]);
  return L.concat(M, R);
})();

export function paintHead(P) {
  const o = P.o, v = P.v, { x: cx, y: cy, rx, ry } = HEAD;
  const r = rng(501);
  // ---- value study (fix pass 2b): light knit over the crown; below y ~690 the base is the light of the knit's cells
  // (source cells 90-110 between dark ribs and courses, column/row profiles in snapshots/s01-fix2x-meas), so it
  // stays lighter than the band means and the grid of dark lines brings it down
  P.fill(ell(cx, cy, rx, ry), (g) => {
    const gr = g.createLinearGradient(0, cy - ry, 0, cy + ry);
    for (const [y, val] of [[520, 0.84], [560, 0.73], [600, 0.62], [640, 0.52], [680, 0.48], [720, 0.45], [760, 0.4], [800, 0.37], [834, 0.3]]) gr.addColorStop((y - (cy - ry)) / (2 * ry), grey(val));
    return gr;
  }, 0, { style: 2 });
  // faint mottling only low down (the crown itself is clean in the source)
  for (let i = 0; i < 60; i++) {
    const x = cx + (r() - 0.5) * 1.7 * rx, y = 690 + r() * 130, br = 6 + r() * 12, dark = r() < 0.55, al = dark ? 0.08 + r() * 0.12 : 0.06 + r() * 0.1;
    if (qOf(x, y) > 0.97) continue;
    P.light(ell(x, y, br, br * 0.7, r() * PI), (g) => { const gr = g.createRadialGradient(x, y, 0.5, x, y, br); const c = dark ? "0,0,0" : "255,255,255"; gr.addColorStop(0, `rgba(${c},${al.toFixed(3)})`); gr.addColorStop(1, `rgba(${c},0)`); return gr; });
  }
  // the lit rim (value): an annulus fading out down the sides, its inner edge a little blotchy
  const rimFade = (g, a0) => { const gr = g.createLinearGradient(0, 520, 0, 720); gr.addColorStop(0, `rgba(250,250,247,${a0})`); gr.addColorStop(0.55, `rgba(250,250,247,${0.92 * a0})`); gr.addColorStop(0.8, `rgba(250,250,247,${0.35 * a0})`); gr.addColorStop(1, "rgba(250,250,247,0)"); return gr; };
  P.light((c) => { c.ellipse(cx, cy, rx, ry, 0, 0, PI * 2); c.ellipse(cx, cy + 5, rx - 14, ry - 19, 0, PI * 2, 0, true); }, (g) => rimFade(g, 1));
  P.light((c) => { c.ellipse(cx, cy + 5, rx - 13, ry - 18, 0, 0, PI * 2); c.ellipse(cx, cy + 7, rx - 22, ry - 28, 0, PI * 2, 0, true); }, (g) => rimFade(g, 0.45));
  for (let i = 0; i < 40; i++) {
    const a = -PI + 0.15 + r() * (PI - 0.3), px = cx + Math.cos(a) * (rx - 20), py = cy + 5 + Math.sin(a) * (ry - 26), br = 5 + r() * 9, lite = r() < 0.6;
    P.light(ell(px, py, br, br * 0.7, a), (g) => { const gr = g.createRadialGradient(px, py, 0.5, px, py, br); const c = lite ? "250,250,247" : "0,0,0"; gr.addColorStop(0, `rgba(${c},${lite ? 0.55 : 0.12})`); gr.addColorStop(1, `rgba(${c},0)`); return gr; });
  }

  // ---- the crown (fix pass 2r): a soft mottled grey knot, r ~40 (source rings around (1076,617): 97 / 75 / 89 / 110 at
  // 0-15 / 15-30 / 30-45 / 45-60 px), with a few short tufts; no rib reaches the crown point
  {
    const [kx, ky] = CROWN;
    v.save(); v.filter = "blur(5px)";
    const g = v.createRadialGradient(kx, ky, 2, kx, ky, 44); g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(0.35, "rgba(0,0,0,0.24)"); g.addColorStop(0.7, "rgba(0,0,0,0.2)"); g.addColorStop(1, "rgba(0,0,0,0)");
    v.fillStyle = g; v.beginPath(); v.ellipse(kx, ky, 44, 40, 0, 0, 7); v.fill();
    for (let i = 0; i < 16; i++) { const a = r() * PI * 2, d = r() * 34, x = kx + Math.cos(a) * d, y = ky + Math.sin(a) * d * 0.9, br = 4 + r() * 8, lt = r() < 0.45; v.fillStyle = lt ? `rgba(255,255,255,${(0.08 + r() * 0.1).toFixed(3)})` : `rgba(0,0,0,${(0.1 + r() * 0.14).toFixed(3)})`; v.beginPath(); v.ellipse(x, y, br, br * 0.75, r() * PI, 0, 7); v.fill(); }
    v.restore();
  }
  o.save();
  o.beginPath(); o.ellipse(cx, cy, rx - 1.2, ry - 1.2, 0, 0, PI * 2); o.clip();
  const INKD = "#0a0a0a";
  {
    const [kx, ky] = CROWN;
    for (let i = 0; i < 22; i++) {
      const a = r() * PI * 2, d0 = 6 + r() * 16, L = 6 + r() * 10, x0 = kx + Math.cos(a) * d0, y0 = ky + Math.sin(a) * d0 * 0.9;
      taper(o, [[x0, y0], [x0 + Math.cos(a + 0.3) * L * 0.5, y0 + Math.sin(a + 0.3) * L * 0.45], [x0 + Math.cos(a) * L, y0 + Math.sin(a) * L * 0.9]], (u) => (1.3 + r() * 0.8) * Math.sin(PI * u), `rgba(14,14,14,${(0.45 + r() * 0.35).toFixed(2)})`);
    }
  }
  // ---- upper knit: ~90 bold meridians (1.8-2.5 px) leaving the crown at staggered radii (20-45 px out), broken into
  // long overlapping dashes, fading into the lit rim; none reaches the crown point
  const N = 92;
  for (let i = 0; i < N; i++) {
    const ph0 = -PI + ((i + 0.15 + r() * 0.7) / N) * PI * 2;
    const up = Math.sin(ph0) < -0.35;
    const dStart = 14 + Math.pow(r(), 1.5) * 30;                    // px from the crown (staggered, 14-44)
    const wob = 0.012 + r() * 0.02, wf = 3 + r() * 4, wp = r() * 6;
    const endJ = up ? 0.3 + r() * 0.6 : 0.5 + r() * 0.6;
    const pts = [];
    for (let th = 0.02; th < 2.4; th += 0.01) {
      const ph = ph0 + wob * Math.sin(th * wf + wp), [x, y, z] = sph(th, ph);
      if (z < 0.012 || y > 700 + r() * 60) break;
      if (Math.hypot(x - CROWN[0], (y - CROWN[1]) / 0.9) < dStart) continue;
      if (inset(x, y) < rimW(y) * endJ) break;
      pts.push([x, y]);
    }
    if (pts.length < 4) continue;
    let k = 0;
    while (k < pts.length - 3) {
      const len = Math.round(30 + r() * 50), k1 = Math.min(pts.length - 1, k + len), q = pts.slice(k, k1 + 1);
      const yM = q[q.length >> 1][1], lowK = smooth(600, 720, yM);
      const w = (1.8 + r() * 0.7) * (0.85 + 0.25 * lowK) * (up ? 0.72 : 1) * (0.7 + 0.3 * smooth(560, 620, yM)), al = (0.7 + r() * 0.25) * (0.85 + 0.15 * lowK);
      if (q.length > 2) taper(o, q, (u) => w * (0.3 + 0.7 * Math.pow(Math.sin(PI * u), 0.5)), `rgba(10,10,10,${Math.min(0.96, al).toFixed(2)})`);
      k = k1 + (r() < 0.3 ? 2 + Math.round(r() * 2) : -1);
    }
  }
  // ---- lower knit: bold irregular ribs (1.5-3 px) broken into 8-20 px dashes with 2-3 px gaps, crossed by knit
  // courses whose spacing jitters by +-2 px, from y ~690 down to the fold; darker mottled patches
  for (let i = 0; i < 26; i++) {
    const x = cx + (r() - 0.5) * 1.6 * rx, y = 705 + r() * 95, br = 8 + r() * 14;
    if (qOf(x, y) > 0.95) continue;
    o.fillStyle = `rgba(0,0,0,${(0.08 + r() * 0.12).toFixed(3)})`; o.beginPath(); o.ellipse(x, y, br, br * 0.7, r() * PI, 0, 7); o.fill();
  }
  const NR = 118;
  for (let i = 0; i < NR; i++) {
    const ph0 = -PI + ((i + 0.3 + r() * 0.4) / NR) * PI * 2;
    if (Math.sin(ph0) < 0.05) continue;                      // only the meridians on the near (lower) side
    const pts = [];
    for (let th = 0.2; th < 2.4; th += 0.008) {
      const ph = ph0 + 0.008 * Math.sin(th * 7 + i), [x, y, z] = sph(th, ph);
      if (z < 0.012) break;
      if (y < 698 + r() * 8) continue;
      if (y > foldY(x) - 1.5) break;
      pts.push([x, y]);
    }
    if (pts.length < 4) continue;
    const w = 1.8 + Math.pow(r(), 0.8) * 1.5;
    // dashes: 8-20 px on, 2-3 px off (arc length along the rib)
    let k = 0;
    while (k < pts.length - 2) {
      let d = 0, k1 = k; const on = 16 + r() * 26;
      while (k1 < pts.length - 1 && d < on) { d += Math.hypot(pts[k1 + 1][0] - pts[k1][0], pts[k1 + 1][1] - pts[k1][1]); k1++; }
      const q = pts.slice(k, k1 + 1), ww = w * (0.85 + r() * 0.3), fa = smooth(698, 730, q[0][1]);
      if (q.length > 1) taper(o, q, (u) => ww * Math.min(1, 0.35 + fa * 0.65) * (0.55 + 0.45 * Math.sin(PI * u)), `rgba(10,10,10,${(0.8 + r() * 0.17).toFixed(2)})`);
      let gap = 0, k2 = k1; const off = r() < 0.6 ? 1.6 + r() * 1.4 : 0;
      while (k2 < pts.length - 1 && gap < off) { gap += Math.hypot(pts[k2 + 1][0] - pts[k2][0], pts[k2 + 1][1] - pts[k2][1]); k2++; }
      k = k2;
    }
  }
  let dy = 0;
  for (let k = 1; k <= 13; k++) {
    dy -= 7 + (r() - 0.5) * 4;
    let x = cx - rx + r() * 6;
    while (x < cx + rx) {
      const run = 10 + r() * 34, x1 = Math.min(cx + rx, x + run), pts = [];
      for (let xx = x; xx <= x1 + 0.01; xx += 3) { const y = foldY(xx) + dy + (r() - 0.5) * 0.8; if (qOf(xx, y) < 0.985) pts.push([xx, y]); }
      if (pts.length > 2) {
        const ym = pts[pts.length >> 1][1], fa = smooth(705, 770, ym);
        if (fa > 0.02) { o.globalAlpha = fa * (0.5 + r() * 0.35); const w = 1.0 + r() * 0.7; taper(o, pts, (u) => w * (0.4 + 0.6 * Math.sin(PI * u)), INKD); }
      }
      x = x1 + 3 + r() * 9;
    }
  }
  o.globalAlpha = 1;
  // ---- the cuff below the fold: the same light cells, crossed by vertical ribs ~6 px apart
  for (let x = cx - rx + 3 + r() * 3; x < cx + rx - 3; x += 5.6 + r() * 1.2) {
    const y0 = foldY(x) + 2.5, yb = cy + ry * Math.sqrt(Math.max(0, 1 - ((x - cx) / rx) ** 2));
    if (yb - y0 < 4) continue;
    const lean = (x - cx) * 0.07, pts = [[x, y0], [x + lean * 0.5, (y0 + yb) / 2], [x + lean, yb + 2]];
    taper(o, pts, () => 1.5 + r() * 0.6, `rgba(8,8,8,${(0.8 + r() * 0.15).toFixed(2)})`);
  }
  for (let k = 1; k <= 3; k++) {
    const pts = []; for (let x = cx - rx; x <= cx + rx; x += 4) { const y = foldY(x) + 2.5 + k * 8.5; if (qOf(x, y) < 0.98) pts.push([x, y]); }
    if (pts.length > 3) { o.globalAlpha = 0.5; taper(o, pts, () => 1.1, INKD); o.globalAlpha = 1; }
  }
  // fine dark hairs of the knit crossing the lit rim
  for (let i = 0; i < 70; i++) {
    const a = -PI - 0.35 + r() * (PI + 0.7);
    const px = cx + Math.cos(a) * rx, py = cy + Math.sin(a) * ry;
    if (py > 700) continue;
    const ins = rimW(py) * (0.4 + r() * 0.9) + 2, L = 4 + r() * 10;
    const nx = (px - cx) / rx, ny = (py - cy) / ry, nl = Math.hypot(nx / rx, ny / ry) || 1;
    const ux = -(nx / rx) / nl, uy = -(ny / ry) / nl;
    const p0 = [px + ux * ins, py + uy * ins], p1 = [p0[0] + ux * L + (r() - 0.5) * 2, p0[1] + uy * L];
    taper(o, [p1, [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2], p0], (u) => (0.7 + r() * 0.7) * Math.sin(PI * u), `rgba(20,20,20,${(0.45 + r() * 0.4).toFixed(2)})`);
  }
  // ---- the fold of the cuff: a dark crease (source: ~4 px at 802-805), running up both sides inside the contour
  curve(o, FOLD, 3.2, "rgba(4,4,4,0.97)", 523, { ends: 0.3 });
  curve(o, FOLD.map(([x, y]) => [x, y - 2.6]), 1.1, "rgba(150,150,146,0.3)", 522, { ends: 0.3 });
  o.restore();
  // contour: thinner, with a faint light line just inside it low down (the source's double contour)
  o.save(); o.strokeStyle = DARK; o.lineWidth = 2.5; o.beginPath(); o.ellipse(cx, cy, rx, ry, 0, 0, PI * 2); o.stroke();
  o.strokeStyle = "rgba(190,190,186,0.45)"; o.lineWidth = 1; o.beginPath(); o.ellipse(cx, cy, rx - 3, ry - 3, 0, 0.25, PI - 0.25); o.stroke();
  o.restore();
}

// ---------- hair: a black spiky mass hugging the lower head, behind the beanie ----------
const HAIR = [[958, 738], [964, 768], [971, 796], [983, 818], [1000, 838], [1018, 853], [1040, 862], [1060, 867], [1077, 868],
  [1095, 867], [1116, 862], [1138, 853], [1155, 838], [1170, 818], [1181, 796], [1189, 768], [1196, 738]];
export function paintHair(P) {
  const o = P.o, r = rng(601);
  // the hood's rim round the nape, and the back's fabric radiating out from it (i-back.jpg)
  o.save();
  o.beginPath(); o.rect(860, 700, 440, 200); o.ellipse(HEAD.x, HEAD.y, HEAD.rx + 1, HEAD.ry + 1, 0, 0, PI * 2); o.clip("evenodd");
  curve(o, [[955, 752], [957, 790], [966, 838], [988, 864]], 2.2, DARK, 640, { ends: 0.3 });
  curve(o, [[1199, 752], [1196, 790], [1190, 834], [1168, 862]], 2.2, DARK, 641, { ends: 0.3 });
  for (let i = 0; i < 70; i++) {
    const side = i % 2 ? 1 : -1, a = PI / 2 - side * (0.55 + r() * 0.75);
    const r0 = 150 + r() * 25, L = 20 + r() * 38, cx = 1077, cy = 745;
    const x0 = cx + Math.cos(a) * r0 * 0.95, y0 = cy + Math.sin(a) * r0 * 0.62, x1 = x0 + Math.cos(a) * L, y1 = y0 + Math.sin(a) * L * 0.7;
    if (y0 > 880 || Math.abs(x0 - cx) < 95) continue;
    const g = Math.round(120 + r() * 60);
    o.globalAlpha = 0.3 + r() * 0.35;
    stroke(o, [[x0, y0], [(x0 + x1) / 2 + (r() - 0.5) * 4, (y0 + y1) / 2], [x1, y1]], 1.6 + r() * 2.2, `rgb(${g},${g},${g - 2})`, 650 + i, 0.4);
  }
  // the shirt's lower back, folds hanging down to the chair rail
  const railY = (x) => { const q = sampleCurve(RAIL_TOP, 4); for (let i = 1; i < q.length; i++) if (x <= q[i][0]) return q[i - 1][1] + (q[i][1] - q[i - 1][1]) * (x - q[i - 1][0]) / (q[i][0] - q[i - 1][0]); return 850; };
  for (let i = 0; i < 80; i++) {
    const x = 880 + r() * 410, y1 = railY(x) - 2, L = 14 + r() * 40, y0 = y1 - L, lean = (x - 1077) * 0.12 * (0.5 + r());
    const g = Math.round(125 + r() * 65);
    o.globalAlpha = 0.28 + r() * 0.35;
    stroke(o, [[x - lean * 0.3, y0], [x + (r() - 0.5) * 3, (y0 + y1) / 2], [x + lean * 0.2, y1]], 1.6 + r() * 2.4, `rgb(${g},${g},${g - 2})`, 720 + i, 0.6);
  }
  o.globalAlpha = 1;
  o.restore();
  o.save();
  o.beginPath(); o.rect(900, 690, 360, 240); o.ellipse(HEAD.x, HEAD.y, HEAD.rx - 1, HEAD.ry - 1, 0, 0, PI * 2); o.clip("evenodd");
  const q = sampleCurve(HAIR, 6);
  o.fillStyle = "#040404";
  o.beginPath(); o.moveTo(q[0][0] + 2, 700); for (const p of q) o.lineTo(p[0], p[1]); o.lineTo(q[q.length - 1][0] - 2, 700); o.closePath(); o.fill();
  // spikes along the edge, pointing out from the head and down
  for (let i = 0; i < 64; i++) {
    const t = (i + r() * 0.9) / 64, k = Math.min(q.length - 2, Math.floor(t * (q.length - 1)));
    const [x, y] = q[k];
    let dx = x - HEAD.x, dy = (y - 690) * 1.6; const d = Math.hypot(dx, dy); dx /= d; dy /= d;
    const a = Math.atan2(dy, dx) + (r() - 0.5) * 0.5, side = Math.abs(x - HEAD.x) / 120;
    const L = (10 + r() * 24) * (0.75 + 0.55 * side), w = 5 + r() * 6;
    const b = a + (r() - 0.5) * 0.35;
    const x0 = x - Math.cos(a) * 5, y0 = y - Math.sin(a) * 5;
    const p1 = [x0 + Math.cos(a) * L * 0.55 + (r() - 0.5) * 2, y0 + Math.sin(a) * L * 0.55], p2 = [x0 + Math.cos(b) * L, y0 + Math.sin(b) * L];
    taper(o, [[x0, y0], p1, p2], (u) => w * Math.pow(1 - u, 0.9), "#040404");
  }
  // a few fine lit strands in the mass
  for (let i = 0; i < 12; i++) {
    const x = 990 + r() * 175, y = HEAD.y + HEAD.ry * Math.sqrt(Math.max(0, 1 - ((x - HEAD.x) / HEAD.rx) ** 2)) + 4 + r() * 12;
    const a = Math.atan2((y - 690) * 1.6, x - HEAD.x) + (r() - 0.5) * 0.4, L = 10 + r() * 16;
    o.globalAlpha = 0.18 + r() * 0.2;
    taper(o, [[x, y], [x + Math.cos(a) * L * 0.5, y + Math.sin(a) * L * 0.5], [x + Math.cos(a) * L, y + Math.sin(a) * L]], (u) => 1.1 * Math.sin(PI * u), "#bdbdb8");
  }
  o.restore();
}

// ---------- chair: the back rail seen from above, curved toward us; mesh slats below ----------
export const RAIL_TOP = [[812, 850], [840, 846], [862, 850], [882, 856], [940, 868], [1000, 876], [1077, 880], [1150, 878], [1200, 872], [1260, 862], [1300, 853], [1340, 845], [1368, 845]];
// fix pass 2r: the rail's lower edge re-measured per column (source bottom 882 / 897 / 908 / 903 / 897 / 889 / 873 at
// x 900 / 960 / 1077 / 1140 / 1200 / 1260 / 1320): 2-6 px lower than before, most at the centre
export const RAIL_BOT = [[815, 872], [840, 871], [862, 875], [882, 881], [940, 894], [1000, 903], [1077, 910], [1150, 905], [1200, 898], [1260, 890], [1300, 879], [1340, 869], [1366, 869]];
// the chair's black back, below the rail (its sides slope in toward the bottom)
export const CHAIR = [[806, 846], [1374, 841], [1370, 870], [1356, 910], [1336, 946], [838, 946], [822, 914], [812, 874]];
export function paintChair(P) {
  const o = P.o;
  const band = (A, B) => (c) => { const a = sampleCurve(A, 6), b = sampleCurve(B, 6).reverse(); c.moveTo(a[0][0], a[0][1]); for (const p of a.slice(1)) c.lineTo(p[0], p[1]); for (const p of b) c.lineTo(p[0], p[1]); c.closePath(); };
  // back (fix pass 2r): black, with vertical slats every ~14 px (value ~0.12) fanning out a little toward the bottom and
  // dark gaps between them (the diamond lattice is gone)
  const backPath = (c) => { c.moveTo(815, 868); for (const p of sampleCurve(RAIL_BOT, 6)) c.lineTo(p[0], p[1] - 2); c.lineTo(1370, 866); c.lineTo(1356, 910); c.lineTo(1336, 946); c.lineTo(838, 946); c.lineTo(822, 914); c.closePath(); };
  P.fill(backPath, 0.025, PI / 2, { style: 2 });
  const r = rng(901);
  P.v.save(); P.v.beginPath(); backPath(P.v); P.v.clip(); P.v.lineCap = "butt";
  for (let x = 826 + r() * 4; x < 1364; x += 13 + r() * 2.5) {
    const lean = (x - 1090) * 0.12, w = 5 + r() * 2.5, val = 0.1 + r() * 0.07;
    P.v.strokeStyle = grey(val); P.v.lineWidth = w; P.v.beginPath(); P.v.moveTo(x, 866); P.v.lineTo(x + lean, 950); P.v.stroke();
  }
  P.v.restore();
  P.d.save(); P.d.beginPath(); backPath(P.d); P.d.fillStyle = Plate.dirColor(PI / 2 + 0.03, 0.3, 0, 0.8); P.d.fill(); P.d.restore();
  // the rail: light grey, brightest at its rounded ends, a darker lower face; dark contour on top
  // a dark rail (source 105 over 830-1360 x 845-870) lit only along its upper edge; bright rounded ends
  P.fill(band(RAIL_TOP, RAIL_BOT), lin(812, 0, 1370, 0, [[0, 0.62], [0.05, 0.45], [0.12, 0.38], [0.5, 0.35], [0.88, 0.38], [0.95, 0.45], [1, 0.62]]), -0.02, { style: 2 });
  P.light(band(RAIL_TOP.map(([x, y], i) => [x, y + (RAIL_BOT[i][1] - y) * 0.6]), RAIL_BOT), () => "rgba(0,0,0,0.18)");
  curve(o, RAIL_TOP.map(([x, y]) => [x, y + 2.6]), 1.8, "rgba(240,238,232,0.55)", 912, { ends: 0.3 });
  // the rail's lower face: a dark crease under the rounded top, then a second thin highlight ~12 px below the first
  curve(o, RAIL_TOP.map(([x, y], i) => [x, y + (RAIL_BOT[i][1] - y) * 0.4]), 1.5, "rgba(10,10,10,0.55)", 914, { ends: 0.3 });
  curve(o, RAIL_TOP.map(([x, y], i) => [x, y + (RAIL_BOT[i][1] - y) * 0.66]), 1.3, "rgba(236,234,228,0.42)", 915, { ends: 0.3 });
  curve(o, RAIL_TOP, 2.2, DARK, 911, { ends: 0.3 });
  curve(o, RAIL_BOT, 1.8, DARK, 913, { ends: 0.3 });
  // rounded ends: bright caps
  for (const [x, y, a] of [[826, 859, 0.25], [1356, 856, -0.25]]) {
    P.fill(ell(x, y, 11, 12, a), 0.6, 0, { style: 2 });
    o.save(); o.strokeStyle = DARK; o.lineWidth = 1.8; o.beginPath();
    if (x < 1000) o.ellipse(x, y, 11, 12, a, PI * 0.5, PI * 1.55); else o.ellipse(x, y, 11, 12, a, -PI * 0.55, PI * 0.5);
    o.stroke(); o.restore();
  }
}
