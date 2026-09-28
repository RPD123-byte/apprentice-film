import sys
from lib import *
d = sys.argv[1]
S = np.load('x/S9.npy'); R = mean_ren([137.6, 138.0, 138.4, 138.8], d)
f = lambda I: 0.299*I[...,0]+0.587*I[...,1]+0.114*I[...,2]
def bp(I, box):
    L = f(I).astype(np.float32)
    a = cv2.GaussianBlur(L, (0,0), 1.2) - cv2.GaussianBlur(L, (0,0), 3.5)
    x0,y0,x1,y1 = box
    return float(a[y0:y1, x0:x1].std())
for nm, box in [('BL', (0, 800, 120, 946)), ('BR', (2100, 800, 2206, 946)), ('Ledge', (0, 800, 60, 880)), ('Bmid-L', (120, 850, 300, 946)), ('Bmid-R', (1900, 850, 2100, 946))]:
    x0,y0,x1,y1 = box
    s = S[y0:y1, x0:x1].reshape(-1,3).mean(0); r = R[y0:y1, x0:x1].reshape(-1,3).mean(0)
    print(nm, 'S', s.round(1), f'L {f(s):.1f}', ' R', r.round(1), f'L {f(r):.1f}', ' bp S %.2f R %.2f' % (bp(S, box), bp(R, box)))
