# crop.py IMG x0 y0 x1 y1 scale out [grid]  -> zoomed crop with labelled grid (labels in page px)
import cv2, sys, numpy as np
im=cv2.imread(sys.argv[1]); x0,y0,x1,y1=[int(v) for v in sys.argv[2:6]]; s=float(sys.argv[6]); out=sys.argv[7]
step=int(sys.argv[8]) if len(sys.argv)>8 else 0
c=im[y0:y1,x0:x1]; c=cv2.resize(c,None,fx=s,fy=s,interpolation=cv2.INTER_CUBIC)
if step:
    for x in range((x0//step+1)*step, x1, step):
        X=int((x-x0)*s); cv2.line(c,(X,0),(X,c.shape[0]),(0,160,255) if x%(step*5) else (0,0,255),1); cv2.putText(c,str(x),(X+2,12),0,0.4,(0,255,255),1)
    for y in range((y0//step+1)*step, y1, step):
        Y=int((y-y0)*s); cv2.line(c,(0,Y),(c.shape[1],Y),(0,160,255) if y%(step*5) else (0,0,255),1); cv2.putText(c,str(y),(2,Y-2),0,0.4,(0,255,255),1)
cv2.imwrite(out,c,[cv2.IMWRITE_JPEG_QUALITY,92])
