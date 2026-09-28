#!/usr/bin/env python3
# tone.py img.png "x,y,r;x,y,r;..." -> blurred source mean at each (box r), and the pre-grade plate value that
# reproduces it (inverse of post.js S-curve + vignette; halation ignored; /0.943 for the engraving's ink coverage)
import cv2, numpy as np, sys
im=cv2.cvtColor(cv2.imread(sys.argv[1]),cv2.COLOR_BGR2GRAY).astype(np.float32)/255
H,W=im.shape
def vig(x,y):
    qx=(x/W-0.5)*2; qy=(y/H-0.5)*2; r=min(1,(qx*qx+qy*qy)/2); return 1-0.38*r**1.15
def S(f): return f*0.65+0.35*f*f*(3-2*f)
def inv(g):
    lo,hi=0.0,1.0
    for _ in range(40):
        m=(lo+hi)/2
        if S(m)<g: lo=m
        else: hi=m
    return lo
for tok in sys.argv[2].split(';'):
    x,y,r=[float(v) for v in tok.split(',')]; x,y,r=int(x),int(y),int(r)
    m=im[max(0,y-r):y+r+1,max(0,x-r):x+r+1].mean()
    f=inv(min(1,m/vig(x,y)))
    print(f"({x},{y}) src={m*255:6.1f}  pre={f:.3f}  plate_v={min(1,f/0.943):.3f}")
