import sys, time; sys.path.insert(0,'/Users/computer/rootline/apprentice-film/src/shots/s16/trace')
import tr, cv2, numpy as np, pickle
P=np.load('plate.npy'); Y=P
x0,y0,x1,y1=1150,0,1900,700
L,Sd,Sb=pickle.load(open('exp3.pkl','rb'))
Br=tr.render_levels(L,Y.shape,ss=2,blur=0.8)
t0=time.time()
(Sd2,Sb2),g=tr.fit_gains(Y,Br,[(Sd,'dark'),(Sb,'bright')],(x0,y0,x1,y1))
print('fit',round(time.time()-t0,1),'s','gains pct',np.percentile(g,[10,50,90]).round(2), len(Sd2),len(Sb2))
R=tr.render_strokes(Br,Sd2,polarity='dark'); R=tr.render_strokes(R,Sb2,polarity='bright')
c=lambda a:a[y0:y1,x0:x1]
e=[round(np.abs(cv2.GaussianBlur(c(R),(0,0),s)-cv2.GaussianBlur(c(Y),(0,0),s)).mean()*255,2) for s in (1,2,4)]
print('err',e)
pickle.dump((L,Sd2,Sb2),open('exp5.pkl','wb'))
out=np.hstack([c(R),c(Y)]); cv2.imwrite('exp5.png',(np.clip(out,0,1)*255).astype(np.uint8))
