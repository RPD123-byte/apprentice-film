# owl_vec.py out.json T... : trace the SOURCE owl at each T inside its silhouette (snapshots/s27-k-owl/om-T.png):
# frame un-graded, cropped, denoised; colour regions (k-means, posterized polygons with region-mean colours) + ink
# polygons with measured tones + the outline. Coordinates frame px x2 (ints). Measurement -> vector data only.
import cv2, numpy as np, json, sys, os
sys.path.insert(0,'/Users/computer/rootline/apprentice-film/snapshots/s27-meas')
sys.path.insert(0,'/Users/computer/rootline/apprentice-film/snapshots/f2k-tools')
from common import load
from ungrade import ungrade
D='/Users/computer/rootline/apprentice-film/snapshots/s27-k-owl/'
OUT=sys.argv[1]; K=int(os.environ.get('K','18'))
S=3
def contours_of(mk, eps, minarea, smooth, off):
    M=cv2.resize(mk.astype(np.float32),None,fx=S,fy=S,interpolation=cv2.INTER_LINEAR)
    if smooth: M=cv2.GaussianBlur(M,(0,0),smooth*S)
    B=(M>0.5).astype(np.uint8)
    cnts,hier=cv2.findContours(B,cv2.RETR_CCOMP,cv2.CHAIN_APPROX_NONE)
    out=[]
    if hier is None: return out
    for i,c in enumerate(cnts):
        if hier[0][i][3]>=0 or cv2.contourArea(c)<minarea*S*S: continue
        o=cv2.approxPolyDP(c,eps*S,True).reshape(-1,2)/S+off
        holes=[]; j=hier[0][i][2]
        while j>=0:
            if cv2.contourArea(cnts[j])>=minarea*S*S*0.5: holes.append(cv2.approxPolyDP(cnts[j],eps*S,True).reshape(-1,2)/S+off)
            j=hier[0][j][0]
        out.append((o,holes))
    return out
fl=lambda p: [int(round(v*2)) for xy in p for v in xy]
res=[]
for a in sys.argv[2:]:
    t=float(a); m=cv2.imread(f'{D}om-{t:.2f}.png')[...,0]>128
    ys,xs=np.nonzero(m); x0,x1,y0,y1=max(0,xs.min()-6),min(2206,xs.max()+7),max(0,ys.min()-6),min(946,ys.max()+7)
    f=load(t); U=ungrade(f,t); u8=np.clip(U*255+0.5,0,255).astype(np.uint8)[y0:y1,x0:x1]
    mk=m[y0:y1,x0:x1].astype(np.uint8); off=np.array([x0,y0],float)
    g=cv2.cvtColor(f[y0:y1,x0:x1],cv2.COLOR_BGR2GRAY)
    gd=cv2.fastNlMeansDenoising(g,None,7,5,13)
    bh=cv2.morphologyEx(gd,cv2.MORPH_BLACKHAT,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(7,7))).astype(np.float32)
    ink=((bh>22)&(gd<150)|(gd<60)).astype(np.uint8)*cv2.erode(mk,np.ones((3,3),np.uint8))
    n_,cc,st,_=cv2.connectedComponentsWithStats(ink,connectivity=8)
    small=np.nonzero(st[1:,4]<5)[0]+1
    if len(small): ink[np.isin(cc,small)]=0
    den=cv2.fastNlMeansDenoisingColored(u8,None,6,6,5,13)
    clean=cv2.inpaint(den,cv2.dilate(ink,np.ones((3,3),np.uint8))*255,4,cv2.INPAINT_TELEA)
    clean=cv2.bilateralFilter(clean,7,20,5)
    lab=cv2.cvtColor(clean,cv2.COLOR_BGR2LAB).astype(np.float32)
    yy,xx=np.nonzero(mk); cv2.setRNGSeed(3)
    k=min(K,max(4,len(xx)//400))
    _,lb,cen=cv2.kmeans(lab[yy,xx],k,None,(cv2.TERM_CRITERIA_EPS+cv2.TERM_CRITERIA_MAX_ITER,40,0.3),3,cv2.KMEANS_PP_CENTERS)
    Lb=np.full(mk.shape,-1,np.int32); Lb[yy,xx]=lb.ravel()
    for it in range(2):
        votes=np.stack([cv2.boxFilter((Lb==j).astype(np.float32),-1,(3,3)) for j in range(k)])
        Lb=np.where(mk>0,np.argmax(votes,0),-1)
    regs=[]
    cf=clean.astype(np.float32)
    for j in range(k):
        for o,h in contours_of(Lb==j,0.6,4,0.7,off):
            M=np.zeros(mk.shape,np.uint8); cv2.fillPoly(M,[np.int32(np.round(o-off))],1)
            for hh in h: cv2.fillPoly(M,[np.int32(np.round(hh-off))],0)
            M&=(Lb==j).astype(np.uint8); q=np.nonzero(M)
            if len(q[0])==0: continue
            col=cf[q].mean(0)[::-1]; regs.append((len(q[0]),'#%02x%02x%02x'%tuple(int(v) for v in col),o,h))
    regs.sort(key=lambda r:-r[0])
    inks={}
    Uf=U[y0:y1,x0:x1]*255
    for o,h in contours_of(ink,0.35,1.0,0.4,off):
        M=np.zeros(mk.shape,np.uint8); cv2.fillPoly(M,[np.int32(np.round(o-off))],1); q=np.nonzero(M&ink)
        if len(q[0])==0: continue
        v=Uf[q]; lum=v.sum(1); sel=v[lum<=np.percentile(lum,40)]; c=sel.mean(0)[::-1]
        # quantize the tone a little so polygons group
        c=(np.round(c/12)*12).clip(0,255); key='#%02x%02x%02x'%tuple(int(x) for x in c)
        inks.setdefault(key,[]).append([fl(o)]+[fl(x) for x in h])
    cnts,_=cv2.findContours(mk,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE); c=max(cnts,key=cv2.contourArea)
    outl=fl(cv2.approxPolyDP(c,0.8,True).reshape(-1,2)+off)
    res.append([t,[[r[1],fl(r[2])]+[fl(x) for x in r[3]] for r in regs],[[c]+p for c,p in inks.items()],outl])
    print(t,'regions',len(regs),'ink tones',len(inks),flush=True)
json.dump(res,open(OUT,'w'),separators=(',',':'))
print('bytes',os.path.getsize(OUT))
