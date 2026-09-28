# ldiff.py dir out.jpg : per-frame blurred L (render - source) maps, colour-coded (red = render lighter), stacked
import cv2, numpy as np, sys, glob, re
from src import frame
fs=sorted(glob.glob(sys.argv[1]+'/frame-at-*.png')); rows=[]
for f in fs:
    t=float(re.search(r'at-([\d.]+?)s\.png',f).group(1))
    L=lambda im: cv2.cvtColor(cv2.GaussianBlur(im,(0,0),10).astype(np.float32)/255,cv2.COLOR_BGR2Lab)[...,0]
    R=cv2.imread(f); S=frame(t); d=L(R)-L(S)
    v=np.clip(128+d*6,0,255).astype(np.uint8); v=cv2.applyColorMap(v,cv2.COLORMAP_JET)
    g=cv2.cvtColor(S,cv2.COLOR_BGR2GRAY); v=(0.6*v+0.4*cv2.cvtColor(g,cv2.COLOR_GRAY2BGR)).astype(np.uint8)
    for x in range(0,2206,100): cv2.line(v,(x,0),(x,946),(255,255,255),1); cv2.putText(v,str(x),(x+2,20),0,0.6,(255,255,255),1)
    for y in range(0,946,100): cv2.line(v,(0,y),(2206,y),(255,255,255),1); cv2.putText(v,str(y),(2,y-2),0,0.6,(255,255,255),1)
    cv2.putText(v,'%.2f'%t,(10,60),0,1.4,(255,255,255),2)
    rows.append(cv2.resize(v,(1103,473)))
cv2.imwrite(sys.argv[2],np.vstack(rows))
