import numpy as np
E=(1645.1,261.75,39.2,38.15)
def prof(G,E=E,r0=30,r1=62,step=1.0,exclude_face=True):
    cx,cy,rx,ry=E
    Y,X=np.mgrid[200:325,1580:1710]
    rho=np.hypot((X-cx)/rx,(Y-cy)/ry)*rx
    sub=G[200:325,1580:1710]
    out=[]
    for lo in np.arange(r0,r1,step):
        sel=(rho>=lo)&(rho<lo+step)
        out.append(np.median(sub[sel][:, ::-1],0))
    return np.arange(r0,r1,step),np.array(out)
