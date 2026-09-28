import sys; sys.path.insert(0,'../s18fix1')
from src import *
fs=[int(v) for v in sys.argv[1].split(',')]; out=sys.argv[2]
x0,y0,x1,y1=[int(v) for v in sys.argv[3:7]] if len(sys.argv)>6 else (440,170,1040,600)
cols=int(sys.argv[7]) if len(sys.argv)>7 else 4
tiles=[]
for n in fs:
    g=reg(n,x0,y0,x1,y1); g=cv2.cvtColor(g,cv2.COLOR_BGR2GRAY) if g.ndim==3 else g
    g=cv2.cvtColor(g,cv2.COLOR_GRAY2BGR); cv2.putText(g,str(n),(5,22),0,0.7,(0,0,255),2); tiles.append(g)
while len(tiles)%cols: tiles.append(np.zeros_like(tiles[0]))
rows=[np.hstack(tiles[i:i+cols]) for i in range(0,len(tiles),cols)]
cv2.imwrite(out,np.vstack(rows),[cv2.IMWRITE_JPEG_QUALITY,85])
