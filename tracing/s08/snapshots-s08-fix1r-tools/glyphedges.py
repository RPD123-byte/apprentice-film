# horizontal and vertical edge offsets (render - source) of bright glyphs on dark, by edge polarity, in F0 (frames avg)
import cv2,numpy as np,sys
sys.path.insert(0,'snapshots/s08-fix1r-tools')
from cam import f0
rd=sys.argv[1]; ks=range(764,772)
S=sum(f0(cv2.imread(f'snapshots/s08-p4-src/f{k}.png').astype(np.float32),k) for k in ks)/len(ks)
R=sum(f0(cv2.imread(f'{rd}/r{k}.png').astype(np.float32),k) for k in ks)/len(ks)
L=lambda I: I[...,2]*0.299+I[...,1]*0.587+I[...,0]*0.114
Ls,Lr=L(S),L(R)
BOX=eval(sys.argv[2]) if len(sys.argv)>2 else {'line1':(12,330,760,422),'rch':(12,330,125,422),'30-April':(135,330,560,422),'2023':(560,330,760,422),'Linden Hollow':(110,428,420,484),'GA':(420,428,520,484)}
def crossings(v,lev):
    out=[]
    for i in range(len(v)-1):
        a,b=v[i],v[i+1]
        if (a<lev)!=(b<lev): out.append((i+(lev-a)/(b-a), b>a))
    return out
def edges(Lm,x0,y0,x1,y1,axis):
    res=[]
    if axis==0:
        for y in range(y0,y1):
            row=Lm[y,x0:x1]
            for x,up in crossings(row,95): res.append((y,x0+x,up))
    else:
        for x in range(x0,x1):
            col=Lm[y0:y1,x]
            for y,up in crossings(col,95): res.append((x,y0+y,up))
    return res
for name,(x0,y0,x1,y1) in BOX.items():
    out=[]
    for axis in (0,1):
        es=edges(Ls,x0,y0,x1,y1,axis); er=edges(Lr,x0,y0,x1,y1,axis)
        from collections import defaultdict
        dr=defaultdict(list)
        for a,p,up in er: dr[(a,up)].append(p)
        d={True:[],False:[]}
        for a,p,up in es:
            c=dr.get((a,up),[])
            if not c: continue
            q=min(c,key=lambda v:abs(v-p))
            if abs(q-p)<2.5: d[up].append(q-p)
        lab=('x','y')[axis]
        out.append(f"{lab}: lead(dark->bright) {np.mean(d[True]):+.2f} (n{len(d[True])}) trail {np.mean(d[False]):+.2f} (n{len(d[False])})")
    print(f'{name:9s}',' | '.join(out))
