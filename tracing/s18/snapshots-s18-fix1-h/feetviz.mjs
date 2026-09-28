// test module: draws OWL_A.feet[f] marks color-coded on the source-free grey: n = frame
import { OWL_A } from "./src/shots/s18/data/owlA.js";
import { decodeInk, ringsBBox } from "./src/shots/s18/inkdraw.js";
const area=(r)=>{let a=0;for(let i=0,n=r.length;i<n;i+=2){const j=(i+2)%n;a+=r[i]*r[j+1]-r[j]*r[i+1];}return Math.abs(a/2);};
export const shot = { draw(ctx, local, t, s, n) {
  const f = n % 10000, mode = Math.floor(n / 10000);
  ctx.fillStyle = "#808080"; ctx.fillRect(0, 0, 2206, 946);
  const D = decodeInk(OWL_A.feet[f]);
  const path = (M) => { ctx.beginPath(); for (const r of M.rings) { ctx.moveTo(r[0], r[1]); for (let i = 2; i < r.length; i += 2) ctx.lineTo(r[i], r[i + 1]); ctx.closePath(); } };
  const val = (f) => typeof f === "number" ? f : 128;
  if (mode !== 2) for (const M of D.base) { path(M); ctx.fillStyle = "rgba(0,0,255,0.35)"; ctx.fill("evenodd"); }
  for (const M of D.m) { path(M); const v = typeof M.f === "number" ? M.f : 200; ctx.fillStyle = `rgb(${v},${v},${Math.min(255,v+40)})`; ctx.fill("evenodd"); ctx.strokeStyle = "#0f0"; ctx.lineWidth = 0.7; ctx.stroke(); }
  for (const M of D.s) { path(M); ctx.fillStyle = "#ff0"; ctx.fill("evenodd"); }
  for (const st of D.d) { ctx.beginPath(); ctx.moveTo(st.x[0], st.y[0]); for (let i = 1; i < st.x.length; i++) ctx.lineTo(st.x[i], st.y[i]); ctx.strokeStyle = "red"; ctx.lineWidth = 1.5; ctx.stroke(); }
  for (const st of D.b) { ctx.beginPath(); ctx.moveTo(st.x[0], st.y[0]); for (let i = 1; i < st.x.length; i++) ctx.lineTo(st.x[i], st.y[i]); ctx.strokeStyle = "#0ff"; ctx.lineWidth = 1.5; ctx.stroke(); }
} };
