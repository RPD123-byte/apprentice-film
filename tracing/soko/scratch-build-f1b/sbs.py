#!/usr/bin/env python3
# sbs.py render.png ref.png out.jpg [x0 y0 x1 y1] [scale] [--h]  : render above ref (or side by side with --h), cropped
import cv2, sys, numpy as np
a=cv2.imread(sys.argv[1]); b=cv2.imread(sys.argv[2]); out=sys.argv[3]
args=[v for v in sys.argv[4:] if not v.startswith('--')]
if len(args)>=4:
    x0,y0,x1,y1=[int(v) for v in args[:4]]; a=a[y0:y1,x0:x1]; b=b[y0:y1,x0:x1]
sc=float(args[4]) if len(args)>4 else 1
if sc!=1: a=cv2.resize(a,None,fx=sc,fy=sc,interpolation=cv2.INTER_AREA if sc<1 else cv2.INTER_CUBIC); b=cv2.resize(b,None,fx=sc,fy=sc,interpolation=cv2.INTER_AREA if sc<1 else cv2.INTER_CUBIC)
im=np.hstack([a,np.full((a.shape[0],4,3),(0,200,255),np.uint8),b]) if '--h' in sys.argv else np.vstack([a,np.full((4,a.shape[1],3),(0,200,255),np.uint8),b])
cv2.imwrite(out,im,[cv2.IMWRITE_JPEG_QUALITY,88])
