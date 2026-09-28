# sheetcmp.py dir out.jpg : pairs frame-*.png (render) with source, blurred MAE (graded, sigma 8), stacked sheet
import sys, glob, re, cv2, numpy as np
from lab import src, mae
d=sys.argv[1]; out=sys.argv[2]
fs=sorted(glob.glob(d+'/frame-*.png'),key=lambda p:float(re.search(r'at-([\d.]+)s',p).group(1)))
ims=[]; ms=[]
for f in fs:
    t=float(re.search(r'at-([\d.]+)s',f).group(1)); r=cv2.imread(f); s=src(t)
    if r.shape!=s.shape: r=cv2.resize(r,(s.shape[1],s.shape[0]))
    m=mae(r,s,8); ms.append(m)
    im=np.hstack([r,s]); cv2.putText(im,f'{t:.2f} mae {m:.2f}',(20,50),0,1.5,(0,0,255),3)
    ims.append(cv2.resize(im,None,fx=0.25,fy=0.25))
    print(f'{t:.2f} {m:.2f}')
print('mean',np.mean(ms),'max',np.max(ms))
cv2.imwrite(out,np.vstack(ims),[cv2.IMWRITE_JPEG_QUALITY,85])
