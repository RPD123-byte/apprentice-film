# src.py file x0 y0 x1 y1 scale out [tick]
import cv2,sys
f=sys.argv[1]; x0,y0,x1,y1=map(int,sys.argv[2:6]); s=float(sys.argv[6]); out=sys.argv[7]; tk=int(sys.argv[8]) if len(sys.argv)>8 else 20
B=cv2.imread(f)
c=cv2.resize(B[y0:y1,x0:x1],None,fx=s,fy=s,interpolation=cv2.INTER_CUBIC)
for gx in range((x0//tk)*tk+tk,x1,tk):
    X=int((gx-x0)*s); cv2.line(c,(X,0),(X,10),(0,0,255),1); cv2.putText(c,str(gx),(X+1,20),cv2.FONT_HERSHEY_SIMPLEX,0.33,(0,0,255),1)
    Y=c.shape[0]-1; cv2.line(c,(X,Y-10),(X,Y),(0,0,255),1)
for gy in range((y0//tk)*tk+tk,y1,tk):
    Y=int((gy-y0)*s); cv2.line(c,(0,Y),(10,Y),(0,0,255),1); cv2.putText(c,str(gy),(12,Y+4),cv2.FONT_HERSHEY_SIMPLEX,0.33,(0,0,255),1)
    X=c.shape[1]-1; cv2.line(c,(X-10,Y),(X,Y),(0,0,255),1)
cv2.imwrite(out,c)
