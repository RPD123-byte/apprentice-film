import cv2,numpy as np,glob,re,sys
D=sys.argv[1]
fs=sorted(glob.glob(D+'/frame-*.png'),key=lambda p:float(re.search(r'at-([\d.]+)s',p).group(1)))
print('t      mR    mS   blurMAE  hiMAE  p95R p95S  p50R p50S  blackR blackS(<8 frac)')
for f in fs:
    t=float(re.search(r'at-([\d.]+)s',f).group(1))
    r=cv2.imread(f.replace('frame-','ref-'),0).astype(np.float32)
    a=cv2.imread(f,0).astype(np.float32)
    ba=cv2.GaussianBlur(a,(0,0),8); br=cv2.GaussianBlur(r,(0,0),8)
    ha=a-ba; hr=r-br
    print(f'{t:6.2f} {a.mean():5.1f} {r.mean():5.1f}  {np.abs(ba-br).mean():6.2f}  {np.abs(np.abs(ha).mean()-np.abs(hr).mean()):5.2f} {np.percentile(a,95):5.0f} {np.percentile(r,95):5.0f} {np.percentile(a,50):5.0f} {np.percentile(r,50):5.0f}  {(a<8).mean():.2f} {(r<8).mean():.2f}  hf R/S {np.abs(ha).mean():.1f}/{np.abs(hr).mean():.1f}')
