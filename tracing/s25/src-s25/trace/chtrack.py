import json,numpy as np
from sctrack import track
out={}
out['vs2']=track('vs2',[2540,2539,2541,2538],rots=np.arange(-30,31,5),scales=np.arange(0.8,1.21,0.05),win=120)
out['vs3']=track('vs3',[2543,2542,2544,2545],rots=np.arange(-20,21,4),scales=np.arange(0.85,1.16,0.05),win=100)
h=track('hov',range(2553,2567),rots=np.arange(-30,31,3),scales=np.arange(0.8,1.21,0.04),win=140)
h.update(track('hov',range(2552,2545,-1),rots=np.arange(-40,41,4),scales=np.arange(0.7,1.31,0.05),win=200))
out['hov']=h
json.dump(out,open('chtrack.json','w'))
