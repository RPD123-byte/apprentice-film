# feet boxes per flight drawing: thin parts of the silhouette (sil minus its opening by a disc) below the body
import json, cv2, numpy as np, h16
D=json.load(open('../../s16-fix2-w/owl.json'))
res={}; tiles=[]
for n in range(1143,1162):
    if str(n) not in D: continue
    d=D[str(n)]; x0,y0,x1,y1=d['box']
    sm=np.zeros((946,2206),np.uint8)
    for r in d['sil']: cv2.fillPoly(sm,[np.array(r,np.float32).reshape(-1,2).round().astype(np.int32)],1)
    k=cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(25,25))
    op=cv2.morphologyEx(sm,cv2.MORPH_OPEN,k)
    thin=(sm&(1-op)).astype(np.uint8)
    # body centre: centroid of the opened silhouette
    ys,xs=np.nonzero(op); cy=ys.mean(); cx=xs.mean()
    nl,lab,st,cen=cv2.connectedComponentsWithStats(thin)
    boxes=[]
    for i in range(1,nl):
        bx,by,bw,bh,a=st[i]
        if a<120: continue
        if cen[i][1] < cy+0.1*(y1-y0): continue
        if cen[i][0] < x0+0.3*(x1-x0): continue
        boxes.append([int(bx),int(by),int(bx+bw),int(by+bh),int(a)])
    res[n]=boxes; print(n,boxes)
    im=h16.src(n)[y0:y1,x0:x1].copy()
    for b in boxes: cv2.rectangle(im,(b[0]-x0,b[1]-y0),(b[2]-x0,b[3]-y0),(0,0,255),2)
    cv2.putText(im,str(n),(10,y1-y0-10),0,0.8,(255,0,255),2)
    tiles.append(cv2.resize(im,(360,int(360*(y1-y0)/(x1-x0)))))
json.dump(res,open('../../s16-fix2-w/feetbox.json','w'))
H=max(t.shape[0] for t in tiles); tiles=[np.pad(t,((0,H-t.shape[0]),(0,4),(0,0))) for t in tiles]
while len(tiles)%6: tiles.append(np.zeros_like(tiles[0]))
cv2.imwrite('../../s16-fix2-w/feetbox.jpg',np.vstack([np.hstack(tiles[i:i+6]) for i in range(0,len(tiles),6)]),[cv2.IMWRITE_JPEG_QUALITY,80])
