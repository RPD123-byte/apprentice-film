import sys, json, cv2, numpy as np
sys.path.insert(0,'.')
from lab import *
from owlm import om
import lineE as _le
ts=[48.80,49.60,50.40,51.04,51.64,52.00,52.44,52.80,53.00]
cfgs=json.loads(sys.argv[1])
L=Lab(); S={t:src(t) for t in ts}
K=cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(9,9))
from owlm import mask, gray
def energy(im,m):
    g=cv2.GaussianBlur(gray(im),(0,0),0.8); bh=cv2.morphologyEx(g,cv2.MORPH_BLACKHAT,K); return float(bh[m].mean())
for c in cfgs:
    o=[];e=[]
    for t in ts:
        f=L.frame(t,True,None,c); o.append(om(f,S[t],t,1.5))
        m=mask(t,0); m=cv2.erode(m.astype(np.uint8),np.ones((9,9),np.uint8))>0; e.append(energy(f,m)/energy(S[t],m))
    print(json.dumps(c),'om1.5 %.3f  lineE %.3f'%(np.mean(o),np.mean(e)),' '.join('%.2f'%x for x in o),flush=True)
L.close()
