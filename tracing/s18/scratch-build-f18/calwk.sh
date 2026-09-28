cd /private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/f18 && node render.mjs /private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/f18/tW 1356,11356,21356,31356,41356,51356 0 ./testWk.js 2>&1 | grep -v "readback\|willRead" | tail -1 && python3 -c "
import numpy as np,cv2
Z=np.load('/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/p2/owlstack.npz')
n=1356
S=cv2.imread('/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/s18rev1n/src/f%04d.png'%n,0).astype(np.float32)
D=np.zeros((946,2206),np.float32); D[60:660,360:1100]=Z[f'D{n}']
owl=cv2.dilate((D>15).astype(np.uint8),np.ones((41,41),np.uint8))>0
b=lambda a,s=6: cv2.GaussianBlur(a,(0,0),s)
dog=lambda a: b(a,1)-b(a,2.5)
for v in range(6):
  R=cv2.imread('tW/r%d.png'%(n+10000*v),0).astype(np.float32)
  print(v, 'b6',np.abs(b(R)-b(S))[~owl].mean().round(3),'b2',np.abs(b(R,2)-b(S,2))[~owl].mean().round(3),'signed',(b(R)-b(S))[~owl].mean().round(2), 'dog-std',dog(R)[~owl].std().round(2), dog(S)[~owl].std().round(2))
"
