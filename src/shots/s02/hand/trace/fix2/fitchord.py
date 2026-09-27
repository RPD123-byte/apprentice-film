# fit the wing chord / primary-length factors per frame by silhouette IoU of each wing region (fix pass 2)
# python3 fitchord.py FRAMES  -> prints rows [f, cfL, cfR, pkL, pkR] and IoUs
import sys, numpy as np, cv2, json, itertools
from run import Lab, src, parse
fr=parse(sys.argv[1]); CF=[float(v) for v in sys.argv[2].split(",")]; PK=[float(v) for v in sys.argv[3].split(",")]
L=Lab(); L.js('(o)=>window.__labset(o)',{'only':{'chars':True,'owlOnly':True,'room':False}})
rows=[]
for f in fr:
    rx,ry,s,b=L.js('(f)=>window.__root(f)',f)
    s0=cv2.GaussianBlur(cv2.cvtColor(src(f),cv2.COLOR_BGR2GRAY),(0,0),1.5)
    best={0:(-1,None),1:(-1,None)}; Sm=None
    for cf,pk in itertools.product(CF,PK):
        L.js('(o)=>window.__chord(o)',{'base':[cf,cf,pk,pk],'tab':[]})
        r,_=L.frame(f,False); R=cv2.cvtColor(r,cv2.COLOR_BGR2GRAY)>25
        if Sm is None:
            ys,xs=np.nonzero(R); pad=70; X0,Y0,X1,Y1=max(0,xs.min()-pad),max(0,ys.min()-pad),min(2206,xs.max()+pad),min(946,ys.max()+pad)
            Sm=(s0>135).astype(np.uint8); Sm[:Y0]=0; Sm[Y1:]=0; Sm[:,:X0]=0; Sm[:,X1:]=0
            Sm=cv2.morphologyEx(Sm,cv2.MORPH_CLOSE,np.ones((7,7),np.uint8))
            n,lab,st,_=cv2.connectedComponentsWithStats(Sm,8); k=1+np.argmax(st[1:,4]) if n>1 else 0; Sm=(lab==k)
            yy,xx=np.mgrid[0:946,0:2206]; u=(xx-rx)*np.cos(b)+(yy-ry)*np.sin(b); v=-(xx-rx)*np.sin(b)+(yy-ry)*np.cos(b)
            reg={0:(u<-115*s)&(v<110*s),1:(u>115*s)&(v<110*s)}
        for i in (0,1):
            m=reg[i]; iou=(R&Sm&m).sum()/max(1,((R|Sm)&m).sum())
            if iou>best[i][0]: best[i]=(iou,(cf,pk))
    rows.append([f,best[0][1][0],best[1][1][0],best[0][1][1],best[1][1][1]])
    print(f,'L',best[0],'R',best[1],flush=True)
print(json.dumps(rows))
L.close()
