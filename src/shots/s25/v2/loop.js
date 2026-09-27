// s25 v2 — the big slash loop (102.16–102.80), fix pass 1. The source draws one static white slash loop across the
// frame, drawn on from its right tip (102.16–102.20), whole 102.24–102.64, then erased from the same end
// (102.68–102.80). Measured on the source frames 2554–2570 (column / row scans of the thick bright stroke, which is
// identical to the pixel on every frame it is visible — the loop does not move):
//   A  the top arc: right tip (2033, 420) → over the top (y 79 at x 1220) → the left end (166, 435) → on down the left
//      side to a tapered end at (222, 578); ~17 px wide at the top, 13 near the ends
//   B  the lower arc (drawn on from its left end 102.24–102.32): from under the left end (178, 440) down-right through (600, 695), the lowest point (1290, 800), up
//      to a tapered tip at (1835, 712); ~11–12 px wide
// Fix pass 2: the top arc's left part moved left (−38 px over y 260–320, fading to 0 by y 405 and y 180) and the
// lower arc's start moved up-right (~20 px) to the source's strokes at 102.40 (grid crops).
// Frame px (the chaos layer). Coordinates only.
import { sampleCurve } from "../../../lib/paths.js";

const A_PTS = [[2033, 420], [2028, 380], [2020, 340], [1980, 283], [1940, 247], [1900, 220], [1860, 198], [1820, 180], [1780, 163],
  [1740, 150], [1700, 137], [1660, 127], [1620, 118], [1580, 110], [1540, 103], [1500, 97], [1460, 92], [1420, 88], [1380, 85],
  [1340, 82], [1300, 81], [1260, 80], [1220, 79], [1180, 80], [1140, 80], [1100, 82], [1060, 84], [1020, 88], [980, 91], [940, 96],
  [900, 100], [860, 106], [820, 113], [780, 121], [740, 128], [700, 137], [660, 147], [620, 158], [580, 169], [532, 183], [488, 196],
  [443, 211], [395, 227], [348, 246], [302, 267], [262, 290], [222, 315], [197, 340], [182, 363], [174, 385], [170, 405],
  [166, 425], [166, 445], [167, 462], [170, 480], [175, 500], [181, 520], [192, 543], [207, 562], [222, 578]];
const B_PTS = [[196, 428], [210, 448], [236, 476], [272, 508], [318, 545], [362, 582], [396, 608], [420, 625], [450, 642],
  [500, 662], [550, 680], [600, 695], [660, 714], [720, 730], [780, 743], [840, 756], [900, 767], [960, 776], [1020, 784],
  [1080, 790], [1140, 795], [1200, 799], [1260, 800], [1320, 800], [1380, 799], [1440, 796], [1500, 791], [1560, 784],
  [1620, 775], [1680, 763], [1740, 747], [1800, 728], [1835, 712]];

let CURVES = null;
function curves() {
  if (CURVES) return CURVES;
  const mk = (pts) => {
    const q = sampleCurve(pts, 6), s = [0];
    for (let i = 1; i < q.length; i++) s.push(s[i - 1] + Math.hypot(q[i][0] - q[i - 1][0], q[i][1] - q[i - 1][1]));
    return { q, s, L: s[s.length - 1] };
  };
  CURVES = { A: mk(A_PTS), B: mk(B_PTS) };
  return CURVES;
}
// arc length of the curve point nearest x (on the top half for A when top, else anywhere)
function sAtX(C, x, pred = () => true) {
  let best = 0, bd = 1e9;
  for (let i = 0; i < C.q.length; i++) if (pred(C.q[i])) { const d = Math.abs(C.q[i][0] - x); if (d < bd) { bd = d; best = C.s[i]; } }
  return best;
}
// width profiles along the full stroke (s = arc length from the start)
const WA = (s, L) => { const wMid = 15, t0 = Math.min(1, s / 80), t1 = Math.min(1, (L - s) / 150); const endW = s > L * 0.8 ? 13 - 3 * ((s / L - 0.8) / 0.2) : wMid - 4 * Math.max(0, s / L - 0.6) / 0.2; return Math.max(1.5, Math.min(wMid, endW) * (0.2 + 0.8 * Math.sqrt(t0)) * (0.15 + 0.85 * Math.sqrt(t1))); };
const WB = (s, L) => { const t0 = Math.min(1, s / 70), t1 = Math.min(1, (L - s) / 110); return Math.max(1.2, 10.5 * (0.3 + 0.7 * Math.sqrt(t0)) * (0.15 + 0.85 * Math.sqrt(t1))); };

