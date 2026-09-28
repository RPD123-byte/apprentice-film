#!/usr/bin/env python3
# blockerr.py RENDER.png REF x0 y0 x1 y1 [B] [--sig=2]: blurred |error| and signed bias per BxB block (text table)
import sys, cv2, numpy as np
a=sys.argv; r=cv2.imread(a[1]).astype(np.float32).mean(2); ref=a[2]
s=cv2.imread(f'{ref}.png' if not ref.isdigit() else f'src/{ref}.png').astype(np.float32).mean(2)
x0,y0,x1,y1=[int(v) for v in a[3:7]]; B=int(a[7]) if len(a)>7 and not a[7].startswith('--') else 40
sig=float([v for v in a if v.startswith('--sig=')][0][6:]) if any(v.startswith('--sig=') for v in a) else 2
rb=cv2.GaussianBlur(r,(0,0),sig); sb=cv2.GaussianBlur(s,(0,0),sig); e=np.abs(rb-sb); d=rb-sb
print('      '+''.join(f'{x:>9d}' for x in range(x0,x1,B)))
for y in range(y0,y1,B):
    print(f'{y:5d} '+''.join(f'{e[y:y+B,x:x+B].mean():4.0f}{d[y:y+B,x:x+B].mean():+4.0f} ' for x in range(x0,x1,B)))
