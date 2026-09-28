# top margin bias per x-band (sigma 3), owl masked (|render-source| large or bright source) - DIR frames
import sys, glob, re, cv2, numpy as np
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/snapshots/s22-fix1-h')
from run import src, gray
d = sys.argv[1]
Fs = [int(re.search(r'r(\d+)\.png', p).group(1)) for p in sorted(glob.glob(f'{d}/r*.png'))]
if len(sys.argv) > 2: Fs = [F for F in Fs if int(sys.argv[2]) <= F <= int(sys.argv[3])]
bands = [(0, 400), (400, 800), (800, 1200), (1200, 1600), (1600, 2000), (2000, 2206)]
print('F    ' + ' '.join(f'{a}-{b}'.rjust(10) for a, b in bands))
for F in Fs:
    A = gray(cv2.imread(f'{d}/r{F:04d}.png')); B = gray(src(F))
    m = ((A > 120) | (B > 120)).astype(np.uint8)
    m = cv2.dilate(m, np.ones((25, 25), np.uint8)) == 0
    A3 = cv2.GaussianBlur(A, (0, 0), 3); B3 = cv2.GaussianBlur(B, (0, 0), 3)
    out = []
    for a, b in bands:
        mm = m[0:118, a:b]; D = (A3 - B3)[0:118, a:b]
        out.append(f'{D[mm].mean():+5.1f}/{B3[0:118, a:b][mm].mean():5.1f}' if mm.sum() > 100 else '    --    ')
    print(F, ' '.join(out))
