# per-frame similarity (+ECC affine refine) of a traced scissors layer into frames f (drift-corrected space)
import cv2,numpy as np,json,sys
from segm import L
def gray(f): return cv2.GaussianBlur(cv2.cvtColor(L(f).astype(np.uint8),cv2.COLOR_BGR2GRAY).astype(np.float32),(0,0),1.5)
def gmag(G):
    gx=cv2.Sobel(G,cv2.CV_32F,1,0,ksize=3); gy=cv2.Sobel(G,cv2.CV_32F,0,1,ksize=3); return np.sqrt(gx*gx+gy*gy)
def tmask(k):
    T=json.load(open(f't_{k}.json')); m=np.zeros((946,2206),np.uint8)
    for r in T['mask']: cv2.fillPoly(m,[np.array(r).reshape(-1,2).round().astype(np.int32)],1)
    return m,T['frame']
def track(k,frames,rots=np.arange(-30,31,3),scales=np.arange(0.85,1.31,0.05),win=140,prev=None):
    m,fk=tmask(k); G0=gray(fk); E0=gmag(G0)
    ys,xs=np.nonzero(m); cx,cy=xs.mean(),ys.mean()
    out={}
    for f in frames:
        G=gray(f); E=gmag(G)
        best=(-1,)
        c0=(cx,cy) if prev is None else prev
        for s in scales:
            for r in rots:
                M=cv2.getRotationMatrix2D((cx,cy),float(-r),float(s))
                R=int(max(xs.max()-xs.min(),ys.max()-ys.min())*0.75*s)+10
                M2=M.copy(); M2[0,2]+=R-cx; M2[1,2]+=R-cy
                t=cv2.warpAffine(E0,M2,(2*R,2*R)); mm=(cv2.warpAffine(m.astype(np.float32),M2,(2*R,2*R))>0.5).astype(np.uint8)
                yy,xx=np.nonzero(mm); 
                if len(xx)==0: continue
                a0,a1,b0,b1=xx.min(),xx.max()+1,yy.min(),yy.max()+1
                t=t[b0:b1,a0:a1]; mm=mm[b0:b1,a0:a1]
                # search window around the expected centre
                X0=int(c0[0]-(R-a0)-win); Y0=int(c0[1]-(R-b0)-win)
                X0=max(0,X0); Y0=max(0,Y0); X1=min(2206,X0+t.shape[1]+2*win); Y1=min(946,Y0+t.shape[0]+2*win)
                S=E[Y0:Y1,X0:X1]
                if S.shape[0]<t.shape[0] or S.shape[1]<t.shape[1]: continue
                res=np.nan_to_num(cv2.matchTemplate(S,t,cv2.TM_CCORR_NORMED,mask=mm),nan=-1,posinf=-1,neginf=-1)
                _,mx,_,loc=cv2.minMaxLoc(res)
                if mx>best[0]:
                    # centre of template in frame = X0+loc + (R-a0), Y0+loc + (R-b0)
                    ncx=X0+loc[0]+(R-a0); ncy=Y0+loc[1]+(R-b0)
                    best=(mx,s,r,ncx,ncy)
        mx,s,r,ncx,ncy=best
        # similarity: trace frame -> frame f
        th=np.radians(r); c,sn=np.cos(th)*s,np.sin(th)*s
        A=np.array([[c,-sn,ncx-(c*cx-sn*cy)],[sn,c,ncy-(sn*cx+c*cy)]],np.float32)
        # ECC refine (affine) on grey inside the dilated mask
        md=cv2.dilate(m,np.ones((7,7),np.uint8))
        try:
            cc,A2=cv2.findTransformECC(G0,G,A.copy(),cv2.MOTION_AFFINE,(cv2.TERM_CRITERIA_EPS|cv2.TERM_CRITERIA_COUNT,100,1e-5),md,3)
            if np.abs(A2-A)[:, :2].max()<0.15 and np.abs(A2-A)[:,2].max()<40: A=A2
            else: cc=-1
        except cv2.error: cc=-2
        out[f]=[round(float(v),4) for v in A.reshape(-1)]+[round(float(mx),3),round(float(cc),3)]
        prev=(A[0,0]*cx+A[0,1]*cy+A[0,2],A[1,0]*cx+A[1,1]*cy+A[1,2])
        print(k,f'{f/25:.2f}',f'score {mx:.3f} s {s:.2f} rot {r:+d} cc {cc:.3f}',np.round(A,3).tolist())
    return out
if __name__=='__main__':
    res={}
    res['scCL']=track('scCL',range(2577,2586)); res['scCR']=track('scCR',range(2577,2586))
    res['scH1L']=track('scH1L',range(2586,2616)); res['scH1R']=track('scH1R',range(2586,2616))
    json.dump(res,open('sctrack.json','w'))
