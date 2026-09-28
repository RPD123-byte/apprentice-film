import json, cv2, numpy as np, h16, sys
FB=json.load(open('../../s16-fix2-w/feetbox.json'))
def near(n):
    bs=FB[str(n)]
    b=max(bs,key=lambda b:(b[1]+b[3]))   # the lowest (the near foot's leg)
    return [b[0]-35,b[1]-62,b[2]+35,b[3]+2]
specs=[]
for n in map(int,sys.argv[2:]):
    if n==1143: specs.append((n,[1135,420,1220,485])); continue
    specs.append((n,near(n)))
tiles=[]
s=4
for n,(x0,y0,x1,y1) in specs:
    im=cv2.resize(h16.src(n)[y0:y1,x0:x1],None,fx=s,fy=s,interpolation=cv2.INTER_CUBIC)
    for x in range((x0+4)//5*5,x1,5):
        c=(0,0,255) if x%25==0 else (0,70,0); cv2.line(im,((x-x0)*s,0),((x-x0)*s,im.shape[0]),c,1)
        if x%25==0: cv2.putText(im,str(x),((x-x0)*s+2,12),0,0.4,(0,255,255),1)
    for y in range((y0+4)//5*5,y1,5):
        c=(0,0,255) if y%25==0 else (0,70,0); cv2.line(im,(0,(y-y0)*s),(im.shape[1],(y-y0)*s),c,1)
        if y%25==0: cv2.putText(im,str(y),(2,(y-y0)*s-2),0,0.4,(0,255,255),1)
    cv2.putText(im,str(n),(im.shape[1]-50,im.shape[0]-8),0,0.7,(255,0,255),2)
    tiles.append(im)
W=max(t.shape[1] for t in tiles); H=max(t.shape[0] for t in tiles)
tiles=[np.pad(t,((0,H-t.shape[0]),(0,W-t.shape[1]+4),(0,0))) for t in tiles]
while len(tiles)%3: tiles.append(np.zeros_like(tiles[0]))
cv2.imwrite(sys.argv[1],np.vstack([np.hstack(tiles[i:i+3]) for i in range(0,len(tiles),3)]),[cv2.IMWRITE_JPEG_QUALITY,88])
print(specs)
