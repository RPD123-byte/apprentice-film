import numpy as np
from scipy.optimize import least_squares
T=np.load('tracks.npy'); F,N,_=T.shape
p0=T[0]
def unpack(x):
    f=x[:2]; d=np.concatenate([[0],x[2:2+F-1]]); w=x[2+F-1:]
    return f,d,w
def res(x):
    f,d,w=unpack(x)
    k=1/(1-d[:,None]*w[None,:])   # F x N
    pred=f[None,None,:]+(p0[None,:,:]-f[None,None,:])*k[:,:,None]
    return (pred-T).ravel()
# init: w=1 for all, d from similarity
x0=np.concatenate([[1100,600],np.linspace(0,0.5,F)[1:],np.ones(N)])
r=least_squares(res,x0,loss='soft_l1',f_scale=3)
f,d,w=unpack(r.x)
# normalize so median w = 1
m=np.median(w); w/=m; d*=m
print('FOE',f)
print('d',np.round(d,4))
e=res(r.x).reshape(F,N,2); err=np.linalg.norm(e,axis=2)
print('median err',np.median(err),'p90',np.percentile(err,90))
order=np.argsort(w)
for i in order: print(f'{p0[i,0]:7.1f} {p0[i,1]:6.1f}  w={w[i]:.3f}  err={err[:,i].max():.1f}')
