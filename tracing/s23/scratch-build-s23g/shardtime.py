import cv2, numpy as np, json
import fgx
P=fgx.plate('B2')
Fs={k:fgx.load(k) for k in range(2399,2427)}
out=[]
for i,(x0,y0,x1,y1,t0) in enumerate(fgx.SHARDS):
    L=int(np.hypot(x1-x0,y1-y0)); n=max(8,L//2)
    us=np.linspace(0.08,0.92,n)
    xs=x0+(x1-x0)*us; ys=y0+(y1-y0)*us
    fr=[]
    for k,F in Fs.items():
        D=(F-P).mean(-1)
        # max over a 3 px perpendicular window
        nx,ny=-(y1-y0)/max(L,1),(x1-x0)/max(L,1)
        v=np.max([cv2.remap(D,(xs+nx*o).astype(np.float32).reshape(1,-1),(ys+ny*o).astype(np.float32).reshape(1,-1),cv2.INTER_LINEAR)[0] for o in (-2,-1,0,1,2)],axis=0)
        lit=v>0.25
        fr.append((k,lit.mean(),lit[:n//3].mean(),lit[-n//3:].mean()))
    first=next((k for k,f,a,b in fr if f>0.6),None)
    out.append((i,round(t0*25),first,[round(f,2) for k,f,a,b in fr]))
for o in out: print(o[0],'table',o[1],'meas',o[2],' '.join('%.1f'%f for f in o[3][4:]))
json.dump([(o[0],o[1],o[2]) for o in out],open('shardtime.json','w'))
