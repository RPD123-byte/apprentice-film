# usage: emap.py RDIR frame out.jpg  -> signed error map (render - source, sigma8) + region breakdown
import cv2, sys, numpy as np
rd,f,out=sys.argv[1],int(sys.argv[2]),sys.argv[3]
r=cv2.imread(f'{rd}/r-{f:05d}.png',0).astype(np.float32); s=cv2.imread(f'src/f{f:05d}.png',0).astype(np.float32)
gr=cv2.GaussianBlur(r,(0,0),8); gs=cv2.GaussianBlur(s,(0,0),8); d=gr-gs
print('total', np.abs(d).mean().round(2))
H,W=d.shape
# 8x4 grid of cell means
for y in range(0,H,H//4+1):
    print(' '.join(f'{np.abs(d[y:y+H//4+1,x:x+W//8+1]).mean():5.1f}{"+" if d[y:y+H//4+1,x:x+W//8+1].mean()>0 else "-"}' for x in range(0,W,W//8+1)))
vis=np.clip(128+d*3,0,255).astype(np.uint8)
vis=cv2.applyColorMap(vis,cv2.COLORMAP_JET)
cv2.imwrite(out,cv2.resize(vis,(W//2,H//2)))
