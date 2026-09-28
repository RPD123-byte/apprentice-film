# zoom.py img x0 y0 x1 y1 out [scale] [img2]  -> ticked zoom (side by side if img2)
import cv2,sys,numpy as np
def z(p,x0,y0,x1,y1,s):
    b=cv2.imread(p)
    c=cv2.resize(b[y0:y1,x0:x1],None,fx=s,fy=s,interpolation=cv2.INTER_NEAREST)
    for x in range(x0 - x0%10 + 10, x1, 10):
        X=int((x-x0)*s); cv2.line(c,(X,0),(X,8 if x%50 else 20),(0,0,255),1)
        if x%50==0: cv2.putText(c,str(x),(X+2,30),0,0.5,(0,0,255),1)
    for y in range(y0 - y0%10 + 10, y1, 10):
        Y=int((y-y0)*s); cv2.line(c,(0,Y),(8 if y%50 else 20,Y),(0,0,255),1)
        if y%50==0: cv2.putText(c,str(y),(22,Y+5),0,0.5,(0,0,255),1)
    return c
a=sys.argv; x0,y0,x1,y1=map(int,a[2:6]); s=float(a[7]) if len(a)>7 else 3
im=z(a[1],x0,y0,x1,y1,s)
if len(a)>8:
    im2=z(a[8],x0,y0,x1,y1,s); im=np.hstack([im,np.full((im.shape[0],4,3),(0,0,255),np.uint8),im2])
cv2.imwrite(a[6],im,[cv2.IMWRITE_JPEG_QUALITY,92])
