# reg.py dir t x0,y0,x1,y1 [cell] : blurred(4) render|source means per cell in a region
import sys, cv2, numpy as np
from lab import src
d=sys.argv[1]; t=float(sys.argv[2]); x0,y0,x1,y1=[int(v) for v in sys.argv[3].split(',')]; cs=int(sys.argv[4]) if len(sys.argv)>4 else 40
r=cv2.imread(f'{d}/r-{t:.2f}.png',0).astype(np.float32); s=src(t,True).astype(np.float32)
print('region mean R %.1f S %.1f'%(r[y0:y1,x0:x1].mean(), s[y0:y1,x0:x1].mean()))
print('     '+''.join(f'{x:>8}' for x in range(x0,x1,cs)))
for y in range(y0,y1,cs):
    print(f'{y:>5}'+''.join(f'{r[y:y+cs,x:x+cs].mean():4.0f}/{s[y:y+cs,x:x+cs].mean():<3.0f}' for x in range(x0,x1,cs)))
