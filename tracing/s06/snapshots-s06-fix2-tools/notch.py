import sys
from util import *
d=sys.argv[1]; F=[int(v) for v in sys.argv[2].split(',')]
for n in F:
    a=ren(d,n); b=src(n); e=(a-b)[172:192,1222:1245]
    print(n,'>60:',int((e>60).sum()),'max',int(e.max()))
