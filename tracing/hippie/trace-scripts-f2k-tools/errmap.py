import cv2, numpy as np, sys
a=cv2.imread(sys.argv[1]).astype(np.float32)/255; b=cv2.imread(sys.argv[2]).astype(np.float32)/255
sig=float(sys.argv[3]) if len(sys.argv)>3 else 8
cell=int(sys.argv[4]) if len(sys.argv)>4 else 150
if a.shape!=b.shape: a=cv2.resize(a,(b.shape[1],b.shape[0]))
A=cv2.cvtColor(cv2.GaussianBlur(a,(0,0),sig),cv2.COLOR_BGR2LAB); B=cv2.cvtColor(cv2.GaussianBlur(b,(0,0),sig),cv2.COLOR_BGR2LAB)
d=np.sqrt(((A-B)**2).sum(2))
# exclude owl region
mask=np.ones_like(d,bool); mask[40:260,1920:2200]=False
print('mean dE', d.mean(), 'excl owl', d[mask].mean())
H,W=d.shape
print('     '+' '.join(f'{x:4d}' for x in range(0,W,cell)))
for y in range(0,H,cell):
  print(f'{y:4d} '+' '.join(f'{d[y:y+cell,x:x+cell].mean():4.0f}' for x in range(0,W,cell)))
if len(sys.argv)>5:
  v=np.clip(d*4,0,255).astype(np.uint8); cv2.imwrite(sys.argv[5],cv2.applyColorMap(v,cv2.COLORMAP_JET))
