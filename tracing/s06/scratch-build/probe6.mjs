import { decodeR3 } from '/Users/computer/rootline/apprentice-film/src/shots/s06/face3.js';
for (const nm of ['r3_room','r3_face','r3_hair','r3_body','r3_owl']){
  const {L}=await import(`/Users/computer/rootline/apprentice-film/src/shots/s06/data/${nm}.js`); decodeR3(L);
  const lv=new Set(); let pts=0,rings=0; for (const [v,...R] of (L.ground||[])){lv.add(v.toFixed(3)); for(const r of R){rings++;pts+=r.length/2;}}
  let sp=0; for(const s of L.ink) sp+=s.length/5; let lp=0; for(const s of L.light) lp+=s.length/5;
  console.log(nm,'ground levels',lv.size,'rings',rings,'pts',pts,'solids',L.solids.length,'ink strokes',L.ink.length,'pts',sp,'light',L.light.length,'pts',lp);
}
