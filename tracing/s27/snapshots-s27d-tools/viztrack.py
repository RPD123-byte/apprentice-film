# overlay a tracked polygon (+ inner grid) on source frames: viztrack.py track.json out.jpg t0 t1 step [x0 y0 x1 y1] [--poly x,y,...]
import cv2, json, sys, numpy as np
from src import frame
a=sys.argv; J=json.load(open(a[1])); out=a[2]; t0,t1,st=float(a[3]),float(a[4]),float(a[5])
roi=[int(v) for v in a[6:10]] if len(a)>=10 and not a[6].startswith('--') else None
poly=np.float32(J['poly'])
for x in a:
    if x.startswith('--poly='): poly=np.float32([float(v) for v in x[7:].split(',')]).reshape(-1,2)
rows={r[0]:np.array(r[1:]).reshape(3,3) for r in J['H']}
ks=sorted(rows)
def Hat(t):
    k=min(ks,key=lambda k:abs(k-t)); return rows[k] if abs(k-t)<0.021 else None
tiles=[]; t=t0
x0,y0=poly.min(0); x1,y1=poly.max(0)
grid=[]
for i in range(6):
    u=i/5; grid.append(np.float32([[x0+(x1-x0)*u,y0],[x0+(x1-x0)*u,y1]])); grid.append(np.float32([[x0,y0+(y1-y0)*u],[x1,y0+(y1-y0)*u]]))
while t<=t1+1e-6:
    f=frame(t); H=Hat(t)
    if H is not None:
        P=cv2.perspectiveTransform(poly[None],H)[0]
        cv2.polylines(f,[np.int32(P)],True,(0,255,0),2)
        for g in grid:
            G=cv2.perspectiveTransform(g[None],H)[0]; cv2.line(f,tuple(np.int32(G[0])),tuple(np.int32(G[1])),(255,0,255),1)
    if roi: f=f[roi[1]:roi[3],roi[0]:roi[2]]
    f=cv2.resize(f,(560,int(f.shape[0]*560/f.shape[1])))
    cv2.putText(f,f"{t:.2f}",(4,16),0,0.5,(0,255,255),1); tiles.append(f); t=round(t+st,3)
while len(tiles)%4: tiles.append(np.zeros_like(tiles[0]))
cv2.imwrite(out,np.vstack([np.hstack(tiles[i:i+4]) for i in range(0,len(tiles),4)]),[cv2.IMWRITE_JPEG_QUALITY,85])
