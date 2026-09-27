# per-frame pre-grade P (inverse grade of the full source frame), registered on PATH_A, cropped; plus diff masks
import sys; sys.path.insert(0,'../s18fix1'); sys.path.insert(0,'.')
from src import *
from grade import inverse
bg=np.load('../bgA.npy').astype(np.float32)
Pbg=np.load('bgA_P.npy')
X0,Y0,X1,Y1=360,60,1100,660
def regimg(img,n):
    dx,dy=PATH_A[n]; M=np.float32([[1,0,-dx],[0,1,-dy]])
    return cv2.warpAffine(img,M,(2206,946),borderValue=0)[Y0:Y1,X0:X1]
Ps={}; Ds={}
for n in range(1331,1382):
    f=frame(n,True).astype(np.float32)
    P=inverse(f/255,n/25)
    d=np.abs(cv2.GaussianBlur(f,(0,0),1.5)-cv2.GaussianBlur(bg,(0,0),1.5))
    Ps[n]=regimg(P,n); Ds[n]=regimg(d,n)
np.savez_compressed('owlstack.npz',**{f'P{n}':Ps[n] for n in Ps},**{f'D{n}':Ds[n] for n in Ds})
print('ok')
