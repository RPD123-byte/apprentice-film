import cv2,numpy as np,math,sys,os,json
sys.path.insert(0,'../../src/shots/s18/trace2'); os.environ['S18SRC']='/Users/computer/rootline/apprentice-film/snapshots/s18-fix1-src/'
from common import pre
def linek(L,th):
    if L<1: return np.ones((1,1),np.float32)
    n=int(L*4)+1; R=int(math.ceil(L/2))+2; k=np.zeros((2*R+1,2*R+1),np.float32)
    for i in range(n):
        u=i/(n-1)-0.5; x=R+u*L*math.cos(th); y=R+u*L*math.sin(th)
        x0=int(math.floor(x)); y0=int(math.floor(y)); fx=x-x0; fy=y-y0
        k[y0,x0]+=(1-fx)*(1-fy); k[y0,x0+1]+=fx*(1-fy); k[y0+1,x0]+=(1-fx)*fy; k[y0+1,x0+1]+=fx*fy
    return k/k.sum()
