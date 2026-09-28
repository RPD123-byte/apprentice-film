#!/usr/bin/env python3
# mae_all.py renderdir : blurred (sigma 6) MAE vs source for every r_T.png, grouped by beat
import cv2, numpy as np, glob, re, sys
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
rd=sys.argv[1]; c=cv2.VideoCapture(V); rows=[]
for p in sorted(glob.glob(rd+'/r_*.png')):
    t=float(re.search(r'r_([\d.]+)\.png',p).group(1)); fr=int(round(t*25))
    c.set(cv2.CAP_PROP_POS_FRAMES,fr); ok,s=c.read(); r=cv2.imread(p)
    a=cv2.GaussianBlur(cv2.cvtColor(r,cv2.COLOR_BGR2GRAY).astype(np.float32),(0,0),6)
    b=cv2.GaussianBlur(cv2.cvtColor(s,cv2.COLOR_BGR2GRAY).astype(np.float32),(0,0),6)
    rows.append((t,fr,np.abs(a-b).mean()))
G=[('push',63.1,63.62),('front',63.62,64.26),('flap',64.26,65.58),('stare',65.58,66.84),('B1',66.84,67.18),('grab+whirl',67.18,67.78),('hold',67.78,69.5)]
for n,a,b in G:
    v=[m for t,f,m in rows if a<=t<b]
    if v: print(f'{n:11s} {np.mean(v):5.2f} ({len(v)})')
print(f'mean {np.mean([m for _,_,m in rows]):.2f}  worst '+', '.join(f'{t:.2f}:{m:.1f}' for t,f,m in sorted(rows,key=lambda x:-x[2])[:5]))
if len(sys.argv)>2: [print(f'{t:.2f} {f} {m:.2f}') for t,f,m in rows]
