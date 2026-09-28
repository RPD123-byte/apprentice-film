# walkloc.py DIR out.png F...: anchor-local crops (u 95..135, v 26..54) of render (top) and source (bottom), 8x, per frame
import sys, json, cv2, numpy as np
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/snapshots/s22-fix1-h')
from run import src, gray
SP = '/private/tmp/claude-501/-Users-computer-vibe-check/9d8e3a22-605d-469a-804c-e2a05ae8a7e5/scratchpad'
WT = json.load(open(f'{SP}/walkT.json'))
def pose(t):
    r = WT[0]
    for k in WT:
        if k[0] <= t + 0.005: r = k
    return r[1:]
d, out = sys.argv[1], sys.argv[2]; Fs = [int(v) for v in sys.argv[3:]]
U0, V0, U1, V1, S = 95, 26, 135, 54, 8
cols = []; meds = []
for F in Fs:
    a, b, c, dd, e, f = pose(F / 25)
    # dst(px) = anchor-local (U0 + (px+0.5)/S - 0.5 ...) -> frame
    M = np.array([[a / S, c / S, a * (U0 - 0.5 + 0.5 / S) + c * (V0 - 0.5 + 0.5 / S) + e + 0.5 - 0.5], [b / S, dd / S, b * (U0 - 0.5 + 0.5 / S) + dd * (V0 - 0.5 + 0.5 / S) + f]], np.float32)
    M[0, 2] = a * (U0 + 0.5 / S - 0.5) + c * (V0 + 0.5 / S - 0.5) + e
    M[1, 2] = b * (U0 + 0.5 / S - 0.5) + dd * (V0 + 0.5 / S - 0.5) + f
    wh = ((U1 - U0) * S, (V1 - V0) * S)
    ims = []
    for im in ((cv2.imread(f'{d}/r{F:04d}.png') if __import__('os').path.exists(f'{d}/r{F:04d}.png') else src(F)*0), src(F)):
        g = gray(im)
        ims.append(cv2.warpAffine(g, M, wh, flags=cv2.INTER_CUBIC | cv2.WARP_INVERSE_MAP))
    meds.append(ims[1])
    col = np.vstack([ims[0], np.full((4, wh[0]), 0), ims[1]])
    cols.append(col); cols.append(np.full((col.shape[0], 4), 0))
img = np.hstack(cols).clip(0, 255).astype(np.uint8)
img = cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)
# grid every 5 px of anchor-local
for k in range(0, len(Fs)):
    x0 = k * ((U1 - U0) * S + 4)
    for u in range(U0, U1 + 1, 5):
        cv2.line(img, (x0 + (u - U0) * S, 0), (x0 + (u - U0) * S, 6), (0, 0, 255), 1)
        cv2.putText(img, str(u), (x0 + (u - U0) * S + 2, 16), cv2.FONT_HERSHEY_SIMPLEX, 0.35, (0, 0, 255), 1)
    for v in range(V0, V1 + 1, 5):
        cv2.line(img, (x0, (v - V0) * S), (x0 + 6, (v - V0) * S), (0, 0, 255), 1)
        cv2.putText(img, str(v), (x0 + 8, (v - V0) * S + 4), cv2.FONT_HERSHEY_SIMPLEX, 0.35, (0, 0, 255), 1)
cv2.imwrite(out, img)
np.save(out.replace('.png', '_src.npy'), np.stack(meds))
