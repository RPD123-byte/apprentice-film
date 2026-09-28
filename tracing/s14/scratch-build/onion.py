#!/usr/bin/env python3
# onion.py render.png ref.png out.jpg [x0 y0 x1 y1] [scale] : render in magenta, reference in green (grey = agree)
# also prints mean abs diff of blurred luminance (tone error) over the crop
import cv2, sys, numpy as np
a=cv2.imread(sys.argv[1],0).astype(np.float32); b=cv2.imread(sys.argv[2],0).astype(np.float32); out=sys.argv[3]
args=sys.argv[4:]
if len(args)>=4:
    x0,y0,x1,y1=[int(v) for v in args[:4]]; a=a[y0:y1,x0:x1]; b=b[y0:y1,x0:x1]
sc=float(args[4]) if len(args)>4 else 1
im=np.dstack([a,b,a]).clip(0,255).astype(np.uint8)
if sc!=1: im=cv2.resize(im,None,fx=sc,fy=sc,interpolation=cv2.INTER_AREA if sc<1 else cv2.INTER_CUBIC)
cv2.imwrite(out,im,[cv2.IMWRITE_JPEG_QUALITY,88])
ba=cv2.GaussianBlur(a,(0,0),8); bb=cv2.GaussianBlur(b,(0,0),8)
print('tone MAE %.1f  mean render %.1f ref %.1f'%(np.abs(ba-bb).mean(),a.mean(),b.mean()))
