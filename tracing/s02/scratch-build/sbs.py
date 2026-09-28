# side by side crop: sbs.py render.png ref.png out.png x0 y0 x1 y1 zoom
import cv2, sys, numpy as np
a=cv2.imread(sys.argv[1]); b=cv2.imread(sys.argv[2]); out=sys.argv[3]
x0,y0,x1,y1=[int(v) for v in sys.argv[4:8]]; z=float(sys.argv[8]) if len(sys.argv)>8 else 1
A=a[y0:y1,x0:x1]; B=b[y0:y1,x0:x1]
A=cv2.resize(A,None,fx=z,fy=z,interpolation=cv2.INTER_CUBIC); B=cv2.resize(B,None,fx=z,fy=z,interpolation=cv2.INTER_CUBIC)
for im in (A,B):
    for x in range(x0-x0%50+50,x1,50): cv2.line(im,(int((x-x0)*z),0),(int((x-x0)*z),im.shape[0]),(0,0,200),1); cv2.putText(im,str(x),(int((x-x0)*z)+2,12),0,0.4,(0,255,255),1)
    for y in range(y0-y0%50+50,y1,50): cv2.line(im,(0,int((y-y0)*z)),(im.shape[1],int((y-y0)*z)),(0,0,200),1); cv2.putText(im,str(y),(2,int((y-y0)*z)-2),0,0.4,(0,255,255),1)
sep=np.full((A.shape[0],6,3),255,np.uint8)
cv2.imwrite(out,np.hstack([A,sep,B]) if A.shape[1]<=A.shape[0]*1.3 else np.vstack([A,np.full((6,A.shape[1],3),255,np.uint8),B]))
