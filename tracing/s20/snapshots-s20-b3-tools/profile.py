#!/usr/bin/env python3
# profile.py x0 y0 x1 y1 n [band] : pre-grade plate values (inverse S + vignette, /0.943) sampled along a segment,
# averaged over a band (px) across it, from the owl-free source composite
import cv2, numpy as np, sys
s=cv2.cvtColor(cv2.imread('/Users/computer/rootline/apprentice-film/snapshots/s20-b3-study/cleanA.png'),cv2.COLOR_BGR2GRAY).astype(np.float32)/255
H,W=s.shape
x0,y0,x1,y1,n=[float(v) for v in sys.argv[1:6]]; band=int(sys.argv[6]) if len(sys.argv)>6 else 16
lut=np.linspace(0,1,2001); out=lut*0.65+0.35*lut*lut*(3-2*lut)
b=cv2.blur(s,(band,band))
vals=[]
for k in range(int(n)):
    t=k/(n-1); x=x0+(x1-x0)*t; y=y0+(y1-y0)*t
    qx=(x/W-0.5)*2; qy=(y/H-0.5)*2; vig=1-0.38*min(1,(qx*qx+qy*qy)/2)**1.15
    g=b[int(y),int(x)]/vig; f=np.interp(min(1,g),out,lut)
    vals.append(round(min(1,f/0.943),2))
print(vals)
