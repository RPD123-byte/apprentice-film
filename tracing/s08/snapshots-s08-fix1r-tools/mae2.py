# blurred MAE per frame, full and excluding the top-left mark (F0 LOGO_ZONE 150-492 x 0-180, mapped through the camera)
import cv2,numpy as np,sys,os
sys.path.insert(0,'snapshots/s08-fix1r-tools')
from cam import M
rd=sys.argv[1]; full=[]; nol=[]
for k in range(764,815):
    if not os.path.exists(f'{rd}/r{k}.png'): continue
    a=cv2.GaussianBlur(cv2.imread(f'{rd}/r{k}.png').astype(np.float32),(0,0),3); b=cv2.GaussianBlur(cv2.imread(f'snapshots/s08-p4-src/f{k}.png').astype(np.float32),(0,0),3)
    d=np.abs(a-b).mean(-1)
    m=np.zeros(d.shape,np.uint8); poly=np.array([[150,0],[492,0],[492,180],[150,180]],np.float64)
    q=(np.c_[poly,np.ones(4)]@M(k).T).astype(np.int32); cv2.fillPoly(m,[q],1)
    full.append(d.mean()); nol.append(d[m==0].mean())
print(f'avg {np.mean(full):.3f}  without mark {np.mean(nol):.3f}  first {full[0]:.2f} last {full[-1]:.2f}  max {max(full):.2f}')
