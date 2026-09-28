import { decodeR3 } from '/Users/computer/rootline/apprentice-film/src/shots/s06/face3.js';
for (const nm of ['r3_owl','r3_owl_post','r3_body','r3_room']){
  const {L}=await import(`/Users/computer/rootline/apprentice-film/src/shots/s06/data/${nm}.js`); decodeR3(L);
  for (const key of ['light','ink']) (L[key]||[]).forEach((s,k)=>{let xs=[],ys=[];for(let i=0;i<s.length;i+=5){xs.push(s[i]);ys.push(s[i+1]);} const x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys); if(x1-x0>60 && y0>585 && y1<630 && x0>1500 && x1<1850) console.log(nm,key,k,'v',s[3].toFixed(2),'bbox',x0.toFixed(0),y0.toFixed(0),x1.toFixed(0),y1.toFixed(0),'n',xs.length);});
  if (L.clip) console.log(nm,'clip ymax',Math.max(...L.clip.map(p=>p[1])));
  console.log(nm,'box',JSON.stringify(L.box));
}
