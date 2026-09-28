# Trace the ink line art of a SOURCE frame inside a mask polygon into width-varying polylines (vector measurement).
# Usage: lines.py T spec.json out.json [--overlay img]
# spec: {"areas": [{"name":..,"poly":[[x,y]..], "thr":22, "sigma":5, "minlen":8, "maxw":10, "exclude":[[poly],..]}]}
import sys,json,cv2,numpy as np
from skimage.morphology import skeletonize
sys.path.insert(0,'snapshots/s28t-tools/t')
from grade import grab,pre_frame,hexc
def trace_skeleton(sk):
    H,W=sk.shape
    ys,xs=np.nonzero(sk); S=set(zip(ys.tolist(),xs.tolist()))
    nb=[(-1,-1),(-1,0),(-1,1),(0,-1),(0,1),(1,-1),(1,0),(1,1)]
    def nbrs(p): return [(p[0]+a,p[1]+b) for a,b in nb if (p[0]+a,p[1]+b) in S]
    deg={p:len(nbrs(p)) for p in S}
    visited=set(); paths=[]
    def walk(start,nxt):
        path=[start,nxt]; visited.add(frozenset((start,nxt)))
        cur=nxt; prev=start
        while deg[cur]==2:
            cand=[q for q in nbrs(cur) if q!=prev and frozenset((cur,q)) not in visited]
            if not cand: break
            q=cand[0]; visited.add(frozenset((cur,q))); path.append(q); prev,cur=cur,q
        return path
    for p in S:
        if deg[p]!=2:
            for q in nbrs(p):
                if frozenset((p,q)) not in visited: paths.append(walk(p,q))
    # loops
    for p in S:
        if deg[p]==2:
            for q in nbrs(p):
                if frozenset((p,q)) not in visited: paths.append(walk(p,q))
    return paths
def rdp(pts,eps):
    if len(pts)<3: return pts
    c=cv2.approxPolyDP(np.float32(pts).reshape(-1,1,2),eps,False).reshape(-1,2)
    return c.tolist()
def main():
    t=float(sys.argv[1]); spec=json.load(open(sys.argv[2])); outp=sys.argv[3]
    f=grab(t); pre=pre_frame(t)
    Lg=cv2.cvtColor(f,cv2.COLOR_BGR2GRAY).astype(np.float32)
    res={}
    o=f.copy()
    for A in spec['areas']:
        mask=np.zeros(Lg.shape,np.uint8); cv2.fillPoly(mask,[np.int32(A['poly'])],255)
        for ex in A.get('exclude',[]): cv2.fillPoly(mask,[np.int32(ex)],0)
        if 'exclude_black' in A:
            bd=json.load(open(A['exclude_black']))
            bm=np.zeros_like(mask)
            for b in bd['black']:
                if not b['hole']: cv2.fillPoly(bm,[np.int32(b['pts'])],255)
            for b in bd['black']:
                if b['hole']: cv2.fillPoly(bm,[np.int32(b['pts'])],0)
            bm=cv2.dilate(bm,np.ones((5,5),np.uint8)); mask[bm>0]=0
        sig=A.get('sigma',5); thr=A.get('thr',22)
        Ls=cv2.GaussianBlur(Lg,(0,0),0.8)
        bg=cv2.dilate(Ls,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(2*sig+1,)*2))  # local max = paper
        bg=cv2.GaussianBlur(bg,(0,0),sig/2)
        D=bg-Ls
        m=((D>thr)&(mask>0)).astype(np.uint8)
        m=cv2.morphologyEx(m,cv2.MORPH_OPEN,np.ones((2,2),np.uint8))
        dist=cv2.distanceTransform(m,cv2.DIST_L2,3)
        sk=skeletonize(m>0)
        paths=trace_skeleton(sk)
        out=[]
        for p in paths:
            if len(p)<A.get('minlen',8): continue
            pts=[(x,y) for y,x in p]
            ws=[2*dist[y,x] for y,x in p]
            dk=np.mean([Ls[y,x] for y,x in p])
            if np.median(ws)>A.get('maxw',12): continue
            simp=rdp(pts,A.get('eps',0.8))
            # width at simplified points: nearest original
            P=np.array(pts,float); W=[]
            for q in simp:
                i=np.argmin(((P-np.array(q))**2).sum(1)); W.append(round(float(max(1.0,ws[i])),1))
            col=np.median([pre[y,x] for y,x in p],0)
            out.append({'p':[[int(a),int(b)] for a,b in simp],'w':W,'c':hexc(col)})
            cv2.polylines(o,[np.int32(simp).reshape(-1,1,2)],False,(255,0,255),1)
        res[A['name']]=out
        print(A['name'],len(out),'strokes',sum(len(s['p']) for s in out),'pts',file=sys.stderr)
    json.dump(res,open(outp,'w'))
    if '--overlay' in sys.argv: cv2.imwrite(sys.argv[sys.argv.index('--overlay')+1],o)
main()
