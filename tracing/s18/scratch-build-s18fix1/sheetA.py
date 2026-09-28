import sys; sys.path.insert(0,'/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/s18fix1')
from src import *
fs=[int(v) for v in sys.argv[2].split(',')]; out=sys.argv[1]
tiles=[]
for n in fs:
    t=reg(n); t=cv2.resize(t,None,fx=0.6,fy=0.6,interpolation=cv2.INTER_AREA)
    cv2.putText(t,str(n),(4,18),0,0.6,(0,0,255),2); tiles.append(t)
cols=4
while len(tiles)%cols: tiles.append(np.zeros_like(tiles[0]))
cv2.imwrite(out,np.vstack([np.hstack(tiles[i:i+cols]) for i in range(0,len(tiles),cols)]),[cv2.IMWRITE_JPEG_QUALITY,85])
