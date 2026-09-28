# Measure one part's outline(s) on a SOURCE frame: pixels with lo<=lum<hi (after blur) inside a clip polygon,
# largest connected regions, simplified. Prints JS arrays; writes an overlay (part_NAME.jpg).
#   part.py NAME T lo hi "[[x,y],...]" [eps] [blur] [minarea] [maxn]
import cv2, numpy as np, sys, json
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
name,t,lo,hi=sys.argv[1],float(sys.argv[2]),float(sys.argv[3]),float(sys.argv[4]); clip=json.loads(sys.argv[5])
eps=float(sys.argv[6]) if len(sys.argv)>6 else 4; bl=float(sys.argv[7]) if len(sys.argv)>7 else 3
mina=float(sys.argv[8]) if len(sys.argv)>8 else 400; maxn=int(sys.argv[9]) if len(sys.argv)>9 else 12
c=cv2.VideoCapture(V); c.set(cv2.CAP_PROP_POS_FRAMES,int(round(t*25))); ok,f=c.read()
g=cv2.GaussianBlur(cv2.cvtColor(f,cv2.COLOR_BGR2GRAY),(0,0),bl)
cm=np.zeros(g.shape,np.uint8); cv2.fillPoly(cm,[np.int32(clip)],255)
m=((g>=lo)&(g<hi)&(cm>0)).astype(np.uint8)*255
m=cv2.morphologyEx(m,cv2.MORPH_OPEN,np.ones((3,3),np.uint8))
cs,_=cv2.findContours(m,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE)
vis=(f*0.5).astype(np.uint8); cv2.polylines(vis,[np.int32(clip).reshape(-1,1,2)],True,(0,0,255),1)
res=[]
for cn in sorted(cs,key=cv2.contourArea,reverse=True)[:maxn]:
    if cv2.contourArea(cn)<mina: continue
    p=cv2.approxPolyDP(cn,eps,True).reshape(-1,2); res.append(p.tolist())
    cv2.polylines(vis,[p.reshape(-1,1,2)],True,(0,255,255),2)
    cv2.putText(vis,str(len(res)-1),tuple(int(v) for v in p[0]),0,1.0,(0,255,0),2)
x0,y0=np.int32(clip).min(0); x1,y1=np.int32(clip).max(0)
x0,y0=max(0,x0),max(0,y0); crop=vis[y0:y1,x0:x1]; k=min(1.0,1400/max(1,crop.shape[1]))
cv2.imwrite(f'part_{name}.jpg',cv2.resize(crop,None,fx=k,fy=k),[cv2.IMWRITE_JPEG_QUALITY,82])
json.dump(res,open(f'part_{name}.json','w'))
print(name,[(len(p),int(cv2.contourArea(np.int32(p)))) for p in res])
