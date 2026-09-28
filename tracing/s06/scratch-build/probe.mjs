import { decodeR3 } from '/Users/computer/rootline/apprentice-film/src/shots/s06/face3.js';
const names=['r3_brow_s','r3_brow','r3_face_s','r3_face','r3_hair'];
const box=[826,190,870,226];
for (const nm of names){
  const {L}=await import(`/Users/computer/rootline/apprentice-film/src/shots/s06/data/${nm}.js`);
  decodeR3(L);
  const inb=(x,y)=>x>=box[0]&&x<=box[2]&&y>=box[1]&&y<=box[3];
  let sol=[],ink=0,inkDark=[];
  for (const [v,...rings] of (L.solids||[])) for (const r of rings){ let c=0; for(let i=0;i<r.length;i+=2) if(inb(r[i],r[i+1])) c++; if(c) sol.push([v.toFixed(2),c,r.length/2]); }
  for (const s of (L.ink||[])){ let c=0; for(let i=0;i<s.length;i+=5) if(inb(s[i],s[i+1])) c++; if(c){ink++; inkDark.push(s[3].toFixed(2));} }
  let gr=[]; for (const [v,...rings] of (L.ground||[])) for (const r of rings){ let c=0; for(let i=0;i<r.length;i+=2) if(inb(r[i],r[i+1])) c++; if(c && v<0.35) gr.push([v.toFixed(2),c]); }
  console.log(nm,'solids in box',sol.length,JSON.stringify(sol.slice(0,8)),'ink',ink,'tones',inkDark.slice(0,12).join(' '),'dark ground',JSON.stringify(gr.slice(0,8)));
}
