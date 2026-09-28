import numpy as np, cv2
Z=np.load('owlstack.npz')
cf=lambda f: f-(f-1)//25
ph=lambda f: ['level','up','level','down'][cf(f)%4]
def fillholes(m):
    h,w=m.shape; ff=m.copy(); pad=np.zeros((h+2,w+2),np.uint8)
    cv2.floodFill(ff,pad,(0,0),255); return m|(~ff&255)
def largest(m):
    n,lab,st,_=cv2.connectedComponentsWithStats(m,8)
    if n<2: return m
    k=1+np.argmax(st[1:,4]); return ((lab==k)*255).astype(np.uint8)
def silh(mm,thr,close=9):
    m=((mm>thr)*255).astype(np.uint8)
    m=cv2.morphologyEx(m,cv2.MORPH_CLOSE,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(close,close)))
    m=fillholes(m); m=largest(m)
    m=cv2.morphologyEx(m,cv2.MORPH_OPEN,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(5,5)))
    return m
out={}
tiles=[]
for P in ['level','up','down']:
    fs=[f for f in range(1341,1382) if ph(f)==P]
    mm=np.mean([Z[f'D{n}']>28 for n in fs],0)
    med=np.median([Z[f'P{n}'] for n in fs],0)
    s=silh(mm,0.55)
    out[P+'_sil']=s; out[P+'_P']=med.astype(np.float32)
    v=cv2.cvtColor((np.clip(med,0,1)*255).astype(np.uint8),cv2.COLOR_GRAY2BGR)
    cs,_=cv2.findContours(s,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE); cv2.drawContours(v,cs,-1,(0,0,255),2); tiles.append(v)
np.savez_compressed('owlphase.npz',**out)
cv2.imwrite('sil.jpg',np.hstack(tiles))
