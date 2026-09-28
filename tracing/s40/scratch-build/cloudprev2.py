import cv2, numpy as np, json, sys
SP='/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad'
f=cv2.imread('/Users/computer/rootline/apprentice-film/snapshots/s40-fix1-ref/src-138.0.png')
banks=json.load(open(SP+'/puffs2.json'))
S=4
can=np.zeros((946*S,2206*S),np.uint8)
for bank in banks:
    for x,y,r in bank:
        c=(int(x*S),int(y*S)); R=int(r*S)
        cv2.circle(can,c,R+int(2*S),2,-1)
        cv2.circle(can,c,R-int(2*S),1,-1)
can=cv2.resize(can,(2206,946),interpolation=cv2.INTER_AREA if False else cv2.INTER_NEAREST)
out=f.copy()
m=can==1; out[m]=(out[m]*0.75+np.array([255,0,255])*0.25).astype(np.uint8)
out[can==2]=(0,255,0)
x0,y0,x1,y1=[int(v) for v in sys.argv[1:5]]
cv2.imwrite(SP+'/cloudprev.jpg',cv2.resize(out[y0:y1,x0:x1],None,fx=float(sys.argv[5]),fy=float(sys.argv[5])))
