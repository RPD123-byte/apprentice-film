#!/usr/bin/env python3
# cmp.py render.png ref.png out.jpg x0 y0 x1 y1 [scale] : render | ref crops side by side with a 10px grid (labels /50)
import cv2, sys, numpy as np
a=cv2.imread(sys.argv[1]); b=cv2.imread(sys.argv[2]); out=sys.argv[3]
x0,y0,x1,y1=[int(v) for v in sys.argv[4:8]]; sc=float(sys.argv[8]) if len(sys.argv)>8 else 2
def prep(im):
    f=cv2.resize(im[y0:y1,x0:x1],None,fx=sc,fy=sc,interpolation=cv2.INTER_CUBIC); ov=f.copy()
    for x in range((x0//10+1)*10,x1,10):
        X=int((x-x0)*sc); cv2.line(ov,(X,0),(X,f.shape[0]),(0,0,255) if x%50==0 else (0,140,200),1)
    for y in range((y0//10+1)*10,y1,10):
        Y=int((y-y0)*sc); cv2.line(ov,(0,Y),(f.shape[1],Y),(0,0,255) if y%50==0 else (0,140,200),1)
    f=cv2.addWeighted(ov,0.3,f,0.7,0)
    for x in range((x0//50+1)*50,x1,50): cv2.putText(f,str(x),(int((x-x0)*sc)+2,12),0,0.4,(0,255,255),1)
    for y in range((y0//50+1)*50,y1,50): cv2.putText(f,str(y),(2,int((y-y0)*sc)-3),0,0.4,(0,255,255),1)
    return f
A=prep(a); B=prep(b)
im=np.hstack([A,np.full((A.shape[0],4,3),(0,200,255),np.uint8),B]) if A.shape[1]<=A.shape[0]*1.6 else np.vstack([A,np.full((4,A.shape[1],3),(0,200,255),np.uint8),B])
cv2.imwrite(out,im,[cv2.IMWRITE_JPEG_QUALITY,88])
ga=cv2.GaussianBlur(cv2.cvtColor(a,cv2.COLOR_BGR2GRAY).astype(np.float32),(0,0),6)[y0:y1,x0:x1]; gb=cv2.GaussianBlur(cv2.cvtColor(b,cv2.COLOR_BGR2GRAY).astype(np.float32),(0,0),6)[y0:y1,x0:x1]
print('blurred MAE %.1f  mean render %.1f ref %.1f'%(np.abs(ga-gb).mean(),ga.mean(),gb.mean()))
