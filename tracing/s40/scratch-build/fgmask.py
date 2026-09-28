import sys; sys.path.insert(0,'/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad')
from grade import *
SP='/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad'
p=np.load(SP+'/bgp.npy'); NS=9
cx,cy,ax,ay=p[:4]; st=p[4:].reshape(NS,3)
rho=np.sqrt(((xx-cx)/ax)**2+((yy-cy)/ay)**2)
pos=np.linspace(0,1,NS)
bgpre=np.stack([np.interp(np.clip(rho,0,1),pos,st[:,k]) for k in range(3)],-1).astype(np.float32)
bgpost=grade(bgpre)
S=load('/Users/computer/rootline/apprentice-film/snapshots/s40-fix1-ref/src-138.0.png')
Sb=cv2.GaussianBlur(S,(0,0),1.8)
d=(Sb-bgpost)*255
fg=(np.abs(d).max(-1)>20)
fg=cv2.morphologyEx(fg.astype(np.uint8),cv2.MORPH_OPEN,np.ones((3,3),np.uint8))
fg=cv2.morphologyEx(fg,cv2.MORPH_CLOSE,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(9,9)))
np.save(SP+'/fg.npy',fg)
np.save(SP+'/bgpost.npy',bgpost)
vis=(S*255).astype(np.uint8)[...,::-1].copy()//2
vis[fg>0]=vis[fg>0]//2+np.array([0,120,0],np.uint8)
cv2.imwrite(SP+'/fg.jpg',cv2.resize(vis,None,fx=0.5,fy=0.5))
