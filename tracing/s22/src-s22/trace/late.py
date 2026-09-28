# per-drawing tracing for the late phase (79.80-84.00)
import sys; sys.path.insert(0,__import__('os').path.dirname(__import__('os').path.abspath(__file__)))
from common import *
import trace as TR, json
Z=np.load(S+'/late_pre.npz')
def pre(t): return Z['%.2f'%t].astype(np.float32)
PLATE=np.load(S+'/plate_top.npy')
def ncv(v,w,s): return cv2.GaussianBlur(v*w,(0,0),s)/np.maximum(cv2.GaussianBlur(w,(0,0),s),1e-4)
def align(ts, box, ref_t=None):
    x0,y0,x1,y1=box; w,h=x1-x0,y1-y0
    ref_t=ref_t or ts[0]
    ref=cv2.GaussianBlur(pre(ref_t)[y0:y1,x0:x1],(0,0),1)
    win=cv2.createHanningWindow((w,h),cv2.CV_32F)
    out=[]
    for t in ts:
        c=cv2.GaussianBlur(pre(t)[y0:y1,x0:x1],(0,0),1)
        (dx,dy),r=cv2.phaseCorrelate(ref,c,win)
        out.append((t,dx,dy,r))
    return out
def median_of(al, box, plate_sub=True):
    x0,y0,x1,y1=box; w,h=x1-x0,y1-y0
    cs=[];ps=[]
    for t,dx,dy,r in al:
        cs.append(crop_sub(pre(t),x0+dx,y0+dy,w,h))
        ps.append(crop_sub(PLATE,x0+dx,y0+dy,w,h))
    return np.median(np.array(cs),axis=0), np.median(np.array(ps),axis=0)
def trace_frame(v, plate, excl=None, keep=None, thr=0.18, rough_thr=0.22, deltas=(0.06,0.14,0.24,0.36,0.5), cut_below=None, name='x', origin=(0,0), meta=None, use_plate=True):
    h,w=v.shape
    d=v-plate if use_plate else v.copy()
    rough=cv2.dilate((cv2.GaussianBlur(d,(0,0),1)>rough_thr).astype(np.uint8),cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(15,15)))
    ww=(1-rough).astype(np.float32)
    halo=ncv(d,ww,5); halo2=ncv(d,ww,14); halo=np.where(cv2.GaussianBlur(ww,(0,0),5)>0.05,halo,halo2)
    hu=TR.up(halo); pu=TR.up(plate) if use_plate else 0
    ex=np.zeros((h*TR.UP,w*TR.UP),np.uint8)
    for poly in (excl or []):
        cv2.fillPoly(ex,[np.round((np.array(poly,np.float32)-np.array(origin)+0.5)*TR.UP-0.5).astype(np.int32)],1)
    kp=None
    if keep:
        kp=np.zeros_like(ex)
        for poly in keep: cv2.fillPoly(kp,[np.round((np.array(poly,np.float32)-np.array(origin)+0.5)*TR.UP-0.5).astype(np.int32)],1)
    yu=(np.arange(h*TR.UP)[:,None]+0.5)/TR.UP-0.5+origin[1]
    xu=(np.arange(w*TR.UP)[None,:]+0.5)/TR.UP-0.5+origin[0]
    def silf(vu):
        m=((vu-pu)-hu)>thr
        m&=(ex==0)
        if kp is not None: m&=(kp>0)
        if cut_below is not None:
            m&=~(yu>cut_below(xu))
        # keep the largest components only (drop specks)
        n,lab,st,_=cv2.connectedComponentsWithStats(m.astype(np.uint8))
        keepi=[i for i in range(1,n) if st[i,4]>40*TR.UP*TR.UP]
        return np.isin(lab,keepi)
    T=TR.trace(v,silf,deltas=deltas,base_thr=0.85)
    T['origin']=list(origin)
    if meta: T['meta']=meta
    json.dump(T,open(S+f'/tr_{name}.json','w'))
    # preview: trace over plate+halo vs source
    img,a=TR.render(T,blur=0.7)
    bgv=(plate if use_plate else 0)+halo
    comp=img+(1-a)*bgv
    m=cv2.dilate((a>0.02).astype(np.uint8),np.ones((5,5)))>0
    e=np.abs(cv2.GaussianBlur(comp,(0,0),2)-cv2.GaussianBlur(v,(0,0),2))[m].mean()*255
    out=np.clip(np.hstack([comp,v]),0,1)*255
    sc=2 if w<400 else 1
    cv2.imwrite(S+f'/tr_{name}.png',cv2.resize(out,None,fx=sc,fy=sc,interpolation=cv2.INTER_LINEAR).astype(np.uint8))
    print(name,'sil',len(T['sil']),'lv',[len(L['rings']) for L in T['levels']],'err blur2 %.1f'%e, len(json.dumps(T)),'B')
    return T

