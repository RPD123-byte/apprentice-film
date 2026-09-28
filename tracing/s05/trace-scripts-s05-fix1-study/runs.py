# runs.py img axis(x|y) pos a0 a1 [thr_lo thr_hi] : print luminance runs along a column/row (blurred 3px)
import cv2, sys, numpy as np
im=cv2.cvtColor(cv2.imread(sys.argv[1]),cv2.COLOR_BGR2GRAY); im=cv2.GaussianBlur(im,(0,0),1.2)
ax,pos,a0,a1=sys.argv[2],int(sys.argv[3]),int(sys.argv[4]),int(sys.argv[5])
lo=int(sys.argv[6]) if len(sys.argv)>6 else 60; hi=int(sys.argv[7]) if len(sys.argv)>7 else 120
v=im[a0:a1,pos] if ax=='x' else im[pos,a0:a1]
cls=lambda p: 'D' if p<lo else ('L' if p>hi else 'm')
out=[];cur=cls(v[0]);st=a0
for i,p in enumerate(v):
    c=cls(p)
    if c!=cur: out.append(f'{cur}{st}-{a0+i-1}'); cur=c; st=a0+i
out.append(f'{cur}{st}-{a1-1}')
print(ax,pos,' '.join(out))
