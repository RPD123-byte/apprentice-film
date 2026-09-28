# flying-owl wing sweep: silhouette IoU against the source for WT overrides
import sys, json, numpy as np, cv2
from run import Lab, src
fr=[int(v) for v in sys.argv[1].split(',')]; cands=json.loads(sys.argv[2])
L=Lab()
SM={}
def srcmask(f, box):
    s=src(f); S=cv2.GaussianBlur(cv2.cvtColor(s,cv2.COLOR_BGR2GRAY),(0,0),1.5)
    X0,Y0,X1,Y1=box; Sm=(S>135).astype(np.uint8); Sm[:Y0]=0; Sm[Y1:]=0; Sm[:,:X0]=0; Sm[:,X1:]=0
    Sm=cv2.morphologyEx(Sm,cv2.MORPH_CLOSE,np.ones((7,7),np.uint8))
    n,lab,st,_=cv2.connectedComponentsWithStats(Sm,8); k=1+np.argmax(st[1:,4]) if n>1 else 0
    return lab==k
base=None
for c in cands:
    L.js('(o)=>window.__labwt(o)',c)
    ious=[]; lw=[]; rw=[]
    for f in fr:
        L.js('(o)=>window.__labset(o)',{'only':{'chars':True,'owlOnly':True,'room':False}})
        r,_=L.frame(f,False); L.js('(o)=>window.__labset(o)',{'only':None})
        R=cv2.cvtColor(r,cv2.COLOR_BGR2GRAY)>60
        ys,xs=np.nonzero(R); box=(max(0,xs.min()-80),max(0,ys.min()-80),min(2206,xs.max()+80),min(946,ys.max()+80))
        if f not in SM: SM[f]=srcmask(f,box)
        S=SM[f]; ious.append((R&S).sum()/max(1,(R|S).sum()))
        cx=int(np.median(np.nonzero(S)[1]))
        lw.append(((R&S)[:, :cx].sum()/max(1,(R|S)[:, :cx].sum()))); rw.append(((R&S)[:, cx:].sum()/max(1,(R|S)[:, cx:].sum())))
    print(json.dumps(c),'IoU mean %.3f'%np.mean(ious),'L %.3f R %.3f'%(np.mean(lw),np.mean(rw)),' '.join('%.2f'%v for v in ious),flush=True)
L.close()
