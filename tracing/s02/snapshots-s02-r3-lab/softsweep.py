import sys, os, cv2, numpy as np
sys.argv=[sys.argv[0]]
from run import Lab, mae, src
L=Lab()
L.js('()=>{ window.__S = null; }')
for a,k in [(0,0),(0.5,1),(0.8,1),(0.5,1.5)]:
    L.js('(v)=>{ import("./src/shots/s02/hand/shot.js") }',[a,k]) if False else None
    L.js('(v)=>LAB.shot.__noop', [a,k]) if False else None
    tot=[]
    for f in [416,430,446,463,471]:
        L.js('(v)=>{ window.__labsoft(v[0], v[1]); }',[a,k])
        img,_=L.frame(f); tot.append(mae(img,src(f))[0])
    print(a,k,np.round(tot,2),round(np.mean(tot),3))
L.close()
