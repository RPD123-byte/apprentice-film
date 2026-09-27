// s22: small vector drawing primitives for the owl's measured details (eyes, brows, beaks, feather separations),
// drawn in frame px. Every shape is a short list of control points placed by eye on gridded zooms of the source's
// grade-inverted drawing (measuring only); the fills are flat greys chosen to match, nothing of the source is stored.
//   { k: "fill", pts, v, a = 1, blur = 0 }    closed smooth shape (Catmull-Rom through pts)
//   { k: "ink", pts, w, v, a = 1, end, bias } tapered stroke (owlInk ink: full width w at `bias`, `end` at the ends)
//   { k: "ell", c, r: [rx, ry], rot = 0, v, a = 1, blur = 0 }
//   { k: "line", pts, w, v, a = 1 }           constant-width polyline (round joins)
import { ink, gv } from "../../lib/owlInk.js";
import { smoothPath } from "../../lib/paths.js";

export function drawArt(g, list, { m = null } = {}) {
  g.save();
  if (m) g.transform(m[0], m[1], m[2], m[3], m[4] ?? 0, m[5] ?? 0);
  for (const s of list) {
    const col = gv(s.v ?? 0.1, s.a ?? 1);
    if (s.blur) g.filter = `blur(${s.blur}px)`;
    if (s.k === "fill") { g.beginPath(); smoothPath(g, s.pts, true); g.fillStyle = col; g.fill(); }
    else if (s.k === "ell") { g.beginPath(); g.ellipse(s.c[0], s.c[1], s.r[0], s.r[1], s.rot || 0, 0, Math.PI * 2); g.fillStyle = col; g.fill(); }
    else if (s.k === "ink") ink(g, s.pts, s.w ?? 1.2, col, { end: s.end ?? 0.15, bias: s.bias ?? 0.5 });
    else if (s.k === "line") { g.lineJoin = "round"; g.lineCap = "round"; g.lineWidth = s.w ?? 1; g.strokeStyle = col; g.beginPath(); s.pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.stroke(); }
    if (s.blur) g.filter = "none";
  }
  g.restore();
}
