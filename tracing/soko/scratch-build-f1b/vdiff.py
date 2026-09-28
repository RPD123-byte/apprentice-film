#!/usr/bin/env python3
# vdiff.py raw.png vref.npy out.jpg x0 y0 x1 y1 [scale] [sigma] : my value map | source value map | diff (red: mine brighter)
import cv2, sys, numpy as np
a=cv2.imread(sys.argv[1]).astype(np.float32).mean(2)/255; v=np.load(sys.argv[2]); out=sys.argv[3]
x0,y0,x1,y1=[int(t) for t in sys.argv[4:8]]; sc=float(sys.argv[8]) if len(sys.argv)>8 else 3; sg=float(sys.argv[9]) if len(sys.argv)>9 else 1.5
A=cv2.GaussianBlur(a,(0,0),sg)[y0:y1,x0:x1]; B=v[y0:y1,x0:x1]
if sg>1.01: B=cv2.GaussianBlur(v,(0,0),np.sqrt(max(0.01,sg*sg-1)))[y0:y1,x0:x1]
d=A-B
h=np.zeros(A.shape+(3,),np.float32); h[...,2]=np.clip(d*2,0,1); h[...,0]=np.clip(-d*2,0,1); h[...,1]=0
to=lambda x:(np.clip(x,0,1)*255).astype(np.uint8)
up=lambda x:cv2.resize(x,None,fx=sc,fy=sc,interpolation=cv2.INTER_NEAREST)
row=np.hstack([up(cv2.cvtColor(to(A),cv2.COLOR_GRAY2BGR)),np.full((int((y1-y0)*sc),3,3),(0,200,255),np.uint8),up(cv2.cvtColor(to(B),cv2.COLOR_GRAY2BGR)),np.full((int((y1-y0)*sc),3,3),(0,200,255),np.uint8),up(to(h))])
for x in range((x0//50+1)*50,x1,50):
    for k in range(3):
        X=int((x-x0)*sc)+k*(int((x1-x0)*sc)+3); cv2.line(row,(X,0),(X,row.shape[0]),(0,160,0),1)
for y in range((y0//50+1)*50,y1,50):
    Y=int((y-y0)*sc); cv2.line(row,(0,Y),(row.shape[1],Y),(0,160,0),1)
cv2.imwrite(out,row,[cv2.IMWRITE_JPEG_QUALITY,88])
print('value MAE %.3f  mean mine %.3f ref %.3f'%(np.abs(d).mean(),A.mean(),B.mean()))
