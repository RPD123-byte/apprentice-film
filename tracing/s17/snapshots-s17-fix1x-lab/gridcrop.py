# gridcrop.py img x0 y0 x1 y1 scale out [step]
import sys, cv2, numpy as np
im=cv2.imread(sys.argv[1]); x0,y0,x1,y1=map(int,sys.argv[2:6]); sc=float(sys.argv[6]); out=sys.argv[7]; step=int(sys.argv[8]) if len(sys.argv)>8 else 5
c=cv2.resize(im[y0:y1,x0:x1],None,fx=sc,fy=sc,interpolation=cv2.INTER_CUBIC)
for x in range((x0//step+1)*step,x1,step):
    X=int((x-x0)*sc); col=(0,0,255) if x%(step*2)==0 else (0,140,0); cv2.line(c,(X,0),(X,c.shape[0]),col,1)
    if x%(step*2)==0: cv2.putText(c,str(x),(X+2,11),cv2.FONT_HERSHEY_SIMPLEX,0.35,(0,0,255),1)
for y in range((y0//step+1)*step,y1,step):
    Y=int((y-y0)*sc); col=(0,0,255) if y%(step*2)==0 else (0,140,0); cv2.line(c,(0,Y),(c.shape[1],Y),col,1)
    if y%(step*2)==0: cv2.putText(c,str(y),(2,Y-2),cv2.FONT_HERSHEY_SIMPLEX,0.35,(0,0,255),1)
cv2.imwrite(out,c,[cv2.IMWRITE_JPEG_QUALITY,92])
