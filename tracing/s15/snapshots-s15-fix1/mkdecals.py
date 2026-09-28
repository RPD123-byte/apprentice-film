import json
L=json.load(open('lip.json')); N=json.load(open('decalncc.json')); J=json.load(open('decalq.json')); B=json.load(open('facebest.json'))
src=open('/Users/computer/rootline/apprentice-film/src/shots/s15/decals.js').read()
head=src[:src.index('export const DECALS')]
out={}
for key,rows in L.items():
    T,fid=key.split(':'); d=J['d'][T][fid]; ref=B[T][fid]['f']
    nc={f:s for f,s in N[key]}; lp={f:s for f,s in rows}
    fs=sorted(lp)
    n=2 if len(d)>4 else 1
    fl=[]
    for k in range(n):
        ok=lambda f:(lp[f][k]<=-10 or nc.get(f,[0,0])[k]>=0.8)
        i0=fs.index(ref); keep={ref}
        for dirn in (1,-1):
            miss=0; i=i0+dirn
            while 0<=i<len(fs) and abs(fs[i]-fs[i-dirn])<=2:
                if ok(fs[i]): keep.add(fs[i]); miss=0
                else:
                    miss+=1
                    if miss>1: break
                i+=dirn
        # fill single-frame holes between kept frames
        ks=sorted(keep)
        full=[f for f in fs if ks[0]<=f<=ks[-1]]
        fl.append(full)
    e={'s':d[:4],'f1':fl[0]}
    if n==2: e['s2']=d[4:6]; e['f2']=fl[1]
    out.setdefault(T,{})[fid]=e
js=head+'export const DECALS = {\n'
for T,faces in out.items():
    js+=f'  {T}: {{\n'
    for fid,e in faces.items():
        s=json.dumps(e,separators=(", ",": "))
        for k in ('s','f1','s2','f2'): s=s.replace(f'"{k}"',k)
        js+=f'    {fid}: {s},\n'
    js+='  },\n'
js+='};\n'
open('/Users/computer/rootline/apprentice-film/src/shots/s15/decals.js','w').write(js)
