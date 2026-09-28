import sys, json, numpy as np
sys.path.insert(0,'/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad')
from band import measure, rle
def parse(s,L,side):
    # side=+1: cream on + side. Walk from centre outward.
    runs=[r for r in rle(s,L)]
    # merge tiny runs
    def find(direction):
        # returns list of (cls,start,end) moving outward from 0 in direction
        seq=[r for r in runs if (r[1]+r[2])/2*direction>-15]
        seq=sorted(seq,key=lambda r:(r[1]+r[2])/2*direction)
        return seq
    res={}
    # cream side
    cs=find(side); e1=None; d1=None; cstart=None
    for i,(c,a,b) in enumerate(cs):
        if c=='C' and (b-a)>=8: cstart=(a,b)
        if cstart and c=='M':
            e1=(b if side>0 else a); d1=b-a; break
        if c in '_': break
    ms=find(-side); e2=None; d2=None
    for c,a,b in ms:
        if c=='M' and (b-a)>=3:
            e2=(a if side>0 else b); d2=b-a; break
        if c=='_': break
    return e1,d1,e2,d2
if __name__=='__main__':
    pts=np.array(json.loads(sys.argv[1]),float); L=int(sys.argv[2]); side=int(sys.argv[3]); iters=int(sys.argv[4]) if len(sys.argv)>4 else 3
    for it in range(iters):
        M=measure(pts,L); new=[]; rows=[]
        for (p,n,s) in M:
            e1,d1,e2,d2=parse(s,L,side)
            if e1 is None or e2 is None: new.append(p); rows.append((p,n,None)); continue
            P1=p+n*e1; P2=p+n*e2
            new.append((P1+P2)/2); rows.append((p,n,(P1,P2,d1,d2)))
        pts=np.array(new)
    for p,n,r in rows:
        if r is None: print('(%d,%d) ---'%tuple(p)); continue
        P1,P2,d1,d2=r
        print('c(%6.1f,%6.1f) E1(%6.1f,%6.1f) E2(%6.1f,%6.1f) w%5.1f d1 %2d d2 %2d'%(p[0],p[1],P1[0],P1[1],P2[0],P2[1],np.linalg.norm(P1-P2),d1,d2))
