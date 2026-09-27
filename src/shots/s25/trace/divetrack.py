import json,numpy as np
from sctrack import track
out={}
out.update(track('dive',range(2521,2541),rots=np.arange(-30,31,3),scales=np.arange(0.6,1.31,0.05),win=160))
out.update(track('dive',range(2520,2511,-1),rots=np.arange(-30,31,3),scales=np.arange(0.6,1.31,0.05),win=160))
json.dump({'dive':out},open('divetrack.json','w'))
