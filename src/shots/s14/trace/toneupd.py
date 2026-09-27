# toneupd.py tone.json [damp] : fold the measured ratios into src/shots/s14/tone.js
import json, re, sys
res=json.load(open(sys.argv[1])); damp=float(sys.argv[2]) if len(sys.argv)>2 else 0.85
p='/Users/computer/rootline/apprentice-film/src/shots/s14/tone.js'
s=open(p).read()
m=re.search(r'export const TONE = (\{.*\});',s,re.S)
src=re.sub(r'(\w+):',r'"\1":',m.group(1)); src=re.sub(r',\s*([}\]])',r'\1',src)
T=json.loads(src) if m.group(1)!='{}' else {}
T={k:{int(i):v for i,v in d.items()} for k,d in T.items()}
for r in res:
    if r['n']<1500: continue
    k0=T.get(r['layer'],{}).get(r['idx'],1.0)
    q=((r['src']+4)/(r['ren']+4))**damp
    k=max(0.3,min(8.0,k0*q))
    T.setdefault(r['layer'],{})[r['idx']]=round(k,3)
body='{\n'+''.join(f'  {L}: {{ '+', '.join(f'{i}: {v}' for i,v in sorted(d.items()))+' },\n' for L,d in T.items())+'}'
s=s[:m.start(1)]+body+s[m.end(1):]
open(p,'w').write(s)
print('updated', sum(len(d) for d in T.values()),'gains')
