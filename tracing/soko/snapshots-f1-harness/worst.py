# worst.py NAME [cell] [n]: list the worst cells of graded sigma6 error
import cv2, sys, numpy as np
sys.path.insert(0,'.')
from common import *
nm=sys.argv[1]; cell=int(sys.argv[2]) if len(sys.argv)>2 else 50; n=int(sys.argv[3]) if len(sys.argv)>3 else 20
a=cv2.GaussianBlur(gray(cv2.imread(f'../f1-p3/{nm}_g.png')).astype(np.float32),(0,0),6)
b=cv2.GaussianBlur(gray(cv2.imread('../f1-p3/clean_g.png')).astype(np.float32),(0,0),6)
d=a-b; H,W=d.shape; cells=[]
for y in range(0,H-cell+1,cell):
    for x in range(0,W-cell+1,cell):
        c=d[y:y+cell,x:x+cell]; cells.append((np.abs(c).mean(), c.mean(), x, y))
cells.sort(reverse=True)
for e,m,x,y in cells[:n]: print(f'{x:5d},{y:4d}  |e| {e:5.1f}  mean {m:+6.1f}')
print('MAE', np.abs(d).mean())
