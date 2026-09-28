import sys, os, time, json; sys.path.insert(0,'/Users/computer/rootline/apprentice-film/src/shots/s16/trace')
import tr, cv2, numpy as np, pickle
P=np.load('plate.npy') if not os.path.exists('plateE.npy') else np.load('plateE.npy')[90:90+946,90:90+2206]; Y=P
cfg=json.loads(sys.argv[1]); tag=sys.argv[2]
x0,y0,x1,y1=cfg.get('box',[1150,0,1900,700])
MED=cfg.get('med',7); K=cfg.get('K',32)
Y0=Y
if cfg.get('nlm'): Y=tr.denoise(Y,cfg['nlm'])
Bm=cv2.medianBlur((np.clip(Y,0,1)*255).astype(np.uint8),MED).astype(np.float32)/255
mask=np.zeros(Y.shape,bool); mask[y0:y1,x0:x1]=True
L=tr.levels(Bm,mask,[(k+0.5)/K for k in range(K)],minarea=4,eps=cfg.get('eps',0.7))
Br=tr.render_levels(L,Y.shape,ss=2,blur=cfg.get('blur',0.6))
kw=dict(sigmas=tuple(cfg.get('sig',[0.8,1.4])),hi=cfg.get('hi',0.02),lo=cfg.get('lo',0.01),dmin=cfg.get('dmin',0.03),valley=cfg.get('valley',0.015),minlen=cfg.get('minlen',3))
t0=time.time()
fn=tr.strokes2 if cfg.get('s2') else tr.strokes
if cfg.get('s2'): kw['nbins']=cfg.get('nbins',8)
if cfg.get('s3'):
    fn=tr.strokes3; kw=dict(hi=cfg.get('hi',0.035),lo=cfg.get('lo',0.015),dmin=cfg.get('dmin',0.015),valley=cfg.get('valley',0.01),minlen=cfg.get('minlen',3))
Sd=fn(Y,Br,mask,'dark',**kw); Sb=fn(Y,Br,mask,'bright',**kw)
t1=time.time()
(Sd,Sb),g=tr.fit_gains(Y,Br,[(Sd,'dark'),(Sb,'bright')],(x0,y0,x1,y1))
R=tr.render_strokes(Br,Sd,polarity='dark'); R=tr.render_strokes(R,Sb,polarity='bright')
c=lambda a:a[y0:y1,x0:x1]
e=[round(np.abs(cv2.GaussianBlur(c(R),(0,0),s)-cv2.GaussianBlur(c(Y),(0,0),s)).mean()*255,2) for s in (1,2,4)]
eo=[round(np.abs(cv2.GaussianBlur(c(R),(0,0),s)-cv2.GaussianBlur(c(Y0),(0,0),s)).mean()*255,2) for s in (1,2,4)]
e0=[round(np.abs(cv2.GaussianBlur(c(Br),(0,0),s)-cv2.GaussianBlur(c(Y),(0,0),s)).mean()*255,2) for s in (1,2,4)]
print(tag,cfg,'levelpts',sum(len(p) for _,r in L for p in r),'strokes',len(Sd),len(Sb),'spts',sum(len(s) for s in Sd+Sb),'err',e,'vs orig',eo,'base',e0,'trace',round(t1-t0),'fit',round(time.time()-t1),'s')
out=np.hstack([c(R),c(Y)]); cv2.imwrite(f'exp6_{tag}.png',(np.clip(out,0,1)*255).astype(np.uint8))
pickle.dump((L,Sd,Sb),open(f'exp6_{tag}.pkl','wb'))
