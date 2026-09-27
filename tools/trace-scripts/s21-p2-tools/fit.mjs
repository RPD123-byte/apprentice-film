// fit a pose's face/cup parameters to measured landmarks (coordinate descent)
// usage: node fit.mjs '<json spec>'  spec = { pose: "TOP", place:{x,y,s}, params:{path:[init,step]}, targets:{cup:[x,y],eye:[x,y],beakTip:[x,y],top:[null,y],front:[x,null]} }
const { landmarks } = await import('/Users/computer/rootline/apprentice-film/src/shots/s21/owl.js');
const P = await import('/Users/computer/rootline/apprentice-film/src/shots/s21/poses.js');
const spec = JSON.parse(process.argv[2]);
const base = JSON.parse(JSON.stringify(P[spec.pose]));
const names = Object.keys(spec.params);
let x = names.map((n) => spec.params[n][0]), st = names.map((n) => spec.params[n][1]);
const set = (o, path, v) => { const k = path.split('.'); let q = o; for (let i = 0; i < k.length - 1; i++) { q[k[i]] = q[k[i]] ? { ...q[k[i]] } : {}; q = q[k[i]]; } q[k[k.length - 1]] = v; };
function err(x) {
  const pose = JSON.parse(JSON.stringify(base)); let place = { ...spec.place };
  names.forEach((n, i) => { if (n === 'dx') place.x += x[i]; else if (n === 'dy') place.y += x[i]; else set(pose, n, x[i]); });
  // re-nest after set (set copies objects along the path)
  const L = landmarks(pose, place); let e = 0;
  for (const [k, t] of Object.entries(spec.targets)) { const w = (spec.w && spec.w[k]) || 1; if (t[0] != null) e += w * (L[k][0] - t[0]) ** 2; if (t[1] != null) e += w * (L[k][1] - t[1]) ** 2; }
  return [e, L];
}
function set2(pose){return pose}
let [E] = err(x);
for (let it = 0; it < 400; it++) {
  let imp = false;
  for (let i = 0; i < x.length; i++) for (const d of [1, -1]) { const y = x.slice(); y[i] += d * st[i]; const [e] = err(y); if (e < E) { E = e; x = y; imp = true; } }
  if (!imp) st = st.map((v) => v * 0.6);
  if (Math.max(...st) < 1e-4) break;
}
const [e, L] = err(x);
console.log('err', e.toFixed(2)); names.forEach((n, i) => console.log(n, x[i].toFixed(3)));
for (const k of Object.keys(spec.targets)) console.log(k, L[k].map((v) => v.toFixed(1)).join(','), 'target', spec.targets[k].join(','));
