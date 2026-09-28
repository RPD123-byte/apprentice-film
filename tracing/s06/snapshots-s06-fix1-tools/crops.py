#!/usr/bin/env python3
# crops.py DIR T x0 y0 x1 y1 zoom name : render | source crop (source frame the render shows)
import cv2, numpy as np, sys, glob, re
d=sys.argv[1]; T=float(sys.argv[2]); x0,y0,x1,y1=[int(v) for v in sys.argv[3:7]]; z=float(sys.argv[7]); nm=sys.argv[8]
f=[p for p in glob.glob(d+'/frame-*.png') if abs(float(re.search(r'at-([\d.]+)s',p).group(1))-T)<1e-3][0]
k=int(np.floor(T*30+1e-6)); i=int(np.floor(k/30*25+1e-3))
c=cv2.VideoCapture('/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'); c.set(1,i); ok,b=c.read()
a=cv2.imread(f)
vert='--v' in sys.argv
im=(np.vstack if vert else np.hstack)([a[y0:y1,x0:x1],b[y0:y1,x0:x1]])
if z!=1: im=cv2.resize(im,None,fx=z,fy=z,interpolation=cv2.INTER_CUBIC if z>1 else cv2.INTER_AREA)
cv2.imwrite(f'{d}/{nm}.jpg',im,[cv2.IMWRITE_JPEG_QUALITY,92])
