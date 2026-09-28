import cv2, numpy as np, sys
R='s16-rev2-exact'; S='s16-rev2-src'
def g(p): return cv2.cvtColor(cv2.imread(p), cv2.COLOR_BGR2GRAY).astype(np.float32)
def e(a,b,s): return float(np.abs(cv2.GaussianBlur(a,(0,0),s)-cv2.GaussianBlur(b,(0,0),s)).mean())
src={n:g(f'{S}/s{n}.png') for n in range(1140,1198)}
small={n:cv2.resize(cv2.GaussianBlur(v,(0,0),4),(276,118)) for n,v in src.items()}
for n in range(1140,1198):
    a=g(f'{R}/r{n}.png'); b=src[n]
    sa=cv2.resize(cv2.GaussianBlur(a,(0,0),4),(276,118))
    best=min(small,key=lambda m: np.abs(small[m]-sa).mean())
    d=np.abs(small[best]-sa).mean(); d0=np.abs(small[n]-sa).mean()
    print(n, f'mean r {a.mean():6.2f} s {b.mean():6.2f} | s2 {e(a,b,2):5.2f} s8 {e(a,b,8):5.2f} | best {best} ({d:.2f} vs own {d0:.2f})')
