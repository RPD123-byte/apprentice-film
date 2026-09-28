#!/usr/bin/env python3
# lgrid.py render.png k : blurred luminance grid of render and (render - source) in 25x20 cells over the aura box
import sys,cv2,numpy as np
sys.path.insert(0,'/Users/computer/rootline/apprentice-film/snapshots/s23-fix2x-tools'); from m import src
f,k=sys.argv[1],int(sys.argv[2]); X0,X1,Y0,Y1=(400,960,280,660) if len(sys.argv)<4 else map(int,sys.argv[3:7])
a=cv2.GaussianBlur(cv2.cvtColor(cv2.imread(f),cv2.COLOR_BGR2GRAY).astype(float),(0,0),8); b=cv2.GaussianBlur(cv2.cvtColor(src(k),cv2.COLOR_BGR2GRAY).astype(float),(0,0),8)
print(k,'box MAE %.1f  frame MAE %.2f'%(np.abs(a-b)[Y0:Y1,X0:X1].mean(),np.abs(a-b).mean()))
print('diff  '+''.join('%4d'%(x%1000) for x in range(X0,X1,25)))
for y in range(Y0,Y1,20): print('%4d  '%y+''.join('%4d'%(a[y:y+20,x:x+25].mean()-b[y:y+20,x:x+25].mean()) for x in range(X0,X1,25)))
