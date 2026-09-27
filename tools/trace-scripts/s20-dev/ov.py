# ov.py render.png T x0 y0 x1 y1 out.jpg [scale]: source crop with render edges (red) and a frame grid
import cv2,numpy as np,sys
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
r=cv2.imread(sys.argv[1]); t=float(sys.argv[2]); x0,y0,x1,y1=map(int,sys.argv[3:7]); out=sys.argv[7]; sc=float(sys.argv[8]) if len(sys.argv)>8 else 1.6
c=cv2.VideoCapture(V); c.set(1,int(round(t*25))); ok,s=c.read()
a=s[y0:y1,x0:x1].copy(); b=r[y0:y1,x0:x1].copy()
e=cv2.Canny(cv2.GaussianBlur(cv2.cvtColor(b,cv2.COLOR_BGR2GRAY),(0,0),1.5),40,100)
a[e>0]=(0,0,255)
for x in range((50-x0%50)%50,x1-x0,50): cv2.line(a,(x,0),(x,y1-y0),(0,200,255),1); cv2.putText(a,str(x0+x),(x+2,12),0,0.35,(0,255,255),1)
for y in range((50-y0%50)%50,y1-y0,50): cv2.line(a,(0,y),(x1-x0,y),(0,200,255),1); cv2.putText(a,str(y0+y),(2,y-2),0,0.35,(0,255,255),1)
cv2.imwrite(out,cv2.resize(a,None,fx=sc,fy=sc))
