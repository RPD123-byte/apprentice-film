# reg.py DIR T x0,y0,x1,y1 [R]: best integer shift (dx,dy) of the render region to match the source (MAE on blur)
import cv2, numpy as np, sys
d,t,box=sys.argv[1],sys.argv[2],[int(v) for v in sys.argv[3].split(',')]; R=int(sys.argv[4]) if len(sys.argv)>4 else 14
a=cv2.GaussianBlur(cv2.cvtColor(cv2.imread(f'{d}/r-{t}.png'),cv2.COLOR_BGR2GRAY).astype(np.float32),(0,0),1.5)
b=cv2.GaussianBlur(cv2.cvtColor(cv2.imread(f'{d}/s-{t}.png'),cv2.COLOR_BGR2GRAY).astype(np.float32),(0,0),1.5)
x0,y0,x1,y1=box; S=b[y0:y1,x0:x1]
best=None
for dy in range(-R,R+1):
    for dx in range(-R,R+1):
        A=a[y0-dy:y1-dy,x0-dx:x1-dx]; e=np.abs(A-S).mean()
        if best is None or e<best[0]: best=(e,dx,dy)
e0=np.abs(a[y0:y1,x0:x1]-S).mean()
print(f'{t} box {box} shift dx={best[1]} dy={best[2]} mae {e0:.1f} -> {best[0]:.1f}')
