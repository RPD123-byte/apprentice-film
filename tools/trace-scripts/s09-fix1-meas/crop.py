# crop.py src.png render.png x0 y0 x1 y1 out.jpg [zoom]  -> side by side (render | source) crop with grid labels
import cv2, sys, numpy as np
a=sys.argv
src=cv2.imread(a[1]); ren=cv2.imread(a[2]) if a[2]!='-' else None
x0,y0,x1,y1=map(int,a[3:7]); out=a[7]; z=float(a[8]) if len(a)>8 else 1.0
def prep(im):
    c=im[y0:y1,x0:x1].copy()
    c=cv2.resize(c,None,fx=z,fy=z,interpolation=cv2.INTER_CUBIC if z>1 else cv2.INTER_AREA)
    step=50 if (x1-x0)<=800 else 100
    for x in range((x0//step+1)*step,x1,step):
        X=int((x-x0)*z); cv2.line(c,(X,0),(X,c.shape[0]),(0,160,255),1); cv2.putText(c,str(x),(X+2,12),0,0.4,(0,255,255),1)
    for y in range((y0//step+1)*step,y1,step):
        Y=int((y-y0)*z); cv2.line(c,(0,Y),(c.shape[1],Y),(0,160,255),1); cv2.putText(c,str(y),(2,Y-2),0,0.4,(0,255,255),1)
    return c
s=prep(src)
if ren is not None:
    r=prep(ren); s=np.hstack([r,np.full((s.shape[0],6,3),(0,0,255),np.uint8),s])
cv2.imwrite(out,s,[cv2.IMWRITE_JPEG_QUALITY,92])
