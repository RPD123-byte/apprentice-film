# edge sharpness along the red selection's top run: fit an erf-blurred box to the red-channel vertical profile, per x
import cv2,numpy as np,sys
from scipy.optimize import least_squares
from scipy.special import erf
def prof(im,x,y0=470,y1=505):
    return im[y0:y1,x-6:x+7,2].astype(float).mean(1)- im[y0:y1,x-6:x+7,1].astype(float).mean(1)
def fit(p,y0=470):
    y=np.arange(len(p))+y0
    def f(q):
        a,b,c,w,s=q; return b+a*0.5*(erf((y-(c-w/2))/(s*1.414+1e-6))-erf((y-(c+w/2))/(s*1.414+1e-6)))-p
    r=least_squares(f,[p.max()-p.min(),p.min(),487.5,11,1.0])
    return r.x
for name,path in (('src',sys.argv[1]),('ren',sys.argv[2])):
    im=cv2.imread(path)
    out=[]
    for x in range(40,1360,80):
        a,b,c,w,s=fit(prof(im,x)); out.append(f'{x}:{abs(s):.2f}/{w:.1f}/{c:.1f}')
    print(name,' '.join(out))
