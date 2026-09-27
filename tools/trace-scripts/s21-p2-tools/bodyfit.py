#!/usr/bin/env python3
# bodyfit.py T0 T1 : fit a body offset/scale [dx, dy, sa, sb, drot] (units) for the flight by mean silhouette IoU
import cv2, sys, json, subprocess, numpy as np, itertools
exec(open('/Users/computer/rootline/apprentice-film/snapshots/s21-p2-tools/wingfit_lib.py').read())
ts=[float(v) for v in sys.argv[1].split(',')]
grid=[]
for dx in (-30,-15,0,15):
  for dy in (-15,0,15,30,45):
    for sa in (0.9,1.0,1.1):
      for sb in (0.9,1.0,1.1):
        for dr in (0,): grid.append([dx,dy,sa,sb,dr])
js=subprocess.run(['node','--input-type=module','-e','''
const {probeShape}=await import('/Users/computer/rootline/apprentice-film/src/shots/s21.js');
const ts=JSON.parse(process.argv[1]), G=JSON.parse(process.argv[2]); const out={};
for (const t of ts){ const cur=probeShape(t); out[t]={cur, g:G.map((b)=>probeShape(t,null,null,1,b).body)}; }
console.log(JSON.stringify(out));''',json.dumps(ts),json.dumps(grid)],capture_output=True,text=True)
if js.returncode: print(js.stderr); sys.exit(1)
D=json.loads(js.stdout); c=cv2.VideoCapture(V)
score=np.zeros(len(grid)); base=0
for t in ts:
    k=str(int(t)) if t==int(t) else str(t); d=D[k]; cur=d['cur']
    allp=cur['head']+cur['body']+[p for w in cur['wings'] for poly in w['polys'] for p in poly]
    xs=[p[0] for p in allp]; ys=[p[1] for p in allp]
    box=(max(0,int(min(xs))-60),max(0,int(min(ys))-60),min(2206,int(max(xs))+60),min(946,int(max(ys))+60))
    c.set(1,int(round(t*25))); ok,f=c.read(); ms=smask(f,box)
    zone=cv2.dilate(raster(cur,cur['wings'],box),np.ones((41,41),np.uint8)); ms=ms&zone
    b0=raster(cur,cur['wings'],box); base+=(b0&ms).sum()/max(1,(b0|ms).sum())
    for i,bd in enumerate(d['g']):
        sh=dict(cur); sh['body']=bd; mr=raster(sh,cur['wings'],box); score[i]+=(mr&ms).sum()/max(1,(mr|ms).sum())
i=int(np.argmax(score)); print('base %.3f best %.3f'%(base/len(ts),score[i]/len(ts)),grid[i])
for j in np.argsort(-score)[:6]: print('  %.3f'%(score[j]/len(ts)),grid[j])
