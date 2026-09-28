import numpy as np, cv2, sys
from src import frame
def amp(c):
    c=c-c.mean(); w2=np.outer(np.hanning(c.shape[0]),np.hanning(c.shape[1]))
    F=np.fft.fft2(c*w2); A=np.abs(F); A[0,0]=0
    fy=np.fft.fftfreq(c.shape[0])[:,None]; fx=np.fft.fftfreq(c.shape[1])[None,:]; r=np.hypot(fx,fy)
    m=(r>1/4.2)&(r<1/2.2); A2=A*m; i=np.unravel_index(np.argmax(A2),A.shape)
    return 2*A[i]/w2.sum(), 1/r[i]
r=cv2.imread(sys.argv[1]).mean(2).astype(np.float32); s=frame(int(sys.argv[2])).mean(2).astype(np.float32)
for name,(x0,y0,x1,y1) in {'shirt1':(1700,700,1828,828),'shirt2':(1780,560,1908,688),'back3':(1600,780,1728,908),'uarm':(1330,780,1458,908),'beanieL':(1380,100,1444,164),'beanieM':(1480,110,1544,174),'beanieR':(1700,160,1764,224)}.items():
    a,p=amp(r[y0:y1,x0:x1]); b,q=amp(s[y0:y1,x0:x1]); print(f'{name:8s} render amp {a:5.2f} (period {p:.2f})  source amp {b:5.2f} (period {q:.2f})')
