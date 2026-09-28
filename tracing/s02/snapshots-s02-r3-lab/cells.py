# coarse cell means (graded, 0..255) of render vs source in a region: prints S/R rows
import cv2, numpy as np, sys
d,f=sys.argv[1],int(sys.argv[2]); x0,y0,x1,y1=[int(v) for v in sys.argv[3].split(':')]; c=int(sys.argv[4]) if len(sys.argv)>4 else 50
a=cv2.imread(f'{d}/r{f:04d}.png',0).astype(np.float32); b=cv2.imread(f'../s02-r3-src/{f:04d}.png',0).astype(np.float32)
print('      '+' '.join(f'{x:>7d}' for x in range(x0,x1,c)))
for y in range(y0,y1,c):
    rs=[a[y:y+c,x:x+c].mean() for x in range(x0,x1,c)]; ss=[b[y:y+c,x:x+c].mean() for x in range(x0,x1,c)]
    print(f'{y:5d} '+' '.join(f'{s:3.0f}/{r:3.0f}' for s,r in zip(ss,rs)))
