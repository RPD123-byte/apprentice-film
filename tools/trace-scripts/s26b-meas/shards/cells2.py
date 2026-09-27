# cells2.py Fref tag F0 F1 : shard cells of the rigid blast field (frame Fref coords) with labels bw / col / black
import cv2, numpy as np, json, sys, os
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
cap=cv2.VideoCapture(V)
def grab(F): cap.set(1,F); ok,f=cap.read(); return f
Fref=int(sys.argv[1]); tag=sys.argv[2]; F0,F1=int(sys.argv[3]),int(sys.argv[4])
P=np.load(f'P-{tag}.npy'); segs=json.load(open(f'segs{tag}.json')); cam=json.load(open(f'cam-{tag}.json'))
G=json.load(open(f'glob-{Fref}.json'))
med=cv2.imread(f'med-{tag}.png') if len(sys.argv)<7 else grab(Fref)
A=cv2.imread('../medA.png'); Cc=grab(2937)
Mb=np.float32(G['bw']['M']); Mc=np.float32(G['col']['M'])
Wb=cv2.warpAffine(A,Mb,(2206,946),flags=cv2.INTER_LINEAR)
# colour page with a zoom smear about the zoom centre (average of scales 1..SM)
SM=float(sys.argv[5]) if len(sys.argv)>5 else 1.06; cx,cy=1071,496
acc=np.zeros((946,2206,3),np.float32); K=9
for k in range(K):
    s=1+(SM-1)*k/(K-1); Z=np.float32([[s,0,cx*(1-s)],[0,s,cy*(1-s)]])
    M=np.vstack([Z,[0,0,1]])@np.vstack([Mc,[0,0,1]])
    acc+=cv2.warpAffine(Cc,M[:2].astype(np.float32),(2206,946),flags=cv2.INTER_LINEAR).astype(np.float32)
Wc=(acc/K).astype(np.uint8); cv2.imwrite(f'Wcs-{tag}.png',Wc)
O=((P>0.25).astype(np.uint8))
for s in segs: cv2.line(O,(int(round(s[0])),int(round(s[1]))),(int(round(s[2])),int(round(s[3]))),1,5)
O=cv2.dilate(O,np.ones((7,7),np.uint8))
Oline=(P>0.45)
n,lab,st,cen=cv2.connectedComponentsWithStats((1-O).astype(np.uint8),connectivity=4)
Lm=cv2.cvtColor(cv2.GaussianBlur(med,(0,0),2),cv2.COLOR_BGR2Lab).astype(np.float32)
Lc=cv2.cvtColor(cv2.GaussianBlur(Wc,(0,0),2),cv2.COLOR_BGR2Lab).astype(np.float32)
gm=cv2.cvtColor(med,cv2.COLOR_BGR2GRAY).astype(np.float32); gb=cv2.cvtColor(Wb,cv2.COLOR_BGR2GRAY).astype(np.float32); gcw=cv2.cvtColor(Wc,cv2.COLOR_BGR2GRAY).astype(np.float32)
Lbw=cv2.cvtColor(cv2.GaussianBlur(Wb,(0,0),2),cv2.COLOR_BGR2Lab).astype(np.float32)
def region_polys(mk,minA=150,eps=1.5):
    cs,_=cv2.findContours(mk.astype(np.uint8),cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE)
    return [cv2.approxPolyDP(c,eps,True).reshape(-1,2) for c in cs if cv2.contourArea(c)>=minA]
