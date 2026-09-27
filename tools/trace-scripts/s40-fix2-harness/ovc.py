#!/usr/bin/env python3
# ovc.py T x0 y0 x1 y1 scale out.jpg layers.json : draw the outer silhouette of each layer (union of circles) on the source
import cv2, sys, json, os, numpy as np
H=os.path.dirname(os.path.abspath(__file__))
t=float(sys.argv[1]); x0,y0,x1,y1=[int(v) for v in sys.argv[2:6]]; s=int(sys.argv[6]); out=sys.argv[7]; layers=json.load(open(sys.argv[8]))
f=cv2.imread(f'{H}/src/f{int(round(t*25))}.png')
im=cv2.resize(f[y0:y1,x0:x1],None,fx=s,fy=s,interpolation=cv2.INTER_AREA if s<1 else cv2.INTER_NEAREST)
cols=[(0,255,0),(255,255,0),(255,0,255),(0,255,255),(255,128,0),(0,128,255),(128,255,128)]
for k,L in enumerate(layers):
    m=np.zeros((y1-y0,x1-x0),np.uint8)
    for x,y,r in L: cv2.circle(m,(int(round(x-x0)),int(round(y-y0))),int(round(r)),255,-1)
    m=cv2.resize(m,None,fx=s,fy=s,interpolation=cv2.INTER_NEAREST)
    cs,_=cv2.findContours(m,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE)
    cv2.drawContours(im,cs,-1,cols[k%len(cols)],1)
cv2.imwrite(out,im,[cv2.IMWRITE_JPEG_QUALITY,92])
