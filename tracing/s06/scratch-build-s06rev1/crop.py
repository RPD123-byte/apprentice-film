import cv2, sys, numpy as np
# crop.py render.png ref.png x0 y0 x1 y1 out.jpg [scale]
a=cv2.imread(sys.argv[1]); b=cv2.imread(sys.argv[2])
x0,y0,x1,y1=map(int,sys.argv[3:7]); out=sys.argv[7]; sc=float(sys.argv[8]) if len(sys.argv)>8 else 1
ca=a[y0:y1,x0:x1]; cb=b[y0:y1,x0:x1]
if sc!=1:
  it=cv2.INTER_NEAREST if sc>1 else cv2.INTER_AREA
  ca=cv2.resize(ca,None,fx=sc,fy=sc,interpolation=it); cb=cv2.resize(cb,None,fx=sc,fy=sc,interpolation=it)
sep=np.full((ca.shape[0],6,3),(0,0,255),np.uint8)
cv2.imwrite(out,np.hstack([ca,sep,cb]),[cv2.IMWRITE_JPEG_QUALITY,92])
