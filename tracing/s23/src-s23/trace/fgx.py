# foreground extraction for s23: ungraded + unshaken source frame, the predicted background (clean plate with the
# carried strip / banner warped in by their measured tracks), and the foreground mask.
import cv2, numpy as np, math
from ug import ungrade
from dat import table
STRIP_TRK=table('STRIP_TRK'); BAN_TRK=table('BAN_TRK'); SHAKE=table('SHAKE')
SHK={round(t*25):(dx,dy) for t,dx,dy in SHAKE}
SHARDS=table('SHARDS')
import json as _j, re as _r
def _diss():
    src=open('/Users/computer/rootline/apprentice-film/src/shots/s23/data.js').read()
    i=src.index('export const STRIP_DISS'); j=src.index('};',i)
    body=_r.sub(r'//[^\n]*','',src[src.index('{',i):j+1])
    body=_r.sub(r'(\d{4}):',r'"\1":',body); body=_r.sub(r',\s*}','}',body)
    return {int(a):b for a,b in _j.loads(body).items()}
DISS=_diss()
W,H=2206,946
_c={}
from glowtest import glow
INS=np.zeros((H,W),np.float32); INS[122:,137:2030]=1
def deglow(F): return F-glow(F*INS[...,None])
def plate(name):
    if name not in _c: _c[name]=deglow(np.load('plate%s.npy'%name))
    return _c[name]
def srcU(k):
    return ungrade(cv2.imread('src/%05d.png'%k), k/25)
def unshake(img,k):
    if k not in SHK: return img
    dx,dy=SHK[k]
    M=np.float32([[1,0,-dx],[0,1,-dy]])
    return cv2.warpAffine(img,M,(W,H),flags=cv2.INTER_LINEAR,borderMode=cv2.BORDER_REPLICATE)
GL={}
def load(k):
    F=unshake(srcU(k),k)
    G=glow(F*INS[...,None]); GL[k]=G
    return F-G
def hold(tab,k):
    best=tab[0]
    for r in tab:
        if round(r[0]*25)<=k: best=r
        else: break
    return best[1:]
def interp(keys,t):
    if t<=keys[0][0]: return keys[0][1:]
    if t>=keys[-1][0]: return keys[-1][1:]
    i=0
    while keys[i+1][0]<t: i+=1
    a,b=keys[i],keys[i+1]; u=(t-a[0])/(b[0]-a[0])
    return [a[j]+(b[j]-a[j])*u for j in range(1,len(a))]
def simM(p):
    s,rd,tx,ty=p; r=math.radians(rd); a=s*math.cos(r); b=s*math.sin(r)
    return np.float32([[a,-b,tx],[b,a,ty]])
# the strip (left part of the intact header at 77.6 s) and the banner (settled at 90.0 s) as RGBA layers
HF=(193.5,185.5,1975.0,361.0)
_L={}
def stripLayer():
    """the carried strip: header content x 193.8-1227.7, y 185.5-360.2 of the 77.6 s frame, with a 5 px pale paper
    band outside it (measured profiles at 84.24-85.44: top 0.73, bottom 0.95, left 0.81, right 0.92)"""
    if 'strip' in _L: return _L['strip']
    F=deglow(ungrade(cv2.imread('f1940.png'),77.6))
    x0,y0,x1,y1=193.8,185.5,1227.7,360.2
    S=4
    def rect(a,b,c,d):
        big=np.zeros((H*S,W*S),np.uint8)
        cv2.rectangle(big,(int(round(a*S)),int(round(b*S))),(int(round(c*S))-1,int(round(d*S))-1),255,-1)
        return cv2.resize(big,(W,H),interpolation=cv2.INTER_AREA).astype(np.float32)/255
    A=rect(x0,y0,x1,y1)
    C=F*A[...,None]
    B=5.0
    for (a,b,c,d,v) in [(x0-B,y0-B,x1+B,y0,0.73),(x0-B,y1,x1+B,y1+B,0.95),(x0-B,y0,x0,y1,0.81),(x1,y0,x1+B,y1,0.92)]:
        E=rect(a,b,c,d); C=C*(1-E[...,None])+v*E[...,None]; A=np.maximum(A,E)
    _L['strip']=(C,A); return _L['strip']
def bannerLayer():
    if 'ban' in _L: return _L['ban']
    F=deglow(ungrade(cv2.imread('f2250b.png'),90.0))
    x0,y0,x1,y1=HF
    big=np.zeros((H*4,W*4),np.uint8)
    cv2.rectangle(big,(int((x0-2.6)*4),int((y0-2.6)*4)),(int((x1+2.6)*4),int((y1+2.6)*4)),255,-1)
    A=cv2.resize(big,(W,H),interpolation=cv2.INTER_AREA).astype(np.float32)/255
    _L['ban']=(F*A[...,None],A); return _L['ban']
def warpLayer(L,M):
    C,A=L
    Cw=cv2.warpAffine(C,M,(W,H),flags=cv2.INTER_LINEAR,borderMode=cv2.BORDER_CONSTANT)
    Aw=cv2.warpAffine(A,M,(W,H),flags=cv2.INTER_LINEAR,borderMode=cv2.BORDER_CONSTANT)
    return Cw,Aw
def over(P,L):
    Cw,Aw=L
    return Cw+P*(1-Aw[...,None]), Aw
