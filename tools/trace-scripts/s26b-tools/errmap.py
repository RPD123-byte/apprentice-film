# errmap.py dir F : σ8 ΔE map (render vs source) with grid stats in 8x4 cells
import cv2, sys, numpy as np
d,F=sys.argv[1],int(sys.argv[2])
a=cv2.imread(f'{d}/r-{F}.jpg'); b=cv2.imread(f'{d}/ref-{F}.jpg')
A=cv2.cvtColor(cv2.GaussianBlur(a,(0,0),8).astype(np.float32)/255,cv2.COLOR_BGR2Lab)
B=cv2.cvtColor(cv2.GaussianBlur(b,(0,0),8).astype(np.float32)/255,cv2.COLOR_BGR2Lab)
e=np.sqrt(((A-B)**2).sum(2))
print(F,'mean',e.mean().round(2))
H,W=e.shape
for j in range(4):
    print(' '.join(f'{e[j*H//4:(j+1)*H//4, i*W//8:(i+1)*W//8].mean():5.1f}' for i in range(8)))
# L difference sign: render brighter (+) or darker (-)
dl=A[...,0]-B[...,0]
print('dL:')
for j in range(4):
    print(' '.join(f'{dl[j*H//4:(j+1)*H//4, i*W//8:(i+1)*W//8].mean():+5.1f}' for i in range(8)))
vis=np.clip(e*6,0,255).astype(np.uint8); vis=cv2.applyColorMap(vis,cv2.COLORMAP_INFERNO)
cv2.imwrite(f'{d}/err-{F}.jpg',cv2.resize(np.hstack([vis,cv2.resize(b,(W,H))]),(2206,473)))
