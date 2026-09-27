function paintTweeter(P) {
  const o = P.o, T = TWEET, r = rng(29);
  P.fill(circ(T.x, T.y, T.r), 0.0, 0, { style: 2 });
  for (let i = 0; i < 12; i++) {
    const rr = 34 + i * 3.2, a0 = -Math.PI * 1.15, a1 = a0 + Math.PI * (1.0 + 0.5 * r());
    line(o, arcPts(T.x, T.y, rr, rr, a0, a1, 24), 1.2 + r() * 1.4, W_(0.35 + 0.5 * r()), 2, 0.2);
  }
  line(o, arcPts(T.x, T.y, T.r, T.r, -Math.PI, Math.PI, 50), 3, W_(0.75), 2, 0.7);
  o.fillStyle = W_(0.95); o.beginPath(); o.arc(T.x + 12, T.y - 8, 9, 0, 7); o.fill();
}
function leaf(P, x, y, a, s) {
  const o = P.o, c = Math.cos(a), sn = Math.sin(a), L = 38 * s, Wd = 16 * s;
  const pts = [[0, 0], [L * 0.4, -Wd], [L, 0], [L * 0.4, Wd]].map(([u, v]) => [x + u * c - v * sn, y + u * sn + v * c]);
  P.fill(blob(pts), 0.45, a, { style: 2 });
  line(o, [...pts, pts[0]], 2, K_(1), 4, 0.8);
  line(o, [pts[0], pts[2]], 1.2, K_(1));
}
function latt(o, q, sp, w, a) {
  const [p0, p1, p2, p3] = q;
  const L = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]), H = Math.hypot(p3[0] - p0[0], p3[1] - p0[1]);
  const n = Math.max(2, Math.round(L / sp)), m = Math.max(1, (H / L) * n);
  const P = (u, v) => lerp2(lerp2(p0, p1, u), lerp2(p3, p2, u), v);
  o.save(); o.beginPath(); poly(q)(o); o.clip();
  for (let k = -Math.ceil(m) - 1; k <= n + 1; k++) {
    for (const s of [1, -1]) {
      const u0 = k / n, u1 = u0 + s * m / n;
      const A0 = P(u0, 0), A1 = P(u1, 1);
      const d = [A1[0] - A0[0], A1[1] - A0[1]];
      const B0 = [A0[0] - d[0] * 0.05, A0[1] - d[1] * 0.05], B1 = [A1[0] + d[0] * 0.05, A1[1] + d[1] * 0.05];
      taper(o, [B0, lerp2(B0, B1, 0.5), B1], () => w + 2.4, K_(0.95));
      o.globalAlpha = a;
      taper(o, [B0, lerp2(B0, B1, 0.5), B1], (u) => w * (0.75 + 0.25 * Math.sin(Math.PI * u)), INK);
      o.globalAlpha = 1;
    }
  }
  o.restore();
}
function cableRope(o, pts, w) {
  const q = sampleCurve(pts, 10);
  taper(o, q, () => w + 3, "#050505");
  taper(o, q, () => w * 0.7, "rgba(150,148,142,0.8)");
  for (let i = 1; i < q.length - 1; i++) {
    const a = q[i - 1], b = q[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1;
    const nx = -dy / d, ny = dx / d;
    o.strokeStyle = i % 2 ? W_(0.9) : K_(0.95); o.lineWidth = 1.4;
    o.beginPath(); o.moveTo(q[i][0] - nx * w * 0.5, q[i][1] - ny * w * 0.5); o.lineTo(q[i][0] + nx * w * 0.5 + dx / d * 3, q[i][1] + ny * w * 0.5 + dy / d * 3); o.stroke();
  }
}
