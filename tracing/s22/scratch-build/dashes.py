import cv2, glob, re, numpy as np, sys
D=sys.argv[1]
def pairs():
    out=[]
    for p in glob.glob(D+'/frame-*.png'):
        t=float(re.search(r'at-([\d.]+)s',p).group(1))
        r=p.replace('frame-','ref-')
        import os
        if os.path.exists(r): out.append((t,p,r))
    return sorted(out)
def count(im, side):
    g=im.astype(float)
    n=0; last=-1
    if side=='top':
        for i in range(86):
            x=192+i*20.706; y=186
            on=g[y-2:y+3,int(x+4):int(x+11)].mean(); off=g[y-2:y+3,int(x+16.5):int(x+19.5)].mean()
            if on>140 and on-off>40: last=i
        return last+1
    if side=='bot':
        for i in range(86):
            x=1976-i*20.68-15; y=361
            on=g[y-2:y+3,int(x+4):int(x+11)].mean(); off=g[y-2:y+3,int(x-4.5):int(x-1.5)].mean()
            if on>140 and on-off>40: last=i
        return last+1
for t,p,r in pairs():
    a=cv2.imread(p,0); b=cv2.imread(r,0)
    print('%.2f top R %2d S %2d | bot R %2d S %2d'%(t,count(a,'top'),count(b,'top'),count(a,'bot'),count(b,'bot')))
