# python dmap.py rdir n0,n1 x0 y0 x1 y1 scale out  : render | source | diff heat (mean over frames, blurred sigma 1.5)
import cv2, numpy as np, sys, os
rdir=sys.argv[1]; n0,n1=[int(v) for v in sys.argv[2].split(',')]; x0,y0,x1,y1=[int(v) for v in sys.argv[3:7]]; sc=int(sys.argv[7]); out=sys.argv[8]
ns=[n for n in range(n0,n1+1) if os.path.exists(f'{rdir}/r-{n/25:.3f}.png')]
r=np.mean([cv2.imread(f'{rdir}/r-{n/25:.3f}.png').astype(np.float32)[y0:y1,x0:x1] for n in ns],0)
s=np.mean([cv2.imread(f'src/f{n}.png').astype(np.float32)[y0:y1,x0:x1] for n in ns],0)
d=np.abs(cv2.GaussianBlur(r,(0,0),1.5)-cv2.GaussianBlur(s,(0,0),1.5)).mean(2)
print('mean diff',d.mean())
h=cv2.applyColorMap(np.clip(d*4,0,255).astype(np.uint8),cv2.COLORMAP_INFERNO)
up=lambda a: cv2.resize(a.clip(0,255).astype(np.uint8),None,fx=sc,fy=sc,interpolation=cv2.INTER_NEAREST)
cv2.imwrite(out,np.hstack([up(r),up(s),up(h)]),[cv2.IMWRITE_JPEG_QUALITY,90])
