// find long straight axis-aligned edges in an r3 layer's rings (ground / solids)
import { decodeR3 } from '/Users/computer/rootline/apprentice-film/src/shots/s06/face3.js';
const name = process.argv[2], axis = process.argv[3] || 'v', lo = +process.argv[4], hi = +process.argv[5], minLen = +(process.argv[6] || 12);
const { L } = await import(`/Users/computer/rootline/apprentice-film/src/shots/s06/data/${name}.js`);
decodeR3(L);
for (const key of ['ground', 'solids']) (L[key] || []).forEach(([v, ...rings], i) => rings.forEach((r, j) => {
  const n = r.length / 2;
  for (let k = 0; k < n; k++) {
    const x0 = r[2 * k], y0 = r[2 * k + 1], x1 = r[(2 * k + 2) % r.length], y1 = r[(2 * k + 3) % r.length];
    const c = axis === 'v' ? x0 : y0, same = axis === 'v' ? Math.abs(x1 - x0) < 0.01 : Math.abs(y1 - y0) < 0.01, len = axis === 'v' ? Math.abs(y1 - y0) : Math.abs(x1 - x0);
    if (same && c >= lo && c <= hi && len >= minLen) console.log(key, i, 'v', v.toFixed(3), 'ring', j, 'edge', [x0, y0, x1, y1].join(','), 'len', len);
  }
}));
