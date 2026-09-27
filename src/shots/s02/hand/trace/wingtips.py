# measure the flying owl's silhouette extremes per frame in KIT owl units (root/scale/bank from the verified track)
import cv2, numpy as np, re, json
from common import ungrade, src
txt=open('../s02-r3-orig/s02.js.orig').read()
rows=re.findall(r'\[(1[6-9]\.\d\d), ([\d.]+), ([\d.]+), ([\d.]+), (-?[\d.]+)\]', txt)
ROOT={int(round(float(r[0])*25)):[float(v) for v in r[1:]] for r in rows}
K=0.9133; DYU=79.2
res={}
for f in range(397,478):
    x,y,s,b=ROOT[f] if f in ROOT else ROOT[400]
    ks=s/K; kx=x-np.sin(b)*DYU*s; ky=y+np.cos(b)*DYU*s
    im=ungrade(src(f).astype(np.float32),f/25)
    B=cv2.GaussianBlur(im,(0,0),1.5)
    m=(B>212).astype(np.uint8)
    n,lab,st,cen=cv2.connectedComponentsWithStats(m,8)
    # keep components near the owl (within 700*ks of root)
    keep=np.zeros_like(m)
    for i in range(1,n):
        if st[i,4]<40: continue
        cx,cy=cen[i]
        if abs(cx-kx)<560*ks and -420*ks<cy-ky<200*ks: keep[lab==i]=1
    ys,xs=np.nonzero(keep)
    if len(xs)==0: continue
    # to kit units
    dx=(xs-kx)/ks; dy=(ys-ky)/ks; c,sn=np.cos(-b),np.sin(-b)
    ux=dx*c-dy*sn; uy=dx*sn+dy*c
    out={}
    for side,sel in [('L',ux<-150),('R',ux>150)]:
        if sel.sum()<20: out[side]=None; continue
        px,py=ux[sel],uy[sel]
        S=np.array([-115 if side=='L' else 120,-80.0])
        d=np.hypot(px-S[0],py-S[1]); i=np.argmax(d)
        # also angle of the tip from the shoulder
        out[side]=[round(float(px[i]),1),round(float(py[i]),1),round(float(np.percentile(py,5)),1),round(float(np.percentile(py,95)),1)]
    res[f]=dict(root=[round(kx,1),round(ky,1),round(ks,4),round(b,4)],**out)
    print(f, res[f])
json.dump(res,open('wingtips.json','w'))
