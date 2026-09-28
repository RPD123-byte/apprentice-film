import sys, os; sys.path.insert(0,'.')
from flowmesh import *
def err(A, img):
    m = bgmask(A, 12).astype(bool); g = cv2.GaussianBlur(gray(A).astype(np.float32),(0,0),2)
    gm = np.hypot(cv2.Sobel(g, cv2.CV_32F, 1, 0), cv2.Sobel(g, cv2.CV_32F, 0, 1)) / 8
    h = cv2.GaussianBlur(cv2.cvtColor(img, cv2.COLOR_BGR2GRAY).astype(np.float32),(0,0),2.83)
    d = np.abs(h - g); E = m & (gm > 1.5)
    return d[E].mean()
K = 3217
for A in [3218, 3219, 3220, 3221]:
    sB = cv2.imread(f'{WORK}/src/s{K}.png')
    mesh, info = fit(A, K, 0.0003, 0.003)
    mx, my = chain(A, K)
    print(A, K, 'none %.2f dense %.2f mesh %.2f' % (err(A, sB), err(A, cv2.remap(sB, mx, my, cv2.INTER_LINEAR)), err(A, warp_to(sB, mesh))), flush=True)
