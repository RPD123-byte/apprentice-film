# camfit.py RENDERDIR : per-frame residual similarity between render and source (ECC affine on blurred luma),
# expressed as a corrected camera (s, tx, ty) per frame.
import numpy as np, cv2, sys, re
S='/Users/computer/rootline/apprentice-film/snapshots/s08-f3-src/'; R=sys.argv[1]
src=open('/Users/computer/rootline/apprentice-film/src/shots/s08.js').read()
cam=[tuple(map(float,m)) for m in re.findall(r'\[([\d.]+), ([\d.]+), (-?[\d.]+), (-?[\d.]+)\]', src.split('const CAM =')[1].split('];')[0])]
out=[]
for k in range(764,815):
    u=(k-764)/25; c=[c for c in cam if abs(c[0]-u)<1e-6][0]; _,s,tx,ty=c
    a=cv2.GaussianBlur(cv2.imread(f'{R}/r{k}.png').astype(np.float32).mean(-1),(0,0),1.5); b=cv2.GaussianBlur(cv2.imread(S+f'f{k}.png').astype(np.float32).mean(-1),(0,0),1.5)
    m=np.full(b.shape,255,np.uint8)
    lx1,ly1=int(s*450+tx),int(s*230+ty)
    if lx1>0 and ly1>0: m[:max(0,ly1),:max(0,lx1)]=0
    m[:14]=0
    w=np.eye(2,3,dtype=np.float32)
    try:
        _,w=cv2.findTransformECC(b,a,w,cv2.MOTION_AFFINE,(cv2.TERM_CRITERIA_EPS|cv2.TERM_CRITERIA_COUNT,200,1e-6),m,5)
    except cv2.error as e:
        print(k,'fail'); out.append((u,s,tx,ty)); continue
    A=w[:,:2]; bb=w[:,2]; sc=np.sqrt(abs(np.linalg.det(A))); rot=np.degrees(np.arctan2(A[1,0]-A[0,1],A[0,0]+A[1,1]))
    # corrected camera: C' = W^-1 o C,  W x = A x + b  ~ sc x + b
    s2=s/sc; t2=(np.array([tx,ty])-bb)/sc
    out.append((u,s2,t2[0],t2[1]))
    print(k,'resid scale %.5f rot %.4f deg  b %.2f %.2f   cam s %.4f->%.4f  tx %.1f->%.2f ty %.1f->%.2f'%(sc,rot,bb[0],bb[1],s,s2,tx,t2[0],ty,t2[1]))
np.save(R+'/camfit.npy',np.array(out))
