# measured silhouettes + notches (concave corners between feathers) for a plate; writes meas/<name>.json + .jpg
# usage: sil2.py plate thr eps name x0 y0 x1 y1 [minArea] [K]
import cv2,numpy as np,sys,json
src=sys.argv[1]; thr=float(sys.argv[2]); eps=float(sys.argv[3]); name=sys.argv[4]
x0,y0,x1,y1=[int(v) for v in sys.argv[5:9]]; minA=float(sys.argv[9]) if len(sys.argv)>9 else 3000; K=int(sys.argv[10]) if len(sys.argv)>10 else 12
m=np.load(src) if src.endswith('.npy') else cv2.imread(src,0).astype(np.float32)
z=np.zeros_like(m); z[y0:y1,x0:x1]=m[y0:y1,x0:x1]
b=(cv2.GaussianBlur(z,(0,0),1.2)>thr).astype(np.uint8)
b=cv2.morphologyEx(b,cv2.MORPH_OPEN,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(5,5)))
cnts,hier=cv2.findContours(b,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE)
res=[]
vis=cv2.cvtColor(np.clip(m,0,255).astype(np.uint8),cv2.COLOR_GRAY2BGR)
for ci,c in enumerate(sorted([c for c in cnts if cv2.contourArea(c)>=minA],key=cv2.contourArea,reverse=True)):
  a=cv2.contourArea(c); cc=c[:,0,:].astype(np.float32); n=len(cc)
  cs=np.stack([np.convolve(np.r_[cc[-6:,j],cc[:,j],cc[:6,j]],np.ones(5)/5,'same')[6:-6] for j in range(2)],1)
  notch=[];tips=[]
  for j in range(n):
    p=cs[j]; v1=cs[(j-K)%n]-p; v2=cs[(j+K)%n]-p
    ang=np.degrees(np.arccos(np.clip(np.dot(v1,v2)/(np.linalg.norm(v1)*np.linalg.norm(v2)+1e-9),-1,1)))
    cr=v1[0]*v2[1]-v1[1]*v2[0]
    if ang<110: (tips if cr>0 else notch).append((j,ang,p))
  def nms(l):
    l=sorted(l,key=lambda t:t[1]); keep=[]
    for t in l:
      if all(min(abs(t[0]-k[0]),n-abs(t[0]-k[0]))>K*1.5 for k in keep): keep.append(t)
    return sorted(keep,key=lambda t:t[0])
  notch=nms(notch); tips=nms(tips)
  ap=cv2.approxPolyDP(c,eps,True)[:,0,:]
  res.append({'area':float(a),'pts':ap.tolist(),'notch':[[int(round(p[0])),int(round(p[1]))] for j,a_,p in notch],'tips':[[int(round(p[0])),int(round(p[1]))] for j,a_,p in tips]})
  cv2.polylines(vis,[ap.reshape(-1,1,2)],True,(0,0,255),1)
  for i,(j,a_,p) in enumerate(notch): cv2.circle(vis,(int(p[0]),int(p[1])),4,(255,0,255),-1); cv2.putText(vis,'n%d.%d'%(ci,i),(int(p[0])+4,int(p[1])+4),0,0.4,(255,0,255),1)
  for i,(j,a_,p) in enumerate(tips): cv2.circle(vis,(int(p[0]),int(p[1])),4,(0,255,0),-1)
  cv2.putText(vis,'C%d'%ci,tuple(int(v) for v in cc.mean(0)),0,1.2,(0,255,255),2)
cv2.imwrite('meas/%s.jpg'%name,vis[y0:y1,x0:x1])
json.dump(res,open('meas/%s.json'%name,'w'))
print([(int(r['area']),len(r['pts']),len(r['notch'])) for r in res])
