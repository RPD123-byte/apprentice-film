# median pre-grade colour (ungraded through the film's finish) of small patches: samp.py T x,y[,r] ...
import sys, numpy as np, cv2
sys.path.insert(0,'../f2r-tools')
from grade import ungrade
from src import frame
t=float(sys.argv[1]); f=frame(t)
U=(ungrade(f,t)*255).astype(np.float32)
for a in sys.argv[2:]:
    v=[float(x) for x in a.split(',')]; x,y=int(v[0]),int(v[1]); r=int(v[2]) if len(v)>2 else 4
    p=U[max(0,y-r):y+r+1,max(0,x-r):x+r+1].reshape(-1,3); m=np.median(p,0)
    g=f[max(0,y-r):y+r+1,max(0,x-r):x+r+1].reshape(-1,3); gm=np.median(g,0)
    print(f"{a:>14}  pre #{int(m[2]):02x}{int(m[1]):02x}{int(m[0]):02x}  graded #{int(gm[2]):02x}{int(gm[1]):02x}{int(gm[0]):02x}")
