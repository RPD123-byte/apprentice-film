#!/usr/bin/env python3
# prof.py REF x0 y0 x1 y1 [step] [sig]: pre-grade value (x100, blurred) along a segment; marks strong steps
import sys, numpy as np, cv2
ref=sys.argv[1]; x0,y0,x1,y1=[float(v) for v in sys.argv[2:6]]
step=float(sys.argv[6]) if len(sys.argv)>6 else 2; sig=float(sys.argv[7]) if len(sys.argv)>7 else 1.5
u=cv2.GaussianBlur(np.load(f'{ref}_u.npy').mean(2),(0,0),sig)
n=int(np.hypot(x1-x0,y1-y0)/step)+1
out=[]
for i in range(n):
    t=i/(n-1) if n>1 else 0; x=x0+(x1-x0)*t; y=y0+(y1-y0)*t
    v=cv2.getRectSubPix(u.astype(np.float32),(1,1),(x,y))[0,0]
    out.append((x,y,v))
print(' '.join(f'{x:.0f},{y:.0f}:{v*100:.0f}' for x,y,v in out))
