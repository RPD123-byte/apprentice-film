import cv2,numpy as np
s=cv2.imread('src/f3450.png').astype(float); r=cv2.imread('out/r-138.000.png').astype(float)
def amt(im,x0,x1,kind):
    c=im[645:725,x0:x1]; L=c@[0.114,0.587,0.299]
    # local sky level: median of rows just above/below the tagline
    sky=np.median(np.r_[im[630:640,x0:x1].reshape(-1,3),im[728:736,x0:x1].reshape(-1,3)]@[0.114,0.587,0.299])
    if kind=='m': ink=np.clip((sky-L)/(sky-62),0,1)
    else: ink=np.clip((L-sky)/(232-sky),0,1)
    ys=np.nonzero(ink.sum(1)>3)[0]
    cy=(ink.sum(1)*np.arange(len(ink))).sum()/ink.sum()+645
    return ink.sum(),sky,cy
for nm,(x0,x1,k) in {'Relax':(560,720,'m'),'Your':(722,846,'m'),'agent':(848,1000,'m'),'finally':(1002,1163,'m'),'understands':(1166,1494,'c'),'you.':(1495,1610,'c')}.items():
    a=amt(s,x0,x1,k); b=amt(r,x0,x1,k)
    print(f'{nm:12s} src {a[0]:7.0f} ren {b[0]:7.0f} ratio {b[0]/a[0]:.3f}  sky {a[1]:.0f}/{b[1]:.0f}  centroid y {a[2]:.2f}/{b[2]:.2f}')
