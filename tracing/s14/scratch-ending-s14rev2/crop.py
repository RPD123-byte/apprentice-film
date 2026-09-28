# usage: crop.py DIR T x0 y0 x1 y1 out.png [scale] [gain]  -> render | source side by side crop
import cv2, sys, glob, numpy as np
d,t=sys.argv[1],sys.argv[2]
x0,y0,x1,y1=map(int,sys.argv[3:7]); out=sys.argv[7]
sc=float(sys.argv[8]) if len(sys.argv)>8 else 1.0
gain=float(sys.argv[9]) if len(sys.argv)>9 else 1.0
def f(pref):
    c=[p for p in glob.glob(f'{d}/{pref}-*-at-{t}s.png')]
    return cv2.imread(c[0])
r,s=f('frame'),f('ref')
a=r[y0:y1,x0:x1]; b=s[y0:y1,x0:x1]
if gain!=1: a=np.clip(a*gain,0,255).astype(np.uint8); b=np.clip(b*gain,0,255).astype(np.uint8)
sep=np.full((a.shape[0],6,3),(0,0,255),np.uint8)
im=np.hstack([a,sep,b])
if sc!=1: im=cv2.resize(im,None,fx=sc,fy=sc,interpolation=cv2.INTER_AREA if sc<1 else cv2.INTER_CUBIC)
cv2.imwrite(out,im)
