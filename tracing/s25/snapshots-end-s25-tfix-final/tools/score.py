# score.py DIR f0 f1 [x0 y0 x1 y1]  -> per-frame mad (mean abs RGB after gaussian blur sigma 4 / 12) vs source frames
import cv2, numpy as np, sys, os
d=sys.argv[1]; f0=int(sys.argv[2]); f1=int(sys.argv[3])
roi=[int(v) for v in sys.argv[4:8]] if len(sys.argv)>=8 else None
M='/Users/computer/rootline/apprentice-film/snapshots/end-s25-tfix-meas'
def bl(a,s): return cv2.GaussianBlur(a,(0,0),s)
rows=[]
for f in range(f0,f1+1):
    p=os.path.join(d,f'{f}.png'); s=os.path.join(M,f'src_{f:05d}.png')
    if not os.path.exists(p) or not os.path.exists(s): continue
    a=cv2.imread(p).astype(np.float32); b=cv2.imread(s).astype(np.float32)
    r=[]
    for sg in (4,12):
        e=np.abs(bl(a,sg)-bl(b,sg)).mean(2)
        if roi: e=e[roi[1]:roi[3],roi[0]:roi[2]]
        r.append(e.mean())
    rows.append((f,*r))
for f,a,b in rows: print(f'{f} {f/25:.2f} {a:.2f} {b:.2f}')
A=np.array([r[1:] for r in rows]); print('MEAN', *(f'{v:.2f}' for v in A.mean(0)), 'n',len(rows))
