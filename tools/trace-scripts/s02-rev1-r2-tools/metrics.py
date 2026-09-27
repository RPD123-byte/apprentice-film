import cv2, glob, re, sys, numpy as np, os
d=sys.argv[1]
fs=sorted(glob.glob(d+'/frame-*.png'),key=lambda p:float(re.search(r'at-([\d.]+)s',p).group(1)))
os.makedirs(d+'/stk',exist_ok=True)
for f in fs:
    t=re.search(r'at-([\d.]+)s',f).group(1)
    r=f.replace('frame-','ref-')
    a=cv2.imread(f).astype(np.float32); b=cv2.imread(r).astype(np.float32)
    ga=cv2.GaussianBlur(a,(0,0),8); gb=cv2.GaussianBlur(b,(0,0),8)
    mae=np.abs(ga-gb).mean()
    raw=np.abs(a-b).mean()
    la=a.mean(); lb=b.mean()
    # black fraction
    ka=(a.max(2)<20).mean(); kb=(b.max(2)<20).mean()
    # colour: mean of G-(R+B)/2 and R-B over non-black
    def col(x):
        m=x.max(2)>30
        if m.sum()==0: return 0,0
        B,G,R=x[...,0][m],x[...,1][m],x[...,2][m]
        return (G-(R+B)/2).mean(), (R-B).mean()
    ca=col(a); cb=col(b)
    # edge energy (line detail)
    ea=np.abs(cv2.Laplacian(cv2.cvtColor(a,cv2.COLOR_BGR2GRAY),cv2.CV_32F)).mean()
    eb=np.abs(cv2.Laplacian(cv2.cvtColor(b,cv2.COLOR_BGR2GRAY),cv2.CV_32F)).mean()
    print(f"t={t:>6} blurMAE={mae:5.2f} rawMAE={raw:5.2f} mean r/s={la:5.1f}/{lb:5.1f} black r/s={ka:.3f}/{kb:.3f} green r/s={ca[0]:+.1f}/{cb[0]:+.1f} warm r/s={ca[1]:+.1f}/{cb[1]:+.1f} lap r/s={ea:.2f}/{eb:.2f}")
    s=np.vstack([a,np.full((6,a.shape[1],3),(0,0,255),np.float32),b])
    s=cv2.resize(s,(1400,int(s.shape[0]*1400/s.shape[1])))
    cv2.imwrite(d+f'/stk/{float(t):06.2f}.jpg',s,[cv2.IMWRITE_JPEG_QUALITY,88])
