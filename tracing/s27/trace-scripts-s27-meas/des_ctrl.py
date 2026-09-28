import json, numpy as np, cv2
fw=json.load(open('des_fwd.json')); bw=json.load(open('des_bwd.json'))
P0=np.array(fw['P0']); assert np.allclose(P0,np.array(bw['P0']))
# control grid in 125.0 coords
xs=np.arange(-100,1201,110); ys=np.arange(40,1001,110)
G=np.array([(x,y) for y in ys for x in xs])
def local_affine(A,C,q,sig=140):
    d2=((A-q)**2).sum(1); w=np.exp(-d2/(2*sig*sig))
    if w.sum()<5:  # too few near: widen
        w=np.exp(-d2/(2*(sig*3)**2))
    W=np.sqrt(w)[:,None]
    X=np.c_[A-q,np.ones(len(A))]
    # robust: 2 IRLS iterations
    for it in range(3):
        M,_,_,_=np.linalg.lstsq(X*W,C*W,rcond=None)
        r=np.linalg.norm(X@M-C,axis=1); w2=w*(1/(1+(r/6)**2)); W=np.sqrt(w2)[:,None]
    return M[2]
out={'grid':G.tolist(),'frames':{'125.0':G.tolist()}}
for src in (fw,bw):
    for t,d in src['tracks'].items():
        A=P0[d['alive']]; C=np.array(d['pts'])
        if len(A)<12: continue
        out['frames'][t]=[local_affine(A,C,q).round(1).tolist() for q in G]
json.dump(out,open('des_ctrl.json','w'))
print(len(out['frames']),'frames')
