#!/usr/bin/env python3
# build.py NAME F0 F1 : quads roto/<f>.txt (f in F0..F1) -> fitted corner values -> src/shots/s15/roto<NAME>.js
# Corner values: bilinear least-squares fit (over the face's visible pixels, owl masked) of the source brightness taken
# back through the global grade (vignette, S-curve), plus the refinement offsets in roto/corr-<NAME>.json (refine.py).
# Only numbers are written: 8 corner coordinates and 4 values per face per frame.
import os
for _k in ('OPENBLAS_NUM_THREADS','OMP_NUM_THREADS','VECLIB_MAXIMUM_THREADS','MKL_NUM_THREADS'): os.environ.setdefault(_k,'1')
import sys, os, json, cv2, numpy as np
sys.path.insert(0,os.path.dirname(__file__)); from common import *
V=vig()
UNIT=np.float32([[0,0],[1,0],[1,1],[0,1]])
def lin(f):
    g=gray(frame(f)).astype(np.float32)/255
    g=cv2.GaussianBlur(g,(0,0),2.0)
    return sinv(g/V)
def uvof(q,xs,ys):
    Hm=cv2.getPerspectiveTransform(np.float32(q),UNIT)
    p=np.stack([xs,ys,np.ones_like(xs)],0).astype(np.float64); r=Hm@p
    return r[0]/r[2], r[1]/r[2]
def bfit(u,v,val,lam=0.02,robust=True):
    # bilinear least squares (ridge toward the mean), then a few robust (Cauchy) reweightings so that a sliver of
    # another surface inside the quad does not drag the corners
    A=np.stack([(1-u)*(1-v),u*(1-v),u*v,(1-u)*v],1)
    w=np.ones_like(val)
    for it in range(4 if robust else 1):
        sw=w.sum(); m=(w*val).sum()/sw
        M=(A*w[:,None]).T@A/sw+lam*np.eye(4); b=(A*w[:,None]).T@(val-m)/sw
        c=np.linalg.solve(M,b)+m
        r=val-A@c; s=max(0.06,1.4826*np.median(np.abs(r)))
        w=1/(1+(r/(2.0*s))**2)
    return c
def fitframe(f,faces):
    L=lin(f); ids=idmap(faces); om=owlmask(f)>0
    out=[]
    for i,(fid,q,opt) in enumerate(faces):
        m=(ids==i)&~om
        ys,xs=np.nonzero(m)
        if len(xs)<30:
            m2=(ids==i); ys,xs=np.nonzero(m2)
        if len(xs)<30:
            out.append([0.1]*4); continue
        if len(xs)>60000:
            k=np.linspace(0,len(xs)-1,60000).astype(int); xs,ys=xs[k],ys[k]
        u,v=uvof(q,xs+0.5,ys+0.5); val=L[ys,xs]
        ok=np.isfinite(u)&np.isfinite(v); u,v,val=np.clip(u[ok],-0.2,1.2),np.clip(v[ok],-0.2,1.2),val[ok]
        # spread of the visible part in uv decides how much corner freedom the fit gets
        su,sv=np.ptp(u),np.ptp(v); lam=0.02+0.3*max(0,0.5-min(su,sv))
        c=bfit(u,v,val,lam)
        out.append([float(np.clip(x,-0.05,1.25)) for x in c])
    return out
# ---- the floor: a coarse node grid of measured value over the uncovered part of the frame (the floor between the
# faces), fitted by least squares with a smoothness (Laplacian) term; bilinear between nodes. Numbers only.
FX=np.linspace(0,W,13); FY=np.array([350,500,620,720,810,890,960],float)
def _lap(nx,ny):
    R=[]
    for j in range(ny):
        for i in range(nx):
            k=j*nx+i
            for (a,b) in ((i-1,j),(i+1,j),(i,j-1),(i,j+1)):
                if 0<=a<nx and 0<=b<ny:
                    r=np.zeros(nx*ny); r[k]=1; r[b*nx+a]=-1; R.append(r)
    return np.array(R)
LAP=_lap(len(FX),len(FY))
def gridA(xs,ys):
    nx,ny=len(FX),len(FY)
    ix=np.clip(np.searchsorted(FX,xs)-1,0,nx-2); iy=np.clip(np.searchsorted(FY,ys)-1,0,ny-2)
    fx=np.clip((xs-FX[ix])/(FX[ix+1]-FX[ix]),0,1); fy=np.clip((ys-FY[iy])/(FY[iy+1]-FY[iy]),0,1)
    n=len(xs); A=np.zeros((n,nx*ny))
    r=np.arange(n)
    A[r,iy*nx+ix]+=(1-fx)*(1-fy); A[r,iy*nx+ix+1]+=fx*(1-fy); A[r,(iy+1)*nx+ix]+=(1-fx)*fy; A[r,(iy+1)*nx+ix+1]+=fx*fy
    return A
