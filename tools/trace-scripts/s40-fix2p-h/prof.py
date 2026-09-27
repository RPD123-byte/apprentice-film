# python prof.py rdir n0,n1 v|h coord a0 a1   -> per-pixel render vs source (mean over frames)
import cv2, numpy as np, sys, os
rdir=sys.argv[1]; n0,n1=[int(v) for v in sys.argv[2].split(',')]; mode=sys.argv[3]; c=int(sys.argv[4]); a0,a1=int(sys.argv[5]),int(sys.argv[6])
def S(n): return cv2.imread(f'src/f{n}.png').astype(np.float32)
def R(n): return cv2.imread(f'{rdir}/r-{n/25:.3f}.png').astype(np.float32)
ns=[n for n in range(n0,n1+1) if os.path.exists(f'{rdir}/r-{n/25:.3f}.png')]
r=np.mean([R(n) for n in ns],0); s=np.mean([S(n) for n in ns],0)
for a in range(a0,a1+1):
    y,x=(a,c) if mode=='v' else (c,a)
    rv=r[y,x][::-1]; sv=s[y,x][::-1]
    print(f'{a:5d}  R({rv[0]:5.0f},{rv[1]:5.0f},{rv[2]:5.0f})  S({sv[0]:5.0f},{sv[1]:5.0f},{sv[2]:5.0f})  d({rv[0]-sv[0]:+4.0f},{rv[1]-sv[1]:+4.0f},{rv[2]-sv[2]:+4.0f})')
