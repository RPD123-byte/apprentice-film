# cells.py Fref tag : shard cells of the rigid blast field in frame Fref coordinates
#   outline mask (presence P + Hough segments) -> cells (complement components) -> per cell: label (bw / col / flat),
#   integer shift of the content vs the global transform (masked NCC), mean colour; polygons (approxPolyDP 1.2 px)
import cv2, numpy as np, json, sys
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
cap=cv2.VideoCapture(V)
def grab(F): cap.set(1,F); ok,f=cap.read(); return f
Fref=int(sys.argv[1]); tag=sys.argv[2]; F0,F1=int(sys.argv[3]),int(sys.argv[4])
P=np.load(f'P-{tag}.npy'); segs=json.load(open(f'segs{tag}.json')); cam=json.load(open(f'cam-{tag}.json'))
G=json.load(open(f'glob-{Fref}.json'))
# median of the rigid frames in Fref coordinates (removes speed lines / scissors / flicker)
stack=[]
for F in range(F0,F1+1,2):
    M=np.float32(cam[str(F)]); f=grab(F)
    stack.append(cv2.warpAffine(f,M,(2206,946),flags=cv2.INTER_LINEAR|cv2.WARP_INVERSE_MAP))
med=np.median(np.array(stack),0).astype(np.uint8); cv2.imwrite(f'med-{tag}.png',med)
A=cv2.imread('../medA.png'); Cc=grab(2937)
Wb=cv2.warpAffine(A,np.float32(G['bw']['M']),(2206,946),flags=cv2.INTER_LINEAR)
Wc=cv2.warpAffine(Cc,np.float32(G['col']['M']),(2206,946),flags=cv2.INTER_LINEAR)
O=((P>0.25).astype(np.uint8))
for s in segs: cv2.line(O,(int(round(s[0])),int(round(s[1]))),(int(round(s[2])),int(round(s[3]))),1,5)
O=cv2.dilate(O,np.ones((7,7),np.uint8))
Oline=((P>0.45).astype(np.uint8))
free=(1-O).astype(np.uint8)
n,lab,st,cen=cv2.connectedComponentsWithStats(free,connectivity=4)
gm=cv2.cvtColor(med,cv2.COLOR_BGR2GRAY).astype(np.float32)
gb=cv2.cvtColor(Wb,cv2.COLOR_BGR2GRAY).astype(np.float32); gc=cv2.cvtColor(Wc,cv2.COLOR_BGR2GRAY).astype(np.float32)
Lm=cv2.cvtColor(med,cv2.COLOR_BGR2Lab).astype(np.float32)
cells=[]
big=[]
R=22
for i in range(1,n):
    x,y,w,h,a=st[i]
    if a<120: continue
    if a>20000:
        big.append(i); continue
    m=(lab[y:y+h,x:x+w]==i)
    # grow the cell by 2 px so its polygon covers the outline gap (the outline is drawn on top)
    mg=cv2.dilate(m.astype(np.uint8),np.ones((5,5),np.uint8))
    cs,_=cv2.findContours(mg,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE)
    c=max(cs,key=cv2.contourArea); poly=(cv2.approxPolyDP(c,1.2,True).reshape(-1,2)+[x,y]).tolist()
    meanc=[float(v) for v in med[y:y+h,x:x+w][m].mean(0)]
    best=('flat',0,0,0.0)
    if a>=250:
        x0,y0=max(0,x-R),max(0,y-R); x1,y1=min(2206,x+w+R),min(946,y+h+R)
        t=gm[y:y+h,x:x+w]; tm=m.astype(np.uint8)*255
        if t[m].std()>5:
            for name,ref in (('bw',gb),('col',gc)):
                win=ref[y0:y1,x0:x1]
                r=cv2.matchTemplate(win,t,cv2.TM_CCORR_NORMED,mask=tm) if False else None
                # masked zero-mean NCC via TM_CCOEFF_NORMED on the masked template (fill outside with the mean)
                tt=t.copy(); tt[~m]=t[m].mean()
                r=cv2.matchTemplate(win,tt,cv2.TM_CCOEFF_NORMED)
                _,mv,_,ml=cv2.minMaxLoc(r)
                dx,dy=x0+ml[0]-x,y0+ml[1]-y
                if mv>best[3]: best=(name,int(dx),int(dy),float(mv))
    lbl,dx,dy,sc=best
    if sc<0.35: lbl='flat'
    cells.append({'poly':poly,'lab':lbl,'dx':-dx,'dy':-dy,'score':round(sc,3),'area':int(a),'mean':[round(v,1) for v in meanc]})
