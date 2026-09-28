# reference targets for s05 (graded + ungraded medians of rest frames)
import cv2, numpy as np, sys, os
sys.path.insert(0,'/Users/computer/rootline/apprentice-film/src/shots/s05/trace')
from grade import ungrade
from src import frame
def med(ks): return np.median(np.stack([frame(k) for k in ks]),0).astype(np.uint8)
R={'TB':range(622,627),'TBp':range(637,644),'TA':range(588,590)}
for n,ks in R.items():
    m=med(ks); cv2.imwrite(f'{n}.png',m)
    t=ks[0]/25
    u=ungrade(m.astype(np.float32)/255,t)
    np.save(f'{n}_u.npy',u.astype(np.float32))
    cv2.imwrite(f'{n}_u.png',(u*255).clip(0,255).astype(np.uint8))
print('ok')
