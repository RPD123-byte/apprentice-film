import cv2, numpy as np, glob, sys, math
sys.path.insert(0,'.')
from src_frames import get
d=sys.argv[1]; x0,y0,x1,y1=map(int,sys.argv[2:6]); R=int(sys.argv[6]) if len(sys.argv)>6 else 4
B=lambda x: cv2.GaussianBlur(x,(0,0),2)
cache={}
def src(k):
    if k not in cache: cache[k]=B(get(k).astype(np.float32).mean(2)[y0:y1,x0:x1])
    return cache[k]
for f in sorted(glob.glob(d+'/frame-*.png'),key=lambda p: float(p.split('-at-')[1][:-5])):
    P=float(f.split('-at-')[1][:-5]); ke=math.ceil(math.floor(P*30+1e-6)/30*25-1e-6)
    if P<23.11 or P>26.71: continue
    a=B(cv2.imread(f).astype(np.float32).mean(2)[y0:y1,x0:x1])
    e={k:float(np.abs(a-src(k)).mean()) for k in range(ke-R,ke+R+1)}
    kb=min(e,key=e.get)
    s=' '.join(f'{e[k]:5.1f}' for k in range(ke-R,ke+R+1))
    print(f'{P:.2f} k{ke} best {kb-ke:+d} ({e[kb]:.1f} vs {e[ke]:.1f}) | {s}')
