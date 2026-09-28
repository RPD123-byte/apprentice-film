import cv2,glob,numpy as np,re,sys
S='/private/tmp/claude-501/-Users-computer-vibe-check/9d8e3a22-605d-469a-804c-e2a05ae8a7e5/scratchpad/rev2/src'
def srcf(fi):
    return cv2.imread(f'{S}/f{fi-472:04d}.png',0).astype(np.float32)
def bl(a,s): return cv2.GaussianBlur(a,(0,0),s)
for d in sys.argv[1:]:
  for f in sorted(glob.glob(d+'/frame-*.png'),key=lambda p:float(re.search(r'at-([\d.]+)s',p).group(1))):
    t=float(re.search(r'at-([\d.]+)s',f).group(1))
    r=f.replace('frame-','ref-')
    a=cv2.imread(f,0).astype(np.float32); b=cv2.imread(r,0).astype(np.float32)
    s6=np.abs(bl(a,6)-bl(b,6)).mean(); s2=np.abs(bl(a,2)-bl(b,2)).mean()
    # texture: bandpass energy
    ta=np.abs(a-bl(a,2)).mean(); tb=np.abs(b-bl(b,2)).mean()
    # best source frame
    fi=int(np.ceil(np.floor(t*30+1e-6)/30*25-1e-6))
    best=[]
    for k in range(fi-3,fi+4):
        try: best.append((np.abs(bl(a,6)-bl(srcf(k),6)).mean(),k))
        except Exception: pass
    best.sort()
    print(f"{t:6.2f} drawfi {fi} s6 {s6:5.2f} s2 {s2:5.2f} tex {ta:4.2f}/{tb:4.2f} mean {a.mean():5.1f}/{b.mean():5.1f} best src {best[0][1]} ({best[0][0]:.2f}) 2nd {best[1][1]} ({best[1][0]:.2f})")
