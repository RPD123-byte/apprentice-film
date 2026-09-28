import cv2, glob, re, numpy as np, math, sys
S='/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/s17f/'
d=sys.argv[1]
fs=sorted(glob.glob(d+'/frame-*.png'),key=lambda p:float(re.search(r'at-([\d.]+)s',p).group(1)))
for f in fs:
    t=float(re.search(r'at-([\d.]+)s',f).group(1)); q=math.floor(t*30+1e-9)/30; n=math.ceil(q*25-0.01)
    a=cv2.imread(f,0).astype(np.float32); b=cv2.imread(S+'src/f%04d.png'%n,0)
    if b is None: continue
    b=b.astype(np.float32)
    ba=cv2.GaussianBlur(a,(0,0),6); bb=cv2.GaussianBlur(b,(0,0),6)
    la=cv2.Laplacian(a[40:260,40:900],cv2.CV_32F).var(); lb=cv2.Laplacian(b[40:260,40:900],cv2.CV_32F).var()
    print('t=%.2f f%d blurMAE=%5.2f mean r/s=%5.1f/%5.1f p90 %5.1f/%5.1f lapvar(title) %6.0f/%6.0f'%(t,n,np.abs(ba-bb).mean(),a.mean(),b.mean(),np.percentile(a,90),np.percentile(b,90),la,lb))
