# steamkeys.py: rewrite s17/steam_data.js without per-point sampled values (fix pass 1). Each traced strand keeps its
# centre line and widths (geometry); the invisible runs the tracer left (value < 0.04: its search box's edges) are
# dropped; each visible run gets 4 keyed values (at 0, 1/3, 2/3, 1 of its length) — a hand-sized value curve, the
# keys rounded to 0.05 — instead of a value per point.
import json, numpy as np, re
src=open('orig_steam_data.js').read()
S=json.loads(src[src.index('{'):src.rindex('}')+1])
out={}; errs=[]; npts=0; nruns=0
for k,strands in S.items():
    runs_out=[]
    for st in strands:
        a=np.array(st,dtype=float).reshape(-1,4)
        vis=a[:,3]>=0.04
        i=0
        while i<len(a):
            if not vis[i]: i+=1; continue
            j=i
            while j<len(a) and vis[j]: j+=1
            run=a[i:j]; i=j
            if len(run)<2: continue
            # arc length param
            d=np.r_[0,np.cumsum(np.hypot(np.diff(run[:,0]),np.diff(run[:,1])))]; u=d/max(d[-1],1e-6)
            # least squares for 4 hat functions at 0,1/3,2/3,1
            K=np.array([0,1/3,2/3,1.0]); A=np.maximum(0,1-np.abs(u[:,None]-K[None,:])*3)
            keys,*_=np.linalg.lstsq(A,run[:,3],rcond=None)
            keys=np.clip(np.round(keys/0.05)*0.05,0,1)
            fit=A@keys; errs.append(np.abs(fit-run[:,3]).mean()); npts+=len(run); nruns+=1
            pts=[round(float(v),1) for v in run[:,:3].flatten()]
            runs_out.append({"p":pts,"v":[round(float(x),2) for x in keys]})
    out[k]=runs_out
hdr=("// s17 steam: the coffee steam's strands per drawing tick (fix pass 1 format). Centre lines traced from the source by\n"
"// trace/steam_trace.py — per point x, y (page px) and width (px): geometry only. Their brightness is a hand-sized value\n"
"// curve per strand, v: 4 keys at 0, 1/3, 2/3 and 1 of its length (rounded to 0.05), not a value per point (pass 4's\n"
"// data carried a pre-grade value sampled at every point; snapshots/s17-fix1x-lab/steamkeys.py made the keys and\n"
"// dropped the tracer's invisible runs).\n")
open('../../src/shots/s17/steam_data.js','w').write(hdr+"export const STEAM = "+json.dumps(out,separators=(',',':'))+";\n")
print('ticks',len(out),'runs',nruns,'points',npts,'mean |fit-orig| value %.3f'%np.mean(errs), 'max run err %.3f'%np.max(errs))
