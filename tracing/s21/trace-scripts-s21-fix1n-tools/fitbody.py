#!/usr/bin/env python3
# fitbody.py T1,T2,... : coordinate descent of the body/tail offsets bo = [dx,dy,sa,sb,drot,tipdx,tipdy,degg,basedx,basedy]
# (units) maximising the mean silhouette IoU against the source owl mask
import cv2, sys, json, subprocess, numpy as np
exec(open('/Users/computer/rootline/apprentice-film/snapshots/s21-fix1n-tools/wingfit_lib.py').read())
ts=[float(v) for v in sys.argv[1].split(',')]
NODE='''
const {probeShape}=await import('/Users/computer/rootline/apprentice-film/src/shots/s21.js');
const ts=JSON.parse(process.argv[1]), G=JSON.parse(process.argv[2]);
console.log(JSON.stringify(ts.map((t)=>({cur:probeShape(t), g:G.map((b)=>{const q=probeShape(t,null,null,1,b); return {body:q.body,tail:q.tail};})}))));'''
def shapes(grid):
    js=subprocess.run(['node','--input-type=module','-e',NODE,json.dumps(ts),json.dumps(grid)],capture_output=True,text=True)
    if js.returncode: print(js.stderr); sys.exit(1)
    return json.loads(js.stdout)
c=cv2.VideoCapture(V); MS={}; BOX={}
D0=shapes([[0,0,1,1,0,0,0,0,0,0]])
for t,d in zip(ts,D0):
    cur=d['cur']; allp=cur['head']+cur['body']+[p for w in cur['wings'] for poly in w['polys'] for p in poly]+[p for tl in cur['tail'] for p in tl]
    xs=[p[0] for p in allp]; ys=[p[1] for p in allp]
    box=(max(0,int(min(xs))-60),max(0,int(min(ys))-60),min(2206,int(max(xs))+60),min(946,int(max(ys))+60))
    c.set(1,int(round(t*25))); ok,f=c.read(); ms=smask(f,box)
    zone=cv2.dilate(raster(cur,cur['wings'],box),np.ones((41,41),np.uint8)); MS[t]=ms&zone; BOX[t]=box
def score(grid):
    D=shapes(grid); sc=np.zeros(len(grid))
    for t,d in zip(ts,D):
        cur=d['cur']
        for i,g in enumerate(d['g']):
            sh=dict(cur); sh['body']=g['body']; sh['tail']=g['tail']; mr=raster(sh,cur['wings'],BOX[t]); ms=MS[t]
            sc[i]+=(mr&ms).sum()/max(1,(mr|ms).sum())
    return sc/len(ts)
x=[0,0,1,1,0,0,0,0,0,0]; st=[12,12,0.08,0.08,0.12,20,15,0.08,15,12]
best=score([x])[0]; print('start %.4f'%best)
for it in range(6):
    imp=False
    for i in range(len(x)):
        cand=[]
        for dd in (-1,1):
            y=list(x); y[i]+=dd*st[i]; cand.append(y)
        sc=score(cand); j=int(np.argmax(sc))
        if sc[j]>best+1e-4: best=sc[j]; x=cand[j]; imp=True
    print(it,'%.4f'%best,[round(v,3) for v in x])
    if not imp: st=[v*0.5 for v in st]
