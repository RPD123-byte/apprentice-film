# err.py frame ref out  -> heatmap of blurred |diff| + signed diff tiles table
import cv2,numpy as np,sys
a=cv2.imread(sys.argv[1],0).astype(np.float32); b=cv2.imread(sys.argv[2],0).astype(np.float32)
s=6
A=cv2.GaussianBlur(a,(0,0),s); B=cv2.GaussianBlur(b,(0,0),s)
d=A-B
hm=np.clip(np.abs(d)*4,0,255).astype(np.uint8)
hm=cv2.applyColorMap(hm,cv2.COLORMAP_JET)
bg=cv2.cvtColor(b.astype(np.uint8),cv2.COLOR_GRAY2BGR)
im=cv2.addWeighted(bg,0.4,hm,0.6,0)
cv2.imwrite(sys.argv[3],cv2.resize(im,(1103,473)))
# tile table (grid 100px): signed mean diff
H,W=a.shape;T=int(sys.argv[4]) if len(sys.argv)>4 else 150
tot=np.abs(d).sum()
rows=[]
for y in range(0,H,T):
  for x in range(0,W,T):
    t=d[y:y+T,x:x+T]; rows.append((np.abs(t).sum()/tot*100,x,y,t.mean(),np.abs(t).mean()))
rows.sort(reverse=True)
for r in rows[:25]: print('share %4.1f%% tile(%4d,%3d) signed %+6.1f abs %5.1f'%r)
