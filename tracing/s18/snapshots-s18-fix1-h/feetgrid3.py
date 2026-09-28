import cv2,numpy as np,re,sys
txt=open('../../src/shots/s18/shotA.js').read()
PATH=eval(re.search(r'PATH_A = (\[.*?\]);', txt, re.S).group(1)); P={r[0]:(r[1],r[2]) for r in PATH}
fs=[int(a) for a in sys.argv[2:]]; X0,Y0,W,H=map(int,sys.argv[1].split(',')); S=3
tiles=[]
for f in fs:
    dx,dy=P[f]; s=cv2.imread('../s18-fix1-src/f%04d.png'%f)
    r=cv2.warpAffine(s,np.float32([[1,0,-dx],[0,1,-dy]]),(2206,946))
    c=cv2.resize(r[Y0:Y0+H,X0:X0+W],None,fx=S,fy=S,interpolation=cv2.INTER_CUBIC)
    for g in range(0,W+1,10):
        cv2.line(c,(g*S,0),(g*S,H*S),(0,0,235) if (X0+g)%50==0 else (70,70,170),1)
        cv2.putText(c,str((X0+g)%100),(g*S+1,10),0,0.3,(0,255,255),1)
    for g in range(0,H+1,10):
        cv2.line(c,(0,g*S),(W*S,g*S),(0,0,235) if (Y0+g)%50==0 else (70,70,170),1)
        cv2.putText(c,str(Y0+g),(1,g*S+10),0,0.3,(0,255,255),1)
    cv2.putText(c,'F%d'%f,(W*S-80,H*S-8),0,0.8,(0,255,0),2)
    tiles.append(c)
cv2.imwrite('../s18-fix1-pairs/f3_%d.jpg'%fs[0],np.vstack(tiles))
