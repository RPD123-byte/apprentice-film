import cv2,numpy as np,sys
sys.path.insert(0,'snapshots/s08-p4-tools')
from cam import f0
rd=sys.argv[1]
def redness(im): im=im.astype(np.float32); return np.clip(im[...,2]-0.5*(im[...,1]+im[...,0]),0,None)
def cen(p,o):
    w=np.clip(p-p.max()*0.3,0,None); return o+(np.arange(len(p))*w).sum()/w.sum()
for k in range(764,815,2):
    v=[]
    for path in (f'snapshots/s08-p4-src/f{k}.png',f'{rd}/r{k}.png'):
        R=redness(f0(cv2.imread(path),k,cv2.INTER_LINEAR))
        ys=np.mean([cen(R[475:500,x-8:x+9].mean(1),475) for x in (500,600,700,800,900)])
        xs=np.mean([cen(R[y-8:y+9,1368:1392].mean(0),1368) for y in (520,560,600,640)])
        v.append((ys,xs))
    print(k, f'{(k-764)/25:.2f}', f'dy {v[0][0]-v[1][0]:+.2f}  dx {v[0][1]-v[1][1]:+.2f}')
