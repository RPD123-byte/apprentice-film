#!/usr/bin/env python3
# contour.py src.png x0 y0 x1 y1 thr eps [blur] -> JSON of lit-region contours inside the box (frame px)
import cv2, numpy as np, json, sys
g=cv2.imread(sys.argv[1],0).astype(np.float32)
x0,y0,x1,y1=[int(v) for v in sys.argv[2:6]]; thr=float(sys.argv[6]); eps=float(sys.argv[7]); bl=float(sys.argv[8]) if len(sys.argv)>8 else 1.2
b=cv2.GaussianBlur(g,(0,0),bl)[y0:y1,x0:x1]
m=(b>thr).astype(np.uint8)
cs,_=cv2.findContours(m,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE)
out=[]
for c in cs:
  if cv2.contourArea(c)<60: continue
  a=cv2.approxPolyDP(c,eps,True)[:,0,:]
  out.append([[int(p[0]+x0),int(p[1]+y0)] for p in a])
print(json.dumps(out))
