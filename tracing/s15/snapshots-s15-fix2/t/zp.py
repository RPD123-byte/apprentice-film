#!/usr/bin/env python3
# zp.py RENDERDIR OUT.jpg F x0 y0 x1 y1 [F2 ...]: render crop | source crop (stacked rows for several frames)
import cv2, numpy as np, sys
SRC='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
cap=cv2.VideoCapture(SRC)
def src(f): cap.set(cv2.CAP_PROP_POS_FRAMES,f); ok,im=cap.read(); return im
d,out=sys.argv[1],sys.argv[2]; a=sys.argv[3:]
rows=[]
x0,y0,x1,y1=map(int,a[1:5]); fr=[int(a[0])]+[int(x) for x in a[5:]]
for f in fr:
    r=cv2.imread(f'{d}/r{f}.png'); s=src(f)
    if r is None: r=np.zeros_like(s)
    rc=r[y0:y1,x0:x1]; sc=s[y0:y1,x0:x1]
    im=np.hstack([rc,np.full((rc.shape[0],6,3),(0,0,255),np.uint8),sc])
    cv2.putText(im,f'{f} {f/25:.2f}',(6,22),0,0.7,(0,255,255),2)
    rows.append(im)
im=np.vstack(rows)
if im.shape[1]>2200: im=cv2.resize(im,(2200,int(im.shape[0]*2200/im.shape[1])),interpolation=cv2.INTER_AREA)
cv2.imwrite(out,im,[cv2.IMWRITE_JPEG_QUALITY,88]); print(out)
