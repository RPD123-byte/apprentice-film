import cv2, numpy as np, sys
rdir=sys.argv[1]
def first_dark(im,x,y0,y1,thr=110):
    col=cv2.GaussianBlur(im,(0,0),0.7)[y0:y1,x-1:x+2,1].mean(1)
    for i,v in enumerate(col):
        if v<thr: return y0+i
    return -1
print('t     | src L1550 L1560 R1606 R1618 | ren L1550 L1560 R1606 R1618')
for n in range(3476,3492):
    s=cv2.imread(f'src/f{n}.png').astype(np.float32); r=cv2.imread(f'{rdir}/r-{n/25:.3f}.png').astype(np.float32)
    a=[first_dark(s,x,288,330) for x in (1550,1560,1606,1618)]; b=[first_dark(r,x,288,330) for x in (1550,1560,1606,1618)]
    print(f'{n/25:.2f} | {a} | {b}')
