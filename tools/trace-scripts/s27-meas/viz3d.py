from fit3d import *
d=json.load(open(sys.argv[1])); L=d['L']; T=d['T']
tiles=[]
for ts,prm in d['prm'].items():
    t=float(ts); f=load(t).copy()
    for k,P in base_pts(t,prm,L,T).items():
        col={'top':(0,255,0),'kb':(255,0,255),'tp':(255,255,0),'bot':(0,128,255)}[k]
        for a in pj(P): cv2.circle(f,(int(a[0]),int(a[1])),2,col,-1)
    f=f[500:946,400:1900]; f=cv2.resize(f,(1000,297)); cv2.putText(f,ts,(5,20),0,0.6,(0,255,255),2); tiles.append(f)
while len(tiles)%2: tiles.append(np.zeros_like(tiles[0]))
cv2.imwrite(sys.argv[2],np.vstack([np.hstack(tiles[i:i+2]) for i in range(0,len(tiles),2)]))
