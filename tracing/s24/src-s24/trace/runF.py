import sys, json; sys.path.insert(0, '.')
from common import *
from mask import silhouette, show
from tone import trace, raster, npts
S = '/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/s24p2/'
P = np.nan_to_num(np.load('plateF.npy'), nan=0)
phones = [[(395, 330), (470, 250), (600, 215), (760, 240), (860, 330), (900, 420), (895, 530), (820, 560), (740, 470), (560, 330), (470, 420), (470, 640), (400, 640)]]
M = silhouette(P, thr_hi=30, thr_lo=9, lo_polys=phones, open_r=10, lim=40, dilate=2)
np.save('maskF.npy', M)
show(P, M, S + 'mF.png')
show(P, M, S + 'mFc.png', (380, 200, 900, 660))
print('mask px', M.sum())
