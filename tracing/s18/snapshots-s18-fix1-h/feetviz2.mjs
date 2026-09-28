import { OWL_A } from "./src/shots/s18/data/owlA.js";
import { FEET_A } from "./src/shots/s18/data/feetA.js";
import { decodeInk, ringsBBox } from "./src/shots/s18/inkdraw.js";
import { footMask } from "./src/shots/s18/handdraw.js";
const area=(M)=>{let a=0;for(const r of M.rings){let s=0;for(let i=0,n=r.length;i<n;i+=2){const j=(i+2)%n;s+=r[i]*r[j+1]-r[j]*r[i+1];}a+=Math.abs(s/2);}return a;};
export const shot = { draw(ctx, local, t, s, n) {
  const f = n % 10000;
  ctx.fillStyle = "#606060"; ctx.fillRect(0, 0, 2206, 946);
  const D = decodeInk(OWL_A.feet[f]);
  const path = (M) => { ctx.beginPath(); for (const r of M.rings) { ctx.moveTo(r[0], r[1]); for (let i = 2; i < r.length; i += 2) ctx.lineTo(r[i], r[i + 1]); ctx.closePath(); } };
  for (const M of D.base) { path(M); ctx.fillStyle = typeof M.f === "number" && M.f < 60 ? "rgba(0,0,0,0.8)" : "rgba(0,0,200,0.6)"; ctx.fill("evenodd"); }
  for (const M of D.m) { path(M); const v = typeof M.f === "number" ? M.f : 200; ctx.fillStyle = `rgb(${v},${v},${v})`; ctx.fill("evenodd"); ctx.strokeStyle = area(M) < 400 ? "#f0f" : "#0f0"; ctx.lineWidth = 1; ctx.stroke(); }
  for (const st of D.d) { ctx.beginPath(); ctx.moveTo(st.x[0], st.y[0]); for (let i = 1; i < st.x.length; i++) ctx.lineTo(st.x[i], st.y[i]); ctx.strokeStyle = "red"; ctx.lineWidth = 1.5; ctx.stroke(); }
  ctx.globalAlpha = 0.35; for (const F of FEET_A[f] || []) { ctx.save(); footMask(ctx, F, 0); ctx.restore(); } ctx.globalAlpha = 1;
  ctx.strokeStyle="#ff0"; ctx.lineWidth=1; ctx.beginPath(); for (let y=500;y<=660;y+=20){ctx.moveTo(560,y);ctx.lineTo(1000,y);} for(let x=560;x<=1000;x+=20){ctx.moveTo(x,500);ctx.lineTo(x,660);} ctx.globalAlpha=0.3; ctx.stroke(); ctx.globalAlpha=1;
} };
