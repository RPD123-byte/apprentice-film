# measrm.py NAME "x0 y0 x1 y1 nx ny" ... : ours/source cell means (pre-grade)
import cv2, sys, numpy as np
r=cv2.imread(f'../f1-p3/{sys.argv[1]}_raw.png',0).astype(np.float32)/255
u=cv2.imread('../f1-p3/clean_u.png',0).astype(np.float32)/255
for arg in sys.argv[2:]:
    v=[int(t) for t in arg.split()]; x0,y0,x1,y1=v[:4]; nx=v[4] if len(v)>4 else 3; ny=v[5] if len(v)>5 else 2
    xs=np.linspace(x0,x1,nx+1).astype(int); ys=np.linspace(y0,y1,ny+1).astype(int)
    print(f'== {x0},{y0}-{x1},{y1}: ours {r[y0:y1,x0:x1].mean():.2f} src {u[y0:y1,x0:x1].mean():.2f}   (x: '+' '.join(str((xs[i]+xs[i+1])//2) for i in range(nx))+')')
    for j in range(ny): print(f'  y{(ys[j]+ys[j+1])//2:4d} '+' '.join(f'{r[ys[j]:ys[j+1],xs[i]:xs[i+1]].mean():.2f}/{u[ys[j]:ys[j+1],xs[i]:xs[i+1]].mean():.2f}' for i in range(nx)))
