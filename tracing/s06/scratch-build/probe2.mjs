import { decodeR3 } from '/Users/computer/rootline/apprentice-film/src/shots/s06/face3.js';
const {L}=await import('/Users/computer/rootline/apprentice-film/src/shots/s06/data/r3_brow_s.js');
decodeR3(L);
const box=[826,190,870,226];
const inb=(x,y)=>x>=box[0]&&x<=box[2]&&y>=box[1]&&y<=box[3];
L.solids.forEach(([v,...rings],k)=>rings.forEach((r,j)=>{let xs=[],ys=[];for(let i=0;i<r.length;i+=2){xs.push(r[i]);ys.push(r[i+1]);} if(xs.some((x,i)=>inb(x,ys[i]))) console.log('solid',k,j,'v',v.toFixed(3),'bbox',Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys))}));
L.ink.forEach((s,k)=>{let xs=[],ys=[],w=[];for(let i=0;i<s.length;i+=5){xs.push(s[i]);ys.push(s[i+1]);w.push(s[i+2]);} if(xs.some((x,i)=>inb(x,ys[i])) && s[3]<0.2) console.log('ink',k,'v',s[3].toFixed(2),'bbox',Math.min(...xs).toFixed(0),Math.min(...ys).toFixed(0),Math.max(...xs).toFixed(0),Math.max(...ys).toFixed(0),'wmax',Math.max(...w).toFixed(1))});
