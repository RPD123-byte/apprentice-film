# Rectify the laptop's base top face (base cm coords, BASE_ALL corners) from source and render frames.
# usage: baserect.py k1,k2,.. RENDERDIR OUT.jpg   (averages the frames; 40 px per cm, margin 3 cm)
import cv2, numpy as np, sys, json, subprocess
REF = '/private/tmp/claude-501/-Users-computer-vibe-check/9d8e3a22-605d-469a-804c-e2a05ae8a7e5/scratchpad/ref'
ks = [int(x) for x in sys.argv[1].split(',')]; rd = sys.argv[2]; out = sys.argv[3]
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
BW, BD, P, MG = 32.4, 22.5, 40, 3
acc = [0, 0]
for k in ks:
    c = cr(B, max(119.6, k / 25))
    src = np.float32([[(-BW / 2 + BW / 2 + MG) * P, (BD + MG) * P], [(BW + MG) * P, (BD + MG) * P], [(BW + MG) * P, MG * P], [MG * P, MG * P]])
    dst = np.float32([[c[0], c[1]], [c[2], c[3]], [c[4], c[5]], [c[6], c[7]]])
    M = cv2.getPerspectiveTransform(dst, src)
    sz = (int((BW + 2 * MG) * P), int((BD + 2 * MG) * P))
    for i, f in enumerate((f'{REF}/src/{k:05d}.png', f'{rd}/frame-{k:05d}.png')):
        acc[i] = acc[i] + cv2.warpPerspective(cv2.imread(f), M, sz).astype(float)
cv2.imwrite(out, np.vstack([acc[0] / len(ks), acc[1] / len(ks)]).astype(np.uint8))
