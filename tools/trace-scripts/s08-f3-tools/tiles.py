import numpy as np, cv2, sys
# tiles.py render.png [k] : region errors (blurred sigma 3 MAE) for named regions at frame k
p=sys.argv[1]; k=int(sys.argv[2]) if len(sys.argv)>2 else 764
a=cv2.imread(p).astype(np.float32); b=cv2.imread(f'/Users/computer/rootline/apprentice-film/snapshots/s08-f3-src/f{k}.png').astype(np.float32)
d=np.abs(cv2.GaussianBlur(a,(0,0),3)-cv2.GaussianBlur(b,(0,0),3)).mean(-1)
REG={'all':(0,0,2206,946),'logo':(0,0,450,230),'tail':(1915,120,2206,380),'Uleft':(760,0,1250,480),'Uright':(1100,0,1450,720),'cloud':(1600,700,2206,946),
 'nub':(1380,460,1460,560),'card':(1446,178,1918,836),'date':(0,280,760,480),'ll':(0,480,1110,946),'fan':(150,480,560,640)}
print(' '.join(f'{n} {d[y0:y1,x0:x1].mean():.2f}' for n,(x0,y0,x1,y1) in REG.items()))
