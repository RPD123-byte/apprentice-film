# toptime.py DIR [F0 F1]: top-margin light over time: per x-band (y 12..112) median source vs render (owl/bright masked)
import sys, glob, re, cv2, numpy as np
sys.path.insert(0, '.')
from run import src, gray
d = sys.argv[1]; F0, F1 = (int(sys.argv[2]), int(sys.argv[3])) if len(sys.argv) > 3 else (0, 9999)
XB = [(0, 140), (140, 400), (400, 700), (700, 1000), (1000, 1300), (1300, 1600), (1600, 1900), (1900, 2070), (2070, 2206)]
Fs = sorted(int(re.search(r'r(\d+)\.png', p).group(1)) for p in glob.glob(f'{d}/r*.png')); Fs = [F for F in Fs if F0 <= F <= F1]
print('F    ' + ' '.join(f'{a:>4}-{b:<4}      ' for a, b in XB))
tot = []
for F in Fs:
    r = gray(cv2.imread(f'{d}/r{F:04d}.png')); s = gray(src(F))
    bright = cv2.dilate(((r > 120) | (s > 120)).astype(np.uint8), np.ones((41, 41), np.uint8)) > 0
    rb = cv2.GaussianBlur(r, (0, 0), 3); sb = cv2.GaussianBlur(s, (0, 0), 3)
    row = []
    for a, b in XB:
        m = ~bright[12:112, a:b]
        if m.sum() < 200: row.append('    --/--     '); continue
        A = np.median(rb[12:112, a:b][m]); B = np.median(sb[12:112, a:b][m]); row.append(f'{A:5.1f}/{B:5.1f} {B-A:+5.1f}'); tot.append(abs(B - A))
    print(F, ' '.join(row))
print('mean |diff|', np.mean(tot))
