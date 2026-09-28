from fit_base_h import *
d=json.load(open(sys.argv[1])); L=d['layout']
ts=[float(x) for x in sys.argv[3].split(',')]
tiles=[]
for t in ts:
    c=d['corners'][str(t)] if str(t) in d['corners'] else d['corners'][f"{t}"]
    f=load(t).copy(); H=Hof(c)
    for P,col in zip(layout_pts(L),[(0,255,0),(255,0,255),(255,255,0)]):
        for a in ph(H,P): cv2.circle(f,(int(a[0]),int(a[1])),2,col,-1)
    for k,(x,y) in enumerate(np.array(c).reshape(4,2)): cv2.putText(f,['FL','FR','BR','BL'][k],(int(x),int(y)),0,0.8,(0,0,255),2)
    f=f[500:946,400:1900]; f=cv2.resize(f,(1000,297)); cv2.putText(f,str(t),(5,20),0,0.6,(0,255,255),2); tiles.append(f)
while len(tiles)%2: tiles.append(np.zeros_like(tiles[0]))
cv2.imwrite(sys.argv[2],np.vstack([np.hstack(tiles[i:i+2]) for i in range(0,len(tiles),2)]))
