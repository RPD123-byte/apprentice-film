import cv2, numpy as np, glob, re, sys
from src import frame
d=sys.argv[1]
m=np.zeros((946,2206),np.uint8); cv2.fillPoly(m,[np.array([[315,246],[834,168],[898,519],[409,648]],np.int32)],1)
rows=[]
for p in sorted(glob.glob(d+'/k*.png'),key=lambda p:int(re.search(r'k(\d+)',p).group(1))):
    k=int(re.search(r'k(\d+)',p).group(1)); r=cv2.imread(p).mean(2); s=frame(k).mean(2)
    e2=np.abs(cv2.GaussianBlur(r,(0,0),2)-cv2.GaussianBlur(s,(0,0),2)); e8=np.abs(cv2.GaussianBlur(r,(0,0),8)-cv2.GaussianBlur(s,(0,0),8))
    rows.append((k,e2.mean(),e2[m==0].mean(),e2[m>0].mean(),e8.mean(),e8[m==0].mean(),e8[m>0].mean()))
    print(k,'s2 %.2f nonscr %.2f scr %.2f | s8 %.2f nonscr %.2f scr %.2f'%rows[-1][1:])
a=np.array([r[1:] for r in rows]); print('MEAN s2 %.2f nonscr %.2f scr %.2f | s8 %.2f nonscr %.2f scr %.2f (n=%d)'%(*a.mean(0),len(a)))
