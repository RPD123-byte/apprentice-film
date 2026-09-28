import cv2, numpy as np, sys
# crop2.py render ref x0 y0 x1 y1 out [scale] [vertical]
a=cv2.imread(sys.argv[1]); b=cv2.imread(sys.argv[2])
x0,y0,x1,y1=map(int,sys.argv[3:7]); out=sys.argv[7]
s=float(sys.argv[8]) if len(sys.argv)>8 else 1.0
vert=len(sys.argv)>9 and sys.argv[9]=='v'
ca=a[y0:y1,x0:x1]; cb=b[y0:y1,x0:x1]
ca=cv2.resize(ca,None,fx=s,fy=s); cb=cv2.resize(cb,None,fx=s,fy=s)
sep=np.full((4,ca.shape[1],3),255,np.uint8) if vert else np.full((ca.shape[0],4,3),255,np.uint8)
im=np.vstack([ca,sep,cb]) if vert else np.hstack([ca,sep,cb])
cv2.imwrite(out,im,[cv2.IMWRITE_JPEG_QUALITY,90])
