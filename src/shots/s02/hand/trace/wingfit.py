import sys, os, json, cv2, numpy as np
os.environ['ENTRY']='entry_owlonly.js'; VARS=json.loads(open(sys.argv[1]).read()); frames=[int(v) for v in sys.argv[2].split(',')]; sys.argv=[sys.argv[0]]
from run import Lab
sys.path.insert(0,'../s02-r3-meas'); from common import ungrade, src
SRC={f:(cv2.GaussianBlur(ungrade(src(f).astype(np.float32),f/25),(0,0),1.5)>150).astype(np.uint8) for f in frames}
L=Lab()
for v in VARS:
    L.js('(o)=>LAB.wt(o)', v); ious=[]
    for f in frames:
        img,_=L.frame(f,False)
        R=(cv2.GaussianBlur(cv2.cvtColor(img,cv2.COLOR_BGR2GRAY).astype(np.float32),(0,0),1.5)>150).astype(np.uint8)
        ys,xs=np.nonzero(R); Z=np.zeros_like(R); Z[max(0,ys.min()-40):ys.max()+40,max(0,xs.min()-40):xs.max()+40]=1
        S=SRC[f]*Z; n,lab,st,cen=cv2.connectedComponentsWithStats(S,8); keep=np.zeros_like(S)
        for i in range(1,n):
            if st[i,4]>200 and R[lab==i].mean()>0.2: keep[lab==i]=1
        ious.append((R&keep).sum()/max(1,(R|keep).sum()))
    print(json.dumps(v), np.round(ious,3), round(float(np.mean(ious)),4))
L.close()
