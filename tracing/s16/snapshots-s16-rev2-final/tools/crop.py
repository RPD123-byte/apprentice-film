# crop.py n x0 y0 x1 y1 out [scale] : render | source side by side (exact frames)
import cv2, numpy as np, sys
n=int(sys.argv[1]); x0,y0,x1,y1=map(int,sys.argv[2:6]); out=sys.argv[6]; sc=float(sys.argv[7]) if len(sys.argv)>7 else 1
a=cv2.imread(f's16-rev2-exact/r{n}.png')[y0:y1,x0:x1]; b=cv2.imread(f's16-rev2-src/s{n}.png')[y0:y1,x0:x1]
im=np.hstack([a,np.full((a.shape[0],6,3),(0,0,255),np.uint8),b])
if sc!=1: im=cv2.resize(im,None,fx=sc,fy=sc,interpolation=cv2.INTER_NEAREST if sc>1 else cv2.INTER_AREA)
cv2.imwrite(out,im,[cv2.IMWRITE_JPEG_QUALITY,92])
