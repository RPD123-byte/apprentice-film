# ugrid.py f rootx rooty s out.png : source crop with an owl-unit grid (50 units) around the root
import sys,cv2,numpy as np
sys.path.insert(0,'h'); from common import frame
f=int(sys.argv[1]); rx,ry,s=map(float,sys.argv[2:5]); out=sys.argv[5]
im=frame(f).copy()
x0=int(rx-420*s); x1=int(rx+420*s); y0=int(ry-360*s); y1=int(ry+300*s)
for u in range(-400,401,50):
    x=int(rx+u*s); c=(0,0,255) if u==0 else (0,160,0); cv2.line(im,(x,y0),(x,y1),c,1)
    cv2.putText(im,str(u),(x+2,y0+12),0,0.35,(0,255,255),1)
for v in range(-350,301,50):
    y=int(ry+v*s); c=(0,0,255) if v==0 else (0,160,0); cv2.line(im,(x0,y),(x1,y),c,1)
    cv2.putText(im,str(v),(x0+2,y-2),0,0.35,(0,255,255),1)
crop=im[max(0,y0):y1,max(0,x0):x1]
crop=cv2.resize(crop,None,fx=2,fy=2,interpolation=cv2.INTER_CUBIC)
cv2.imwrite(out,crop)
