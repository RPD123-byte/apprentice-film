# emit a traced patch as a compact JS literal
import json, sys
T=json.load(open(sys.argv[1])); name=sys.argv[2]; soft_blur=float(sys.argv[3]) if len(sys.argv)>3 else 5
pal=[p for p in T['palette'] if p[2] in ('hard','soft')]
names=[p[0] for p in pal]
polys=sorted(T['polys'],key=lambda r:(names.index(r['c'])))
rows=[]
for r in polys:
  rows.append('['+str(names.index(r['c']))+','+str(r.get('s',1 if dict((p[0],p[2]) for p in pal)[r['c']]=='soft' else 0))+','+','.join(map(str,r['p']))+']')
cols=','.join('"%s"'%p[1] for p in pal)
hol=('holes: '+json.dumps([[v for p in h for v in p] for h in T['holes']])+', ') if T.get('holes') else ''
js=f'const {name} = {{ rect: {json.dumps(T["rect"])}, {hol}blur: {soft_blur}, names: {json.dumps(names)}, cols: [{cols}],\n  polys: [\n'
line=''; out=[]
for r in rows:
  if len(line)+len(r)>118: out.append(line); line=''
  line+=r+','
out.append(line)
js+='\n'.join('    '+l for l in out)+'\n  ]'
if T.get('lines'):
  js+=',\n  lines: [\n'; line=''; out=[]
  for l in T['lines']:
    r='['+str(int(round(l['w']*10)))+','+','.join(map(str,l['p']))+']'
    if len(line)+len(r)>118: out.append(line); line=''
    line+=r+','
  out.append(line)
  js+='\n'.join('    '+l for l in out)+'\n  ]'
if T.get('strokes'):
  inames=[p[0] for p in T['palette'] if p[2] in ('hard','soft')]
  js+=',\n  strokes: [\n'; line=''; out=[]
  for s_ in T['strokes']:
    P=s_['p']; Wd=s_['w']; vals=[]
    for i in range(len(Wd)): vals+= [P[2*i],P[2*i+1],int(round(Wd[i]*10))]
    r='['+str(inames.index(s_['c']))+','+','.join(('%g'%v) for v in vals)+']'
    if len(line)+len(r)>118: out.append(line); line=''
    line+=r+','
  out.append(line)
  js+='\n'.join('    '+l for l in out)+'\n  ]'
js+=' };\n'
open(sys.argv[1].replace('.json','.js'),'w').write(js)
print(len(js),'bytes')
