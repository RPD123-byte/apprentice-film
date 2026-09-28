# blend.py render.png T out.jpg [x0 y0 x1 y1] [scale]: render (red channel-ish) over source edges for alignment checks
import cv2, numpy as np, sys
from src import frame
R=cv2.imread(sys.argv[1]); t=float(sys.argv[2]); S=frame(t); out=sys.argv[3]
x0,y0,x1,y1=[int(v) for v in sys.argv[4:8]] if len(sys.argv)>7 else (0,0,2206,946)
sc=float(sys.argv[8]) if len(sys.argv)>8 else 1
gr=cv2.cvtColor(R,cv2.COLOR_BGR2GRAY); gs=cv2.cvtColor(S,cv2.COLOR_BGR2GRAY)
v=np.dstack([gs,gs,gr])[y0:y1,x0:x1]   # source in blue/green (cyan), render in red
v=cv2.resize(v,None,fx=sc,fy=sc)
for x in range((x0//50+1)*50,x1,50):
    X=int((x-x0)*sc); cv2.line(v,(X,0),(X,v.shape[0]),(0,255,255),1)
    if x%100==0: cv2.putText(v,str(x),(X+2,12),0,0.4,(255,255,255),1)
for y in range((y0//50+1)*50,y1,50):
    Y=int((y-y0)*sc); cv2.line(v,(0,Y),(v.shape[1],Y),(0,255,255),1)
    if y%100==0: cv2.putText(v,str(y),(2,Y-2),0,0.4,(255,255,255),1)
cv2.imwrite(out,v,[cv2.IMWRITE_JPEG_QUALITY,88])
