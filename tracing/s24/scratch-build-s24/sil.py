# measured silhouette outline(s) of the bright figure on a plate, simplified to a polygon (coordinates only)
# usage: sil.py plate thr eps out x0 y0 x1 y1 [minArea] [open]
import cv2,numpy as np,sys,json
src=sys.argv[1]; thr=float(sys.argv[2]); eps=float(sys.argv[3]); out=sys.argv[4]
x0,y0,x1,y1=[int(v) for v in sys.argv[5:9]]; minA=float(sys.argv[9]) if len(sys.argv)>9 else 3000; op=int(sys.argv[10]) if len(sys.argv)>10 else 7
m=np.load(src) if src.endswith('.npy') else cv2.imread(src,0).astype(np.float32)
z=np.zeros_like(m); z[y0:y1,x0:x1]=m[y0:y1,x0:x1]
b=(cv2.GaussianBlur(z,(0,0),1.2)>thr).astype(np.uint8)
if op>1: b=cv2.morphologyEx(b,cv2.MORPH_OPEN,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(op,op)))
cnts,hier=cv2.findContours(b,cv2.RETR_CCOMP,cv2.CHAIN_APPROX_NONE)
res=[]
vis=cv2.cvtColor(np.clip(m,0,255).astype(np.uint8),cv2.COLOR_GRAY2BGR)
for i,c in enumerate(cnts):
  a=cv2.contourArea(c)
  if a<minA: continue
  hole=hier[0][i][3]>=0
  ap=cv2.approxPolyDP(c,eps,True)[:,0,:]
  res.append({'hole':bool(hole),'area':float(a),'pts':ap.tolist()})
  cv2.polylines(vis,[ap.reshape(-1,1,2)],True,(0,0,255) if not hole else (255,0,255),1)
cv2.imwrite(out+'.jpg',vis[max(0,y0):y1,max(0,x0):x1])
json.dump(res,open(out+'.json','w'))
print([(r['hole'],int(r['area']),len(r['pts'])) for r in res])
