import cv2, numpy as np, sys, os
rdir=sys.argv[1]
def S(n): return cv2.imread(f'src/f{n}.png').astype(np.float32)
def R(n): return cv2.imread(f'{rdir}/r-{n/25:.3f}.png').astype(np.float32)
m=np.ones((946,2206),bool); m[150:480,1440:1720]=False
refS=np.mean([S(n) for n in range(3495,3505)],0); refR=np.mean([R(n) for n in range(3495,3505)],0) if os.path.exists(f'{rdir}/r-139.800.png') else None
sky=(slice(20,150),slice(800,1300)); cld=(slice(700,900),slice(100,700))
def hp(im,reg):
    L=cv2.cvtColor(im.clip(0,255).astype(np.uint8),cv2.COLOR_BGR2GRAY).astype(np.float32)
    h=L-cv2.GaussianBlur(L,(0,0),4); return h[reg].std()
print(' t     alpha S/R      skyRGB ratio S            skyRGB ratio R          sky(S)          sky(R)      hpsky S/R    hpcld S/R')
for n in range(int(sys.argv[2]) if len(sys.argv)>2 else 3500, 3520):
    s=S(n); r=R(n)
    a=(s[m]*refS[m]).sum()/(refS[m]**2).sum(); b=(r[m]*refR[m]).sum()/(refR[m]**2).sum()
    rs=s[sky].reshape(-1,3).mean(0)/refS[sky].reshape(-1,3).mean(0); rr=r[sky].reshape(-1,3).mean(0)/refR[sky].reshape(-1,3).mean(0)
    cs=s[sky].reshape(-1,3).mean(0)[::-1]; cr=r[sky].reshape(-1,3).mean(0)[::-1]
    print(f'{n/25:.2f} {a:.3f} {b:.3f}  ({rs[2]:.3f},{rs[1]:.3f},{rs[0]:.3f}) ({rr[2]:.3f},{rr[1]:.3f},{rr[0]:.3f})  ({cs[0]:3.0f},{cs[1]:3.0f},{cs[2]:3.0f}) ({cr[0]:3.0f},{cr[1]:3.0f},{cr[2]:3.0f})  {hp(s,sky):.2f}/{hp(r,sky):.2f}  {hp(s,cld):.2f}/{hp(r,cld):.2f}')
