import numpy as np, cv2, sys, time
from skimage import measure
sys.path.insert(0,'.')
from grade import *
P=np.load('bgA_P.npy')
levels=[float(v) for v in sys.argv[1].split(',')]; tol=float(sys.argv[2]); sig=float(sys.argv[3])
Ps=cv2.GaussianBlur(P,(0,0),sig) if sig>0 else P
pad=np.pad(Ps,1,constant_values=0)
tot=0; out=np.zeros((H*4,W*4),np.uint8)
vals=[]
edges=[0]+levels+[1.01]
t0=time.time()
canvas=np.zeros((H,W),np.float32)
for k,l in enumerate(levels):
    cs=measure.find_contours(pad,l)
    band=(Ps>=l)&(Ps<edges[k+2])
    v=float(P[band].mean()) if band.any() else l
    polys=[]
    for c in cs:
        c=measure.approximate_polygon(c,tol)
        if len(c)<3: continue
        polys.append(np.round((c[:,::-1]-1)*16).astype(np.int32))
        tot+=len(c)
    m=np.zeros((H,W),np.uint8)
    # even-odd fill: XOR of each contour fill
    acc=np.zeros((H,W),np.uint8)
    for p in polys:
        mm=np.zeros((H,W),np.uint8); cv2.fillPoly(mm,[p],1,lineType=cv2.LINE_AA,shift=4) if False else cv2.fillPoly(mm,[p],1,shift=4); acc^=mm
    canvas[acc>0]=v; vals.append(v)
print('levels',levels,'vals',[round(v,3) for v in vals],'points',tot,'time',time.time()-t0)
e=np.abs(canvas-P).mean()*255
F=forward(canvas,54.2); G=forward(P,54.2)
eb=np.abs(cv2.GaussianBlur(F,(0,0),6)-cv2.GaussianBlur(G,(0,0),6)).mean()*255
eb2=np.abs(cv2.GaussianBlur(F,(0,0),1.5)-cv2.GaussianBlur(G,(0,0),1.5)).mean()*255
print('sharp MAE',e,'blur6',eb,'blur1.5',eb2)
cv2.imwrite('vec1.png',(np.clip(F,0,1)*255).astype(np.uint8))
