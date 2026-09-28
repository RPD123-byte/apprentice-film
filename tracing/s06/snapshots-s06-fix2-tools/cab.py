import sys
from util import *
d=sys.argv[1]; F=[int(v) for v in sys.argv[2].split(',')]
res=[]
for n in F:
    a=ren(d,n); b=src(n)
    r=[]
    for (x0,y0,x1,y1) in ((285,120,475,290),(410,125,450,350)):
        A=a[y0:y1,x0:x1]; Bb=b[y0:y1,x0:x1]; th=np.percentile(Bb,98); m=Bb>=th
        r+= [A[m].mean(), Bb[m].mean()]
    r.append(np.abs(cv2.GaussianBlur(a,(0,0),1.5)-cv2.GaussianBlur(b,(0,0),1.5))[120:350,285:475].mean())
    r.append(np.abs(cv2.GaussianBlur(a,(0,0),5)-cv2.GaussianBlur(b,(0,0),5))[0:560,0:560].mean())
    res.append(r)
v=np.mean(res,0); print('brightest2%% diag %.0f/%.0f vert %.0f/%.0f  cable box s1.5 %.2f  room s5 %.2f'%tuple(v))
