# keymask.py T layer_mask.png out.png : object mask for tracing the room at T = our layer mask (all objects as drawn)
# united with the SOURCE designer's silhouette at T (sil125 warped through the tracked mesh), dilated 10 px.
import cv2, numpy as np, json, sys, glob
from scipy.interpolate import griddata
T=float(sys.argv[1]); LM=sys.argv[2]; OUT=sys.argv[3]
D='/Users/computer/rootline/apprentice-film/snapshots/s27-k-trace/'
fr={}
for f in ['des_back.json','des_fwd.json']:
    try: d=json.load(open(D+f)); G=np.array(d['grid'],float); fr.update(d['frames'])
    except Exception: pass
m=cv2.imread(LM); obj=~((m[...,2]>240)&(m[...,1]<20)&(m[...,0]>240)); obj=obj.astype(np.uint8)
if str(T) in fr and T >= 121.6:
    P=np.array(fr[str(T)],float)
    sil=np.array(json.load(open('/Users/computer/rootline/apprentice-film/snapshots/s27-meas/sil125.json')),float)
    # densify the silhouette polygon, map through the mesh (linear inside, nearest outside)
    pts=[]
    for i in range(len(sil)):
        a,b=sil[i],sil[(i+1)%len(sil)]; n=max(1,int(np.hypot(*(b-a))/8))
        for k in range(n): pts.append(a+(b-a)*k/n)
    pts=np.array(pts)
    q=griddata(G,P,pts,method='linear'); qn=griddata(G,P,pts,method='nearest')
    q=np.where(np.isnan(q),qn,q)
    s=np.zeros_like(obj); cv2.fillPoly(s,[np.int32(np.round(q))],1)
    s=cv2.dilate(s,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(21,21)))
    obj|=s
    print(T,'designer silhouette added')
if '--gc' in sys.argv:
    # let GrabCut grow the mask onto the source objects where ours are offset (within 40 px), never shrink it
    sys.path.insert(0,'/Users/computer/rootline/apprentice-film/snapshots/s27-meas')
    from common import load
    f=cv2.bilateralFilter(load(T),7,30,5)
    E=lambda r: cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(2*r+1,2*r+1))
    g=np.full(obj.shape,cv2.GC_BGD,np.uint8)
    g[cv2.dilate(obj,E(int(__import__("os").environ.get("GCR","40"))))>0]=cv2.GC_PR_BGD; g[obj>0]=cv2.GC_PR_FGD; g[cv2.erode(obj,E(12))>0]=cv2.GC_FGD
    bg=np.zeros((1,65)); fg=np.zeros((1,65))
    cv2.grabCut(f,g,None,bg,fg,5,cv2.GC_INIT_WITH_MASK)
    add=((g==cv2.GC_FGD)|(g==cv2.GC_PR_FGD)).astype(np.uint8)
    obj|=cv2.dilate(add,E(4))
    print(T,'grabcut added',int(add.sum()-0))
o=np.full(m.shape,(255,0,255),np.uint8); o[obj>0]=0; cv2.imwrite(OUT,o)
ov=load(T).copy() if '--gc' in sys.argv else None
if ov is not None:
    ov[obj>0]=(ov[obj>0]*0.5+np.array([0,0,255])*0.5).astype(np.uint8); cv2.imwrite(OUT.replace('.png','_ov.jpg'),cv2.resize(ov,None,fx=0.4,fy=0.4))
