# crop.py frame ref x0 y0 x1 y1 out [scale]  -> render above/beside ref
import cv2,numpy as np,sys
a=cv2.imread(sys.argv[1]); b=cv2.imread(sys.argv[2]); x0,y0,x1,y1=map(int,sys.argv[3:7]); s=float(sys.argv[8]) if len(sys.argv)>8 else 1
A=a[y0:y1,x0:x1]; B=b[y0:y1,x0:x1]
if s!=1: A=cv2.resize(A,None,fx=s,fy=s,interpolation=cv2.INTER_AREA if s<1 else cv2.INTER_CUBIC); B=cv2.resize(B,None,fx=s,fy=s,interpolation=cv2.INTER_AREA if s<1 else cv2.INTER_CUBIC)
if (x1-x0)>(y1-y0)*1.2: im=np.vstack([A,np.full((4,A.shape[1],3),(0,0,255),np.uint8),B])
else: im=np.hstack([A,np.full((A.shape[0],4,3),(0,0,255),np.uint8),B])
cv2.imwrite(sys.argv[7],im,[cv2.IMWRITE_JPEG_QUALITY,92])
