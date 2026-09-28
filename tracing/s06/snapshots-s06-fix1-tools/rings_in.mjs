// list rings (ground/solids) and strokes (ink/light) of a layer whose bbox lies entirely inside a box
import { decodeR3 } from '/Users/computer/rootline/apprentice-film/src/shots/s06/face3.js';
const name = process.argv[2], bx = process.argv[3].split(',').map(Number);
const { L } = await import(`/Users/computer/rootline/apprentice-film/src/shots/s06/data/${name}.js`);
decodeR3(L);
const inside = (xs, ys) => Math.min(...xs) >= bx[0] && Math.max(...xs) <= bx[2] && Math.min(...ys) >= bx[1] && Math.max(...ys) <= bx[3];
for (const key of ['ground', 'solids']) (L[key] || []).forEach(([v, ...rings], i) => rings.forEach((r, j) => {
  const xs = [], ys = []; for (let k = 0; k < r.length; k += 2) { xs.push(r[k]); ys.push(r[k + 1]); }
  if (inside(xs, ys)) console.log(key, i, 'v', v.toFixed(3), 'ring', j, 'n', xs.length, 'bbox', Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys));
}));
for (const key of ['ink', 'light']) (L[key] || []).forEach((s, i) => {
  const xs = [], ys = []; for (let k = 0; k < s.length; k += 5) { xs.push(s[k]); ys.push(s[k + 1]); }
  if (inside(xs, ys)) console.log(key, i, 'v', s[3].toFixed(3), 'n', xs.length, 'bbox', Math.min(...xs).toFixed(1), Math.min(...ys).toFixed(1), Math.max(...xs).toFixed(1), Math.max(...ys).toFixed(1));
});
