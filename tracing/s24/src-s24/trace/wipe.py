# k91 (100.44): the region above the white wipe band (the next shot's first frame, washed), traced as grey tone
# levels from the source frame itself, except the colour banner corner (left to the next shot's own page).
import sys, json; sys.path.insert(0, '.')
from common import *
from tone import trace, npts
from mask import show
S_ = '/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/s24p2/'
u = U(91)
H_, W_ = u.shape
M = np.zeros(u.shape, np.uint8)
up = lambda x: 406.5 - 0.4272 * x
cv2.fillPoly(M, [np.int32([(0, 0), (W_, 0), (W_, up(W_) - 3), (0, up(0) - 3)])], 1)
# the colour banner corner (x < 330, y > 215) stays the next shot's
cv2.fillPoly(M, [np.int32([(150, 215), (330, 215), (330, 330), (150, 480)])], 0)
L = trace(u, M, [12, 32, 60, 90, 125, 160, 192, 215, 235], sigma=0.9, eps=0.6, min_area=3.0)
json.dump([{'t': l['t'], 'v': l['v'], 'paths': [p.round(2).tolist() for p in l['paths']]} for l in L], open('out/wipe91.json', 'w'))
show(u, M, S_ + 'm_wipe91.png', (0, 0, 1300, 520))
print('pts', npts(L))
