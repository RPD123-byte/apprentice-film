# measm.py "x0 y0 x1 y1 nx ny" ... : several meas boxes
import cv2, sys, numpy as np
u=cv2.imread('../f1-p3/clean_u.png',0).astype(np.float32)/255
for arg in sys.argv[1:]:
    v=[int(t) for t in arg.split()]; x0,y0,x1,y1=v[:4]; nx=v[4] if len(v)>4 else 3; ny=v[5] if len(v)>5 else 3
    xs=np.linspace(x0,x1,nx+1).astype(int); ys=np.linspace(y0,y1,ny+1).astype(int)
    print(f'== {x0},{y0}-{x1},{y1}  mean {u[y0:y1,x0:x1].mean():.3f}')
    for j in range(ny): print('   ', ' '.join(f'{u[ys[j]:ys[j+1],xs[i]:xs[i+1]].mean():.2f}' for i in range(nx)))
