import numpy as np, cv2, sys
sys.path.insert(0,'.')
from grade import *
SP='/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/'
for nm,t in [('bgA',54.2),('bgB',56.0)]:
    g=np.load(SP+nm+'.npy').astype(np.float32)/255
    P=inverse(g,t); F=forward(P,t)
    print(nm,'roundtrip MAE*255',np.abs(F-g).mean()*255,'P mean',P.mean(),'hist',np.histogram(P,bins=10,range=(0,1))[0]/P.size)
    np.save(nm+'_P.npy',P)
