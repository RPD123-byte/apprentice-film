# overlay: ov.py dir t x0,y0,x1,y1 [scale] -> dir/ov-t.jpg: render edges (red) over source (grey), plus side by side
import sys, cv2, numpy as np
from lab import src
d=sys.argv[1]; t=float(sys.argv[2]); x0,y0,x1,y1=[int(v) for v in sys.argv[3].split(',')]; sc=float(sys.argv[4]) if len(sys.argv)>4 else 1
r=cv2.imread(f'{d}/r-{t:.2f}.png'); s=src(t)
rc=r[y0:y1,x0:x1]; sg=cv2.cvtColor(s[y0:y1,x0:x1],cv2.COLOR_BGR2GRAY)
e=cv2.Canny(cv2.GaussianBlur(cv2.cvtColor(rc,cv2.COLOR_BGR2GRAY),(0,0),2),30,80)
ov=cv2.cvtColor((sg*0.8).astype(np.uint8),cv2.COLOR_GRAY2BGR); ov[e>0]=(0,0,255)
for x in range((x0//50+1)*50,x1,50): cv2.line(ov,(x-x0,0),(x-x0,y1-y0),(0,200,0) if x%100 else (0,255,255),1)
for y in range((y0//50+1)*50,y1,50): cv2.line(ov,(0,y-y0),(x1-x0,y-y0),(0,200,0) if y%100 else (0,255,255),1)
out=np.hstack([rc,ov])
if sc!=1: out=cv2.resize(out,None,fx=sc,fy=sc,interpolation=cv2.INTER_AREA)
cv2.imwrite(f'{d}/ov-{t:.2f}.jpg',out,[cv2.IMWRITE_JPEG_QUALITY,88])
