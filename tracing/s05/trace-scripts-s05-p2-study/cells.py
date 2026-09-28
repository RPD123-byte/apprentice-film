# cells.py frame.png ref.png [cell] : blurred-luminance error per cell + overall numbers
import cv2, sys, numpy as np
a=cv2.cvtColor(cv2.imread(sys.argv[1]),cv2.COLOR_BGR2GRAY).astype(float); b=cv2.cvtColor(cv2.imread(sys.argv[2]),cv2.COLOR_BGR2GRAY).astype(float)
C=int(sys.argv[3]) if len(sys.argv)>3 else 150
k=lambda x,s: cv2.GaussianBlur(x,(0,0),s)
for s in (2,4,8):
    print(f'sigma{s} MAE {np.abs(k(a,s)-k(b,s)).mean():.2f}')
print('mean',a.mean().round(1),b.mean().round(1))
# fine-detail energy (band-pass) ratio
bp=lambda x: np.abs(k(x,1)-k(x,4)).mean()
print('bandpass render/src', round(bp(a),2), round(bp(b),2))
d=k(a,4)-k(b,4)
H,W=a.shape
print('cell err (signed mean, |mae|) rows y, cols x step',C)
print('      '+''.join(f'{x:>9d}' for x in range(0,W,C)))
for y in range(0,H,C):
    row=[]
    for x in range(0,W,C):
        c=d[y:y+C,x:x+C]; row.append(f'{c.mean():+4.0f}/{np.abs(c).mean():3.0f}')
    print(f'{y:5d} '+' '.join(row))
