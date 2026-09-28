import cv2,numpy as np,json,sys
from segm import L
names=sys.argv[1].split(','); out=sys.argv[2]
tiles=[]
for n in names:
    T=json.load(open(f't_{n}.json')); im=L(T['frame']).astype(np.uint8)
    for ring in T['mask']: cv2.polylines(im,[np.array(ring).reshape(-1,2).round().astype(np.int32)],True,(0,0,255),1)
    tiles.append(cv2.resize(im[150:946,450:1650],(900,597)))
while len(tiles)%2: tiles.append(np.zeros_like(tiles[0]))
rows=[np.hstack(tiles[i:i+2]) for i in range(0,len(tiles),2)]
cv2.imwrite(out,np.vstack(rows))
