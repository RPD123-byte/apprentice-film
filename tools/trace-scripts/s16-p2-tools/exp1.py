import sys, time; sys.path.insert(0,'/Users/computer/rootline/apprentice-film/src/shots/s16/trace')
import tr, cv2, numpy as np
P=np.load('plate.npy')
x0,y0,x1,y1=[int(v) for v in sys.argv[1:5]] if len(sys.argv)>4 else (1150,0,1900,700)
MED=int(sys.argv[5]) if len(sys.argv)>5 else 9
K=int(sys.argv[6]) if len(sys.argv)>6 else 32
Y=P.copy()
t0=time.time()
Bm=cv2.medianBlur((np.clip(Y,0,1)*255).astype(np.uint8),MED).astype(np.float32)/255
mask=np.zeros(Y.shape,bool); mask[y0:y1,x0:x1]=True
edges=[(k+0.5)/K for k in range(K)]
L=tr.levels(Bm,mask,edges,minarea=6,eps=0.7)
Br=tr.render_levels(L,Y.shape,ss=2,blur=0.8)
print('levels',len(L),sum(len(r) for _,r in L),'rings',sum(len(p) for _,r in L for p in r),'pts',round(time.time()-t0,1),'s')
t0=time.time()
Sd=tr.strokes(Y,Br,mask,'dark',sigmas=(1.0,),hi=0.05,lo=0.025,dmin=0.04)
Sb=tr.strokes(Y,Br,mask,'bright',sigmas=(1.0,),hi=0.05,lo=0.025,dmin=0.04)
print('strokes',len(Sd),len(Sb),sum(len(s) for s in Sd)+sum(len(s) for s in Sb),'pts',round(time.time()-t0,1),'s')
R=tr.render_strokes(Br,Sd,polarity='dark'); R=tr.render_strokes(R,Sb,polarity='bright')
c=lambda a:a[y0:y1,x0:x1]
for s in (1,2,4):
  e=np.abs(cv2.GaussianBlur(c(R),(0,0),s)-cv2.GaussianBlur(c(Y),(0,0),s)).mean()*255
  e0=np.abs(cv2.GaussianBlur(c(Br),(0,0),s)-cv2.GaussianBlur(c(Y),(0,0),s)).mean()*255
  print('sigma',s,'err strokes',round(e,2),'base only',round(e0,2))
out=np.hstack([c(R),c(Y)]); cv2.imwrite('exp1.png',(np.clip(out,0,1)*255).astype(np.uint8))
cv2.imwrite('exp1_base.png',(np.clip(c(Br),0,1)*255).astype(np.uint8))
import pickle; pickle.dump((L,Sd,Sb),open('exp1.pkl','wb'))
