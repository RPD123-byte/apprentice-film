#!/usr/bin/env python3
# samp.py T name:x,y[,r] ...  -> mean colour (hex) of source and render (r-T.png) in a (2r+1)^2 box
import cv2, sys, os, numpy as np
H=os.path.dirname(os.path.abspath(__file__))
t=float(sys.argv[1]); fi=int(round(t*25))
sp=f'{H}/src/f{fi}.png'
if not os.path.exists(sp):
    c=cv2.VideoCapture('/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'); c.set(cv2.CAP_PROP_POS_FRAMES,fi); ok,fr=c.read(); cv2.imwrite(sp,fr)
s=cv2.imread(sp); r=cv2.imread(f'{H}/out/r-{t:.3f}.png')
hx=lambda c:'#%02x%02x%02x'%(int(c[2]),int(c[1]),int(c[0]))
for a in sys.argv[2:]:
    n,xy=a.split(':'); v=[int(float(q)) for q in xy.split(',')]; x,y=v[0],v[1]; k=v[2] if len(v)>2 else 1
    cs=s[y-k:y+k+1,x-k:x+k+1].reshape(-1,3).mean(0); cr=r[y-k:y+k+1,x-k:x+k+1].reshape(-1,3).mean(0) if r is not None else [0,0,0]
    Ls=cs@[0.114,0.587,0.299]; Lr=np.array(cr)@[0.114,0.587,0.299]
    print(f'{n:14s} ({x},{y}) src {hx(cs)} L{Ls:5.1f}   ren {hx(cr)} L{Lr:5.1f}')