# per-pixel labels inside the big cells: colour page where it matches, black where dark, else B&W page
Lc=cv2.cvtColor(Wc,cv2.COLOR_BGR2Lab).astype(np.float32); Lb=cv2.cvtColor(Wb,cv2.COLOR_BGR2Lab).astype(np.float32)
ecol=cv2.GaussianBlur(np.sqrt(((Lm-Lc)**2).sum(2)),(0,0),4); ebw=cv2.GaussianBlur(np.sqrt(((Lm-Lb)**2).sum(2)),(0,0),4)
Lsm=cv2.GaussianBlur(Lm[...,0],(0,0),4)
bigm=np.isin(lab,big)
bigm=cv2.dilate(bigm.astype(np.uint8),np.ones((7,7),np.uint8))>0
for name,cond in (('col',(ecol<16)&(ecol<ebw)),('flat',(Lsm<30)&~((ecol<16)&(ecol<ebw))),('bw',None)):
    if cond is None: continue
    mk=(bigm&cond).astype(np.uint8)
    mk=cv2.morphologyEx(mk,cv2.MORPH_OPEN,np.ones((5,5),np.uint8))
    cs,_=cv2.findContours(mk,cv2.RETR_CCOMP,cv2.CHAIN_APPROX_NONE)
    for c in cs:
        if cv2.contourArea(c)<150: continue
        poly=cv2.approxPolyDP(c,1.5,True).reshape(-1,2).tolist()
        pm=np.zeros(mk.shape,np.uint8); cv2.fillPoly(pm,[np.array(poly,np.int32)],1)
        mc=[float(v) for v in med[pm>0].mean(0)] if pm.any() else [0,0,0]
        cells.append({'poly':poly,'lab':name,'dx':0,'dy':0,'score':0,'area':int(cv2.contourArea(c)),'mean':[round(v,1) for v in mc],'big':1})
json.dump(cells,open(f'cells-{tag}.json','w'))
from collections import Counter
print(len(cells),'cells', Counter(c['lab'] for c in cells), 'area by label', {k:sum(c['area'] for c in cells if c['lab']==k) for k in ('bw','col','flat')})
# preview: rebuild the frame from the cells using the reference pages
out=np.zeros_like(med)
# big cells default to the B&W page
out[bigm]=Wb[bigm]
for c in cells:
    pm=np.zeros(med.shape[:2],np.uint8); cv2.fillPoly(pm,[np.array(c['poly'],np.int32)],1)
    if c['lab']=='flat': out[pm>0]=np.uint8(c['mean'])
    else:
        src=Wb if c['lab']=='bw' else Wc
        sh=np.roll(np.roll(src,c['dy'],0),c['dx'],1)
        out[pm>0]=sh[pm>0]
out[Oline>0]=(235,235,235)
import math
A8=cv2.cvtColor(cv2.GaussianBlur(out,(0,0),8).astype(np.float32)/255,cv2.COLOR_BGR2Lab); B8=cv2.cvtColor(cv2.GaussianBlur(med,(0,0),8).astype(np.float32)/255,cv2.COLOR_BGR2Lab)
print('rebuild dE8 %.2f'%np.sqrt(((A8-B8)**2).sum(2)).mean())
cv2.imwrite(f'rebuild-{tag}.jpg',np.vstack([cv2.resize(out,(1103,473)),cv2.resize(med,(1103,473))]))
