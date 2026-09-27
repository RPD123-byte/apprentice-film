# chaos-phase smoke as a coarse density field per frame: pre-grade brightness added to the clean page (min over
# frames), thin things (cracks, slash arcs, paper chips) removed by a 25 px opening, the traced owls masked out,
# σ6 blur, iso-contours at a few levels (smooth, simplified to ~3 px).
import cv2,numpy as np,json,sys
from skimage import measure
from pc import P
exec(open('smokefit2.py').read().split('base=np.minimum')[0].split('K=int')[0])  # imports only
dv=json.load(open('divetrack.json'))['dive']; ch=json.load(open('chtrack.json')); et=json.load(open('etrack.json'))
def tmask(k):
    T=json.load(open(f't_{k}.json')); m=np.zeros((946,2206),np.uint8)
    for r in T['mask']: cv2.fillPoly(m,[np.array(r).reshape(-1,2).round().astype(np.int32)],1)
    return m
TM={k:tmask(k) for k in ['dive','vs2','vs3','hov','eTR','eSt','eFl']}
def owls(f):
    m=np.zeros((946,2206),np.uint8); L=[]
    if f<=2537: L.append(('dive',dv[str(f)]))
    elif f<=2541: L.append(('vs2',ch['vs2'][str(f)]))
    elif f<=2545: L.append(('vs3',ch['vs3'][str(f)]))
    elif f>=2547 and str(f) in ch['hov']: L.append(('hov',ch['hov'][str(f)]))
    for k in ['eTR','eSt','eFl']:
        if str(f) in et[k]: L.append((k,et[k][str(f)]))
    for k,v in L:
        A=np.array(v[:6]).reshape(2,3); m|=cv2.warpAffine(TM[k],A,(2206,946),flags=cv2.INTER_NEAREST)
    return m
base=np.minimum.reduce([P(f) for f in [2542,2545,2555,2560,2548]])
Kop=cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(25,25))
opn=lambda a: cv2.morphologyEx(a,cv2.MORPH_OPEN,Kop)
B0=opn(base)
LV=[0.04,0.09,0.16,0.25,0.36,0.5]
def rdp(Pp,eps):
    if len(Pp)<3: return Pp
    a,b=Pp[0],Pp[-1]; ab=b-a; Ln=np.hypot(*ab)+1e-9
    d=np.abs(ab[0]*(Pp[1:-1,1]-a[1])-ab[1]*(Pp[1:-1,0]-a[0]))/Ln
    i=int(np.argmax(d))+1
    if d[i-1]>eps: return np.vstack([rdp(Pp[:i+1],eps)[:-1],rdp(Pp[i:],eps)])
    return np.vstack([a,b])
out={}
frames=[f for f in range(2513,2566) if f!=2514]
for f in frames:
    E=np.maximum(0,opn(P(f))-B0)
    m=cv2.dilate(owls(f),np.ones((5,5),np.uint8))>0
    # inside the owls: fill from the surroundings (inpaint at 1/4 res) so the smoke continues behind them
    q=cv2.resize(E,(552,237),interpolation=cv2.INTER_AREA); mq=cv2.resize(m.astype(np.uint8),(552,237),interpolation=cv2.INTER_NEAREST)
    q=cv2.inpaint((np.clip(q,0,1)*255).astype(np.uint8),mq,5,cv2.INPAINT_TELEA).astype(np.float32)/255
    q=cv2.GaussianBlur(q,(0,0),1.5)
    Qp=np.pad(q,1)
    levels=[]
    for Lv in LV:
        sel=q>=Lv
        rings=[]
        for c in measure.find_contours(Qp,Lv,positive_orientation='high'):
            if len(c)<6: continue
            xy=(c[:,::-1]-1)*4+2
            j=int(np.argmax(np.hypot(*(xy-xy[0]).T))); r=np.vstack([rdp(xy[:j+1],2.5)[:-1],rdp(xy[j:],2.5)])
            if len(r)<4: continue
            area=0.5*abs(np.dot(r[:,0],np.roll(r[:,1],1))-np.dot(r[:,1],np.roll(r[:,0],1)))
            if area<400: continue
            rings.append([round(float(v),1) for v in r[:-1].reshape(-1)])
        nxt=LV[LV.index(Lv)+1] if Lv!=LV[-1] else 2
        band=(q>=Lv)&(q<nxt)
        val=float(np.median(q[band])) if band.sum()>10 else Lv
        levels.append({'v':round(val,3),'p':rings})
    out[f]=levels
    print(f'{f/25:.2f}', sum(len(r)//2 for L in levels for r in L['p']), 'pts', flush=True)
json.dump(out,open('smoke2.json','w'))
