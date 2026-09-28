import cv2,numpy as np
R='snapshots/s19-rev1-dev/all/'; S='snapshots/s19-rev1-src/'
g=lambda p: cv2.cvtColor(cv2.imread(p),cv2.COLOR_BGR2GRAY).astype(np.float32)
Sb=g(S+'f1434.png'); Rb=g(R+'r-57.36.png')
res=[]
for k in range(1436,1536):
    t=k/25; s=g(S+f'f{k:04d}.png'); r=g(R+f'r-{t:.2f}.png')
    d=cv2.GaussianBlur(np.abs(s-Sb),(0,0),2)
    m=(d>25).astype(np.uint8)
    m=cv2.morphologyEx(m,cv2.MORPH_CLOSE,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(31,31)))
    # fill holes
    ff=m.copy(); h,w=m.shape; mask=np.zeros((h+2,w+2),np.uint8); cv2.floodFill(ff,mask,(0,0),1); inv=1-ff; m=m|inv
    # keep largest comp
    n,lab,st,_=cv2.connectedComponentsWithStats(m)
    if n<2: continue
    i=1+np.argmax(st[1:,4]); m=(lab==i).astype(np.uint8)
    me=cv2.erode(m,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(21,21)))
    see=(np.abs(r-Rb)<12)&(np.abs(r-s)>35)&(me>0)
    see=cv2.morphologyEx(see.astype(np.uint8),cv2.MORPH_OPEN,np.ones((2,2),np.uint8))
    ys,xs=np.nonzero(see)
    bb=(xs.min(),ys.min(),xs.max(),ys.max()) if len(xs) else None
    res.append((t,int(see.sum()),int(me.sum()),bb))
    cv2.imwrite(f'snapshots/s19-rev1-dev/holes-{t:.2f}.png',(see*255).astype(np.uint8)) if see.sum()>150 else None
for r_ in res: print(f'{r_[0]:.2f} see-through px {r_[1]:6d} / interior {r_[2]:7d} bbox {r_[3]}')
