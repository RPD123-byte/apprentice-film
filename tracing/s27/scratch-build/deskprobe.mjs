// probe the s27 desk homographies (scratch; imports the shot's data modules only)
import { SCREEN, WALL, BASE_END } from "/Users/computer/rootline/apprentice-film/src/shots/s27/drawn/tracks.js";
import { BASE_FL, BASE_FR, BASE_BACK_PAGE } from "/Users/computer/rootline/apprentice-film/src/shots/s27/drawn/keys.js";
const hmul=(A,B)=>{const C=new Array(9);for(let i=0;i<3;i++)for(let j=0;j<3;j++)C[i*3+j]=A[i*3]*B[j]+A[i*3+1]*B[3+j]+A[i*3+2]*B[6+j];return C;};
const happly=(H,x,y)=>{const w=H[6]*x+H[7]*y+H[8];return [(H[0]*x+H[1]*y+H[2])/w,(H[3]*x+H[4]*y+H[5])/w,w];};
function hquad(src,dst){const A=[],b=[];for(let k=0;k<4;k++){const[x,y]=src[k],[u,v]=dst[k];A.push([x,y,1,0,0,0,-u*x,-u*y]);b.push(u);A.push([0,0,0,x,y,1,-v*x,-v*y]);b.push(v);}const n=8;for(let i=0;i<n;i++){let p=i;for(let r=i+1;r<n;r++)if(Math.abs(A[r][i])>Math.abs(A[p][i]))p=r;[A[i],A[p]]=[A[p],A[i]];[b[i],b[p]]=[b[p],b[i]];for(let r=i+1;r<n;r++){const f=A[r][i]/A[i][i];for(let c=i;c<n;c++)A[r][c]-=f*A[i][c];b[r]-=f*b[i];}}const x=new Array(n);for(let i=n-1;i>=0;i--){let s=b[i];for(let c=i+1;c<n;c++)s-=A[i][c]*x[c];x[i]=s/A[i][i];}return [...x,1];}
const rowH=r=>[r[1],r[2],r[3],r[4],r[5],r[6],r[7],r[8],1];
const at=(T,t)=>rowH(T.reduce((a,r)=>Math.abs(r[0]-t)<Math.abs(a[0]-t)?r:a));
const lin=(K,t)=>{let i=1;while(i<K.length-1&&K[i][0]<t)i++;const a=K[i-1],b=K[i],u=Math.max(0,Math.min(1,(t-a[0])/(b[0]-a[0])));return a.slice(1).map((v,k)=>v+(b[k+1]-v)*u);};
const REF=[[680,673],[1489,673],[1620,774],[546,774]], BT=[[0,0],[1400,0],[1400,860],[0,860]];
const refInv=(()=>{const H=hquad(BT,REF);const [a,b,c,d,e,f,g,h,i]=H;const A=e*i-f*h,B=-(d*i-f*g),C=d*h-e*g,det=a*A+b*B+c*C;return [A/det,-(b*i-c*h)/det,(b*f-c*e)/det,B/det,(a*i-c*g)/det,-(a*f-c*d)/det,C/det,-(a*h-b*g)/det,(a*e-b*d)/det];})();
function mid(t){const S=at(SCREEN,t);return [happly(S,...BASE_BACK_PAGE[0]).slice(0,2),happly(S,...BASE_BACK_PAGE[1]).slice(0,2),lin(BASE_FR,t),lin(BASE_FL,t)];}
const B127=mid(127.6);
for (const t of [127.6,128.0,128.2,128.6,129.0,129.28]){
  const D=at(BASE_END,t); const Q=B127.map(([x,y])=>happly(D,x,y).slice(0,2));
  const Hb=hmul(hquad(BT,Q),refInv);
  const pts=[[291,647],[0,733],[2206,647],[2206,862],[0,862],[-500,862],[1000,862]];
  console.log(t,'Q',Q.map(p=>p.map(v=>v.toFixed(0)).join(',')).join(' '),'| desk',pts.map(p=>happly(Hb,...p).map(v=>v.toFixed(0)).join(',')).join(' '));
}
console.log('--- turn');
for (const t of [120.0,120.4,120.8,121.2,121.6,122.0,122.4,123.0,124.0,125.0]){
  const Q=mid(t); const Hb=hmul(hquad(BT,Q),refInv);
  const pts=[[0,647],[2206,647],[2206,946],[0,946],[1103,700]];
  const inv=(()=>{const [a,b,c,d,e,f,g,h,i]=Hb;const A=e*i-f*h,B=-(d*i-f*g),C=d*h-e*g,det=a*A+b*B+c*C;return [A/det,-(b*i-c*h)/det,(b*f-c*e)/det,B/det,(a*i-c*g)/det,-(a*f-c*d)/det,C/det,-(a*h-b*g)/det,(a*e-b*d)/det];})();
  // frame corners of the lower frame -> ref
  const fr=[[0,700],[2206,700],[2206,946],[0,946]].map(p=>happly(inv,...p).map(v=>v.toFixed(0)).join(','));
  console.log(t,'ref->frame',pts.map(p=>happly(Hb,...p).map(v=>v.toFixed(2)).join(',')).join(' '),'| frame->ref',fr.join(' '));
}
