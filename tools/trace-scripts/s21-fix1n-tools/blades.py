#!/usr/bin/env python3
# blades.py : per frame, sample the blades across the axis at u = 40..85 px from the tracked pivot; print the
# bright runs' centres (v) — two runs = open blades.
import cv2, numpy as np, sys
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
c=cv2.VideoCapture(V)
TR=[l.split() for l in open(sys.argv[1]).read().strip().split('\n')]
base=float(sys.argv[2]) if len(sys.argv)>2 else 0.318
for row in TR:
    t,x,y,a,sc=[float(v) for v in row]
    c.set(1,int(round(t*25))); ok,f=c.read(); g=cv2.cvtColor(f,cv2.COLOR_BGR2GRAY).astype(np.float32)
    ang=base+a; cu,su=np.cos(ang),np.sin(ang)
    res=[]
    for u in (45,60,75):
        vs=np.arange(-30,31,0.5)
        px=x+cu*u-su*vs; py=y+su*u+cu*vs
        val=cv2.remap(g,px.astype(np.float32).reshape(1,-1),py.astype(np.float32).reshape(1,-1),cv2.INTER_LINEAR)[0]
        on=val>140
        runs=[];i=0
        while i<len(on):
            if on[i]:
                j=i
                while j<len(on) and on[j]: j+=1
                if j-i>=3: runs.append((vs[i]+vs[j-1])/2)
                i=j
            else: i+=1
        res.append(f'u{u}:'+','.join(f'{r:+.1f}' for r in runs))
    print(f'{t:.2f} ang {ang:+.2f}  '+'  '.join(res))
