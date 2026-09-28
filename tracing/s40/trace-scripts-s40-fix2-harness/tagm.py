import cv2,numpy as np
s=cv2.imread('src/f3450.png').astype(int); r=cv2.imread('out/r-138.000.png').astype(int)
def ink(im,x0,x1,kind):
    c=im[640:720,x0:x1]; b,g,rr=c[...,0],c[...,1],c[...,2]; L=0.299*rr+0.587*g+0.114*b
    if kind=='m': m=L<85
    else: m=(L>185)&(rr-b<70)
    ys=np.nonzero(m.any(1))[0]
    return m.sum(), (640+ys.min(), 640+ys.max()) if len(ys) else None, m
for nm,(x0,x1,k) in {'maroon':(560,1000,'m'),'finally':(1000,1165,'m'),'cream':(1165,1610,'c')}.items():
    a=ink(s,x0,x1,k); b=ink(r,x0,x1,k)
    iou=(a[2]&b[2]).sum()/(a[2]|b[2]).sum()
    print(nm,'src',a[0],a[1],'ren',b[0],b[1],'IoU %.3f'%iou)
    # column/row profile offsets
    ps=a[2].sum(1); pr=b[2].sum(1)
    best=min(range(-4,5),key=lambda d: np.abs(np.roll(pr,d)-ps).sum()); print('  best dy',best)
