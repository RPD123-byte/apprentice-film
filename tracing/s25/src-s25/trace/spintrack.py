# track the two scissors (templates = the traced floating pairs at 109.40) through the spin 106.92-108.56:
# rotation search about the template's pivot + translation, masked normalised correlation.
import cv2,numpy as np,json
from segm import L
def gray(f): return cv2.GaussianBlur(cv2.cvtColor(L(f).astype(np.uint8),cv2.COLOR_BGR2GRAY).astype(np.float32),(0,0),1.2)
G0=gray(2735)
PIV={'fscL':(755.0,350.0),'fscR':(1376.0,334.0)}
WIN={'fscL':(520,120,1060,520),'fscR':(1150,110,1700,520)}
TPL={}
for k in PIV:
    T=json.load(open(f't_{k}.json'))
    m=np.zeros(G0.shape,np.uint8)
    for r in T['mask']: cv2.fillPoly(m,[np.array(r).reshape(-1,2).round().astype(np.int32)],1)
    TPL[k]=m
def rot_tpl(k,th,s=1.0):
    px,py=PIV[k]; R=220
    M=cv2.getRotationMatrix2D((px,py),np.degrees(-th),s)   # cv2 angle is counter-clockwise in image (y down) = -th
    M[0,2]+=R-px; M[1,2]+=R-py
    t=cv2.warpAffine(G0,M,(2*R,2*R)); m=cv2.warpAffine(TPL[k].astype(np.float32),M,(2*R,2*R))>0.5
    ys,xs=np.nonzero(m)
    x0,x1,y0,y1=xs.min(),xs.max()+1,ys.min(),ys.max()+1
    return t[y0:y1,x0:x1],m[y0:y1,x0:x1].astype(np.uint8),(R-x0,R-y0)   # pivot offset inside the crop
res={}
for f in list(range(2672,2716)):
    I=gray(f); out={}
    for k in PIV:
        wx0,wy0,wx1,wy1=WIN[k]; S=I[wy0:wy1,wx0:wx1]
        best=(-1,)
        for th in np.radians(np.arange(-180,180,6)):
            t,m,off=rot_tpl(k,th)
            if t.shape[0]>=S.shape[0] or t.shape[1]>=S.shape[1]: continue
            r=cv2.matchTemplate(S,t,cv2.TM_CCORR_NORMED,mask=m)
            r=np.nan_to_num(r,nan=-1,posinf=-1,neginf=-1)
            _,mx,_,loc=cv2.minMaxLoc(r)
            if mx>best[0]: best=(mx,th,loc,off)
        mx,th0,_,_=best
        for th in th0+np.radians(np.arange(-5,5.1,1)):
            t,m,off=rot_tpl(k,th)
            r=np.nan_to_num(cv2.matchTemplate(S,t,cv2.TM_CCORR_NORMED,mask=m),nan=-1,posinf=-1,neginf=-1)
            _,mx,_,loc=cv2.minMaxLoc(r)
            if mx>=best[0]: best=(mx,th,loc,off)
        mx,th,loc,off=best
        out[k]=[round(float(wx0+loc[0]+off[0]),1),round(float(wy0+loc[1]+off[1]),1),round(float(th),3),round(float(mx),3)]
    res[f]=out
    print(f'{f/25:.2f}', ' '.join(f'{k}: piv ({v[0]:.0f},{v[1]:.0f}) rot {np.degrees(v[2]):6.1f} score {v[3]:.3f}' for k,v in out.items()))
json.dump(res,open('spintrack.json','w'))
