# headtrack.py -- the shared head drawing (104.60) tracked on every standing frame: ECC affine (frame px), then
# converted to the 104.60 page space: A_page(f) = CAM(f)^-1 . A(f) . CAM(2615)
from ecc import *
import json
M=json.load(open('../s25-meas/motion.json'))
def cam(f):
    i=f-M['CAM_F0']
    if i<0: return np.eye(3)
    c=M['CAM'][min(i,len(M['CAM'])-1)]
    return np.array([[c[0],c[2],c[4]],[c[1],c[3],c[5]],[0,0,1]])
box=(890,330,1230,560)
out={}
prev=None
for f in range(2577,2763):
    A=None
    if prev is not None:
        A,cc=ecc(2615,f,box,init=prev.reshape(-1),pad=40)
    if A is None or cc<0.9:
        A0,sc=search(2615,f,box,scales=(0.9,0.95,1.0,1.05,1.1),rots=(-0.1,-0.05,0,0.05,0.1),region=(700,150,1500,946))
        A1,cc1=ecc(2615,f,box,init=A0.reshape(-1),pad=40)
        if A1 is not None and (A is None or cc1>cc): A,cc=A1,cc1
    prev=A
    Af=np.vstack([A,[0,0,1]])
    Ap=np.linalg.inv(cam(f))@Af@cam(2615)
    out[f]=[round(float(v),5) for v in Ap[:2].T.reshape(-1)]+[round(float(cc),3)]  # canvas order a b c d e f
    if f%10==0 or cc<0.95: print(f,f/25,'cc %.3f'%cc,np.round(Ap[:2],4).tolist())
json.dump(out,open('../s25-meas/headtrack.json','w'))
