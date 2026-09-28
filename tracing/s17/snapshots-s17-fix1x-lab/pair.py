# pair.py dir t x0 y0 x1 y1 scale out  : stack render over source crop (render top), scaled
import sys, cv2, numpy as np
d,t=sys.argv[1],float(sys.argv[2]); x0,y0,x1,y1=map(int,sys.argv[3:7]); sc=float(sys.argv[7]); out=sys.argv[8]
r=cv2.imread(f'{d}/r{t:.2f}.png')[y0:y1,x0:x1]; s=cv2.imread(f'{d}/s{t:.2f}.png')[y0:y1,x0:x1]
im=np.vstack([r,np.full((4,r.shape[1],3),(0,0,255),np.uint8),s]) if (x1-x0)>(y1-y0) else np.hstack([r,np.full((r.shape[0],4,3),(0,0,255),np.uint8),s])
im=cv2.resize(im,None,fx=sc,fy=sc,interpolation=cv2.INTER_NEAREST if sc>1 else cv2.INTER_AREA)
cv2.imwrite(out,im,[cv2.IMWRITE_JPEG_QUALITY,90])
