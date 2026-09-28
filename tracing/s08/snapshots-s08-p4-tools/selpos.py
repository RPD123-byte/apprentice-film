# red selection line centre in F0 (new camera): top run y (at several x) and right run x (at several y), source vs render
import cv2,numpy as np,sys
sys.path.insert(0,'snapshots/s08-p4-tools')
import importlib, cam; importlib.reload(cam)
from cam import f0
rd=sys.argv[1]
def redness(im): im=im.astype(np.float32); return np.clip(im[...,2]-0.5*(im[...,1]+im[...,0]),0,None)
def cen(p,o):
    w=np.clip(p-p.max()*0.3,0,None); return o+(np.arange(len(p))*w).sum()/w.sum()
for k in (764,770,780,790,800,807,814):
    out=[]
    for nm,path in (('S',f'snapshots/s08-p4-src/f{k}.png'),('R',f'{rd}/r{k}.png')):
        R=redness(f0(cv2.imread(path),k,cv2.INTER_LINEAR))
        ys=[cen(R[475:500,x-3:x+4].mean(1),475) for x in (700,900,1100,1300) if True]
        xs=[cen(R[y-3:y+4,1368:1392].mean(0),1368) for y in (520,560,600)]
        out.append(nm+' y '+' '.join(f'{v:.2f}' for v in ys)+' | x '+' '.join(f'{v:.2f}' for v in xs))
    print(k,'  '.join(out))
