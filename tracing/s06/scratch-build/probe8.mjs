import { decodeR3 } from '/Users/computer/rootline/apprentice-film/src/shots/s06/face3.js';
for (const nm of ['r3_owl','r3_owl_post']){
  const {L}=await import(`/Users/computer/rootline/apprentice-film/src/shots/s06/data/${nm}.js`); decodeR3(L);
  console.log(nm,'clip?',!!L.clip,'clipRings?',!!L.clipRings, L.clipRings? L.clipRings.length:0);
  const R=L.clipRings||[];
  for (const r of R){ const pts=[]; for(let i=0;i<r.length;i+=2) if(r[i+1]>595&&r[i+1]<625&&r[i]>1570&&r[i]<1780) pts.push(`${r[i]},${r[i+1]}`); if(pts.length) console.log(' ring pts in band', pts.length, pts.slice(0,40).join(' ')); }
  if (L.clip) console.log(JSON.stringify(L.clip.filter(p=>p[1]>580)));
}
