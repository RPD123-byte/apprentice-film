# measr.py NAME x0 y0 x1 y1 [nx ny]: our raw render vs the source plate, cell means (pre-grade 0..1): "ours/src"
import cv2, sys, numpy as np
r=cv2.imread(f'../f1-p3/{sys.argv[1]}_raw.png',0).astype(np.float32)/255
u=cv2.imread('../f1-p3/clean_u.png',0).astype(np.float32)/255
x0,y0,x1,y1=[int(v) for v in sys.argv[2:6]]; nx=int(sys.argv[6]) if len(sys.argv)>6 else 4; ny=int(sys.argv[7]) if len(sys.argv)>7 else 4
xs=np.linspace(x0,x1,nx+1).astype(int); ys=np.linspace(y0,y1,ny+1).astype(int)
print('      '+' '.join(f'{(xs[i]+xs[i+1])//2:11d}' for i in range(nx)))
for j in range(ny):
    print(f'{(ys[j]+ys[j+1])//2:5d} '+' '.join(f'{r[ys[j]:ys[j+1],xs[i]:xs[i+1]].mean():5.2f}/{u[ys[j]:ys[j+1],xs[i]:xs[i+1]].mean():4.2f}' for i in range(nx)))
R=r[y0:y1,x0:x1]; U=u[y0:y1,x0:x1]
print('mean %.3f/%.3f  p10 %.2f/%.2f p50 %.2f/%.2f p90 %.2f/%.2f'%(R.mean(),U.mean(),*[v for pr in zip(np.percentile(R,[10,50,90]),np.percentile(U,[10,50,90])) for v in pr]))
