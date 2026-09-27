import cv2, glob, numpy as np
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
BG='/Users/computer/rootline/apprentice-film/snapshots/s21-p2-bg'
g=lambda im: cv2.GaussianBlur(cv2.cvtColor(im,cv2.COLOR_BGR2GRAY).astype(np.float32),(0,0),1.2)
bgS=np.median(np.stack([g(cv2.imread(p)) for p in sorted(glob.glob(BG+'/ref-*.png'))]),0)
def raster(shape,wings,box):
    x0,y0,x1,y1=box; m=np.zeros((y1-y0,x1-x0),np.uint8)
    P=lambda poly: np.array([[p[0]-x0,p[1]-y0] for p in poly],np.int32)
    for poly in [shape['head'],shape['body']]+shape['tail']: cv2.fillPoly(m,[P(poly)],1)
    for w in wings:
        for poly in w['polys']: cv2.fillPoly(m,[P(poly)],1)
    for lg in shape.get('legs',[]):
        pts=P(lg['pts']); cv2.polylines(m,[pts],False,1,max(1,int(round(lg['w']))))
        cv2.circle(m,tuple(int(v) for v in pts[0]),max(1,int(lg['thigh'])),1,-1)
        for a,b in lg['toes']: cv2.line(m,(int(a[0]-x0),int(a[1]-y0)),(int(b[0]-x0),int(b[1]-y0)),1,max(1,int(round(lg['tw']))))
    # scissors: blades + handle rings
    px,py=shape['pivot']; a=shape['ang']; L=shape['L']
    tip=(px+np.cos(a)*L,py+np.sin(a)*L); n=(-np.sin(a)*0.08*L,np.cos(a)*0.08*L)
    cv2.fillPoly(m,[P([(px+n[0],py+n[1]),(px-n[0],py-n[1]),tip])],1)
    for rc in shape['rings']: cv2.circle(m,(int(rc[0]-x0),int(rc[1]-y0)),int(0.17*L),1,-1)
    return m
def smask(im,box):
    x0,y0,x1,y1=box; G=g(im)
    df=np.abs(G-bgS)[y0:y1,x0:x1]; Gc=G[y0:y1,x0:x1]
    X=np.arange(x0,x1)[None,:]
    # the room margins (outside the screen) carry the owl's halo: demand a brighter pixel there
    out=(X<146)|(np.arange(y0,y1)[:,None]<131)
    m=((df>28)&(Gc>100)&(~out|(Gc>150))).astype(np.uint8)
    m=cv2.morphologyEx(m,cv2.MORPH_OPEN,np.ones((3,3),np.uint8)); m=cv2.morphologyEx(m,cv2.MORPH_CLOSE,np.ones((7,7),np.uint8))
    n,lab,st,_=cv2.connectedComponentsWithStats(m)
    if n>1: k=1+np.argmax(st[1:,cv2.CC_STAT_AREA]); m=(lab==k).astype(np.uint8)
    cs,_=cv2.findContours(m,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE); m=np.zeros_like(m); cv2.drawContours(m,cs,-1,1,-1); return m
