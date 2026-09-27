#!/usr/bin/env python3
# contour2.py src.png x0 y0 x1 y1 thr eps blur minarea -> JSON list of rings (outer and holes; fill even-odd), frame px
import cv2, numpy as np, json, sys
g=cv2.imread(sys.argv[1],0).astype(np.float32)
x0,y0,x1,y1=[int(v) for v in sys.argv[2:6]]; thr=float(sys.argv[6]); eps=float(sys.argv[7]); bl=float(sys.argv[8]); mina=float(sys.argv[9])
b=cv2.GaussianBlur(g,(0,0),bl)[y0:y1,x0:x1]
m=(b>thr).astype(np.uint8)
cs,hier=cv2.findContours(m,cv2.RETR_CCOMP,cv2.CHAIN_APPROX_NONE)
out=[]
for c in cs:
  if abs(cv2.contourArea(c))<mina: continue
  a=cv2.approxPolyDP(c,eps,True)[:,0,:]
  if len(a)<3: continue
  out.append([[int(p[0]+x0),int(p[1]+y0)] for p in a])
print(json.dumps(out))
