# win.py x0 y0 x1 y1 DIR1 DIR2 ... -- t1,t2 : MAE (σ1.5) and NCC in the window for each render dir vs source
import cv2, numpy as np, sys
a=sys.argv[1:]; i=a.index('--'); x0,y0,x1,y1=map(int,a[:4]); dirs=a[4:i]; ts=a[i+1].split(',')
G=lambda q: cv2.cvtColor(cv2.imread(q),cv2.COLOR_BGR2GRAY).astype(np.float32)
SRC='/Users/computer/rootline/apprentice-film/snapshots/s21-r3-src'
for d in dirs:
    res=[]
    for t in ts:
        t=float(t); r=cv2.GaussianBlur(G(f'{d}/r-{t:.2f}.png'),(0,0),1.5)[y0:y1,x0:x1]; s=cv2.GaussianBlur(G(f'{SRC}/f{round(t*25):04d}.png'),(0,0),1.5)[y0:y1,x0:x1]
        u=r-r.mean(); v=s-s.mean(); res.append((np.abs(r-s).mean(), (u*v).sum()/np.sqrt((u*u).sum()*(v*v).sum())))
    m=np.array(res).mean(0); print(f'{d.split("/")[-1]:14s} MAE {m[0]:5.1f} NCC {m[1]:.3f}  ', ' '.join(f'{x[0]:.1f}' for x in res))
