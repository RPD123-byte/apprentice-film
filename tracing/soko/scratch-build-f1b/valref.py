#!/usr/bin/env python3
# valref.py in.png out.npy [sigma] : pre-grade value map of a graded frame (undo vignette + S-curve), blurred.
import cv2, numpy as np, sys
im=cv2.imread(sys.argv[1]).astype(np.float64)/255; g=im.mean(2)
H,W=g.shape; yy,xx=np.mgrid[0:H,0:W]; q=((xx/W-0.5)*2)**2+((yy/H-0.5)*2)**2; vig=1-0.38*np.clip(q/2,0,1)**1.15
lx=np.linspace(0,1,4001); ly=lx*0.65+0.35*lx*lx*(3-2*lx)
v=np.interp(np.clip(g/vig,0,1),ly,lx)
s=float(sys.argv[3]) if len(sys.argv)>3 else 0
if s>0: v=cv2.GaussianBlur(v,(0,0),s)
np.save(sys.argv[2],v.astype(np.float32)); print('saved',sys.argv[2],v.shape,v.mean())
