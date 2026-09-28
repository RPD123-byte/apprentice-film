import { OWL } from "../../../src/shots/s16/data/owl.js";
const ids = process.argv.slice(2).map(Number);
for (const id of (ids.length ? ids : Object.keys(OWL).map(Number))) {
  const d = OWL[id]; if (!d) continue;
  const o = {};
  for (const k of Object.keys(d)) {
    const v = d[k];
    o[k] = Array.isArray(v) ? `arr${v.length}` : typeof v === "object" && v ? `{${Object.keys(v).join(",")}}` : v;
  }
  console.log(id, JSON.stringify(o));
  if (d.HP) console.log('  HP cups', JSON.stringify(d.HP.cups), 'v', d.HP.v, d.HP.vg, 'rings', d.HP.rings.length, 'band', (d.HP.band||[]).length, 'hl', (d.HP.hl||[]).length);
  if (d.C) console.log('  C', d.C.map(s => { let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9; for (let i=0;i<s.length;i+=4){x0=Math.min(x0,s[i]);x1=Math.max(x1,s[i]);y0=Math.min(y0,s[i+1]);y1=Math.max(y1,s[i+1]);} return [x0,y0,x1,y1].map(Math.round).join(','); }).join(' | '));
}
