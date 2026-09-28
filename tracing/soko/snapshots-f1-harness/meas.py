# meas.py x0 y0 x1 y1 [nx ny] : ungraded source mean values in a grid of cells over the box (pre-grade, 0..1)
import cv2, sys, numpy as np
u=cv2.imread('../f1-p3/clean_u.png',0).astype(np.float32)/255
x0,y0,x1,y1=[int(v) for v in sys.argv[1:5]]; nx=int(sys.argv[5]) if len(sys.argv)>5 else 4; ny=int(sys.argv[6]) if len(sys.argv)>6 else 4
xs=np.linspace(x0,x1,nx+1).astype(int); ys=np.linspace(y0,y1,ny+1).astype(int)
print('      '+' '.join(f'{(xs[i]+xs[i+1])//2:6d}' for i in range(nx)))
for j in range(ny):
    print(f'{(ys[j]+ys[j+1])//2:5d} '+' '.join(f'{u[ys[j]:ys[j+1],xs[i]:xs[i+1]].mean():6.3f}' for i in range(nx)))
print('mean', u[y0:y1,x0:x1].mean().round(3), 'p10/p50/p90', np.percentile(u[y0:y1,x0:x1],[10,50,90]).round(3))
