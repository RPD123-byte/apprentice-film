import cv2, numpy as np, json
from skimage.morphology import skeletonize
from skimage.measure import label, regionprops
im=cv2.imread('srcf816.png',0).astype(np.float32)
X0,Y0,X1,Y1=0,500,790,946
c=im[Y0:Y1,X0:X1]
bl=cv2.GaussianBlur(c,(0,0),9)
dark=(bl<70)            # inside the dark hair mass
th=cv2.morphologyEx(c,cv2.MORPH_TOPHAT,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(9,9)))
m=(th>45)&(c>70)&dark
m=cv2.morphologyEx(m.astype(np.uint8),cv2.MORPH_CLOSE,np.ones((3,3),np.uint8))>0
sk=skeletonize(m)
lab=label(sk,connectivity=2)
out=[]
for rp in regionprops(lab):
    ys,xs=rp.coords[:,0],rp.coords[:,1]
    if len(xs)<18: continue
    pts=np.stack([xs,ys],1).astype(float)
    mu=pts.mean(0); u,s,vt=np.linalg.svd(pts-mu); d=vt[0]
    t=(pts-mu)@d; o=np.argsort(t); pts=pts[o]; t=t[o]
    # resample to ~5 control points by binning along t
    n=max(3,min(7,int(len(pts)/12)+2)); edges=np.linspace(t[0],t[-1],n)
    cps=[]
    for e in edges:
        k=np.argsort(np.abs(t-e))[:5]; cps.append(pts[k].mean(0))
    cps=np.array(cps)+[X0,Y0]
    # brightness & width
    br=float(np.percentile(c[ys,xs],80)); w=float(m[ys.min():ys.max()+1,xs.min():xs.max()+1].sum()/max(1,len(xs)))
    if cps[0][1]>cps[-1][1]: cps=cps[::-1]
    out.append({'p':[[round(a),round(b)] for a,b in cps],'b':round(br),'w':round(w,1),'n':len(xs)})
out.sort(key=lambda s:-s['n'])
json.dump(out,open('strands.json','w'))
print(len(out))
for s in out[:80]: print(s)
vis=cv2.cvtColor(c.astype(np.uint8)//3,cv2.COLOR_GRAY2BGR)
for s in out:
    q=np.array(s['p'])-[X0,Y0]
    cv2.polylines(vis,[q.astype(np.int32)],False,(0,255,255),1)
cv2.imwrite('strands-vis.jpg',vis)
