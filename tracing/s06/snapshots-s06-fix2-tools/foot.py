import sys
from util import *
d=sys.argv[1]; F=[int(v) for v in sys.argv[2].split(',')]
m=[];b1=[]
for n in F:
    a=cv2.GaussianBlur(ren(d,n),(0,0),1); b=cv2.GaussianBlur(src(n),(0,0),1); e=(a-b)[612:628,1688:1720]
    m.append(e.max()); b1.append(np.abs(e).mean())
print('foot max(r-s) s1 %.1f  mean|e| %.2f'%(np.mean(m),np.mean(b1)))
