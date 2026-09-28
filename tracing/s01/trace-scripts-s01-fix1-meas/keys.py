import sys, cv2, numpy as np
exec(open('/Users/computer/rootline/apprentice-film/snapshots/s01-fix1-meas/camlib.py').read())
out=[]
for n in range(0,151):
    f=frame(n/25)
    g=cv2.cvtColor(plate_frame(n/25,0,0,2206,946,1,img=f),cv2.COLOR_BGR2GRAY).astype(float)
    k=g[335:400,1010:1250].mean(); d=g[300:540,1300:1420].mean(); fl=g[600:900,0:500].mean(); fig=g[600:800,760:900].mean(); allm=g[100:850,100:2100].mean()
    out.append(f"{n/25:.2f} keys={k:5.1f} desk={d:5.1f} left={fl:5.1f} sleeve={fig:5.1f} all={allm:5.1f}")
print('\n'.join(out))
