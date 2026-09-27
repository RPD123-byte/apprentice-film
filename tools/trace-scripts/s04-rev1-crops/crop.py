import cv2, sys, numpy as np
# usage: crop.py render.png ref.png x0 y0 x1 y1 out.jpg [scale]
r=cv2.imread(sys.argv[1]); s=cv2.imread(sys.argv[2])
x0,y0,x1,y1=map(int,sys.argv[3:7]); out=sys.argv[7]; sc=float(sys.argv[8]) if len(sys.argv)>8 else 1
a=r[y0:y1,x0:x1]; b=s[y0:y1,x0:x1]
bar=np.full((a.shape[0],6,3),(0,0,255),np.uint8)
im=np.hstack([a,bar,b])
if sc!=1: im=cv2.resize(im,None,fx=sc,fy=sc,interpolation=cv2.INTER_AREA if sc<1 else cv2.INTER_NEAREST)
cv2.imwrite(out,im,[cv2.IMWRITE_JPEG_QUALITY,92])
