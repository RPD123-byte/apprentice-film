import sys, os; sys.path.insert(0,'.')
from flowmesh import *
def err(A, img):
    m = bgmask(A, 12).astype(bool); g = cv2.GaussianBlur(gray(A).astype(np.float32),(0,0),2)
    gm = np.hypot(cv2.Sobel(g, cv2.CV_32F, 1, 0), cv2.Sobel(g, cv2.CV_32F, 0, 1)) / 8
    h = cv2.GaussianBlur(cv2.cvtColor(img, cv2.COLOR_BGR2GRAY).astype(np.float32),(0,0),2.83)
    d = np.abs(h - g); E = m & (gm > 1.5)
    R = E.copy(); R[:, :1103] = False
    return d[E].mean(), d[R].mean()
lm, lb = float(sys.argv[1]), float(sys.argv[2])
tot = []
for A, B in [(3219, 3223), (3213, 3211), (3200, 3205), (3230, 3228)]:
    sB = cv2.imread(f'{WORK}/src/s{B}.png')
    mesh, info = fit(A, B, lm, lb)
    e = err(A, warp_to(sB, mesh))
    if len(sys.argv) > 3:
        mx, my = chain(A, B); ed = err(A, cv2.remap(sB, mx, my, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)); en = err(A, sB)
        print(A, B, 'none %.2f/%.2f' % en, 'dense %.2f/%.2f' % ed)
    tot.append(e); print(A, B, 'mesh %.2f/%.2f' % e, flush=True)
print('mean', np.mean(tot, 0))
