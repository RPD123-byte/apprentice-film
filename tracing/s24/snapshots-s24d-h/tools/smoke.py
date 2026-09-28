# the hold's smoke as a sum of soft blobs: greedy gaussian fit to the brightening of the k10-18 median over the clean
# page (95.92 s), with the owls, arc, shard lines and confetti masked out. Writes meas/smoke.json [[x, y, sx, sy, rot, amp]]
import cv2,numpy as np,json
B=np.load('meas/Bgray.npy').astype(np.float32)
C=cv2.cvtColor(cv2.imread('clean9592.png'),cv2.COLOR_BGR2GRAY).astype(np.float32)
d=B-C
mask=np.ones_like(B,np.uint8)
for nm in ['B1','B2','B3']:
  r=json.load(open('meas/%s.json'%nm))
  for c in r: cv2.fillPoly(mask,[np.array(c['pts'],np.int32)],0)
mask=cv2.erode(mask,np.ones((41,41),np.uint8))
# thin bright things (shard lines, arc, confetti) are masked where the difference is sharp
sharp=np.abs(d-cv2.GaussianBlur(d,(0,0),4))>18
mask[cv2.dilate(sharp.astype(np.uint8),np.ones((7,7),np.uint8))>0]=0
# only the screen area
mask[:128,:]=0; mask[:, :144]=0; mask[:, 2023:]=0
res=np.where(mask>0,np.clip(d,0,None),0)
# fill masked holes by normalized convolution
w=cv2.GaussianBlur(mask.astype(np.float32),(0,0),12); r=cv2.GaussianBlur(res,(0,0),12)
dens=np.where(w>0.5,r/np.maximum(w,1e-3),0)
np.save('meas/smoke_dens.npy',dens)
blobs=[]; cur=dens.copy()
yy,xx=np.mgrid[0:946,0:2206].astype(np.float32)
for it in range(30):
  y,x=np.unravel_index(np.argmax(cur),cur.shape); a=cur[y,x]
  if a<6: break
  # moments in a window
  R=90; y0,y1,x0,x1=max(0,y-R),min(946,y+R),max(0,x-R),min(2206,x+R)
  win=np.clip(cur[y0:y1,x0:x1]-a*0.3,0,None)
  ys,xs=np.mgrid[y0:y1,x0:x1]
  wsum=win.sum()+1e-6; mx=(win*xs).sum()/wsum; my=(win*ys).sum()/wsum
  cxx=(win*(xs-mx)**2).sum()/wsum; cyy=(win*(ys-my)**2).sum()/wsum; cxy=(win*(xs-mx)*(ys-my)).sum()/wsum
  ev,evec=np.linalg.eigh(np.array([[cxx,cxy],[cxy,cyy]]))
  sx=max(10,np.sqrt(ev[1])*1.6); sy=max(10,np.sqrt(ev[0])*1.6); rot=float(np.arctan2(evec[1,1],evec[0,1]))
  c,s=np.cos(rot),np.sin(rot)
  u=(xx-mx)*c+(yy-my)*s; v=-(xx-mx)*s+(yy-my)*c
  g=a*np.exp(-0.5*((u/sx)**2+(v/sy)**2))
  cur=cur-g
  blobs.append([round(float(mx),1),round(float(my),1),round(float(sx),1),round(float(sy),1),round(rot,3),round(float(a),1)])
json.dump(blobs,open('meas/smoke.json','w'))
print(len(blobs)); print(blobs[:8])
recon=dens-cur
cv2.imwrite('meas/smoke_vis.jpg',cv2.resize(np.hstack([np.clip(dens*3,0,255),np.clip(recon*3,0,255)]).astype(np.uint8),None,fx=0.35,fy=0.35))