# banner wobble after the slap (phase correlation of the banner vs 91.2 s, frame px): k -> (dx, dy, s)
BAN_WOB={2210:(0.5,-2.3,1),2211:(0.0,0.1,1),2212:(0.0,2.9,1),2213:(-0.4,1.1,1),2214:(-0.2,-0.8,1),2215:(-0.1,-1.8,0.9989),2216:(0.0,-1.6,0.9990),2217:(-0.1,-1.65,0.9990)}
def predict(k):
    """predicted background (ungraded, unshaken) for source frame k, and the coverage of the strip/banner (0..1)"""
    t=k/25
    cov=np.zeros((H,W),np.float32)
    if k<=2139: P=plate('H1a')
    elif k<=2144:
        wB=DISS[k][1][1] if k in DISS else 1.0
        P=plate('H1a')*(1-wB)+plate('H1b')*wB     # the dissolve blends rim A into rim B
    elif k<=2153: P=plate('H1b')
    elif k<=2209 or k in BAN_WOB: P=plate('H2')
    elif k<=2288: P=plate('B')
    elif k>=2294: P=plate('B2')
    else: w=(k-2288)/6; P=plate('B')*(1-w)+plate('B2')*w   # the banner's pale edge fades out 91.56-91.76
    if 2103<=k<=2147:
        D=DISS.get(k)
        if D:
            acc=np.zeros_like(P); cov=np.zeros((H,W),np.float32)
            for pose,w in D:
                c,a=over(P,warpLayer(stripLayer(),simM(pose))); acc+=w*c; cov=np.maximum(cov,a)
            P=acc
        else:
            P,cov=over(P,warpLayer(stripLayer(),simM(hold(STRIP_TRK,k))))
    if 2164<=k<=2209:
        P,cov=over(P,warpLayer(bannerLayer(),simM(hold(BAN_TRK,k))))
    if k in BAN_WOB:
        dx,dy,s=BAN_WOB[k]; cx=(HF[0]+HF[2])/2
        M=np.float32([[s,0,cx*(1-s)+dx],[0,s,dy]])
        P,cov=over(P,warpLayer(bannerLayer(),M))
    return P,cov
def tdiff(F,P,r=1):
    k=np.ones((2*r+1,2*r+1),np.uint8)
    Pd=cv2.dilate(P,k); Pe=cv2.erode(P,k)
    return np.maximum(F-Pd,Pe-F).clip(0).max(-1)
def fgmask(F,P,cov=None,thr=0.07,thr_in=0.3,minA=30,hole=800,anchor=200,G=None):
    if G is not None:
        # the source clips at white after the glow is added: compare below that ceiling
        cap=1-G; F=np.minimum(F,cap); P=np.minimum(P,cap)
    d=cv2.GaussianBlur(tdiff(F,P),(0,0),0.7)
    if cov is None: cov=np.zeros(d.shape,np.float32)
    inq=cov>=0.5
    m=((d>thr)&~inq)|((d>thr_in)&inq)
    m=m.astype(np.uint8)
    mo=(m>0)&~inq
    # components of (inside pixels + outside pixels dilated 4 px): inside parts survive only when joined to a real
    # outside component (the strip's pale edge line can split a wing tip from the owl)
    link=m|((cv2.dilate(mo.astype(np.uint8),np.ones((13,13),np.uint8))>0)&inq).astype(np.uint8)
    n,cc,st,_=cv2.connectedComponentsWithStats(link,connectivity=8)
    outcnt=np.bincount(cc[mo],minlength=n)
    keep=np.zeros(n,bool); keep[1:]=(st[1:,4]>=minA)&((outcnt[1:]>=anchor)|(st[1:,4]==outcnt[1:]))
    m=(keep[cc]&(m>0)).astype(np.uint8)
    m=cv2.morphologyEx(m,cv2.MORPH_CLOSE,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(3,3)))
    inv=(1-m).astype(np.uint8)
    n,cc,st,_=cv2.connectedComponentsWithStats(inv,connectivity=4)
    small=np.zeros(n,bool); small[1:]=st[1:,4]<hole
    for i in range(1,n):
        x,y,w,h,a=st[i]
        if x==0 or y==0 or x+w==W or y+h==H: small[i]=False
    m[small[cc]]=1
    return m,d

def shardMask(k, w=6):
    m=np.zeros((H,W),np.uint8)
    for x0,y0,x1,y1,t0 in SHARDS:
        if round(t0*25)<=k: cv2.line(m,(int(x0),int(y0)),(int(x1),int(y1)),1,w)
    return m

def maskargs(k):
    # the settled / trembling banner (88.36-88.68) is predicted well: normal threshold, no anchoring outside it
    if 2209<=k<=2217: return dict(thr_in=0.1,anchor=0)
    return {}
def fg(k,shards=True):
    F=load(k); P,cov=predict(k); m,d=fgmask(F,P,cov,G=GL[k],**maskargs(k))
    if k<2399: m=grow(F,P,cov,m,GL[k])
    if shards and k>=2403: m[shardMask(k)>0]=0
    return F,P,cov,m

def grow(F,P,cov,m,G,r=11,t_out=0.035,t_in=0.12,it=2):
    """take in the faint dark-grey parts of the owl next to it (headphone cups and band on the black hole): a lower
    threshold within r px of the mask; on the strip / banner only where the frame is brighter than the prediction"""
    d=cv2.GaussianBlur(tdiff(np.minimum(F,1-G),np.minimum(P,1-G)),(0,0),1.0)
    br=cv2.GaussianBlur((F-P).mean(-1),(0,0),1.0)
    inq=cov>=0.5
    ok=((d>t_out)&~inq)|((br>t_in)&inq)
    for _ in range(it):
        near=cv2.dilate(m,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(r,r)))>0
        m=((m>0)|(near&ok)).astype(np.uint8)
    return m
