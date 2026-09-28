import { decodeR3 } from '/Users/computer/rootline/apprentice-film/src/shots/s06/face3.js';
const Q={r3_face:{H:[112,283,278,307,308,309],V:[1079,1080,1366]},r3_face_s:{H:[110,278,283,307,817],V:[948,1080,1081]},r3_owl:{H:[372,144,209],V:[1518,1494,1844]},"r3_owlhead_b28.20":{H:[437,372],V:[1790,1789]},r3_nape:{H:[411],V:[1395,1348,663,1362,1344,720]},r3_body:{H:[584],V:[1415,1444,538]},r3_mouth:{H:[727],V:[]},r3_mouth_s:{H:[712],V:[]},r3_room:{H:[391,549],V:[588,1879]}};
const out={};
for (const [nm,q] of Object.entries(Q)){
  const {L}=await import(`/Users/computer/rootline/apprentice-film/src/shots/s06/data/${nm}.js`); decodeR3(L);
  for (const key of ['ground','solids']) for (const [v,...rings] of (L[key]||[])) for (const r of rings){
    for(let i=0;i<r.length;i+=2){const j=(i+2)%r.length; const x0=r[i],y0=r[i+1],x1=r[j],y1=r[j+1];
      for (const y of q.H) if(y1===y0 && Math.round(y0)===y && Math.abs(x1-x0)>=8){const k=`${nm} H${y}`; (out[k]=out[k]||[]).push([Math.min(x0,x1),Math.max(x0,x1)]);}
      for (const x of q.V) if(x1===x0 && Math.round(x0)===x && Math.abs(y1-y0)>=8){const k=`${nm} V${x}`; (out[k]=out[k]||[]).push([Math.min(y0,y1),Math.max(y0,y1)]);}
    }
  }
}
for (const [k,segs] of Object.entries(out)){ const lo=Math.min(...segs.map(s=>s[0])), hi=Math.max(...segs.map(s=>s[1])); console.log(k,'extent',lo,hi,'nsegs',segs.length); }
