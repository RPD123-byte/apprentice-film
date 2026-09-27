import sys; sys.path.insert(0,'.')
import numpy as np, cv2, math, json
from owlB_prep import TB
_Z=np.load('owlB_frames.npz')
X0,Y0,X1,Y1=900,0,2206,420
Z={k:_Z[k][Y0:Y1,X0:X1].copy() for k in _Z.files if int(k[1:])<=1416}
TAILTIP={1382:[1942,92],1383:[1906,50],1384:[1875,48],1385:[1867,50],1386:[1864,79],1387:[1855,131],1388:[1845,156],1389:[1836,161],1390:[1831,159],1391:[1825,131],1392:[1817,122],1393:[1809,121],1394:[1795,127],1395:[1783,130],1396:[1771,134],1397:[1764,138],1398:[1760,160],1399:[1758,185],1400:[1757,162],1401:[1757,162],1402:[1742,124],1403:[1728,124],1404:[1713,166],1405:[1700,195],1406:[1694,189],1407:[1678,191],1408:[1630,199],1409:[1561,175],1410:[1499,143],1411:[1444,139],1412:[1398,161],1413:[1370,175],1414:[1340,188],1415:[1310,200],1416:[1312,212]}
BASE=np.array([1500.,150.]); TIP0=np.array([1942.,92.])
def A0(n):
    dx,dy=TB[n]; b=BASE+[dx,dy]; tt=np.array(TAILTIP[n],float)
    a0=math.atan2(*(TIP0-BASE)[::-1]); a1=math.atan2(*(tt-b)[::-1]); k=np.linalg.norm(tt-b)/np.linalg.norm(TIP0-BASE)
    R=np.array([[math.cos(a1-a0),-math.sin(a1-a0)],[math.sin(a1-a0),math.cos(a1-a0)]])@np.diag([k,1])
    # frame = b + R (p - BASE)
    A=np.eye(3); A[:2,:2]=R; A[:2,2]=b-R@BASE; return A
def owlmask(n):
    return (np.abs(cv2.GaussianBlur(Z[f'P{n}'],(0,0),1.5)-cv2.GaussianBlur(Z[f'E{n}'],(0,0),1.5))>0.12).astype(np.float32)
xs=np.arange(X0,X1)[None,:]; ys=np.arange(Y0,Y1)[:,None]
def tailzone(img): return img*((xs>1470)&(ys<300))
Rimg=Z['P1382']; Rm=tailzone(owlmask(1382))
Rm=cv2.morphologyEx(Rm,cv2.MORPH_CLOSE,np.ones((9,9),np.uint8))
OFF=np.array([[1,0,X0],[0,1,Y0],[0,0,1]],np.float64)
def wa(img,A):
    C=np.linalg.inv(OFF)@A@OFF
    return cv2.warpAffine(img.astype(np.float32),C[:2].astype(np.float32),(X1-X0,Y1-Y0),flags=cv2.INTER_LINEAR,borderValue=0)
res={}
for it in range(2):
    for n in range(1382,1417):
        A=A0(n) if it==0 else res[n]
        W=wa(Rimg*Rm,A); m=(wa(Rm,A)>0.5).astype(np.uint8); m=cv2.erode(m,np.ones((5,5),np.uint8))
        if m.sum()<500: res[n]=A; continue
        D=np.eye(2,3,dtype=np.float32)
        try:
            cc,D=cv2.findTransformECC(cv2.GaussianBlur(Z[f'P{n}']*m,(0,0),1.5),cv2.GaussianBlur(W,(0,0),1.5),D,cv2.MOTION_AFFINE,(cv2.TERM_CRITERIA_EPS|cv2.TERM_CRITERIA_COUNT,200,1e-6),m,5)
        except cv2.error: cc=-1
        D3=OFF@np.vstack([D,[0,0,1]]).astype(np.float64)@np.linalg.inv(OFF); An=np.linalg.inv(D3)@A
        e0=np.abs(wa(Rimg,A)-Z[f'P{n}'])[m>0].mean()*255; e1=np.abs(wa(Rimg,An)-Z[f'P{n}'])[m>0].mean()*255
        res[n]=An if e1<e0 else A
        if it==1: print(n,'cc %.3f'%cc,'%.1f->%.1f'%(e0,e1))
    # new reference = median of the tails registered into 1382 space
    stack=[];ms=[]
    for n in range(1382,1417):
        Ai=np.linalg.inv(res[n]); stack.append(wa(Z[f'P{n}'],Ai)); ms.append(wa(owlmask(n),Ai)>0.5)
    ms=np.array(ms); stack=np.array(stack)
    cons=ms.mean(0)*((xs>1440)&(ys<320))
    Rimg=np.median(stack,0).astype(np.float32); Rm=(cons>0.5).astype(np.float32)
full=np.zeros((946,2206),np.float32); full[Y0:Y1,X0:X1]=Rimg; np.save('B_tail.npy',full)
fc=np.zeros((946,2206),np.float32); fc[Y0:Y1,X0:X1]=cons; np.save('B_tailcons.npy',fc)
json.dump({n:res[n][:2].tolist() for n in res},open('B_tailA.json','w'))
cv2.imwrite('B_tail_view.jpg',np.hstack([(np.clip(Rimg,0,1)*255).astype(np.uint8),(cons*255).astype(np.uint8)]))
