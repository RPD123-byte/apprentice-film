import sys; sys.path.insert(0,'/Users/computer/rootline/apprentice-film/src/shots/s16/trace')
import tr, cv2, numpy as np
P=np.load('plate.npy'); Y=P
x0,y0,x1,y1=1150,0,1900,700
c=lambda a:a[y0:y1,x0:x1]
mask=np.zeros(Y.shape,bool); mask[y0:y1,x0:x1]=True
for MED in (3,5,7,9):
  Bm=cv2.medianBlur((np.clip(Y,0,1)*255).astype(np.uint8),MED).astype(np.float32)/255
  for K in (32,64):
    L=tr.levels(Bm,mask,[(k+0.5)/K for k in range(K)],minarea=4,eps=0.7)
    Br=tr.render_levels(L,Y.shape,ss=2,blur=0.6)
    e0=[round(np.abs(cv2.GaussianBlur(c(Br),(0,0),s)-cv2.GaussianBlur(c(Y),(0,0),s)).mean()*255,2) for s in (1,2,4)]
    e1=[round(np.abs(cv2.GaussianBlur(c(Bm),(0,0),s)-cv2.GaussianBlur(c(Y),(0,0),s)).mean()*255,2) for s in (1,2,4)]
    print(MED,K,'pts',sum(len(p) for _,r in L for p in r),'levels',e0,'median itself',e1)
