import { decodeR3 } from '/Users/computer/rootline/apprentice-film/src/shots/s06/face3.js';
const name = process.argv[2], bx = (process.argv[3] || '820,175,880,235').split(',').map(Number);
const { L } = await import(`/Users/computer/rootline/apprentice-film/src/shots/s06/data/${name}.js`);
decodeR3(L);
const inb = (x, y) => x >= bx[0] && x <= bx[2] && y >= bx[1] && y <= bx[3];
L.ink.forEach((s, i) => { let n = 0, x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, wmax = 0, v = s[3]; for (let k = 0; k < s.length; k += 5) { if (inb(s[k], s[k + 1])) n++; x0 = Math.min(x0, s[k]); x1 = Math.max(x1, s[k]); y0 = Math.min(y0, s[k + 1]); y1 = Math.max(y1, s[k + 1]); wmax = Math.max(wmax, s[k + 2]); v = Math.min(v, s[k + 3]); }
  if (n) console.log('ink', i, 'pts', s.length / 5, 'in', n, 'bbox', [x0, y0, x1, y1].map(Math.round).join(','), 'wmax', wmax.toFixed(1), 'vmin', v.toFixed(3), 'b', s[4].toFixed(2)); });
(L.solids || []).forEach(([v, ...rings], i) => rings.forEach((r, j) => { let n = 0, x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (let k = 0; k < r.length; k += 2) { if (inb(r[k], r[k + 1])) n++; x0 = Math.min(x0, r[k]); x1 = Math.max(x1, r[k]); y0 = Math.min(y0, r[k + 1]); y1 = Math.max(y1, r[k + 1]); } if (n) console.log('solid', i, 'v', v, 'ring', j, 'n', r.length / 2, 'in', n, 'bbox', [x0, y0, x1, y1].join(',')); }));
