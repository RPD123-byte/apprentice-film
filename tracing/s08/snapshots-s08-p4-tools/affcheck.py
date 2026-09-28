# fit source frame k -> source frame 764 as similarity (table) vs full affine / homography by ECC; report the
# displacement difference across the image
import cv2,numpy as np,sys
sys.path.insert(0,'snapshots/s08-p4-tools')
from cam import M
f0=cv2.cvtColor(cv2.imread('snapshots/s08-p4-src/f764.png'),cv2.COLOR_BGR2GRAY).astype(np.float32)
f0=cv2.GaussianBlur(f0,(0,0),1.2)
mask=np.full(f0.shape,255,np.uint8); mask[330:420,1480:1900]=0; mask[:14]=0
res={}
for k in [int(a) for a in sys.argv[1].split(',')]:
    fk=cv2.cvtColor(cv2.imread(f'snapshots/s08-p4-src/f{k}.png'),cv2.COLOR_BGR2GRAY).astype(np.float32)
    fk=cv2.GaussianBlur(fk,(0,0),1.2)
    Ms=M(k).astype(np.float32)   # frame_k = Ms * F0
    # affine: warp fk into F0 with WARP_INVERSE_MAP semantics: ECC finds W such that f0(x) ~ fk(W x)
    W=Ms.copy()
    crit=(cv2.TERM_CRITERIA_EPS|cv2.TERM_CRITERIA_COUNT,200,1e-7)
    try:
        cc,W=cv2.findTransformECC(f0,fk,W,cv2.MOTION_AFFINE,crit,mask,5)
    except cv2.error as e:
        print(k,'fail',e); continue
    H=np.vstack([Ms,[0,0,1]]).astype(np.float32)
    try:
        cch,H=cv2.findTransformECC(f0,fk,H,cv2.MOTION_HOMOGRAPHY,crit,mask,5)
    except cv2.error as e:
        cch=None
    pts=np.array([[x,y,1] for x in (0,550,1100,1650,2205) for y in (15,470,945)],float)
    ps=pts@Ms.T.astype(float); pa=pts@W.T.astype(float)
    ph=pts@H.T.astype(float); ph=ph[:,:2]/ph[:,2:]
    da=np.linalg.norm(pa-ps,axis=1); dh=np.linalg.norm(ph-ps,axis=1)
    print(k,'affine-vs-sim max %.2f mean %.2f'%(da.max(),da.mean()),' homog-vs-sim max %.2f mean %.2f'%(dh.max(),dh.mean()), 'cc',round(cc,5), None if cch is None else round(cch,5))
    print('   aff dxy at corners', ' '.join(f'({(pa-ps)[i,0]:+.2f},{(pa-ps)[i,1]:+.2f})' for i in range(len(pts))))
    np.save(f'snapshots/s08-p4-tools/aff_{k}.npy',W); np.save(f'snapshots/s08-p4-tools/hom_{k}.npy',H)
