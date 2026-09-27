#!/usr/bin/env python3
# ov.py T x0 y0 x1 y1 scale out.jpg polys.json [--render] -> source crop (or render crop) with polylines drawn on top
import cv2, sys, json, os, numpy as np
H=os.path.dirname(os.path.abspath(__file__))
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
t=float(sys.argv[1]); x0,y0,x1,y1=[int(v) for v in sys.argv[2:6]]; s=int(sys.argv[6]); out=sys.argv[7]; polys=json.load(open(sys.argv[8]))
if '--render' in sys.argv: f=cv2.imread(f'{H}/out/r-{t:.3f}.png')
else:
    fi=int(round(t*25)); p=f'{H}/src/f{fi}.png'
    if not os.path.exists(p):
        c=cv2.VideoCapture(V); c.set(cv2.CAP_PROP_POS_FRAMES,fi); ok,fr=c.read(); cv2.imwrite(p,fr)
    f=cv2.imread(p)
im=cv2.resize(f[y0:y1,x0:x1],None,fx=s,fy=s,interpolation=cv2.INTER_NEAREST)
cols=[(0,255,0),(255,255,0),(255,0,255),(0,255,255),(255,128,0),(0,128,255)]
for k,(name,pts) in enumerate(polys.items()):
    P=np.array([[(x-x0+0.5)*s,(y-y0+0.5)*s] for x,y in pts],np.int32)
    closed = name.endswith('*')
    cv2.polylines(im,[P],closed,cols[k%len(cols)],1,cv2.LINE_AA)
    for p in P: cv2.circle(im,tuple(int(v) for v in p),2,cols[k%len(cols)],-1)
cv2.imwrite(out,im,[cv2.IMWRITE_JPEG_QUALITY,92])
