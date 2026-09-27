import cv2, numpy as np, sys, os
rdir=sys.argv[1] if len(sys.argv)>1 else 'base_all'
ns=range(3490,3504)
s=np.mean([cv2.imread(f'src/f{n}.png').astype(float) for n in ns],0)
r=np.mean([cv2.imread(f'{rdir}/r-{n/25:.3f}.png').astype(float) for n in ns if os.path.exists(f'{rdir}/r-{n/25:.3f}.png')],0)
L=lambda a: a[...,2]*0.299+a[...,1]*0.587+a[...,0]*0.114
Ls,Lr=L(s),L(r)
for x0,x1,y0,y1 in [(1530,1582,268,300),(1586,1644,266,300)]:
    for x in range(x0,x1,2):
        cs=Ls[y0:y1,x]; cr=Lr[y0:y1,x]
        ys=y0+cs.argmin(); yr=y0+cr.argmin()
        print(f'x{x}: src min L {cs.min():5.1f} @y{ys}  ren min L {cr.min():5.1f} @y{yr}   src top-band L {np.sort(cs)[:6].mean():5.1f} ren {np.sort(cr)[:6].mean():5.1f}')
    print()
