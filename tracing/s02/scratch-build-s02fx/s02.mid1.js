// colour of the source's grade (G-(R+B)/2 and R-B measured per frame): a faint green lift in everything but pure black,
// rising through the pan and on the cartons, cut at 15.88 to a slight warm (red in the mids). [t, green add, red add]
// in 1/255 before the global grade
function tab(T, t) {
  if (t <= T[0][0]) return T[0][1];
  for (let i = 1; i < T.length; i++) if (t <= T[i][0] + 1e-6) { const a = T[i - 1], b = T[i]; return a[1] + (b[1] - a[1]) * (t - a[0]) / (b[0] - a[0]); }
  return T[T.length - 1][1];
}
// the snap, read frame by frame: 218 still the stare; 219 an in-between (the stare's iris swung ~20 px right, dark and
// smeared); 220 the look with its irises still 4 px short of their rest; the look from 221
function eyeState(f, t) {
  if (f <= 218) return { dx: tab(SCAN, t), dy: 0, look: 0 };
  if (f === 219) return { dx: 20, dy: 3, look: 0, smear: true };
  if (f === 220) return { dx: 0, dy: 0, look: 1, irisLag: -4 };
  return { dx: 0, dy: 0, look: 1 };
}
// sweat beads: measured slide (px below the rest position at 6.04)

// a bead: the source draws a bold hook (J), thin at the top, the round bottom 3.5–4 px of dark ink (graded minimum
// 0.35–0.43 on the stare frames; measured extents match designer.js's DROPS within 1 px)
function bead(g, top, bot, s = 1) {
  const h = bot[1] - top[1], w = Math.max(5, h * 0.3) * s;
  const pts = [top, [top[0] + (bot[0] - top[0]) * 0.3 - 1, top[1] + h * 0.45], [bot[0] - w * 0.45, bot[1] - w * 0.55], [bot[0], bot[1]], [bot[0] + w * 0.45, bot[1] - w * 0.5], [bot[0] + w * 0.55, bot[1] - w * 1.25]];
  const q = sampleCurve(pts, 5);
  taper(g, q, (u) => (u < 0.62 ? 0.5 + 3.4 * Math.pow(u / 0.62, 1.4) : 3.9 - 2.4 * (u - 0.62) / 0.38) * Math.max(0.6, s), gv(0.04, 0.93));
}

// ---------- the owl in flight: [t, root x, root y, px per owl unit, bank rad], one row per frame 16.00–19.12.
// Measured by template-matching the head (pass 1), then refit per frame (trace/fit_root.py, PART=head): each frame warped
// into the owl's frame, the similarity (shift, scale ±25%, bank −0.33…+0.15) aligning its head, cups and band edges with
// the median of the level-flight frames 17.84–19.12 (scores 0.67–0.93); smoothed 1-2-1.

