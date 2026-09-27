# emitb.py tr.json NAME [vmin] : JS array of soft grey bands, per point [x, y, width, value, ...] (simplified)
import json, sys, numpy as np
T=json.load(open(sys.argv[1])); name=sys.argv[2]; vmin=int(sys.argv[3]) if len(sys.argv)>3 else 125
print(f'export const {name} = [')
n=0
for r in T:
    if r['len']<16: continue
    if np.median(r['v'])<vmin: continue
    p=r['p']; k=max(1,len(p)//6); idx=list(range(0,len(p),k)); 
    if idx[-1]!=len(p)-1: idx.append(len(p)-1)
    out=[]
    for i in idx: out+= [p[i][0],p[i][1],round(float(np.clip(r['w'][i]*0.9,2,9)),1),int(r['v'][i])]
    print('  ['+', '.join(str(x) for x in out)+'],'); n+=1
print('];')
print(n,file=sys.stderr)
