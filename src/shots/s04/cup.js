// s04 (fix2): the owl's near headphone cup, 22.16-22.72, where it faces the lens as a disc (the review: 'the headphone
// cups have cracked, cross-hatched grey interiors; the source cup is a smooth grey disc with a dark rim'). Per source
// frame the cushion's outer circle [cx, cy, r] (trace/fix2/cup_track.py: a Hough circle nearest a prediction through
// hand-checked anchors; checked by overlay, snapshots/s04-fix2-cmp/measure/cups_ov.jpg). Past 22.72 the cup turns oblique and half
// behind his hair, and the circle no longer fits (nor at 22.08-22.12, where it is still turned away): not used
// there. Measurements only.
export const CUPS = {"22.16": [2091.2, 402.6, 70.6], "22.20": [2072.4, 406.8, 71.0], "22.24": [2056.4, 415.2, 76.1], "22.28": [2027.0, 422.2, 71.6], "22.32": [2004.6, 425.0, 71.6], "22.36": [1979.6, 429.0, 73.4], "22.40": [1948.4, 435.0, 72.0], "22.44": [1919.6, 438.6, 71.8], "22.48": [1889.4, 445.8, 67.1], "22.52": [1861.0, 448.6, 65.7], "22.56": [1803.6, 444.2, 70.5], "22.60": [1776.2, 449.2, 66.9], "22.64": [1749.8, 451.8, 63.0], "22.68": [1717.4, 437.4, 65.7], "22.72": [1692.2, 438.6, 64.5]};
// the ring between the shell's edge and the cushion's rim, where the traced dashes are dropped (not the top wedge where
// the band's yoke comes in): (x, y) -> true
export function cupRing(t) {
  const c = CUPS[t.toFixed(2)];
  if (!c) return null;
  const [X, Y, R] = c;
  return (x, y) => { const d = Math.hypot(x - X, y - Y); if (d < 0.56 * R || d > 1.06 * R) return false; return Math.abs(Math.atan2(y - Y, x - X) + Math.PI / 2) > 0.45; };
}
// the shell's face inside the cushion: a disc a little under the centre (the band's yoke comes in at its top)
export function cupShell(t) {
  const c = CUPS[t.toFixed(2)];
  if (!c) return null;
  const [x, y, r] = c;
  return { x, y: y + 0.08 * r, r: 0.56 * r };
}
// smooth the traced shell face (its dark cracks are dropped by the caller) and give it a soft highlight at upper left
let SC = null;
export function paintCup(g, M, t) {
  const S = cupShell(t);
  if (!S) return false;
  const x0 = Math.floor(S.x - S.r - 12) + M, y0 = Math.floor(S.y - S.r - 12) + M, w = Math.ceil(2 * S.r + 24), h = w;
  if (!SC) SC = { a: document.createElement("canvas"), m: document.createElement("canvas") };
  const { a, m } = SC; a.width = m.width = w; a.height = m.height = h;
  const ag = a.getContext("2d"), mg = m.getContext("2d");
  ag.filter = "blur(5px)"; ag.drawImage(g.canvas, x0, y0, w, h, 0, 0, w, h); ag.filter = "none";
  // a soft highlight up-left of the middle (the source's lit shell)
  const cx = S.x + M - x0, cy = S.y + M - y0;
  const hg = ag.createRadialGradient(cx - 0.35 * S.r, cy - 0.35 * S.r, 0, cx - 0.35 * S.r, cy - 0.35 * S.r, 0.8 * S.r);
  hg.addColorStop(0, "rgba(255,255,255,0.10)"); hg.addColorStop(1, "rgba(255,255,255,0)"); ag.fillStyle = hg; ag.fillRect(0, 0, w, h);
  // feathered disc mask
  mg.fillStyle = "#fff"; mg.filter = "blur(3px)"; mg.beginPath(); mg.arc(cx, cy, S.r - 3, 0, Math.PI * 2); mg.fill(); mg.filter = "none";
  ag.globalCompositeOperation = "destination-in"; ag.drawImage(m, 0, 0); ag.globalCompositeOperation = "source-over";
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = "source-over"; g.filter = "none"; g.drawImage(a, x0, y0);
  // the cushion's crisp outer rim and the shell's edge as clean rings (the traced ones broke into dashes: dropped by the
  // caller in the ring, except where the band's yoke comes in at the top)
  const [X, Y, R] = CUPS[t.toFixed(2)];
  g.setTransform(1, 0, 0, 1, M + 0.5, M + 0.5);
  g.lineWidth = 3; g.strokeStyle = "rgb(28,28,28)"; g.beginPath(); g.arc(X, Y, R - 2, 0, Math.PI * 2); g.stroke();
  g.lineWidth = 2; g.strokeStyle = "rgb(40,40,40)"; g.beginPath(); g.arc(X, Y + 0.05 * R, 0.66 * R, -Math.PI / 2 + 0.42, 1.5 * Math.PI - 0.42); g.stroke();
  g.restore();
  return true;
}
