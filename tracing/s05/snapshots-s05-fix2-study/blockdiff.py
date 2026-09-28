#!/usr/bin/env python3
# blockdiff.py NEW.png OLD.png REF x0 y0 x1 y1 [B]: per-block sigma-2 error NEW - OLD (negative = better)
import sys, cv2, numpy as np
a=sys.argv; n=cv2.imread(a[1]).astype(np.float32).mean(2); o=cv2.imread(a[2]).astype(np.float32).mean(2); ref=a[3]
s=cv2.imread(f'{ref}.png' if not ref.isdigit() else f'src/{ref}.png').astype(np.float32).mean(2)
x0,y0,x1,y1=[int(v) for v in a[4:8]]; B=int(a[8]) if len(a)>8 else 40
b=lambda im: cv2.GaussianBlur(im,(0,0),2)
en=np.abs(b(n)-b(s)); eo=np.abs(b(o)-b(s))
print('      '+''.join(f'{x:>6d}' for x in range(x0,x1,B)))
for y in range(y0,y1,B): print(f'{y:5d} '+''.join(f'{en[y:y+B,x:x+B].mean()-eo[y:y+B,x:x+B].mean():+6.0f}' for x in range(x0,x1,B)))
