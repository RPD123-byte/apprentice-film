import numpy as np,cv2,sys
sys.path.insert(0,'snapshots/s08-p4-tools')
from cam import f0
rd=sys.argv[1]; ks=range(764,772)
S=0;R=0
for k in ks:
    S=S+f0(cv2.imread(f'snapshots/s08-p4-src/f{k}.png').astype(np.float32),k); R=R+f0(cv2.imread(f'{rd}/r{k}.png').astype(np.float32),k)
S/=len(ks); R/=len(ks)
Db=np.abs(cv2.GaussianBlur(R,(0,0),3)-cv2.GaussianBlur(S,(0,0),3)).mean(-1)
B={'rch':(12,330,125,420),'30':(135,330,235,405),'April':(300,330,560,405),'Linden Hollow':(110,430,420,482),'GA':(420,430,520,482),'lobes':(12,220,300,620)}
print(' '.join(f'{n} {Db[y0:y1,x0:x1].mean():.2f}' for n,(x0,y0,x1,y1) in B.items()))
np.save('snapshots/s08-p4-tools/R_box.npy',R); np.save('snapshots/s08-p4-tools/S_box.npy',S)
