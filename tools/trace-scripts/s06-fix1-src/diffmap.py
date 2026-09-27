# diffmap.py render source x0 y0 x1 y1 out.jpg [sigma] : red = render too bright, blue = render too dark (blurred)
import cv2, sys, numpy as np
r=cv2.imread(sys.argv[1],0).astype(float); s=cv2.imread(sys.argv[2],0).astype(float)
x0,y0,x1,y1=map(int,sys.argv[3:7]); out=sys.argv[7]; sg=float(sys.argv[8]) if len(sys.argv)>8 else 5
d=cv2.GaussianBlur(r,(0,0),sg)-cv2.GaussianBlur(s,(0,0),sg)
d=d[y0:y1,x0:x1]; base=s[y0:y1,x0:x1]*0.35
R=np.clip(base+np.clip(d,0,None)*2.5,0,255); B=np.clip(base+np.clip(-d,0,None)*2.5,0,255); G=base
im=cv2.merge([B,G,R]).astype(np.uint8)
for x in range((x0//50+1)*50,x1,50):
    cv2.line(im,(x-x0,0),(x-x0,im.shape[0]),(0,90,90),1); cv2.putText(im,str(x),(x-x0+2,12),0,0.35,(0,255,255),1)
for y in range((y0//50+1)*50,y1,50):
    cv2.line(im,(0,y-y0),(im.shape[1],y-y0),(0,90,90),1); cv2.putText(im,str(y),(2,y-y0-2),0,0.35,(0,255,255),1)
cv2.imwrite(out,im)
