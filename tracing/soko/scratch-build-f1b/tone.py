#!/usr/bin/env python3
# tone.py render.png ref.png out.jpg [sigma] : blurred luminance render | ref | diff (red = render too bright, blue = too dark)
import cv2, sys, numpy as np
a=cv2.imread(sys.argv[1],0).astype(np.float32); b=cv2.imread(sys.argv[2],0).astype(np.float32); out=sys.argv[3]
s=float(sys.argv[4]) if len(sys.argv)>4 else 10
ba=cv2.GaussianBlur(a,(0,0),s); bb=cv2.GaussianBlur(b,(0,0),s); d=ba-bb
h=np.zeros(a.shape+(3,),np.float32); h[...,2]=np.clip(d*3,0,255); h[...,0]=np.clip(-d*3,0,255)
sm=lambda x: cv2.resize(x,None,fx=0.5,fy=0.5,interpolation=cv2.INTER_AREA)
im=np.vstack([np.dstack([sm(ba)]*3),np.dstack([sm(bb)]*3),sm(h)]).clip(0,255).astype(np.uint8)
cv2.imwrite(out,im,[cv2.IMWRITE_JPEG_QUALITY,85])
# grid report: mean diff per 200x200 cell
H,W=a.shape
for y in range(0,H,200):
    print(' '.join('%+4d'%int(d[y:y+200,x:x+200].mean()) for x in range(0,W,200)))
