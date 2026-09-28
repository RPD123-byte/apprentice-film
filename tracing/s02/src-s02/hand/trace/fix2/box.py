# python3 box.py DIR f x0 y0 x1 y1 [...more boxes]
import cv2,numpy as np,sys
d,f=sys.argv[1],int(sys.argv[2]); v=list(map(int,sys.argv[3:]))
r=cv2.imread(f'{d}/r{f:04d}.png',0).astype(np.float32); s=cv2.imread('../s02-fix1h-src/%04d.png'%f,0).astype(np.float32)
for i in range(0,len(v),4):
    x0,y0,x1,y1=v[i:i+4]; a=r[y0:y1,x0:x1]; b=s[y0:y1,x0:x1]
    bs=lambda im:(cv2.GaussianBlur(im,(0,0),5)-cv2.GaussianBlur(im,(0,0),25)).std()
    print(f'{x0},{y0},{x1},{y1}: mean R {a.mean():.1f} S {b.mean():.1f} | band std R {bs(a):.1f} S {bs(b):.1f} | hf R {np.abs(a-cv2.GaussianBlur(a,(0,0),2)).mean():.1f} S {np.abs(b-cv2.GaussianBlur(b,(0,0),2)).mean():.1f}')
