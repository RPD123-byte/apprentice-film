#!/usr/bin/env python3
# regions.py DIR k0 k1 [step]: region means render vs source for exact-frame renders DIR/rKKKKK.png
import sys,cv2,numpy as np,os
sys.path.insert(0,'/Users/computer/rootline/apprentice-film/snapshots/s23r-tools')
from m import src
R={'ban':(300,195,1900,350),'top':(200,0,2000,115),'left':(0,300,135,900),'right':(2035,300,2206,900),'scr':(1100,420,2000,900),'rmL':(150,420,1000,900)}
d=sys.argv[1]; k0,k1=int(sys.argv[2]),int(sys.argv[3]); st=int(sys.argv[4]) if len(sys.argv)>4 else 1
for k in range(k0,k1+1,st):
    p=f'{d}/r{k:05d}.png'
    if not os.path.exists(p): continue
    s=cv2.cvtColor(src(k),cv2.COLOR_BGR2GRAY).astype(float); r=cv2.cvtColor(cv2.imread(p),cv2.COLOR_BGR2GRAY).astype(float)
    print(k, ' '.join('%s %.0f/%.0f'%(n,r[y0:y1,x0:x1].mean(),s[y0:y1,x0:x1].mean()) for n,(x0,y0,x1,y1) in R.items()))
