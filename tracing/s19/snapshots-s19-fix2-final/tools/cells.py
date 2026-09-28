# cells.py dir t : blurred (sigma 8) signed mean diff render-source per 100px cell (from r-t.png)
import sys, cv2, numpy as np
from lab import src
d=sys.argv[1]; t=float(sys.argv[2]); cs=int(sys.argv[3]) if len(sys.argv)>3 else 100
r=cv2.imread(f'{d}/r-{t:.2f}.png',0).astype(np.float32); s=src(t,True).astype(np.float32)
r=cv2.GaussianBlur(r,(0,0),8); s=cv2.GaussianBlur(s,(0,0),8)
print('overall mae',np.abs(r-s).mean().round(2))
print('      '+''.join(f'{x:>5}' for x in range(0,2206,cs)))
for y in range(0,946,cs):
    row=[]
    for x in range(0,2206,cs):
        a=r[y:y+cs,x:x+cs]; b=s[y:y+cs,x:x+cs]; row.append(f'{(a-b).mean():5.0f}')
    print(f'{y:>5} '+''.join(row))
print('abs:')
for y in range(0,946,cs):
    row=[]
    for x in range(0,2206,cs):
        a=r[y:y+cs,x:x+cs]; b=s[y:y+cs,x:x+cs]; row.append(f'{np.abs(a-b).mean():5.0f}')
    print(f'{y:>5} '+''.join(row))
