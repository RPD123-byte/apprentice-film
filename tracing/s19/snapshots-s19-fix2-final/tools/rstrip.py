# rstrip.py tag t0 t1 step x0,y0,x1,y1 [cols] [w] : render frames and make a strip of render (top) over source (bottom) per tile
import sys; sys.path.insert(0, '.')
from lab import *
import numpy as np, cv2, os
tag=sys.argv[1]; t0=float(sys.argv[2]); t1=float(sys.argv[3]); st=float(sys.argv[4]); x0,y0,x1,y1=[int(v) for v in sys.argv[5].split(',')]
cols=int(sys.argv[6]) if len(sys.argv)>6 else 4; tw=int(sys.argv[7]) if len(sys.argv)>7 else 500
ts=[]; t=t0
while t<=t1+1e-6: ts.append(round(t,2)); t+=st
L=Lab(); tiles=[]
for t in ts:
    r=L.render(t); s=src(t)
    a=r[y0:y1,x0:x1]; b=s[y0:y1,x0:x1]
    im=np.vstack([a,b]); sc=tw/im.shape[1]; im=cv2.resize(im,None,fx=sc,fy=sc,interpolation=cv2.INTER_AREA)
    cv2.putText(im,f'{t:.2f} {mae(r,s,8):.1f}',(6,22),0,0.7,(0,0,255),2)
    tiles.append(im)
L.close()
while len(tiles)%cols: tiles.append(np.zeros_like(tiles[0]))
rows=[np.hstack(tiles[i:i+cols]) for i in range(0,len(tiles),cols)]
cv2.imwrite(f'../s19-fix2-{tag}.jpg',np.vstack(rows),[cv2.IMWRITE_JPEG_QUALITY,85]); print('ok',len(ts))
