import sys, json, numpy as np, cv2
SP='/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad'
f=cv2.imread('/Users/computer/rootline/apprentice-film/snapshots/s40-fix1-ref/src-138.0.png').astype(np.float32)[...,::-1]/255
b=cv2.GaussianBlur(f,(0,0),1.0)
bg=np.load(SP+'/bgpost.npy')
L=b.mean(-1); Lbg=bg.mean(-1)
mx=b.max(-1); mn=b.min(-1); sat=(mx-mn)/np.maximum(mx,1e-3)
def cls(x,y):
    if not (0<=x<2205 and 0<=y<945): return '_'
    xi,yi=int(round(x)),int(round(y))
    r=L[yi,xi]/Lbg[yi,xi]
    R0,G0,B0=b[yi,xi]
    if r<0.66 or (r<0.88 and B0>0.6*G0 and B0>0.1): return 'M'
    if sat[yi,xi]<0.33 and r>0.95: return 'C'
    R_,G_,B_=b[yi,xi]
    if G_<0.28 and R_>0.55: return 'R'
    if sat[yi,xi]<0.75 and B_>0.18: return 'P'
    return 'o'
def profile(p,n,Lh):
    return ''.join(cls(*(p+n*t)) for t in range(-Lh,Lh+1))
def runs(s,Lh):
    o=[];j=0
    while j<len(s):
        k=j
        while k<len(s) and s[k]==s[j]: k+=1
        o.append([s[j],j-Lh,k-Lh]); j=k
    return o
def edges(s,Lh,side):
    rs=runs(s,Lh)
    # cream run closest to 0 with len>=6
    cands=[r for r in rs if r[0]=='C' and r[2]-r[1]>=6]
    if not cands: return None
    c=min(cands,key=lambda r:min(abs(r[1]),abs(r[2])))
    i=rs.index(c)
    def walk(i,step):
        j=i+step; seen_dark=None
        while 0<=j<len(rs):
            k,a,bb=rs[j]
            if k=='_': return None
            if k=='M' and bb-a>=2: seen_dark=rs[j]
            elif seen_dark and (bb-a)>=3: return seen_dark
            j+=step
        return seen_dark
    d1=walk(i,+1 if side>0 else -1); d2=walk(i,-1 if side>0 else +1)
    if d1 is None or d2 is None: return None
    e1=d1[2] if side>0 else d1[1]; e2=d2[1] if side>0 else d2[2]
    return e1,d1[2]-d1[1],e2,d2[2]-d2[1],rs
if __name__=='__main__':
    pts=np.array(json.loads(sys.argv[1]),float); Lh=int(sys.argv[2]); side=int(sys.argv[3]); iters=int(sys.argv[4])
    verbose=len(sys.argv)>5
    for it in range(iters):
        out=[]
        for i in range(len(pts)):
            a=pts[max(0,i-1)]; c=pts[min(len(pts)-1,i+1)]
            d=c-a; d/=np.linalg.norm(d); n=np.array([-d[1],d[0]])
            s=profile(pts[i],n,Lh); r=edges(s,Lh,side)
            out.append((pts[i],n,r,s))
        pts=np.array([ (p+n*(r[0]+r[2])/2) if r else p for p,n,r,s in out])
    for p,n,r,s in out:
        if not r: print('(%d,%d) ---'%tuple(p), ' '.join('%s[%d,%d]'%tuple(x) for x in runs(s,Lh) if x[2]-x[1]>=3) if verbose else ''); continue
        e1,d1,e2,d2,rs=r
        P1=p+n*e1; P2=p+n*e2
        inner=[x for x in rs if min(e1,e2)<=x[1] and x[2]<=max(e1,e2)]
        print('E1(%5.0f,%4.0f) E2(%5.0f,%4.0f) w%4.0f d1 %2d d2 %2d |'%(P1[0],P1[1],P2[0],P2[1],abs(e1-e2),d1,d2),' '.join('%s%d'%(x[0],x[2]-x[1]) for x in (inner if side<0 else inner[::-1]) if x[2]-x[1]>=2))
