import cv2, glob, re, sys, numpy as np
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
d=sys.argv[1]
c=cv2.VideoCapture(V)
cache={}
def fr(n):
    if n not in cache:
        c.set(cv2.CAP_PROP_POS_FRAMES,n); ok,f=c.read(); cache[n]=cv2.cvtColor(f,cv2.COLOR_BGR2GRAY).astype(np.float32)
    return cache[n]
for p in sorted(glob.glob(d+'/ref-*.png'),key=lambda p:float(re.search(r'at-([\d.]+)s',p).group(1))):
    t=float(re.search(r'at-([\d.]+)s',p).group(1))
    r=cv2.cvtColor(cv2.imread(p),cv2.COLOR_BGR2GRAY).astype(np.float32)
    n0=int(round(t*25))
    errs={n:np.abs(fr(n)-r).mean() for n in range(n0-2,n0+3)}
    b=min(errs,key=errs.get)
    print(f"{t:.2f} nearest={n0} ({n0/25:.2f}) best={b} ({b/25:.2f}) err={errs[b]:.2f} second={sorted(errs.values())[1]:.2f}")
