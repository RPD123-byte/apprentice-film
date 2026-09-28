import sys, os; sys.path.insert(0,'.')
from flowmesh import *
def err(A, img):
    m = bgmask(A, 12).astype(bool); g = cv2.GaussianBlur(gray(A).astype(np.float32),(0,0),2)
    gm = np.hypot(cv2.Sobel(g, cv2.CV_32F, 1, 0), cv2.Sobel(g, cv2.CV_32F, 0, 1)) / 8
    h = cv2.GaussianBlur(cv2.cvtColor(img, cv2.COLOR_BGR2GRAY).astype(np.float32),(0,0),2.83)
    d = np.abs(h - g); E = m & (gm > 1.5)
    return d[E].mean()
res = {1: [], 2: []}
for K in [3200, 3209, 3217, 3226]:
    for A in [K - 2, K - 1, K + 1, K + 2]:
        sB = cv2.imread(f'{WORK}/src/s{K}.png')
        mesh, info = fit(A, K, 0.0003, 0.003)
        res[abs(A - K)].append(err(A, warp_to(sB, mesh)))
print(os.environ.get('FM_GS'), {k: round(float(np.mean(v)), 2) for k, v in res.items()})
