import sys
from util import *
d=sys.argv[1]; F=[int(v) for v in sys.argv[2].split(',')]
R=np.mean([ren(d,n) for n in F],0); S=np.mean([src(n) for n in F],0)
print('col err', [round(float((R-S)[272:367,x].mean()),1) for x in range(1783,1798)], 'box s1.5', round(float(np.abs(cv2.GaussianBlur(R,(0,0),1.5)-cv2.GaussianBlur(S,(0,0),1.5))[262:372,1775:1805].mean()),2))
