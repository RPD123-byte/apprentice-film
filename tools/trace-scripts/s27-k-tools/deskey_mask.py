# deskey_mask.py T out.png [poly.json] : the SOURCE designer's silhouette at T (measurement only): sil125 warped through
# the tracked mesh (or a hand polygon), refined by GrabCut (uncertain band +-45 px). Output: magenta = designer (the
# region to trace), black elsewhere; plus an overlay jpg.
import cv2, numpy as np, json, sys
from scipy.interpolate import griddata
sys.path.insert(0,'/Users/computer/rootline/apprentice-film/snapshots/s27-meas')
from common import load
T=float(sys.argv[1]); OUT=sys.argv[2]; poly=sys.argv[3] if len(sys.argv)>3 else None
D='/Users/computer/rootline/apprentice-film/snapshots/s27-k-trace/'
f0=load(T); H,W=f0.shape[:2]
if poly:
    q=np.array(json.load(open(poly)),float)
else:
    fr={}
    for fn in ['des_back.json','des_fwd.json']: d=json.load(open(D+fn)); G=np.array(d['grid'],float); fr.update(d['frames'])
    P=np.array(fr[str(T)],float)
    sil=np.array(json.load(open('/Users/computer/rootline/apprentice-film/snapshots/s27-meas/sil125.json')),float)
    pts=[]
    for i in range(len(sil)):
        a,b=sil[i],sil[(i+1)%len(sil)]; n=max(1,int(np.hypot(*(b-a))/8))
        for k in range(n): pts.append(a+(b-a)*k/n)
    pts=np.array(pts); q=griddata(G,P,pts,method='linear'); qn=griddata(G,P,pts,method='nearest'); q=np.where(np.isnan(q),qn,q)
s=np.zeros((H,W),np.uint8); cv2.fillPoly(s,[np.int32(np.round(q))],1)
E=lambda r: cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(2*r+1,2*r+1))
B=int(sys.argv[4]) if len(sys.argv)>4 else 45
g=np.full((H,W),cv2.GC_BGD,np.uint8); g[cv2.dilate(s,E(B))>0]=cv2.GC_PR_BGD; g[s>0]=cv2.GC_PR_FGD; g[cv2.erode(s,E(B))>0]=cv2.GC_FGD
# other objects' interiors (from our layer mask, eroded) are background for the designer
try:
    lm=cv2.imread(f'/Users/computer/rootline/apprentice-film/snapshots/s27-k-mask/l-{T:.2f}.png')
except Exception: lm=None
f=cv2.bilateralFilter(f0,7,30,5)
bg=np.zeros((1,65)); fg=np.zeros((1,65))
cv2.grabCut(f,g,None,bg,fg,6,cv2.GC_INIT_WITH_MASK)
m=((g==cv2.GC_FGD)|(g==cv2.GC_PR_FGD)).astype(np.uint8)
m=cv2.morphologyEx(m,cv2.MORPH_CLOSE,E(4)); m=cv2.morphologyEx(m,cv2.MORPH_OPEN,E(3))
n,cc,st,_=cv2.connectedComponentsWithStats(m); k=1+np.argmax(st[1:,4]); m=(cc==k).astype(np.uint8)
cnts,_=cv2.findContours(m,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE); m2=np.zeros_like(m); cv2.drawContours(m2,cnts,-1,1,-1)
o=np.zeros((H,W,3),np.uint8); o[m2>0]=(255,0,255); cv2.imwrite(OUT,o)
ov=f0.copy(); ov[m2==0]=(ov[m2==0]*0.35).astype(np.uint8); cv2.imwrite(OUT.replace('.png','_ov.jpg'),cv2.resize(ov,None,fx=0.4,fy=0.4))
