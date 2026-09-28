# rowcmp.py DIR frame x0 x1 step y1,y2,.. : row profiles render (R) vs source (S)
import cv2, numpy as np, sys
S='/Users/computer/rootline/apprentice-film/snapshots/s13-w3-src'
d,f=sys.argv[1],sys.argv[2]; x0,x1,st=map(int,sys.argv[3:6]); ys=[int(v) for v in sys.argv[6].split(',')]
r=cv2.imread(f'{d}/r{f}.png',0).astype(int); s=cv2.imread(f'{S}/f{f}.png',0).astype(int)
print('x   ', ' '.join('%3d'%(x%1000) for x in range(x0,x1,st)))
for y in ys:
    print('S',y, ' '.join('%3d'%s[y,x] for x in range(x0,x1,st)))
    print('R',y, ' '.join('%3d'%r[y,x] for x in range(x0,x1,st)))
