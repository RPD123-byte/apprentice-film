import sys; sys.path.insert(0,'/Users/computer/rootline/apprentice-film/src/shots/s18/trace'); sys.path.insert(0,'.')
import numpy as np, cv2
from trace_plate import build
from vec4 import raster as raster1
Z=np.load('owlB_frames.npz')
def comps(m, keep=99, minA=0):
    n, lab, st, _ = cv2.connectedComponentsWithStats(m, 8)
    idx = [1 + i for i in np.argsort(-st[1:, 4])[:keep] if st[1 + i, 4] >= minA]
    return (np.isin(lab, idx) * 255).astype(np.uint8)
def fillholes(m):
    h, w = m.shape; ff = np.pad(m, 1); pad = np.zeros((h + 4, w + 4), np.uint8)
    cv2.floodFill(ff, pad, (0, 0), 255); return m | (~ff[1:-1, 1:-1] & 255)
for n in [int(v) for v in sys.argv[1].split(',')]:
    P=Z[f'P{n}']; E=Z[f'E{n}']
    d=np.abs(cv2.GaussianBlur(P,(0,0),1.5)-cv2.GaussianBlur(E,(0,0),1.5))
    r=((d>0.1)*255).astype(np.uint8); r=cv2.morphologyEx(r,cv2.MORPH_OPEN,np.ones((5,5),np.uint8)); r=cv2.morphologyEx(r,cv2.MORPH_CLOSE,np.ones((11,11),np.uint8))
    r=comps(fillholes(r),minA=250); r=cv2.dilate(r,np.ones((5,5),np.uint8))
    Pn=cv2.GaussianBlur(P,(0,0),0.9)
    L=build(Pn,[-1,0.22,0.5,0.78],eps=0.7,bigA=300,mask=(r>0).astype(np.uint8),minarea=1.5)
    H,W=P.shape; c=np.zeros((H,W),np.float32); a=np.zeros((H,W),np.float32)
    for lay in L:
        gs=[g for v,g in lay]; vals=[(v/255,0.,0.) if not isinstance(v,list) else ((v[2]+v[5])/510,0.,0.) for v,g in lay]
        c=raster1(gs,vals,H=H,W=W,canvas=c)
    m=r>0; res=[]
    for s in [0,1,2,3,4,6,8]:
        # premultiplied blur of the layer over E
        al=m.astype(np.float32)
        if s>0: cb=cv2.GaussianBlur(c*al,(0,0),s); ab=cv2.GaussianBlur(al,(0,0),s)
        else: cb=c*al; ab=al
        comp=cb+E*(1-ab)
        res.append('%g:%.2f'%(s,np.abs(comp-P).mean()*255))
    print(n,' '.join(res))
