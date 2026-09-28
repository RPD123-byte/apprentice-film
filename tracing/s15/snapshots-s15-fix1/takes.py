import json,sys,numpy as np
T=[('A',1018,1023),('B',1024,1042),('C',1043,1048),('D',1049,1067),('E',1068,1097),('H',1098,1111),('I',1112,1121),('J1',1122,1128),('J2',1129,1143)]
def summ(path):
    d=json.load(open(path)); r={}
    for k,v in d.items(): r[int(round(float(k)*25))]=v
    out=[]
    for n,a,b in T:
        xs=[r[f] for f in range(a,b+1) if f in r]
        if not xs: continue
        out.append((n,np.mean([x['mae12'] for x in xs]),np.mean([x['mae4'] for x in xs]),np.mean([x.get('gc',0) for x in xs]),len(xs)))
    xs=list(r.values())
    out.append(('ALL',np.mean([x['mae12'] for x in xs]),np.mean([x['mae4'] for x in xs]),np.mean([x.get('gc',0) for x in xs]),len(xs)))
    return out
for p in sys.argv[1:]:
    print(p)
    for n,a,b,c,k in summ(p): print(f'  {n:4s} s12 {a:5.1f} s4 {b:5.1f} gc {c:.3f} n={k}')
