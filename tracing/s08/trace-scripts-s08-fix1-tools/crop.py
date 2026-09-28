# crop.py render.png ref.png x0 y0 x1 y1 out.jpg [scale]  -> render crop over ref crop (stacked vertically, or side by side if wide<tall)
import cv2, sys, numpy as np
a=cv2.imread(sys.argv[1]); b=cv2.imread(sys.argv[2])
x0,y0,x1,y1=map(int,sys.argv[3:7]); out=sys.argv[7]; s=float(sys.argv[8]) if len(sys.argv)>8 else 1
ca=a[y0:y1,x0:x1]; cb=b[y0:y1,x0:x1]
if s!=1: ca=cv2.resize(ca,None,fx=s,fy=s,interpolation=cv2.INTER_NEAREST if s>1 else cv2.INTER_AREA); cb=cv2.resize(cb,None,fx=s,fy=s,interpolation=cv2.INTER_NEAREST if s>1 else cv2.INTER_AREA)
w=ca.shape[1]; h=ca.shape[0]
sep=np.full((6,w,3),(0,0,255),np.uint8) if w>=h else np.full((h,6,3),(0,0,255),np.uint8)
im=np.vstack([ca,sep,cb]) if w>=h else np.hstack([ca,sep,cb])
cv2.imwrite(out,im,[cv2.IMWRITE_JPEG_QUALITY,92])
