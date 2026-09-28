import sys,cv2,numpy as np
sys.path.insert(0,'/Users/computer/rootline/apprentice-film/snapshots/s15-p4/tools')
from common import frame, owl
fs=[int(x) for x in sys.argv[2].split(',')]; sc=float(sys.argv[3]) if len(sys.argv)>3 else 1.5
tiles=[]
for f in fs:
    o=owl(f); cx,cy=int(o[1]),int(o[2]); x0=max(0,min(2206-420,cx-210)); y0=max(0,min(946-400,cy-200))
    c=frame(f)[y0:y0+400,x0:x0+420].copy()
    for gx in range(0,420,50): cv2.line(c,(gx,0),(gx,6),(0,255,255),1)
    for gy in range(0,400,50): cv2.line(c,(0,gy),(6,gy),(0,255,255),1)
    c=cv2.resize(c,None,fx=sc,fy=sc,interpolation=cv2.INTER_CUBIC)
    cv2.putText(c,f'{f} {f/25:.2f} ({x0},{y0})',(4,16),0,0.5,(0,255,255),1); tiles.append(c)
cols=int(sys.argv[4]) if len(sys.argv)>4 else 3
while len(tiles)%cols: tiles.append(np.zeros_like(tiles[0]))
cv2.imwrite(sys.argv[1],np.vstack([np.hstack(tiles[i:i+cols]) for i in range(0,len(tiles),cols)]),[cv2.IMWRITE_JPEG_QUALITY,88])
