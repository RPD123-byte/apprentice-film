import cv2,numpy as np,re,sys
# feetover.py DIR f1 f2 ... : registered source | source with the rig (DIR/r<f>.png, registered coords) overlaid
txt=open('../../src/shots/s18/shotA.js').read()
PATH=eval(re.search(r'PATH_A = (\[.*?\]);', txt, re.S).group(1)); P={r[0]:(r[1],r[2]) for r in PATH}
d=sys.argv[1]; fs=[int(a) for a in sys.argv[2:] if a.isdigit()]; X0,Y0,W,H,S=570,495,390,155,2.4
tiles=[]
for f in fs:
    dx,dy=P[f]; s=cv2.imread('../s18-fix1-src/f%04d.png'%f)
    rs=cv2.warpAffine(s,np.float32([[1,0,-dx],[0,1,-dy]]),(2206,946))[Y0:Y0+H,X0:X0+W].astype(np.float32)
    rg=cv2.imread('%s/r%d.png'%(d,f))[Y0:Y0+H,X0:X0+W].astype(np.float32)
    a=np.clip(rg.max(axis=2,keepdims=True)/60,0,1)*0.75
    ov=rs*(1-a)+(rg*np.array([0.55,1.0,0.75]))*a
    c=np.hstack([rs,ov]).astype(np.uint8)
    c=cv2.resize(c,None,fx=S,fy=S,interpolation=cv2.INTER_CUBIC)
    for k in (0,1):
      for q in range(0,W+1,10):
        cv2.line(c,(int((k*W+q)*S),0),(int((k*W+q)*S),int(H*S)),(255,255,255) if (X0+q)%50==0 else (130,90,90),1)
        if q%20==0: cv2.putText(c,str((X0+q)%100),(int((k*W+q)*S)+1,10),0,0.3,(0,255,255),1)
      for q in range(0,H+1,10):
        cv2.line(c,(int(k*W*S),int(q*S)),(int((k+1)*W*S),int(q*S)),(255,255,255) if (Y0+q)%50==0 else (130,90,90),1)
        cv2.putText(c,str(Y0+q),(int(k*W*S)+1,int(q*S)+10),0,0.3,(0,255,255),1)
    cv2.putText(c,'F%d'%f,(c.shape[1]-80,c.shape[0]-8),0,0.7,(0,255,255),2)
    tiles.append(c)
cv2.imwrite(sys.argv[-1] if sys.argv[-1].endswith('.jpg') else '../s18-fix1-pairs/fo_%d.jpg'%fs[0],np.vstack(tiles))
