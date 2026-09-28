import cv2, glob, re, sys, numpy as np
d=sys.argv[1]
def lab(im):
    return cv2.cvtColor(cv2.GaussianBlur(im,(0,0),8).astype(np.float32)/255,cv2.COLOR_BGR2LAB)
rows=[]
for f in sorted(glob.glob(d+'/frame-*.png'),key=lambda p:float(re.search(r'at-([\d.]+)s',p).group(1))):
    t=float(re.search(r'at-([\d.]+)s',f).group(1))
    r=f.replace('frame-','ref-')
    a=cv2.imread(f); b=cv2.imread(r)
    if a is None or b is None: continue
    dE=np.sqrt(((lab(a)-lab(b))**2).sum(2))
    ya=cv2.cvtColor(a,cv2.COLOR_BGR2GRAY); yb=cv2.cvtColor(b,cv2.COLOR_BGR2GRAY)
    ha=cv2.cvtColor(a,cv2.COLOR_BGR2HSV); hb=cv2.cvtColor(b,cv2.COLOR_BGR2HSV)
    sat=lambda h:((h[...,1]>90)&(h[...,2]>60)).mean()*100
    blk=lambda y:(y<12).mean()*100
    # third splits
    W=a.shape[1]
    out=f"{t:7.2f} F{int(np.ceil(t*25-0.001))} dE8 {dE.mean():5.2f} [L{dE[:,:W//3].mean():5.1f} C{dE[:,W//3:2*W//3].mean():5.1f} R{dE[:,2*W//3:].mean():5.1f}] Y {ya.mean():5.1f}/{yb.mean():5.1f} p95 {np.percentile(ya,95):.0f}/{np.percentile(yb,95):.0f} sat {sat(ha):4.1f}/{sat(hb):4.1f} blk {blk(ya):4.1f}/{blk(yb):4.1f}"
    print(out)
