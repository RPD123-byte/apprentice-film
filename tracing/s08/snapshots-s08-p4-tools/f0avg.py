# average source and render frames warped into F0 coordinates over a frame range; save npy + crops
import cv2,numpy as np,sys
sys.path.insert(0,'snapshots/s08-p4-tools')
from cam import f0
rd=sys.argv[1]; a,b=int(sys.argv[2]),int(sys.argv[3]); tag=sys.argv[4]
S=0;R=0;n=0
for k in range(a,b+1):
    S=S+f0(cv2.imread(f'snapshots/s08-p4-src/f{k}.png').astype(np.float32),k)
    R=R+f0(cv2.imread(f'{rd}/r{k}.png').astype(np.float32),k); n+=1
S/=n;R/=n
np.save(f'snapshots/s08-p4-tools/S_{tag}.npy',S.astype(np.float32)); np.save(f'snapshots/s08-p4-tools/R_{tag}.npy',R.astype(np.float32))
