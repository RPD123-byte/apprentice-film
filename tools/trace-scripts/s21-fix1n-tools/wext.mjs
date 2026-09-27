// wext.mjs T,.. : x extent of s21's owl silhouette above y 125 (rasterised crudely by polygon points)
const { probeShape } = await import('/Users/computer/rootline/apprentice-film/src/shots/s21.js');
for (const t of process.argv[2].split(',').map(Number)) {
  const q = probeShape(t); const pts = [...q.head, ...q.body, ...q.wings.flatMap((w) => w.polys.flat())];
  const up = pts.filter((p) => p[1] < 125); const xs = up.map((p) => p[0]);
  const tips = q.wings.map((w) => { const P = w.polys.flat(); let a = P[0], b = P[0]; for (const p of P) { if (p[0] < a[0]) a = p; if (p[0] > b[0]) b = p; } return [a.map((v) => v.toFixed(0)).join(','), b.map((v) => v.toFixed(0)).join(',')]; });
  console.log(t, 'x', Math.min(...xs).toFixed(0), Math.max(...xs).toFixed(0), 'wing extremes', JSON.stringify(tips));
}
