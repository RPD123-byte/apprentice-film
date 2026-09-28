#!/usr/bin/env python3
# regown.py DIR k x y [w h] : best shift (dx,dy) of the render's window round (x,y) onto the source (blurred NCC, ±50 px)
import sys,cv2,numpy as np
sys.path.insert(0,'/Users/computer/rootline/apprentice-film/snapshots/s23-fix2x-tools'); from m import src
d,k,x,y=sys.argv[1],int(sys.argv[2]),int(sys.argv[3]),int(sys.argv[4]); w=int(sys.argv[5]) if len(sys.argv)>5 else 150; h=int(sys.argv[6]) if len(sys.argv)>6 else 130
bl=lambda im: cv2.GaussianBlur(cv2.cvtColor(im,cv2.COLOR_BGR2GRAY).astype(np.float32),(0,0),3)
R=bl(cv2.imread(f'{d}/r{k:05d}.png')); S=bl(src(k))
x0,x1=max(0,x-w),min(2206,x+w); y0,y1=max(0,y-int(h*1.3)),min(946,y+h)
T=R[y0:y1,x0:x1]
M=int(sys.argv[7]) if len(sys.argv)>7 else 50; sx0,sx1=max(0,x0-M),min(2206,x1+M); sy0,sy1=max(0,y0-M),min(946,y1+M)
res=cv2.matchTemplate(S[sy0:sy1,sx0:sx1],T,cv2.TM_CCOEFF_NORMED)
_,mv,_,ml=cv2.minMaxLoc(res)
dx=ml[0]+sx0-x0; dy=ml[1]+sy0-y0
base=res[y0-sy0,x0-sx0] if 0<=y0-sy0<res.shape[0] and 0<=x0-sx0<res.shape[1] else float('nan')
print(k,'shift',dx,dy,'ncc %.3f (at 0: %.3f)'%(mv,base))
