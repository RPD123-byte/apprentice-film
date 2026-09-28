import cv2, numpy as np, glob, re, sys
d=sys.argv[1]
fs=sorted(glob.glob(d+'/frame-*.png'),key=lambda p:float(re.search(r'at-([\d.]+)s',p).group(1)))
for f in fs:
    r=f.replace('frame-','ref-')
    a=cv2.imread(f); b=cv2.imread(r)
    if a is None or b is None: continue
    if a.shape!=b.shape: b=cv2.resize(b,(a.shape[1],a.shape[0]))
    def lab(x):
        x=cv2.GaussianBlur(x,(0,0),8).astype(np.float32)/255
        return cv2.cvtColor(x,cv2.COLOR_BGR2LAB)
    la,lb=lab(a),lab(b)
    de=np.sqrt(((la-lb)**2).sum(2)).mean()
    ma=cv2.cvtColor(a,cv2.COLOR_BGR2GRAY).mean(); mb=cv2.cvtColor(b,cv2.COLOR_BGR2GRAY).mean()
    t=re.search(r'at-([\d.]+)s',f).group(1)
    print(f'{t:>8} dE={de:5.2f} meanY render={ma:6.1f} src={mb:6.1f} shape={a.shape}')
