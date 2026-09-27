# zoom.py T x0 y0 x1 y1 out [scale] [step]: crop with labelled grid (true frame coords)
import cv2, sys
from common import *
t=float(sys.argv[1]); x0,y0,x1,y1=[int(v) for v in sys.argv[2:6]]; out=sys.argv[6]
sc=float(sys.argv[7]) if len(sys.argv)>7 else 3; st=int(sys.argv[8]) if len(sys.argv)>8 else 10
f=load(t)[y0:y1,x0:x1]; f=cv2.resize(f,None,fx=sc,fy=sc,interpolation=cv2.INTER_CUBIC)
for x in range((x0//st+1)*st,x1,st):
    X=int((x-x0)*sc); major=x%(st*5)==0
    cv2.line(f,(X,0),(X,f.shape[0]),(0,0,255) if major else (0,200,255),1)
    if major: cv2.putText(f,str(x),(X+2,12),0,0.4,(0,255,255),1)
for y in range((y0//st+1)*st,y1,st):
    Y=int((y-y0)*sc); major=y%(st*5)==0
    cv2.line(f,(0,Y),(f.shape[1],Y),(0,0,255) if major else (0,200,255),1)
    if major: cv2.putText(f,str(y),(2,Y-2),0,0.4,(0,255,255),1)
cv2.imwrite(out,f)
