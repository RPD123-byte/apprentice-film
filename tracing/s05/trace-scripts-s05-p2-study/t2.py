import sys; sys.path.insert(0,'/Users/computer/rootline/apprentice-film/src/shots/s05/trace')
import numpy as np, cv2, time, pickle
from ridges import *
T=np.load('avg25_pre.npy'); Y=T.mean(2).astype(np.float32)
hi,lo=float(sys.argv[1]),float(sys.argv[2])
t0=time.time()
res={}
for pol in (1,-1):
  S,R=ridge_paths(Y,pol,hi,lo,minlen=4)
  res[pol]=S
  print(pol,len(S),'strokes',sum(len(s) for s in S),'pts', time.time()-t0)
pickle.dump(res,open('strokes_t2.pkl','wb'))
