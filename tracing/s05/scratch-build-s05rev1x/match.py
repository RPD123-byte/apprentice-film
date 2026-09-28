import cv2, numpy as np, glob, re, sys, math
sys.path.insert(0,'/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/s05rev1x')
from src_frames import get
d=sys.argv[1]
B=lambda x,s: cv2.GaussianBlur(x,(0,0),s)
scr=np.zeros((946,2206),np.uint8); cv2.fillPoly(scr,[np.array([[315,246],[834,168],[898,519],[409,648]])],1); ns=cv2.dilate(scr,np.ones((9,9)))==0
cache={}
def src(k):
    if k not in cache: cache[k]=get(k).astype(np.float32).mean(2)
    return cache[k]
for f in sorted(glob.glob(d+'/frame-*.png'),key=lambda p: float(re.search(r'at-([\d.]+)s',p).group(1))):
    P=float(re.search(r'at-([\d.]+)s',f).group(1))
    a=cv2.imread(f).astype(np.float32).mean(2)
    r=cv2.imread(f.replace('frame-','ref-')).astype(np.float32).mean(2)
    ke=math.ceil(math.floor(P*30+1e-6)/30*25-1e-6)
    ks=range(ke-3,ke+4)
    Ab=B(a,2); Rb=B(r,2)
    em={k:float(np.abs(Ab-B(src(k),2)).mean()) for k in ks}
    rm={k:float(np.abs(Rb-B(src(k),2)).mean()) for k in ks}
    kb=min(em,key=em.get); kr=min(rm,key=rm.get)
    ens=float(np.abs(Ab-B(src(ke),2))[ns].mean())
    print(f'P {P:.2f} exp k {ke} ({ke/25:.2f}) | render best k {kb} ({kb/25:.2f}) mae {em[kb]:.2f}, at exp {em[ke]:.2f}, noscreen {ens:.2f} | ref-png is k {kr} ({rm[kr]:.2f}) | mean r {a.mean():.1f} s {src(ke).mean():.1f}')
