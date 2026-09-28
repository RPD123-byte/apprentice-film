import cv2, numpy as np
from ug import ungrade
import fgx
P=np.load('plateB2.npy')
Pg=cv2.cvtColor(np.clip(P*255,0,255).astype(np.uint8),cv2.COLOR_BGR2GRAY).astype(np.float32)
regs=[(1150,190,1950,355),(1250,400,1950,900),(150,650,450,900)]
def pc(a,b):
    win=cv2.createHanningWindow((a.shape[1],a.shape[0]),cv2.CV_32F)
    (dx,dy),r=cv2.phaseCorrelate(a,b,win); return dx,dy,r
old={round(t*25):(dx,dy) for t,dx,dy in fgx.SHAKE}
for k in list(range(2312,2348))+list(range(2368,2384)):
    F=ungrade(cv2.imread('src/%05d.png'%k),k/25)
    g=cv2.cvtColor(np.clip(F*255,0,255).astype(np.uint8),cv2.COLOR_BGR2GRAY).astype(np.float32)
    res=[pc(Pg[y0:y1,x0:x1],g[y0:y1,x0:x1]) for x0,y0,x1,y1 in regs]
    s=' '.join('(%.2f,%.2f r%.2f)'%r for r in res)
    print(k,'old',old.get(k,(0,0)),s)
