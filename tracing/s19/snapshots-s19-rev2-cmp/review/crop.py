import cv2, sys, numpy as np
# usage: crop.py T x0 y0 x1 y1 out [scale] [grid]
d='snapshots/s19-rev2-cmp'
t=sys.argv[1]; x0,y0,x1,y1=map(int,sys.argv[2:6]); out=sys.argv[6]; sc=float(sys.argv[7]) if len(sys.argv)>7 else 1.0
src=sys.argv[8] if len(sys.argv)>8 else d
import glob
f=glob.glob(f'{src}/frame-*-at-{t}s.png')[0]
r=cv2.imread(f); s=cv2.imread(f.replace('frame-','ref-'))
def g(im):
    c=im[y0:y1,x0:x1].copy()
    step=50
    for x in range((x0//step+1)*step,x1,step):
        cv2.line(c,(x-x0,0),(x-x0,8 if x%100 else 16),(0,0,255),1)
        if x%100==0: cv2.putText(c,str(x),(x-x0+2,26),0,0.4,(0,0,255),1)
    for y in range((y0//step+1)*step,y1,step):
        cv2.line(c,(0,y-y0),(8 if y%100 else 16,y-y0),(0,0,255),1)
        if y%100==0: cv2.putText(c,str(y),(2,y-y0-2),0,0.4,(0,0,255),1)
    return c
a=g(r); b=g(s)
im=np.hstack([a,np.full((a.shape[0],6,3),(0,255,255),np.uint8),b]) if (x1-x0)<=(y1-y0)*1.6 else np.vstack([a,np.full((6,a.shape[1],3),(0,255,255),np.uint8),b])
if sc!=1: im=cv2.resize(im,None,fx=sc,fy=sc,interpolation=cv2.INTER_AREA)
cv2.imwrite(out,im,[cv2.IMWRITE_JPEG_QUALITY,90])
