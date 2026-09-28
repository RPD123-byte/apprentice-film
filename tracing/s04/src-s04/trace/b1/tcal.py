# tcal.py T1,T2,... [passes] [gain] -- per-key value-study correction fields (s04/tcorr.js), measured on the JS render
# (graded harness) against each key's own source frame: e = blur(render) - blur(source) at the 24 px grid nodes,
# converted to paint values by the grade's local slope, subtracted (iterated). The laptop screen (drawn separately)
# is excluded.
import json, cv2, numpy as np, subprocess, sys, time
def runh(args, **kw):
    for k in range(4):
        r = subprocess.run(args, capture_output=True, **kw)
        if r.returncode == 0: return r
        print('harness retry', r.stdout[-300:], r.stderr[-300:], flush=True); time.sleep(3)
    raise SystemExit('harness failed')
import os
sys.path.insert(0, os.path.dirname(__file__))
times = sys.argv[1].split(','); passes = int(sys.argv[2]) if len(sys.argv) > 2 else 3; gain = float(sys.argv[3]) if len(sys.argv) > 3 else 0.9
ROOT = '/Users/computer/rootline/apprentice-film'; OUTJS = ROOT + '/src/shots/s04/tcorr.js'; DB = ROOT + '/snapshots/s04-b1k/tr/tcorr.json'
A = [chr(c) for c in range(35, 127) if c != 92]
V = '/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'; cap = cv2.VideoCapture(V)
W, H, G = 2206, 946, 24; nx, ny = -(-W // G) + 1, -(-H // G) + 1
TC = json.load(open(DB)) if os.path.exists(DB) else {}
def write():
    json.dump(TC, open(DB, 'w'))
    out = {t: {'g': G, 'nx': nx, 'ny': ny, 's': ''.join(A[int(np.clip(round(v), -45, 45)) + 45] for v in np.array(TC[t]).ravel())} for t in sorted(TC)}
    hdr = open(OUTJS).read().split('export const TCORR')[0]
    open(OUTJS, 'w').write(hdr + 'export const TCORR = ' + json.dumps(out, separators=(',', ':')) + ';\n')
from grade import VIG
import re as _re
_src = open(ROOT + '/src/shots/s04/owlmask.js').read()
OWLM = json.loads(_src[_src.index('{'):_src.rindex('}') + 1])
sl = lambda p: (0.65 + 0.35 * 6 * p * (1 - p))
ys, xs = np.minimum(np.arange(ny) * G, H - 1), np.minimum(np.arange(nx) * G, W - 1)
for it in range(passes):
    runh(['node', ROOT + '/snapshots/s04-b1/dev/dev.mjs', ROOT + '/snapshots/s04-b1k/tcal', ','.join(times)])
    tot = []
    for t in times:
        cap.set(cv2.CAP_PROP_POS_FRAMES, int(round(float(t) * 25))); ok, fr = cap.read()
        S = cv2.cvtColor(fr, cv2.COLOR_BGR2GRAY).astype(np.float32)
        R = cv2.imread(f'{ROOT}/snapshots/s04-b1k/tcal/r-{float(t):.2f}.png', 0).astype(np.float32)
        K = json.load(open(f'{ROOT}/snapshots/s04-b1k/tr/d{t}.json'))
        m = np.ones(S.shape, np.float32)
        fi = int(round(float(t) * 25))
        if 489 <= fi <= 506:   # landing keys are drawn only inside the owl's outlines (s04.js landing()): measure there
            m[:] = 0
            for P in OWLM.get(str(fi), []): cv2.fillPoly(m, [np.array(P, np.int32)], 1)
            m = cv2.erode(m, np.ones((9, 9), np.uint8))
        for c in K.get('cut', []):
            mm = np.zeros(S.shape, np.uint8); cv2.fillPoly(mm, [np.array(c, np.int32)], 1)
            m[cv2.dilate(mm, np.ones((31, 31), np.uint8)) > 0] = 0
        bl = lambda x: cv2.GaussianBlur(x, (0, 0), 10)
        e = bl((R - S) * m) / np.maximum(bl(m), 1e-3)
        Pv = np.clip(bl(R) / 255 / VIG, 0, 1)
        ep = e / np.maximum(0.5, sl(Pv) * VIG)
        eg = ep[ys][:, xs] * (bl(m)[ys][:, xs] > 0.5)
        cur = np.array(TC.get(t, np.zeros((ny, nx)).tolist()), np.float32)
        TC[t] = np.clip(cur - gain * eg, -45, 45).round(1).tolist()
        tot.append(float(np.abs(cv2.GaussianBlur(R, (0, 0), 6) - cv2.GaussianBlur(S, (0, 0), 6)).mean()))
        print(f'pass {it} {t}: s6 {tot[-1]:.2f}  |e| {np.abs(eg).mean():.2f}', flush=True)
    write()
    print(f'pass {it} mean s6 (before this update) {np.mean(tot):.3f}', flush=True)
