import sys; sys.path.insert(0, '.')
from common import *
u18 = U(18); u19 = U(19)
def mblur(img, ang, L, dx, dy, n=24):
    acc = np.zeros_like(img)
    for i in range(n):
        f = i / (n - 1) - 0.5
        M = np.float32([[1, 0, dx + np.cos(ang) * L * f], [0, 1, dy + np.sin(ang) * L * f]])
        acc += cv2.warpAffine(img, M, (img.shape[1], img.shape[0]), borderMode=cv2.BORDER_REPLICATE)
    return acc / n
# region: inside the screen, away from the white flood (right/bottom part)
yy, xx = np.mgrid[0:946, 0:2206]
reg = (xx > 700) & (xx < 1950) & (yy > 350) & (yy < 900)
s = 0.25
small = lambda a: cv2.resize(a, None, fx=s, fy=s, interpolation=cv2.INTER_AREA)
U18 = small(u18); U19 = small(u19); R = small(reg.astype(np.float32)) > 0.99
best = None
for ang in np.radians(np.arange(20, 50, 3)):
    for L in (60, 100, 140, 180, 230, 280):
        for dx in (-40, 0, 40):
            for dy in (-40, 0, 40):
                B = mblur(U18, ang, L * s, dx * s, dy * s, 12)
                A = np.c_[B[R], np.ones(R.sum())]; co, *_ = np.linalg.lstsq(A, U19[R], rcond=None)
                e = np.abs(U19[R] - A @ co).mean()
                if best is None or e < best[0]: best = (e, np.degrees(ang), L, dx, dy, co)
print(best)
