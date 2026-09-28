# zgrid.py T x0 y0 x1 y1 zoom step out.jpg [render.png]  -- source crop (or a render) zoomed with labelled grid lines
import sys, cv2, numpy as np
from lib import src
t=float(sys.argv[1]); x0,y0,x1,y1=[int(v) for v in sys.argv[2:6]]; z=float(sys.argv[6]); st=int(sys.argv[7]); out=sys.argv[8]
f = cv2.imread(sys.argv[9]) if len(sys.argv)>9 else src(t)
c = cv2.resize(f[y0:y1,x0:x1], None, fx=z, fy=z, interpolation=cv2.INTER_CUBIC)
for x in range((x0//st+1)*st, x1, st):
    X=int((x-x0)*z); col=(0,0,255) if x%100==0 else (0,200,255)
    cv2.line(c,(X,0),(X,c.shape[0]),col,1)
    for Y in range(0,c.shape[0],int(200*z/2)): cv2.putText(c,str(x),(X+2,Y+14),0,0.4,(0,255,255),1)
for y in range((y0//st+1)*st, y1, st):
    Y=int((y-y0)*z); col=(0,0,255) if y%100==0 else (0,200,255)
    cv2.line(c,(0,Y),(c.shape[1],Y),col,1)
    for X in range(0,c.shape[1],int(200*z/2)): cv2.putText(c,str(y),(X+2,Y-3),0,0.4,(0,255,255),1)
cv2.imwrite(out,c,[cv2.IMWRITE_JPEG_QUALITY,90])
