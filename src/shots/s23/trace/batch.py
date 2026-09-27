import sys, json, os, numpy as np, cv2, time
from multiprocessing import Pool
import fgx, cel as C, plan
OUT=os.environ.get('CELDIR','cels')
PAR=json.loads(os.environ.get('CELPAR','{}')); TP={k:v for k,v in PAR.items() if k!='feather'}
def one(k):
    t0=time.time()
    F,P,cov,m=fgx.fg(k,shards=False)
    lines=[]
    if k>=2399:
        from lines import bright_lines
        lines,L=bright_lines(F,P,m)
        m=m&(1-cv2.dilate(L,np.ones((3,3),np.uint8)))
    from core import CRISP
    if k>=2399 and k not in CRISP: cel=C.trace_alpha(F,P,m)   # motion streaks and smears: light over our page
    else: cel=C.trace(F,m,**{**plan.params(k),**TP})
    if cel is not None: cel['lines']=lines
    json.dump(cel,open('%s/%05d.json'%(OUT,k),'w'))
    if cel is None: return (k,0,0,0.0,0.0,time.time()-t0)
    npts=sum(len(r)//2 for f in cel['fills'] for r in f['r'])+sum(len(s['w']) for s in cel['strokes'])
    if not os.environ.get('EVAL'): return (k,npts,int(m.sum()),0.0,0.0,time.time()-t0)
    x0,y0,x1,y1=cel['bbox']
    X0,Y0,X1,Y1=max(0,x0-30),max(0,y0-30),min(2206,x1+30),min(946,y1+30)
    Fc=F[Y0:Y1,X0:X1]; Pc=P[Y0:Y1,X0:X1]
    cel2=dict(cel); cel2['bbox']=[x0-X0,y0-Y0,x1-X0,y1-Y0]
    cel2['fills']=[{'c':f['c'],'r':[(np.array(r).reshape(-1,2)-[2*X0,2*Y0]).ravel().tolist() for r in f['r']]} for f in cel['fills']]
    R=C.raster(cel2,Fc.shape,Pc,feather=PAR.get('feather',0.6))
    mm=m[Y0:Y1,X0:X1]>0
    e8=np.abs(cv2.GaussianBlur(R,(0,0),8)-cv2.GaussianBlur(Fc,(0,0),8)).mean(-1)[mm].mean()
    e2=np.abs(cv2.GaussianBlur(R,(0,0),1.5)-cv2.GaussianBlur(Fc,(0,0),1.5)).mean(-1)[mm].mean()
    return (k,npts,int(m.sum()),float(e2),float(e8),time.time()-t0)
if __name__=='__main__':
    os.makedirs(OUT,exist_ok=True)
    spec=sys.argv[1]
    ks=[]
    for part in spec.split(','):
        if '-' in part:
            a,b=part.split('-'); st=1
            if ':' in b: b,st=b.split(':'); st=int(st)
            ks+=list(range(int(a),int(b)+1,st))
        else: ks.append(int(part))
    with Pool(int(os.environ.get('NP','8'))) as p:
        res=p.map(one,ks)
    tot=0
    for r in res:
        print(r[0],'pts',r[1],'area',r[2],'e2 %.4f e8 %.4f  %.1fs'%(r[3],r[4],r[5]) if len(r)>5 else '')
        tot+=r[1]
    print('total points',tot,'mean',tot/len(res))
