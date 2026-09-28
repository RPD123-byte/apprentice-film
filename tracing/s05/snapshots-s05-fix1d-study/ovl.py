#!/usr/bin/env python3
# ovl.py RENDER.png x0 y0 x1 y1 OUT [scale] [REF] [--raw]: overlay: source in red/magenta, render in green (luminance)
import sys, cv2, numpy as np
a=sys.argv; r=cv2.imread(a[1]); x0,y0,x1,y1=[int(v) for v in a[2:6]]; out=a[6]
sc=float(a[7]) if len(a)>7 and not a[7].startswith('--') else 1
ref=a[8] if len(a)>8 and not a[8].startswith('--') else 'TB'
s=(np.load(f'{ref}_u.npy')*255).clip(0,255).astype(np.uint8) if '--raw' in a else (cv2.imread(f'src/{ref}.png') if ref.isdigit() else cv2.imread(f'{ref}.png'))
R=r[y0:y1,x0:x1].mean(2); S=s[y0:y1,x0:x1].mean(2)
im=np.stack([S,R,S],2).astype(np.uint8)
if sc!=1: im=cv2.resize(im,None,fx=sc,fy=sc,interpolation=cv2.INTER_CUBIC)
cv2.imwrite(out,im,[cv2.IMWRITE_JPEG_QUALITY,90])
