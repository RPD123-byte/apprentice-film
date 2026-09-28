import cv2, numpy as np, json, sys
from scipy.interpolate import griddata
sys.path.insert(0,'/Users/computer/rootline/apprentice-film/snapshots/s27-meas')
from common import load
H,W=946,2206
yy,xx=np.mgrid[0:H,0:W]; PIX=np.stack([xx.ravel(),yy.ravel()],1).astype(np.float32)
def warp(ta,tb,Pa,Pb):
    q=griddata(Pb,Pa,PIX,method='linear'); q=np.nan_to_num(q,nan=-1e4).astype(np.float32)
    return cv2.remap(cv2.cvtColor(load(ta),cv2.COLOR_BGR2GRAY),q[:,0].reshape(H,W),q[:,1].reshape(H,W),cv2.INTER_LINEAR)
tracks={n:json.load(open(f'/Users/computer/rootline/apprentice-film/snapshots/s27-k-trace/{n}.json'))['frames'] for n in ['des_fwd','des_chain']}
K=[127.88,128.2,128.44,128.68,128.92,129.12,129.28]
for ta,tb in zip(K[:-1],K[1:]):
    M=cv2.imread(f'/Users/computer/rootline/apprentice-film/snapshots/s27-k-mask/dk-{tb}.png')[...,0]>128
    B=cv2.cvtColor(load(tb),cv2.COLOR_BGR2GRAY).astype(np.float32)
    line=f'{ta}->{tb}'
    for n,T in tracks.items():
        w=warp(ta,tb,np.array(T[str(ta)]),np.array(T[str(tb)])).astype(np.float32)
        line+=f'  {n} {np.abs(w-B)[M].mean():.1f}'
    print(line)
