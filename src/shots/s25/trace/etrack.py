import json,numpy as np
from sctrack import track
out={}
out['eTR']=track('eTR',range(2528,2537),rots=np.arange(-10,11,2),scales=np.arange(0.9,1.11,0.04),win=90)
out['eTR'].update(track('eTR',range(2527,2515,-1),rots=np.arange(-10,11,2),scales=np.arange(0.9,1.11,0.04),win=90))
out['eSt']=track('eSt',range(2522,2535),rots=np.arange(-10,11,2),scales=np.arange(0.9,1.11,0.04),win=70)
out['eSt'].update(track('eSt',range(2521,2516,-1),rots=np.arange(-10,11,2),scales=np.arange(0.9,1.11,0.04),win=70))
out['eFl']=track('eFl',range(2530,2536),rots=np.arange(-10,11,2),scales=np.arange(0.9,1.11,0.04),win=110)
out['eFl'].update(track('eFl',range(2529,2524,-1),rots=np.arange(-10,11,2),scales=np.arange(0.9,1.11,0.04),win=110))
json.dump(out,open('etrack.json','w'))
