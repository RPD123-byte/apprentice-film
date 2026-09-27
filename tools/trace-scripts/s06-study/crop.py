#!/usr/bin/env python3
# crop.py DIR IDX x0 y0 x1 y1 zoom out [mode]  -> render | source crops (mode 'blend' adds a 3rd panel: R=render G=source)
import cv2, sys, glob, numpy as np
d, idx = sys.argv[1], sys.argv[2]
x0,y0,x1,y1=[int(v) for v in sys.argv[3:7]]; z=float(sys.argv[7]); out=sys.argv[8]; mode=sys.argv[9] if len(sys.argv)>9 else ''
fr=cv2.imread(sorted(glob.glob(f'{d}/frame-{idx}-*.png'))[0]); rf=cv2.imread(sorted(glob.glob(f'{d}/ref-{idx}-*.png'))[0])
if rf.shape!=fr.shape: rf=cv2.resize(rf,(fr.shape[1],fr.shape[0]))
a=fr[y0:y1,x0:x1]; b=rf[y0:y1,x0:x1]
ps=[a,b]
if mode=='blend':
    ga=cv2.cvtColor(a,cv2.COLOR_BGR2GRAY); gb=cv2.cvtColor(b,cv2.COLOR_BGR2GRAY)
    ps.append(cv2.merge([np.zeros_like(ga),gb,ga]))
im=np.hstack([cv2.resize(p,None,fx=z,fy=z,interpolation=cv2.INTER_AREA if z<1 else cv2.INTER_CUBIC) for p in ps])
cv2.imwrite(out,im,[cv2.IMWRITE_JPEG_QUALITY,88])
