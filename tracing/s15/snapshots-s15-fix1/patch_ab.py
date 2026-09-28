# fix 1: the cut A -> B lands on frame 1024 (source): drop 1024 from ROTO_A, add B quads for 1024 (propagated from
# 1025 by flow, keyboard added by hand) with values fitted on the source frame 1024 (+ 1025's refinement offsets)
import sys, json, re, numpy as np
sys.path.insert(0,'/Users/computer/rootline/apprentice-film/snapshots/s15-p4/tools')
import build
from common import jsdata
import common
ROOT='/Users/computer/rootline/apprentice-film'
faces=[]
for ln in open('roto/1024.txt'):
    t=ln.split()
    if not t: continue
    faces.append((t[0],np.array([float(x) for x in t[1:9]]).reshape(4,2),{}))
vals=build.fitframe(1024,faces)
corr=json.load(open('/Users/computer/rootline/apprentice-film/snapshots/s15-p4/roto/corr-B.json'))
B=jsdata(f'{ROOT}/src/shots/s15/rotoB.js')
r25={r[0]:r for r in B['frames']['1025']}
rows=[]
for (fid,q,o),c in zip(faces,vals):
    d=corr.get('1025',{}).get(fid,[0,0,0,0])
    c2=[round(float(np.clip(a+b,-0.05,1.4)),3) for a,b in zip(c,d)]
    old=r25.get(fid)
    print(fid,'fit',[round(x,2) for x in c2],'1025',old[9:] if old else None)
    rows.append([fid]+[round(float(x),1) for x in q.reshape(-1)]+c2)
fc=build.floorfit(build.lin(1024),build.floormask(1024,faces))
dd=np.array(corr.get('1025',{}).get('_floor',[0]*len(fc)))
fl=[round(float(np.clip(a+b,-0.05,1.3)),3) for a,b in zip(fc,dd)]
# write B
p=f'{ROOT}/src/shots/s15/rotoB.js'; s=open(p).read()
s=re.sub(r'\n  1024: \[.*?\],(?=\n)','',s)
if True:
    i=s.index('\n  1025: [['); s=s[:i]+'\n  1024: '+json.dumps(rows,separators=(',',':'))+','+s[i:]
    j=s.index('floor: {'); k=s.index('\n  1025: [',j); s=s[:k]+'\n  1024: '+json.dumps(fl,separators=(',',':'))+','+s[k:]
    open(p,'w').write(s)
# drop 1024 from A
p=f'{ROOT}/src/shots/s15/rotoA.js'; s=open(p).read()
s2=re.sub(r'\n  1024: \[.*?\],(?=\n)','',s)
print('A removed',s.count('\n  1024:')-s2.count('\n  1024:'))
open(p,'w').write(s2)
