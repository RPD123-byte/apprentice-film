import numpy as np, cv2, sys, time
from skimage import measure
sys.path.insert(0,'.')
from grade import *
def vectorize(P, levels, tol, sig=0.0, minpts=3, minarea=0.0):
    Ps=cv2.GaussianBlur(P,(0,0),sig) if sig>0 else P
    pad=np.pad(Ps,1,constant_values=0)
    edges=levels+[1.01]; out=[]
    for k,l in enumerate(levels):
        band=(Ps>=l)&(Ps<edges[k+1])
        v=float(P[band].mean()) if band.any() else l
        polys=[]
        for c in measure.find_contours(pad,l):
            c=measure.approximate_polygon(c,tol)
            if len(c)<minpts+1: continue
            xy=c[:-1,::-1]-1
            if minarea>0:
                a=0.5*abs(np.dot(xy[:,0],np.roll(xy[:,1],1))-np.dot(xy[:,1],np.roll(xy[:,0],1)))
                if a<minarea: continue
            polys.append(xy)
        out.append((l,v,polys))
    return out
def raster(vec, H=H, W=W, ss=4, bg=0.0):
    canvas=np.full((H,W),bg,np.float32)
    for l,v,polys in vec:
        m=np.zeros((H*ss,W*ss),np.uint8)
        pts=[np.round((p+0.5)*ss*16-0.5*16).astype(np.int32) for p in polys]
        cv2.fillPoly(m,pts,255,shift=4)
        cov=cv2.resize(m,(W,H),interpolation=cv2.INTER_AREA).astype(np.float32)/255
        canvas=canvas*(1-cov)+v*cov
    return canvas
def score(canvas,P,t):
    F=forward(canvas,t); G=forward(P,t)
    return (np.abs(canvas-P).mean()*255, np.abs(cv2.GaussianBlur(F,(0,0),6)-cv2.GaussianBlur(G,(0,0),6)).mean()*255,
            np.abs(cv2.GaussianBlur(F,(0,0),1.5)-cv2.GaussianBlur(G,(0,0),1.5)).mean()*255)
if __name__=='__main__':
    P=np.load(sys.argv[4] if len(sys.argv)>4 else 'bgA_P.npy')
    levels=[float(v) for v in sys.argv[1].split(',')]; tol=float(sys.argv[2]); sig=float(sys.argv[3])
    t0=time.time(); vec=vectorize(P,levels,tol,sig); n=sum(len(p) for _,_,ps in vec for p in ps)
    c=raster(vec); print('pts',n,'polys',sum(len(ps) for _,_,ps in vec),'vals',[round(v,3) for _,v,_ in vec],'err sharp/b6/b1.5 %.2f %.2f %.2f'%score(c,P,54.2),'t %.1f'%(time.time()-t0))
    cv2.imwrite('vec2.png',(forward(c,54.2)*255).astype(np.uint8))
