# tone_owlA.py : per wing phase, the registered (PATH_A) mean of the source and of the raw render over the standing frames
# 1344-1381, inside the drawn owl (snapshots/s18-rawA raw renders, s18-layA alpha): target of the phase drawings' tone fit.
import sys, os, re, numpy as np, cv2
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('S18SRC', '/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/s18r4/src/')
from common import pre
W = os.environ.get('S18WORK', '/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/s18r4/work')
txt = open('/Users/computer/rootline/apprentice-film/src/shots/s18/shotA.js').read()
PATH = {int(a): (int(b), int(c)) for a, b, c in re.findall(r'\[(\d{4}), (-?\d+), (-?\d+)\]', txt.split('export const PATH_A')[1].split('];')[0])}
cf = lambda f: f - (f - 1) // 25
phase = lambda f: ['level', 'up', 'level', 'down'][cf(f) % 4]
LA = '/Users/computer/rootline/apprentice-film/snapshots/s18-layA'
X0, Y0, X1, Y1 = 300, 60, 1150, 700   # owl box in owl coords
acc = {}
for f in range(1344, 1382):
    dx, dy = PATH[f]; ph = phase(f)
    S = pre(f); R = cv2.imread(f'/Users/computer/rootline/apprentice-film/snapshots/s18-rawA/r{f}.png', 0).astype(np.float32) / 255
    Cb = cv2.imread(f'{LA}/r2{f}.png', 0).astype(np.float32); Cw = cv2.imread(f'{LA}/r3{f}.png', 0).astype(np.float32)
    al = np.clip(1 - (Cw - Cb) / 255, 0, 1)
    M = np.float32([[1, 0, dx], [0, 1, dy]])   # owl coords -> frame: x + dx
    reg = lambda img: cv2.warpAffine(img, M, (2206, 946), flags=cv2.INTER_LINEAR | cv2.WARP_INVERSE_MAP, borderValue=0)[Y0:Y1, X0:X1]
    a = acc.setdefault(ph, [0, 0, 0, 0])
    m = (reg(al) > 0.98).astype(np.float32)
    a[0] = a[0] + reg(S) * m; a[1] = a[1] + reg(R) * m; a[2] = a[2] + m; a[3] += 1
for ph, (sS, sR, n, k) in acc.items():
    ok = n >= 0.6 * k
    T = np.where(ok, sS / np.maximum(n, 1), -1).astype(np.float32); R = np.where(ok, sR / np.maximum(n, 1), 0).astype(np.float32)
    np.save(f'{W}/oA_{ph}_T.npy', T); np.save(f'{W}/oA_{ph}_R.npy', R); np.save(f'{W}/oA_{ph}_M.npy', ok)
    e = np.abs(cv2.GaussianBlur(np.where(ok, T, 0), (0, 0), 6) - cv2.GaussianBlur(R, (0, 0), 6))[ok].mean() * 255
    print(ph, k, 'frames; owl px', ok.sum(), 'blurred MAE', round(float(e), 2), 'mean T/R', T[ok].mean().round(3), R[ok].mean().round(3))