LIFT=[[79.72,0,0,0],[79.76,-15,-23,2],[79.8,-25,-37,3],[79.84,-37,-50,4],[79.88,-47,-65,4],[79.92,-37,-48,3],[79.96,-23,-30,3],[80.0,-10,-16,3],
  [80.04,3,-4,4],[80.08,-1,-8,4],[80.12,-4,-12,4],[80.16,-7,-15,4],[80.24,-5,-13,4],[80.28,-2,-10,4],[80.32,-1,-9,4],[80.56,-1,-9,4],
  [80.6,-1,-8,3],[80.64,0,-8,3],[80.68,1,-8,2],[80.72,1,0.5,1],[80.76,0,0,0]]
def interp(keys,t):
    if t<=keys[0][0]: return keys[0][1:]
    if t>=keys[-1][0]: return keys[-1][1:]
    for a,b in zip(keys,keys[1:]):
        if a[0]<=t<=b[0]:
            u=(t-a[0])/(b[0]-a[0]); return [x+(y-x)*u for x,y in zip(a[1:],b[1:])]
STRIP_REST=None
def plate_at(t):
    global STRIP_REST
    P=PLATE.copy()
    if t>=81.42: return P
    if STRIP_REST is None: STRIP_REST=pre(81.0)
    d6,d18,dx=interp(LIFT,t) if t<80.76 else (0,0,0)
    k=(d18-d6)/1165; f=d6-660*k
    # strip content (y 176..372, x 186..1990 at rest) moved by x' = x + dx, y' = y + k x + f
    src=np.zeros_like(P); src[176:372,186:1990]=STRIP_REST[176:372,186:1990]
    msk=np.zeros_like(P); msk[176:372,186:1990]=1
    M=np.float32([[1,0,dx],[k,1,f]])
    ws=cv2.warpAffine(src,M,(P.shape[1],P.shape[0]),flags=cv2.INTER_LINEAR)
    wm=cv2.warpAffine(msk,M,(P.shape[1],P.shape[0]),flags=cv2.INTER_LINEAR)
    return P*(1-wm)+ws

WARP=json.load(open(S+'/strip_warp.json'))
def plate_at2(t):
    # static plate + the strip (from 81.0, y>=186) warped by the ECC affine measured for frame t
    global STRIP_REST
    P=PLATE.copy()
    key='%.2f'%t
    if t>=81.42: return P
    if STRIP_REST is None: STRIP_REST=pre(81.0)
    x0,y0=250,200
    if key in WARP:
        Wm=np.array(WARP[key],np.float32)
        # WARP maps template coords (p - (x0,y0)) of 81.0 -> frame coords of t
        A=np.array([[Wm[0,0],Wm[0,1],Wm[0,2]-Wm[0,0]*x0-Wm[0,1]*y0],[Wm[1,0],Wm[1,1],Wm[1,2]-Wm[1,0]*x0-Wm[1,1]*y0]],np.float32)
    else: A=np.float32([[1,0,0],[0,1,0]])
    src=np.zeros_like(P); msk=np.zeros_like(P)
    src[186:372,186:1990]=STRIP_REST[186:372,186:1990]; msk[186:372,186:1990]=1
    ws=cv2.warpAffine(src,A,(P.shape[1],P.shape[0]),flags=cv2.INTER_LINEAR)
    wm=cv2.warpAffine(msk,A,(P.shape[1],P.shape[0]),flags=cv2.INTER_LINEAR)
    return P*(1-wm)+ws

def plate_rest():
    P=PLATE.copy(); R=pre(81.0)
    P[183:380,150:2000]=R[183:380,150:2000]
    # the feet of 81.0 on the outline (x 290..335, y 183..194): fill from the line just left of them
    P[183:194,290:336]=np.repeat(R[183:194,280:289].mean(axis=1,keepdims=True),46,axis=1)
    return P
