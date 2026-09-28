# weye2.py DIR: walk eye strokes, position-free: per column (u 111..123) the darkest σ0.7 value in each stroke band
# (upper v 33..40.5, lower 40.5..47), relative to the white round the eye (median of u 100..130, v 20..30)
import sys, numpy as np, cv2, glob, re
sys.path.insert(0, '.')
from walkal import aligned, gray, src
d = sys.argv[1]; SIG = float(sys.argv[2]) if len(sys.argv) > 2 else 0.7
Fs = sorted(int(re.search(r'r(\d+)\.png', p).group(1)) for p in glob.glob(f'{d}/r*.png'))
Fs = [F for F in Fs if 2043 <= F < 2099]
S = 4; U0, V0 = 90, 15
acc = []
for F in Fs:
    out = []
    for I in (cv2.imread(f'{d}/r{F:04d}.png'), src(F)):
        G = aligned((cv2.GaussianBlur(gray(I), (0, 0), SIG) if SIG > 0 else gray(I)), F, S, U0, V0, 50, 40)
        wh = np.median(G[(20 - V0) * S:(30 - V0) * S, (100 - U0) * S:(130 - U0) * S])
        cols = slice((111 - U0) * S, (124 - U0) * S)
        up = G[(33 - V0) * S:int((40.5 - V0) * S), cols].min(0).mean(); lo = G[int((40.5 - V0) * S):(47 - V0) * S, cols].min(0).mean()
        out += [wh - up, wh - lo, wh]
    acc.append(out)
    print(F, 'upper r/s %3.0f/%3.0f lower r/s %3.0f/%3.0f white r/s %.0f/%.0f' % (out[0], out[3], out[1], out[4], out[2], out[5]))
a = np.mean(acc, 0); print('mean upper r/s %.1f/%.1f lower r/s %.1f/%.1f white %.0f/%.0f' % (a[0], a[3], a[1], a[4], a[2], a[5]))
