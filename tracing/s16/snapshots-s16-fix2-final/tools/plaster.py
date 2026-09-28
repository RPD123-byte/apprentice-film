# find the bandage (plaster) on the flying owl's head: pale (0.55-0.9) blob inside the silhouette, within 30 px of
# the dark headphone shape's inner edge
import json, cv2, numpy as np, h16, sys
D=json.load(open('../../s16-fix2-w/owl.json'))
res={}
for k in sorted(D,key=int):
    n=int(k); d=D[k]
    if n>1163 or not d.get('HP'): continue
    P=h16.pre(n); Y=cv2.GaussianBlur(P,(0,0),1.2)
    sm=np.zeros(P.shape,np.uint8)
    for r in d['sil']: cv2.fillPoly(sm,[np.array(r,np.float32).reshape(-1,2).round().astype(np.int32)],1)
    hp=np.zeros(P.shape,np.uint8)
    for r in d['HP']['rings']: cv2.fillPoly(hp,[np.array(r,np.float32).reshape(-1,2).round().astype(np.int32)],1)
    for c in d['HP']['cups']: cv2.ellipse(hp,(int(c[0]),int(c[1])),(int(c[2])+4,int(c[3])+4),c[4],0,360,1,-1)
    near=cv2.dilate(hp,np.ones((41,41),np.uint8))&(1-hp)&sm
    for c in d['HP']['cups']: cv2.ellipse(near,(int(c[0]),int(c[1])),(int(c[2])+14,int(c[3])+14),c[4],0,360,0,-1)
    cand=((Y>0.5)&(Y<0.89)&(near>0)).astype(np.uint8)
    cand=cv2.morphologyEx(cand,cv2.MORPH_OPEN,np.ones((3,3),np.uint8))
    nl,lab,st,cen=cv2.connectedComponentsWithStats(cand)
    best=None
    for i in range(1,nl):
        a=st[i,4]
        if a<60: continue
        ys,xs=np.nonzero(lab==i); pts=np.stack([xs,ys],1).astype(np.float32)
        (cx,cy),(w,h),ang=cv2.minAreaRect(pts)
        L,Wd=max(w,h),min(w,h)
        sc=a*(1 if 25<L<80 and 6<Wd<26 else 0.2)
        if best is None or sc>best[0]: best=(sc,round(cx,1),round(cy,1),round(L,1),round(Wd,1),round(ang if w>=h else ang+90,1),a)
    res[n]=best; print(n,best)
json.dump(res,open('../../s16-fix2-w/plaster_auto.json','w'))
