// The dark room behind him (static): left, a lit post with grain streaks, a dotted mesh column, hanging cables and a
// lit shelf plank; right, a lit upright, a lit board, stacked gear with dotted grilles and slats. Measured at 27.0 s.
import { taper } from "../../lib/ink.js";
import { sampleCurve } from "../../lib/paths.js";
import { rng, noise2 } from "../../lib/rng.js";
import { line, gv } from "./kit.js";

// A grid of small lit dots (speaker grilles, mesh panels). v: base brightness 0..1, var: noise amount.
function mesh(g, x0, y0, x1, y1, { pitch = 9, r = 1.6, v = 0.35, vary = 0.6, seed = 1, cols = null, fade = null } = {}) {
  const rr = rng(seed);
  for (let y = y0 + pitch / 2; y < y1; y += pitch) {
    for (let x = x0 + pitch / 2; x < x1; x += pitch) {
      let b = v * (1 - vary + vary * (0.5 + 0.5 * noise2(x * 0.02, y * 0.03, seed)));
      if (cols) b *= 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(x * cols));
      if (fade) b *= fade(x, y);
      b *= 0.75 + 0.5 * rr();
      if (b < 0.03) continue;
      const q = r * (0.8 + 0.4 * rr()) * (0.7 + 0.6 * Math.min(1, b / v));
      g.fillStyle = gv(b); g.fillRect(x - q, y - q, 2 * q, 2 * q);
    }
  }
}
// Grain streaks along a direction inside a rectangle (lit wood / metal).
function streaks(g, x0, y0, x1, y1, { vert = true, n = 30, v = 0.4, w = 1.6, seed = 2, alpha = 0.9, gap = 0.2 } = {}) {
  const r = rng(seed);
  g.save(); g.beginPath(); g.rect(x0, y0, x1 - x0, y1 - y0); g.clip();
  for (let i = 0; i < n; i++) {
    const f = r();
    const b = v * (0.4 + 0.8 * r());
    const segs = 1 + Math.floor(r() * 3);
    for (let s = 0; s < segs; s++) {
      if (r() < gap) continue;
      const a0 = r(), a1 = Math.min(1, a0 + 0.2 + r() * 0.8);
      const pts = vert
        ? [[x0 + f * (x1 - x0), y0 + a0 * (y1 - y0)], [x0 + f * (x1 - x0) + (r() - 0.5) * 3, y0 + (a0 + a1) / 2 * (y1 - y0)], [x0 + f * (x1 - x0) + (r() - 0.5) * 3, y0 + a1 * (y1 - y0)]]
        : [[x0 + a0 * (x1 - x0), y0 + f * (y1 - y0)], [x0 + (a0 + a1) / 2 * (x1 - x0), y0 + f * (y1 - y0) + (r() - 0.5) * 3], [x0 + a1 * (x1 - x0), y0 + f * (y1 - y0) + (r() - 0.5) * 2]];
      const ww = w * (0.5 + r());
      g.globalAlpha = alpha;
      taper(g, sampleCurve(pts, 5), (u) => ww * Math.pow(Math.sin(Math.PI * u), 0.4), gv(b));
    }
  }
  g.globalAlpha = 1;
  g.restore();
}
// A braided cable: a dotted bright line along a curve.
function cable(g, pts, { w = 3, v = 0.45, dash = 5, seed = 3 } = {}) {
  const r = rng(seed);
  const s = sampleCurve(pts, 20);
  let acc = 0;
  for (let i = 1; i < s.length; i++) {
    const d = Math.hypot(s[i][0] - s[i - 1][0], s[i][1] - s[i - 1][1]);
    acc += d;
    if (acc >= dash) {
      acc = 0;
      g.fillStyle = gv(v * (0.6 + 0.6 * r()));
      g.beginPath(); g.ellipse(s[i][0], s[i][1], w * 0.55, w * 0.4, Math.atan2(s[i][1] - s[i - 1][1], s[i][0] - s[i - 1][0]) + 0.6, 0, 7); g.fill();
    }
  }
}

