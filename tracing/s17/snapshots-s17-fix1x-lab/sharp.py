# sharp.py dir t1,t2,..: Laplacian sharpness (mean |lap| of gray, σ0.7 pre-smoothed) render/source, overall and >800 px from (865,341)
import sys, cv2, numpy as np
d=sys.argv[1]; ts=[float(x) for x in sys.argv[2].split(',')]
H,W=946,2206; yy,xx=np.mgrid[0:H,0:W]; far=np.hypot(xx-865,yy-341)>800
def lap(im):
    g=cv2.cvtColor(im,cv2.COLOR_BGR2GRAY).astype(np.float32); g=cv2.GaussianBlur(g,(0,0),0.7)
    return np.abs(cv2.Laplacian(g,cv2.CV_32F,ksize=3))
for t in ts:
    r=cv2.imread(f'{d}/r{t:.2f}.png'); s=cv2.imread(f'{d}/s{t:.2f}.png')
    lr,ls=lap(r),lap(s)
    print(f't={t:.2f} all {lr.mean():.2f}/{ls.mean():.2f}={lr.mean()/ls.mean():.3f}  far {lr[far].mean():.2f}/{ls[far].mean():.2f}={lr[far].mean()/ls[far].mean():.3f}')
