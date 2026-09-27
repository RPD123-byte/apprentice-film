#!/usr/bin/env python3
# zoom.py DIR T x0 y0 x1 y1 out.jpg [--z 4] : render (top) over source (bottom) crop with frame-px ticks
import cv2, glob, re, sys, numpy as np
d,t=sys.argv[1],float(sys.argv[2]); x0,y0,x1,y1=[int(v) for v in sys.argv[3:7]]; out=sys.argv[7]
a=sys.argv[8:]; z=float(a[a.index('--z')+1]) if '--z' in a else 4
fs=[f for f in glob.glob(d+'/frame-*.png') if abs(float(re.search(r'at-([\d.]+)s',f).group(1))-t)<1e-4]
f=fs[0]; A=cv2.imread(f); B=cv2.imread(f.replace('frame-','ref-'))
def tk(im):
    im=cv2.resize(im[y0:y1,x0:x1],None,fx=z,fy=z,interpolation=cv2.INTER_CUBIC)
    for x in range((x0//20+1)*20,x1,20):
        X=int((x-x0)*z); cv2.line(im,(X,0),(X,8),(0,255,255),1); cv2.putText(im,str(x),(X+1,20),0,0.4,(0,255,255),1)
    for y in range((y0//20+1)*20,y1,20):
        Y=int((y-y0)*z); cv2.line(im,(0,Y),(8,Y),(0,255,255),1); cv2.putText(im,str(y),(10,Y+4),0,0.4,(0,255,255),1)
    return im
ra,rb=tk(A),tk(B)
sep=np.full((4,ra.shape[1],3),(0,0,255),np.uint8)
cv2.imwrite(out,np.vstack([ra,sep,rb]),[cv2.IMWRITE_JPEG_QUALITY,90])
