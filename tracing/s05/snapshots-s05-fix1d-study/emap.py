#!/usr/bin/env python3
# emap.py RENDER.png OUT.jpg [REF] [--raw] [--sig=S]: signed blurred error map (red = render brighter, blue = darker)
import sys, cv2, numpy as np
a=sys.argv; r=cv2.imread(a[1]).astype(np.float32); out=a[2]; ref=a[3] if len(a)>3 and not a[3].startswith('--') else 'TB'
sig=float([x for x in a if x.startswith('--sig=')][0][6:]) if any(x.startswith('--sig=') for x in a) else 4
s=np.load(f'{ref}_u.npy')*255 if '--raw' in a else cv2.imread(f'{ref}.png').astype(np.float32)
d=cv2.GaussianBlur(r.mean(2),(0,0),sig)-cv2.GaussianBlur(s.mean(2),(0,0),sig)
g=cv2.cvtColor((s.mean(2)*0.5).astype(np.uint8),cv2.COLOR_GRAY2BGR).astype(np.float32)
k=np.clip(np.abs(d)/40,0,1)[...,None]
col=np.where(d[...,None]>0,np.array([0,0,255.]),np.array([255.,80,0]))
im=(g*(1-k)+col*k).astype(np.uint8)
cv2.imwrite(out,cv2.resize(im,(1103,473)),[cv2.IMWRITE_JPEG_QUALITY,88])
