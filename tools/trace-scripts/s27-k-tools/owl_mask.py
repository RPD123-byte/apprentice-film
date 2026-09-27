# owl_mask.py T... : the SOURCE owl's silhouette at each T by GrabCut, initialised from our owl layer's mask at T
# (snapshots/s27-k-owl/l-T.png) with a generous uncertain band. Writes snapshots/s27-k-owl/om-T.png (magenta = owl) and a
# contact sheet of the crops for review. Measurement only.
import cv2, numpy as np, sys, os
sys.path.insert(0,'/Users/computer/rootline/apprentice-film/snapshots/s27-meas')
from common import load
D='/Users/computer/rootline/apprentice-film/snapshots/s27-k-owl/'
E=lambda r: cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(2*r+1,2*r+1))
tiles=[]
band=int(os.environ.get('BAND','45'))
for a in sys.argv[1:]:
    t=float(a); O=cv2.imread(f'{D}l-{t:.2f}.png'); O=(O.max(2)>60).astype(np.uint8)
    f0=load(t); H,W=O.shape
    if O.sum()<50: continue
    g=np.full((H,W),cv2.GC_BGD,np.uint8)
    g[cv2.dilate(O,E(band))>0]=cv2.GC_PR_BGD; g[O>0]=cv2.GC_PR_FGD; g[cv2.erode(O,E(18))>0]=cv2.GC_FGD
    f=cv2.bilateralFilter(f0,5,25,4); bg=np.zeros((1,65)); fg=np.zeros((1,65))
    cv2.grabCut(f,g,None,bg,fg,6,cv2.GC_INIT_WITH_MASK)
    m=((g==cv2.GC_FGD)|(g==cv2.GC_PR_FGD)).astype(np.uint8)
    m=cv2.morphologyEx(m,cv2.MORPH_OPEN,E(2)); m=cv2.morphologyEx(m,cv2.MORPH_CLOSE,E(3))
    n,cc,st,_=cv2.connectedComponentsWithStats(m)
    if n>1: k=1+np.argmax(st[1:,4]); m=(cc==k).astype(np.uint8)
    # cut away light background that GrabCut took: flood the mask's non-line pixels from where it borders light
    # background; the owl's closed dark outline protects its inside
    cf,_=cv2.findContours(m,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE); mf=np.zeros_like(m); cv2.drawContours(mf,cf,-1,1,-1); m=mf
    gr=cv2.cvtColor(f0,cv2.COLOR_BGR2GRAY)
    Lm=cv2.dilate((gr<int(os.environ.get('LINE','105'))).astype(np.uint8),E(1))
    inner=(m>0)&(Lm==0)
    outside_light=((m==0)&(gr>150)).astype(np.uint8)
    seeds=inner&(cv2.dilate(outside_light,E(2))>0)
    nn,cc2=cv2.connectedComponents(inner.astype(np.uint8),connectivity=4)
    bad=np.unique(cc2[seeds]); bad=bad[bad>0]
    rem=np.isin(cc2,bad)
    if os.environ.get("FLOOD") and rem.sum()<float(os.environ.get("REMMAX","0.7"))*m.sum():
        m=(m>0)&~rem; m=cv2.morphologyEx(m.astype(np.uint8),cv2.MORPH_OPEN,E(2))
        n,cc,st,_=cv2.connectedComponentsWithStats(m)
        if n>1: k=1+np.argmax(st[1:,4]); m=(cc==k).astype(np.uint8)
        m=cv2.morphologyEx(m,cv2.MORPH_CLOSE,E(2))
    cnts,_=cv2.findContours(m,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE); m2=np.zeros_like(m); cv2.drawContours(m2,cnts,-1,1,-1)
    o=np.zeros((H,W,3),np.uint8); o[m2>0]=(255,0,255); cv2.imwrite(f'{D}om-{t:.2f}.png',o)
    ys,xs=np.nonzero(cv2.dilate(O,E(60))); x0,x1,y0,y1=max(0,xs.min()),min(W,xs.max()),max(0,ys.min()),min(H,ys.max())
    ov=f0.copy(); ov[m2==0]=(ov[m2==0]*0.3).astype(np.uint8)
    c=cv2.resize(ov[y0:y1,x0:x1],(260,260)); cv2.putText(c,f'{t:.2f}',(4,16),0,0.5,(0,255,255),1); tiles.append(c)
while len(tiles)%9: tiles.append(np.zeros((260,260,3),np.uint8))
rows=[np.hstack(tiles[i:i+9]) for i in range(0,len(tiles),9)]
cv2.imwrite(D+'om_sheet.jpg',np.vstack(rows))
