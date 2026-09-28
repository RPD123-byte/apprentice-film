#!/usr/bin/env python3
# wingscale.py : IoU at the fitted states for wing scale factors k (frames free of the margin-glow contamination)
import cv2, sys, json, subprocess, numpy as np
sys.path.insert(0,'/Users/computer/rootline/apprentice-film/snapshots/s21-fix1n-tools')
exec(open('/Users/computer/rootline/apprentice-film/snapshots/s21-fix1n-tools/wingfit_lib.py').read())
FR={72.0:(0.9,0.6),72.04:(0.2,0),72.08:(0.3,0.25),72.12:(1,1),72.16:(0.2,0.1),72.2:(0,0.1),72.24:(0.1,0),72.28:(0.3,0.7),72.32:(0.6,0.9),72.36:(0,0.3),72.4:(0.25,0.35),72.68:(0.5,0.1),72.72:(0.9,0.9),72.76:(0.8,0.3),72.8:(0.4,0.1),72.84:(0.9,0.6),72.88:(1,1),72.92:(1,0.8),72.96:(0.95,0.95),73.0:(0.8,0.5)}
KS=[0.9,1.0,1.1,1.2,1.3]
js=subprocess.run(['node','--input-type=module','-e','''
const {probeShape}=await import('/Users/computer/rootline/apprentice-film/src/shots/s21.js');
const FR=JSON.parse(process.argv[1]), KS=JSON.parse(process.argv[2]); const out={};
for (const [t,[a,b]] of Object.entries(FR)){ out[t]={cur:probeShape(+t), k:{}, all:[]}; for(const k of KS) out[t].k[k]=probeShape(+t,a,b,k).wings; for (const u of [0,0.5,1]) for (const v of [0,0.5,1]) out[t].all.push(probeShape(+t,u,v,1.3).wings); }
console.log(JSON.stringify(out));''',json.dumps({str(k):v for k,v in FR.items()}),json.dumps(KS)],capture_output=True,text=True)
if js.returncode: print(js.stderr); sys.exit(1)
D=json.loads(js.stdout); c=cv2.VideoCapture(V); tot={k:[] for k in KS}
for t in FR:
    d=D[str(t)]; cur=d['cur']
    allp=[q for q in cur['head']+cur['body']]
    for wg in d['all']:
        for w in wg:
            for poly in w['polys']: allp+=poly
    xs=[p[0] for p in allp]; ys=[p[1] for p in allp]
    box=(max(0,int(min(xs))-60),max(0,int(min(ys))-60),min(2206,int(max(xs))+60),min(946,int(max(ys))+60))
    c.set(1,int(round(t*25))); ok,f=c.read(); ms=smask(f,box)
    zone=np.zeros_like(ms)
    for wg in d['all']: zone|=raster(cur,wg,box)
    zone=cv2.dilate(zone,np.ones((31,31),np.uint8)); ms=ms&zone
    row=[]
    for k in KS:
        kk=str(int(k)) if k==int(k) else str(k)
        mr=raster(cur,d['k'][kk],box); v=(mr&ms).sum()/max(1,(mr|ms).sum()); tot[k].append(v); row.append(f'{v:.3f}')
    print(f'{t:.2f} '+' '.join(row))
print('mean '+' '.join(f'{np.mean(tot[k]):.3f}' for k in KS), ' k =',KS)
