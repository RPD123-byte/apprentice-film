import { SCREEN, BASE_END } from "/Users/computer/rootline/apprentice-film/src/shots/s27/drawn/tracks.js";
import { BASE_FL, BASE_FR, BASE_BACK_PAGE } from "/Users/computer/rootline/apprentice-film/src/shots/s27/drawn/keys.js";
const happly=(H,x,y)=>{const w=H[6]*x+H[7]*y+H[8];return [(H[0]*x+H[1]*y+H[2])/w,(H[3]*x+H[4]*y+H[5])/w];};
const rowH=r=>[r[1],r[2],r[3],r[4],r[5],r[6],r[7],r[8],1];
const at=(T,t)=>rowH(T.reduce((a,r)=>Math.abs(r[0]-t)<Math.abs(a[0]-t)?r:a));
const lin=(K,t)=>{let i=1;while(i<K.length-1&&K[i][0]<t)i++;const a=K[i-1],b=K[i],u=Math.max(0,Math.min(1,(t-a[0])/(b[0]-a[0])));return a.slice(1).map((v,k)=>v+(b[k+1]-v)*u);};
function mid(t){const S=at(SCREEN,t);return [happly(S,...BASE_BACK_PAGE[0]),happly(S,...BASE_BACK_PAGE[1]),lin(BASE_FR,t),lin(BASE_FL,t)];}
const B=mid(127.6); const out={};
for (const t of process.argv.slice(2).map(Number)) { const Q = t<=127.6? mid(t) : B.map(p=>happly(at(BASE_END,t),...p)); out[t]=Q.map(p=>p.map(v=>+v.toFixed(1))); }
console.log(JSON.stringify(out));
