# patch.py RDIR frames x0 y0 x1 y1 [step] : mean RGB of source vs render in a grid of patches (F0)
import cv2,numpy as np,sys
sys.path.insert(0,'snapshots/s08-fix2-tools')
from cam import f0
rd=sys.argv[1]; fr=[int(v) for v in sys.argv[2].split(',')]; x0,y0,x1,y1=map(int,sys.argv[3:7]); st=int(sys.argv[7]) if len(sys.argv)>7 else 20
S=np.mean([f0(cv2.imread(f'snapshots/s08-p4-src/f{k}.png').astype(np.float32),k) for k in fr],0)
R=np.mean([f0(cv2.imread(f'{rd}/r{k}.png').astype(np.float32),k) for k in fr],0)
for y in range(y0,y1,st):
    row=[]
    for x in range(x0,x1,st):
        s=S[y:y+st,x:x+st].reshape(-1,3).mean(0)[::-1]; r=R[y:y+st,x:x+st].reshape(-1,3).mean(0)[::-1]
        row.append(f'({x},{y}) S{s[0]:.0f},{s[1]:.0f},{s[2]:.0f} R{r[0]:.0f},{r[1]:.0f},{r[2]:.0f}')
    print(' | '.join(row))