export function drawRoom(g) {
  g.fillStyle = "#000"; g.fillRect(0, 0, 2206, 946);
  // ---------- left
  // tall post at the frame edge (0-90): black wood carried by sparse, scratchy lit grain lines 6-10 px apart,
  // brightest in the upper half
  g.fillStyle = gv(0.04); g.beginPath(); g.moveTo(0, 96); g.lineTo(92, 112); g.lineTo(92, 946); g.lineTo(0, 946); g.closePath(); g.fill();
  {
    const r = rng(21);
    for (let x = 3; x < 92; x += 4 + r() * 4) {
      let y = 104 + r() * 30;
      while (y < 900) {
        const L = 40 + r() * 170, up = Math.max(0, 1 - (y - 120) / 620);
        const v = (0.3 + 0.55 * r()) * (0.4 + 0.6 * up);
        if (r() < 0.78) {
          const xx = x + (r() - 0.5) * 2;
          taper(g, sampleCurve([[xx, y], [xx + (r() - 0.5) * 2.5, y + L * 0.5], [xx + (r() - 0.5) * 3, y + L]], 5), (u) => (0.8 + 1.1 * r()) * Math.pow(Math.sin(Math.PI * u), 0.5), gv(v));
        }
        y += L + 6 + r() * 40;
      }
    }
  }
  // dark foliage in front of the post with lit leaf rims
  for (const [pts, seed] of [[[[96, 292], [128, 270], [160, 258], [184, 262], [158, 282], [124, 296]], 1], [[[92, 338], [126, 318], [168, 304], [192, 310], [160, 330], [120, 342]], 2], [[[108, 386], [140, 364], [176, 352], [196, 360], [168, 378], [132, 390]], 3], [[[126, 422], [152, 404], [184, 396], [200, 404], [176, 418], [146, 426]], 4]]) {
    g.fillStyle = "#030303"; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (const q of pts) g.lineTo(q[0], q[1]); g.closePath(); g.fill();
    line(g, pts.slice(0, 4), 1.6, gv(0.55), { a: 0.1 });
    line(g, [pts[0], [(pts[0][0] + pts[3][0]) / 2, (pts[0][1] + pts[3][1]) / 2 + 2], pts[3]], 1.0, gv(0.3), { a: 0.1 });
  }
  // mesh column behind
  mesh(g, 88, 0, 150, 330, { pitch: 8, r: 1.5, v: 0.28, seed: 23, fade: (x, y) => 1 - y / 360 });
  mesh(g, 150, 380, 180, 760, { pitch: 8, r: 1.4, v: 0.3, seed: 24 });
  mesh(g, 232, 400, 300, 640, { pitch: 7, r: 1.6, v: 0.34, seed: 32, cols: 0.9 });
  // two thin lit uprights
  line(g, [[192, 0], [190, 260], [194, 520]], 2, gv(0.38), { a: 0.6 });
  line(g, [[208, 0], [210, 300], [207, 540]], 1.5, gv(0.28), { a: 0.6 });
  // cables
  line(g, [[278, 0], [266, 110], [242, 210], [204, 300], [162, 380], [122, 430]], 3.2, gv(0.42), { a: 0.7 });
  line(g, [[284, 0], [272, 110], [248, 212], [210, 302], [168, 382], [128, 432]], 1.2, gv(0.7), { a: 0.5 });
  cable(g, [[500, 18], [470, 130], [410, 200], [340, 250], [260, 300], [185, 358], [128, 432]], { w: 3.6, v: 0.55, dash: 6, seed: 26 });
  cable(g, [[418, 0], [424, 120], [432, 200], [442, 260], [437, 350]], { w: 3, v: 0.4, dash: 7, seed: 27 });
  cable(g, [[108, 272], [140, 290], [168, 308], [185, 330]], { w: 2.4, v: 0.4, dash: 4, seed: 28 });
  // lit shelf plank and the dotted box under it
  g.fillStyle = gv(0.12); g.fillRect(232, 356, 330, 44);
  streaks(g, 232, 358, 560, 400, { vert: false, n: 26, v: 0.6, w: 2, seed: 29, gap: 0.15 });
  mesh(g, 232, 400, 350, 620, { pitch: 8, r: 1.5, v: 0.3, seed: 30, fade: (x, y) => Math.max(0, 1 - (y - 400) / 260) });
  mesh(g, 350, 405, 540, 520, { pitch: 9, r: 1.2, v: 0.12, seed: 31 });
  // ---------- top middle / right (behind the owl): dotted mesh panel
  mesh(g, 1480, 10, 1810, 260, { pitch: 8, r: 1.8, v: 0.5, vary: 0.8, seed: 41, cols: 0.7, fade: (x, y) => (x < 1500 ? 0.5 : 1) * (x > 1688 && x < 1722 ? 0.15 : 1) * (y > 200 ? 0.35 : 1) * (0.55 + 0.45 * (0.5 + 0.5 * Math.sin(x * 0.045))) });
  g.fillStyle = "rgba(0,0,0,0.85)"; g.fillRect(1586, 0, 12, 260); g.fillRect(1690, 0, 30, 260);
  g.fillStyle = gv(0.1); g.fillRect(1480, 204, 330, 10);
  streaks(g, 1480, 205, 1810, 213, { vert: false, n: 5, v: 0.35, w: 1.2, seed: 53 });
  mesh(g, 1480, 260, 1540, 460, { pitch: 9, r: 1.4, v: 0.14, seed: 42 });
  // the upright (post) right of the owl
  g.fillStyle = gv(0.14); g.fillRect(1852, 0, 54, 946);
  streaks(g, 1852, 0, 1906, 946, { n: 34, v: 0.6, w: 2.0, seed: 43, gap: 0.3 });
  g.fillStyle = "rgba(0,0,0,0.6)"; g.fillRect(1884, 0, 8, 946);
  // the upright falls into shadow below the board line (dark by ~520)
  const pf = g.createLinearGradient(0, 330, 0, 540); pf.addColorStop(0, "rgba(0,0,0,0)"); pf.addColorStop(1, "rgba(0,0,0,0.92)");
  g.fillStyle = pf; g.fillRect(1850, 330, 58, 616);
  // the lit board
  g.fillStyle = gv(0.16); g.fillRect(1906, 240, 300, 50);
  streaks(g, 1906, 242, 2206, 288, { vert: false, n: 36, v: 0.7, w: 2.0, seed: 44 });
  // gear, top right
  mesh(g, 1960, 0, 2206, 236, { pitch: 7.5, r: 1.9, v: 0.5, seed: 45, cols: 0.5 });
  g.fillStyle = "#000"; g.fillRect(2146, 0, 10, 200);
  // stacked gear on the right: a lit plank at 400-455, a dotted grille with slats, lit planks at 700-760
  g.fillStyle = gv(0.08); g.fillRect(1906, 402, 300, 52);
  streaks(g, 1906, 404, 2206, 452, { vert: false, n: 34, v: 0.62, w: 1.8, seed: 46, gap: 0.2 });
  mesh(g, 1912, 458, 2206, 700, { pitch: 7.5, r: 2.5, v: 0.62, vary: 0.6, seed: 47, cols: 0.35 });
  for (const y of [552, 618, 652]) { g.fillStyle = "rgba(0,0,0,0.8)"; g.fillRect(1906, y, 300, 5); streaks(g, 1906, y + 5, 2206, y + 9, { vert: false, n: 4, v: 0.4, w: 1.2, seed: 60 + y }); }
  g.strokeStyle = gv(0.4); g.lineWidth = 2; g.beginPath(); g.arc(1985, 480, 10, 0, 7); g.stroke();
  for (const [y0, y1, v] of [[700, 742, 0.5], [750, 768, 0.4]]) {
    g.fillStyle = gv(0.06); g.fillRect(1918, y0, 288, y1 - y0);
    streaks(g, 1918, y0, 2206, y1, { vert: false, n: 16, v, w: 1.8, seed: 46 + y0 });
  }
  mesh(g, 2040, 800, 2206, 946, { pitch: 8, r: 1.5, v: 0.26, seed: 49, cols: 0.4 });
  streaks(g, 2040, 800, 2206, 946, { n: 10, v: 0.3, w: 2, seed: 50 });
}
