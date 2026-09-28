import sys; sys.path.insert(0,'/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/s18fix1')
from src import *
fs=list(range(1337,1382)); tiles=[]
for n in fs:
    t=reg(n,600,470,980,620); t=cv2.resize(t,None,fx=0.9,fy=0.9)
    for x in range(650,980,50): X=int((x-600)*0.9); cv2.line(t,(X,0),(X,8),(0,0,255),2)
    for y in range(500,620,50): Y=int((y-470)*0.9); cv2.line(t,(0,Y),(8,Y),(0,0,255),2)
    cv2.putText(t,str(n)+' '+['L','U','L','D'][(n-(n-1)//25)%4],(4,18),0,0.55,(0,255,255),2); tiles.append(t)
cols=5
while len(tiles)%cols: tiles.append(np.zeros_like(tiles[0]))
cv2.imwrite(sys.argv[1],np.vstack([np.hstack(tiles[i:i+cols]) for i in range(0,len(tiles),cols)]),[cv2.IMWRITE_JPEG_QUALITY,85])
