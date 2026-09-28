import cv2,numpy as np
SRC='/Users/computer/rootline/apprentice-film/snapshots/s25-src/f%05d.png'
_G={}
def G(f,blur=1.2):
    k=(f,blur)
    if k not in _G:
        g=cv2.imread(SRC%f,0).astype(np.float32)
        _G[k]=cv2.GaussianBlur(g,(0,0),blur) if blur else g
    return _G[k]
def ecc(fref,f,box,init=None,mode=cv2.MOTION_AFFINE,mask=None,pad=60,blur=1.2):
    """affine A (2x3, full-frame coords) mapping points of frame fref inside box to frame f"""
    x0,y0,x1,y1=box
    X0,Y0,X1,Y1=max(0,x0-pad),max(0,y0-pad),min(2206,x1+pad),min(946,y1+pad)
    T=G(fref,blur)[y0:y1,x0:x1]
    I=G(f,blur)[Y0:Y1,X0:X1]
    # warp maps template coords -> image coords: image(x')=T(x) with x' = A x ; in crop coords
    w=np.eye(2,3,dtype=np.float32)
    if init is not None:
        A=np.vstack([np.array(init,np.float32).reshape(2,3),[0,0,1]])
        Tc=np.array([[1,0,x0],[0,1,y0],[0,0,1]],np.float32); Ic=np.array([[1,0,X0],[0,1,Y0],[0,0,1]],np.float32)
        w=(np.linalg.inv(Ic)@A@Tc)[:2].astype(np.float32)
    else:
        w[0,2]=x0-X0; w[1,2]=y0-Y0
    # ECC needs template and image the same size: embed template in image-size canvas with mask
    Tt=np.zeros_like(I); Mt=np.zeros(I.shape,np.uint8)
    # use inverse formulation: findTransformECC(template=I_crop?,...) -> simpler: warp search with template smaller not allowed
    # so use full-size: template = T padded, mask = template area; warp maps template->input
    Tt[:T.shape[0],:T.shape[1]]=T; Mt[:T.shape[0],:T.shape[1]]=1 if mask is None else mask[y0:y1,x0:x1]
    try:
        cc,w=cv2.findTransformECC(Tt,I,w,mode,(cv2.TERM_CRITERIA_EPS|cv2.TERM_CRITERIA_COUNT,200,1e-6),Mt,1)
    except cv2.error as e:
        return None,0
    A=np.vstack([w,[0,0,1]])
    Tc=np.array([[1,0,x0],[0,1,y0],[0,0,1]]); Ic=np.array([[1,0,X0],[0,1,Y0],[0,0,1]])
    A=Ic@A@np.linalg.inv(Tc)
    return A[:2],cc

def search(fref,f,box,scales=(1.0,),rots=(0.0,),region=None,blur=1.5,grad=False):
    """coarse rotation/scale-searched NCC template match; returns (A 2x3 full-frame fref->f, score)"""
    x0,y0,x1,y1=box
    T=G(fref,blur)[y0:y1,x0:x1]; I=G(f,blur)
    if grad:
        def gm(a): return np.hypot(cv2.Sobel(a,cv2.CV_32F,1,0),cv2.Sobel(a,cv2.CV_32F,0,1))
        T=gm(T); I=gm(I)
    if region is not None:
        rx0,ry0,rx1,ry1=region; I=I[ry0:ry1,rx0:rx1]
    else: rx0=ry0=0
    cx,cy=(x1-x0)/2,(y1-y0)/2
    best=(-2,None)
    for s in scales:
        for r in rots:
            M=cv2.getRotationMatrix2D((cx,cy),-np.degrees(r),s)
            # enlarge canvas to hold rotated template
            h,w=T.shape; nw,nh=int(w*s*1.5)+2,int(h*s*1.5)+2
            M[0,2]+=(nw-w)/2; M[1,2]+=(nh-h)/2
            Tr=cv2.warpAffine(T,M,(nw,nh)); Mk=cv2.warpAffine(np.ones_like(T),M,(nw,nh))
            if Tr.shape[0]>=I.shape[0] or Tr.shape[1]>=I.shape[1]: continue
            res=cv2.matchTemplate(I,Tr,cv2.TM_CCORR_NORMED,mask=Mk) if False else cv2.matchTemplate(I,Tr,cv2.TM_CCOEFF_NORMED)
            _,mv,_,ml=cv2.minMaxLoc(res)
            if mv>best[0]:
                # template px (u,v) in T -> Tr via M -> I at ml
                A=np.vstack([M,[0,0,1]])
                Tc=np.array([[1,0,-x0],[0,1,-y0],[0,0,1]])
                Ic=np.array([[1,0,ml[0]+rx0],[0,1,ml[1]+ry0],[0,0,1]])
                best=(mv,(Ic@A@Tc)[:2])
    return best[1],best[0]
