# translucent light (motion streaks, smears, thin flames): split it off the opaque foreground and trace it as white
# with alpha levels, so it lays its light over OUR page instead of carrying the source page's texture along.
import cv2, numpy as np
import cel as C
ALEV=[0.07,0.14,0.22,0.31,0.41,0.52,0.64,0.76,0.88]
def split(F, P, m, Wt=0.95, dthr=0.035, amax=0.85):
    Yf=F.mean(-1); Yp=P.mean(-1)
    a=np.clip((Yf-Yp)/np.maximum(Wt-Yp,0.05),0,1)
    a=cv2.GaussianBlur(a,(0,0),1.0)
    lap=np.abs(cv2.Laplacian(cv2.GaussianBlur(Yf,(0,0),0.8),cv2.CV_32F,ksize=3))
    det=cv2.GaussianBlur(lap,(0,0),4)
    S=(m>0)&(det<dthr)&(a<amax)&(Yf>Yp+0.02)
    S=cv2.morphologyEx(S.astype(np.uint8),cv2.MORPH_OPEN,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(5,5)))
    n,cc,st,_=cv2.connectedComponentsWithStats(S,connectivity=8)
    keep=np.zeros(n,bool); keep[1:]=st[1:,4]>=400
    S=keep[cc].astype(np.uint8)
    return S,a,det
def trace_soft(F,P,S,a,eps=1.0,smooth=1.2):
    if S.sum()==0: return []
    ys,xs=np.nonzero(S)
    x0,y0=max(0,xs.min()-4),max(0,ys.min()-4); x1,y1=min(F.shape[1],xs.max()+5),min(F.shape[0],ys.max()+5)
    Sc=S[y0:y1,x0:x1]>0; ac=a[y0:y1,x0:x1]
    Fc=F[y0:y1,x0:x1]; Pc=P[y0:y1,x0:x1]
    out=[]; prev=0.0
    for i,t in enumerate(ALEV):
        reg=Sc&(ac>=t)
        if reg.sum()<30: break
        nxt=ALEV[i+1] if i+1<len(ALEV) else 1.0
        band=reg&(ac<nxt)
        target=float(np.median(ac[band])) if band.sum()>10 else (t+nxt)/2
        # colour of the light: (F - (1-a)P)/a over the band
        sel=band&(ac>0.1)
        if sel.sum()>10:
            A=ac[sel][:,None]; col=np.median((Fc[sel]-(1-A)*Pc[sel])/A,axis=0)[::-1]
        else: col=np.array([0.93,0.93,0.93])
        col=np.clip(col,0,1)
        inc=(target-prev)/(1-prev) if prev<1 else 0
        prev=target
        rings=C.contours(reg.astype(np.uint8),eps=eps,smooth=smooth)
        if not rings: continue
        out.append({'c':[int(round(v*255)) for v in col],'a':round(float(np.clip(inc,0,1)),3),'r':[(r+[2*x0,2*y0]).ravel().tolist() for r in rings]})
    return out
