# camfit2.py RENDERDIR [apply]: ECC similarity residual per frame -> corrected CAM table [u, s, tx, ty, rot(deg)]
import numpy as np, cv2, sys, re
S='/Users/computer/rootline/apprentice-film/snapshots/s08-f3-src/'; R=sys.argv[1]
P='/Users/computer/rootline/apprentice-film/src/shots/s08.js'
src=open(P).read()
block=src.split('const CAM = [')[1].split('];')[0]
cam=[tuple(map(float,m.split(','))) for m in re.findall(r'\[([-\d., ]+)\]', block)]
cam=[c if len(c)==5 else c+(0.0,) for c in cam]
new=[]
for k in range(764,815):
    u=(k-764)/25; c=[c for c in cam if abs(c[0]-u)<1e-6][0]; _,s,tx,ty,rot=c
    a=cv2.GaussianBlur(cv2.imread(f'{R}/r{k}.png').astype(np.float32).mean(-1),(0,0),1.5); b=cv2.GaussianBlur(cv2.imread(S+f'f{k}.png').astype(np.float32).mean(-1),(0,0),1.5)
    m=np.full(b.shape,255,np.uint8)
    lx1,ly1=int(s*450+tx),int(s*230+ty)
    if lx1>0 and ly1>0: m[:max(0,ly1),:max(0,lx1)]=0
    m[:14]=0
    w=np.eye(2,3,dtype=np.float32)
    _,w=cv2.findTransformECC(b,a,w,cv2.MOTION_AFFINE,(cv2.TERM_CRITERIA_EPS|cv2.TERM_CRITERIA_COUNT,200,1e-6),m,5)
    A=w[:,:2].astype(float); bb=w[:,2].astype(float)
    # similarity part of A
    sc=np.sqrt(abs(np.linalg.det(A))); th=np.arctan2(A[1,0]-A[0,1],A[0,0]+A[1,1])
    Asim=sc*np.array([[np.cos(th),-np.sin(th)],[np.sin(th),np.cos(th)]])
    Ai=np.linalg.inv(Asim)
    r=np.radians(rot); C=s*np.array([[np.cos(r),-np.sin(r)],[np.sin(r),np.cos(r)]]); t=np.array([tx,ty])
    C2=Ai@C; t2=Ai@(t-bb)
    s2=np.sqrt(abs(np.linalg.det(C2))); r2=np.degrees(np.arctan2(C2[1,0],C2[0,0]))
    print(k,'resid s %.5f rot %.4f b %.2f %.2f'%(sc,np.degrees(th),bb[0],bb[1]))
    new.append((u,s2,t2[0],t2[1],r2))
if 'apply' in sys.argv:
    rows=[f'[{u:.2f}, {s:.5f}, {tx:.2f}, {ty:.2f}, {r:.4f}]' for u,s,tx,ty,r in new]
    lines=[]
    for i in range(0,len(rows),4): lines.append('  '+', '.join(rows[i:i+4])+',')
    src=src.replace('const CAM = ['+block+'];','const CAM = [\n'+'\n'.join(lines)+'\n];')
    open(P,'w').write(src); print('written')
