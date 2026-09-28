# Mean graded colour of laptop-base deck patches (base cm coords, placed by BASE_ALL) over time: source vs render.
# usage: deckcol.py RENDERDIR k1,k2,...
import cv2, numpy as np, sys, json, subprocess, os
REF = '/private/tmp/claude-501/-Users-computer-vibe-check/9d8e3a22-605d-469a-804c-e2a05ae8a7e5/scratchpad/ref'
rd = sys.argv[1]; ks = [int(x) for x in sys.argv[2].split(',')]
B = json.loads(subprocess.check_output(['node', '-e', "import('/Users/computer/rootline/apprentice-film/src/shots/s27/data2.js').then(m=>console.log(JSON.stringify(m.BASE_ALL)))"]))
def cr(T, t):
    n = len(T)
    if t <= T[0][0]: return T[0][1:]
    if t >= T[-1][0]: return T[-1][1:]
    i = 1
    while i < n - 1 and T[i][0] < t: i += 1
    p0, p1, p2, p3 = T[max(0, i - 2)], T[i - 1], T[i], T[min(n - 1, i + 1)]
    u = (t - p1[0]) / (p2[0] - p1[0]); u2 = u * u; u3 = u2 * u
    return [0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * u + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * u2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * u3) for k in range(1, 9)]
BW, BD = 32.4, 22.5
PATCH = {'deckL': (-13, 14, -7, 20), 'deckR': (7, 14, 13, 20), 'keys': (-6, 3, 6, 10), 'back': (-10, -0.6, 10, 0.2)}
print('t      ' + '  '.join(f'{n:>21s}' for n in PATCH) + '   (src L / ren L per patch, then ren-src RGB)')
for k in ks:
    t = k / 25; c = cr(B, max(119.6, t))
    H = cv2.getPerspectiveTransform(np.float32([[-BW / 2, BD], [BW / 2, BD], [BW / 2, 0], [-BW / 2, 0]]), np.float32([[c[0], c[1]], [c[2], c[3]], [c[4], c[5]], [c[6], c[7]]]))
    S = cv2.imread(f'{REF}/src/{k:05d}.png').astype(float); R = cv2.imread(f'{rd}/frame-{k:05d}.png')
    if R is None: continue
    R = R.astype(float)
    out = []
    for n, (x0, z0, x1, z1) in PATCH.items():
        poly = cv2.perspectiveTransform(np.float32([[[x0, z0], [x1, z0], [x1, z1], [x0, z1]]]), H)[0]
        m = np.zeros(S.shape[:2], np.uint8); cv2.fillPoly(m, [poly.astype(np.int32)], 1)
        if m.sum() < 50: out.append(f'{"-":>21s}'); continue
        a = S[m > 0].mean(0)[::-1]; b = R[m > 0].mean(0)[::-1]
        out.append(f'{a.mean():5.0f}/{b.mean():4.0f} {b[0]-a[0]:+4.0f}{b[1]-a[1]:+4.0f}{b[2]-a[2]:+4.0f}')
    print(f'{t:6.2f} ' + '  '.join(out))
