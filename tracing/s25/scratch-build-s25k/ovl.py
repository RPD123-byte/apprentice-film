# usage: ovl.py RDIR frame out.jpg x0 y0 x1 y1 [scale]  -> overlay: render=green/blue? source=red, render=cyan
import cv2, sys, numpy as np
rd,f,out=sys.argv[1],int(sys.argv[2]),sys.argv[3]; x0,y0,x1,y1=map(int,sys.argv[4:8]); sc=float(sys.argv[8]) if len(sys.argv)>8 else 1
r=cv2.imread(f'{rd}/r-{f:05d}.png',0)[y0:y1,x0:x1]; s=cv2.imread(f'src/f{f:05d}.png',0)[y0:y1,x0:x1]
im=np.dstack([r,r,s])
im=cv2.resize(im,None,fx=sc,fy=sc)
cv2.imwrite(out,im,[cv2.IMWRITE_JPEG_QUALITY,90])
