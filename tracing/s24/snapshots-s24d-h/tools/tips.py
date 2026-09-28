# silhouette of a (line-reduced) plate; convex tips and concave notches along it (measured points)
import cv2,numpy as np,sys,json
src=sys.argv[1]; thr=float(sys.argv[2]); out=sys.argv[3]; roi=[int(v) for v in sys.argv[4:8]] if len(sys.argv)>=8 else None
m=np.load(src) if src.endswith('.npy') else cv2.imread(src,0).astype(np.float32)
if roi:
  z=np.zeros_like(m); x0,y0,x1,y1=roi; z[y0:y1,x0:x1]=m[y0:y1,x0:x1]; m=z
b=(cv2.GaussianBlur(m,(0,0),1.5)>thr).astype(np.uint8)
b=cv2.morphologyEx(b,cv2.MORPH_OPEN,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(7,7)))
nl,lab,st,cen=cv2.connectedComponentsWithStats(b)
i=1+np.argmax(st[1:,4]); mask=(lab==i).astype(np.uint8)
ff=mask.copy(); h,w=ff.shape; fm=np.zeros((h+2,w+2),np.uint8); cv2.floodFill(ff,fm,(0,0),1); mask=mask|(1-ff)
cnts,_=cv2.findContours(mask,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE)
c=max(cnts,key=cv2.contourArea)[:,0,:].astype(np.float32)
n=len(c)
# smooth
cs=np.stack([np.convolve(np.r_[c[-10:,j],c[:,j],c[:10,j]],np.ones(9)/9,'same')[10:-10] for j in range(2)],1)
K=14
tips=[];notch=[]
for j in range(n):
  a=cs[(j-K)%n]; p=cs[j]; q=cs[(j+K)%n]
  v1=a-p; v2=q-p
  ang=np.degrees(np.arccos(np.clip(np.dot(v1,v2)/(np.linalg.norm(v1)*np.linalg.norm(v2)+1e-9),-1,1)))
  cr=v1[0]*v2[1]-v1[1]*v2[0]
  if ang<100:
    (tips if cr<0 else notch).append((j,ang,p))
def nms(lst):
  lst=sorted(lst,key=lambda t:t[1]); keep=[]
  for t in lst:
    if all(min(abs(t[0]-k[0]),n-abs(t[0]-k[0]))>K*1.5 for k in keep): keep.append(t)
  return sorted(keep,key=lambda t:t[0])
tips=nms(tips); notch=nms(notch)
vis=cv2.cvtColor(np.clip(m,0,255).astype(np.uint8),cv2.COLOR_GRAY2BGR)
cv2.drawContours(vis,[c.astype(np.int32).reshape(-1,1,2)],-1,(0,0,255),1)
for j,a,p in tips: cv2.circle(vis,(int(p[0]),int(p[1])),5,(0,255,0),-1); cv2.putText(vis,'%d,%d'%(p[0],p[1]),(int(p[0])+4,int(p[1])-4),0,0.4,(0,255,0),1)
for j,a,p in notch: cv2.circle(vis,(int(p[0]),int(p[1])),4,(255,0,255),-1); cv2.putText(vis,'%d,%d'%(p[0],p[1]),(int(p[0])+4,int(p[1])+10),0,0.35,(255,0,255),1)
cv2.imwrite(out+'.jpg',vis)
sub=cs[::8]
json.dump({'outline':[[round(float(x),1),round(float(y),1)] for x,y in sub],'tips':[[round(float(p[0]),1),round(float(p[1]),1)] for j,a,p in tips],'notch':[[round(float(p[0]),1),round(float(p[1]),1)] for j,a,p in notch]},open(out+'.json','w'))
print(len(tips),'tips',len(notch),'notches','outline pts',len(sub))
