import sys, os, numpy as np
fr=sys.argv[1]; sys.argv=[sys.argv[0]]
from run import Lab, parse, mae, src
L=Lab(); C=[1.0,1.2,1.4,1.6,1.8,2.1]
for f in parse(fr):
    s=src(f); e=[]
    for k in C:
        L.js('(o)=>window.__labset(o)', {'bookK':k}); img,_=L.frame(f); e.append(mae(img,s)[0])
    i=int(np.argmin(e)); print(f, C[i], ' '.join('%.2f'%v for v in e), flush=True)
L.close()
