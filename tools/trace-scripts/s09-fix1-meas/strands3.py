import cv2, numpy as np, json
from skimage.morphology import skeletonize
from skimage.measure import label, regionprops
im=cv2.imread('srcf816.png',0).astype(np.float32)
X0,Y0,X1,Y1=0,540,790,946
c=im[Y0:Y1,X0:X1]
bl=cv2.GaussianBlur(c,(0,0),9)
dark=(bl<80)
th=cv2.morphologyEx(c,cv2.MORPH_TOPHAT,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(9,9)))
m=(th>18)&(c>48)&dark
m=cv2.morphologyEx(m.astype(np.uint8),cv2.MORPH_CLOSE,np.ones((3,3),np.uint8))>0
sk=skeletonize(m); lab=label(sk,connectivity=2); out=[]
for rp in regionprops(lab):
    ys,xs=rp.coords[:,0],rp.coords[:,1]
    if len(xs)<16: continue
    pts=np.stack([xs,ys],1).astype(float); mu=pts.mean(0); u,s,vt=np.linalg.svd(pts-mu); d=vt[0]; n=np.array([-d[1],d[0]])
    t=(pts-mu)@d; e=(pts-mu)@n
    deg=2 if len(xs)>30 else 1
    cf=np.polyfit(t,e,deg)
    ts=np.linspace(t.min(),t.max(),5); es=np.polyval(cf,ts)
    cps=mu+np.outer(ts,d)+np.outer(es,n)+[X0,Y0]
    br=float(np.percentile(c[ys,xs],85)); w=float(m[ys.min():ys.max()+1,xs.min():xs.max()+1].sum()/max(1,len(xs)))
    if cps[0][1]>cps[-1][1] or (abs(cps[0][1]-cps[-1][1])<8 and cps[0][0]>cps[-1][0]): cps=cps[::-1]
    out.append({'p':[[int(round(a)),int(round(b))] for a,b in cps],'b':int(round(br)),'w':round(w,1),'n':int(len(xs))})
def keep(s):
    xs=[p[0] for p in s['p']]; ys=[p[1] for p in s['p']]; mx,my=np.mean(xs),np.mean(ys)
    if my<566 and mx<470: return False
    if mx>690 and my>690: return False
    if my>700 and (mx-560)*(-226)-(my-946)*(210) < -2000: return False
    return True
A=[s for s in out if keep(s)]; A.sort(key=lambda s:-s['n'])
js='// Hair strand guides for s09, measured on the source (32.64 s): skeleton traces of the visible highlight strands\n// under the beanie, smoothed (quadratic fit), as [brightness 0-255, traced width px, control points in frame px].\n// Positions only, no pixels.\nexport const STRANDS = [\n'+',\n'.join('  ['+str(s['b'])+', '+str(s['w'])+', '+json.dumps(s['p']).replace(' ','')+']' for s in A)+'\n];\n'
open('/Users/computer/rootline/apprentice-film/src/shots/s09/strands.js','w').write(js)
print(len(A))
