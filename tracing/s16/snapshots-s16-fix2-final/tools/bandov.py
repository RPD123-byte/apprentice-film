import sys, re, json, cv2, numpy as np, h16
txt=open('/Users/computer/rootline/apprentice-film/src/shots/s16/data/band.js').read()
B={int(m.group(1)): json.loads(m.group(2)) for m in re.finditer(r'^(\d+): (\[.*\])', txt, re.M)}
ims=[]
for n,(x0,y0,x1,y1) in [(1153,(600,250,900,450)),(1157,(440,400,720,640)),(1148,(820,180,1100,420)),(1160,(330,560,640,760))]:
    s=2; im=cv2.resize(h16.src(n)[y0:y1,x0:x1],None,fx=s,fy=s,interpolation=cv2.INTER_CUBIC)
    for st in B[n]:
        a=np.array(st).reshape(-1,4); q=((a[:,:2]-[x0,y0])*s).astype(np.int32)
        cv2.polylines(im,[q],False,(0,0,255),1,cv2.LINE_AA)
    print(n,[ (round(np.mean(np.array(st).reshape(-1,4)[:,2]),1), round(np.mean(np.array(st).reshape(-1,4)[:,3]),2)) for st in B[n]])
    ims.append(im)
h=max(i.shape[0] for i in ims)
cv2.imwrite('../../s16-fix2-w/bandov.jpg', np.hstack([np.vstack([i,np.zeros((h-i.shape[0],i.shape[1],3),np.uint8)]) for i in ims]))
