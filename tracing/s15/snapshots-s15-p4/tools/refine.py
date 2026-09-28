#!/usr/bin/env python3
# refine.py NAME RENDERDIR F0 F1 [gain] : per face, fit the render's and the source's brightness (through the inverse grade)
# with the same bilinear model over the face's visible pixels, add gain * (source - render) to roto/corr-NAME.json
import os
for _k in ('OPENBLAS_NUM_THREADS','OMP_NUM_THREADS','VECLIB_MAXIMUM_THREADS','MKL_NUM_THREADS'): os.environ.setdefault(_k,'1')
import sys, os, json, cv2, numpy as np
sys.path.insert(0,os.path.dirname(__file__)); from common import *
from build import uvof, bfit, V
NAME,RDIR,F0,F1=sys.argv[1],sys.argv[2],int(sys.argv[3]),int(sys.argv[4]); gain=float(sys.argv[5]) if len(sys.argv)>5 else 0.8
cp=f'{RD}/corr-{NAME}.json'; corr=json.load(open(cp)) if os.path.exists(cp) else {}
def lin(g):
    g=cv2.GaussianBlur(gray(g).astype(np.float32)/255,(0,0),3.0); return sinv(g/V)
tot=[]
for f in range(F0,F1+1):
    faces=load(f); rp=f'{RDIR}/r{f}.png'
    if faces is None or not os.path.exists(rp): continue
    S=lin(frame(f)); R=lin(cv2.imread(rp)); ids=idmap(faces); om=owlmask(f)>0
    cf=corr.setdefault(str(f),{})
    for i,(fid,q,opt) in enumerate(faces):
        ys,xs=np.nonzero((ids==i)&~om)
        if len(xs)<60: continue
        if len(xs)>40000:
            k=np.linspace(0,len(xs)-1,40000).astype(int); xs,ys=xs[k],ys[k]
        u,v=uvof(q,xs+0.5,ys+0.5); ok=np.isfinite(u)&np.isfinite(v)
        u,v=np.clip(u[ok],-0.2,1.2),np.clip(v[ok],-0.2,1.2); xs,ys=xs[ok],ys[ok]
        su,sv=np.ptp(u),np.ptp(v); lam=0.05+0.3*max(0,0.5-min(su,sv))
        d=bfit(u,v,S[ys,xs],lam)-bfit(u,v,R[ys,xs],lam)
        tot.append(float(np.abs(S[ys,xs]-R[ys,xs]).mean()))
        c=cf.get(fid,[0,0,0,0]); cf[fid]=[round(float(np.clip(a+gain*b,-0.8,0.8)),4) for a,b in zip(c,d)]
    # the floor grid
    from build import floorfit, floormask
    m=floormask(f,faces)
    if m.sum()>500:
        dS=floorfit(S,m); dR=floorfit(R,m)
        if dS is not None and dR is not None:
            c=cf.get('_floor',[0]*len(dS)); cf['_floor']=[round(float(np.clip(a+gain*(x-y),-0.8,0.8)),4) for a,x,y in zip(c,dS,dR)]
# hatch gain per face id: the ratio of the source's high-frequency texture energy to the render's (median over frames)
from strokes import measure
rat={}
for f in range(F0,F1+1):
    faces=load(f); rp=f'{RDIR}/r{f}.png'
    if faces is None or not os.path.exists(rp): continue
    Sm=measure(frame(f),faces,f); Rm=measure(cv2.imread(rp),faces,f)
    for k in Sm:
        if k in Rm and Rm[k]['hf']>0.004: rat.setdefault(k,[]).append(Sm[k]['hf']/Rm[k]['hf'])
hk=corr.setdefault('_hk',{})
for k,v in rat.items(): hk[k]=round(float(np.clip(hk.get(k,1.0)*np.median(v)**1.2,0.1,6.0)),4)
json.dump(corr,open(cp,'w')); print('refined',NAME,'mean |S-R| lin over faces',round(float(np.mean(tot)) if tot else 0,4))
