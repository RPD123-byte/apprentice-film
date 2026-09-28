# mark.py T out.jpg x0 y0 x1 y1 [px,py ...] : source crop at 2x with a 25px grid (labelled every 100) and marker points
import cv2, sys, numpy as np
sys.path.insert(0,'/Users/computer/rootline/apprentice-film/snapshots/s27-meas')
from common import load
t=float(sys.argv[1]); out=sys.argv[2]; x0,y0,x1,y1=map(int,sys.argv[3:7]); pts=list(map(float,sys.argv[7:]))
f=load(t); c=f[y0:y1,x0:x1].copy(); S=2 if (x1-x0)<=900 else 1
c=cv2.resize(c,None,fx=S,fy=S,interpolation=cv2.INTER_CUBIC)
for x in range((x0//25+1)*25,x1,25):
    col=(0,200,255) if x%100==0 else (0,120,160); cv2.line(c,((x-x0)*S,0),((x-x0)*S,c.shape[0]),col,1)
    if x%100==0: cv2.putText(c,str(x),((x-x0)*S+2,12),0,0.4,(0,255,255),1)
for y in range((y0//25+1)*25,y1,25):
    col=(0,200,255) if y%100==0 else (0,120,160); cv2.line(c,(0,(y-y0)*S),(c.shape[1],(y-y0)*S),col,1)
    if y%100==0: cv2.putText(c,str(y),(2,(y-y0)*S-2),0,0.4,(0,255,255),1)
for i in range(0,len(pts),2):
    p=(int((pts[i]-x0)*S),int((pts[i+1]-y0)*S)); cv2.circle(c,p,5,(255,0,255),2)
cv2.putText(c,f't={t}',(4,c.shape[0]-6),0,0.6,(255,255,0),2)
cv2.imwrite(out,c)
