#!/usr/bin/env python3
# Frame-accurate pairs for s18: render the given SOURCE frame numbers (via tools/compare.sh at times that land on
# that source frame), then pair each render with the exact source frame. Writes OUT/p<frame>.jpg (render | source),
# OUT/r<frame>.png (render), prints blurred MAE per frame.
# Usage: fp.py OUT f1,f2,... [--crop x0 y0 x1 y1] [--scale 0.5]
import sys, os, subprocess, glob, re, math, cv2, numpy as np
out = sys.argv[1]; frames = [int(v) for v in sys.argv[2].split(',')]
crop = None; scale = 0.5
a = sys.argv[3:]
if '--crop' in a: i = a.index('--crop'); crop = [int(v) for v in a[i+1:i+5]]
if '--scale' in a: i = a.index('--scale'); scale = float(a[i+1])
REF = '/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
times = []
for n in frames:
    k = math.ceil(30 * n / 25 - 1e-9)
    times.append(k / 30 + 0.001)
tmp = out + '-raw'
os.chdir('/Users/computer/rootline/apprentice-film')
subprocess.run(['sh', 'tools/compare.sh', ','.join(f'{t:.4f}' for t in times), tmp], check=False)
os.makedirs(out, exist_ok=True)
cap = cv2.VideoCapture(REF)
renders = sorted(glob.glob(tmp + '/frame-*.png'), key=lambda p: float(re.search(r'at-([\d.]+)s', p).group(1)))
for p in renders:
    t = float(re.search(r'at-([\d.]+)s', p).group(1))
    tr = math.floor(30 * t + 1e-6) / 30
    f = math.floor(25 * tr + 1e-4)
    cap.set(cv2.CAP_PROP_POS_FRAMES, f); ok, S = cap.read()
    R = cv2.imread(p)
    if R.shape != S.shape: R = cv2.resize(R, (S.shape[1], S.shape[0]))
    cv2.imwrite(f'{out}/r{f}.png', R)
    cv2.imwrite(f'{out}/s{f}.png', S)
    g1 = cv2.GaussianBlur(cv2.cvtColor(R, cv2.COLOR_BGR2GRAY).astype(np.float32), (0, 0), 6)
    g2 = cv2.GaussianBlur(cv2.cvtColor(S, cv2.COLOR_BGR2GRAY).astype(np.float32), (0, 0), 6)
    if crop:
        x0, y0, x1, y1 = crop
        R = R[y0:y1, x0:x1]; S = S[y0:y1, x0:x1]; g1 = g1[y0:y1, x0:x1]; g2 = g2[y0:y1, x0:x1]
    mae = float(np.abs(g1 - g2).mean())
    pair = np.hstack([R, np.full((R.shape[0], 6, 3), (0, 0, 255), np.uint8), S])
    if scale != 1: pair = cv2.resize(pair, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA)
    cv2.putText(pair, f'R{f}', (8, 28), 0, 0.9, (0, 0, 255), 2); cv2.putText(pair, f'S{f}', (pair.shape[1] // 2 + 8, 28), 0, 0.9, (0, 0, 255), 2)
    cv2.imwrite(f'{out}/p{f}.jpg', pair, [cv2.IMWRITE_JPEG_QUALITY, 88])
    print(f'{f} mae {mae:.1f} mean R {g1.mean():.1f} S {g2.mean():.1f}')
