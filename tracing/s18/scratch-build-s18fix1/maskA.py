import sys; sys.path.insert(0,'/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/s18fix1')
from src import *
bg=np.load('/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/bgA.npy').astype(np.float32)
out='snapshots/s18-fix1-study/'
acc=None
fs=[int(v) for v in sys.argv[1].split(',')]
for n in fs:
    f=frame(n,True).astype(np.float32)
    d=np.abs(cv2.GaussianBlur(f,(0,0),2)-cv2.GaussianBlur(bg,(0,0),2))
    dx,dy=PATH_A[n]
    M=np.float32([[1,0,-dx],[0,1,-dy]])
    d=cv2.warpAffine(d,M,(2206,946))
    fr=cv2.warpAffine(f,M,(2206,946))
    m=((d>40)|( (fr>170) & (d>15))).astype(np.uint8)
    acc=m.astype(np.float32) if acc is None else acc+m
acc/=len(fs)
m=(acc>0.5).astype(np.uint8)*255
m=cv2.morphologyEx(m,cv2.MORPH_CLOSE,np.ones((9,9),np.uint8))
m=cv2.morphologyEx(m,cv2.MORPH_OPEN,np.ones((5,5),np.uint8))
cnts,_=cv2.findContours(m,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE)
c=max(cnts,key=cv2.contourArea)
x,y,w,h=cv2.boundingRect(c); print('bbox',x,y,x+w,y+h,'area',cv2.contourArea(c))
vis=cv2.cvtColor(cv2.warpAffine(frame(fs[0],True),np.float32([[1,0,-PATH_A[fs[0]][0]],[0,1,-PATH_A[fs[0]][1]]]),(2206,946)),cv2.COLOR_GRAY2BGR)
cv2.drawContours(vis,[c],-1,(0,0,255),2)
ap=cv2.approxPolyDP(c,3,True)
print('pts',len(ap)); print([tuple(p[0]) for p in ap])
cv2.imwrite(out+sys.argv[2],vis[150:650,380:1080])