cells=[]; R=int(os.environ.get("RBW","20"))
labelmap=np.zeros((946,2206),np.uint8)  # 1 bw, 2 col, 3 black
for i in range(1,n):
    x,y,w,h,a=st[i]
    if a<100: continue
    subs=[]
    if a>20000:
        # a leaked region: split it per pixel (σ4 colour distances)
        big=(lab==i)
        dcol=cv2.GaussianBlur(np.sqrt(((Lm-Lc)**2).sum(2)),(0,0),4); dbw=cv2.GaussianBlur(np.sqrt(((Lm-Lbw)**2).sum(2)),(0,0),4)
        L=np.where(dcol<dbw,2,1)
        for k in (1,2,3):
            mk=big&(L==k); mk=cv2.morphologyEx(mk.astype(np.uint8),cv2.MORPH_OPEN,np.ones((5,5),np.uint8))
            for p in region_polys(mk): subs.append((p,k,0,0))
    else:
        m=(lab==i)
        grow=cv2.dilate(m.astype(np.uint8),np.ones((5,5),np.uint8))
        p=region_polys(grow,0)[0]
        mm=m[y:y+h,x:x+w]
        # candidate: bw with the best integer shift
        dx=dy=0; sc=0
        t=gm[y:y+h,x:x+w]
        if a>=200 and t[mm].std()>4:
            x0,y0=max(0,x-R),max(0,y-R); x1,y1=min(2206,x+w+R),min(946,y+h+R)
            tt=t.copy(); tt[~mm]=t[mm].mean()
            r=cv2.matchTemplate(gb[y0:y1,x0:x1],tt,cv2.TM_CCOEFF_NORMED); _,sc,_,ml=cv2.minMaxLoc(r)
            dx,dy=x0+ml[0]-x,y0+ml[1]-y
        Lb2=np.roll(np.roll(Lbw,-dy,0),-dx,1)
        e_bw=np.sqrt(((Lm[m]-Lb2[m])**2).sum(1)).mean()
        cdx=cdy=0
        if a>=200 and t[mm].std()>4:
            RC=170; x0,y0=max(0,x-RC),max(0,y-RC); x1,y1=min(2206,x+w+RC),min(946,y+h+RC)
            tt=t.copy(); tt[~mm]=t[mm].mean()
            r=cv2.matchTemplate(gcw[y0:y1,x0:x1],tt,cv2.TM_CCOEFF_NORMED); _,csc,_,ml=cv2.minMaxLoc(r)
            if csc>0.5: cdx,cdy=x0+ml[0]-x,y0+ml[1]-y
        Lc2=np.roll(np.roll(Lc,-cdy,0),-cdx,1)
        e_col=np.sqrt(((Lm[m]-Lc2[m])**2).sum(1)).mean()
        sd=gm[m].std(); mL=Lm[m][:,0].mean()*100/255
        k=3 if (sd<7 and mL<18) else (1 if e_bw<=e_col else 2)
        subs.append((p,k,-dx if k==1 else -cdx if k==2 else 0,-dy if k==1 else -cdy if k==2 else 0))
    for p,k,dx,dy in subs:
        pm=np.zeros((946,2206),np.uint8); cv2.fillPoly(pm,[p.astype(np.int32)],1)
        mc=med[pm>0].mean(0) if pm.any() else np.zeros(3)
        cells.append({'poly':p.tolist(),'lab':['','bw','col','black'][k],'dx':int(dx),'dy':int(dy),'mean':[round(float(v),1) for v in mc]})
        labelmap[pm>0]=k
json.dump({'cells':cells,'Mb':Mb.tolist(),'Mc':Mc.tolist(),'smear':SM,'centre':[cx,cy]},open(f'cells-{tag}.json','w'))
from collections import Counter
print(len(cells),'cells',Counter(c['lab'] for c in cells))
out=np.zeros_like(med)
for c in cells:
    pm=np.zeros(med.shape[:2],np.uint8); cv2.fillPoly(pm,[np.array(c['poly'],np.int32)],1); pm=pm>0
    if c['lab']=='black': out[pm]=np.uint8(c['mean'])
    elif c['lab']=='col': out[pm]=np.roll(np.roll(Wc,c['dy'],0),c['dx'],1)[pm]
    else: out[pm]=np.roll(np.roll(Wb,c['dy'],0),c['dx'],1)[pm]
out[Oline]=(230,230,230)
A8=cv2.cvtColor(cv2.GaussianBlur(out,(0,0),8).astype(np.float32)/255,cv2.COLOR_BGR2Lab); B8=cv2.cvtColor(cv2.GaussianBlur(med,(0,0),8).astype(np.float32)/255,cv2.COLOR_BGR2Lab)
print('rebuild dE8 %.2f'%np.sqrt(((A8-B8)**2).sum(2)).mean())
cv2.imwrite(f'rebuild-{tag}.jpg',np.vstack([cv2.resize(out,(1103,473)),cv2.resize(med,(1103,473))]))
