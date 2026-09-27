import json,numpy as np
from sctrack import track
out={}
jobs=[('TL','dive',(300,120),np.arange(0.35,0.8,0.04)),('BL','dive',(160,790),np.arange(0.35,0.8,0.04)),
      ('TR','eTR',(1790,160),np.arange(0.6,1.25,0.05)),('BR','eTR',(1800,640),np.arange(0.6,1.25,0.05))]
for name,k,c,sc in jobs:
    r=track(k,[2562],rots=np.arange(-30,31,5),scales=sc,win=150,prev=c)
    A=np.array(r[2562][:6]).reshape(2,3)
    T=json.load(open(f't_{k}.json')); x0,y0,x1,y1=T['box']; cx,cy=(x0+x1)/2,(y0+y1)/2
    c0=(A[0,0]*cx+A[0,1]*cy+A[0,2],A[1,0]*cx+A[1,1]*cy+A[1,2]); s0=float(np.hypot(A[0,0],A[1,0]))
    res=dict(r)
    for rng_ in [range(2563,2569),range(2561,2555,-1)]:
        prev=c0
        for f in rng_:
            rr=track(k,[f],rots=np.arange(-30,31,5),scales=np.arange(s0*0.8,s0*1.25,0.04),win=130,prev=prev)
            res[f]=rr[f]; A=np.array(rr[f][:6]).reshape(2,3); prev=(A[0,0]*cx+A[0,1]*cy+A[0,2],A[1,0]*cx+A[1,1]*cy+A[1,2])
    out[name]={'k':k,'t':{str(f):v for f,v in res.items()}}
json.dump(out,open('e2track.json','w'))
