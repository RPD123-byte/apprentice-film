import cv2, numpy as np, json
from skimage.morphology import skeletonize
from skimage.measure import label, regionprops
im=cv2.imread('srcf816.png',0).astype(np.float32)
X0,Y0,X1,Y1=0,540,790,946
c=im[Y0:Y1,X0:X1]
bl=cv2.GaussianBlur(c,(0,0),9)
dark=(bl<80)
th=cv2.morphologyEx(c,cv2.MORPH_TOPHAT,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(9,9)))
def trace(thr,minv,minlen):
    m=(th>thr)&(c>minv)&dark
    m=cv2.morphologyEx(m.astype(np.uint8),cv2.MORPH_CLOSE,np.ones((3,3),np.uint8))>0
    sk=skeletonize(m); lab=label(sk,connectivity=2); out=[]
    for rp in regionprops(lab):
        ys,xs=rp.coords[:,0],rp.coords[:,1]
        if len(xs)<minlen: continue
        pts=np.stack([xs,ys],1).astype(float); mu=pts.mean(0); u,s,vt=np.linalg.svd(pts-mu); d=vt[0]
        t=(pts-mu)@d; o=np.argsort(t); pts=pts[o]; t=t[o]
        n=max(3,min(6,int(len(pts)/14)+2)); edges=np.linspace(t[0],t[-1],n); cps=[]
        for e in edges:
            k=np.argsort(np.abs(t-e))[:4]; cps.append(pts[k].mean(0))
        cps=np.array(cps)+[X0,Y0]
        br=float(np.percentile(c[ys,xs],85)); w=float(m[ys.min():ys.max()+1,xs.min():xs.max()+1].sum()/max(1,len(xs)))
        if cps[0][1]>cps[-1][1] or (abs(cps[0][1]-cps[-1][1])<8 and cps[0][0]>cps[-1][0]): cps=cps[::-1]
        out.append({'p':[[int(round(a)),int(round(b))] for a,b in cps],'b':int(round(br)),'w':round(w,1),'n':int(len(xs))})
    return out
A=trace(18,48,16)
# drop cuff-edge artifacts and slab/owl stuff
def keep(s):
    xs=[p[0] for p in s['p']]; ys=[p[1] for p in s['p']]; mx,my=np.mean(xs),np.mean(ys)
    if my<566 and mx<470: return False
    if mx>690 and my>690: return False
    # slab region: right of line (560,946)-(770,720)
    if my>700 and (mx-560)*(-226)-(my-946)*(210) < -2000: return False
    return True
A=[s for s in A if keep(s)]
A.sort(key=lambda s:-s['n'])
print(len(A))
js='export const STRANDS = [\n'+',\n'.join('  ['+str(s['b'])+', '+str(s['w'])+', '+json.dumps(s['p']).replace(' ','')+']' for s in A)+'\n];\n'
open('strands.js','w').write(js)
vis=cv2.cvtColor((c//3).astype(np.uint8),cv2.COLOR_GRAY2BGR)
for s in A:
    q=np.array(s['p'])-[X0,Y0]; cv2.polylines(vis,[q.astype(np.int32)],False,(0,255,255) if s['b']>120 else (0,140,255),1)
cv2.imwrite('strands-vis2.jpg',vis)
