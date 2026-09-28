import sys; sys.path.insert(0,'/Users/computer/rootline/apprentice-film/src/shots/s05/trace')
import numpy as np,cv2,frames,glob,json
from sklearn.isotonic import IsotonicRegression
Q=np.float32([[320.7, 246.0], [834.7, 168.7], [900.9, 521.2], [411.9, 644.8]])
dst=np.float32([[0,0],[1600,0],[1600,1000],[0,1000]])
Hm=cv2.getPerspectiveTransform(Q,dst)
f=glob.glob('../s05-p2-proj/outu/frame-*.png')[0]      # ungraded render at 25.00 (current LUT applied)
r=cv2.imread(f).astype(np.float32)/255; S=frames.static_target()
ra=cv2.warpPerspective(r,Hm,(1600,1000)); rb=cv2.warpPerspective(S,Hm,(1600,1000))
ya,yb=ra.mean(2),rb.mean(2)
m=lambda x: cv2.blur(x,(15,15))
va=m(ya*ya)-m(ya)**2; vb=m(yb*yb)-m(yb)**2; cab=m(ya*yb)-m(ya)*m(yb)
corr=cab/np.sqrt(np.maximum(va*vb,1e-8))
flat=(va<2e-4)&(vb<2e-4)
good=((corr>0.7)|flat); good[:30]=False; good[-15:]=False; good[:,:15]=False; good[:,-15:]=False
good&=np.abs(cv2.GaussianBlur(ya,(0,0),3)-cv2.GaussianBlur(yb,(0,0),3))<0.25
print('good frac',good.mean())
A=cv2.GaussianBlur(ra,(0,0),1.5)[good]; B=cv2.GaussianBlur(rb,(0,0),1.5)[good]
curves={}
for c,n in zip((2,1,0),'rgb'):
  ir=IsotonicRegression(out_of_bounds='clip').fit(A[:,c],B[:,c])
  x=np.linspace(0,1,17); curves[n]=ir.predict(x).round(3).tolist()
  print(n,curves[n])
out=ra.copy()
for c,n in zip((2,1,0),'rgb'): out[...,c]=np.interp(ra[...,c],np.linspace(0,1,17),curves[n])
k=lambda x: cv2.GaussianBlur(x,(0,0),2)
mm=np.zeros((1000,1600),bool); mm[20:-10,10:-10]=True
print('screen s2 before',np.abs(k(ra)-k(rb))[mm].mean()*255,'after',np.abs(k(out)-k(rb))[mm].mean()*255)
json.dump(curves,open('scr_curves.json','w'))
