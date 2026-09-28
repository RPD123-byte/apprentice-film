import cv2,glob,re,sys,numpy as np
d=sys.argv[1]
src={}
def S(n):
    if n not in src:
        g=cv2.imread(f'snapshots/s20-rev1r-src/n{n:04d}.png'); src[n]=g
    return src[n]
def blur(a): return cv2.GaussianBlur(a.astype(np.float32),(0,0),6)
for p in sorted(glob.glob(d+'/ref-*.png')):
    T=float(re.search(r'at-([\d.]+)s',p).group(1))
    r=cv2.imread(p); f=cv2.imread(p.replace('/ref-','/frame-'))
    n0=int(round(T*25))
    best=min(((np.abs(S(m).astype(float)-r).mean(),m) for m in range(n0-2,n0+3) if S(m) is not None))
    # render vs each candidate source frame, blurred MAE
    fb=blur(cv2.cvtColor(f,cv2.COLOR_BGR2GRAY))
    errs={m:float(np.abs(fb-blur(cv2.cvtColor(S(m),cv2.COLOR_BGR2GRAY))).mean()) for m in range(n0-3,n0+4) if S(m) is not None}
    bm=min(errs,key=errs.get)
    rl=cv2.cvtColor(r,cv2.COLOR_BGR2GRAY).mean(); fl=cv2.cvtColor(f,cv2.COLOR_BGR2GRAY).mean()
    print(f"T={T:6.2f} ref=src{best[1]}({best[1]/25:.2f}) d={best[0]:.2f} | render best-matches src{bm}({bm/25:.2f}) mae={errs[bm]:.2f}  mae_vs_ref={errs.get(best[1],-1):.2f} | luma render {fl:.1f} ref {rl:.1f}")
