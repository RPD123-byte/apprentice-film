import cv2, numpy as np, sys
CAM={330:(-929.1,733.4),340:(-1276.6,1041.0),343:(-1402.2,1144.6),346:(-1517.3,1252.4),349:(-1654.1,1370.8),352:(-1826.5,1533.2),355:(-1917.7,1616.9),358:(-2059.9,1754.4),360:(-2159.5,1849.4),361:(-2203.3,1893.4)}
ref=np.load('s02-rev1-r2-tools/hold_avg.npy').astype(np.float32)  # sharp source hold frame (owl sits)
H,W=ref.shape
d=np.array([-1,1])/np.sqrt(2)
def smear(im,L):
    if L<1: return im
    N=max(3,int(L/2)+2); acc=np.zeros_like(im)
    for k in range(N):
        u=(k/(N-1)-0.5)*L; M=np.float32([[1,0,d[0]*u],[0,1,d[1]*u]]); acc+=cv2.warpAffine(im,M,(W,H),borderMode=cv2.BORDER_REPLICATE)
    return acc/N
for f in [349,352,355,358,360]:
    src=cv2.cvtColor(cv2.imread(f's02-rev1-r2-src/{f:04d}.png'),cv2.COLOR_BGR2GRAY).astype(np.float32)
    dx=CAM[f][0]-CAM[361][0]; dy=CAM[f][1]-CAM[361][1]
    M=np.float32([[1,0,dx],[0,1,dy]]); sh=cv2.warpAffine(ref,M,(W,H),borderValue=-1)
    valid=cv2.warpAffine(np.ones_like(ref),M,(W,H),borderValue=0)>0.5
    valid=cv2.erode(valid.astype(np.uint8),np.ones((61,61),np.uint8))>0
    # exclude the owl area (it is on the world, fine) keep all
    best=None
    for L in [0,4,8,12,16,24,32,48]:
        s1=smear(sh,L)
        for sg in [0,0.5,1,1.5,2,2.5,3]:
            m=cv2.GaussianBlur(s1,(0,0),sg) if sg>0 else s1
            e=np.abs(m-src)[valid].mean()
            if best is None or e<best[0]: best=(e,L,sg)
    print(f, 'valid px %.0f%%'%(valid.mean()*100), 'best smear L=%d sigma=%.1f err=%.2f'%(best[1],best[2],best[0]))
