import sys; sys.path.insert(0,'/Users/computer/rootline/apprentice-film/src/shots/s05/trace')
import numpy as np,cv2,frames
S=frames.static_target().mean(2)
res=[]
for k,(dx,dy),(ax,ay) in [(606,(68.1,-23.0),(64.3,-7.0)),(650,(42.9,-17.0),(39.8,-4.7))]:
  F=frames.pre(k).mean(2)
  sh=lambda im,x,y: cv2.warpAffine(im,np.float32([[1,0,x],[0,1,y]]),(2206,946),borderMode=cv2.BORDER_REPLICATE)
  s=lambda x: cv2.GaussianBlur(x,(0,0),1.2)
  e_stay=s(np.abs(F-S)); e_h=s(np.abs(F-sh(S,dx,dy))); e_a=s(np.abs(F-sh(S,ax,ay)))
  # in settled coords: the region that moved with the hand = where the shifted static explains F (look at F coords, then shift back)
  gh=cv2.GaussianBlur(e_stay-e_h,(0,0),2); ga=cv2.GaussianBlur(e_stay-e_a,(0,0),2)
  # back to settled coordinates
  res.append((sh(gh,-dx,-dy),sh(ga,-ax,-ay)))
gh=np.minimum(res[0][0],res[1][0]+0) ; 
x0,y0,x1,y1=800,560,1650,860
for i,(gh,ga) in enumerate(res):
  vis=np.hstack([np.clip(128+gh[y0:y1,x0:x1]*1500,0,255),np.clip(128+ga[y0:y1,x0:x1]*1500,0,255)]).astype(np.uint8)
  cv2.imwrite(f'handmot_{i}.png',vis)
np.save('handmot.npy',np.array([[g for g in r] for r in res]))
