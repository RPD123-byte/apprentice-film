import json,numpy as np
from sctrack import track
C=json.load(open('chtrack.json'))
r=track('hov2',range(2562,2567),rots=np.arange(-12,13,3),scales=np.arange(0.9,1.11,0.03),win=90)
r.update(track('hov2',range(2561,2553,-1),rots=np.arange(-12,13,3),scales=np.arange(0.9,1.11,0.03),win=90))
C['hov2']={str(k):v for k,v in r.items()}
json.dump(C,open('chtrack.json','w'))
