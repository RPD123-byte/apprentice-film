import sys, json; sys.path.insert(0, '.')
from common import *
from tone import trace, raster, npts
P = np.nan_to_num(np.load('plateF.npy'), nan=0); M = np.load('maskF.npy')
LV = [12, 25, 38, 52, 65, 78, 92, 105, 118, 132, 145, 158, 172, 185, 198, 212, 225, 238]   # 18 levels
# plate pixel (j, i) = k53 frame (600 + j, -80 + i)
L = trace(P, M, LV, sigma=0.5, eps=0.4, min_area=1.5, offset=(600, -80))
json.dump([{'t': l['t'], 'v': l['v'], 'paths': [p.round(2).tolist() for p in l['paths']]} for l in L], open('out/owlF.json', 'w'))
print('points', npts(L))
