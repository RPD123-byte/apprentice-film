# ab.py frames -- variants of owl TUNE: fowl sigma-2 per frame
import sys, json, cv2, numpy as np, h16
from lab import Lab
D=json.load(open('../../s16-fix2-w/owl.json'))
fr=[int(x) for x in sys.argv[1:]]
V={'cur':{}, 'noSmooth':{'smoothS':0}, 'noTickDrop':{'nMin':0,'nCap':99}, 'grain06':{'grain':0.06,'stip':1.0,'fluff':1.0}}
L=Lab()
for name,o in V.items():
    L.p.evaluate('(o) => S16H.tune({}, o)', {**{'smoothS':1,'nMin':7,'nCap':2.5,'grain':0.035,'stip':0.5,'fluff':0.45}, **o})
    row=[]
    for n in fr:
        r=h16.gray(L.graded(n,False).astype(np.float32)); s=h16.gray(h16.src(n))
        b=D[str(n)]['box']; row.append(h16.errs(r,s,tuple(b),(2,))[0])
    print(name,' '.join(f'{x:.2f}' for x in row), 'mean %.3f'%np.mean(row), flush=True)
L.close()
