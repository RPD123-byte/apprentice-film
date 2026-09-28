import cv2,numpy as np,sys
from scipy.optimize import least_squares
from scipy.special import erf
rd=sys.argv[1]; ks=[int(v) for v in (sys.argv[2] if len(sys.argv)>2 else '764,765').split(',')]
L=lambda I: I[...,2]*0.299+I[...,1]*0.587+I[...,0]*0.114
def fit(p,y):
    def f(q):
        a,b,c,s=q; return a+b*0.5*(1+erf((y-c)/(abs(s)*1.414+1e-6)))-p
    r=least_squares(f,[p[0],p[-1]-p[0],y.mean(),1.0]); return r.x
for k in ks:
    for nm,path in (('src',f'snapshots/s08-p4-src/f{k}.png'),('ren',f'{rd}/r{k}.png')):
        l=L(cv2.imread(path).astype(np.float32))
        out=[];lev=[]
        for x in (1215,1240,1350,1380,1420,1480,1520):
            p=l[34:52,x-3:x+4].mean(1); y=np.arange(34,52).astype(float)
            a,b,c,s=fit(p,y); out.append(f'{c:.1f}/{abs(s):.2f}')
            lev.append(l[22:28,x-3:x+4].mean())
        print(k,nm,'edge y/sigma',' '.join(out),' body',' '.join(f'{v:.0f}' for v in lev))