// stroke the visible window [s0, s1] of curve C with width profile wf; cut ends taper over 18 px
function strokeWindow(g, C, wf, s0, s1, v) {
  s0 = Math.max(0, s0); s1 = Math.min(C.L, s1);
  if (s1 - s0 < 4) return;
  const pts = [], ws = [];
  for (let i = 0; i < C.q.length; i++) {
    const s = C.s[i];
    if (s < s0 || s > s1) continue;
    const cut = Math.min(1, (s - s0 + 2) / 18, (s1 - s + 2) / 18);
    pts.push(C.q[i]); ws.push(wf(s, C.L) * (s0 > 0 || s1 < C.L ? Math.max(0.25, Math.min(1, cut * 1.2)) : 1));
  }
  if (pts.length < 2) return;
  const col = Math.round(255 * Math.min(1, v));
  for (const [kw, al] of [[1.5, 0.12], [1.0, 0.97]]) {
    const L = [], R = [], n = pts.length;
    for (let i = 0; i < n; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
      let dx = b[0] - a[0], dy = b[1] - a[1]; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
      const hw = (ws[i] * kw) / 2;
      L.push([pts[i][0] - dy * hw, pts[i][1] + dx * hw]); R.push([pts[i][0] + dy * hw, pts[i][1] - dx * hw]);
    }
    g.beginPath(); g.moveTo(L[0][0], L[0][1]);
    for (let i = 1; i < n; i++) g.lineTo(L[i][0], L[i][1]);
    for (let i = n - 1; i >= 0; i--) g.lineTo(R[i][0], R[i][1]);
    g.closePath();
    g.globalAlpha = al; g.fillStyle = `rgb(${col},${col},${col - 2})`; g.fill();
  }
  g.globalAlpha = 1;
}

// the visible windows per source frame: [[curve, s0, s1], …] (s in px of arc length; null = to the end)
function windows(f) {
  const C = curves(), A = C.A, B = C.B, top = (p) => p[1] < 300;
  if (f === 2554) return [[A, 0, sAtX(A, 1140, top)]];
  if (f === 2555) return [[A, 0, sAtX(A, 166, (p) => p[1] > 400 && p[1] < 440)]];
  // the lower arc draws on from its left end over 102.24–102.32 (thick to x ≈ 960 at 102.24, ≈ 1530 at 102.28)
  if (f === 2556) return [[A, 0, A.L], [B, 0, sAtX(B, 960)]];
  if (f === 2557) return [[A, 0, A.L], [B, 0, sAtX(B, 1530)]];
  if (f >= 2558 && f <= 2566) return [[A, 0, A.L], [B, 0, B.L]];
  if (f === 2567) return [[A, sAtX(A, 1380, top), A.L], [B, 0, B.L]];
  if (f === 2568) return [[B, sAtX(B, 840), B.L]];
  if (f === 2569 || f === 2570) return [[B, sAtX(B, 1290), B.L]];
  return [];
}
export const LOOP_F0 = 2554, LOOP_F1 = 2570;
export function drawLoop(g, f, v = 0.95) {
  const w = windows(f);
  if (!w.length) return;
  g.save();
  for (const [C, s0, s1] of w) strokeWindow(g, C, C === curves().A ? WA : WB, s0, s1, v);
  g.restore();
}
export function releaseLoop() { CURVES = null; }
