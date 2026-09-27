from chamfer import *
import sys
d=json.load(open(sys.argv[1])); sh=d['shape']
tiles=[]
for t,p in d['poses'].items():
    f=load(float(t)).copy()
    for k,P in model(sh).items():
        q,_=proj(P,p[:3],p[3:])
        for a in q: cv2.circle(f,(int(a[0]),int(a[1])),2,(0,255,0) if k in('top','bot') else (255,0,255),-1)
    f=f[500:946,400:1900]; f=cv2.resize(f,(1000,297)); cv2.putText(f,t,(5,20),0,0.6,(0,255,255),2); tiles.append(f)
while len(tiles)%2: tiles.append(np.zeros_like(tiles[0]))
cv2.imwrite(sys.argv[2],np.vstack([np.hstack(tiles[i:i+2]) for i in range(0,len(tiles),2)]))
