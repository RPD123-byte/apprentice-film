import sys, os, time
sys.argv=[sys.argv[0]]
from run import Lab
L=Lab()
for f in [151,152,240]:
    t=time.time(); img,ms=L.frame(f); print(f, 'draw ms', round(ms), 'wall', round(time.time()-t,2))
L.close()
