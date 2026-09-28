# rooms.py RDIR [step]: medians of the dark room boxes, render vs source (every step-th frame), and per-box mean diff
import cv2, numpy as np, sys, os
R=sys.argv[1]; step=int(sys.argv[2]) if len(sys.argv)>2 else 6
SRC='/Users/computer/rootline/apprentice-film/snapshots/s21-r3-src'
B={'top1500-1950':(1500,0,1950,110),'top1350-1500':(1350,0,1500,110),'top1000-1350':(1000,0,1350,110),'right200-300':(2090,200,2200,300),'right300-400':(2090,300,2200,400),'right400-600':(2090,400,2200,600),'right150-200':(2090,150,2200,200),'bottom600-1600':(600,905,1600,946),'left146-150':(146,300,151,900),'tr-corner':(2040,0,2206,110)}
acc={k:[] for k in B}
for f in range(1736,1863,step):
    t=f/25; p=f'{R}/r-{t:.2f}.png'
    if not os.path.exists(p): continue
    G=lambda q: cv2.cvtColor(cv2.imread(q),cv2.COLOR_BGR2GRAY).astype(float); r=G(p); s=G(f'{SRC}/f{f:04d}.png')
    for k,(x0,y0,x1,y1) in B.items(): acc[k].append((np.median(r[y0:y1,x0:x1]),np.median(s[y0:y1,x0:x1]),(r[y0:y1,x0:x1]==0).mean()))
for k,v in acc.items():
    a=np.array(v); print(f'{k:16s} render {a[:,0].mean():5.1f}  source {a[:,1].mean():5.1f}  zero-frac {a[:,2].mean():.2f}')
