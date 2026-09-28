# jscal_b1.py T1,T2,... [passes] -- tone-shift calibration of new keys on the JS render (graded harness)
import json, cv2, numpy as np, subprocess, sys, time
def runh(args, **kw):
    for k in range(4):
        r = subprocess.run(args, capture_output=True, **kw)
        if r.returncode == 0: return r
        print('harness retry', r.stdout[-300:], r.stderr[-300:], flush=True); time.sleep(3)
    raise SystemExit('harness failed')
times = sys.argv[1].split(','); passes = int(sys.argv[2]) if len(sys.argv) > 2 else 3
V = '/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'; cap = cv2.VideoCapture(V)
bl = lambda x: cv2.GaussianBlur(x, (0, 0), 6)
for it in range(passes):
    runh(['node', '../s04-b1/dev/dev.mjs', 'cal', ','.join(times)], cwd='.')
    for t in times:
        cap.set(cv2.CAP_PROP_POS_FRAMES, int(round(float(t) * 25))); ok, fr = cap.read()
        S = cv2.cvtColor(fr, cv2.COLOR_BGR2GRAY).astype(np.float32)
        J = cv2.imread(f'cal/r-{float(t):.2f}.png', 0).astype(np.float32)
        K = json.load(open(f'tr/d{t}.json'))
        m = np.ones(S.shape, bool)
        for c in K.get('cut', []):
            mm = np.zeros(S.shape, np.uint8); cv2.fillPoly(mm, [np.array(c, np.int32)], 1); m &= mm == 0
        e = (bl(J) - bl(S))[m]; b = float(e.mean())
        K['cal']['tshift'] = round(K['cal']['tshift'] - 2.5 * b, 1)
        json.dump(K, open(f'tr/d{t}.json', 'w'))
        n = t.replace('.', '')
        subprocess.run(['python3', 'tr/tojs_d.py', f'tr/d{t}.json', f'../../src/shots/s04/tk/k{n}.js', f'K{n}'], check=True, capture_output=True)
        print(f"pass {it} {t}: JS MAE {np.abs(e).mean():.2f} bias {b:+.2f} -> tshift {K['cal']['tshift']:+.1f}", flush=True)
