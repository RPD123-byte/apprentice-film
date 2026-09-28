# Mean colours (RGB, graded) of lid bands in page coords, averaged over frames; source and a render dir.
import cv2, numpy as np, sys, json, subprocess
REF = '/private/tmp/claude-501/-Users-computer-vibe-check/9d8e3a22-605d-469a-804c-e2a05ae8a7e5/scratchpad/ref'
ks = [int(x) for x in sys.argv[1].split(',')]; rd = sys.argv[2]
SCR = json.loads(subprocess.check_output(['node', '-e', "import('/Users/computer/rootline/apprentice-film/src/shots/s27/data.js').then(m=>console.log(JSON.stringify(m.SCREEN)))"]))
X0, Y0 = -160, -300
BANDS = {'bezel top hi': (300, -206, 1900, -190), 'bezel top lo': (300, -160, 1900, -142), 'bezel left': (-60, 100, -34, 800),
         'bezel right': (2208, 100, 2236, 800), 'bezel bottom': (300, 1088, 1900, 1136), 'rim top': (300, -223, 1900, -219),
         'rim left': (-84, 100, -80, 800), 'rim right': (2251, 100, 2257, 800), 'rim bottom': (300, 1153, 1900, 1159),
         'glass top': (300, -128, 1900, -20), 'glass bottom': (300, 960, 1900, 1070), 'edge L line': (-28, 100, -24, 800), 'edge R line': (2198, 100, 2202, 800)}
for which in ('src', rd):
    acc = None
    for k in ks:
        t = k / 25; row = min(SCR, key=lambda r: abs(r[0] - t)); H = np.array(row[1:10]).reshape(3, 3)
        M = np.array([[1, 0, -X0], [0, 1, -Y0], [0, 0, 1]]) @ np.linalg.inv(H)
        f = f'{REF}/src/{k:05d}.png' if which == 'src' else f'{which}/frame-{k:05d}.png'
        w = cv2.warpPerspective(cv2.imread(f), M, (2490, 1560)).astype(float)
        acc = w if acc is None else acc + w
    A = acc / len(ks)
    print(which)
    for n, (x0, y0, x1, y1) in BANDS.items():
        c = A[y0 - Y0:y1 - Y0, x0 - X0:x1 - X0].reshape(-1, 3).mean(0)[::-1]
        print(f'  {n:14s} RGB {c[0]:5.1f} {c[1]:5.1f} {c[2]:5.1f}')
