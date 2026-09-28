# walkprof.py DIR: mean anchor-local eye profiles of render and source over the walk frames present in DIR
import sys, json, glob, re, cv2, numpy as np
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/snapshots/s22-fix1-h')
from run import src, gray
SP = '/private/tmp/claude-501/-Users-computer-vibe-check/9d8e3a22-605d-469a-804c-e2a05ae8a7e5/scratchpad'
WT = json.load(open(f'{SP}/walkT.json'))
def pose(t):
    r = WT[0]
    for k in WT:
        if k[0] <= t + 0.005: r = k
    return r[1:]
d = sys.argv[1]
Fs = sorted(int(re.search(r'r(\d+)\.png', p).group(1)) for p in glob.glob(f'{d}/r*.png'))
Fs = [F for F in Fs if 81.72 <= F / 25 < 83.96]
U0, V0, U1, V1, S = 95, 26, 135, 54, 8
R = []; Q = []
for F in Fs:
    a, b, c, dd, e, f = pose(F / 25)
    M = np.array([[a / S, c / S, a * (U0 + 0.5 / S - 0.5) + c * (V0 + 0.5 / S - 0.5) + e], [b / S, dd / S, b * (U0 + 0.5 / S - 0.5) + dd * (V0 + 0.5 / S - 0.5) + f]], np.float32)
    wh = ((U1 - U0) * S, (V1 - V0) * S)
    R.append(cv2.warpAffine(gray(cv2.imread(f'{d}/r{F:04d}.png')), M, wh, flags=cv2.INTER_CUBIC | cv2.WARP_INVERSE_MAP))
    Q.append(cv2.warpAffine(gray(src(F)), M, wh, flags=cv2.INTER_CUBIC | cv2.WARP_INVERSE_MAP))
R = np.mean(R, 0); Q = np.mean(Q, 0)
print('n', len(Fs))
for u in range(108, 128, 2):
    i = int((u - U0) * S); vs = np.arange(R.shape[0]) / S + V0; sel = (vs > 33) & (vs < 50)
    r = R[:, i - 2:i + 3].mean(1)[sel]; q = Q[:, i - 2:i + 3].mean(1)[sel]; v = vs[sel]
    out = []
    for lo, hi in ((33, 41.5), (41, 50)):
        m = (v >= lo) & (v < hi)
        out.append('v %.1f/%.1f min %3.0f/%3.0f' % (v[m][np.argmin(r[m])], v[m][np.argmin(q[m])], r[m].min(), q[m].min()))
    print(u, ' | '.join(out), ' white %.0f/%.0f' % (np.percentile(r, 90), np.percentile(q, 90)))
