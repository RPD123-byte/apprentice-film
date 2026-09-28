# usage: crop.py dir idx x0 y0 x1 y1 scale out   -> render | source stacked vertically (or side by side)
import cv2, sys, glob, numpy as np
d, idx = sys.argv[1], sys.argv[2]
x0,y0,x1,y1 = map(int, sys.argv[3:7]); sc=float(sys.argv[7]); out=sys.argv[8]
fa=glob.glob(f'{d}/frame-{idx}-*.png')[0]; fb=glob.glob(f'{d}/ref-{idx}-*.png')[0]
a=cv2.imread(fa)[y0:y1,x0:x1]; b=cv2.imread(fb)[y0:y1,x0:x1]
a=cv2.resize(a,None,fx=sc,fy=sc,interpolation=cv2.INTER_NEAREST if sc>=2 else cv2.INTER_AREA); b=cv2.resize(b,None,fx=sc,fy=sc,interpolation=cv2.INTER_NEAREST if sc>=2 else cv2.INTER_AREA)
sep=np.full((a.shape[0],6,3),255,np.uint8)
if (x1-x0) > 1.3*(y1-y0): im=np.vstack([a,np.full((6,a.shape[1],3),255,np.uint8),b])
else: im=np.hstack([a,sep,b])
cv2.imwrite(out,im,[cv2.IMWRITE_JPEG_QUALITY,92]); print(out, im.shape)
