import cv2, numpy as np
def S(n): return cv2.imread(f'src/f{n}.png').astype(np.float32)
def R(n): return cv2.imread(f'all/r-{n/25:.3f}.png').astype(np.float32)
m=np.ones((946,2206),bool); m[150:480,1440:1720]=False
refS=np.mean([S(n) for n in range(3495,3505)],0)[m]; refR=np.mean([R(n) for n in range(3495,3505)],0)[m]
print(' t    src   rend  diff  | meanL src rend')
for n in range(3500,3520):
    s=S(n)[m]; r=R(n)[m]
    a=(s*refS).sum()/(refS*refS).sum(); b=(r*refR).sum()/(refR*refR).sum()
    print(f'{n/25:.2f} {a:.3f} {b:.3f} {b-a:+.3f} | {s.mean():6.1f} {r.mean():6.1f}')
