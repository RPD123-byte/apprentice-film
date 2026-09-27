# link.py in.json out.json : join traced fragments whose ends meet (<8 px) with compatible directions (<40 deg)
import json, sys, numpy as np
GAP=float(sys.argv[3]) if len(sys.argv)>3 else 8
T=json.load(open(sys.argv[1]))
fr=[{'p':[tuple(q) for q in r['p']],'w':list(r['w']),'v':list(r['v']),'len':r['len']} for r in T]
def tang(p,end):
    a=np.array(p[0] if end==0 else p[-1],float); b=np.array(p[min(2,len(p)-1)] if end==0 else p[max(-3,-len(p))],float)
    d=a-b; n=np.hypot(*d) or 1; return d/n   # pointing outward from the fragment
changed=True
while changed:
    changed=False; best=None
    for i in range(len(fr)):
        for j in range(len(fr)):
            if i==j: continue
            for ei in (0,1):
                for ej in (0,1):
                    pi=np.array(fr[i]['p'][0 if ei==0 else -1],float); pj=np.array(fr[j]['p'][0 if ej==0 else -1],float)
                    d=np.hypot(*(pi-pj))
                    if d>GAP: continue
                    ti=tang(fr[i]['p'],ei); tj=tang(fr[j]['p'],ej)
                    if np.dot(ti,-tj)<np.cos(np.radians(40)): continue
                    gap=pj-pi
                    if d>2 and np.dot(ti,gap/d)<0.5: continue
                    sc=d-3*np.dot(ti,-tj)
                    if best is None or sc<best[0]: best=(sc,i,j,ei,ej)
    if best:
        _,i,j,ei,ej=best
        A,B=fr[i],fr[j]
        pa,wa,va=(A['p'],A['w'],A['v']) if ei==1 else (A['p'][::-1],A['w'][::-1],A['v'][::-1])
        pb,wb,vb=(B['p'],B['w'],B['v']) if ej==0 else (B['p'][::-1],B['w'][::-1],B['v'][::-1])
        fr[i]={'p':pa+pb,'w':wa+wb,'v':va+vb,'len':A['len']+B['len']}
        del fr[j]; changed=True
out=[{'len':f['len'],'bh':0,'p':[list(q) for q in f['p']],'w':f['w'],'v':f['v']} for f in fr]
out.sort(key=lambda r:-r['len'])
json.dump(out,open(sys.argv[2],'w')); print(len(T),'->',len(out),'; longest',[o['len'] for o in out[:12]])
