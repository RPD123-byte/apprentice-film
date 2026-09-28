import numpy as np
from scipy.optimize import least_squares
T=np.load('tracks.npy'); F,N,_=T.shape
p0=T[0]
def unpack(x):
    c=x[:2]; d=np.concatenate([[0],x[2:F+1]]); e=np.concatenate([[[0,0]],x[F+1:F+1+2*(F-1)].reshape(F-1,2)]); w=x[F+1+2*(F-1):]
    return c,d,e,w
def res(x):
    c,d,e,w=unpack(x)
    k=1/(1-d[:,None]*w[None,:])
    pred=c[None,None,:]+((p0[None,:,:]-c[None,None,:])-e[:,None,:]*w[None,:,None])*k[:,:,None]
    r=(pred-T).ravel()
    return np.concatenate([r,[ (np.median(w)-1)*100 ]])
x0=np.concatenate([[1103,643],np.linspace(0,0.5,F)[1:],np.zeros(2*(F-1)),np.ones(N)])
r=least_squares(res,x0,loss='soft_l1',f_scale=3)
c,d,e,w=unpack(r.x)
print('c',c); print('d',np.round(d,4)); print('e',np.round(e,1).tolist())
er=res(r.x)[:-1].reshape(F,N,2); err=np.linalg.norm(er,axis=2)
print('median err',np.median(err),'p90',np.percentile(err,90),'max',err.max())
