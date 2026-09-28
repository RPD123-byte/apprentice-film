import cv2,numpy as np,json,sys
from segm import L
S=json.load(open(sys.argv[1])); frames=[int(x) for x in sys.argv[2].split(',')]; out=sys.argv[3]
tiles=[]
for f in frames:
    im=L(f).astype(np.uint8)
    for k,v in S.items():
        if str(f) not in v: continue
        A=np.array(v[str(f)][:6]).reshape(2,3)
        T=json.load(open(f't_{k}.json'))
        for r in T['mask']:
            p=np.array(r).reshape(-1,2); q=p@A[:,:2].T+A[:,2]
            cv2.polylines(im,[q.round().astype(np.int32)],True,(0,0,255),2)
    t=im[600:930,450:1700]; cv2.putText(t,f'{f/25:.2f}',(8,30),0,1,(0,255,255),2); tiles.append(t)
while len(tiles)%2: tiles.append(np.zeros_like(tiles[0]))
cv2.imwrite(out,cv2.resize(np.vstack([np.hstack(tiles[i:i+2]) for i in range(0,len(tiles),2)]),None,fx=0.75,fy=0.75))
