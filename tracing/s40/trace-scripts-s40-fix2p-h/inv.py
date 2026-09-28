# python inv.py rawpng t x y R G B [R G B ...]  -> pre-grade hex for graded targets at (x,y)
import sys, numpy as np, cv2
from grade import hb_map, inverse, forward
raw=cv2.imread(sys.argv[1])[:,:,::-1].astype(np.float32)/255; t=float(sys.argv[2]); x,y=int(sys.argv[3]),int(sys.argv[4])
hb=hb_map(raw); v=[float(a) for a in sys.argv[5:]]
for i in range(0,len(v),3):
    p=inverse(np.array(v[i:i+3])/255,hb,t,x,y); q=np.round(p*255).astype(int)
    print(f'target ({v[i]:.0f},{v[i+1]:.0f},{v[i+2]:.0f}) -> #{q[0]:02x}{q[1]:02x}{q[2]:02x} ({q[0]},{q[1]},{q[2]})  hb={hb[y,x].round(3)}')
