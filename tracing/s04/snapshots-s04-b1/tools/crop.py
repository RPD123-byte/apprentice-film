# crop.py DIR T x0 y0 x1 y1 out.jpg [scale] : render (top) vs source (bottom) crop from compare.sh output
import cv2, glob, sys, numpy as np
d,t=sys.argv[1],sys.argv[2]; x0,y0,x1,y1=map(int,sys.argv[3:7]); out=sys.argv[7]; s=float(sys.argv[8]) if len(sys.argv)>8 else 1
fa=[f for f in glob.glob(d+'/frame-*.png') if f"at-{t}s" in f][0]
a=cv2.imread(fa)[y0:y1,x0:x1]; b=cv2.imread(fa.replace('frame-','ref-'))[y0:y1,x0:x1]
im=np.vstack([a,np.full((4,a.shape[1],3),(0,0,255),np.uint8),b])
if s!=1: im=cv2.resize(im,None,fx=s,fy=s,interpolation=cv2.INTER_AREA if s<1 else cv2.INTER_CUBIC)
cv2.imwrite(out,im,[cv2.IMWRITE_JPEG_QUALITY,90])
