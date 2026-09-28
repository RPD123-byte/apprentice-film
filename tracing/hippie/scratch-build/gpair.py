# gpair.py render.png ref.png out.jpg x0 y0 x1 y1 [scale] : stacked crops (render over source) with a 50px grid labelled in frame px
import cv2, sys
a=cv2.imread(sys.argv[1]); b=cv2.imread(sys.argv[2]); out=sys.argv[3]
x0,y0,x1,y1=[int(v) for v in sys.argv[4:8]]; sc=float(sys.argv[8]) if len(sys.argv)>8 else 1
import numpy as np
def g(f):
    f=f.copy()
    for x in range(0,f.shape[1],50): cv2.line(f,(x,0),(x,f.shape[0]),(0,200,255) if x%100 else (0,0,255),1)
    for y in range(0,f.shape[0],50): cv2.line(f,(0,y),(f.shape[1],y),(0,200,255) if y%100 else (0,0,255),1)
    f=f[y0:y1,x0:x1]; f=cv2.resize(f,None,fx=sc,fy=sc)
    for x in range((x0//100+1)*100,x1,100): cv2.putText(f,str(x),(int((x-x0)*sc)+2,14),0,0.45,(0,255,255),1)
    for y in range((y0//100+1)*100,y1,100): cv2.putText(f,str(y),(2,int((y-y0)*sc)-3),0,0.45,(0,255,255),1)
    return f
A=g(a); B=g(b)
sep=np.zeros((6,A.shape[1],3),np.uint8); sep[:]= (0,0,255)
cv2.imwrite(out,np.vstack([A,sep,B]),[cv2.IMWRITE_JPEG_QUALITY,90])
