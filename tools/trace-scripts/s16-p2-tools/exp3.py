import sys, time, json; sys.path.insert(0,'/Users/computer/rootline/apprentice-film/src/shots/s16/trace')
import tr, cv2, numpy as np, pickle
P=np.load('plate.npy'); Y=P
x0,y0,x1,y1=1150,0,1900,700
cfg=json.loads(sys.argv[1]) if len(sys.argv)>1 else {}
MED=cfg.get('med',9); K=cfg.get('K',32)
Bm=cv2.medianBlur((np.clip(Y,0,1)*255).astype(np.uint8),MED).astype(np.float32)/255
if cfg.get('bil',0): Bm=cv2.bilateralFilter(Bm,9,cfg['bil'],4)
mask=np.zeros(Y.shape,bool); mask[y0:y1,x0:x1]=True
L=tr.levels(Bm,mask,[(k+0.5)/K for k in range(K)],minarea=6,eps=cfg.get('eps',0.7))
Br=tr.render_levels(L,Y.shape,ss=2,blur=cfg.get('blur',0.8))
kw=dict(sigmas=tuple(cfg.get('sig',[1.0])),hi=cfg.get('hi',0.05),lo=cfg.get('lo',0.025),dmin=cfg.get('dmin',0.04),valley=cfg.get('valley',0.03),minlen=cfg.get('minlen',5))
t0=time.time()
Sd=tr.strokes(Y,Br,mask,'dark',**kw); Sb=tr.strokes(Y,Br,mask,'bright',**kw)
R=tr.render_strokes(Br,Sd,polarity='dark'); R=tr.render_strokes(R,Sb,polarity='bright')
c=lambda a:a[y0:y1,x0:x1]
e=[round(np.abs(cv2.GaussianBlur(c(R),(0,0),s)-cv2.GaussianBlur(c(Y),(0,0),s)).mean()*255,2) for s in (1,2,4)]
e0=[round(np.abs(cv2.GaussianBlur(c(Br),(0,0),s)-cv2.GaussianBlur(c(Y),(0,0),s)).mean()*255,2) for s in (1,2,4)]
npts=sum(len(p) for _,r in L for p in r)
print(cfg,'levelpts',npts,'strokes',len(Sd),len(Sb),'spts',sum(len(s) for s in Sd+Sb),'err',e,'base',e0,round(time.time()-t0,1),'s')
out=np.hstack([c(R),c(Y)]); cv2.imwrite('exp3.png',(np.clip(out,0,1)*255).astype(np.uint8))
pickle.dump((L,Sd,Sb),open('exp3.pkl','wb'))
