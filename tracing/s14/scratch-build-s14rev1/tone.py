import cv2, glob, re, sys, numpy as np
d=sys.argv[1]
for p in sorted(glob.glob(d+'/frame-*.png'), key=lambda p: float(re.search(r'at-([\d.]+)s',p).group(1))):
  t=float(re.search(r'at-([\d.]+)s',p).group(1))
  a=cv2.imread(p,0).astype(np.float32); b=cv2.imread(p.replace('frame-','ref-'),0).astype(np.float32)
  ab=cv2.GaussianBlur(a,(0,0),8); bb=cv2.GaussianBlur(b,(0,0),8)
  mae=np.abs(ab-bb).mean()
  # high-pass energy
  ha=np.abs(a-cv2.GaussianBlur(a,(0,0),2)).mean(); hb=np.abs(b-cv2.GaussianBlur(b,(0,0),2)).mean()
  # dark fraction
  da=(a<16).mean(); db=(b<16).mean()
  # 3x3 cell means
  cells=[]
  for j in range(3):
    for i in range(3):
      ys=slice(j*H//3,(j+1)*H//3) if False else slice(j*315,(j+1)*315); xs=slice(i*735,(i+1)*735)
      cells.append(f'{a[ys,xs].mean():4.0f}/{b[ys,xs].mean():<4.0f}')
  print(f'{t:.2f} mean {a.mean():5.1f}/{b.mean():5.1f} blurMAE {mae:5.1f} HP {ha:4.1f}/{hb:4.1f} dark<16 {da:.2f}/{db:.2f} cells '+' '.join(cells))
