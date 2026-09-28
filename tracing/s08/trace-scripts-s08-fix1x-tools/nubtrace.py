import sys; sys.path.insert(0,'/Users/computer/rootline/apprentice-film/snapshots/s08-fix1x-tools'); from cam import *
def trace(S,thr=188):
    x0,y0,x1,y1=1380,470,1460,560; up=4
    big=cv2.resize(S[y0:y1,x0:x1],None,fx=up,fy=up,interpolation=cv2.INTER_CUBIC)
    paper=(big[...,1]>thr).astype(np.uint8)
    n,lab=cv2.connectedComponents(paper); paper=(lab==lab[(y1-y0)*up//2,(x1-x0)*up-2]).astype(np.uint8)
    cs,_=cv2.findContours(paper,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE)
    c=max(cs,key=len)[:,0,:].astype(np.float64)/up+[x0,y0]
    cu=np.array([f02cardu(*p) for p in c]); return cu
def radial(cu,c=(-26.5,327.9),angs=range(90,300,15)):
    out=[]
    for a in angs:
        t=np.deg2rad(a); d=cu-c; ang=np.rad2deg(np.arctan2(d[:,1],d[:,0]))%360
        sel=np.abs(((ang-a+180)%360)-180)<3
        out.append(np.hypot(*d[sel].T).max() if sel.any() else np.nan)
    return np.array(out)
def rim_outer(S,c=(-26.5,327.9),angs=range(150,300,15)):
    Rch=S[...,2].astype(np.float32); out=[]
    s=PC_W/465
    for a in angs:
        t=np.deg2rad(a)
        vals=[]
        for r in np.arange(14,30,0.25):
            u=c[0]+r*np.cos(t); v=c[1]+r*np.sin(t); x,y=card2f0u(u,v)
            vals.append(cv2.getRectSubPix(Rch,(1,1),(x,y))[0,0])
        vals=np.array(vals); rr=np.arange(14,30,0.25)
        i=np.argmin(vals); mn=vals[i]; outside=np.median(vals[-10:]); half=(mn+outside)/2
        j=i
        while j<len(vals)-1 and vals[j]<half: j+=1
        e=rr[j-1]+0.25*(half-vals[j-1])/(vals[j]-vals[j-1])
        # inner edge (paper->dark) half level
        inside=np.median(vals[:6]); half2=(inside+mn)/2; k=i
        while k>0 and vals[k]<half2: k-=1
        e2=rr[k]+0.25*(vals[k]-half2)/(vals[k]-vals[k+1])
        out.append((a,round(e2,2),round(e,2),round(e-e2,2)))
    return out
