import cv2, glob, re, numpy as np, sys
d=sys.argv[1]
fs=sorted(glob.glob(d+'/frame-*.png'),key=lambda p:float(re.search(r'at-([\d.]+)s',p).group(1)))
for f in fs:
    t=re.search(r'at-([\d.]+)s',f).group(1)
    r=cv2.imread(f,0).astype(np.float32); s=cv2.imread(f.replace('frame-','ref-'),0).astype(np.float32)
    rb=cv2.GaussianBlur(r,(0,0),8); sb=cv2.GaussianBlur(s,(0,0),8)
    col=cv2.imread(f)
    red=((col[:90,:,2]>150)&(col[:90,:,1]<120)).mean()
    print(f"{t:>6} mae8={np.abs(rb-sb).mean():5.1f} mean r/s={r.mean():5.1f}/{s.mean():5.1f} redbar={red:.3f}")
