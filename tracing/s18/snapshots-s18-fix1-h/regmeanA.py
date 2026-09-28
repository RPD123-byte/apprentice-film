import cv2,numpy as np,re
txt=open('../../src/shots/s18/shotA.js').read()
PATH=eval(re.search(r'PATH_A = (\[.*?\]);', txt, re.S).group(1)); P={r[0]:(r[1],r[2]) for r in PATH}
acc=np.zeros((946,2206),np.float64); n=0
for f in range(1346,1382):
    if f in (1351,1376): continue
    dx,dy=P[f]; s=cv2.imread('../s18-fix1-src/f%04d.png'%f,0).astype(np.float64)
    M=np.float32([[1,0,-dx],[0,1,-dy]]); acc+=cv2.warpAffine(s,M,(2206,946),borderValue=0); n+=1
m=(acc/n).astype(np.float32); np.save('/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/s18f1_meanA.npy',m)
cv2.imwrite('../s18-fix1-pairs/meanA.png',m.astype(np.uint8)); print(n)
