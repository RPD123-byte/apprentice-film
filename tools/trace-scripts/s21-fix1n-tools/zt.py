#!/usr/bin/env python3
# zt.py OUTNAME t X0 Y0 X1 Y1 z out.jpg : zoom a harness tile pair (render | source) from out-OUTNAME/t
import cv2, glob, sys, numpy as np, re
name,t=sys.argv[1],float(sys.argv[2]); X0,Y0,X1,Y1=[int(v) for v in sys.argv[3:7]]; z=float(sys.argv[7]); out=sys.argv[8]
d=f'/Users/computer/rootline/apprentice-film/snapshots/s21-fix1n-h/out-{name}/t/'
for f in glob.glob(d+f'r-{t:.2f}-*.png'):
    x0,y0=[int(v) for v in re.search(r'-(\d+)-(\d+)\.png$',f).groups()]
    a=cv2.imread(f); b=cv2.imread(f.replace('/r-','/s-'))
    if X0<x0 or Y0<y0 or X1>x0+a.shape[1] or Y1>y0+a.shape[0]: continue
    c=lambda im: cv2.resize(im[Y0-y0:Y1-y0,X0-x0:X1-x0],None,fx=z,fy=z,interpolation=cv2.INTER_CUBIC)
    A,B=c(a),c(b); cv2.imwrite(out,np.hstack([A,np.full((A.shape[0],6,3),(0,0,255),np.uint8),B]),[cv2.IMWRITE_JPEG_QUALITY,90]); break
