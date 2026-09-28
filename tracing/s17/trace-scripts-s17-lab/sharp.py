exec(open('/Users/computer/rootline/apprentice-film/snapshots/s17-lab/shotlab.py').read().split("if __name__")[0])
import math
build()
ts=[47.84,47.92,48.0,48.08,48.16,48.24,48.32,48.4,48.48,48.8]
img=render(ts,(0,0,2206,946),1,1,'sharp',grade=True)
c=cv2.VideoCapture(V)
def lap(g,reg):
    x0,y0,x1,y1=reg; h=cv2.resize(g[y0:y1,x0:x1],None,fx=0.5,fy=0.5,interpolation=cv2.INTER_AREA); return cv2.Laplacian(h.astype(np.float32),cv2.CV_32F).var()
R=[(0,100,500,700),(1500,300,2206,900),(760,250,970,430)]
res=[]
for i,t in enumerate(ts):
    r=cv2.cvtColor(img[i*946:(i+1)*946],cv2.COLOR_BGR2GRAY)
    c.set(cv2.CAP_PROP_POS_FRAMES,round(t*25)); ok,f=c.read(); s=cv2.cvtColor(f,cv2.COLOR_BGR2GRAY)
    res.append((t,[lap(r,q) for q in R],[lap(s,q) for q in R]))
base_r=res[-1][1]; base_s=res[-1][2]
for t,a,b in res:
    print(f"{t:.2f} render ratio "+' '.join(f'{x/y:.2f}' for x,y in zip(a,base_r))+"   source ratio "+' '.join(f'{x/y:.2f}' for x,y in zip(b,base_s)))
