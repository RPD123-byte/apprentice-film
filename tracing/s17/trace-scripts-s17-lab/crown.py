# crown.py T x y0 y1 [img]: vertical brightness profile (for head top / band edges)
import cv2, numpy as np, sys
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
t=float(sys.argv[1]); x=int(sys.argv[2]); y0,y1=int(sys.argv[3]),int(sys.argv[4])
if len(sys.argv)>5: f=cv2.imread(sys.argv[5])
else:
    c=cv2.VideoCapture(V); c.set(1,round(t*25)); ok,f=c.read()
g=cv2.cvtColor(f,cv2.COLOR_BGR2GRAY).astype(int)
col=g[y0:y1,x-1:x+2].mean(1)
print(' '.join(f'{y0+i}:{int(v)}' for i,v in enumerate(col)))
