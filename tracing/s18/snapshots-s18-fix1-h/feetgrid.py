import cv2,numpy as np,re,sys
# feetgrid.py f1 f2 ... -> ../s18-fix1-pairs/fg_<f1>.jpg : registered source crops x 630-990, y 480-660 at 2.5x, grid 10 px
txt=open('../../src/shots/s18/shotA.js').read()
PATH=eval(re.search(r'PATH_A = (\[.*?\]);', txt, re.S).group(1)); P={r[0]:(r[1],r[2]) for r in PATH}
fs=[int(a) for a in sys.argv[1:]]
X0,Y0,W,H,S=590,470,420,200,2.2
tiles=[]
for f in fs:
    dx,dy=P[f]; s=cv2.imread('../s18-fix1-src/f%04d.png'%f)
    M=np.float32([[1,0,-dx],[0,1,-dy]]); r=cv2.warpAffine(s,M,(2206,946))
    c=cv2.resize(r[Y0:Y0+H,X0:X0+W],None,fx=S,fy=S,interpolation=cv2.INTER_CUBIC)
    for g in range(0,W+1,10):
        col=(0,0,230) if g%50==0 else (90,90,200); cv2.line(c,(int(g*S),0),(int(g*S),int(H*S)),col,1)
        if g%20==0: cv2.putText(c,str(X0+g),(int(g*S)+2,11),0,0.36,(0,255,255),1)
    for g in range(0,H+1,10):
        col=(0,0,230) if g%50==0 else (90,90,200); cv2.line(c,(0,int(g*S)),(int(W*S),int(g*S)),col,1)
        if g%20==0: cv2.putText(c,str(Y0+g),(2,int(g*S)+12),0,0.36,(0,255,255),1)
    cv2.putText(c,'F%d'%f,(int(W*S)-70,int(H*S)-8),0,0.7,(0,255,0),2)
    tiles.append(c)
cv2.imwrite('../s18-fix1-pairs/fg_%d.jpg'%fs[0],np.vstack(tiles))
