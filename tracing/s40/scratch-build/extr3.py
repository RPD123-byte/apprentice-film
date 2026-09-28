import cv2, numpy as np
SP='/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad'
f=cv2.imread('/Users/computer/rootline/apprentice-film/snapshots/s40-fix1-ref/src-138.0.png').astype(np.float32)
b=cv2.GaussianBlur(f,(0,0),0.8)
B,G,R=b[...,0],b[...,1],b[...,2]
face=np.load(SP+'/face.npy')
dark=((R<150)&(G<85)).astype(np.float32)
# face outline: boundary of face mask dilated by ~6 (keyline centre)
for name,(x0,x1) in [('r',(500,650)),('a',(630,795)),('p',(780,958)),('p2',(940,1120)),('o',(1115,1282)),('r2',(1270,1412)),('t',(1405,1535))]:
    m=face.copy(); m[:, :x0]=0; m[:, x1:]=0
    # take only the component(s) inside
    d=cv2.dilate(m,np.ones((7,7),np.uint8)); ring=(cv2.dilate(m,np.ones((13,13),np.uint8))-d)>0  # ring 3..6 px outside face = keyline centre band
    ys,xs=np.where(ring)
    # use only lower-boundary points: those whose pixel below is not face
    best=[]
    scores={}
    for dy in range(47,70):
        for dx in range(-6,45):
            yy=ys+dy; xx=xs+dx
            ok=(yy<946)&(xx<2206)
            # count ring points landing on dark where the original location is not inside face-dilated (i.e. new territory)
            nd=d[yy[ok],xx[ok]]==0
            s=(dark[yy[ok],xx[ok]]*nd).sum()/max(nd.sum(),1)
            scores[(dx,dy)]=s
    top=sorted(scores.items(),key=lambda kv:-kv[1])[:12]
    print(name, [(k,round(v,2)) for k,v in top])
