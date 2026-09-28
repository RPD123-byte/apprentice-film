#!/usr/bin/env python3
# cmp.py RENDER.png REF x0 y0 x1 y1 out.jpg [scale] [--raw]: side by side (render | source) crop; with --raw the source
# side is the ungraded reference (REF_u) and render is expected ungraded.
import sys, cv2, numpy as np
a=sys.argv; r=cv2.imread(a[1]); ref=a[2]; x0,y0,x1,y1=[int(v) for v in a[3:7]]; out=a[7]
sc=float(a[8]) if len(a)>8 and not a[8].startswith('--') else 1
if '--raw' in a: s=(np.load(f'{ref}_u.npy')*255).clip(0,255).astype(np.uint8)
else: s=cv2.imread(f'{ref}.png') if not ref.isdigit() else cv2.imread(f'src/{ref}.png')
A=r[y0:y1,x0:x1]; B=s[y0:y1,x0:x1]
im=np.hstack([A,np.full((A.shape[0],4,3),(0,0,255),np.uint8),B]) if (x1-x0)<(y1-y0)*1.3 else np.vstack([A,np.full((4,A.shape[1],3),(0,0,255),np.uint8),B])
if sc!=1: im=cv2.resize(im,None,fx=sc,fy=sc,interpolation=cv2.INTER_AREA if sc<1 else cv2.INTER_CUBIC)
cv2.imwrite(out,im,[cv2.IMWRITE_JPEG_QUALITY,88])
