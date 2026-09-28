#!/usr/bin/env python3
# dcmp.py DBGDIR key frame x0 y0 x1 y1 out [scale] : drawing alone | source key frame crop
import cv2, numpy as np, sys
d,k,f=sys.argv[1],sys.argv[2],int(sys.argv[3]); x0,y0,x1,y1=map(int,sys.argv[4:8]); out=sys.argv[8]; sc=float(sys.argv[9]) if len(sys.argv)>9 else 1
r=cv2.imread(f'{d}/d-{k}.png')[y0:y1,x0:x1]; s=cv2.imread(f'/Users/computer/rootline/apprentice-film/snapshots/s25-fix1-src/f{f:05d}.png')[y0:y1,x0:x1]
im=np.hstack([r,np.full((r.shape[0],4,3),(0,200,255),np.uint8),s])
if sc!=1: im=cv2.resize(im,None,fx=sc,fy=sc,interpolation=cv2.INTER_AREA)
cv2.imwrite(out,im)
