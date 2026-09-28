import cv2,numpy as np,sys
# cells.py src.png ren.png x0 y0 x1 y1 cell : mean value per cell, src / ren
a=cv2.imread(sys.argv[1],0).astype(float); b=cv2.imread(sys.argv[2],0).astype(float)
x0,y0,x1,y1,c=map(int,sys.argv[3:8])
print('      '+' '.join(f'{x:>7d}' for x in range(x0,x1,c)))
for y in range(y0,y1,c):
    print(f'{y:5d} '+' '.join(f'{int(a[y:y+c,x:x+c].mean()):3d}/{int(b[y:y+c,x:x+c].mean()):<3d}' for x in range(x0,x1,c)))
