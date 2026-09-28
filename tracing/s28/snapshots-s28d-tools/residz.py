# residz.py render.png T x0 y0 x1 y1 out.jpg [scale] -- zoomed residual (source - render, ungraded L): red = source brighter
import sys, cv2, numpy as np
from lib import src, ungrade
r = cv2.imread(sys.argv[1]).astype(np.float32)/255; t=float(sys.argv[2]); x0,y0,x1,y1=map(int,sys.argv[3:7]); out=sys.argv[7]
z = float(sys.argv[8]) if len(sys.argv)>8 else 1.0
Ru = ungrade(cv2.GaussianBlur(r,(0,0),1),t); Su = ungrade(cv2.GaussianBlur(src(t).astype(np.float32)/255,(0,0),1),t)
d = cv2.GaussianBlur((Su-Ru).mean(2),(0,0),4)*255
v = np.clip(d[y0:y1,x0:x1]/25,-1,1)
im = np.zeros((y1-y0,x1-x0,3),np.float32); im[...,2]=np.clip(v,0,1)*255; im[...,0]=np.clip(-v,0,1)*255
g = cv2.cvtColor(src(t),cv2.COLOR_BGR2GRAY)[y0:y1,x0:x1].astype(np.float32)
o = np.clip(im*0.85 + g[...,None]*0.35,0,255).astype(np.uint8)
o = cv2.resize(o,None,fx=z,fy=z)
for x in range((x0//50+1)*50,x1,50): X=int((x-x0)*z); cv2.line(o,(X,0),(X,o.shape[0]),(0,160,0) if x%100 else (0,255,0),1); cv2.putText(o,str(x),(X+2,14),0,0.45,(255,255,255),1)
for y in range((y0//50+1)*50,y1,50): Y=int((y-y0)*z); cv2.line(o,(0,Y),(o.shape[1],Y),(0,160,0) if y%100 else (0,255,0),1); cv2.putText(o,str(y),(2,Y-2),0,0.45,(255,255,255),1)
cv2.imwrite(out,o)
