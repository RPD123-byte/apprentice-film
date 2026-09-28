import cv2, numpy as np
def S(n): return cv2.imread(f'src/f{n}.png',0).astype(np.float32)
def R(n): return cv2.imread(f'all/r-{n/25:.3f}.png',0).astype(np.float32)
# track features on the headphones/head outline (exclude eyes/beak which change): cups + band + tuft
box=(1495,195,1690,345)
def track(get, n0, n):
    a=cv2.GaussianBlur(get(n0),(0,0),1.2); b=cv2.GaussianBlur(get(n),(0,0),1.2)
    x0,y0,x1,y1=box
    msk=np.zeros(a.shape,np.uint8); msk[y0:y1,x0:x1]=255; msk[262:340,1545:1640]=0  # drop the face
    p=cv2.goodFeaturesToTrack(a.astype(np.uint8),200,0.01,5,mask=msk)
    q,st,_=cv2.calcOpticalFlowPyrLK(a.astype(np.uint8),b.astype(np.uint8),p,None,winSize=(21,21),maxLevel=3)
    p=p[st[:,0]==1].reshape(-1,2); q=q[st[:,0]==1].reshape(-1,2)
    M,inl=cv2.estimateAffinePartial2D(p,q,ransacReprojThreshold=1.0)
    ang=np.degrees(np.arctan2(M[1,0],M[0,0])); s=np.hypot(M[0,0],M[1,0])
    # displacement at head centre (1596,290)
    c=np.array([1596,290,1.0]); d=M@c-c[:2]
    return ang,s,d,int(inl.sum()),len(p)
print('t      src: ang  scale  dx  dy        | rend: ang scale dx dy')
for n in range(3474,3504,2):
    a=track(S,3474,n); b=track(R,3474,n)
    print(f'{n/25:.2f}  {a[0]:+.2f} {a[1]:.3f} {a[2][0]:+.1f} {a[2][1]:+.1f} ({a[3]}/{a[4]}) | {b[0]:+.2f} {b[1]:.3f} {b[2][0]:+.1f} {b[2][1]:+.1f} ({b[3]}/{b[4]})')
