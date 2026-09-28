import sys,cv2,numpy as np
sys.path.insert(0,'.')
from lab import *
L=Lab()
for t in [47.84,47.88,47.92,47.96,48.0,48.04,48.08,48.12,48.16]:
    f=L.frame(t); s=src(t)
    a=cv2.cvtColor(f,cv2.COLOR_BGR2GRAY)[0:110,0:340].astype(float); b=cv2.cvtColor(s,cv2.COLOR_BGR2GRAY)[0:110,0:340].astype(float)
    print(f'{t:.2f} ren {a.mean():.1f} src {b.mean():.1f}  p90 {np.percentile(a,90):.0f} {np.percentile(b,90):.0f}')
L.close()
