import re, json, numpy as np
exec(open('shtable.py').read().split("# the stored table")[0].replace("print","pass;#")) if False else None
src=open('shadow_table.js').read()
T={int(k):json.loads(v) for k,v in re.findall(r'(\d+): (\[.*?\]\]|\[\])', src)}
rows=[840,850,865,880,900,920,940]
ks=sorted(T)
def get(k,y):
    for r in T.get(k,[]):
        if r[0]==y: return r[1],r[2]
    return None
S={}
for k in ks:
    out=[]
    for y in rows:
        c=[get(j,y) for j in (k-1,k,k+1) if get(j,y)]
        me=get(k,y)
        if not me: continue
        if len(c)>=2:
            xl=int(np.median([v[0] for v in c])); xr=int(np.median([v[1] for v in c]))
        else: xl,xr=me
        if xr-xl>30: out.append([y,xl,xr])
    S[k]=out
js='// the owl\'s shadow pool on the lit floor, per source frame (k = t·25): rows [y, x left, x right] where the floor is\n// darker than 0.3 of the owl-free lit floor (57.36), blurred sigma 7, largest run per row, median of 3 frames\nexport const SHADOW = {\n'+'\n'.join(f'  {k}: {json.dumps(o)},' for k,o in S.items())+'\n};\n'
open('shadow_table2.js','w').write(js)
print(len(js))
