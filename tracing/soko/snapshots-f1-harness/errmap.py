# errmap.py NAME [x0 y0 x1 y1] : graded sigma6 |ours - source| in 25 px cells over a box (prints grid, signed)
import cv2, sys, numpy as np
sys.path.insert(0,'.')
from common import *
nm=sys.argv[1]; box=[int(v) for v in sys.argv[2:6]] if len(sys.argv)>5 else [0,0,2206,946]
cell=int(sys.argv[6]) if len(sys.argv)>6 else 25
a=cv2.GaussianBlur(gray(cv2.imread(f'../f1-p3/{nm}_g.png')).astype(np.float32),(0,0),6)
b=cv2.GaussianBlur(gray(cv2.imread('../f1-p3/clean_g.png')).astype(np.float32),(0,0),6)
d=a-b; x0,y0,x1,y1=box
print('      '+''.join(f'{x:5d}' for x in range(x0,x1,cell)))
for y in range(y0,y1,cell):
    print(f'{y:5d} '+''.join(f'{d[y:y+cell,x:x+cell].mean():+5.0f}' for x in range(x0,x1,cell)))
print('MAE', np.abs(d[y0:y1,x0:x1]).mean())
