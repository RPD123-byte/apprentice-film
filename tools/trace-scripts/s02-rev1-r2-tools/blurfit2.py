import cv2, numpy as np
CAM={349:(-1654.1,1370.8),352:(-1826.5,1533.2),355:(-1917.7,1616.9),358:(-2059.9,1754.4),360:(-2159.5,1849.4),361:(-2203.3,1893.4)}
ref=np.load('s02-rev1-r2-tools/hold_avg.npy').astype(np.float32); H,W=ref.shape
d=np.array([-1,1])/np.sqrt(2)
def smear(im,L):
    if L<1: return im
    N=max(3,int(L/2)+2); acc=np.zeros_like(im)
    for k in range(N):
        u=(k/(N-1)-0.5)*L; M=np.float32([[1,0,d[0]*u],[0,1,d[1]*u]]); acc+=cv2.warpAffine(im,M,(W,H),borderMode=cv2.BORDER_REPLICATE)
    return acc/N
def hp(x): return x-cv2.GaussianBlur(x,(0,0),6)
for f in [355,358,360]:
    src=cv2.cvtColor(cv2.imread(f's02-rev1-r2-src/{f:04d}.png'),cv2.COLOR_BGR2GRAY).astype(np.float32)
    dx0=CAM[f][0]-CAM[361][0]; dy0=CAM[f][1]-CAM[361][1]
    # refine shift by phase correlation on region
    M=np.float32([[1,0,dx0],[0,1,dy0]]); sh=cv2.warpAffine(ref,M,(W,H))
    valid=cv2.warpAffine(np.ones_like(ref),M,(W,H))>0.5; valid=cv2.erode(valid.astype(np.uint8),np.ones((81,81),np.uint8))>0
    ys,xs=np.where(valid); y0,y1,x0,x1=ys.min(),ys.max(),xs.min(),xs.max()
    a=cv2.GaussianBlur(sh[y0:y1,x0:x1],(0,0),3); b=cv2.GaussianBlur(src[y0:y1,x0:x1],(0,0),3)
    (ex,ey),r=cv2.phaseCorrelate(a,b)
    M=np.float32([[1,0,dx0+ex],[0,1,dy0+ey]]); sh=cv2.warpAffine(ref,M,(W,H))
    best=None
    for L in [0,2,4,6,8,12,16,24]:
        s1=smear(sh,L)
        for sg in [0,0.5,0.8,1.1,1.4,1.7,2,2.5]:
            m=cv2.GaussianBlur(s1,(0,0),sg) if sg>0 else s1
            e=np.abs(hp(m)-hp(src))[valid].mean()
            if best is None or e<best[0]: best=(e,L,sg)
    print(f,'track err (%.1f,%.1f) r=%.2f'%(ex,ey,r),'best L=%d sigma=%.1f'%(best[1],best[2]))
