import sys; sys.path.insert(0,'/Users/computer/rootline/apprentice-film/src/shots/s05/trace')
import numpy as np, cv2, time
from ridges import *
T=np.load('avg25_pre.npy'); Y=T.mean(2).astype(np.float32)
for pol in (1,-1):
  R=ridge_strength(Y,pol)
  print(pol, np.percentile(R,[50,75,90,95,98,99]).round(4))
