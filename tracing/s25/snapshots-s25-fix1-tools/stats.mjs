import { DRAW } from "../../src/shots/s25/v2/drawings.js";
for (const [k, D] of Object.entries(DRAW)) {
  const t = [0,0,0], a=[0,0,0];
  for (const q of D.parts) { t[q.tier]++; a[q.tier]+= q.area||0; }
  console.log(k, D.frame, 'base', D.base, 'edge', JSON.stringify(D.edge), 'parts', t.join('/'), 'area', a.map(Math.round).join('/'), 'ink', (D.ink||[]).length, 'lines', (D.lines||[]).length, 'dots', (D.dots||[]).length, Object.keys(D).join(','));
}
