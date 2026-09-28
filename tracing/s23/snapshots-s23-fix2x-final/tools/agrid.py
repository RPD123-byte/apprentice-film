#!/usr/bin/env python3
# agrid.py render.png k [x0 y0 x1 y1]: blurred(σ8) signed error grid (render − source, graded) in 50×40 cells + MAE
import sys,cv2,numpy as np
sys.path.insert(0,'/Users/computer/rootline/apprentice-film/snapshots/s23-fix2x-tools'); from m import src
f,k=sys.argv[1],int(sys.argv[2]); x0,y0,x1,y1=map(int,sys.argv[3:7]) if len(sys.argv)>6 else (300,240,1050,680)
a=cv2.cvtColor(cv2.imread(f),cv2.COLOR_BGR2GRAY).astype(float); b=cv2.cvtColor(src(k),cv2.COLOR_BGR2GRAY).astype(float)
d=cv2.GaussianBlur(a,(0,0),8)-cv2.GaussianBlur(b,(0,0),8)
print(k,'MAE8 %.2f  box MAE %.1f'%(np.abs(d).mean(),np.abs(d[y0:y1,x0:x1]).mean()))
print('      '+''.join('%5d'%x for x in range(x0,x1,50)))
for y in range(y0,y1,40): print('%5d '%y+''.join('%5d'%d[y:y+40,x:x+50].mean() for x in range(x0,x1,50)))
