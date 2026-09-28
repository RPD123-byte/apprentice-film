import sys, numpy as np, cv2
from run import Lab, src
fr=[int(v) for v in sys.argv[1].split(',')]
L=Lab()
for f in fr:
    L.js('(o)=>window.__labset(o)',{'only':{'chars':True,'desOnly':True},'desbK':0}); d,_=L.frame(f,False)
    L.js('(o)=>window.__labset(o)',{'only':{'chars':True,'owlOnly':True,'room':False},'desbK':None}); o,_=L.frame(f,False)
    L.js('(o)=>window.__labset(o)',{'only':None})
    D=cv2.dilate((cv2.cvtColor(d,cv2.COLOR_BGR2GRAY)>20).astype(np.uint8),np.ones((17,17),np.uint8))>0
    O=cv2.dilate((cv2.cvtColor(o,cv2.COLOR_BGR2GRAY)>20).astype(np.uint8),np.ones((17,17),np.uint8))>0
    s=cv2.GaussianBlur(cv2.cvtColor(src(f),cv2.COLOR_BGR2GRAY).astype(np.float32),(0,0),8)
    row=[f]
    for dd in ('../s02-fix1-base','../s02-fix1-t8'):
        r=cv2.GaussianBlur(cv2.imread(f'{dd}/r{f:04d}.png',0).astype(np.float32),(0,0),8); e=np.abs(r-s)
        R=~(D|O)
        row.append('%s: des %.1f owl %.1f room %.1f | contrib des %.2f owl %.2f room %.2f'%(dd[-4:],e[D&~O].mean(),e[O].mean(),e[R].mean(),e[D&~O].sum()/e.size,e[O].sum()/e.size,e[R].sum()/e.size))
    print(*row,flush=True)
L.close()
