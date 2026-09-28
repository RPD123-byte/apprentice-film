# overlay.py dir time out [scale] [x0 y0 x1 y1]: render=red/magenta, source=green (blurred luminance)
import cv2, sys, glob, numpy as np
d,t,out=sys.argv[1],sys.argv[2],sys.argv[3]; sc=float(sys.argv[4]) if len(sys.argv)>4 else 0.5
f=glob.glob(f'{d}/frame-*-at-{t}s.png')[0]; r=glob.glob(f'{d}/ref-*-at-{t}s.png')[0]
A=cv2.cvtColor(cv2.imread(f),cv2.COLOR_BGR2GRAY); B=cv2.cvtColor(cv2.imread(r),cv2.COLOR_BGR2GRAY)
if len(sys.argv)>8:
    x0,y0,x1,y1=map(int,sys.argv[5:9]); A=A[y0:y1,x0:x1]; B=B[y0:y1,x0:x1]
A=cv2.GaussianBlur(A,(0,0),2); B=cv2.GaussianBlur(B,(0,0),2)
o=np.dstack([A,B,A])
o=cv2.resize(o,None,fx=sc,fy=sc,interpolation=cv2.INTER_AREA)
cv2.imwrite(out,o,[cv2.IMWRITE_JPEG_QUALITY,90])
