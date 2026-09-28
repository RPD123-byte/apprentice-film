#!/usr/bin/env python3
# measurement-only: temporal median of source frames (removes the moving owl) -> png in study dir
import cv2, numpy as np, sys
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
t0,t1,st,out=float(sys.argv[1]),float(sys.argv[2]),float(sys.argv[3]),sys.argv[4]
c=cv2.VideoCapture(V); fs=[]
t=t0
while t<=t1+1e-6:
    c.set(cv2.CAP_PROP_POS_FRAMES,int(round(t*25))); ok,f=c.read(); fs.append(f); t+=st
cv2.imwrite(out,np.median(np.stack(fs),0).astype(np.uint8))
