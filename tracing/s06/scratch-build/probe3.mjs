import { decodeR3 } from '/Users/computer/rootline/apprentice-film/src/shots/s06/face3.js';
for (const nm of ['r3_face','r3_face_s','r3_brow','r3_brow_s','r3_hair','r3_body','r3_nape']){
  const {L}=await import(`/Users/computer/rootline/apprentice-film/src/shots/s06/data/${nm}.js`);
  decodeR3(L);
  const hits={};
  for (const key of ['ground','solids']) for (const [v,...rings] of (L[key]||[])) for (const r of rings){
    for(let i=0;i<r.length;i+=2){const j=(i+2)%r.length; const x0=r[i],y0=r[i+1],x1=r[j],y1=r[j+1];
      if(Math.abs(y1-y0)<0.01 && Math.abs(x1-x0)>=6 && y0>=250 && y0<=300){const k=key+'@'+y0; hits[k]=(hits[k]||0)+Math.abs(x1-x0);} }
  }
  // strokes: long horizontal straight runs
  let sh={}; for (const s of (L.ink||[])){ for(let i=0;i+5<s.length;i+=5){ if(Math.abs(s[i+6]-s[i+1])<0.05 && Math.abs(s[i+5]-s[i])>=4 && s[i+1]>=270&&s[i+1]<=290){const k=s[i+1].toFixed(1); sh[k]=(sh[k]||0)+1;} } }
  const top=Object.entries(hits).sort((a,b)=>b[1]-a[1]).slice(0,8);
  console.log(nm, 'box',JSON.stringify(L.box), 'horizontal edge px by row', JSON.stringify(top), 'ink flat segs', JSON.stringify(Object.entries(sh).sort((a,b)=>b[1]-a[1]).slice(0,5)));
}
