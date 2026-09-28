#!/usr/bin/env python3
# ov.py F [F2 ...] [--js path.js] [--crop x0 y0 x1 y1] -> snapshots/s15-p4/ov/<f>.jpg : quads over the source frame, grid
import os
for _k in ('OPENBLAS_NUM_THREADS','OMP_NUM_THREADS','VECLIB_MAXIMUM_THREADS','MKL_NUM_THREADS'): os.environ.setdefault(_k,'1')
import sys, os, cv2, numpy as np
sys.path.insert(0,os.path.dirname(__file__)); from common import *
a=sys.argv[1:]; js=None; crop=None; fs=[]; fine=False
i=0
while i<len(a):
    if a[i]=='--js': js=a[i+1]; i+=2
    elif a[i]=='--crop': crop=[int(v) for v in a[i+1:i+5]]; i+=5
    elif a[i]=='--fine': fine=True; i+=1
    else: fs.append(int(a[i])); i+=1
os.makedirs(ROOT+'/snapshots/s15-p4/ov',exist_ok=True)
D=jsdata(js) if js else None
COL=[(0,255,255),(255,128,0),(0,255,0),(255,0,255),(0,128,255),(255,255,0),(128,255,128),(0,0,255),(255,0,0),(200,200,255)]
for f in fs:
    im=frame(f).copy()
    if D: faces=[(r[0],np.array(r[1:9]).reshape(4,2),{}) for r in D['frames'].get(str(f),[])]
    else: faces=load(f) or []
    st=50 if fine else 100
    for x in range(0,W,st):
        cv2.line(im,(x,0),(x,H),(0,90,140) if x%100 else (0,0,200) if x%500==0 else (0,140,210),1)
        if x%100==0: [cv2.putText(im,str(x),(x+2,yy),0,0.4,(0,220,255),1) for yy in ((12,480,940) if fine else (12,))]
    for y in range(0,H,st):
        cv2.line(im,(0,y),(W,y),(0,90,140) if y%100 else (0,0,200) if y%500==0 else (0,140,210),1)
        if y%100==0: [cv2.putText(im,str(y),(xx,y-3),0,0.4,(0,220,255),1) for xx in ((2,1060,2170) if fine else (2,))]
    for k,(fid,q,opt) in enumerate(faces):
        c=COL[k%len(COL)]; p=np.round(q).astype(np.int32)
        cv2.polylines(im,[p],True,c,2)
        for j in range(4): cv2.circle(im,tuple(p[j]),5 if j==0 else 3,c,-1)
        cx,cy=np.clip(q.mean(0),[10,20],[W-60,H-10]).astype(int)
        cv2.putText(im,fid,(cx-15,cy),0,0.7,(0,0,0),4); cv2.putText(im,fid,(cx-15,cy),0,0.7,c,2)
    cv2.putText(im,f'{f} ({f/25:.2f})',(W-230,40),0,1,(0,255,255),2)
    o=owl(f); cv2.rectangle(im,(int(o[1]-o[3]/2),int(o[2]-o[4]/2)),(int(o[1]+o[3]/2),int(o[2]+o[4]/2)),(80,80,80),1)
    if fine:
        cv2.imwrite(f'{ROOT}/snapshots/s15-p4/ov/{f}L.jpg',im[:,0:1150],[cv2.IMWRITE_JPEG_QUALITY,88])
        cv2.imwrite(f'{ROOT}/snapshots/s15-p4/ov/{f}R.jpg',im[:,1056:],[cv2.IMWRITE_JPEG_QUALITY,88])
    if crop: im=cv2.resize(im[crop[1]:crop[3],crop[0]:crop[2]],None,fx=2,fy=2)
    cv2.imwrite(f'{ROOT}/snapshots/s15-p4/ov/{f}.jpg',im,[cv2.IMWRITE_JPEG_QUALITY,88]); print('ov',f,len(faces))
