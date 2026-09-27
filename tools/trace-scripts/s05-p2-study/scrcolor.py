import sys; sys.path.insert(0,'/Users/computer/rootline/apprentice-film/src/shots/s05/trace')
import numpy as np,cv2,frames,glob
Q=np.float32([[320.7, 246.0], [834.7, 168.7], [900.9, 521.2], [411.9, 644.8]])
dst=np.float32([[0,0],[1600,0],[1600,1000],[0,1000]])
Hm=cv2.getPerspectiveTransform(Q,dst)
f=glob.glob('../s05-p2-proj/outallu/frame-*-at-11.881s.png')[0]
r=cv2.imread(f).astype(np.float32)/255; S=frames.static_target()
ra=cv2.warpPerspective(r,Hm,(1600,1000)); rb=cv2.warpPerspective(S,Hm,(1600,1000))
g=lambda im: cv2.GaussianBlur(np.abs(cv2.Laplacian(cv2.GaussianBlur(im.mean(2),(0,0),2),cv2.CV_32F)),(0,0),4)
flat=(g(ra)<0.01)&(g(rb)<0.01)
flat[:40]=False; flat[-20:]=False; flat[:,:20]=False; flat[:,-20:]=False
print('flat px',flat.sum())
A=ra[flat]; B=rb[flat]
# undo my current LUT? fit directly from current render colours
X=np.hstack([A, np.ones((len(A),1))])
M=np.linalg.lstsq(X,B,rcond=None)[0]
print(M.round(3))
pred=X@M; print('flat err before',np.abs(A-B).mean()*255,'after',np.abs(pred-B).mean()*255)
# whole screen check
allp=ra.reshape(-1,3); Xa=np.hstack([allp,np.ones((len(allp),1))]); out=(Xa@M).reshape(ra.shape)
k=lambda x: cv2.GaussianBlur(x,(0,0),2)
m=np.zeros((1000,1600),bool); m[20:-10,10:-10]=True
print('screen s2 before',np.abs(k(ra)-k(rb))[m].mean()*255,'after',np.abs(k(out)-k(rb))[m].mean()*255)
np.save('scr_M.npy',M)
cv2.imwrite('scr_fit.jpg',cv2.resize(np.vstack([np.clip(out,0,1),rb])*255,None,fx=0.5,fy=0.5).astype(np.uint8))
