#!/usr/bin/env python3
# audit.py src.js vref.npy raw.png : for every stripes()/face() call with a literal quad, print measured corner values
# (source) and my rendered corner values (raw render), to find faces whose light is off.
import re, sys, numpy as np, cv2
src=open(sys.argv[1]).read().split('\n'); v=np.load(sys.argv[2])
m=cv2.GaussianBlur(cv2.imread(sys.argv[3]).astype(np.float32).mean(2)/255,(0,0),3)
num=r'-?\d+(?:\.\d+)?'
pat=re.compile(r'(stripes|face)\(g, \[\[('+num+'), ('+num+r')\], \[('+num+'), ('+num+r')\], \[('+num+'), ('+num+r')\], \[('+num+'), ('+num+r')\]\]')
def samp(im,q,u,w,r=3):
    a=[q[0][k]+(q[1][k]-q[0][k])*u for k in (0,1)]; b=[q[3][k]+(q[2][k]-q[3][k])*u for k in (0,1)]
    x,y=[int(a[k]+(b[k]-a[k])*w) for k in (0,1)]
    return im[max(0,y-r):y+r+1,max(0,x-r):x+r+1].mean()
rows=[]
for i,l in enumerate(src):
    for mt in pat.finditer(l):
        f=[float(t) for t in mt.groups()[1:]]; q=[f[0:2],f[2:4],f[4:6],f[6:8]]
        S=[samp(v,q,u,w) for u,w in ((.15,.15),(.85,.15),(.85,.85),(.15,.85))]; M=[samp(m,q,u,w) for u,w in ((.15,.15),(.85,.15),(.85,.85),(.15,.85))]
        d=np.mean(M)-np.mean(S)
        rows.append((abs(d),i+1,mt.group(1),q,S,M,d))
rows.sort(reverse=True)
for ad,ln,fn,q,S,M,d in rows[:int(sys.argv[4]) if len(sys.argv)>4 else 40]:
    print('%5d %-7s d=%+.2f  src [%s]  mine [%s]  q=%s'%(ln,fn,d,', '.join('%.2f'%x for x in S),', '.join('%.2f'%x for x in M),q[0]))
