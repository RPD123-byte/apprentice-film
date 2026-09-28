# fit the keyboard's quad (its key grid, a MacBook-like layout) to the rest frame: maximise the correlation between a
# rasterised key pattern and the source's keyboard (hands masked out). Measures 8 numbers (the four corners).
import numpy as np, cv2, json
from scipy.optimize import minimize
u=np.load('TB_u.npy').mean(2).astype(np.float32); ub=cv2.GaussianBlur(u,(0,0),1.5)
ROWS=[(0.0,0.105,[1]*14),(0.135,0.3,[1]*13+[1.5]),(0.33,0.495,[1.5]+[1]*12+[1]),(0.525,0.69,[1.8]+[1]*11+[1.8]),(0.72,0.885,[2.3]+[1]*10+[2.3]),(0.915,1.0,[1,1,1,1.25,5,1.25,1,1,1,1])]
GAP=0.012
def keys_unit():
    out=[]
    for v0,v1,W in ROWS:
        tot=sum(W); u=0
        for w in W:
            u0=u+GAP/2; u1=u+w/tot-GAP/2; u+=w/tot
            out.append((u0,v0+0.012,u1,v1-0.012))
    return out
KU=keys_unit()
# hands and fingers masked (rough polygons)
MASK=np.zeros(u.shape,np.uint8)
cv2.fillPoly(MASK,[np.array([[440,680],[945,545],[1055,612],[580,795]],np.int32)],1)
for P in [[[590,640],[700,640],[760,650],[850,700],[900,800],[900,946],[700,946],[595,760]],[[855,700],[900,640],[1000,600],[1200,620],[1200,800],[860,745]]]:
    cv2.fillPoly(MASK,[np.array(P,np.int32)],0)
ys,xs=np.nonzero(MASK)
def render(q):
    H=cv2.getPerspectiveTransform(np.float32([[0,0],[1,0],[1,1],[0,1]]),np.float32(q))
    img=np.full(u.shape,0.62,np.float32)
    for (u0,v0,u1,v1) in KU:
        pts=cv2.perspectiveTransform(np.float32([[[u0,v0],[u1,v0],[u1,v1],[u0,v1]]]),H)[0]
        cv2.fillPoly(img,[np.round(pts*4).astype(np.int32)],0.05,lineType=cv2.LINE_AA,shift=2)
    return cv2.GaussianBlur(img,(0,0),1.5)
def cost(p):
    q=p.reshape(4,2); r=render(q)
    a=r[ys,xs]; b=ub[ys,xs]; a=a-a.mean(); b=b-b.mean()
    return -float((a*b).sum()/np.sqrt((a*a).sum()*(b*b).sum()))
q0=np.array([[462,694],[932,561],[1040,617],[588,778]],float)
print('start',cost(q0.ravel()))
res=minimize(cost,q0.ravel(),method='Powell',options=dict(xtol=0.3,ftol=1e-5,maxiter=4000))
q=res.x.reshape(4,2); print('end',res.fun,np.round(q,1).tolist())
json.dump(np.round(q,1).tolist(),open('kbd_quad.json','w'))
r=render(q); v=np.stack([ub*255,r*255,ub*255],2).astype(np.uint8)
cv2.imwrite('kbfit.jpg',v[520:820,420:1080],[cv2.IMWRITE_JPEG_QUALITY,90])
