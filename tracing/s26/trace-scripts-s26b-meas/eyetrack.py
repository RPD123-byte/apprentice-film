# eyetrack.py F0 F1 Lx Ly Rx Ry rmin rmax [lm.json]: follow both irises from F0 to F1 (search radius 26 px each)
import sys, json, os
sys.argv_saved=list(sys.argv)
from eyes import detect
a=sys.argv_saved
F0,F1=int(a[1]),int(a[2]); L=[float(a[3]),float(a[4])]; R=[float(a[5]),float(a[6])]; rmin,rmax=int(a[7]),int(a[8])
out=a[9] if len(a)>9 else 'fit/lm.json'
lm=json.load(open(out)) if os.path.exists(out) else {}
step=1 if F1>=F0 else -1
miss=[0,0]; last=[[0,0],[0,0]]
for F in range(F0,F1+step,step):
    res=[]
    moved=[0,0]
    for k,P in enumerate((L,R)):
        c=detect(F,P[0],P[1],26 if not miss[k] else 36,rmin,rmax,6)
        c=[x for x in c if x[4]<120]
        if c:
            # prefer strong + close
            c.sort(key=lambda x:-(x[0]-0.8*((x[1]-P[0])**2+(x[2]-P[1])**2)**0.5))
            d=[c[0][1]-P[0],c[0][2]-P[1]]
            res.append([int(c[0][1]),int(c[0][2])]); P[0],P[1]=c[0][1],c[0][2]; miss[k]=0; last[k]=d
        else:
            res.append(None); miss[k]+=1
    # a lost eye follows the other one
    for k,P in enumerate((L,R)):
        if res[k] is None and res[1-k] is not None: P[0]+=last[1-k][0]; P[1]+=last[1-k][1]
    lm.setdefault(str(F),{})['eyes']=res
    print(F,res)
json.dump(lm,open(out,'w'))
