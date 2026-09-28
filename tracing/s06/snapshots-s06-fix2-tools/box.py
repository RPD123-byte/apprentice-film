#!/usr/bin/env python3
# box.py DIR frames x0 y0 x1 y1 : per-frame blurred MAE (s5, s1.5) and signed mean in a box, render vs source
import sys
from util import *
d=sys.argv[1]; fr=sys.argv[2]; x0,y0,x1,y1=[int(v) for v in sys.argv[3:7]]
F=[]
for p in fr.split(','):
    if '-' in p: a,b=map(int,p.split('-')); F+=list(range(a,b+1))
    else: F.append(int(p))
acc=[]
for n in F:
    a=ren(d,n); b=src(n)
    r=[]
    for s in (5,1.5):
        A=cv2.GaussianBlur(a,(0,0),s); B=cv2.GaussianBlur(b,(0,0),s); r.append(np.abs(A-B)[y0:y1,x0:x1].mean())
    sg=(a-b)[y0:y1,x0:x1].mean()
    acc.append(r+[sg]); print(n, ' '.join(f'{v:6.2f}' for v in r+[sg]))
acc=np.array(acc); print('mean', ' '.join(f'{v:6.2f}' for v in acc.mean(0)))
