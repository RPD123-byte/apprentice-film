#!/usr/bin/env python3
# Tile SOURCE frames (optionally a crop) from T0 to T1 every STEP seconds, with timestamps, to study motion/timing.
# Usage: tools/strip.py T0 T1 STEP out.jpg [x0 y0 x1 y1] [--cols N] [--w TILEWIDTH]
import cv2, numpy as np, sys, os
V=os.environ.get('REF') or os.environ.get('APPRENTICE_SOURCE')
if not V or not os.path.isfile(V): sys.exit('set APPRENTICE_SOURCE=/path/to/your/copy/of/the/original.mp4 (2206x946, 25 fps, 140.8 s)')
argv=sys.argv[1:]; opts={}; a=[]
i=0
while i<len(argv):
    if argv[i].startswith('--'): opts[argv[i]]=argv[i+1]; i+=2
    else: a.append(argv[i]); i+=1
cols=int(opts.get('--cols',6)); tw=int(opts.get('--w',360))
t0,t1,step,out=float(a[0]),float(a[1]),float(a[2]),a[3]
roi=[int(v) for v in a[4:8]] if len(a)>=8 else None
c=cv2.VideoCapture(V); fps=c.get(5); tiles=[]; t=t0
while t<=t1+1e-6:
    c.set(cv2.CAP_PROP_POS_FRAMES,int(round(t*fps))); ok,f=c.read()
    if not ok: break
    if roi: f=f[roi[1]:roi[3],roi[0]:roi[2]]
    th=int(f.shape[0]*tw/f.shape[1]); f=cv2.resize(f,(tw,th),interpolation=cv2.INTER_AREA)
    cv2.putText(f,f"{t:.2f}",(4,16),0,0.5,(0,255,255),1); tiles.append(f); t+=step
while len(tiles)%cols: tiles.append(np.zeros_like(tiles[0]))
rows=[np.hstack(tiles[i:i+cols]) for i in range(0,len(tiles),cols)]
cv2.imwrite(out,np.vstack(rows),[cv2.IMWRITE_JPEG_QUALITY,88]); print(out,len(tiles),'tiles')
