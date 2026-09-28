import sys
from lib import *
d=sys.argv[1]
S=np.load('x/S9.npy'); R=mean_ren([137.6,138.0,138.4,138.8],d)
f=lambda I:cv2.GaussianBlur(0.299*I[...,0]+0.587*I[...,1]+0.114*I[...,2],(0,0),0.8)
Ls,Lr=f(S),f(R)
out=[]
for y in range(792,872,4):
    xs=int(290+np.argmin(Ls[y,290:345])); xr=int(290+np.argmin(Lr[y,290:345]))
    out.append((y,xs,xr))
print(out)
