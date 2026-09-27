# zoom.py N x0 y0 x1 y1 out [scale] [render.png]: source crop (or render) with a 25 px grid, labels every 50
import cv2,numpy as np,sys
n=int(sys.argv[1]); x0,y0,x1,y1=map(int,sys.argv[2:6]); out=sys.argv[6]; sc=float(sys.argv[7]) if len(sys.argv)>7 else 2
im=cv2.imread(sys.argv[8]) if len(sys.argv)>8 else cv2.imread('/Users/computer/rootline/apprentice-film/snapshots/s20-rev1-src/n%d.png'%n)
c=cv2.resize(im[y0:y1,x0:x1],None,fx=sc,fy=sc,interpolation=cv2.INTER_CUBIC)
for x in range((25-x0%25)%25,x1-x0,25):
    X=int(x*sc); col=(0,200,255) if (x0+x)%50==0 else (0,100,160); cv2.line(c,(X,0),(X,c.shape[0]),col,1)
    if (x0+x)%50==0: cv2.putText(c,str(x0+x),(X+2,14),0,0.45,(0,255,255),1)
for y in range((25-y0%25)%25,y1-y0,25):
    Y=int(y*sc); col=(0,200,255) if (y0+y)%50==0 else (0,100,160); cv2.line(c,(0,Y),(c.shape[1],Y),col,1)
    if (y0+y)%50==0: cv2.putText(c,str(y0+y),(2,Y-3),0,0.45,(0,255,255),1)
cv2.imwrite(out,c)
