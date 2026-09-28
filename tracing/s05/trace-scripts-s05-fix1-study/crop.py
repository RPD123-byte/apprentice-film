# crop.py frame.png ref.png x0 y0 x1 y1 scale out.jpg  -> render | source crops side by side (with 50px ticks)
import cv2, sys, numpy as np
f,r=cv2.imread(sys.argv[1]),cv2.imread(sys.argv[2])
x0,y0,x1,y1=map(int,sys.argv[3:7]); s=float(sys.argv[7])
def c(im):
    k=cv2.resize(im[y0:y1,x0:x1],None,fx=s,fy=s,interpolation=cv2.INTER_CUBIC)
    for x in range((x0//50+1)*50,x1,50): cv2.line(k,(int((x-x0)*s),0),(int((x-x0)*s),8),(0,0,255),2); cv2.putText(k,str(x),(int((x-x0)*s)+2,20),0,0.4,(0,0,255),1)
    for y in range((y0//50+1)*50,y1,50): cv2.line(k,(0,int((y-y0)*s)),(8,int((y-y0)*s)),(0,0,255),2); cv2.putText(k,str(y),(10,int((y-y0)*s)+4),0,0.4,(0,0,255),1)
    return k
a,b=c(f),c(r)
cv2.imwrite(sys.argv[8],np.hstack([a,np.full((a.shape[0],6,3),255,np.uint8),b]),[cv2.IMWRITE_JPEG_QUALITY,90])
