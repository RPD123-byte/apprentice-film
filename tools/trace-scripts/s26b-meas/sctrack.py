import json, numpy as np
A=json.load(open('loops.json')); B=json.load(open('loopsD.json'))
def cands(F,side):
    c=[]
    for D in (A,B):
        for v in D.get(str(F),{}).get(side,[]):
            if 1800<=v[5]<=4600: c.append(np.array(v[:2]))
    return c
tracks={'Llo':[437.5,332],'Lup':[393.3,221],'Rlo':[1689.2,218.8],'Rup':[1763.7,124.1]}
res={}
for direction,Fs in (('f',range(2800,2846)),('b',range(2799,2789,-1))):
    pos={k:np.array(v,float) for k,v in tracks.items()}; vel={k:np.zeros(2) for k in tracks}
    for F in Fs:
        row={}
        for k in pos:
            pred=pos[k]+vel[k]
            cs=cands(F,k[0])
            best=None
            for c in cs:
                d=np.linalg.norm(c-pred)
                if d<35 and (best is None or d<best[0]): best=(d,c)
            if best: vel[k]=0.6*vel[k]+0.4*(best[1]-pos[k]); pos[k]=best[1]; row[k]=[round(float(v),1) for v in pos[k]]+[1]
            else: pos[k]=pred; row[k]=[round(float(v),1) for v in pos[k]]+[0]
        res[F]=row
for F in sorted(res): print(F, res[F])
json.dump(res,open('sctrack.json','w'))
