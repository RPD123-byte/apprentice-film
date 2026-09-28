import cv2, glob, sys, numpy as np
d,t,out=sys.argv[1],sys.argv[2],sys.argv[3]
A=cv2.imread(glob.glob(f'{d}/frame-*-at-{t}s.png')[0]); B=cv2.imread(glob.glob(f'{d}/ref-*-at-{t}s.png')[0])
def lab(im,s): return cv2.cvtColor(cv2.GaussianBlur(im,(0,0),s).astype(np.float32)/255,cv2.COLOR_BGR2LAB)
La,Lb=lab(A,8),lab(B,8); E=np.linalg.norm(La-Lb,axis=2); dL=La[...,0]-Lb[...,0]
H,W=E.shape; gx,gy=11,5
print('block dE8 (rows y, cols x; 200x189 blocks):')
for j in range(gy):
    print(' '.join(f'{E[j*H//gy:(j+1)*H//gy, i*W//gx:(i+1)*W//gx].mean():5.1f}' for i in range(gx)))
print('block dL (render-source):')
for j in range(gy):
    print(' '.join(f'{dL[j*H//gy:(j+1)*H//gy, i*W//gx:(i+1)*W//gx].mean():+5.1f}' for i in range(gx)))
v=np.clip(E*10,0,255).astype(np.uint8); v=cv2.applyColorMap(v,cv2.COLORMAP_JET)
m=cv2.addWeighted(B,0.5,v,0.5,0); cv2.imwrite(out,cv2.resize(m,(1103,473)))
