import cv2, numpy as np, json, sys
m=json.load(open('tr/masks.json')); ims=[]
for t in sys.argv[1:]:
    f=cv2.imread(f'ref/{t}.png'); k=m[t]; hull=k['hull']; hull=[hull] if isinstance(hull[0][0],(int,float)) else hull
    for p in hull: cv2.polylines(f,[np.array(p,np.int32)],True,(0,0,255),3)
    for p in k.get('cut',[]): cv2.polylines(f,[np.array(p,np.int32)],True,(0,255,0),3)
    ims.append(cv2.resize(f,(1103,473)))
while len(ims)%2: ims.append(np.zeros_like(ims[0]))
cv2.imwrite('hulls.jpg',np.vstack([np.hstack(ims[i:i+2]) for i in range(0,len(ims),2)]))
