import sys, json, cv2, numpy as np
sys.path.insert(0,'.')
from lab import *
L=Lab()
cfgs=json.loads(sys.argv[1])
for t in [47.80,47.84,47.88,47.92]:
    s=src(t); S=cv2.cvtColor(s,cv2.COLOR_BGR2GRAY).astype(np.float32)
    # letters band: rows above the DO NOT KNOCK plate
    x0,y0,x1,y1=0,0,820,75
    q=S[y0:y1,x0:x1]
    line=f't={t:.2f} src p99 {np.percentile(q,99):.0f} p95 {np.percentile(q,95):.0f} mean {q.mean():.1f}'
    for c in cfgs:
        f=L.frame(t,True,None,c); R=cv2.cvtColor(f,cv2.COLOR_BGR2GRAY).astype(np.float32); r=R[y0:y1,x0:x1]
        line+=f' | {json.dumps(c)} p99 {np.percentile(r,99):.0f} p95 {np.percentile(r,95):.0f} mean {r.mean():.1f} mae6 {mae(f,s,6,(x0,y0,x1,y1)):.2f} mae1 {mae(f,s,1,(x0,y0,x1,y1)):.2f}'
    print(line,flush=True)
L.close()
