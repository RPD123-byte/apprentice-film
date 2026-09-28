# For each ref-*.png in a compare dir, find which exact source frame it equals; also compute MAE vs render.
import cv2, numpy as np, glob, re, sys
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
d=sys.argv[1]
c=cv2.VideoCapture(V)
cache={}
def fr(n):
    if n not in cache:
        c.set(cv2.CAP_PROP_POS_FRAMES,n); ok,f=c.read(); cache[n]=f
    return cache[n]
for f in sorted(glob.glob(d+'/ref-*.png'), key=lambda p: float(re.search(r'at-([\d.]+)s',p).group(1))):
    t=float(re.search(r'at-([\d.]+)s',f).group(1))
    r=cv2.imread(f).astype(float)
    n0=int(round(t*25))
    best=min(range(n0-2,n0+3), key=lambda n: np.abs(fr(n).astype(float)-r).mean())
    e=np.abs(fr(best).astype(float)-r).mean()
    a=cv2.imread(f.replace('ref-','frame-')).astype(float)
    ga=cv2.GaussianBlur(cv2.cvtColor(a.astype(np.uint8),cv2.COLOR_BGR2GRAY),(0,0),5).astype(float)
    gb=cv2.GaussianBlur(cv2.cvtColor(fr(n0).astype(np.uint8),cv2.COLOR_BGR2GRAY),(0,0),5).astype(float)
    print(f"t={t:6.3f} tool-ref=frame {best} ({best/25:.2f}) err {e:.1f} | exact frame {n0}; blurred MAE render vs frame{n0}: {np.abs(ga-gb).mean():.1f}; means {ga.mean():.1f}/{gb.mean():.1f}")
