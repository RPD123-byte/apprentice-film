#!/usr/bin/env python3
# featherov.py SPEC.json OUT.jpg x0 y0 x1 y1 [scale]: draw feather outlines (root, tip, width, bend) and polylines over
# the reference crop, to check authored geometry against the source (measurement aid only)
import sys, json, math, cv2, numpy as np
a=sys.argv; spec=json.load(open(a[1])); out=a[2]; x0,y0,x1,y1=[int(v) for v in a[3:7]]; sc=float(a[7]) if len(a)>7 else 3
img=cv2.imread('TB.png')[y0:y1,x0:x1]; img=cv2.resize(img,None,fx=sc,fy=sc,interpolation=cv2.INTER_CUBIC)
P=lambda p:(int(round((p[0]-x0)*sc)),int(round((p[1]-y0)*sc)))
def feather(a,b,w,bend=0.08):
    dx,dy=b[0]-a[0],b[1]-a[1]; L=math.hypot(dx,dy); nx,ny=-dy/L,dx/L
    m=lambda t,s:(a[0]+dx*t+nx*(s*w+bend*L*math.sin(math.pi*t)),a[1]+dy*t+ny*(s*w+bend*L*math.sin(math.pi*t)))
    return [m(0,-0.5),m(0.3,-0.5),m(0.62,-0.44),m(0.86,-0.24),b,m(0.86,0.24),m(0.62,0.48),m(0.3,0.52),m(0,0.5)]
cols=[(0,0,255),(0,255,0),(255,0,0),(0,255,255),(255,0,255),(255,255,0)]
for i,f in enumerate(spec.get('feathers',[])):
    pts=feather(f[0],f[1],f[2],f[3] if len(f)>3 else 0.08)
    cv2.polylines(img,[np.array([P(p) for p in pts],np.int32)],False,cols[i%6],1,cv2.LINE_AA)
for i,l in enumerate(spec.get('lines',[])):
    cv2.polylines(img,[np.array([P(p) for p in l],np.int32)],False,cols[(i+3)%6],1,cv2.LINE_AA)
cv2.imwrite(out,img,[cv2.IMWRITE_JPEG_QUALITY,88])
