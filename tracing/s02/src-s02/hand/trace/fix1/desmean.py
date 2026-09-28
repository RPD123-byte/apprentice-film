import sys, numpy as np, cv2
from run import Lab, src
fr=[int(v) for v in sys.argv[1].split(',')]
L=Lab()
for f in fr:
    L.js('(o)=>window.__labset(o)',{'only':{'chars':True,'desOnly':True},'desbK':0})
    d,_=L.frame(f,False); L.js('(o)=>window.__labset(o)',{'only':None,'desbK':None})
    m=(cv2.cvtColor(d,cv2.COLOR_BGR2GRAY)>20).astype(np.uint8); m=cv2.erode(m,np.ones((15,15),np.uint8))>0
    r,_=L.frame(f,True); s=src(f)
    rg=cv2.cvtColor(r,cv2.COLOR_BGR2GRAY).astype(np.float32); sg=cv2.cvtColor(s,cv2.COLOR_BGR2GRAY).astype(np.float32)
    # split: face (y>~) vs beanie? just by rows of the mask: top third / rest
    ys=np.nonzero(m)[0]; cut=np.percentile(ys,35)
    top=m.copy(); top[int(cut):]=False; bot=m.copy(); bot[:int(cut)]=False
    print(f,'designer mean render %.1f src %.1f | upper(beanie) %.1f / %.1f | lower %.1f / %.1f'%(rg[m].mean(),sg[m].mean(),rg[top].mean(),sg[top].mean(),rg[bot].mean(),sg[bot].mean()),flush=True)
L.close()
