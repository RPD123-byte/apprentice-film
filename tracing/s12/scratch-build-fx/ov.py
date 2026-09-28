# ov.py render.png source.png x0 y0 x1 y1 out.jpg [scale] [thr]  -> overlay: grey = both dark, red = dark only in SOURCE, cyan = dark only in RENDER
import cv2,sys,numpy as np
a=sys.argv; r=cv2.imread(a[1],0); s=cv2.imread(a[2],0)
x0,y0,x1,y1=map(int,a[3:7]); sc=float(a[8]) if len(a)>8 else 3; thr=int(a[9]) if len(a)>9 else 110
r=cv2.GaussianBlur(r,(0,0),1.0)[y0:y1,x0:x1]; s=cv2.GaussianBlur(s,(0,0),1.0)[y0:y1,x0:x1]
dr=r<thr; ds=s<thr
im=np.full(r.shape+(3,),255,np.uint8)
im[dr&ds]=(90,90,90); im[ds&~dr]=(0,0,255); im[dr&~ds]=(255,200,0)
im=cv2.resize(im,None,fx=sc,fy=sc,interpolation=cv2.INTER_NEAREST)
for x in range(x0 - x0%10 + 10, x1, 10):
    X=int((x-x0)*sc); cv2.line(im,(X,0),(X,8 if x%50 else 20),(0,0,0),1)
    if x%50==0: cv2.putText(im,str(x),(X+2,30),0,0.5,(0,0,0),1)
for y in range(y0 - y0%10 + 10, y1, 10):
    Y=int((y-y0)*sc); cv2.line(im,(0,Y),(8 if y%50 else 20,Y),(0,0,0),1)
    if y%50==0: cv2.putText(im,str(y),(22,Y+5),0,0.5,(0,0,0),1)
cv2.imwrite(a[7],im)
