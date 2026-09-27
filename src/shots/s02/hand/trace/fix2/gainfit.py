import sys, os, numpy as np
fr=sys.argv[1]; sys.argv=[sys.argv[0]]
from run import Lab, parse, mae, src
L=Lab(); C=[float(v) for v in os.environ.get("GC","0.6,0.7,0.8,0.9,1.0,1.1,1.2,1.35,1.5").split(",")]; res={}
for f in parse(fr):
    s=src(f); e=[]
    for g in C:
        L.js('(g)=>window.__labgain(g)', g); img,_=L.frame(f); e.append(mae(img,s)[0])
    i=int(np.argmin(e)); 
    # parabola refine
    g=C[i]
    if 0<i<len(C)-1:
        a,b,c=e[i-1],e[i],e[i+1]; d=a-2*b+c
        if d>0: g=C[i]+0.5*(a-c)/d*(C[i+1]-C[i])
    res[f]=round(g,3); print(f, res[f], 'mae', round(min(e),2), flush=True)
L.js('()=>window.__labgain(null)'); L.close()
