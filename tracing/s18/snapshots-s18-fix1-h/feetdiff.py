import cv2,numpy as np,re,sys
txt=open('../../src/shots/s18/shotA.js').read()
PATH=eval(re.search(r'PATH_A = (\[.*?\]);', txt, re.S).group(1)); P={r[0]:(r[1],r[2]) for r in PATH}
med=np.load('/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/s18f1_plateA_feet.npy').astype(np.float32)
plate=np.zeros((946,2206),np.float32); plate[440:700,400:1500]=med
fs=[int(a) for a in sys.argv[2:]]; X0,Y0,W,H=map(int,sys.argv[1].split(',')); S=3
tiles=[]
for f in fs:
    dx,dy=P[f]; s=cv2.imread('../s18-fix1-src/f%04d.png'%f,0).astype(np.float32)
    d=cv2.GaussianBlur(s,(0,0),1.2)-cv2.GaussianBlur(plate,(0,0),1.2)
    M=np.float32([[1,0,-dx],[0,1,-dy]])
    rs=cv2.warpAffine(s,M,(2206,946)); rd=cv2.warpAffine(d,M,(2206,946))
    g=rs[Y0:Y0+H,X0:X0+W]; e=rd[Y0:Y0+H,X0:X0+W]
    c=np.dstack([g,g,g]).copy()
    a=np.clip(np.abs(e)/80,0,1)[...,None]
    col=np.where((e>0)[...,None],np.array([60,255,60],np.float32),np.array([60,60,255],np.float32))
    c=c*(1-0.55*a)+col*0.55*a
    c=cv2.resize(c.astype(np.uint8),None,fx=S,fy=S,interpolation=cv2.INTER_CUBIC)
    for q in range(0,W+1,10):
        cv2.line(c,(q*S,0),(q*S,H*S),(255,255,255) if (X0+q)%50==0 else (150,110,110),1)
        cv2.putText(c,str((X0+q)%100),(q*S+1,10),0,0.3,(0,255,255),1)
    for q in range(0,H+1,10):
        cv2.line(c,(0,q*S),(W*S,q*S),(255,255,255) if (Y0+q)%50==0 else (150,110,110),1)
        cv2.putText(c,str(Y0+q),(1,q*S+10),0,0.3,(0,255,255),1)
    cv2.putText(c,'F%d'%f,(W*S-80,H*S-8),0,0.8,(0,255,255),2)
    tiles.append(c)
cv2.imwrite('../s18-fix1-pairs/fd_%d.jpg'%fs[0],np.vstack(tiles))
