import sys
from util import *
d=sys.argv[1]; F=[int(v) for v in sys.argv[2].split(',')]
r=[];s=[]
for n in F:
    for acc,A in ((r,ren(d,n,False)),(s,src(n,False))):
        g=cv2.cvtColor(A.astype(np.uint8),cv2.COLOR_BGR2GRAY).reshape(-1); m=g<12; acc.append(A.reshape(-1,3)[m].mean(0)[::-1])
print('darks<12 RGB ren', np.mean(r,0).round(2), 'src', np.mean(s,0).round(2))
