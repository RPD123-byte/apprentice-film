import sys; sys.path.insert(0,'.')
from flowmesh import *
import time
def err(A, img):
    m = bgmask(A, 12).astype(bool); g = gray(A).astype(np.float32)
    h = np.clip(cv2.GaussianBlur(cv2.cvtColor(img, cv2.COLOR_BGR2GRAY).astype(np.float32),(0,0),2.0),0,255)
    d = np.abs(h - g)
    R = m.copy(); R[:, :1103] = False
    return d[m].mean(), d[R].mean()
for A, B in [(3219, 3217), (3219, 3223), (3221, 3217), (3213, 3211), (3213, 3217), (3230, 3228), (3200, 3197), (3200, 3205)]:
    t0 = time.time()
    mesh, info = fit(A, B)
    sB = cv2.imread(f'{WORK}/src/s{B}.png')
    wm = warp_to(sB, mesh)
    mx, my = chain(A, B); wd = cv2.remap(sB, mx, my, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
    print(A, B, 'n', info['n'], 'none %.2f/%.2f' % err(A, sB), 'dense %.2f/%.2f' % err(A, wd), 'mesh %.2f/%.2f' % err(A, wm), '%.1fs' % (time.time() - t0), flush=True)
    if (A, B) == (3219, 3217): cv2.imwrite(f'{WORK}/fm_3219_from_3217.png', wm)
