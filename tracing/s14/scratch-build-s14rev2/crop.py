#!/usr/bin/env python3
# crop.py DIR T x0 y0 x1 y1 out.jpg [scale] [gamma] -> render|source crop stacked side by side with grid
import cv2, sys, glob, re, numpy as np
d,t=sys.argv[1],sys.argv[2]
x0,y0,x1,y1=map(int,sys.argv[3:7]); out=sys.argv[7]
sc=float(sys.argv[8]) if len(sys.argv)>8 else 1.0
gam=float(sys.argv[9]) if len(sys.argv)>9 else 1.0
def find(pfx):
    for p in glob.glob(f"{d}/{pfx}-*-at-*s.png"):
        m=re.search(r'at-([\d.]+)s',p)
        if abs(float(m.group(1))-float(t))<1e-4: return p
    raise SystemExit('missing '+pfx+' '+t)
ims=[]
for pfx in ('frame','ref'):
    im=cv2.imread(find(pfx))[y0:y1,x0:x1].astype(np.float32)/255
    im=(im**(1/gam)*255).clip(0,255).astype(np.uint8)
    im=cv2.resize(im,None,fx=sc,fy=sc,interpolation=cv2.INTER_AREA if sc<1 else cv2.INTER_CUBIC)
    # grid every 50 px in frame coords
    step=50 if (x1-x0)<900 else 100
    for gx in range((x0//step+1)*step,x1,step):
        X=int((gx-x0)*sc); cv2.line(im,(X,0),(X,im.shape[0]),(0,0,160),1)
        cv2.putText(im,str(gx),(X+2,12),cv2.FONT_HERSHEY_SIMPLEX,0.4,(0,0,255),1)
    for gy in range((y0//step+1)*step,y1,step):
        Y=int((gy-y0)*sc); cv2.line(im,(0,Y),(im.shape[1],Y),(0,0,160),1)
        cv2.putText(im,str(gy),(2,Y-2),cv2.FONT_HERSHEY_SIMPLEX,0.4,(0,0,255),1)
    cv2.putText(im,pfx+' '+t,(5,im.shape[0]-8),cv2.FONT_HERSHEY_SIMPLEX,0.6,(0,255,255),2)
    ims.append(im)
sep=np.full((ims[0].shape[0],6,3),(0,200,0),np.uint8)
cv2.imwrite(out,np.hstack([ims[0],sep,ims[1]]),[cv2.IMWRITE_JPEG_QUALITY,90])
print(out)