def floorfit(L,mask,lam=0.6):
    ys,xs=np.nonzero(mask)
    if len(xs)<200: return None
    k=np.linspace(0,len(xs)-1,min(len(xs),20000)).astype(int); xs,ys=xs[k].astype(float),ys[k].astype(float)
    A=gridA(xs+0.5,ys+0.5); b=L[ys.astype(int),xs.astype(int)]
    w=np.ones(len(b))
    LL=LAP.T@LAP*(lam*0.0025)
    for it in range(3):
        Aw=A*(w/len(b))[:,None]
        c=np.linalg.solve(A.T@Aw+LL+1e-6*np.eye(A.shape[1]),Aw.T@b)
        r=b-A@c; s=max(0.05,1.4826*np.median(np.abs(r))); w=1/(1+(r/(2*s))**2)
    return c
def floormask(f,faces):
    ids=idmap(faces); m=(ids<0)&~(owlmask(f)>0)
    m[:300]=False
    return m

if __name__=='__main__':
    NAME=sys.argv[1]; F0=int(sys.argv[2]); F1=int(sys.argv[3])
    cp=f'{RD}/corr-{NAME}.json'; corr=json.load(open(cp)) if os.path.exists(cp) else {}
    fcfg={}; frames={}; floors={}
    for f in range(F0,F1+1):
        faces=load(f)
        if faces is None: continue
        vals=fitframe(f,faces)
        rows=[]
        for (fid,q,opt),c in zip(faces,vals):
            if fid not in fcfg: fcfg[fid]={}
            for k,v in opt.items():
                if k not in fcfg[fid]:
                    try: fcfg[fid][k]=float(v)
                    except ValueError: fcfg[fid][k]=v
            d=corr.get(str(f),{}).get(fid,[0,0,0,0])
            c=[round(float(np.clip(a+b,-0.05,1.4)),3) for a,b in zip(c,d)]
            rows.append([fid]+[round(float(x),1) for x in q.reshape(-1)]+c)
        frames[f]=rows
        fc=floorfit(lin(f),floormask(f,faces))
        if fc is not None:
            dd=np.array(corr.get(str(f),{}).get('_floor',[0]*len(fc)))
            floors[f]=[round(float(np.clip(a+b,-0.05,1.3)),3) for a,b in zip(fc,dd)]
    # stroke direction per face id (pass 4): structure tensor of the source over the face, converted to the face's uv,
    # averaged over the take's frames (doubled-angle mean weighted by coherence x pixels); hatch gain from refine
    from strokes import measure
    acc={}; hkp={}
    for f in range(F0,F1+1):
        faces=load(f)
        if faces is None: continue
        M=measure(frame(f),faces,f); qd={fid:q for fid,q,o in faces}
        for fid,m in M.items():
            q=qd[fid]; c=m['cen']; d=m['dir']
            u0,v0=uvof(q,np.array([c[0]]),np.array([c[1]])); u1,v1=uvof(q,np.array([c[0]+6*d[0]]),np.array([c[1]+6*d[1]]))
            a=np.arctan2(v1[0]-v0[0],u1[0]-u0[0]); w=m['coh']*m['n']
            A=acc.setdefault(fid,[0.0,0.0,0.0]); A[0]+=w*np.cos(2*a); A[1]+=w*np.sin(2*a); A[2]+=m['n']
            hkp.setdefault(fid,[]).append(m['mean'])
    hkc=corr.get('_hk',{})
    for fid in fcfg:
        fcfg[fid].setdefault('tex','plain')
        if fid in acc:
            A=acc[fid]; R=np.hypot(A[0],A[1])/max(1,A[2])
            fcfg[fid]['ha']=round(float(0.5*np.arctan2(A[1],A[0])),3) if R>0.12 else 0.0
            mv=float(np.median(hkp[fid])); prior=1-np.clip((mv-0.34)/(0.8-0.34),0,1); prior=prior*prior*(3-2*prior)
            # (lit faces of the source are smooth: their gain stays low whatever the texture energy says)
            cap=2.5 if mv<0.45 else (1.2 if mv<0.6 else 0.5)
            fcfg[fid]['hk']=round(float(np.clip(max(0.15,prior)*hkc.get(fid,1.0),0.05,cap)),3)
    js=f'// s15 roto faces, take {NAME} (pass 4): screen quads measured on the source frames (corners: bl, br, tr, tl, frame px) and\n'
    js+='// their brightness (four corner values), numbers only; drawn by roto.js. frames: { film frame: [[id, x0,y0, ..., x3,y3, v0..v3], ...] } far first\n'
    js+=f'export const ROTO_{NAME} = {{ faces: {json.dumps(fcfg,separators=(",",":"))}, frames: {{\n'
    for f,rows in frames.items(): js+=f'  {f}: {json.dumps(rows,separators=(",",":"))},\n'
    js+='}, floorGrid: { x: '+json.dumps([round(float(v),1) for v in FX])+', y: '+json.dumps([float(v) for v in FY])+' }, floor: {\n'
    for f,vals in floors.items(): js+=f'  {f}: {json.dumps(vals,separators=(",",":"))},\n'
    js+='} };\n'
    open(f'{ROOT}/src/shots/s15/roto{NAME}.js','w').write(js); print('wrote',f'roto{NAME}.js',len(frames),'frames',sum(len(r) for r in frames.values()),'faces')
