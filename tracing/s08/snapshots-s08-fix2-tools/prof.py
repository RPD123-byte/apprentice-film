# prof.py RDIR frames y x0 x1  -> per-x luma (and RGB) of source vs render, F0 (average over frames)
import cv2,numpy as np,sys
sys.path.insert(0,'snapshots/s08-fix2-tools')
from cam import f0
rd=sys.argv[1]; fr=[int(v) for v in sys.argv[2].split(',')]; ys=[int(v) for v in sys.argv[3].split(',')]; x0,x1=int(sys.argv[4]),int(sys.argv[5])
rgb=len(sys.argv)>6
S=np.mean([f0(cv2.imread(f'snapshots/s08-p4-src/f{k}.png').astype(np.float32),k) for k in fr],0)
R=np.mean([f0(cv2.imread(f'{rd}/r{k}.png').astype(np.float32),k) for k in fr],0)
L=lambda im: im[...,2]*0.299+im[...,1]*0.587+im[...,0]*0.114
for y in ys:
    print('y',y,'x',x0,'..')
    if rgb:
        print(' S',' '.join(f'{int(S[y,x,2])},{int(S[y,x,1])},{int(S[y,x,0])}' for x in range(x0,x1)))
        print(' R',' '.join(f'{int(R[y,x,2])},{int(R[y,x,1])},{int(R[y,x,0])}' for x in range(x0,x1)))
    else:
        print(' S',' '.join(f'{int(v):3d}' for v in L(S)[y,x0:x1]))
        print(' R',' '.join(f'{int(v):3d}' for v in L(R)[y,x0:x1]))
