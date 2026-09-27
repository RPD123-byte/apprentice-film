# usage: crop.py render.png srcframe.png x0 y0 x1 y1 out.jpg [scale]
import cv2,sys,numpy as np
r=cv2.imread(sys.argv[1]); s=cv2.imread(sys.argv[2])
x0,y0,x1,y1=map(int,sys.argv[3:7]); out=sys.argv[7]; sc=float(sys.argv[8]) if len(sys.argv)>8 else 1.0
a=r[y0:y1,x0:x1]; b=s[y0:y1,x0:x1]
if sc!=1: a=cv2.resize(a,None,fx=sc,fy=sc,interpolation=cv2.INTER_NEAREST if sc>1 else cv2.INTER_AREA); b=cv2.resize(b,None,fx=sc,fy=sc,interpolation=cv2.INTER_NEAREST if sc>1 else cv2.INTER_AREA)
gap=np.full((a.shape[0],8,3),(0,0,160),np.uint8)
cv2.imwrite(out,np.hstack([a,gap,b]),[cv2.IMWRITE_JPEG_QUALITY,92])
