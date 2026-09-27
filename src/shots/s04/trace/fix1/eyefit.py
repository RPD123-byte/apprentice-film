# eyefit.py : smooth eye shapes from eyeshape.json (eye-local coords): per frame, the upper and lower lid edges as
# cubics fitted (robustly) to the column scans outside the iris's columns, the corners where the scans end, the
# pupil and the iris's horizontal radius; then smoothed over time (1-2-1, twice) and gaps filled by the neighbours.
# Writes snapshots/s04-fix1w/eyefit.json (+ debug overlay on the eye-local views). Measurements only.
import cv2, numpy as np, json, sys
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/src/shots/s04/trace')
from grade import degrade
SP='/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/src'
D=json.load(open('/Users/computer/rootline/apprentice-film/snapshots/s04-fix1w/eyeshape.json'))
def rfit(x, y, deg=3, it=4):
    w=np.ones_like(x)
    for _ in range(it):
        c=np.polyfit(x, y, deg, w=w); r=y-np.polyval(c, x); s=max(1.0, 1.4826*np.median(np.abs(r)))
        w=1/(1+(r/(2*s))**2)
    return c
res={}
for k in ['R','L']:
    ts=sorted(t for t in D if k in D[t])
    rows=[]
    for t in ts:
        d=D[t][k]; cols=[c for c in d['cols'] if c[1] is not None]
        pup=d['pupil']; irr=d['irr']
        X=np.array([c[0] for c in cols],float); T=np.array([c[1] for c in cols]); B=np.array([c[2] for c in cols])
        if pup:
            r=(irr or 28)+5; out=(X<pup[0]-r)|(X>pup[0]+r)
        else: out=np.ones_like(X,bool)
        # the lids: the top scan inside the iris span stops on the iris edge, so only columns outside it are fitted
        ct=rfit(X[out],T[out]); cb=rfit(X,B)
        xl,xr=float(X.min()),float(X.max())
        rows.append(dict(t=t,ct=ct,cb=cb,xl=xl,xr=xr,pup=pup,irr=irr))
    # time smoothing of the sampled curves (evaluate on a common x grid), corners, pupil, irr
    xs=np.arange(1150 if k=='R' else 760, 1330 if k=='R' else 955, 4.0)
    TOP=np.array([np.polyval(r['ct'],xs) for r in rows]); BOT=np.array([np.polyval(r['cb'],xs) for r in rows])
    XL=np.array([r['xl'] for r in rows]); XR=np.array([r['xr'] for r in rows])
    PX=np.array([r['pup'][0] if r['pup'] else np.nan for r in rows]); PY=np.array([r['pup'][1] if r['pup'] else np.nan for r in rows])
    IR=np.array([r['irr'] if r['irr'] else np.nan for r in rows])
    tt=np.array([float(r['t']) for r in rows])
    def fill(a):   # linear inter/extrapolation over time for missing values
        ok=~np.isnan(a)
        if ok.sum()<2: return a
        a2=np.interp(tt,tt[ok],a[ok])
        # extrapolate beyond the last valid with the last slope
        last=np.where(ok)[0][-1]
        if last<len(a)-1:
            j=np.where(ok)[0][-3]; sl=(a[last]-a[j])/(tt[last]-tt[j])
            a2[last+1:]=a[last]+sl*(tt[last+1:]-tt[last])
        return a2
    PX,PY,IR=fill(PX),fill(PY),fill(IR)
    def sm(a, n=2):
        a=a.copy()
        for _ in range(n):
            b=a.copy(); b[1:-1]=0.25*a[:-2]+0.5*a[1:-1]+0.25*a[2:]; a=b
        return a
    # (20.56 is a separate frame: smooth only the continuous run from 21.32)
    i0=1
    for arr in (TOP,BOT):
        arr[i0:]=np.apply_along_axis(sm,0,arr[i0:])
    XL[i0:],XR[i0:],PX[i0:],PY[i0:],IR[i0:]=sm(XL[i0:]),sm(XR[i0:]),sm(PX[i0:],1),sm(PY[i0:],1),sm(IR[i0:])
    for i,r in enumerate(rows):
        m=(xs>=XL[i]-2)&(xs<=XR[i]+2)
        res.setdefault(r['t'],{})[k]={'x':xs[m].round(1).tolist(),'top':TOP[i][m].round(1).tolist(),'bot':BOT[i][m].round(1).tolist(),
            'xl':round(float(XL[i]),1),'xr':round(float(XR[i]),1),'pupil':[round(float(PX[i]),1),round(float(PY[i]),1)],'irr':round(float(IR[i]),1)}
json.dump(res,open('/Users/computer/rootline/apprentice-film/snapshots/s04-fix1w/eyefit.json','w'))
# debug: draw on the eye-local views
s=open('/Users/computer/rootline/apprentice-film/src/shots/s04/eyetrack.js').read()
T1=json.loads(s[s.index('{',s.index('EYETRACK')):s.rindex('}')+1]); T2=json.load(open('/Users/computer/rootline/apprentice-film/snapshots/s04-fix1w/eyetrack2.json')); TR={**T1,**T2}
BOX={'L':(760,250,960,390),'R':(1140,250,1340,380)}
sheet=[]
for k in ['R','L']:
    x0,y0,x1,y1=BOX[k]; S=2; W=(x1-x0)*S; H=(y1-y0)*S
    for t in sorted(res):
        if k not in res[t]: continue
        fi=round(float(t)*25); A=np.array(TR[t][k]['A']).reshape(2,3)
        M=np.array([[A[0,0]/S,A[0,1]/S,A[0,0]*x0+A[0,1]*y0+A[0,2]],[A[1,0]/S,A[1,1]/S,A[1,0]*x0+A[1,1]*y0+A[1,2]]],np.float32)
        img=cv2.imread(f'{SP}/{fi}.png',0)
        can=cv2.warpAffine(img,M,(W,H),flags=cv2.INTER_LINEAR|cv2.WARP_INVERSE_MAP,borderMode=cv2.BORDER_REPLICATE)
        vis=cv2.cvtColor(can,cv2.COLOR_GRAY2BGR); r=res[t][k]
        pts=lambda ys: np.array([[(x-x0)*S,(y-y0)*S] for x,y in zip(r['x'],ys)],np.int32)
        cv2.polylines(vis,[pts(r['top'])],False,(0,0,255),1); cv2.polylines(vis,[pts(r['bot'])],False,(255,0,255),1)
        px,py=r['pupil']; cv2.ellipse(vis,(int((px-x0)*S),int((py-y0)*S)),(int(r['irr']*S),int(30*S)),0,0,360,(0,255,0),1)
        cv2.putText(vis,t+k,(4,14),0,0.45,(0,255,255),1); sheet.append(vis)
sheet=[cv2.resize(v,(400,280)) for v in sheet]
while len(sheet)%6: sheet.append(np.zeros_like(sheet[0]))
cv2.imwrite('/Users/computer/rootline/apprentice-film/snapshots/s04-fix1w/eyefit.jpg',np.vstack([np.hstack(sheet[i:i+6]) for i in range(0,len(sheet),6)]))
print('ok')
