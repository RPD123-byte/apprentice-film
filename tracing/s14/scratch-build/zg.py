# zg.py T x0 y0 x1 y1 scale out.jpg [step]  : zoomed source crop with a labelled grid (frame px)
import sys, cv2
from src import frame
t=float(sys.argv[1]); x0,y0,x1,y1=map(int,sys.argv[2:6]); k=float(sys.argv[6]); out=sys.argv[7]; st=int(sys.argv[8]) if len(sys.argv)>8 else 20
f=frame(t,False)[y0:y1,x0:x1]; c=cv2.resize(f,None,fx=k,fy=k,interpolation=cv2.INTER_CUBIC)
for x in range((x0//st+1)*st, x1, st):
    X=int((x-x0)*k); major = x%(st*5)==0
    cv2.line(c,(X,0),(X,c.shape[0]),(0,0,255) if major else (0,150,255),1)
    if major: cv2.putText(c,str(x),(X+2,12),0,0.4,(0,255,255),1)
for y in range((y0//st+1)*st, y1, st):
    Y=int((y-y0)*k); major = y%(st*5)==0
    cv2.line(c,(0,Y),(c.shape[1],Y),(0,0,255) if major else (0,150,255),1)
    if major: cv2.putText(c,str(y),(2,Y-2),0,0.4,(0,255,255),1)
cv2.imwrite(out,c,[cv2.IMWRITE_JPEG_QUALITY,92])
