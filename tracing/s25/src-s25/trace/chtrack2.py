import json,numpy as np
from sctrack import track
C=json.load(open('chtrack.json'))
for f in range(2559,2567):
    r=track('hov',[f],rots=np.arange(-15,16,3),scales=np.arange(0.9,1.11,0.04),win=120)
    C['hov'][str(f)]=r[f]
json.dump(C,open('chtrack.json','w'))
