const smooth = (t) => { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t); };
function lidsAt(u) {
  const k = [[0, 0], [0.44, 0], [0.5, 0.5], [0.6, 0.5], [0.66, 0.82], [0.7, 0.9], [0.72, 1], [0.92, 1], [0.96, 0.5], [1.0, 0.5], [1.06, 0.25], [1.12, 0], [9, 0]];
  for (let i = 1; i < k.length; i++) if (u <= k[i][0]) { const [a, va] = k[i - 1], [b, vb] = k[i]; return va + (vb - va) * smooth((u - a) / (b - a)); }
  return 0;
}
for (const t of [136.4,136.48,136.56,136.64,136.72,136.84,136.96,137.04,137.12]) console.log(t, (t-136).toFixed(4), lidsAt(t-136).toFixed(3));
