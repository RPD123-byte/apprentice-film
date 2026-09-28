# crop.py A.png B.png x0 y0 x1 y1 out.jpg [scale]  -> side by side (A | B) crop, scaled
import cv2, sys, numpy as np
a=cv2.imread(sys.argv[1]); b=cv2.imread(sys.argv[2])
x0,y0,x1,y1=map(int,sys.argv[3:7]); out=sys.argv[7]; s=float(sys.argv[8]) if len(sys.argv)>8 else 2
ca=a[y0:y1,x0:x1]; cb=b[y0:y1,x0:x1]
ca=cv2.resize(ca,None,fx=s,fy=s,interpolation=cv2.INTER_NEAREST if s>=2 else cv2.INTER_AREA); cb=cv2.resize(cb,None,fx=s,fy=s,interpolation=cv2.INTER_NEAREST if s>=2 else cv2.INTER_AREA)
sep=np.full((ca.shape[0],6,3),(0,0,255),np.uint8)
im=np.hstack([ca,sep,cb])
# grid ticks every 20px of source coords
cv2.imwrite(out,im,[cv2.IMWRITE_JPEG_QUALITY,90])
