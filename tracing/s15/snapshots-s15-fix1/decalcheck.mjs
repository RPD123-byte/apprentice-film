// dump every (take, id, frame, quad) for faces that carry decals -> decalq.json
import fs from 'fs';
const {DECALS}=await import('../../src/shots/s15/decals.js');
const out={};
for (const T of Object.keys(DECALS)) {
  const D=(await import(`../../src/shots/s15/roto${T}.js`))[`ROTO_${T}`];
  for (const [f,rows] of Object.entries(D.frames)) for (const r of rows) if (DECALS[T][r[0]]) (out[T+':'+r[0]] ||= []).push([+f, r.slice(1,9)]);
}
fs.writeFileSync(new URL('./decalq.json', import.meta.url), JSON.stringify({q:out, d:DECALS}));
