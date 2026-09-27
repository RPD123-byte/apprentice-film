import sys, time; sys.path.insert(0,'/Users/computer/rootline/apprentice-film/src/shots/s16/trace')
import tr, cv2, numpy as np, pickle
P=np.load('plate.npy'); Y=P
x0,y0,x1,y1=1150,0,1900,700
L,Sd,Sb=pickle.load(open('exp1.pkl','rb'))
Br=tr.render_levels(L,Y.shape,ss=2,blur=0.8)
c=lambda a:a[y0:y1,x0:x1]
def err(R):
  return [round(np.abs(cv2.GaussianBlur(c(R),(0,0),s)-cv2.GaussianBlur(c(Y),(0,0),s)).mean()*255,2) for s in (1,2,4)]
print('base',err(Br))
print('dark',err(tr.render_strokes(Br,Sd,polarity='dark')))
print('bright',err(tr.render_strokes(Br,Sb,polarity='bright')))
# stats of widths
w=np.array([p[2] for s in Sd for p in s]); print('dark w pct',np.percentile(w,[10,50,90]).round(2))
w=np.array([p[2] for s in Sb for p in s]); print('bright w pct',np.percentile(w,[10,50,90]).round(2))
