import sys; sys.path.insert(0,'.')
import flowmesh as FM
from flowmesh import *
def err(A, img):
    m = bgmask(A, 12).astype(bool); g = gray(A).astype(np.float32)
    h = np.clip(cv2.GaussianBlur(cv2.cvtColor(img, cv2.COLOR_BGR2GRAY).astype(np.float32),(0,0),2.0),0,255)
    d = np.abs(h - g); R = m.copy(); R[:, :1103] = False
    return d[m].mean(), d[R].mean()
for A, B in [(3219, 3223), (3213, 3211)]:
    sB = cv2.imread(f'{WORK}/src/s{B}.png')
    for lm, lb in [(0.3, 3), (0.03, 0.3), (0.003, 0.03), (0.0003, 0.003)]:
        mesh, info = fit(A, B, lm, lb)
        print(A, B, lm, lb, 'mesh %.2f/%.2f' % err(A, warp_to(sB, mesh)), flush=True)
