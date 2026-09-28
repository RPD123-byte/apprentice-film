// time the build + per-frame draw with a counting mock 2D context
let ops=0;
const mkctx=()=>new Proxy({},{get(t,k){ if(k==='canvas') return {width:2206,height:946}; if(k in t) return t[k]; return (...a)=>{ops++; if(k==='createLinearGradient'||k==='createRadialGradient') return {addColorStop(){}}; if(k==='getImageData') return {data:new Uint8ClampedArray(4*(a[2]||1)*(a[3]||1))}; if(k==='measureText') return {width:10}; return undefined;}; }, set(t,k,v){t[k]=v; return true;}});
globalThis.document={createElement(){ return {width:0,height:0,getContext(){return mkctx();}}; }};
const { shot } = await import("/Users/computer/rootline/apprentice-film/src/shots/s06.js");
const ctx=mkctx();
let t0=performance.now(); shot.draw(ctx,0.28,27.0); console.log('first frame (build)', (performance.now()-t0).toFixed(0),'ms ops',ops);
for (const t of [27.5,28.0,28.24,28.4,28.9]) { ops=0; t0=performance.now(); shot.draw(ctx,t-26.72,t); console.log(t,'frame',(performance.now()-t0).toFixed(1),'ms ops',ops); }
