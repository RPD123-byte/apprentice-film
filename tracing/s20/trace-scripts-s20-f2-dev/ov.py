# ov.py render.png T x0 y0 x1 y1 out.jpg [scale]: source crop with render edges (red) and a frame grid
import cv2,numpy as np,sys,os
r=cv2.imread(sys.argv[1]); t=float(sys.argv[2]); x0,y0,x1,y1=map(int,sys.argv[3:7]); out=sys.argv[7]; sc=float(sys.argv[8]) if len(sys.argv)>8 else 1.0
f='/Users/computer/rootline/apprentice-film/snapshots/s20-rev1-src/n%d.png'%round(t*25)
s=cv2.imread(f)
a=s[y0:y1,x0:x1].copy(); b=r[y0:y1,x0:x1].copy()
e=cv2.Canny(cv2.GaussianBlur(cv2.cvtColor(b,cv2.COLOR_BGR2GRAY),(0,0),1.2),40,100)
a=(a*0.8).astype(np.uint8); a[e>0]=(0,0,255)
a=cv2.resize(a,None,fx=sc,fy=sc,interpolation=cv2.INTER_CUBIC)
for x in range((50-x0%50)%50,x1-x0,50): X=int(x*sc); cv2.line(a,(X,0),(X,a.shape[0]),(0,200,255),1); cv2.putText(a,str(x0+x),(X+2,12),0,0.4,(0,255,255),1)
for y in range((50-y0%50)%50,y1-y0,50): Y=int(y*sc); cv2.line(a,(0,Y),(a.shape[1],Y),(0,200,255),1); cv2.putText(a,str(y0+y),(2,Y-2),0,0.4,(0,255,255),1)
cv2.imwrite(out,a)
