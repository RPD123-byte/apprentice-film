import cv2, numpy as np
def S(n): return cv2.imread(f'src/f{n}.png').astype(np.float32)
def R(n): return cv2.imread(f'all3/r-{n/25:.3f}.png').astype(np.float32)
m=np.ones((946,2206),bool); m[150:480,1440:1720]=False   # owl out
m[:40]=False; m[-40:]=False
def fit(get, n0, n1, n):
    A=get(n0)[m]; B=get(n1)[m]; F=get(n)[m]
    d=(B-A).ravel(); e=(F-A).ravel()
    return float((d*e).sum()/(d*d).sum())
print(' t     src    rend   diff')
for n in range(3393,3426):
    a=fit(S,3392,3428,n); b=fit(R,3392,3428,n)
    print(f'{n/25:.2f} {a:6.3f} {b:6.3f} {b-a:+.3f}')
