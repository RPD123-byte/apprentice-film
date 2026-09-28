import sys
from util import *
d=sys.argv[1]; F=[int(v) for v in sys.argv[2].split(',')]
R=np.mean([ren(d,n) for n in F],0); S=np.mean([src(n) for n in F],0)
out=[]
for a,b in ((300,700),(900,1300),(1450,1850)):
    out.append(' '.join(f'{int(R[y,a:b].mean()-S[y,a:b].mean()):+d}' for y in (811,812,830,831,832,833,835,836,837,839,840)))
lap=np.abs(cv2.GaussianBlur(R,(0,0),1.5)-cv2.GaussianBlur(S,(0,0),1.5))[800:850,300:1860].mean()
print('rows 811,812,830,831,832,833,835,836,837,839,840 err: ', ' | '.join(out), ' rim s1.5 %.2f'%lap)
