# non-figure mask (owl, speaker cabinet, wall) right of the figure, per source frame 129.32-129.40, by GrabCut from seed
# rectangles (checked by eye on 3x zooms). Output: owl_masks.npz (mask over the box) + overlays.
import cv2, numpy as np, sys, json
SP='/private/tmp/claude-501/-Users-computer-vibe-check/9d8e3a22-605d-469a-804c-e2a05ae8a7e5/scratchpad'
X0,Y0,X1,Y1=1140,390,1370,770
LIDQ={3233:[1383.5,325.5,1208.4,905.9],3234:[1354.4,332.6,1182.2,909.7],3235:[1322.4,339.3,1152.7,914.5]}
SEEDS={
 3233:{'nf':[(1275,395,1350,425),(1262,440,1320,488),(1225,492,1262,520),(1262,540,1300,640),(1242,660,1268,740),(1234,598,1246,614)],
       'f':[(1140,400,1228,478),(1140,560,1198,770),(1140,640,1214,745),(1140,480,1190,530)]},
 3234:{'nf':[(1272,395,1325,425),(1262,440,1300,498),(1244,565,1262,635),(1228,655,1244,700),(1217,610,1227,625)],
       'f':[(1140,400,1238,498),(1140,560,1205,770),(1140,500,1175,540)]},
 3235:{'nf':[(1236,500,1250,522),(1212,614,1221,626)],
       'f':[(1140,400,1228,488),(1140,560,1198,770),(1140,500,1180,540)]},
}
def lidx(n,y):
    a,b,c,d=LIDQ[n]; return a+(y-b)/(d-b)*(c-a)
def run(n):
    f=cv2.imread(f'{SP}/src/{n}.png')
    crop=np.ascontiguousarray(f[Y0:Y1,X0:X1])
    h,w=crop.shape[:2]
    m=np.full((h,w),cv2.GC_PR_FGD,np.uint8)
    # right of the lid's left edge: not part of the patch (the lid is drawn over); count it as background
    ys,xs=np.mgrid[Y0:Y1,X0:X1]
    lid=xs>lidx(n,ys)+2
    for x0,y0,x1,y1 in SEEDS[n]['f']: m[y0-Y0:y1-Y0,x0-X0:x1-X0]=cv2.GC_BGD
    for x0,y0,x1,y1 in SEEDS[n]['nf']: m[y0-Y0:y1-Y0,x0-X0:x1-X0]=cv2.GC_FGD
    # figure-ish colours (sage: r-g small) far from any non-figure seed -> probable background
    b,g,r=[cv2.GaussianBlur(crop[...,i].astype(np.float32),(0,0),1.5) for i in range(3)]
    L=(b+g+r)/3
    pb=(r-g<8)&(L>80)&(L<210)&(m==cv2.GC_PR_FGD)
    m[pb]=cv2.GC_PR_BGD
    m[lid]=cv2.GC_BGD
    bg=np.zeros((1,65),np.float64); fg=np.zeros((1,65),np.float64)
    cv2.grabCut(crop,m,None,bg,fg,8,cv2.GC_INIT_WITH_MASK)
    nf=((m==cv2.GC_FGD)|(m==cv2.GC_PR_FGD)).astype(np.uint8)
    # keep only components touching a non-figure seed
    k,lab=cv2.connectedComponents(nf)
    keep=set()
    for x0,y0,x1,y1 in SEEDS[n]['nf']: keep|=set(np.unique(lab[y0-Y0:y1-Y0,x0-X0:x1-X0]).tolist())
    keep.discard(0)
    nf=np.isin(lab,list(keep)).astype(np.uint8)
    # fill small holes (pupils, woofer centre, ink inside the owl)
    inv=(1-nf).astype(np.uint8); k2,l2,st,_=cv2.connectedComponentsWithStats(inv)
    for i in range(1,k2):
        if st[i,4]<400 and not lid[l2==i].any(): nf[l2==i]=1
    return crop,nf,lid
if __name__=='__main__':
    ns=[int(a) for a in sys.argv[1].split(',')]
    tiles=[]; out={}
    for n in ns:
        crop,nf,lid=run(n); out[str(n)]=nf
        v=crop.copy(); cs,_=cv2.findContours(nf,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE)
        v=cv2.resize(v,None,fx=2,fy=2,interpolation=cv2.INTER_CUBIC)
        cv2.drawContours(v,[c*2 for c in cs],-1,(255,0,255),1)
        for x0,y0,x1,y1 in SEEDS[n]['nf']: cv2.rectangle(v,((x0-X0)*2,(y0-Y0)*2),((x1-X0)*2,(y1-Y0)*2),(0,255,255),1)
        for x0,y0,x1,y1 in SEEDS[n]['f']: cv2.rectangle(v,((x0-X0)*2,(y0-Y0)*2),((x1-X0)*2,(y1-Y0)*2),(0,255,0),1)
        tiles.append(v)
    np.savez_compressed(f'{SP}/owlmasks.npz',**out)
    cv2.imwrite(sys.argv[2],np.hstack(tiles))
