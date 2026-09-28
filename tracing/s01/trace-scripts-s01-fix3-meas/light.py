# light.py: source region brightness per frame in plate coords (camera removed), ratio to t=0
import cv2, re, numpy as np
src = open('src/shots/s01_birdseye.js').read()
cam = [list(map(float, m)) for m in re.findall(r'\[(\d\.\d\d), (1\.\d+), (-?[\d.]+), (-?[\d.]+)\]', src)]
def camat(t):
    if t <= cam[0][0]: return cam[0][1:]
    for i in range(1, len(cam)):
        if t <= cam[i][0]:
            a, b = cam[i-1], cam[i]; u = (t - a[0]) / (b[0] - a[0]); return [a[k] + (b[k]-a[k])*u for k in (1,2,3)]
    return cam[-1][1:]
R = {'deskL': (480, 330, 800, 540), 'deskR': (1340, 300, 1700, 540), 'lhand': (895, 400, 985, 490), 'armL': (760, 600, 880, 800),
     'armR': (1300, 600, 1440, 800), 'headTop': (1000, 530, 1150, 600), 'mug': (1440, 350, 1520, 430), 'spkL': (560, 110, 710, 350)}
c = cv2.VideoCapture('/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4')
base = None; rows = []
for n in range(0, 151):
    ok, f = c.read()
    if not ok: break
    g = cv2.cvtColor(f, cv2.COLOR_BGR2GRAY).astype(np.float32)
    s, tx, ty = camat(n / 25)
    P = cv2.warpAffine(g, np.float32([[s, 0, tx], [0, s, ty]]), (2206, 946), flags=cv2.WARP_INVERSE_MAP | cv2.INTER_LINEAR)
    m = {k: P[y0:y1, x0:x1].mean() for k, (x0, y0, x1, y1) in R.items()}
    if base is None: base = m
    rows.append((n, {k: m[k] / base[k] for k in R}))
for n, m in rows:
    print(n, ' '.join('%s %.2f' % (k, v) for k, v in m.items()))
