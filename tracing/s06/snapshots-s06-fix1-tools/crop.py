#!/usr/bin/env python3
# crop.py DIR frame x0 y0 x1 y1 zoom out.jpg [--diff] : render | source (| signed diff) crop, zoomed
import cv2, numpy as np, sys
d=sys.argv[1]; n=int(sys.argv[2]); x0,y0,x1,y1=[int(v) for v in sys.argv[3:7]]; z=float(sys.argv[7]); out=sys.argv[8]
a=cv2.imread(f'{d}/f-{n}.png'); b=cv2.imread(f'/Users/computer/rootline/apprentice-film/snapshots/s06-fix1-src/s-{n}.png')
A=a[y0:y1,x0:x1]; B=b[y0:y1,x0:x1]; ims=[A,B]
if '--diff' in sys.argv:
    e=cv2.cvtColor(A,cv2.COLOR_BGR2GRAY).astype(float)-cv2.cvtColor(B,cv2.COLOR_BGR2GRAY).astype(float)
    D=np.clip(128+e*2,0,255).astype(np.uint8); ims.append(cv2.cvtColor(D,cv2.COLOR_GRAY2BGR))
im=np.hstack(ims) if (x1-x0)<(y1-y0)*1.6 else np.vstack(ims)
im=cv2.resize(im,None,fx=z,fy=z,interpolation=cv2.INTER_NEAREST if z>=2 else cv2.INTER_AREA)
cv2.imwrite(out,im,[cv2.IMWRITE_JPEG_QUALITY,93])
