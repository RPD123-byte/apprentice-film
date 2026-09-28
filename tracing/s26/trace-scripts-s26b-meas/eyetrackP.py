# eyetrackP.py F0 F1 out.json : detect both pupils near the eyes predicted by the previous builder's measured path
import json, sys, os, numpy as np
from eyes import detect
PATH=[[114.0,1388,288,2.15,30],[114.12,1390,288,2.15,30],[114.36,1400,280,2.15,30],[114.6,1414,280,2.15,28.5],
 [114.76,1446,282,2.15,23],[114.84,1459,277,2.12,23],[115.08,1497,288,2.0,24.5],[115.32,1556,283,1.97,24.5],
 [115.56,1622,250,1.75,24],[115.8,1727,181,1.38,24.5],[116.04,1843,96,1.0,25],[116.2,1904,52,0.92,25],
 [116.28,1922,38,0.9,25],[116.36,1938,35,0.9,25],[116.52,1962,56,0.92,25],[116.76,1997,88,0.95,25],
 [117.0,2013,142,1.0,25],[117.08,2017,156,1.0,25],[117.16,2017,153,1.0,25],[117.24,2017,151,1.0,25],[117.6,2017,151,1.0,25]]
def pinterp(t):
    for i in range(1,len(PATH)):
        if t<=PATH[i][0]:
            a,b=PATH[i-1],PATH[i]; u=(t-a[0])/(b[0]-a[0]); u=u*u*(3-2*u); return [a[k]+(b[k]-a[k])*u for k in range(1,5)]
    return PATH[-1][1:]
F0,F1,out=int(sys.argv[1]),int(sys.argv[2]),sys.argv[3]
lm=json.load(open(out)) if os.path.exists(out) else {}
for F in range(F0,F1+1):
    x,y,s,sp=pinterp(F/25)
    res=[]
    for k in (-1,1):
        px,py=x+k*sp*s,y
        rr=max(3,int(5*s))
        c=detect(F,px,py,int(max(12,10*s)),max(3,int(2.2*s)),max(5,int(6.5*s)),6)
        c=[q for q in c if q[4]<120]
        if c:
            c.sort(key=lambda q:-(q[0]-1.0*((q[1]-px)**2+(q[2]-py)**2)**0.5))
            res.append([int(c[0][1]),int(c[0][2])])
        else: res.append(None)
    lm.setdefault(str(F),{})['eyes']=res
    print(F,[round(x),round(y)],res)
json.dump(lm,open(out,'w'))
