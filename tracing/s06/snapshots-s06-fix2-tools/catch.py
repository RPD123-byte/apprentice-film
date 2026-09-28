import sys
from util import *
d=sys.argv[1]; F=[int(v) for v in sys.argv[2].split(',')]
out=[]
for (cx,cy) in ((1627,359),(1727,361)):
    e=[]
    for n in F:
        a=cv2.GaussianBlur(ren(d,n),(0,0),1); b=cv2.GaussianBlur(src(n),(0,0),1)
        e.append(np.abs(a-b)[cy-7:cy+8,cx-8:cx+9].mean())
    out.append(round(float(np.mean(e)),2))
print('catch local err s1', out)
