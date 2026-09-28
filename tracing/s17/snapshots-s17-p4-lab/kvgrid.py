import sys, cv2, numpy as np, json
sys.path.insert(0,'.')
from lab import *
from owlm import om
L=Lab()
ts=[48.8,50.4,51.2,52.0,52.56,52.8,53.0,53.2]
S={t:src(t) for t in ts}
def run(kv):
    v=[om(L.frame(t,dbg={'kv':kv}),S[t],t,1.5) for t in ts]; return np.mean(v), v
base=run({})
print('base %.3f'%base[0], ' '.join('%.2f'%x for x in base[1]), flush=True)
for k,vals in [('bodyShade',[0.9,0.95]),('headShade',[0.9,0.95]),('massShade',[0.9]),('wingShade',[0.92]),('wingShadeM',[0.9]),('massBase',[0.97])]:
    for v in vals:
        r=run({k:v}); print(k,v,'%.3f'%r[0],' '.join('%.2f'%x for x in r[1]),flush=True)
L.close()
