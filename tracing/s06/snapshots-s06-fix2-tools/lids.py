import sys
from util import *
d=sys.argv[1]
for nm,F in (('neutral',range(668,678)),('smile',range(712,726))):
    F=[n for n in F if __import__('os').path.exists(f'{d}/f-{n}.png')]
    if not F: continue
    R=np.mean([ren(d,n) for n in F],0); S=np.mean([src(n) for n in F],0); E=R-S
    print(nm, 'L rows 276-292', ' '.join(f'{y}:{E[y,808:943].mean():+.1f}' for y in range(276,293)))
    print(nm, 'R rows 268-288', ' '.join(f'{y}:{E[y,1129:1183].mean():+.1f}' for y in range(268,289)))
