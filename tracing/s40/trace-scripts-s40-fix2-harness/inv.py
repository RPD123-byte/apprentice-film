#!/usr/bin/env python3
# inv.py T name:x,y[,r] ... : source graded colour -> pre-grade colour needed at that point (halation from the current raw render)
import cv2, sys, os, numpy as np
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from grade import *
Hd=os.path.dirname(os.path.abspath(__file__))
t=float(sys.argv[1]); fi=int(round(t*25))
src=cv2.imread(f'{Hd}/src/f{fi}.png')[:,:,::-1].astype(float)/255
raw=cv2.imread(f'{Hd}/raw/r-{t:.3f}.png')[:,:,::-1].astype(np.float32)/255
ren=cv2.imread(f'{Hd}/out/r-{t:.3f}.png')[:,:,::-1].astype(float)/255
hb=hb_map(raw)
hx=lambda c:'#%02x%02x%02x'%tuple(int(round(v*255)) for v in c)
for a in sys.argv[2:]:
    n,xy=a.split(':'); v=[int(float(q)) for q in xy.split(',')]; x,y=v[0],v[1]; k=v[2] if len(v)>2 else 1
    cs=src[y-k:y+k+1,x-k:x+k+1].reshape(-1,3).mean(0); cr=ren[y-k:y+k+1,x-k:x+k+1].reshape(-1,3).mean(0); cw=raw[y-k:y+k+1,x-k:x+k+1].reshape(-1,3).mean(0)
    fw=forward(raw,hb,t,x,y); need=inverse(cs,hb,t,x,y)
    print(f'{n:12s} ({x},{y}) src {hx(cs)}  ren {hx(cr)} (model {hx(fw)})  raw {hx(cw)}  -> need pre {hx(need)}  hb {hx(hb[y,x])}')
