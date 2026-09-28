#!/usr/bin/env python3
# qv.py REF '[[x,y],...4 corners TL TR BR BL]' ... : least-squares bilinear fit of the pre-grade value (blurred) over each
# quad face of the ungraded reference -> corner values [tl, tr, br, bl] for carve's vq = BL(tl, tr, br, bl);
# also mean, and the value's std inside the face (texture strength). REF = TB | TBp | TA
import sys, json, numpy as np, cv2
ref=sys.argv[1]; u=np.load(f'{ref}_u.npy').mean(2)
sig=float([a for a in sys.argv if a.startswith('--sig=')][0][6:]) if any(a.startswith('--sig=') for a in sys.argv) else 4
ub=cv2.GaussianBlur(u,(0,0),sig)
H,W=u.shape
def inv_bil(px,py,q):
    # numeric inverse bilinear via Newton
    a,b,c,d=[np.array(p,float) for p in q]
    uu=np.full(px.shape,0.5); vv=np.full(px.shape,0.5)
    for _ in range(12):
        P=(1-vv)[...,None]*((1-uu)[...,None]*a+uu[...,None]*b)+vv[...,None]*((1-uu)[...,None]*d+uu[...,None]*c)
        du=(1-vv)[...,None]*(b-a)+vv[...,None]*(c-d); dv=(1-uu)[...,None]*(d-a)+uu[...,None]*(c-b)
        rx=px-P[...,0]; ry=py-P[...,1]
        det=du[...,0]*dv[...,1]-du[...,1]*dv[...,0]; det[det==0]=1e-6
        uu+= ( rx*dv[...,1]-ry*dv[...,0])/det; vv+=(-rx*du[...,1]+ry*du[...,0])/det
    return uu,vv
for arg in sys.argv[2:]:
    if arg.startswith('--'): continue
    q=json.loads(arg); m=np.zeros((H,W),np.uint8)
    cv2.fillPoly(m,[np.array(q,np.int32)],1)
    k=cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(5,5)); m=cv2.erode(m,k)
    ys,xs=np.nonzero(m)
    if len(xs)<10: print('empty',arg); continue
    uu,vv=inv_bil(xs.astype(float)+0.5,ys.astype(float)+0.5,q)
    A=np.stack([(1-uu)*(1-vv),uu*(1-vv),uu*vv,(1-uu)*vv],1)
    y=ub[ys,xs]
    c,*_=np.linalg.lstsq(A,y,rcond=None)
    res=y-A@c
    print(json.dumps(q),'-> BL(%.3f, %.3f, %.3f, %.3f)'%tuple(np.clip(c,0,1)),'mean %.3f rms %.3f texstd %.3f'%(y.mean(),np.sqrt((res**2).mean()),u[ys,xs].std()))
    gs=[a for a in sys.argv if a.startswith('--grid=')]
    if gs:
        nu,nv=[int(x) for x in gs[0][7:].split('x')]
        def tent(t,n):
            B=np.zeros((len(t),n)); f=np.clip(t,0,1)*(n-1); i0=np.minimum(np.floor(f).astype(int),n-2); w=f-i0
            B[np.arange(len(t)),i0]=1-w; B[np.arange(len(t)),i0+1]=w; return B
        Bu=tent(uu,nu); Bv=tent(vv,nv)
        A2=(Bv[:,:,None]*Bu[:,None,:]).reshape(len(uu),nu*nv)
        lam=1e-3*len(uu)
        c2=np.linalg.solve(A2.T@A2+lam*np.eye(nu*nv),A2.T@y)
        res2=y-A2@c2
        print('   GRID(%d, %d, [%s]) rms %.3f'%(nu,nv,', '.join('%.2f'%v for v in np.clip(c2,0,1)),np.sqrt((res2**2).mean())))
